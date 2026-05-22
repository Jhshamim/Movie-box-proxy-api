/**
 * Standalone Video Proxy Cloudflare Worker
 * 
 * Bypasses hotlinking protection for video endpoints by proxying requests.
 * Uses ReadableStream to stream the video with zero buffering.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Expose-Headers":
    "Content-Length, Content-Range, Accept-Ranges, X-Stream-Resolution",
};

const H5_API = "https://h5-api.aoneroom.com";
const DEFAULT_DOMAIN = "https://123movienow.cc";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/, "") || "/";

    if (p === "/proxy") {
      return handleProxy(url.searchParams, request);
    }

    return new Response(JSON.stringify({ error: "Not Found", message: "Only /proxy?url=... is supported" }, null, 2), {
      status: 404,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
};

async function discoverDomain() {
  try {
    const resp = await fetch(
      `${H5_API}/wefeed-h5api-bff/media-player/get-domain`,
      { headers: { "User-Agent": UA, "X-Client-Type": "h5" } }
    );
    if (resp.ok) {
      const d = await resp.json();
      return (d.data || DEFAULT_DOMAIN).replace(/\/+$/, "");
    }
  } catch {}
  return DEFAULT_DOMAIN;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function handleProxy(params, request) {
  let targetUrlStr = params.get("url");
  if (!targetUrlStr) return json({ error: "url is required" }, 400);

  try {
    // If the user forgot to URL-encode their MP4 URL, the browser/cloudflare splits it at '&'.
    // Re-attach any extra query params (e.g. &token=XYZ&expires=123) to the target URL.
    const targetUrlObj = new URL(targetUrlStr);
    for (const [key, value] of params.entries()) {
      if (key !== "url") {
        targetUrlObj.searchParams.append(key, value);
      }
    }
    targetUrlStr = targetUrlObj.toString();
  } catch (e) {
    // If URL parsing fails, ignore and try the original string
  }

  const domain = await discoverDomain();

  // Build CDN headers
  const cdnHeaders = {
    Referer: `${domain}/`,
    Origin: domain,
    Accept: "*/*",
    "User-Agent": UA,
  };

  // Forward Range header for seeking
  const rangeHeader = request.headers.get("Range");
  if (rangeHeader) cdnHeaders["Range"] = rangeHeader;

  try {
    const vidResp = await fetch(targetUrlStr, {
      headers: cdnHeaders,
      redirect: "follow",
    });

    if (vidResp.status !== 200 && vidResp.status !== 206) {
      const errBody = await vidResp.text();
      return json(
        { error: `CDN returned ${vidResp.status}`, detail: errBody.slice(0, 200) },
        vidResp.status
      );
    }

    // Response headers
    const respHeaders = new Headers(CORS);
    respHeaders.set("Accept-Ranges", "bytes");
    respHeaders.set(
      "Content-Type",
      vidResp.headers.get("Content-Type") || "video/mp4"
    );
    respHeaders.set("Cache-Control", "no-store");

    const cl = vidResp.headers.get("Content-Length");
    if (cl) respHeaders.set("Content-Length", cl);
    const cr = vidResp.headers.get("Content-Range");
    if (cr) respHeaders.set("Content-Range", cr);

    // Pipe ReadableStream straight through — ZERO buffering
    return new Response(vidResp.body, {
      status: vidResp.status,
      headers: respHeaders,
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
