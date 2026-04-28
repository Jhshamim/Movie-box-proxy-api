async function run() {
  const req = new Request("http://localhost:3000/api/languages?id=fallout-125027");
  const worker = require("./src/index.js");
  const res = await worker.default.fetch(req, {}, {});
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
