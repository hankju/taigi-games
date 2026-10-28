// 背景配樂：用 Web Audio 即時合成，不用音檔、無授權問題；大廳與各遊戲共用
// 每首都是原創旋律（五聲音階），8 小節一直循環。HubMusic.start('曲名') 開始，曲名見下方 THEMES
// 遊戲裡播錄音（<audio>／new Audio）的時候，配樂會自動壓低，錄音結束再慢慢回來，不會蓋過朗讀
(function () {
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // 曲目：bpm、旋律 [MIDI 音高, 幾個八分音符]（合計 64 個八分音符＝8 小節）、每小節低音、主奏音色、打擊、音量
  const THEMES = {
    // 大廳：D 宮，撥弦＋第二輪疊吹管、廟鐘，悠閒
    hub: {
      bpm: 76, vol: .8, lead: 'pluck', second: 'flute', bells: [[0, 86], [32, 81]],
      mel: [
        [66, 2], [69, 1], [71, 1], [69, 2], [66, 1], [64, 1], [62, 2], [64, 1], [66, 1], [69, 4],
        [71, 2], [74, 1], [71, 1], [69, 2], [66, 1], [69, 1], [64, 2], [66, 1], [64, 1], [62, 4],
        [66, 2], [69, 1], [71, 1], [74, 2], [71, 1], [69, 1], [71, 2], [69, 1], [66, 1], [64, 4],
        [69, 1], [71, 1], [69, 1], [66, 1], [64, 2], [66, 1], [64, 1], [62, 8]
      ],
      bass: [50, 45, 47, 50, 50, 47, 45, 50]
    },
    // 來去踅夜市：G 宮，輕快撥弦＋木魚輕敲反拍，像夜市攤仔
    yeshi: {
      bpm: 92, vol: .3, lead: 'pluck', second: 'pluckHi', wood: [1, 3, 5, 7],
      mel: [
        [67, 1], [69, 1], [71, 2], [74, 1], [71, 1], [69, 2], [67, 1], [64, 1], [67, 2], [69, 4],
        [71, 1], [74, 1], [76, 2], [74, 1], [71, 1], [69, 2], [71, 1], [69, 1], [67, 2], [64, 4],
        [67, 1], [69, 1], [71, 2], [74, 2], [76, 1], [74, 1], [71, 2], [69, 1], [71, 1], [74, 4],
        [76, 1], [74, 1], [71, 1], [69, 1], [67, 2], [69, 1], [64, 1], [67, 8]
      ],
      bass: [55, 52, 50, 55, 52, 50, 48, 55]
    },
    // 過年好話押韻王：C 宮，像嗩吶的吹管＋每拍輕敲、每段頭敲鑼，熱鬧
    newyear: {
      bpm: 116, vol: .26, lead: 'reed', second: 'reed', wood: [0, 2, 4, 6], gong: [0, 32],
      mel: [
        [72, 1], [74, 1], [76, 2], [79, 2], [76, 1], [74, 1], [72, 2], [74, 1], [76, 1], [79, 4],
        [81, 1], [79, 1], [76, 2], [79, 1], [76, 1], [74, 2], [76, 1], [74, 1], [72, 2], [69, 4],
        [72, 1], [74, 1], [76, 2], [79, 2], [81, 1], [84, 1], [81, 2], [79, 1], [81, 1], [79, 4],
        [76, 1], [79, 1], [76, 1], [74, 1], [72, 2], [74, 1], [69, 1], [72, 8]
      ],
      bass: [48, 55, 57, 48, 53, 55, 57, 48]
    },
    // 台羅拼音練習：F 宮，輕快的音樂盒＋第二輪疊撥弦、每小節兩下輕木魚；有精神但不吵，方便專心聽音
    tailo: {
      bpm: 88, vol: .3, lead: 'box', second: 'pluckHi', wood: [2, 6],
      mel: [
        [77, 1], [79, 1], [81, 2], [84, 1], [81, 1], [79, 2], [77, 1], [79, 1], [81, 1], [77, 1], [74, 4],
        [77, 1], [79, 1], [81, 2], [84, 2], [86, 2], [84, 1], [81, 1], [79, 2], [81, 4],
        [84, 1], [86, 1], [84, 1], [81, 1], [79, 2], [81, 1], [84, 1], [86, 2], [84, 2], [81, 4],
        [79, 1], [81, 1], [79, 1], [77, 1], [74, 2], [77, 2], [79, 2], [77, 6]
      ],
      bass: [53, 50, 48, 53, 50, 48, 46, 53]
    }
  };

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
    const v = {
      // 撥弦：三角波＋泛音，濾波器由亮轉暗
      pluck(t, m, dur, n, hi) {
        const dec = Math.min(.25 + dur * 1.4, 1.6);
        const g = env(t, hi ? .1 : .22, .006, dec);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
        lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + dec);
        lp.connect(g);
        osc('triangle', hz(m + (hi ? 12 : 0)), t, t + dec + .05, lp);
        const h = ctx.createGain(); h.gain.value = .25; h.connect(lp);
        osc('sine', hz(m + (hi ? 12 : 0)) * 2, t, t + dec + .05, h, 4);
      },
      pluckHi(t, m, dur) { v.pluck(t, m, dur, 2, true); },
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
      // 像嗩吶的吹管：方波過低通、帶一點顫音；第二輪低八度、小聲
      reed(t, m, dur, n) {
        const len = dur * .9, g = ctx.createGain(), pk = n === 2 ? .035 : .07;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + .03);
        g.gain.setValueAtTime(pk, t + len - .05); g.gain.linearRampToValueAtTime(0, t + len);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 1;
        lp.connect(g); g.connect(bus);
        const o = osc('square', hz(m - (n === 2 ? 12 : 0)), t, t + len + .02, lp);
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 6; lg.gain.value = 8; lfo.connect(lg).connect(o.detune);
        lfo.start(t); lfo.stop(t + len + .02);
      },
      // 音樂盒：高音正弦＋泛音，敲了就慢慢消失
      box(t, m, dur, n) {
        const g = env(t, n === 2 ? .05 : .12, .003, Math.min(.6 + dur * .8, 2.2));
        osc('sine', hz(m), t, t + 2.4, g);
        const h = ctx.createGain(); h.gain.value = .3; h.connect(g);
        osc('sine', hz(m) * 3, t, t + 2.4, h);
      },
      bass(t, m, dur, pk = .16) {
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + .12);
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
      },
      // 木魚：短短的「叩」
      wood(t) {
        const g = env(t, .07, .002, .09);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 8; bp.connect(g);
        osc('sine', 880, t, t + .12, bp);
        osc('triangle', 1320, t, t + .12, bp);
      },
      // 鑼：低沉、帶不和諧泛音
      gong(t) {
        const g = env(t, .06, .01, 2.6);
        osc('sine', 98, t, t + 2.7, g);
        const h = ctx.createGain(); h.gain.value = .5; h.connect(g);
        osc('sine', 98 * 2.4, t, t + 2.7, h);
        osc('sine', 98 * 3.9, t, t + 2.7, h);
      }
    };
    return v;
  }

  // 排一輪（8 小節）
  function loop(v, th, t0, n) {
    const E = 60 / th.bpm / 2;
    let t = t0;
    for (const [m, d] of th.mel) {
      v[th.lead](t, m, d * E, 1);
      if (n % 2 === 1 && th.second) v[th.second](t, m, d * E, 2);
      t += d * E;
    }
    th.bass.forEach((m, i) => v.bass(t0 + i * 8 * E, m, 8 * E, th.lead === 'box' ? .1 : .16));
    for (const [at, m] of th.bells || []) v.bell(t0 + at * E, m);
    for (const at of th.gong || []) v.gong(t0 + at * E);
    if (th.wood) for (let bar = 0; bar < 8; bar++) for (const at of th.wood) v.wood(t0 + (bar * 8 + at) * E);
  }
  const loopLen = th => th.mel.reduce((a, x) => a + x[1], 0) * 60 / th.bpm / 2;

  const GESTURES = ['touchend', 'click', 'keydown'];
  let ctx = null, master = null, duck = null, timer = 0, next = 0, n = 0, cur = null;
  function start(name) {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const th = THEMES[name] || THEMES.hub; cur = th;
    ctx = new AC();
    // iOS 要在點擊的同一瞬間真的放出聲音才算解鎖：先播一個聽不到的極短靜音
    try { const sb = ctx.createBufferSource(); sb.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); sb.connect(ctx.destination); sb.start(0); } catch (e) {}
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    master = ctx.createGain(); master.gain.value = 0;
    duck = ctx.createGain(); duck.gain.value = playingMedia.size ? DUCK : 1;
    master.connect(duck).connect(ctx.destination);
    master.gain.linearRampToValueAtTime(th.vol, ctx.currentTime + 1.5);
    const v = voices(ctx, master), L = loopLen(th);
    next = ctx.currentTime + .15; n = 0;
    const tick = () => { while (ctx && next < ctx.currentTime + 1) { loop(v, th, next, n++); next += L; } };
    tick(); timer = setInterval(tick, 300);
  }
  // 配樂被暫停或被中斷（iOS 播錄音時會把網頁合成的聲音切成 interrupted，而且不會自己回來）：
  // 只要配樂是開的，每次點畫面就檢查、恢復；學生作答一直在點，最多中斷到下一下
  function wake() { if (ctx && !document.hidden && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {}); }
  for (const ev of GESTURES) addEventListener(ev, wake, true);
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

  // 播錄音時壓低配樂：媒體事件不會冒泡，但會經過 document 的捕獲階段
  const DUCK = .12, playingMedia = new Set();
  function setDuck() {
    if (!ctx || !duck) return;
    if (!playingMedia.size) wake();
    const t = ctx.currentTime, on = playingMedia.size > 0;
    duck.gain.cancelScheduledValues(t);
    duck.gain.setValueAtTime(duck.gain.value, t);
    duck.gain.linearRampToValueAtTime(on ? DUCK : 1, t + (on ? .12 : .9));
  }
  document.addEventListener('play', e => { playingMedia.add(e.target); setDuck(); }, true);
  for (const ev of ['pause', 'ended', 'error', 'emptied']) document.addEventListener(ev, e => { playingMedia.delete(e.target); setDuck(); }, true);
  // 遊戲多半用 new Audio() 播錄音，這種不在網頁上，事件到不了 document，所以另外接 play()
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.__duckHooked) {
      this.__duckHooked = true;
      this.addEventListener('playing', () => { playingMedia.add(this); setDuck(); });
      for (const ev of ['pause', 'ended', 'error', 'emptied']) this.addEventListener(ev, () => { playingMedia.delete(this); setDuck(); });
    }
    return origPlay.apply(this, arguments);
  };

  // 離線算出一段音樂（測試、試聽用）
  async function render(seconds, name) {
    const th = THEMES[name] || THEMES.hub;
    const sr = 22050, off = new OfflineAudioContext(1, sr * seconds, sr);
    const g = off.createGain(); g.gain.value = th.vol; g.connect(off.destination);
    const v = voices(off, g), L = loopLen(th);
    for (let k = 0; k * L < seconds; k++) loop(v, th, .1 + k * L, k);
    return off.startRendering();
  }

  // 遊戲裡的「🎵 配樂」開關：跟大廳共用設定（hub_music），上次有開，點畫面任何地方就開始
  function attachToggle(btn, name) {
    const KEY = 'hub_music';
    const label = on => { btn.setAttribute('aria-pressed', on); btn.textContent = on ? '🎵 配樂：開' : '🎵 配樂：關'; };
    const set = on => { if (on) start(name); else stop(); label(on); try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} };
    btn.addEventListener('click', () => set(!ctx));
    let want = false;
    try { want = localStorage.getItem(KEY) === '1'; } catch (e) {}
    label(false);
    if (want) {
      btn.textContent = '🎵 點畫面就開始';
      // iOS Safari 只允許在手指放開（touchend／click）或按鍵時出聲，按下去（pointerdown）的時候不行
      const first = e => {
        for (const ev of GESTURES) removeEventListener(ev, first, true);
        if (!btn.contains(e.target) && !ctx) set(true);
      };
      for (const ev of GESTURES) addEventListener(ev, first, true);
    }
  }

  // duckLevel：目前配樂被壓低到幾成（1＝沒壓低），測試用
  window.HubMusic = { start, stop, playing: () => !!ctx, state: () => ctx ? ctx.state : 'off', gestures: GESTURES, render, attachToggle, themes: Object.keys(THEMES), duckLevel: () => duck ? +duck.gain.value.toFixed(2) : null };
})();
