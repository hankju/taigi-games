// 遊戲共用的回饋：答對／答錯音效、震動（Android）、觸覺回饋（iPhone，iOS 18 起）、結算評語
// 音效用 Web Audio 即時合成；響的時候配樂（music.js）會讓位一下；設定記在 fx_muted（各遊戲共用）
(function () {
  const KEY = 'fx_muted';
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}
  let ac = null;
  // f：頻率；at：幾秒後響；lp：低通濾波頻率（方波刺耳，濾一下比較圓）
  function tone(f, dur, type, vol, at, lp) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state !== 'running') ac.resume();
      const t = ac.currentTime + (at || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01);
      g.gain.setValueAtTime(vol, t + dur * .4);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      let node = o;
      if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
      node.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
    } catch (e) {}
  }

  // 震動：Android 用 navigator.vibrate；iPhone 的 Safari 不支援，iOS 18 起改用「切換開關」的觸覺回饋
  let hapticLabel = null;
  function iosTick() {
    try {
      if (!hapticLabel) {
        const sw = document.createElement('input'); sw.type = 'checkbox'; sw.setAttribute('switch', ''); sw.id = 'fx-haptic';
        hapticLabel = document.createElement('label'); hapticLabel.htmlFor = 'fx-haptic';
        for (const el of [sw, hapticLabel]) { el.setAttribute('aria-hidden', 'true'); el.tabIndex = -1; el.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none'; document.body.appendChild(el); }
      }
      hapticLabel.click();
    } catch (e) {}
  }
  function buzz(pattern, ticks) {
    if (muted) return;
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
      else for (let i = 0; i < ticks; i++) setTimeout(iosTick, i * 120);
    } catch (e) {}
  }
  const duckBgm = ms => { try { if (window.HubMusic && HubMusic.duckFor) HubMusic.duckFor(ms); } catch (e) {} };

  // 答對：明亮的三連音「叮叮叮↑」＋高音閃一下，約 0.4 秒
  function ok() {
    if (!muted) {
      duckBgm(450);
      [[1047, 0], [1319, .07], [1568, .14]].forEach(([f, at]) => tone(f, .22, 'triangle', .3, at));
      tone(2093, .3, 'sine', .12, .14);
    }
    buzz(35, 1);
  }
  // 答錯：手機喇叭放得出來的中音「噗噗↓」兩聲往下掉，約 0.45 秒；震動兩段
  function bad() {
    if (!muted) {
      duckBgm(500);
      tone(330, .18, 'square', .2, 0, 1500);
      tone(233, .26, 'square', .22, .17, 1300);
    }
    buzz([110, 70, 160], 2);
  }

  // 「🔊 音效」開關
  function attachToggle(btn) {
    const label = () => { btn.textContent = muted ? '🔇 音效' : '🔊 音效'; btn.setAttribute('aria-pressed', !muted); };
    btn.addEventListener('click', () => { muted = !muted; try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {} label(); if (!muted) ok(); });
    label();
  }

  // 結算評語：依得分比例給一句鼓勵；prev 是同模式上一擺的分數（沒有就不比較）
  function verdict(score, total, prev) {
    const r = total ? score / total : 0;
    const msg = r >= 1 ? '攏著！真勥！' : r >= .8 ? '真讚，閣較細膩就滿分矣！' : r >= .6 ? '袂䆀，閣拍拚！' : '莫失志，閣試一擺！';
    let diff = '';
    if (prev != null) {
      const d = score - prev;
      diff = d > 0 ? `比上一擺加 ${d} 分 ⬆` : d < 0 ? `比上一擺少 ${-d} 分` : '佮上一擺仝分';
    }
    return {msg, diff, up: prev != null && score > prev};
  }

  window.FX = { ok, bad, attachToggle, verdict, muted: () => muted };
})();
