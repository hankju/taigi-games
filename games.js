// 遊戲清單：大廳首頁照這個順序列出。新增遊戲 → 建 games/<id>/index.html，再在這裡加一筆
// id：資料夾名稱（英文小寫）；icon：卡片圖示；color / accent：卡片底色與字色，建議跟遊戲本身配色一致
// name／lo：遊戲名稱與台羅（以詞為單位、詞內用連字號，開頭大寫），大廳顯示在名稱上方
// desc：說明
// art：卡片封面插畫（img/ 裡 800×400 的 WebP，可省略）；tags：卡片上的小標籤；hist：遊戲存成績的 localStorage key（格式 [{m, s, t}]），大廳會顯示最高分與次數
window.GAMES = [
  {
    id: 'yeshi',
    art: 'img/card_yeshi.webp',
    icon: '🏮',
    name: '來去踅夜市',
    lo: 'Lâi-khì se̍h iā-tshī',
    desc: '看漢字選台羅、聽發音揣意思、台文句子填空。',
    tags: ['台羅拼音', '詞義', '辭典錄音'],
    color: '#16233f',
    accent: '#f4b740',
    hist: 'ys_hist'
  },
  {
    id: 'newyear',
    art: 'img/card_newyear.webp',
    icon: '🧧',
    name: '過年好話押韻王',
    lo: 'Kuè-nî hó-uē ah-ūn-ông',
    desc: '好話飄飄、翻紅包、搶答放炮，食物配好話押予著。',
    tags: ['押韻', '吉祥話', '限時挑戰'],
    color: '#8e1b20',
    accent: '#f2c14e',
    hist: 'hy2_hist'
  },
  {
    id: 'tailo',
    art: 'img/card_tailo.webp',
    icon: '🌸',
    name: '台羅拼音練習',
    lo: 'Tâi-lô phing-im liān-si̍p',
    desc: '聽錄音揣聲母、揤字母拼韻母、看漢字選聲調，一回合 20 題。',
    tags: ['台羅拼音', '聲調', '辭典錄音'],
    color: '#2f7f9a',
    accent: '#ffe7a3',
    hist: 'tl_hist'
  },
  {
    id: 'phainn',
    art: 'img/card_phainn.webp',
    icon: '🤐',
    name: '歹話毋通講',
    lo: 'Pháinn-uē m̄-thang kóng',
    desc: '教育部辭典收錄的罵人話、喪葬禁忌、屎尿佮性相關的詞，聽聲揣意思、看情境猜講法。',
    warn: '內容含髒話、粗俗與不雅字眼，請斟酌使用',
    tags: ['辭典錄音', '400 个詞'],
    color: '#2a2420',
    accent: '#d7b04a',
    hist: 'pw_hist'
  }
];
