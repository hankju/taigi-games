# 台語小遊戲合集：開發慣例

- 純靜態網站，部署在 GitHub Pages，沒有建置步驟、沒有 npm。
- 每個遊戲是 `games/<id>/index.html` 單一檔案（CSS、JS 寫在檔案裡），素材放同一個資料夾，路徑一律用相對路徑。
- 新增遊戲時一定要：在根目錄 `games.js` 加一筆；遊戲首頁放 `<a href="../../">‹ 全部遊戲</a>`；`localStorage` key 用遊戲專屬前綴（已用：`ys_`＝yeshi、`hy2_`＝newyear）。
- 目標是手機直式畫面：viewport-fit=cover、處理 safe-area、左右至少 16px 留白、不能橫向捲動。
- 介面文字、註解用繁體中文；遊戲內可用台文漢字，台羅用教育部台羅拼音。
- 使用教育部辭典的詞條或錄音時，要在遊戲內與 README 標註來源與 CC BY-ND 3.0 TW，錄音不能修改。
- `games/newyear/index.html` 是 CRLF 換行，編輯時保持原樣。
