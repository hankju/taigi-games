// 遊戲清單：大廳首頁照這個順序列出。新增遊戲 → 建 games/<id>/index.html，再在這裡加一筆
// id：資料夾名稱（英文小寫）
// name／lo：遊戲名稱與台羅，lo 的音節數要跟 name 的字數一樣（大廳逐字標音）
// desc：一句話說明玩什麼（20 字左右）
// icon：卡片左上角的圖示（也當角落的淡浮水印）
// color／accent：卡片底色與字色，建議跟遊戲本身配色一致
// hist：遊戲存成績的 localStorage key（格式 [{m, s, t}]），大廳會顯示最高分與次數
window.GAMES = [
  {
    id: 'yeshi',
    name: '來去踅夜市',
    icon: '🏮',
    lo: 'lâi-khì se̍h iā-tshī',
    desc: '第一課單詞：看漢字選台羅、聽錄音揣意思、台文填空。',
    color: '#16233f',
    accent: '#f4b740',
    hist: 'ys_hist'
  },
  {
    id: 'newyear',
    name: '過年好話押韻王',
    icon: '🧧',
    lo: 'kuè-nî hó-uē ah-ūn-ông',
    desc: '食物配吉祥話，揣出押韻的另一半。',
    color: '#8e1b20',
    accent: '#f2c14e',
    hist: 'hy2_hist'
  },
  {
    id: 'tailo',
    name: '台羅拼音練習',
    icon: '🌸',
    lo: 'Tâi-lô phing-im liān-si̍p',
    desc: '聽錄音，分別練聲母、韻母佮聲調。',
    color: '#2f7f9a',
    accent: '#ffe7a3',
    hist: 'tl_hist'
  }
];
