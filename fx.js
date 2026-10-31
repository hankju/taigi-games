// 遊戲共用的回饋：答對／答錯音效、震動（Android）、觸覺回饋（iPhone，iOS 18 起）、結算評語、破紀錄彩帶
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

  // 破紀錄噴彩帶（canvas-confetti，vendor/confetti.js）：用著才載入，路徑照 fx.js 本身的位置算
  const base = document.currentScript ? document.currentScript.src : location.href;
  let confettiP = null;
  function loadConfetti() {
    if (window.confetti) return Promise.resolve(window.confetti);
    return confettiP = confettiP || new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = new URL('vendor/confetti.js', base).href;
      s.onload = () => ok(window.confetti); s.onerror = no; document.head.appendChild(s);
    });
  }
  const still = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
  const COLORS = ['#f2b84b', '#d2402c', '#2f9e64', '#7d58b0', '#fbf3e4'];

  // ── 結算特效：分數越懸越鬧熱；破紀錄閣加一級，並跳「新紀錄！」──
  // 0：（無）　1：中央噴一陣　2：兩爿噴彩帶　3：兩爿噴較久＋規片天放煙火、金色星星
  function finale(level) {
    if (level <= 0 || still()) return;
    loadConfetti().then(c => {
      if (level === 1) return c({particleCount: 70, spread: 75, startVelocity: 38, origin: {x: .5, y: .7}, colors: COLORS});
      const end = Date.now() + (level >= 3 ? 2200 : 1100);
      (function side() {
        c({particleCount: 4, angle: 60, spread: 60, origin: {x: 0, y: .75}, colors: COLORS});
        c({particleCount: 4, angle: 120, spread: 60, origin: {x: 1, y: .75}, colors: COLORS});
        if (Date.now() < end) requestAnimationFrame(side);
      })();
      if (level >= 3) for (let i = 0; i < 9; i++) setTimeout(() => {
        const o = {x: .15 + Math.random() * .7, y: .15 + Math.random() * .3};
        c({particleCount: 45, spread: 360, startVelocity: 26, gravity: .7, ticks: 140, origin: o, colors: COLORS});
        c({particleCount: 10, spread: 360, startVelocity: 18, gravity: .5, ticks: 160, shapes: ['star'], scalar: 1.4, origin: o, colors: ['#ffd76a', '#f2b84b']});
      }, 250 + i * 260);
    }).catch(() => {});
  }
  // 舊的用法：只噴兩爿（big＝滿分那級）
  const cheer = big => finale(big ? 3 : 2);
  // 結算時呼叫：xs 是同模式「這回合以前」的成績 [{s, t}]（錯題再練不要呼叫）
  // 照得分比例決定特效等級（60% 起才有）；滿分、比今仔日較早的上懸分閣較懸、破歷史上懸，算破紀錄（頭一擺耍無算），特效加一級
  function record(xs, score, total) {
    const r = total ? score / total : 0;
    const d0 = new Date().setHours(0, 0, 0, 0), td = xs.filter(r => r.t >= d0);
    const max = a => Math.max(...a.map(r => +r.s || 0));
    const hit = score > 0 && (score >= total || (td.length > 0 && score > max(td)) || (xs.length > 0 && score > max(xs)));
    let level = r >= 1 ? 3 : r >= .8 ? 2 : r >= .6 ? 1 : 0;
    if (hit) level = Math.min(3, Math.max(2, level + 1));
    setTimeout(() => { finale(level); if (hit && score < total) toast('新紀錄！', false, null); }, 300);
    return hit;
  }

  // ── 連續答對（combo）：只有畫面效果，毋加分（分數是上課登記用，愛公平）──
  // 動畫用 GSAP（vendor/gsap.min.js＋MotionPathPlugin），載入時就先偷偷載；猶未載好就用瀏覽器內建的動畫
  function loadScript(src) {
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = new URL(src, base).href; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  }
  if (!window.gsap) loadScript('vendor/gsap.min.js').then(() => loadScript('vendor/MotionPathPlugin.min.js')).then(() => gsap.registerPlugin(MotionPathPlugin)).catch(() => {});
  const G = () => window.gsap && window.MotionPathPlugin ? window.gsap : null;

  const css = document.createElement('style');
  css.textContent = `
.fx-fly{position:fixed;left:0;top:0;z-index:62;pointer-events:none;padding:4px 14px;border-radius:999px;white-space:nowrap;
  font:800 28px/1.1 "Noto Sans",system-ui,sans-serif;color:#5a2a00;background:linear-gradient(180deg,#ffe48a,#f2b13b);
  border:2px solid #fff6d8;box-shadow:0 4px 0 #b9741b,0 0 18px rgba(255,190,60,.85)}
.fx-ring{position:fixed;z-index:61;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #f2b84b}
.fx-toast{position:fixed;left:50%;top:0;z-index:63;pointer-events:none;transform:translateX(-50%);padding:6px 18px;border-radius:999px;white-space:nowrap;
  font:700 22px/1.2 "LXGW WenKai TC","Kaiti TC",serif;color:#fff;background:linear-gradient(90deg,#e8582c,#f2a33a);box-shadow:0 6px 20px rgba(200,70,20,.45)}
.fx-toast.cool{background:linear-gradient(90deg,#7d58b0,#2f7f9a);box-shadow:0 6px 20px rgba(60,60,120,.35)}
.fx-hot{animation:fx-hot 1.1s ease-in-out infinite alternate}
.fx-hot[data-heat="2"]{animation-duration:.8s}.fx-hot[data-heat="3"]{animation-duration:.55s}
@keyframes fx-hot{from{filter:drop-shadow(0 0 calc(var(--h,1) * 4px) rgba(255,130,40,.6))}to{filter:drop-shadow(0 0 calc(var(--h,1) * 10px) rgba(255,150,40,.95))}}
.fx-fire{display:inline-block;margin-left:4px;font-weight:700;color:#e8582c;transform-origin:50% 80%;animation:fx-flick .5s ease-in-out infinite alternate;transition:font-size .3s}
@keyframes fx-flick{from{transform:scale(1) rotate(-4deg)}to{transform:scale(1.12) rotate(4deg)}}
.fx-heat{position:fixed;inset:0;z-index:55;pointer-events:none;overflow:hidden;opacity:0;transition:opacity 1s ease}
.fx-heat::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 115% 85% at 50% 45%,transparent 52%,rgba(255,130,30,.4) 76%,rgba(230,60,20,.78) 100%);animation:fx-pulse 1.4s ease-in-out infinite alternate}
.fx-heat[data-heat="1"]{opacity:.55}.fx-heat[data-heat="2"]{opacity:.8}.fx-heat[data-heat="3"]{opacity:1}
@keyframes fx-pulse{from{opacity:.75}to{opacity:1}}
.fx-flame{position:absolute;inset:0;width:100%;height:100%;opacity:.8}
.fx-smoke{position:fixed;z-index:60;pointer-events:none;font-size:22px;opacity:.8}
@media (prefers-reduced-motion:reduce){.fx-hot,.fx-heat::before{animation:none}.fx-hot{filter:drop-shadow(0 0 8px rgba(255,140,40,.8))}.fx-fire{animation:none}}`;
  document.head.appendChild(css);

  const rect = el => el.getBoundingClientRect();
  // 分數數字跳一下，外圍閃一圈金光
  function bump(el) {
    if (!el || still()) return;
    const r = rect(el), ring = document.createElement('span'), g = G();
    ring.className = 'fx-ring'; ring.style.left = r.left + r.width / 2 + 'px'; ring.style.top = r.top + r.height / 2 + 'px'; document.body.appendChild(ring);
    ring.animate([{transform: 'scale(.4)', opacity: 1}, {transform: 'scale(1.6)', opacity: 0}], {duration: 450, easing: 'ease-out'}).onfinish = () => ring.remove();
    if (g) g.fromTo(el, {scale: 1.6}, {scale: 1, duration: .5, ease: 'back.out(3)', clearProps: 'transform'});
    else el.animate([{transform: 'scale(1.6)'}, {transform: 'scale(1)'}], {duration: 450, easing: 'ease-out'});
  }
  // 「+5」的起點：題目卡這款大塊的，對卡片右上角（避開中央的字）；按鈕這款小塊的，對按鈕的正爿
  function origin(el) {
    const r = rect(el);
    return r.height > 120 ? [r.right - Math.min(90, r.width * .22), r.top + 34] : [r.right - 30, r.top + r.height / 2];
  }
  // 「+5」金色牌仔：先佇起點彈出來停一下，才畫弧線飛去分數
  function fly(from, to, text) {
    if (!from || !to) return;
    if (still()) return bump(to);
    const [x0, y0] = origin(from), r1 = rect(to), x1 = r1.left + r1.width / 2, y1 = r1.top + r1.height / 2, el = document.createElement('span');
    el.className = 'fx-fly'; el.textContent = text; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el);
    const w = el.offsetWidth / 2, h = el.offsetHeight / 2, dx = x1 - x0, dy = y1 - y0, done = () => { el.remove(); bump(to); };
    const g = G();
    if (g) {
      g.set(el, {x: x0 - w, y: y0 - h});
      g.timeline({onComplete: done})
        .from(el, {scale: .2, rotation: -12, duration: .28, ease: 'back.out(3)'})
        .to(el, {scale: 1.12, duration: .12, yoyo: true, repeat: 1}, '+=.05')
        .to(el, {motionPath: {path: [{x: x0 - w + dx * .4, y: y0 - h + Math.min(0, dy) - 60}, {x: x1 - w, y: y1 - h}], curviness: 1.4}, scale: .45, duration: .5, ease: 'power2.in'});
    } else {
      el.animate([{transform: `translate(${x0 - w}px,${y0 - h}px) scale(.2)`}, {transform: `translate(${x0 - w}px,${y0 - h}px) scale(1)`, offset: .35},
        {transform: `translate(${x0 - w + dx * .4}px,${y0 - h + Math.min(0, dy) - 60}px) scale(.8)`, offset: .7}, {transform: `translate(${x1 - w}px,${y1 - h}px) scale(.45)`}],
        {duration: 900, easing: 'ease-in'}).onfinish = done;
    }
  }
  // 提示字：囥佇題目卡內底上方的空位（卡片頂端往下約兩成、題目字的頂懸，毋遮題目）；無卡片就囥畫面上方
  let toastEl = null;
  function toast(text, cool, at) {
    if (toastEl) toastEl.remove();
    const el = toastEl = document.createElement('div');
    el.className = 'fx-toast' + (cool ? ' cool' : ''); el.textContent = text; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el);
    let top = innerHeight * .16, left = innerWidth / 2;
    if (at) { const r = rect(at); left = r.left + r.width / 2; top = r.top + Math.min(100, Math.max(56, r.height * .21)); }
    el.style.left = left + 'px'; el.style.top = Math.max(6, top - el.offsetHeight / 2) + 'px';
    const end = () => { el.remove(); if (toastEl === el) toastEl = null; }, g = G();
    if (still()) return setTimeout(end, 1200);
    if (g) g.timeline({onComplete: end}).from(el, {scale: .3, opacity: 0, duration: .35, ease: 'back.out(2.5)'}).to(el, {y: -16, opacity: 0, duration: .35, delay: .75});
    else el.animate([{opacity: 0, transform: 'translateX(-50%) scale(.3)'}, {opacity: 1, transform: 'translateX(-50%) scale(1)', offset: .25}, {opacity: 1, offset: .8}, {opacity: 0, transform: 'translateX(-50%) translateY(-16px)'}], {duration: 1400}).onfinish = end;
  }

  // 火熱程度 heat：連對 5 題 1 級、10 題 2 級、15 題 3 級；答錯毋是隨熄，降一級（火變細）
  // 畫面四周燒紅、下底佮兩爿有火舌佮火星衝起來、題目卡發光、分數邊仔有 🔥，級數越懸越強
  const LINES = {3: '3 連對！', 5: '著火矣！🔥', 10: '火燒厝矣！🔥🔥', 15: '燒甲赤爍爍！', 20: '20 連對！神乎其技！'};
  let n = 0, heat = 0, hotEl = null, scoreEl = null, fire = null, heatEl = null;
  // 火焰：全螢幕 canvas，對畫面下底佮兩爿下半部噴火舌起來，閣有火星飛較懸；用三種顏色的光點疊起來（lighter 混色）
  const flame = {cv: null, ctx: null, ps: [], raf: 0, last: 0, acc: 0, burst: 0, sprites: null, size: null};
  function sprites() {
    return ['255,240,170', '255,165,45', '230,70,20'].map(c => {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const x = s.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, `rgba(${c},1)`); g.addColorStop(.4, `rgba(${c},.5)`); g.addColorStop(1, `rgba(${c},0)`);
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); return s;
    });
  }
  function flameStart(host) {
    if (still() || flame.cv) return;
    const cv = flame.cv = document.createElement('canvas'); cv.className = 'fx-flame'; host.appendChild(cv);
    flame.ctx = cv.getContext('2d'); flame.sprites = flame.sprites || sprites(); flame.last = performance.now(); flame.acc = 0;
    flame.size = () => { const d = Math.min(1.5, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; flame.ctx.setTransform(d, 0, 0, d, 0, 0); };
    flame.size(); addEventListener('resize', flame.size);
    flame.raf = requestAnimationFrame(flameTick);
  }
  function flameStop() {
    cancelAnimationFrame(flame.raf);
    if (flame.cv) { removeEventListener('resize', flame.size); flame.cv.remove(); }
    flame.cv = null; flame.ps = []; flame.burst = 0;
  }
  function emit(k, W, H, big) {
    for (let i = 0; i < k; i++) {
      const spark = Math.random() < .12, side = Math.random();
      let x, y, vx;
      if (side < .45) { x = Math.random() * W; y = H + 8; vx = (Math.random() - .5) * 30; }    // 四成半對下底，其餘對兩爿（火舌貼邊，毋遮答案）
      else { const L = side < .725; x = L ? -6 : W + 6; y = H * (.35 + Math.random() * .65); vx = (L ? 1 : -1) * (15 + Math.random() * 30); }
      const up = (50 + Math.random() * 60) * (.8 + heat * .25) * (big ? 1.8 : 1);
      flame.ps.push(spark
        ? {x, y, vx: vx * 1.5, vy: -up * 1.8, r: 2 + Math.random() * 2, t: 0, life: 1.4 + Math.random(), seed: Math.random() * 6.3, spark}
        : {x, y, vx, vy: -up, r: 10 + Math.random() * 12 + heat * 4, t: 0, life: .4 + Math.random() * .45, seed: Math.random() * 6.3});
    }
  }
  function flameTick(now) {
    const dt = Math.min(.05, (now - flame.last) / 1000), W = innerWidth, H = innerHeight, c = flame.ctx;
    flame.last = now;
    flame.acc += [0, 70, 130, 210][heat] * dt;
    const k = Math.floor(flame.acc); flame.acc -= k;
    if (k && flame.ps.length < 450) emit(k, W, H, false);
    if (flame.burst) { emit(flame.burst, W, H, true); flame.burst = 0; }
    c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
    flame.ps = flame.ps.filter(p => (p.t += dt) < p.life);
    for (const p of flame.ps) {
      const q = p.t / p.life;
      p.x += (p.vx + Math.sin(p.seed + p.t * 9) * (p.spark ? 40 : 22)) * dt; p.y += p.vy * dt; p.vx *= .97;
      const r = p.spark ? p.r : p.r * (1 - q * .65), spr = flame.sprites[p.spark || q < .25 ? 0 : q < .6 ? 1 : 2];
      c.globalAlpha = Math.max(0, q < .15 ? q / .15 : 1 - (q - .15) / .85) * (p.spark ? 1 : .85);
      c.drawImage(spr, p.x - r, p.y - r, r * 2, r * 2);
    }
    c.globalAlpha = 1;
    if (heat || flame.ps.length) flame.raf = requestAnimationFrame(flameTick); else flameStop();
  }
  function render() {
    if (heat > 0 && !heatEl) { heatEl = document.createElement('div'); heatEl.className = 'fx-heat'; heatEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(heatEl); }
    if (heatEl) {
      if (heat) flameStart(heatEl);
      requestAnimationFrame(() => { if (heatEl) heatEl.dataset.heat = heat; });
      if (!heat) { const h = heatEl; heatEl = null; setTimeout(() => { if (!heatEl) flameStop(); h.remove(); }, 1000); }
    }
    if (hotEl) {
      if (heat) { hotEl.classList.add('fx-hot'); hotEl.dataset.heat = heat; hotEl.style.setProperty('--h', heat); }
      else { hotEl.classList.remove('fx-hot'); delete hotEl.dataset.heat; hotEl.style.removeProperty('--h'); }
    }
    if (heat && scoreEl && !fire) { fire = document.createElement('span'); fire.className = 'fx-fire'; fire.setAttribute('aria-hidden', 'true'); scoreEl.insertAdjacentElement('afterend', fire); }
    if (fire) {
      if (!heat) { fire.remove(); fire = null; }
      else { fire.textContent = '🔥' + (n > 1 ? n : ''); fire.style.fontSize = (.8 + heat * .2) + 'em'; }
    }
  }
  function smoke() {
    if (!fire || still()) return;
    const r = rect(fire), s = document.createElement('span');
    s.className = 'fx-smoke'; s.textContent = '💨'; s.style.left = r.left + 'px'; s.style.top = r.top + 'px'; document.body.appendChild(s);
    s.animate([{opacity: .8, transform: 'translateY(0) scale(.8)'}, {opacity: 0, transform: 'translateY(-30px) scale(1.4)'}], {duration: 800, easing: 'ease-out'}).onfinish = () => s.remove();
  }
  const combo = {
    // 新回合（開始、離開、結算）攏愛叫：火全部熄掉
    reset() { n = 0; heat = 0; render(); hotEl = scoreEl = null; if (toastEl) { toastEl.remove(); toastEl = null; } },
    // 答對：from＝答對的按鈕抑是題目卡（「+分」對遮飛出去）；to＝分數的數字；pts＝這題得幾分（0 就毋飛）；hot＝發光的題目卡（提示字也貼佇伊頂緣）
    hit({from, to, pts, hot} = {}) {
      n++;
      if (hot) hotEl = hot;
      if (to) scoreEl = to;
      if (pts) fly(from, to, '+' + pts);
      const lv = n >= 15 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0;
      if (lv > heat) { heat = lv; flame.burst = 90 + heat * 30; }     // 升級的時陣火一下衝懸
      render();
      if (heat && !muted) tone(2637, .28, 'sine', .1, .2);      // 著火的時陣，答對音效尾加一聲閃閃的高音
      if (LINES[n]) toast(LINES[n], n < 5, hot || from);
      if (n === 10 || n === 20) loadConfetti().then(c => { if (still()) return; const r = from ? rect(from) : {left: 0, top: 0, width: innerWidth, height: innerHeight}; c({particleCount: 60, spread: 70, startVelocity: 35, origin: {x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight}}); }).catch(() => {});
      return n;
    },
    // 答錯：連對中斷，火降一級（毋扣分、毋罵人）
    miss() { n = 0; if (heat) { smoke(); heat--; } render(); },
    get n() { return n; },
    get heat() { return heat; }
  };

  window.FX = { ok, bad, attachToggle, verdict, cheer, record, finale, combo, muted: () => muted };
})();
