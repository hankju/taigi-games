# 台語小遊戲

台語學習小遊戲合集，手機瀏覽器就能玩。首頁是遊戲大廳，點卡片進入各遊戲。

遊玩網址：https://hankju.github.io/taigi-games/

## 目前的遊戲

| 遊戲 | 資料夾 | 內容 |
| --- | --- | --- |
| 🏮 來去踅夜市 | `games/yeshi/` | 台語課第一課單詞練習：台羅拼音、台羅＋詞義、台文填空 |
| 🧧 過年好話押韻王 | `games/newyear/` | 過年吉祥話押韻：好話飄飄、翻紅包、搶答放炮 |

## 結構

```
index.html        遊戲大廳（照 games.js 自動列出卡片）
games.js          遊戲清單
games/<id>/       每個遊戲一個資料夾，裡面的 index.html 可以單獨打開
```

## 新增一個遊戲

1. 建資料夾 `games/<id>/`（`<id>` 用英文小寫，例：`games/tshiu-tshai/`），遊戲放在裡面的 `index.html`；錄音、圖片、題庫也放同一個資料夾。
2. 在 `games.js` 加一筆（`id`、`icon`、`name`、`tag`、`desc`、`color`、`accent`）。
3. 遊戲首頁放一個回大廳的連結：`<a href="../../">‹ 全部遊戲</a>`。
4. 用 `localStorage` 存成績時，key 加上這個遊戲專屬的前綴（例：`tc_hist`），避免跟其他遊戲撞名。

遊戲網址會是 `…/taigi-games/games/<id>/`，可以單獨分享給學生。

## 資料來源與授權

〈來去踅夜市〉補充詞的台羅、釋義、例句，以及 `games/yeshi/audio/` 內的錄音，取自教育部《臺灣台語常用詞辭典》（https://sutian.moe.edu.tw/），依 CC BY-ND 3.0 TW 授權使用，錄音未經修改。
