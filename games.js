// 遊戲清單：大廳首頁照這個順序列出。新增遊戲 → 建 games/<id>/index.html，再在這裡加一筆
// id：資料夾名稱（英文小寫）；icon：卡片圖示；color / accent：卡片底色與字色，建議跟遊戲本身配色一致
// name／lo：遊戲名稱與台羅，lo 的音節數要跟 name 的字數一樣（大廳在名稱上方逐字標音）
// desc：說明
// tags：卡片上的小標籤；hist：遊戲存成績的 localStorage key（格式 [{m, s, t}]），大廳會顯示最高分與次數
window.GAMES = [
  {
    id: 'yeshi',
    icon: '🏮',
    name: '來去踅夜市',
    lo: 'lâi-khì se̍h iā-tshī',
    desc: '看漢字選台羅、聽發音揣意思、台文句子填空。',
    tags: ['台羅拼音', '詞義', '辭典錄音'],
    color: '#16233f',
    accent: '#f4b740',
    hist: 'ys_hist'
  },
  {
    id: 'newyear',
    icon: '🧧',
    name: '過年好話押韻王',
    lo: 'kuè-nî hó-uē ah-ūn-ông',
    desc: '好話飄飄、翻紅包、搶答放炮，食物配好話押予著。',
    tags: ['押韻', '吉祥話', '限時挑戰'],
    color: '#8e1b20',
    accent: '#f2c14e',
    hist: 'hy2_hist'
  },
  {
    id: 'tailo',
    icon: '🌸',
    name: '台羅拼音練習',
    lo: 'Tâi-lô phing-im liān-si̍p',
    desc: '聽錄音揣聲母、按字母拼韻母、看漢字選聲調，一回合 20 題。',
    tags: ['台羅拼音', '聲調', '辭典錄音'],
    color: '#2f7f9a',
    accent: '#ffe7a3',
    hist: 'tl_hist'
  }
];
