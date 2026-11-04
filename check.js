const fs = require("fs");
const src = fs.readFileSync("biliding.user.js", "utf8");
// 1) 收集 ic("name" 定义
const defined = new Set([...src.matchAll(/ic\("([a-z-]+)"/g)].map(m => m[1]));
// 2) 收集 SVG.xxx / SVG["xxx"] 使用
const used = new Set();
for (const m of src.matchAll(/SVG\.([a-zA-Z]+)/g)) used.add(m[1]);
for (const m of src.matchAll(/SVG\["([a-zA-Z]+)"\]/g)) used.add(m[1]);
const missing = [...used].filter(k => !defined.has(k));
console.log("icons defined:", defined.size, "used:", used.size);
console.log("missing icons:", missing.length ? missing.join(", ") : "none");
// 3) 检查 compose toolbar 里的图标键
for (const m of src.matchAll(/toolbar:\s*\[([^\]]+)\]/g)) {
  const keys = m[1].split(",").map(s => s.trim().replace(/"/g, "")).filter(Boolean);
  const bad = keys.filter(k => !defined.has(k));
  if (bad.length) console.log("toolbar missing:", bad.join(", "));
}
// 4) 皮肤 CSS 块
for (const id of ["dingtalk", "feishu", "wecom"]) {
  const has = src.includes('.im-shell[data-skin="' + id + '"]');
  console.log("css block", id, has ? "ok" : "MISSING");
}
// 5) String.raw 反引号平衡
const bt = (src.match(/`/g) || []).length;
console.log("backticks:", bt, bt % 2 === 0 ? "balanced" : "UNBALANCED");
