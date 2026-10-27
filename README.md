# 台語小遊戲

台語學習小遊戲合集，手機掃 QR Code 就能玩，電腦也可以。首頁是遊戲大廳，點卡片進入各遊戲。

- 每張遊戲卡片有「QR Code」按鈕，點了會放大，可以投影給全班掃。
- 用電腦開大廳時，左邊會直接顯示整個網站的 QR Code。
- 卡片會顯示這支手機（或這台電腦）玩過的最高分與次數。
- 大廳有「背景音樂」開關（預設關閉、會記住選擇）。音樂是 `music.js` 用 Web Audio 即時合成的原創五聲音階旋律，沒有音檔、沒有授權問題。

遊玩網址：https://hankju.github.io/taigi-games/

## 目前的遊戲

| 遊戲 | 資料夾 | 內容 |
| --- | --- | --- |
| 🏮 來去踅夜市 | `games/yeshi/` | 台語課第一課單詞練習：台羅拼音、台羅＋詞義、台文填空 |
| 🧧 過年好話押韻王 | `games/newyear/` | 過年吉祥話押韻：好話飄飄、翻紅包、搶答放炮 |
| 🌸 台羅拼音練習 | `games/tailo/` | 聲母、韻母、聲調三種練習，一回合 20 題，封面顯示今日最高分與平均 |

## 結構

```
index.html        遊戲大廳（照 games.js 自動列出卡片）
games.js          遊戲清單
music.js          大廳背景音樂（Web Audio 合成）
vendor/qrcode.js  QR Code 產生器（qrcode-generator 1.4.4，MIT 授權，Kazuhiko Arase）
games/<id>/       每個遊戲一個資料夾，裡面的 index.html 可以單獨打開
```

## 新增一個遊戲

1. 建資料夾 `games/<id>/`（`<id>` 用英文小寫，例：`games/tshiu-tshai/`），遊戲放在裡面的 `index.html`；錄音、圖片、題庫也放同一個資料夾。
2. 在 `games.js` 加一筆（`id`、`icon`、`name`、`tag`、`desc`、`tags`、`color`、`accent`、`hist`）。
3. 遊戲首頁放一個回大廳的連結：`<a href="../../">‹ 全部遊戲</a>`。
4. 用 `localStorage` 存成績時，key 加上這個遊戲專屬的前綴（例：`tc_hist`），避免跟其他遊戲撞名。
   成績紀錄存成 `[{m: 模式, s: 分數, t: 時間}]` 陣列，並把 key 填進 `games.js` 的 `hist`，大廳就會顯示最高分與次數。

遊戲網址會是 `…/taigi-games/games/<id>/`，可以單獨分享給學生。

## 資料來源與授權

〈來去踅夜市〉補充詞的台羅、釋義、例句，以及 `games/yeshi/audio/` 內的錄音，取自教育部《臺灣台語常用詞辭典》（https://sutian.moe.edu.tw/），依 CC BY-ND 3.0 TW 授權使用，錄音未經修改。

## 台羅拼音練習：加新詞

詳細步驟、題庫格式與待辦見 [`games/tailo/README.md`](games/tailo/README.md)。改完題庫後執行：

```
python3 games/tailo/tools/check_bank.py --fix
```
