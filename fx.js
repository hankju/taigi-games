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

  // 結算評語：依得分比例給一句鼓勵；prev 是同模式頂一擺的分數（沒有就不比較）
  function verdict(score, total, prev) {
    const r = total ? score / total : 0;
    const msg = r >= 1 ? '攏著！真勥！' : r >= .8 ? '真讚，閣較細膩就滿分矣！' : r >= .6 ? '袂䆀，閣拍拚！' : '莫失志，閣試一擺！';
    let diff = '';
    if (prev != null) {
      const d = score - prev;
      diff = d > 0 ? `比頂一擺加 ${d} 分 ⬆` : d < 0 ? `比頂一擺少 ${-d} 分` : '佮頂一擺仝分';
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
.fx-toast.gold{background:linear-gradient(90deg,#d9822b,#f2c14e);text-shadow:0 1px 2px rgba(120,60,0,.45);box-shadow:0 0 0 2px #fff3c4,0 6px 22px rgba(230,160,40,.6)}
.fx-toast.dull{background:linear-gradient(90deg,#66625b,#8a8172);box-shadow:0 6px 20px rgba(40,40,40,.35)}
.fx-glow{animation:fx-glow 1.3s ease-in-out infinite alternate}
@keyframes fx-glow{from{filter:drop-shadow(0 0 calc(var(--b,1) * 3px) rgba(255,205,80,.55))}to{filter:drop-shadow(0 0 calc(var(--b,1) * 7px) rgba(255,215,90,.95))}}
.fx-badge{display:inline-block;margin-left:4px;font-weight:700;color:#d9822b;transform-origin:50% 90%;animation:fx-sway 1.2s ease-in-out infinite alternate;transition:font-size .3s}
@keyframes fx-sway{from{transform:rotate(-6deg)}to{transform:rotate(6deg) scale(1.08)}}
.fx-garden{position:fixed;inset:0;z-index:55;pointer-events:none;width:100%;height:100%}
.fx-shine{position:fixed;inset:0;z-index:54;pointer-events:none;opacity:0;transition:opacity 1s ease;background:radial-gradient(ellipse 115% 85% at 50% 45%,transparent 55%,rgba(255,222,120,.32) 80%,rgba(255,196,70,.6) 100%);animation:fx-pulse 1.6s ease-in-out infinite alternate}
@keyframes fx-pulse{from{filter:brightness(.85)}to{filter:brightness(1.15)}}
.fx-ruin{position:fixed;inset:0;z-index:54;pointer-events:none;overflow:hidden}
.fx-ruin::before{content:"";position:absolute;inset:0;opacity:var(--dust,0);transition:opacity 1.2s ease;background:radial-gradient(ellipse 115% 85% at 50% 45%,transparent 45%,rgba(110,95,70,.4) 74%,rgba(60,50,38,.8) 100%)}
.fx-ruin>*{position:absolute;left:0;top:0;transition:opacity .8s ease}
.fx-ruin>.gone{opacity:0}
.fx-ruin svg{display:block;overflow:visible}
.fx-ruin .draw{stroke-dasharray:1;stroke-dashoffset:1;animation:fx-draw var(--d,1.4s) ease-out forwards}
@keyframes fx-draw{to{stroke-dashoffset:0}}
.fx-spider svg{animation:fx-bob 2.4s ease-in-out infinite alternate}
@keyframes fx-bob{from{transform:translateY(-5px)}to{transform:translateY(9px)}}
.fx-legs{animation:fx-legs .16s linear infinite alternate}
@keyframes fx-legs{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}
@media (prefers-reduced-motion:reduce){.fx-glow,.fx-shine,.fx-badge,.fx-spider svg,.fx-legs{animation:none}.fx-glow{filter:drop-shadow(0 0 6px rgba(255,210,80,.85))}.fx-ruin .draw{animation:none;stroke-dashoffset:0}}`;
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
  function toast(text, kind, at) {
    if (toastEl) toastEl.remove();
    const el = toastEl = document.createElement('div');
    el.className = 'fx-toast' + (kind ? ' ' + kind : ''); el.textContent = text; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el);
    let top = innerHeight * .16, left = innerWidth / 2;
    if (at) { const r = rect(at); left = r.left + r.width / 2; top = r.top + Math.min(100, Math.max(56, r.height * .21)); }
    el.style.left = left + 'px'; el.style.top = Math.max(6, top - el.offsetHeight / 2) + 'px';
    const end = () => { el.remove(); if (toastEl === el) toastEl = null; }, g = G();
    if (still()) return setTimeout(end, 1200);
    if (g) g.timeline({onComplete: end}).from(el, {scale: .3, opacity: 0, duration: .35, ease: 'back.out(2.5)'}).to(el, {y: -16, opacity: 0, duration: .35, delay: .75});
    else el.animate([{opacity: 0, transform: 'translateX(-50%) scale(.3)'}, {opacity: 1, transform: 'translateX(-50%) scale(1)', offset: .25}, {opacity: 1, offset: .8}, {opacity: 0, transform: 'translateX(-50%) translateY(-16px)'}], {duration: 1400}).onfinish = end;
  }

  // 讚語佮加油語是台語老師建議的講法（取代原本英語「ON FIRE」的火熱）
  // 連續答對：連對 2／3／5／7／10 題講「媠！」到「媠甲會觸舌！」，10 題以後每 5 題閣講一擺；每講一句四周就加開一批花，
  //   花越開越濟、越大蕊，3 批起花邊有金光閃爍、題目卡發金光，4 批起畫面四周金光，5 批起落花瓣；答錯謝一批（毋是隨無去）
  // 連續答錯：「加油！」到「愛揣老師矣！」，每講一句就加一款破敗：蜘蛛網 → 蜘蛛佮蟲 → 破窗 → 閣破一塊 → 滿四界，灰塵越來越厚；答對清掉一款
  const PRAISE = {2: '媠！', 3: '真媠！', 5: '有夠媠！', 7: '真正有夠媠！', 10: '媠甲會觸舌！'};
  const CHEER = ['加油！', '閣較拚咧！', '想予詳細！', '哪會按呢？', '愛揣老師矣！'];
  let n = 0, m = 0, bloom = 0, hotEl = null, scoreEl = null, badge = null, shineEl = null;

  // 花園：全螢幕 canvas，花開佇下底佮兩爿（電腦版開佇中央內容外的空位），題目佮答案毋遮
  const FLOWERS = [['#f9b4c6', '#e2557a'], ['#fff8ec', '#e0566b'], ['#ffd85a', '#e5821c'], ['#ff93a8', '#c8334f'], ['#f3c4e4', '#b0457f']];
  const gd = {cv: null, ctx: null, raf: 0, last: 0, fl: [], ps: [], acc: 0, dacc: 0, spr: null, pet: null, glow: null, size: null, R: null, rs: [], seen: 0};
  // 題目卡內底有字、有按鈕的所在：卡片內的花愛閃開（開花前量一擺，了後每 0.25 秒閣量，換題字變長，壓著的花就退去）
  const near = (x, y, rad, rs) => rs.some(r => { const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom); return dx * dx + dy * dy < rad * rad; });
  function busy(el) {
    const out = [];
    for (const e of el.querySelectorAll('*')) {
      if (!/^(button|img|svg|input|audio|video|canvas)$/i.test(e.tagName) && ![...e.childNodes].some(t => t.nodeType === 3 && t.textContent.trim())) continue;
      const r = e.getBoundingClientRect(); if (r.width && r.height) out.push(r);
    }
    return out;
  }
  function flowerSprite([petal, heart], gold) {
    const s = document.createElement('canvas'); s.width = s.height = 96;
    const x = s.getContext('2d'); x.translate(48, 48); x.scale(.82, .82);
    x.fillStyle = '#6f9f55';                                   // 兩片葉仔
    for (const a of [2.3, 4.1]) { x.save(); x.rotate(a); x.beginPath(); x.ellipse(0, -34, 9, 19, 0, 0, 7); x.fill(); x.restore(); }
    if (gold) { x.shadowColor = 'rgba(255,205,60,.95)'; x.shadowBlur = 16; }
    x.fillStyle = petal; x.strokeStyle = 'rgba(150,60,60,.3)'; x.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {                               // 五瓣，花瓣尾仔有一个凹，親像梅花
      x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-28, -14, -22, -42, -6, -40);
      x.quadraticCurveTo(0, -34, 6, -40); x.bezierCurveTo(22, -42, 28, -14, 0, 0);
      x.fill(); x.stroke(); x.rotate(Math.PI * 2 / 5);
    }
    x.shadowBlur = 0; x.fillStyle = heart; x.beginPath(); x.arc(0, 0, 9, 0, 7); x.fill();
    x.fillStyle = '#ffe28a';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.arc(Math.cos(a) * 13, Math.sin(a) * 13, 2.4, 0, 7); x.fill(); }
    return s;
  }
  function petalSprite([petal]) {
    const s = document.createElement('canvas'); s.width = 24; s.height = 32;
    const x = s.getContext('2d'); x.translate(12, 30); x.fillStyle = petal; x.strokeStyle = 'rgba(150,60,60,.3)';
    x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-14, -8, -11, -27, -3, -27); x.quadraticCurveTo(0, -23, 3, -27); x.bezierCurveTo(11, -27, 14, -8, 0, 0); x.fill(); x.stroke();
    return s;
  }
  function glowSprite() {
    const s = document.createElement('canvas'); s.width = s.height = 64;
    const x = s.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(.4, 'rgba(255,200,70,.45)'); g.addColorStop(1, 'rgba(255,180,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return s;
  }
  const wide = () => innerWidth >= 900;
  const band = () => Math.max(26, (innerWidth - 680) / 2);       // 兩爿會使開花的闊度
  function spot() {
    const r = Math.random();
    if (r < .26) return {e: 'b', u: Math.random(), k: Math.random()};
    if (wide() && r < .4) return {e: Math.random() < .5 ? 'tl' : 'tr', u: Math.random(), k: Math.random()};   // 電腦版頂懸兩角嘛開
    return {e: r < .7 ? 'l' : 'r', u: .22 + Math.random() * .78, k: Math.random()};
  }
  function where(f, W, H) {
    const B = band();
    switch (f.e) {
      case 'b': return [f.u * W, H + 6 - f.k * 16];
      case 'l': return [-8 + f.k * B, f.u * H];
      case 'r': return [W + 8 - f.k * B, f.u * H];
      case 'in': return gd.R ? [gd.R.left + f.u * gd.R.width, gd.R.top + f.k * gd.R.height] : [-99, -99];   // 題目卡內底，綴卡片走
      case 'tl': return [-8 + f.u * B * 1.2, -6 + f.k * 34];
      default: return [W + 8 - f.u * B * 1.2, -6 + f.k * 34];
    }
  }
  function gardenStart() {
    if (still() || gd.cv) return;
    const cv = gd.cv = document.createElement('canvas'); cv.className = 'fx-garden'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
    gd.ctx = cv.getContext('2d'); gd.last = performance.now();
    if (!gd.spr) { gd.spr = FLOWERS.flatMap(c => [flowerSprite(c), flowerSprite(c, true)]); gd.pet = FLOWERS.map(petalSprite); gd.glow = glowSprite(); }
    gd.size = () => { const d = Math.min(1.5, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; gd.ctx.setTransform(d, 0, 0, d, 0, 0); };
    gd.size(); addEventListener('resize', gd.size);
    gd.raf = requestAnimationFrame(gardenTick);
  }
  function gardenStop() {
    cancelAnimationFrame(gd.raf);
    if (gd.cv) { removeEventListener('resize', gd.size); gd.cv.remove(); }
    gd.cv = null; gd.fl = []; gd.ps = [];
  }
  // 加開一批花：第幾批越後壁，花越濟、越大蕊，金色的花越濟；一蕊一蕊輪流開
  function addGroup() {
    if (!gd.cv) return;
    const g = Math.min(bloom - 1, 7), now = performance.now(), big = wide(), cnt = Math.round((5 + g * 2) * (big ? 1.8 : 1.4));
    if (gd.fl.length > 180) return;
    const pick = () => { const gold = g >= 2 && Math.random() < .12 + g * .07, c = gold && Math.random() < .5 ? 2 : Math.floor(Math.random() * FLOWERS.length); return {c, spr: gd.spr[c * 2 + (gold ? 1 : 0)]}; };
    for (let i = 0; i < cnt; i++)
      gd.fl.push({...spot(), ...pick(), g: bloom - 1, r: (big ? 15 : 13) + Math.random() * (5 + g * 2.5),
        rot: Math.random() * 6.3, seed: Math.random() * 6.3, born: now + i * 55 + Math.random() * 100, die: 0});
    // 手機版兩爿無啥空位，就開入去題目卡內底四周的空白：一叢 2～4 蕊，離字、按鈕、讚語有一段距離，叢佮叢分較開
    if (big || !hotEl) return;
    const R = rect(hotEl), rs = busy(hotEl);
    if (R.width < 120 || R.height < 120) return;
    const tb = R.top + Math.min(100, Math.max(56, R.height * .21));                // 讚語出現的所在（佮 toast() 仝款）
    const keep = rs.concat([{left: R.left + R.width / 2 - 115, right: R.left + R.width / 2 + 115, top: tb - 26, bottom: tb + 26}]);
    const others = gd.fl.filter(f => f.e === 'in' && !f.die).map(f => [R.left + f.u * R.width, R.top + f.k * R.height]);
    for (let k = 0, made = 0, j = cnt; k < 90 && made < 3 + g; k++) {
      let cx, cy;
      if (Math.random() < .6) { const L = Math.random() < .5, d = 18 + Math.random() * R.width * .2; cx = L ? R.left + d : R.right - d; cy = R.top + 22 + Math.random() * (R.height - 44); }
      else { const T = Math.random() < .5, d = 20 + Math.random() * R.height * .14; cy = T ? R.top + d : R.bottom - d; cx = R.left + 22 + Math.random() * (R.width - 44); }
      if (near(cx, cy, 42, keep) || others.some(([x, y]) => Math.hypot(x - cx, y - cy) < 46)) continue;
      made++;
      for (let i = 0, m = 2 + Math.floor(Math.random() * 3); i < m; i++) {
        const a = Math.random() * 6.3, d = i ? 14 + Math.random() * 10 : 0, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, r = 12 + Math.random() * (5 + g * 1.8);
        if (near(x, y, r + 8, keep) || x < R.left + 6 || x > R.right - 6) continue;
        others.push([x, y]);
        gd.fl.push({e: 'in', u: (x - R.left) / R.width, k: (y - R.top) / R.height, ...pick(), g: bloom - 1, r, v: 1,
          rot: Math.random() * 6.3, seed: Math.random() * 6.3, born: now + (j++) * 55 + Math.random() * 100, die: 0});
      }
    }
  }
  // 讚語的時陣，花瓣對讚語遐爆開，金光四散
  function burst(x, y, k) {
    if (!gd.cv) return;
    for (let i = 0; i < k; i++) {
      const L = i % 2 ? 1 : -1, v = 150 + Math.random() * 230, a = (Math.random() - .65) * 1.3;    // 主要向兩爿飛，較少落去題目頂懸
      gd.ps.push({k: 'p', x, y, vx: L * Math.cos(a) * v, vy: Math.sin(a) * v, g: 120, rot: Math.random() * 6, vr: (Math.random() - .5) * 9, t: 0, life: 1 + Math.random() * .6, spr: gd.pet[Math.floor(Math.random() * FLOWERS.length)], seed: Math.random() * 6, s: 1 + Math.random() * .7});
      if (i % 3 === 0) gd.ps.push({k: 's', x: x + L * Math.cos(a) * v * .25, y: y + Math.sin(a) * v * .2, t: 0, life: .6 + Math.random() * .5, r: 5 + Math.random() * 6});
    }
  }
  // 規面落花雨（5 批花以上講讚語的時陣）
  function shower(k) {
    if (!gd.cv) return;
    for (let i = 0; i < k; i++) gd.ps.push({k: 'p', x: Math.random() * innerWidth, y: -20 - Math.random() * 160, vx: (Math.random() - .5) * 60, vy: 90 + Math.random() * 90, g: 30, rot: Math.random() * 6, vr: (Math.random() - .5) * 5, t: 0, life: 3.2 + Math.random(), spr: gd.pet[Math.floor(Math.random() * FLOWERS.length)], seed: Math.random() * 6, s: 1 + Math.random() * .6});
  }
  // 謝一批：上尾開的彼批花縮落去，花瓣飄落來
  function wither() {
    const now = performance.now(), g = bloom - 1, W = innerWidth, H = innerHeight;
    for (const f of gd.fl) if (f.g === g && !f.die) {
      f.die = now;
      if (gd.cv && Math.random() < .7) { const [x, y] = where(f, W, H); gd.ps.push({k: 'p', w: 1, x, y: y - 6, vx: (Math.random() - .5) * 30, vy: 20 + Math.random() * 20, rot: Math.random() * 6, vr: (Math.random() - .5) * 4, t: 0, life: 1.6, spr: gd.pet[f.c], seed: Math.random() * 6}); }
    }
    bloom--;
  }
  const backOut = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  function star(c, x, y, r) {
    c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill();
  }
  function gardenTick(now) {
    const dt = Math.min(.05, (now - gd.last) / 1000), W = innerWidth, H = innerHeight, c = gd.ctx, live = gd.fl.filter(f => !f.die && now > f.born);
    gd.last = now;
    gd.R = hotEl ? rect(hotEl) : null;
    if (now - gd.seen > 250) { gd.seen = now; gd.rs = hotEl ? busy(hotEl) : []; }
    // 金光閃爍：佇花邊仔；落花瓣：對頂懸飄落來；灰塵：破敗的時陣四界浮
    gd.acc += [0, 0, 0, 5, 9, 14][Math.min(5, bloom)] * (wide() ? 1.6 : 1) * dt;
    for (; gd.acc >= 1; gd.acc--) if (live.length && gd.ps.length < 300) {
      const f = live[Math.floor(Math.random() * live.length)], [x, y] = where(f, W, H), a = Math.random() * 6.3, d = f.r * (.6 + Math.random() * .9);
      gd.ps.push({k: 's', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, t: 0, life: .7 + Math.random() * .5, r: 4 + Math.random() * 5});
    }
    if (bloom >= 5 && Math.random() < dt * (wide() ? 4 : 2.2))
      gd.ps.push({k: 'p', x: Math.random() * W, y: -20, vx: (Math.random() - .3) * 25, vy: 28 + Math.random() * 22, rot: Math.random() * 6, vr: (Math.random() - .5) * 3, t: 0, life: H / 35, spr: gd.pet[Math.floor(Math.random() * FLOWERS.length)], seed: Math.random() * 6});
    gd.dacc += [0, 3, 5, 8, 11, 14, 17, 20][Math.min(7, ruin)] * (wide() ? 1.6 : 1) * dt;
    for (; gd.dacc >= 1; gd.dacc--) if (gd.ps.length < 300) {
      const edge = Math.random() < .5, x = edge ? (Math.random() < .5 ? Math.random() * band() : W - Math.random() * band()) : Math.random() * W;
      gd.ps.push({k: 'd', x, y: Math.random() * H, vx: (Math.random() - .5) * 8, vy: 4 + Math.random() * 8, t: 0, life: 4 + Math.random() * 3, r: .8 + Math.random() * 1.8});
    }
    c.clearRect(0, 0, W, H);
    gd.fl = gd.fl.filter(f => !f.die || now - f.die < 600);
    for (const f of gd.fl) {
      const t = (now - f.born) / 650;
      if (t <= 0) continue;
      let s = t < 1 ? backOut(t) : 1, a = 1, dy = 0;
      if (f.die) { const q = (now - f.die) / 600; s *= 1 - q * .6; a = 1 - q; dy = q * 18; }
      const [x, y] = where(f, W, H);
      if (f.e === 'in') { f.v += ((near(x, y, f.r * .75, gd.rs) ? 0 : 1) - f.v) * Math.min(1, dt * 10); s *= f.v; a *= f.v; if (f.v < .02) continue; }
      const r = f.r * s;
      c.save(); c.globalAlpha = a; c.translate(x, y + dy); c.rotate(f.rot + Math.sin(now / 900 + f.seed) * .12 - (t < 1 ? (1 - t) * 1.2 : 0));
      c.drawImage(f.spr, -r, -r, r * 2, r * 2); c.restore();
    }
    gd.ps = gd.ps.filter(p => (p.t += dt) < p.life);
    for (const p of gd.ps) {
      const q = p.t / p.life;
      if (p.k === 's') {
        const k = Math.sin(q * Math.PI), r = p.r * k;
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * .6; c.drawImage(gd.glow, p.x - r * 2.2, p.y - r * 2.2, r * 4.4, r * 4.4);
        c.globalAlpha = k; c.fillStyle = '#fff3c0'; star(c, p.x, p.y, r); c.globalCompositeOperation = 'source-over';
      } else if (p.k === 'p') {
        if (p.g) { p.vy += p.g * dt; p.vx *= 1 - dt * 1.6; }
        p.x += (p.vx + Math.sin(p.seed + p.t * 2.5) * 30) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const z = p.s || 1;
        c.globalAlpha = Math.min(1, (1 - q) * 4, p.t * 8) * (near(p.x, p.y, 4, gd.rs) ? .25 : .9);   // 飄過題目字就變淡 c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.drawImage(p.spr, -7 * z, -9 * z, 14 * z, 18 * z); c.restore();
      } else {
        p.x += (p.vx + Math.sin(p.t * 1.3 + p.x) * 4) * dt; p.y += p.vy * dt;
        c.globalAlpha = Math.sin(q * Math.PI) * .6; c.fillStyle = 'rgb(200,186,160)'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
      }
    }
    c.globalAlpha = 1;
    if (bloom || ruin || gd.fl.length || gd.ps.length) gd.raf = requestAnimationFrame(gardenTick); else gardenStop();
  }

  // 破敗：一款一款疊起來的蜘蛛網、蜘蛛、蟲、破窗（SVG），佮畫面四周的灰色
  let ruin = 0, ruinEl = null;
  const stages = [];
  const CORNER = {tl: '', tr: 'left:auto;right:0;transform:scaleX(-1)', bl: 'top:auto;bottom:0;transform:scaleY(-1)', br: 'left:auto;top:auto;right:0;bottom:0;transform:scale(-1)'};
  const piece = (html, css) => { const el = document.createElement('div'); el.innerHTML = html; el.style.cssText = css || ''; ruinEl.appendChild(el); return el; };
  const f1 = v => Math.round(v * 10) / 10;
  // 蜘蛛網：對角落牽出去的放射線，閣一輪一輪垂垂的絲
  function web(at) {
    const S = wide() ? 190 : 96, sp = 7, rings = 6, pt = (i, rr) => { const a = i / (sp - 1) * Math.PI / 2; return [f1(Math.cos(a) * rr), f1(Math.sin(a) * rr)]; };
    let d = '';
    for (let i = 0; i < sp; i++) d += `M0 0L${pt(i, S).join(' ')}`;
    for (let j = 1; j <= rings; j++) {
      const rr = S * j / (rings + .6);
      for (let i = 0; i < sp - 1; i++) d += `M${pt(i, rr * (.96 + Math.random() * .08)).join(' ')}Q${pt(i + .5, rr * .84).join(' ')} ${pt(i + 1, rr * (.96 + Math.random() * .08)).join(' ')}`;
    }
    return piece(`<svg width="${S}" height="${S}"><path d="${d}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2.4" pathLength="1" class="draw"/><path d="${d}" fill="none" stroke="rgba(242,240,234,.85)" stroke-width="1.1" pathLength="1" class="draw"/></svg>`, CORNER[at]);
  }
  // 蜘蛛：對頂懸垂一條絲落來，佇遐幌
  function spider(right) {
    const S = wide() ? 190 : 96, L = Math.round(50 + Math.random() * 40);
    const el = piece(`<svg width="26" height="${L + 26}" viewBox="-13 0 26 ${L + 26}"><path d="M0 0V${L}" stroke="rgba(242,240,234,.85)" stroke-width="1"/><g transform="translate(0 ${L + 12})" stroke="#1f1814" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M-3-2q-6-6-9-2M-3 0q-6-3-10 1M-3 2q-5 2-8 7M-2 4q-3 4-5 8M3-2q6-6 9-2M3 0q6-3 10 1M3 2q5 2 8 7M2 4q3 4 5 8"/><ellipse cy="3" rx="4.5" ry="5.5" fill="#2a201a" stroke="#ddd" stroke-width=".5"/><circle cy="-4" r="3" fill="#2a201a" stroke="none"/></g></svg>`, `left:${Math.round(right ? innerWidth - S * .55 - 26 : S * .55)}px`);
    el.className = 'fx-spider';
    if (!still()) el.animate([{transform: `translateY(${-L - 30}px)`}, {transform: 'none'}], {duration: 1400, easing: 'cubic-bezier(.3,1.3,.5,1)'});
    return el;
  }
  // 蟲：沿下底抑是兩爿爬來爬去，行到位會越頭
  const BUG = '<svg width="22" height="22" viewBox="-11 -11 22 22"><g class="fx-legs" stroke="#3a2a1c" stroke-width="1.3" stroke-linecap="round"><path d="M-3-3l-6-3M3-3l6-3M-4 0h-7M4 0h7M-3 3l-6 4M3 3l6 4"/></g><path d="M-2-8q-3-4-5-3M2-8q3-4 5-3" stroke="#3a2a1c" stroke-width=".9" fill="none"/><ellipse cy="1" rx="5" ry="7" fill="#5a3b22" stroke="rgba(255,255,255,.35)" stroke-width=".6"/><circle cy="-6.5" r="2.8" fill="#3a2a1c"/><path d="M0-5v13" stroke="#2c1e12" stroke-width=".8"/></svg>';
  function bug(edge) {
    const el = piece(BUG), W = innerWidth, H = innerHeight, pts = [];
    for (let i = 0; i < 5; i++) {
      const u = Math.random();
      pts.push(edge === 'b' ? [20 + u * (W - 40), H - 10 - Math.random() * 10] : [edge === 'l' ? 9 + Math.random() * 10 : W - 9 - Math.random() * 10, H * (.3 + u * .65)]);
    }
    pts.push(pts[0]);
    const kf = []; let t = 0, prev = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      let a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 90;
      if (prev !== null) { while (a - prev > 180) a -= 360; while (a - prev < -180) a += 360; }
      const pos = `translate(${f1(x1 - 11)}px,${f1(y1 - 11)}px)`;
      if (prev !== null) kf.push({t, transform: `${pos} rotate(${f1(prev)}deg)`});
      t += prev === null ? 0 : .35; kf.push({t, transform: `${pos} rotate(${f1(a)}deg)`});
      t += Math.hypot(x2 - x1, y2 - y1) / 34 + (Math.random() < .3 ? .8 : 0); prev = a;     // 有時仔停一下
      kf.push({t, transform: `translate(${f1(x2 - 11)}px,${f1(y2 - 11)}px) rotate(${f1(a)}deg)`});
    }
    if (still()) { el.style.transform = kf[0].transform; return el; }
    el.animate(kf.map(k => ({transform: k.transform, offset: k.t / t})), {duration: t * 1000, iterations: Infinity});
    return el;
  }
  // 破窗：對角落附近一點裂開，放射的裂痕加兩輪橫的
  function crack(at) {
    const S = wide() ? 270 : 135, cx = S * .26, cy = S * .26, N = 9, ends = [];
    let d = '';
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2 + Math.random() * .4, len = S * (.5 + Math.random() * .6), pts = [];
      d += `M${f1(cx)} ${f1(cy)}`;
      for (let s = 1; s <= 4; s++) { const rr = len * s / 4, aa = a + (Math.random() - .5) * .35, p = [f1(cx + Math.cos(aa) * rr), f1(cy + Math.sin(aa) * rr)]; d += `L${p.join(' ')}`; pts.push(p); }
      ends.push(pts);
    }
    for (const ring of [0, 1]) for (let i = 0; i < N; i++) if (Math.random() > .25) d += `M${ends[i][ring].join(' ')}L${ends[(i + 1) % N][ring].join(' ')}`;
    let shards = '';                                          // 玻璃碎片：幾塊三角形淡淡反光
    for (let i = 0; i < N; i++) if (Math.random() < .5) shards += `<path d="M${f1(cx)} ${f1(cy)}L${ends[i][1].join(' ')}L${ends[(i + 1) % N][1].join(' ')}Z" fill="${i % 2 ? 'rgba(255,255,255,.22)' : 'rgba(40,50,60,.12)'}"/>`;
    if (!muted) [[3520, 0], [2637, .04], [3136, .09], [2349, .15]].forEach(([f, at]) => tone(f, .12, 'triangle', .07, at));   // 玻璃碎去的細聲
    return piece(`<svg width="${S}" height="${S}" style="--d:.45s">${shards}<path d="${d}" fill="none" stroke="rgba(30,35,45,.6)" stroke-width="3.2" stroke-linejoin="bevel" pathLength="1" class="draw"/><path d="${d}" fill="none" stroke="#fff" stroke-width="1.3" stroke-linejoin="bevel" pathLength="1" class="draw"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="7" fill="rgba(255,255,255,.85)" stroke="rgba(30,35,45,.5)"/></svg>`, CORNER[at]);
  }
  const STAGES = [
    () => [web('tl')],                               // 加油！：角落牽蜘蛛網
    () => [spider(), bug('b'), bug('l')],            // 閣較拚咧！：蜘蛛垂落來、蟲出來爬
    () => [crack('br'), web('tr')],                  // 想予詳細！：窗仔破去
    () => [crack('bl'), bug('r'), bug('b')],         // 哪會按呢？：閣破一塊、蟲閣較濟
    () => [spider(true), bug('l'), bug('r'), bug('b')] // 愛揣老師矣！：蜘蛛、蟲滿四界，灰塵上厚
  ];
  function addStage() {
    if (!ruinEl) { ruinEl = document.createElement('div'); ruinEl.className = 'fx-ruin'; ruinEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(ruinEl); }
    stages.push(ruin < STAGES.length ? STAGES[ruin]() : ruin < 9 ? [bug(['b', 'l', 'r'][ruin % 3])] : []);
    ruin++;
  }
  function dropStage() {
    const els = stages.pop() || [];
    for (const el of els) { el.classList.add('gone'); setTimeout(() => el.remove(), 800); }
    ruin = Math.max(0, ruin - 1);
  }

  function render() {
    if (bloom || ruin) gardenStart();
    if (bloom >= 4 && !shineEl) { shineEl = document.createElement('div'); shineEl.className = 'fx-shine'; shineEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(shineEl); }
    if (shineEl) {
      const s = shineEl;
      if (bloom >= 4) requestAnimationFrame(() => { s.style.opacity = bloom >= 5 ? .9 : .6; });
      else { shineEl = null; s.style.opacity = 0; setTimeout(() => s.remove(), 1000); }
    }
    if (hotEl) {
      if (bloom >= 3) { hotEl.classList.add('fx-glow'); hotEl.style.setProperty('--b', Math.min(4, bloom - 2)); }
      else { hotEl.classList.remove('fx-glow'); hotEl.style.removeProperty('--b'); }
    }
    if (bloom && scoreEl && !badge) { badge = document.createElement('span'); badge.className = 'fx-badge'; badge.setAttribute('aria-hidden', 'true'); scoreEl.insertAdjacentElement('afterend', badge); }
    if (badge) {
      if (!bloom) { badge.remove(); badge = null; }
      else { badge.textContent = '🌸' + (n > 1 ? n : ''); badge.style.fontSize = (.8 + Math.min(5, bloom) * .1) + 'em'; }
    }
    if (ruinEl) {
      ruinEl.style.setProperty('--dust', Math.min(1, ruin * .2));
      if (!ruin) { const r = ruinEl; ruinEl = null; setTimeout(() => r.remove(), 1200); }
    }
  }
  const combo = {
    // 新回合（開始、離開、結算）攏愛叫：花佮破敗攏清掉
    reset() {
      while (bloom) wither();
      while (ruin) dropStage();
      gd.ps = gd.ps.filter(p => p.w);                         // 灰塵、金光、頂懸落的花瓣隨清掉，只留謝花的花瓣
      n = m = 0; render(); if (hotEl) hotEl.classList.remove('fx-glow'); hotEl = scoreEl = null;
      if (toastEl) { toastEl.remove(); toastEl = null; }
    },
    // 答對：from＝答對的按鈕抑是題目卡（「+分」對遮飛出去）；to＝分數的數字；pts＝這題得幾分（0 就毋飛）；hot＝發金光的題目卡（讚語也貼佇伊頂緣）
    hit({from, to, pts, hot} = {}) {
      n++; m = 0;
      if (hot) hotEl = hot;
      if (to) scoreEl = to;
      if (pts) fly(from, to, '+' + pts);
      if (ruin) dropStage();                                   // 答對就清掉一款破敗
      const line = PRAISE[n] || (n > 10 && n % 5 === 0 ? PRAISE[10] : '');
      if (line) { bloom++; gardenStart(); addGroup(); }
      render();
      if (line) {
        toast(line, 'gold', hot || from);
        if (toastEl) { const r = rect(toastEl); burst(r.left + r.width / 2, r.top + r.height / 2, 14 + Math.min(bloom, 6) * 8); }
        if (bloom >= 5) shower(wide() ? 90 : 50);
        if (!muted) { tone(2637, .28, 'sine', .1, .2); if (bloom >= 4) tone(3136, .3, 'sine', .08, .3); }   // 讚語的時陣，答對音效尾加閃閃的高音
      }
      if (n === 10 || n === 20) loadConfetti().then(c => { if (still()) return; const r = from ? rect(from) : {left: 0, top: 0, width: innerWidth, height: innerHeight}; c({particleCount: 60, spread: 70, startVelocity: 35, colors: ['#ffd85a', '#f9b4c6', '#fff8ec', '#ff93a8', '#f2c14e'], origin: {x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight}}); }).catch(() => {});
      return n;
    },
    // 答錯：講一句加油語、加一款破敗，花謝一批（毋扣分）；at＝加油語貼佇佗一塊（無就用上尾答對的題目卡）
    miss({at} = {}) {
      n = 0; m++;
      if (bloom) wither();
      addStage(); render();
      toast(CHEER[Math.min(m, CHEER.length) - 1], 'dull', at || hotEl);
    },
    get n() { return n; },
    get m() { return m; },
    get bloom() { return bloom; },
    get ruin() { return ruin; }
  };

  window.FX = { ok, bad, attachToggle, verdict, cheer, record, finale, combo, muted: () => muted };
})();
