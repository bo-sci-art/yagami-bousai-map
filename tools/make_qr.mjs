// 公開URLのQRコード（印刷用の高解像度PNG）を qr/ に作る
// 使い方：npm install（はじめの1回だけ）→ npm run qr
//   別のURLで作るとき：node tools/make_qr.mjs https://example.com/ ファイル名
import QRCode from "qrcode";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const URL_ = process.argv[2] || "https://bo-sci-art.github.io/yagami-bousai-map/";
const NAME = process.argv[3] || "yagami-bousai-map-qr";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "qr");
mkdirSync(OUT, { recursive: true });

const opts = { errorCorrectionLevel: "M", margin: 4, color: { dark: "#000000", light: "#ffffff" } };
await QRCode.toFile(join(OUT, NAME + ".png"), URL_, { ...opts, width: 2400 });   // 2400px：8cm角で約760dpi
await QRCode.toFile(join(OUT, NAME + ".svg"), URL_, { ...opts, type: "svg" });   // 拡大しても荒れない版
console.log("作りました：qr/" + NAME + ".png と qr/" + NAME + ".svg（" + URL_ + "）");
