async function run() {
  const res = await fetch("https://moviebox.ph/detail/fallout-125027");
  const html = await res.text();
  const match = html.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return;
  const nuxt = JSON.parse(match[1]);
  require("fs").writeFileSync("nuxt.json", JSON.stringify(nuxt, null, 2));
}
run();
