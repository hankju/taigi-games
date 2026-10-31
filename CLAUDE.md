# 台語小遊戲合集：開發慣例

- 純靜態網站，部署在 GitHub Pages，沒有建置步驟、沒有 npm。
- 每個遊戲是 `games/<id>/index.html` 單一檔案（CSS、JS 寫在檔案裡），素材放同一個資料夾，路徑一律用相對路徑。
- 新增遊戲時一定要：在根目錄 `games.js` 加一筆；遊戲首頁放 `<a class="hublink" href="../../">‹ 全部遊戲</a>`，並在 `<head>` 複製其他遊戲的「課堂專用」片段（網址有 `?class=1` 時給 `<html>` 加 `class-mode`，藏起 `.hublink`），大廳的課堂專用 QR Code 才有效；`localStorage` key 用遊戲專屬前綴（已用：`ys_`＝yeshi、`hy2_`＝newyear、`tl_`＝tailo）；成績紀錄存成 `<前綴>hist`＝`[{m, s, t}]`（分數滿分 100），並填進 `games.js` 的 `hist`，大廳才會顯示最高分。老師用「今天最高分」登記上課成績，所以大廳與各遊戲的成績頁都以今天（本機時間 0 點起）的最高分為主、歷史最高為輔；新遊戲的成績頁照這個做（照日期分段、🏆 標今天最高）。
- 新遊戲的回饋請用共用的 `fx.js`：答對 `FX.ok()`、答錯 `FX.bad()`、封面放「🔊 音效」開關 `FX.attachToggle(按鈕)`、結算評語 `FX.verdict(得分, 滿分, 上一擺分數)`、破紀錄彩帶 `FX.record(同模式這回合以前的紀錄, 得分, 滿分)`（存成績前呼叫，錯題再練不要呼叫；照得分比例放結算特效：60% 起中央噴彩帶、80% 起兩邊噴、滿分加煙火星星；破今天最高或歷史最高再加一級並跳「新紀錄！」）、連續答對 `FX.combo`（開始、離開、結算叫 `reset()`；答對 `hit({from: 答對的按鈕或題目卡, to: 分數元素, pts: 得分, hot: 著火時發光的元素})`、答錯 `miss()`；連對 5／10／15 題火熱 1／2／3 級（畫面四周燒紅、火星、題目卡發光、分數旁 🔥），答錯只降一級；combo 只有畫面效果，不加分）；配樂用 `music.js` 的 `HubMusic.attachToggle(按鈕, '曲名')`。結算若有錯題，提供「再練錯的這幾題」（不記成績）。
- 大廳 `index.html` 要同時照顧手機（單欄）與電腦（≥960px 左側 QR Code＋右側卡片）；QR Code 用本地的 `vendor/qrcode.js`，不依賴外部 CDN。
- 第三方函式庫一律放 `vendor/`，用相對路徑載入：動畫用 GSAP 3.15.0（`gsap.min.js`，外掛 `DrawSVGPlugin.min.js`、`MotionPathPlugin.min.js`，用前 `gsap.registerPlugin(...)`）；慶祝特效用 canvas-confetti 1.9.4（`confetti.js`，全域函式 `confetti()`）。動畫要照顧 `prefers-reduced-motion`。
- 目標是手機直式畫面：viewport-fit=cover、處理 safe-area、左右至少 16px 留白、不能橫向捲動。
- 介面文字、註解用繁體中文；遊戲內可用台文漢字，台羅用教育部台羅拼音。
- 使用教育部辭典的詞條或錄音時，要在遊戲內與 README 標註來源與 CC BY-ND 3.0 TW，錄音不能修改。
- `games/newyear/index.html` 是 CRLF 換行，編輯時保持原樣；大廳 `index.html`、`README.md`、`CLAUDE.md` 在 repo 裡也是 CRLF，同樣保持。
- 大廳「看介紹影片」的 YouTube 影片 ID 在 `index.html` 的 `VIDEO`（`tall`＝直式 Shorts、`wide`＝橫式）；影片原始專案（Remotion）在 repo 外的 `D:\台語小遊戲\promo-video`，換影片時改這兩個 ID 就好。
- 大廳插畫放 `img/`，一律轉成 WebP（卡片封面 800×400、每張 100 KB 以內），不要放原始 PNG。新遊戲在 `games.js` 填 `art: 'img/card_<id>.webp'`，沒填就照舊只顯示圖示。插畫用 Codex 生成，腳本在 repo 外的 `D:\台語小遊戲\promo-video-assets\gen_cards2.sh`，新圖照裡面的 STYLE 描述（樸素的繪本水粉、人物畫小、不要光亮動漫臉與彩虹特效）才不會有 AI 味；圖裡不能有文字。
- 台羅拼音練習（`games/tailo/`）的現況、規格與補題庫步驟寫在 `games/tailo/README.md`，接手前先讀；改題庫後跑 `python3 games/tailo/tools/check_bank.py --fix`。
- `games/tailo/` 題庫裡第一課單詞沿用 `games/yeshi/audio/` 的錄音（路徑 `../yeshi/audio/…`），搬動 yeshi 的錄音時要一起改；其他詞的錄音在 `games/tailo/audio/`。
- 使用者是高中生（高中閩南語文課），選詞與難度以高中程度為準，但正式課程的遊戲排除粗俗不雅的詞。
- 粗俗、罵人、喪葬、性相關的詞集中在 `games/phainn/`（localStorage 前綴 `pw_`）；大廳卡片用 `warn` 欄位顯示內容警示，遊戲每次進入都先顯示內容提醒（勾「以後不要再顯示」才記在 `pw_skipgate`）。題庫照使用者要求不另外剔除冒犯性的詞，由任課老師把關；要刪詞就改 `games/phainn/bank.js`。釋義照辭典原文，含「應避免使用」等說明。題庫裡 `combo: true` 的是辭典詞組合的常用罵人話（非辭典詞條），`parts` 列各組成的辭典錄音；不要把錄音接成一句，因為連讀會變調，而且授權不能改錄音。`bank.js` 尾端的 `PW_SAME` 是意思相近的詞組，同組的詞不會互相當錯誤選項（釋義第一句有相同說法的也會自動避開）；新增詞時若有近義詞，要一起加進對應的組。
- 雲端開發環境（Claude Code 網頁版）連不到教育部辭典網站；要查詞、下載錄音請在本機做（步驟見 `games/tailo/README.md`），先用 curl 確認連得上，連不上就請老師提供錄音。台羅、釋義也可從 GitHub 上的 g0v/moedict-data-twblg 取得。
- Windows 主控台是 cp950，跑 Python 印中文罕用字會當掉；工具程式要把 stdout 設成 UTF-8（`check_bank.py` 已處理）。
