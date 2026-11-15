// 公開するファイルだけを _site/ に集め、次の2つを確かめる（GitHub Actions でも同じものを動かす）
//   1. 管理機能・合言葉・書き込みの処理が入っていないこと
//   2. HTML・CSS から参照しているファイルが、すべて _site/ の中にあること（リンク切れがない）
// 使い方：node tools/check_site.mjs
import { cpSync, rmSync, mkdirSync, readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, extname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "_site");
// 公開するもの（これ以外は公開しない）
const PUBLISH = ["index.html", "detail.html", "workshop.html", "css", "js", "assets", "config"];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const p of PUBLISH) cpSync(join(ROOT, p), join(OUT, p), { recursive: true });
cpSync(join(ROOT, ".nojekyll"), join(OUT, ".nojekyll"));

const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const f = join(d, n);
    statSync(f).isDirectory() ? walk(f) : files.push(f);
  }
})(OUT);

const FORBIDDEN = [
  [/admin/i, "管理画面・管理用の名前"],
  [/ADMIN_KEY|SUBMIT_SECRET|secret/i, "合言葉"],
  [/Authorization|Bearer\s/i, "認証ヘッダー"],
  [/["'`/]export\b|\/submit\b/, "管理用・送信用のURL"],
  [/method\s*:\s*["'](POST|PUT|PATCH|DELETE)/i, "書き込みの処理"],
  [/wrangler|\.dev\.vars/i, "Worker の設定"]
];
const TEXT = new Set([".html", ".js", ".css", ".json", ".txt", ".svg"]);
let problems = 0;
for (const f of files) {
  if (!TEXT.has(extname(f))) continue;
  const src = readFileSync(f, "utf8");
  for (const [re, label] of FORBIDDEN) {
    const m = src.match(re);
    if (m) { problems++; console.error(`NG ${label}: ${relative(OUT, f)} に「${m[0]}」があります`); }
  }
}

// 参照しているファイルがあるか（http で始まるもの・# だけのもの・data: は対象外）
const REF = /(?:src|href)\s*=\s*"([^"]+)"|url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
for (const f of files) {
  const ext = extname(f);
  if (ext !== ".html" && ext !== ".css") continue;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(REF)) {
    let ref = (m[1] || m[2]).trim();
    if (/^(https?:|data:|mailto:|#|\/\/)/.test(ref)) continue;
    if (ext === ".css" && /leaflet\.css$/.test(f) && /^(images\/|#default)/.test(ref)) continue; // Leaflet 標準のマーカー画像（使っていない）
    ref = ref.split(/[?#]/)[0];
    if (!ref) continue;
    if (ref.startsWith("/")) { problems++; console.error(`NG 絶対パス（サブパス配信でリンク切れになる）: ${relative(OUT, f)} → ${ref}`); continue; }
    const target = join(dirname(f), ref);
    if (!existsSync(target)) { problems++; console.error(`NG リンク切れ: ${relative(OUT, f)} → ${ref}`); }
  }
}
// config/workshop.json のチラシ画像
const ws = JSON.parse(readFileSync(join(OUT, "config/workshop.json"), "utf8"));
if (ws.flyerImage && !/^https?:/.test(ws.flyerImage) && !existsSync(join(OUT, ws.flyerImage))) {
  problems++; console.error(`NG チラシ画像がありません: ${ws.flyerImage}`);
}
for (const k of ["enabled", "title", "date", "applyEnd", "formUrl"]) {
  if (!(k in ws)) { problems++; console.error(`NG config/workshop.json に ${k} がありません`); }
}
if (ws.applyEnd && !/^\d{4}-\d{2}-\d{2}$/.test(ws.applyEnd)) { problems++; console.error("NG applyEnd は 2026-12-06 の形で書いてください"); }

console.log(`${files.length} ファイルを確かめました`);
if (problems) { console.error(`${problems} 件の問題があります`); process.exit(1); }
console.log("OK：管理機能・合言葉・書き込みの処理はなく、リンク切れもありません");
