// 大廳背景音樂：用 Web Audio 即時合成，不用音檔、無授權問題
// 原創旋律，D 宮五聲音階（D E F# A B），撥弦音色＋低音＋廟鐘＋殘響，8 小節循環約 25 秒
(function () {
  const BPM = 76, E = 60 / BPM / 2;          // 八分音符秒數
  // [MIDI 音高, 幾個八分音符]
  const MEL = [
    [66, 2], [69, 1], [71, 1], [69, 2], [66, 1], [64, 1], [62, 2], [64, 1], [66, 1], [69, 4],
    [71, 2], [74, 1], [71, 1], [69, 2], [66, 1], [69, 1], [64, 2], [66, 1], [64, 1], [62, 4],
    [66, 2], [69, 1], [71, 1], [74, 2], [71, 1], [69, 1], [71, 2], [69, 1], [66, 1], [64, 4],
    [69, 1], [71, 1], [69, 1], [66, 1], [64, 2], [66, 1], [64, 1], [62, 8]
  ];
  const BASS = [50, 45, 47, 50, 50, 47, 45, 50];   // 每小節一個低音
  const LOOP = 64 * E;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // 建立樂器，聲音輸出到 out
  function voices(ctx, out) {
    // 殘響：用衰減雜訊做 impulse response，模擬廟埕的空間感
    const len = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const rev = ctx.createConvolver(); rev.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = .35;
    rev.connect(wet).connect(out);
    const bus = ctx.createGain(); bus.connect(out); bus.connect(rev);

    function env(t, peak, atk, dec) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + atk);
      g.gain.exponentialRampToValueAtTime(.0001, t + atk + dec);
      g.connect(bus);
      return g;
    }
    function osc(type, f, t, end, dest, detune) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      if (detune) o.detune.value = detune;
      o.connect(dest); o.start(t); o.stop(end);
      return o;
    }
    return {
      // 撥弦：三角波＋泛音，濾波器由亮轉暗
      pluck(t, m, dur) {
        const dec = Math.min(.25 + dur * 1.4, 1.6);
        const g = env(t, .22, .006, dec);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
        lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + dec);
        lp.connect(g);
        osc('triangle', hz(m), t, t + dec + .05, lp);
        const h = ctx.createGain(); h.gain.value = .25; h.connect(lp);
        osc('sine', hz(m) * 2, t, t + dec + .05, h, 4);
      },
      // 柔和吹管：第二輪疊上去，有慢慢的顫音
      flute(t, m, dur) {
        const len = dur * .95, g = ctx.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .08);
        g.gain.setValueAtTime(.05, t + len - .08); g.gain.linearRampToValueAtTime(0, t + len);
        g.connect(bus);
        const o = osc('sine', hz(m + 12), t, t + len + .02, g);
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 5; lg.gain.value = 5; lfo.connect(lg).connect(o.detune);
        lfo.start(t); lfo.stop(t + len + .02);
      },
      bass(t, m, dur) {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .12);
        g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        g.connect(bus);
        osc('sine', hz(m), t, t + dur, g);
        osc('sine', hz(m + 12), t, t + dur, g);
      },
      // 廟鐘：高音加不和諧泛音，長長的尾音
      bell(t, m) {
        const g = env(t, .05, .004, 3.2);
        osc('sine', hz(m), t, t + 3.3, g);
        const h = ctx.createGain(); h.gain.value = .45; h.connect(g);
        osc('sine', hz(m) * 2.76, t, t + 3.3, h);
      }
    };
  }

  function loop(v, t0, n) {
    let t = t0;
    for (const [m, d] of MEL) {
      v.pluck(t, m, d * E);
      if (n % 2 === 1) v.flute(t, m, d * E);
      t += d * E;
    }
    BASS.forEach((m, i) => v.bass(t0 + i * 8 * E, m, 8 * E));
    v.bell(t0, 86); v.bell(t0 + 32 * E, 81);
  }

  let ctx = null, master = null, timer = 0, next = 0, n = 0;
  function start() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(.8, ctx.currentTime + 1.5);
    const v = voices(ctx, master);
    next = ctx.currentTime + .15; n = 0;
    const tick = () => { while (ctx && next < ctx.currentTime + 1) { loop(v, next, n++); next += LOOP; } };
    tick(); timer = setInterval(tick, 300);
  }
  function stop() {
    if (!ctx) return;
    const c = ctx; ctx = null; clearInterval(timer);
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(master.gain.value, c.currentTime);
    master.gain.linearRampToValueAtTime(0, c.currentTime + .5);
    setTimeout(() => c.close(), 600);
  }
  // 切到別的分頁或進遊戲時暫停，回來再繼續
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  // 離線算出一段音樂（測試、試聽用）
  async function render(seconds) {
    const sr = 22050, off = new OfflineAudioContext(1, sr * seconds, sr);
    const g = off.createGain(); g.gain.value = .8; g.connect(off.destination);
    const v = voices(off, g);
    for (let k = 0; k * LOOP < seconds; k++) loop(v, .1 + k * LOOP, k);
    return off.startRendering();
  }

  window.HubMusic = { start, stop, playing: () => !!ctx, render };
})();
