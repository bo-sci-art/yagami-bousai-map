# 矢上小 防災行動マップ（公開版）

矢上小学校4年2組の子どもたちがつくった防災アートを、保護者の方がスマホで見るためのサイトです。
12月12日のワークショップ（WS）の案内も出します。

- 公開URL：https://bo-sci-art.github.io/yagami-bousai-map/
- QRコード：[`qr/yagami-bousai-map-qr.png`](qr/yagami-bousai-map-qr.png)（印刷用 2400×2400px）、[`qr/yagami-bousai-map-qr.svg`](qr/yagami-bousai-map-qr.svg)（拡大しても荒れない版）
- 見るだけのサイトです。作品の登録・削除・非公開などの管理機能は入っていません（授業用リポジトリ [WSsupportApp_yagami_2026](https://github.com/bo-sci-art/WSsupportApp_yagami_2026) の管理画面で行います）

---

## 1. WSの情報を変える（コードは触りません）

WSの情報は、すべて [`config/workshop.json`](config/workshop.json) の1つのファイルにあります。

### GitHub のサイト上で変える手順
1. https://github.com/bo-sci-art/yagami-bousai-map を開き、`config` → `workshop.json` を押す
2. 右上の鉛筆マーク（Edit this file）を押す
3. `"` で囲まれた文字を書きかえる（`"` や `,` は消さない）
4. 右上の「Commit changes...」→ もう一度「Commit changes」を押す
5. 1〜2分で公開サイトに反映されます（「Actions」タブで緑のチェックになれば完了。赤い×のときは下の「困ったとき」）

### 項目の意味
| 項目 | 意味 | 書き方の例 |
|---|---|---|
| `enabled` | WSの案内を出すか。`false` にすると、すぐにすべて消える | `true` / `false`（`"` はつけない） |
| `title` | WS名 | `"防災力を育むデジタルアート制作ワークショップ"` |
| `summary` | 概要 | |
| `date` | 開催日（そのまま表示） | `"2026年12月12日（土）"` |
| `sessions` | 回ごとの名前・時間・会場。`{ ... }` を増やす・減らすと回の数が変わる | |
| `sessionNote` | 回の下に出す注意書き | |
| `target` / `capacity` / `childcare` / `bring` | 対象・定員・保育・持ち物。`""`（空）にするとその行は出ない | |
| `applyStart` | 申込開始日。この日より前は「〇月〇日から申し込めます」と出て、申込ボタンは出ない | `"2026-11-15"` |
| `applyEnd` | 申込締切日。**この日の23:59（日本時間）まで**案内を出し、次の日から自動ですべて消える | `"2026-12-06"` |
| `formUrl` | 「申し込む」ボタンで開くGoogleフォーム。forms.gle の短縮URLでもよい | `"https://forms.gle/xxxx"` |
| `flyerImage` | チラシ画像の場所。`""` にするとチラシは出ない | `"assets/ws-flyer-202612.jpg"` |

日付は必ず `"2026-12-06"` の形（年4けた-月2けた-日2けた）で書きます。

### WSの案内が出る場所（3つの導線）
1. 画面上のヘッダー右の「WSに参加する」ボタン（地図・作品のページ）
2. はじめてサイトを開いたときのお知らせ（2回目からは出ない）
3. 作品のページのいちばん下の「親子で一緒につくってみませんか？」

どれも「WS案内画面」（`workshop.html`）につながり、そこの「申し込む」でGoogleフォームが新しいタブで開きます。
`applyEnd` を過ぎるか `enabled` を `false` にすると、3つとも消えます。WS案内画面を直接開いた人には「申し込みは終了しました」と出ます。

### 次のWSに差し替えるとき
1. チラシ画像（JPG、横1500px くらい）を `assets/` に入れる
   - GitHub のサイト上なら `assets` フォルダを開き、「Add file」→「Upload files」
   - ファイル名は英数字にする（例 `ws-flyer-202703.jpg`）
2. `config/workshop.json` の全項目を新しいWSの内容に書きかえる
   - `applyStart` / `applyEnd` / `formUrl` / `flyerImage` を忘れずに
   - `enabled` を `true` にする
3. 「Commit changes」で保存
4. 初回のお知らせを、前のWSで見た人にももう一度出したいときは、`js/map.js` の `bousaiMap.introSeen.v1` の `v1` を `v2` に変える（ここだけはコードです）

### 公開前に手元で試したいとき（任意）
URLの最後に `?today=2026-12-07` をつけると、その日として表示を確かめられます（例：https://bo-sci-art.github.io/yagami-bousai-map/?today=2026-12-07 で締切後の表示）。設定は変わりません。

---

## 2. 作品データを更新する

作品の文章と画像は、このリポジトリには入っていません。
授業で使った Cloudflare Worker（`yagami-submit`）から、ページを開くたびに読み込んでいます。

- **作品を追加・修正したとき**：何もしなくてよい。次にページを開いたときに反映されます
- **作品をマップから隠したい・消したいとき**：授業用リポジトリの「作品の管理画面」で「非公開にする」か「削除する」（手順は授業用リポジトリの README「作品の管理画面（先生用）」）。このサイトには公開中の作品だけが出ます
- **場所（3か所）の名前・座標を変えるとき**：[`js/common.js`](js/common.js) の `PLACES`（コードなので、エンジニアのメンバーに頼んでください）

> 注意：Worker を止めたり消したりすると、このサイトの作品も表示されなくなります。

---

## 3. QRコードを作り直す

URLが同じなら、作り直す必要はありません（`qr/` の画像をそのまま使えます）。

URLが変わったときなど、作り直す手順（パソコンに Node.js が入っていること）：

```bash
npm install
```

```bash
npm run qr
```

`qr/yagami-bousai-map-qr.png` と `.svg` が新しくなります。別のURLで作るときは：

```bash
node tools/make_qr.mjs https://example.com/ ファイル名
```

印刷するときは、QRコードのまわりの白い余白を切らないでください（読み取れなくなることがあります）。2cm角以上の大きさにしてください。

---

## 4. しくみ（エンジニア向け）

- ビルドなしの静的サイト：`index.html`（地図＋一覧）、`detail.html`（作品）、`workshop.html`（WS案内）、`css/`、`js/`、`assets/`、`config/`
- 地図：Leaflet 1.9.4（`assets/vendor/leaflet/` に同梱）＋ 国土地理院タイル・重ねるハザードマップ
- 作品データ：`GET https://yagami-submit.kazuki131214.workers.dev/artworks` と `/images/<key>`（読み込みのみ）。Worker 側の CORS で `https://bo-sci-art.github.io` を許可済み
- パスはすべて相対パスなので、`/yagami-bousai-map/` のサブパスでそのまま動く
- 公開：`main` に push すると [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) が動き、`tools/check_site.mjs` で
  1. 公開するファイルだけを `_site/` に集める
  2. 管理機能・合言葉・書き込みの処理（`admin`、`ADMIN_KEY`、`Authorization`、`POST/DELETE/PATCH` など）がないか検索する
  3. HTML・CSS の参照先がすべてあるか（リンク切れ・絶対パスがないか）確かめる

  問題があれば公開を止めます（Pages の公開元は「GitHub Actions」）
- 手元で確かめる：

```bash
node tools/check_site.mjs
```

```bash
node tools/serve.mjs
```

  http://localhost:5600/yagami-bousai-map/ を開く（公開と同じサブパスで配信します）

## 困ったとき
- Actions が赤い×になった：Actions タブ → 失敗した実行 → 「公開するファイルを集めて確かめる」のログを見る。`NG ...` の行に理由が出ます。`config/workshop.json` の `"` や `,` の抜けが多いです
- 作品が出ない：「作品を読み込めませんでした」と出るときは Worker が止まっている可能性があります
