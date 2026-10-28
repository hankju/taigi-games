# 台語小遊戲合集：開發慣例

- 純靜態網站，部署在 GitHub Pages，沒有建置步驟、沒有 npm。
- 每個遊戲是 `games/<id>/index.html` 單一檔案（CSS、JS 寫在檔案裡），素材放同一個資料夾，路徑一律用相對路徑。
- 新增遊戲時一定要：在根目錄 `games.js` 加一筆；遊戲首頁放 `<a href="../../">‹ 全部遊戲</a>`；`localStorage` key 用遊戲專屬前綴（已用：`ys_`＝yeshi、`hy2_`＝newyear、`tl_`＝tailo）；成績紀錄存成 `<前綴>hist`＝`[{m, s, t}]`（分數滿分 100），並填進 `games.js` 的 `hist`，大廳才會顯示最高分。
- 新遊戲的回饋請用共用的 `fx.js`：答對 `FX.ok()`、答錯 `FX.bad()`、封面放「🔊 音效」開關 `FX.attachToggle(按鈕)`、結算評語 `FX.verdict(得分, 滿分, 上一擺分數)`；配樂用 `music.js` 的 `HubMusic.attachToggle(按鈕, '曲名')`。結算若有錯題，提供「再練錯的這幾題」（不記成績）。
- 大廳 `index.html` 要同時照顧手機（單欄）與電腦（≥960px 左側 QR Code＋右側卡片）；QR Code 用本地的 `vendor/qrcode.js`，不依賴外部 CDN。
- 目標是手機直式畫面：viewport-fit=cover、處理 safe-area、左右至少 16px 留白、不能橫向捲動。
- 介面文字、註解用繁體中文；遊戲內可用台文漢字，台羅用教育部台羅拼音。
- 使用教育部辭典的詞條或錄音時，要在遊戲內與 README 標註來源與 CC BY-ND 3.0 TW，錄音不能修改。
- `games/newyear/index.html` 是 CRLF 換行，編輯時保持原樣。
- 台羅拼音練習（`games/tailo/`）的現況、規格與補題庫步驟寫在 `games/tailo/README.md`，接手前先讀；改題庫後跑 `python3 games/tailo/tools/check_bank.py --fix`。
- `games/tailo/` 題庫裡第一課單詞沿用 `games/yeshi/audio/` 的錄音（路徑 `../yeshi/audio/…`），搬動 yeshi 的錄音時要一起改；其他詞的錄音在 `games/tailo/audio/`。
- 使用者是高中生（高中閩南語文課），選詞與難度以高中程度為準，但正式課程的遊戲排除粗俗不雅的詞。
- 粗俗、罵人、喪葬、性相關的詞集中在課外遊戲 `games/phainn/`（localStorage 前綴 `pw_`）。題庫照使用者要求不另外剔除冒犯性的詞，由任課老師把關；要刪詞就改 `games/phainn/bank.js`。釋義照辭典原文，含「應避免使用」等說明。題庫裡 `combo: true` 的是辭典詞組合的常用罵人話（非辭典詞條），`parts` 列各組成的辭典錄音；不要把錄音接成一句，因為連讀會變調，而且授權不能改錄音。
- 雲端開發環境（Claude Code 網頁版）連不到教育部辭典網站；要查詞、下載錄音請在本機做（步驟見 `games/tailo/README.md`），先用 curl 確認連得上，連不上就請老師提供錄音。台羅、釋義也可從 GitHub 上的 g0v/moedict-data-twblg 取得。
- Windows 主控台是 cp950，跑 Python 印中文罕用字會當掉；工具程式要把 stdout 設成 UTF-8（`check_bank.py` 已處理）。
