async function run() {
  const res = await fetch("https://moviebox.ph/detail/fallout-125027", {headers: {"User-Agent": "Mozilla/5.0"}});
  const html = await res.text();
  require("fs").writeFileSync("html.txt", html);
}
run();
