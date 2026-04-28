const fs = require("fs");
const nuxt = JSON.parse(fs.readFileSync("nuxt.json", "utf8"));
  // Resolve NUXT references
  function resolve(index) {
    if (typeof index !== "number" || index < 0 || index >= nuxt.length) return index;
    const val = nuxt[index];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const out = {};
      for (const [k, v] of Object.entries(val)) out[k] = resolve(v);
      return out;
    }
    if (Array.isArray(val)) return val.map(resolve);
    return val;
  }

  for (let i = 0; i < nuxt.length; i++) {
    const resolved = resolve(i);
    if (!resolved || typeof resolved !== "object" || Array.isArray(resolved)) continue;
    if (resolved.subjectId) {
      console.log(resolved.title || resolved.subjectId);
      // Let's print out if it has dubs or audios or languages
      console.log(Object.keys(resolved).filter(k => k.toLowerCase().includes('dub') || k.toLowerCase().includes('lang') || k.toLowerCase().includes('aud')));
    }
  }
