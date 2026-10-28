// 遊戲共用的回饋：答對／答錯音效、手機震動、結算評語
// 音效用 Web Audio 即時合成，很短很輕，不會蓋過詞語朗讀；設定記在 fx_muted（各遊戲共用）
(function () {
  const KEY = 'fx_muted';
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}
  let ac = null;
  function tone(f, dur, type, vol, at) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime + (at || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
    } catch (e) {}
  }
  const buzz = ms => { try { if (!muted && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

  // 答對：清脆兩聲「叮叮」（0.15 秒內結束，朗讀幾乎同時開始也聽得清楚）
  function ok() { tone(1046, .12, 'sine', .12); tone(1568, .14, 'sine', .1, .06); }
  // 答錯：低低一聲＋手機短震
  function bad() { tone(196, .22, 'triangle', .14); buzz(90); }

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
