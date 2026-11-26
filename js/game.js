'use strict';
/* =========================================================
   game.js : 엔진 — 편(캠페인) · 저장 · 입력 · 이동 · 전투 · 대화 · 퀴즈 · 지도 · 랭크
   ========================================================= */
const $ = id => document.getElementById(id);
const VW = 480, VH = 270, YT = 178, YB = 256, MAXHP = 5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k * k * (3 - 2 * k);
const escH = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const CAMP_ORDER = ['song', 'yuan', 'review'];

let S = null;
const G = {
  mode: 'title', area: null, t: 0, cam: 0, keys: {}, target: null, vis: [], foes: [], near: null,
  P: { x: 60, y: 214, face: 1, walk: 0, moving: false },
  Fo: { x: 40, y: 208, face: 1, walk: 0, moving: false },
  typing: null, log: [], overlay: null, flash: 0, saveT: 0, titleCam: 0,
  dust: [], speaker: null, shots: [], hazards: [],
  inv: 0, atk: null, atkCd: 0, dash: false, lastDir: '', lastDirT: 0, shake: 0, bursts: [],
  focus: null, zoom: 1, zk: 0, zfx: 240, zfy: 135,
};
const C = () => CAMPS[(S && S.camp) || 'song'];
const cv = $('cv'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

/* ---------------- 소리 ---------------- */
const SND = (() => {
  let ac = null, on = true;
  try { on = localStorage.getItem('cheonha-sound') !== 'off'; } catch (e) { }
  const unlock = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === 'suspended') ac.resume(); };
  function tone(f, d, type = 'square', vol = 0.04, when = 0, slide = 0) {
    if (!on || !ac) return; const t = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const P = {
    blip: () => tone(660 + Math.random() * 80, 0.03, 'square', 0.012),
    tick: () => tone(880, 0.05, 'triangle', 0.04),
    good: () => { tone(660, 0.08, 'triangle', 0.06); tone(990, 0.12, 'triangle', 0.05, 0.07); },
    bad: () => tone(180, 0.18, 'sawtooth', 0.04, 0, -60),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, i * 0.09)),
    rec: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.07, i * 0.1)),
    open: () => tone(440, 0.06, 'triangle', 0.04),
    flash: () => { tone(220, 0.6, 'sine', 0.06, 0, 600); tone(330, 0.6, 'sine', 0.04, 0.1, 800); },
    swing: () => tone(520, 0.08, 'triangle', 0.03, 0, -300),
    hit: () => { tone(140, 0.09, 'square', 0.05, 0, -60); tone(300, 0.05, 'triangle', 0.04); },
    hurt: () => tone(220, 0.25, 'sawtooth', 0.05, 0, -140),
    kill: () => [300, 450, 600].forEach((f, i) => tone(f, 0.1, 'triangle', 0.05, i * 0.05)),
    coin: () => { tone(1320, 0.06, 'square', 0.025); tone(1760, 0.12, 'square', 0.025, 0.06); },
    buy: () => [880, 1100, 1320].forEach((f, i) => tone(f, 0.09, 'triangle', 0.05, i * 0.06)),
    stamp: () => { tone(90, 0.25, 'sine', 0.12, 0, -40); tone(160, 0.08, 'square', 0.04); },
    page: () => { tone(500, 0.07, 'triangle', 0.03, 0, 300); tone(700, 0.06, 'triangle', 0.025, 0.05, 200); },
    toggle: () => tone(760, 0.04, 'square', 0.03),
    close: () => tone(520, 0.07, 'triangle', 0.035, 0, -200),
    ui: () => tone(980, 0.03, 'triangle', 0.025),
    lock: () => { tone(200, 0.06, 'square', 0.04); tone(150, 0.08, 'square', 0.04, 0.07); },
    potion: () => [520, 660, 880].forEach((f, i) => tone(f, 0.1, 'sine', 0.05, i * 0.07)),
    skill: () => { tone(300, 0.25, 'sawtooth', 0.035, 0, 600); tone(600, 0.2, 'triangle', 0.04, 0.05, 400); },
  };
  return { unlock, play(k) { try { P[k] && P[k](); } catch (e) { } }, get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('cheonha-sound', on ? 'on' : 'off'); } catch (e) { } return on; } };
})();

/* ---------------- 화면 크기 ---------------- */
function fit() {
  const w = Math.min(window.innerWidth, window.innerHeight * 16 / 9), h = w * 9 / 16;
  const st = $('stage'); st.style.width = w + 'px'; st.style.height = h + 'px';
  document.documentElement.style.setProperty('--u', (w / 1280) + 'px');
}
window.addEventListener('resize', fit); fit();

/* ---------------- 저장 · 진행 기록 ---------------- */
const SKEY = c => 'cheonha-v2-' + c, PKEY = 'cheonha-v2-progress';
function newState(camp, name) {
  return { v: 2, camp, name: name || '진호', area: CAMPS[camp].start, x: null, y: null, flags: {}, recs: [], quiz: {}, qfirst: 0, qtries: {}, mg: {}, items: {}, pending: null, play: 0, hp: MAXHP, deaths: 0, lastFocus: '', done: false };
}
function save() { if (!S || G.mode === 'title') return; if (G.area) { S.x = Math.round(G.P.x); S.y = Math.round(G.P.y); } try { localStorage.setItem(SKEY(S.camp), JSON.stringify(S)); } catch (e) { } }
function loadSave(c) { try { const r = localStorage.getItem(SKEY(c)); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function loadProg() { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { return {}; } }
function saveProg(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { } }
function setFlag(k) { S.flags[k] = 1; save(); }
const rankOf = s => s >= 95 ? 'S' : s >= 85 ? 'A' : s >= 75 ? 'B' : s >= 65 ? 'C' : s >= 55 ? 'D' : s >= 45 ? 'E' : 'F';
function scoreOf(st) { return clamp(100 - (st.penalty || 0), 0, 100); }

/* ---------------- 지역 ---------------- */
function loadArea(id, x, y) {
  const A = AREAS[id]; G.area = A; S.area = id; A.id = id;
  G.P.x = clamp(x != null ? x : A.spawn[0], 10, A.L - 10); G.P.y = clamp(y != null ? y : A.spawn[1], YT, YB); G.P.face = 1; G.P.moving = false;
  G.Fo.x = G.P.x - 20; G.Fo.y = G.P.y - 6; G.Fo.face = 1;
  G.cam = clamp(G.P.x - VW * 0.42, 0, Math.max(0, A.L - VW)); G.target = null; G.keys = {}; G.dash = false;
  G.foes = []; G.bursts = []; G.shots = []; G.hazards = []; G.atk = null; G.inv = 0;
  refreshEnts(); updateHud(); save();
}
function showBanner() {
  const A = G.area, el = $('areaBanner'); if (!A) return;
  $('abCh').textContent = A.chName; $('abPlace').textContent = A.place; $('abEra').textContent = A.era;
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  clearTimeout(G.bannerT); G.bannerT = setTimeout(() => { el.hidden = true; }, 3200);
}
function afterEnter() {
  const A = G.area;
  showBanner();
  if (A.intro && !has('in_' + S.area)) run(SC[A.intro], () => setFlag('in_' + S.area));
  else setTimeout(maybeFocus, 300);
}
function transition(id, x, y, cb) {
  G.mode = 'trans'; G.focus = null; $('fade').classList.add('on');
  setTimeout(() => {
    loadArea(id, x, y);
    setTimeout(() => { $('fade').classList.remove('on'); G.mode = 'play'; afterEnter(); cb && cb(); }, 250);
  }, 480);
}
function refreshEnts() {
  if (!G.area) return;
  G.vis = G.area.ents.filter(e => e.k !== 'foe' && (!e.cond || e.cond()));
  for (const e of G.area.ents) {
    if (e.k !== 'foe') continue;
    if (has(`foe_${S.area}_${e.id}`) || (e.cond && !e.cond()) || G.foes.some(f => f.e === e)) continue;
    const hp = (FOE_KIND[e.kind] && FOE_KIND[e.kind].hp) || e.hp || 3;
    G.foes.push({ e, x: e.x, y: e.y, hp, max: hp, hit: 0, vx: 0, seed: Math.random() * 6, face: -1 });
  }
}

/* ---------------- 스크립트 실행 ---------------- */
let RUN = null;
function run(script, done) {
  if (!script) { console.warn('script missing'); return; }
  G.mode = 'script'; G.target = null; G.keys = {}; G.dash = false; RUN = { done }; G.hist = []; G.histIdx = null; G.runId = (G.runId || 0) + 1;
  hidePrompt(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  seq(script, finish);
}
function finish() {
  hideDialog(); $('choices').hidden = true; G.mode = 'play'; G.camFocus = null; G.npcTalk = false;
  const d = RUN && RUN.done; RUN = null; refreshEnts(); updateHud(); save(); d && d();
  setTimeout(maybeFocus, 200);
}
function endTalk() {
  if (!G.npcTalk || G.mode !== 'script' || G.overlay || Quiz.active || MG.active) return;
  G.runId++; G.compassBusy = false; const cf = $('compassFx'); if (cf) cf.classList.remove('on', 'out');
  terminal(); SND.play('tick');
}
function terminal() { G.camFocus = null; G.npcTalk = false; hideDialog(); $('choices').hidden = true; RUN = null; G.mode = 'play'; save(); }
/* 【조작법】 같은 안내 문장은 대화창이 아니라 안내창 하나에 모아서 보여 준다 */
const isGuide = c => Array.isArray(c) && c[0] === 'nar' && /^【/.test(c[1]);
function seq(script, end) {
  let i = 0; const rid = G.runId;
  const next = () => {
    if (rid !== G.runId) return;
    if (i >= script.length) return end();
    if (isGuide(script[i])) { const g = []; while (i < script.length && isGuide(script[i])) g.push(script[i++][1]); hideDialog(); return showGuide(g, next); }
    exec(script[i++], next);
  };
  next();
}
const KEYS_RE = /(방향키|같은 방향키|W·A·S·D|Shift|Space|Enter|Esc|Z 키|E\/Space|E(?= ·)|\bM\b|\bJ\b|\bL\b|마우스)/g;
function showGuide(lines, next) {
  const groups = [];
  for (const ln of lines) {
    const m = ln.match(/^【([^】]+)】\s*(.*)$/); const tag = m ? m[1] : '안내', body = m ? m[2] : ln;
    let g = groups.find(x => x.tag === tag); if (!g) groups.push(g = { tag, items: [] });
    body.split(/(?<=[.!])\s+|\s·\s(?=[A-Z가-힣]+:)/).filter(Boolean).forEach(s => g.items.push(s));
  }
  const icon = t => /전투|보스/.test(t) ? '⚔' : /조작|복습/.test(t) ? '⌨' : '!';
  const el = $('guide');
  el.innerHTML = `<div class="guide-card" role="dialog" aria-label="안내">${groups.map(g => `<section><h3><span class="g-ic">${icon(g.tag)}</span>${escH(g.tag)}</h3><ul>${g.items.map(s => `<li>${escH(s).replace(KEYS_RE, '<span class="kbd">$1</span>')}</li>`).join('')}</ul></section>`).join('')}
    <button class="btn gold" id="guideGo">확인 <span class="kbd">Space</span></button></div>`;
  el.hidden = false; G.overlay = 'guide'; SND.play('open');
  const go = () => { el.hidden = true; el.innerHTML = ''; G.overlay = null; G.guideClose = null; next(); };
  $('guideGo').onclick = go; G.guideClose = go;
}
function exec(c, next) {
  if (Array.isArray(c)) return say(c[0], c[1], next, c[2]);
  if (c.cam !== undefined) {
    if (c.cam === null) { G.camFocus = null; return next(); }
    G.camFocus = c.cam; hideDialog();
    return setTimeout(next, c.ms || 1300);
  }
  if (c.compass !== undefined) {
    // with: 다음 대사와 동시에 돌고, 연출이 끝날 때까지 다음 대사로 못 넘어감
    if (c.with) { G.compassBusy = true; showCompass(c.compass, c.spins || 0, () => { G.compassBusy = false; if (G.auto && G.typing && G.typing.done) advance(); }); return next(); }
    hideDialog(); return showCompass(c.compass, c.spins || 0, next);
  }
  if (c.ink) { G.inkFx = { t: 0, x: 548, y: 204, to: [[470, 206], [500, 238]] }; G.shake = 0.3; SND.play('bad'); return next(); }
  if (c.flag) { setFlag(c.flag); refreshEnts(); updateHud(); return next(); }
  if (c.give) return giveRec(c.give, next);
  if (c.item) { S.items[c.item] = 1; save(); toast(c.toast, 'item'); SND.play('good'); return next(); }
  if (c.quiz) { if (S.quiz[c.quiz]) return next(); hideDialog(); return Quiz.open(c.quiz, next); }
  if (c.mg) { if (S.mg[c.mg]) return next(); hideDialog(); return MG.start(c.mg, () => { S.mg[c.mg] = 1; save(); next(); }); }
  if (c.img) { hideDialog(); return showImg(c.img, c.cap, next); }
  if (c.choice) return choose(c.choice, next);
  if (c.if) return c.if() ? seq(c.then, next) : (c.else ? seq(c.else, next) : next());
  if (c.chapter !== undefined) { hideDialog(); return showChapter(c.chapter, next); }
  if (c.fx) { if (c.fx === 'flash') { G.flash = 1; SND.play('flash'); } return setTimeout(next, c.ms || 700); }
  if (c.wait) return setTimeout(next, c.wait);
  if (c.go) { terminal(); return transition(c.go, c.x, c.y); }
  if (c.map) { S.pending = c.map; terminal(); return openMap(); }
  if (c.ending) { terminal(); return startEnding(); }
  if (c.campDone) { terminal(); return campDone(); }
  next();
}

/* ---------------- 대화창 : 쪽 나누기 · 강조 ---------------- */
const ptx = $('pt').getContext('2d'); ptx.imageSmoothingEnabled = false;
/* 강조는 대사에 직접 **정답** 으로 표시한 퀴즈 정답에만 적용한다 (자동 강조 없음) */
const KWS = () => [];
let KW_SORTED = null;
const LINE = 33;
function plainLen(s) { return s.replaceAll('**', '').length; }
/* 한 대화창에 한 문장씩. 아주 긴 문장만 쉼표에서 나눈다. */
function paginate(text) {
  const sents = text.split(/(?<=[.?!…~」』"](?:\*\*)?)\s+/).filter(Boolean);
  const pages = [];
  for (const s of sents) {
    if (plainLen(s) <= LINE * 3) { pages.push(s); continue; }
    const parts = s.split(/(?<=,)\s+/); let cur = '';
    for (const p of parts) { if (cur && plainLen(cur + ' ' + p) > LINE * 3) { pages.push(cur); cur = p; } else cur = cur ? cur + ' ' + p : p; }
    if (cur) pages.push(cur);
  }
  // 줄바꿈 없이 한 줄에 들어가는 짧은 문장들은 한 번에 보여 준다
  const merged = [];
  for (const p of pages) {
    const last = merged[merged.length - 1];
    if (last && plainLen(last) + 1 + plainLen(p) <= LINE) merged[merged.length - 1] = last + ' ' + p;
    else merged.push(p);
  }
  return merged.length ? merged : [text];
}
/* 대사에 따라 말하는 사람 머리 위에 띄울 감정 표시 */
function detectEmote(t) {
  if (/♪/.test(t)) return 'note';
  if (/^(헉|으악|으앗|앗|어,|어\?|어어|뭐|에엑|네에|세상에|우와)/.test(t) || /\?!|!\?|!!/.test(t)) return 'surprise';
  if (/(하하|허허|헤헤|호호|크크|후후)/.test(t)) return 'laugh';
  if (/^\.{3}|^…|^\(작게\)|\(깊은 한숨\)|\.\.\.$/.test(t)) return 'sweat';
  if (/\?$/.test(t.trim())) return 'question';
  return null;
}
function parseKw(text) {
  let plain = ''; const ranges = [];
  text.split('**').forEach((p, i) => { if (i % 2) ranges.push([plain.length, plain.length + p.length, 1]); plain += p; });
  if (!KW_SORTED) KW_SORTED = KWS();
  for (const k of KW_SORTED) {
    let idx = 0;
    while ((idx = plain.indexOf(k, idx)) >= 0) { const e = idx + k.length; if (!ranges.some(r => idx < r[1] && e > r[0])) ranges.push([idx, e, 0]); idx = e; }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  return { plain, ranges };
}
function renderKw(P, n) {
  let out = '', pos = 0;
  for (const [s, e] of P.ranges) {
    if (s >= n) break;
    out += escH(P.plain.slice(pos, s)); out += `<em class="kw">${escH(P.plain.slice(s, Math.min(e, n)))}</em>`; pos = Math.min(e, n);
  }
  if (pos < n) out += escH(P.plain.slice(pos, n));
  return out;
}
function say(spk, text, next, opt) {
  const D = $('dlg'); D.hidden = false;
  const sp = SPK[spk] || { n: spk };
  const nar = spk === 'nar';
  const name = spk === 'me' ? S.name : (sp.n || '');
  D.classList.toggle('nar', nar); D.classList.toggle('who-me', spk === 'me'); D.classList.toggle('who-so', spk === 'so'); D.classList.toggle('who-sh', spk === 'shadow');
  $('dlgName').textContent = name; $('dlgName').hidden = nar || !name;
  const look = spk === 'me' ? 'me' : sp.look;
  $('ptBox').hidden = nar || !look;
  if (look) ART.portrait(ptx, look);
  const full = text.replaceAll('{n}', S.name);
  G.curLine = { spk, name, nar, look, full };
  // 지도는 대사에 { mm: ['장소'] } 로 직접 지정한 곳, 또는 지도를 직접 보라고 할 때만 띄우고, 지정한 장소만 표시한다
  const mm = opt && opt.mm, want = !!mm || wantsMap(full);
  G.mmText = mm ? mm.join(' ') : full; if ($('miniMapBox').classList.contains('on') && want) $('miniMapBox').classList.remove('on'); showMiniMap(want);
  if (!G.speaker || G.speaker.spk !== spk) { const pb = $('ptBox'); pb.classList.remove('pop'); void pb.offsetWidth; pb.classList.add('pop'); }
  G.speaker = { spk, look, t: 0, emote: nar ? null : detectEmote(full.replaceAll('**', '')) };
  if (D.dataset.shown !== '1') { D.dataset.shown = '1'; D.classList.remove('in'); void D.offsetWidth; D.classList.add('in'); }
  G.log.push({ n: nar ? '' : name, t: full.replaceAll('**', '') }); if (G.log.length > 300) G.log.shift();
  const pages = paginate(full);
  let pi = 0;
  const showPage = () => typePage(parseKw(pages[pi]), pi < pages.length - 1, () => { pi++; if (pi < pages.length) showPage(); else next(); });
  showPage();
}
function typePage(P, more, next) {
  const el = $('dlgText'); el.innerHTML = ''; $('dlgMore').hidden = true;
  if (G.typing && G.typing.iv) clearInterval(G.typing.iv);
  const T = { P, n: 0, done: false, next, more };
  (G.hist = G.hist || []).push(Object.assign({}, G.curLine, { P, more })); if (G.hist.length > 80) G.hist.shift(); G.histIdx = null; $('dlg').classList.remove('review');
  const end = () => { clearInterval(T.iv); T.done = true; el.innerHTML = renderKw(P, P.plain.length); $('dlgMore').hidden = false; $('dlgMore').textContent = more ? '▶' : '▼';
    if (G.auto) setTimeout(() => { if (G.auto && G.histIdx == null && G.typing === T && T.done && $('choices').hidden) advance(); }, G.auto === 2 ? 60 : 650); };
  T.iv = setInterval(() => {
    T.n += 1; el.innerHTML = renderKw(P, T.n);
    if (T.n % 3 === 0 && P.plain[T.n - 1] !== ' ') SND.play('blip');
    if (T.n >= P.plain.length) end();
  }, G.auto === 2 ? 1 : G.auto ? 16 : 22);
  if (G.auto === 2) setTimeout(() => { if (!T.done) end(); }, 0);
  T.end = end; G.typing = T;
}
/* ←/→ : 이번 대화에서 지나간 대사를 다시 보기 (→ 또는 Space로 현재 대사로 돌아옴) */
function showSnap(s, review) {
  const D = $('dlg');
  D.classList.toggle('nar', s.nar); D.classList.toggle('who-me', s.spk === 'me'); D.classList.toggle('who-so', s.spk === 'so'); D.classList.toggle('who-sh', s.spk === 'shadow');
  $('dlgName').textContent = s.name; $('dlgName').hidden = s.nar || !s.name;
  $('ptBox').hidden = s.nar || !s.look; if (s.look) ART.portrait(ptx, s.look);
  $('dlgText').innerHTML = renderKw(s.P, s.P.plain.length);
  $('dlgMore').hidden = false; $('dlgMore').textContent = review ? '◀ 이전 대사 · → 다음' : (s.more ? '▶' : '▼');
  D.classList.toggle('review', !!review);
  G.speaker = review ? null : { spk: s.spk, look: s.look, t: 2, emote: null };
}
function histMove(d) {
  const H = G.hist || []; if (!H.length || !$('choices').hidden || $('dlg').hidden) return;
  if (G.typing && !G.typing.done) G.typing.end();
  const cur = H.length - 1;
  let i = (G.histIdx == null ? cur : G.histIdx) + d;
  if (i < 0) { SND.play('tick'); return; }
  if (i >= cur) { G.histIdx = null; showSnap(H[cur], false); SND.play('tick'); return; }
  G.histIdx = i; showSnap(H[i], true); SND.play('tick');
}
function advance() {
  if (G.histIdx != null) return histMove(1);
  const T = G.typing; if (!T || !$('choices').hidden) return;
  if (!T.done) { T.end(); return; }
  if (G.compassBusy) return;
  G.typing = null; T.next();
}
/* 대사가 지도를 보라고 하면 화면 오른쪽 위에 작은 지도를 띄운다 */
/* 먹물 그림자 등장 연출 : 상자에서 먹물이 끓어오르고 덩어리 두 개가 튀어나와 자리를 잡는다 */
function drawInkFx(cam) {
  const f = G.inkFx, t = f.t, sx = f.x - cam, sy = f.y - 6;
  const grow = Math.min(1, t / 0.6);
  ctx.fillStyle = 'rgba(20,10,30,.85)'; ctx.beginPath(); ctx.ellipse(sx, sy + 4, 16 * grow, 5 * grow, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 6; k++) { const p = (t * 1.6 + k / 6) % 1; ctx.fillStyle = `rgba(120,70,200,${0.7 * (1 - p)})`; ctx.beginPath(); ctx.arc(sx - 10 + k * 4, sy - p * 14, 1.5 + p * 2, 0, Math.PI * 2); ctx.fill(); }
  f.to.forEach(([tx, ty], i) => {
    const st = 0.55 + i * 0.25, p = clamp((t - st) / 0.7, 0, 1);
    if (t < st) return;
    const x = lerp(f.x, tx, p) - cam, y = lerp(sy, ty, p) - Math.sin(p * Math.PI) * 40;
    if (p < 1 && p > 0 && Math.random() < 0.4) G.bursts.push({ x: lerp(f.x, tx, p), y: lerp(sy, ty, p) - Math.sin(p * Math.PI) * 40 + 10, t: 0.3 });
    ART.foe(x, y, G.t, { hp: 3, max: 3, seed: i * 2, face: -1, moving: p < 1 });
    if (p >= 1 && t - st - 0.7 < 0.1) { G.shake = 0.15; }
  });
}
function wantsMap(t) {
  // 지도를 직접 보라고 하거나 지도 위 장소를 가리킬 때만 띄운다
  return /지도 ?(를|좀) ?봐|지도를 보면|지도로 보니/.test(t);
  if (!/지도/.test(t)) return false;
  if (/지도 (상인|조각|탁자)|교역 지도를 손에|지도도 있어요|초원 지도를 그려|지도 한 장에|지도를 그려 주지|【/.test(t)) return false;
  return /지도(를|좀| 좀|가|에|의|위| 위| 북쪽| 바다| 가운데|도 반응)/.test(t) || /지도[!.]/.test(t);
}
function showMiniMap(on) {
  const el = $('miniMapBox'); if (!el) return;
  if (!on || !S || !G.area) { el.classList.remove('on'); return; }
  if (!el.classList.contains('on')) {
    const camp = C(), cur = camp.areaNode[S.area];
    const svg = camp.map === 'song' ? songMapSVG({ cur }) : yuanMapSVG({ cur, withSong: camp.map === 'all' });
    el.innerHTML = `<p class="mm-tag">교역 지도</p>${svg.replace('</svg>', mapHighlight(G.mmText || '', camp.map) + '</svg>')}`;
    void el.offsetWidth; el.classList.add('on');
  }
}
function hideDialog() { showMiniMap(false); $('dlg').hidden = true; $('dlg').dataset.shown = '0'; G.speaker = null; if (G.typing && G.typing.iv) clearInterval(G.typing.iv); G.typing = null; }
function choose(opts, next) {
  const box = $('choices'); box.innerHTML = ''; box.hidden = false;
  if (G.typing && !G.typing.done) G.typing.end();
  $('dlgMore').hidden = true;
  opts.forEach((o, i) => {
    const b = document.createElement('button'); b.className = 'choice'; b.innerHTML = `<span class="kbd">${i + 1}</span>${escH(o.t)}`;
    b.onclick = e => { e.stopPropagation(); box.hidden = true; SND.play('tick'); G.typing = null; b.blur(); seq(o.s || [], next); };
    box.appendChild(b);
  });
}

/* ---------------- 이미지 · 토스트 · 장 카드 ---------------- */
function showImg(key, cap, next) {
  const el = $('imgpop');
  el.innerHTML = `<figure class="img-panel"><img src="${IMGS[key]}" alt="${escH(cap || '')}"><figcaption>${escH(cap || '')}</figcaption><button class="btn gold" id="imgGo">계속 <span class="kbd">Space</span></button></figure>`;
  el.hidden = false; G.overlay = 'img'; SND.play('open');
  const go = () => { el.hidden = true; el.innerHTML = ''; G.overlay = null; G.imgClose = null; next(); };
  $('imgGo').onclick = go; G.imgClose = go;
}
let toastT = 0;
function toast(t, kind) { const el = $('toast'); el.textContent = t; el.classList.toggle('item', kind === 'item'); el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2400); }
function showChapter(n, next) {
  const ch = C().chapters[n]; const el = $('chap');
  el.querySelector('.chap-part').textContent = `${C().tag} · ${C().title}`;
  el.querySelector('.chap-n').textContent = ch.n; el.querySelector('.chap-t').textContent = ch.t; el.querySelector('.chap-s').textContent = ch.s;
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); SND.play('rec');
  G.overlay = 'chap';
  let doneF = false;
  const close = () => { if (doneF) return; doneF = true; el.hidden = true; G.overlay = null; el.onclick = null; next && next(); };
  el.onclick = close; G.chapClose = close;
  setTimeout(close, 3400);
}

/* ---------------- HUD ---------------- */
function goalText() {
  if (S.pending) return '지도(M)를 열고 반짝이는 다음 목적지를 눌러 이동하자';
  return G.area && G.area.goal ? G.area.goal() : '';
}
function updateHud() {
  if (!G.area || !S) return;
  const A = G.area;
  $('hudCh').textContent = A.chName; $('hudPlace').textContent = A.place; $('hudEra').textContent = `${C().title} · ${A.era}`;
  $('hudRec').textContent = `${S.recs.length} / ${C().recs.length}`;
  const g = goalText(); $('goalText').textContent = g; $('goal').hidden = !g;
  updateHearts();
}
function updateHearts() {
  if (!S) return;
  $('hearts').innerHTML = Array.from({ length: MAXHP }, (_, i) => `<i class="${i < S.hp ? 'on' : ''}">♥</i>`).join('');
}
function showPrompt(e) {
  const verb = e.k === 'npc' ? '대화하기' : e.k === 'door' ? (e.to ? '들어가기' : '문 두드리기') : e.k === 'exit' ? '이동하기' : '살펴보기';
  $('promptText').textContent = `${verb} · ${e.name}`; $('prompt').hidden = false;
}
function hidePrompt() { $('prompt').hidden = true; }

/* ---------------- 카메라 안내 (목표 위치 확대) ---------------- */
function maybeFocus() {
  return; // 카메라 확대 안내는 사용하지 않음
  if (!S || !G.area || G.mode !== 'play' || G.overlay) return;
  const key = S.area + '|' + goalText();
  if (S.lastFocus === key) return;
  S.lastFocus = key;
  const marked = G.vis.filter(e => e.mark && e.mark());
  const tgt = marked.find(e => e.mark() === '!') || marked[0];
  if (!tgt || Math.abs(tgt.x - G.P.x) < 80) return;
  G.focus = { e: tgt, t: 0, dur: 2.6 }; G.mode = 'focus'; hidePrompt();
  $('focusTag').textContent = `여기! ${tgt.name}`;
}
function updateFocus(dt) {
  const f = G.focus; f.t += dt;
  const k = f.t < 0.7 ? ease(f.t / 0.7) : f.t < 1.9 ? 1 : 1 - ease(Math.min(1, (f.t - 1.9) / 0.7));
  const A = G.area, camP = clamp(G.P.x - VW * 0.42, 0, Math.max(0, A.L - VW)), camT = clamp(f.e.x - VW / 2, 0, Math.max(0, A.L - VW));
  G.cam = lerp(camP, camT, k);
  const ey = f.e.k === 'door' ? 140 : f.e.k === 'exit' ? 180 : f.e.y - 16;
  G.zk = k; G.zoom = 1 + 0.75 * k; G.zfx = f.e.x - G.cam; G.zfy = ey;
  $('focusTag').hidden = !(f.t > 0.5 && f.t < 2.0);
  if (f.t >= f.dur) { G.focus = null; G.zoom = 1; G.zk = 0; $('focusTag').hidden = true; G.mode = 'play'; }
}
function skipFocus() { if (G.focus && G.focus.t < 1.9) G.focus.t = 1.9; }

/* ---------------- 상호작용 ---------------- */
function inRange(e) {
  const rx = e.k === 'door' ? 16 : e.k === 'exit' ? 22 : 20, ry = e.k === 'door' ? 16 : 24;
  const ey = e.k === 'door' ? YT : e.k === 'exit' ? clamp(G.P.y, YT, YB) : e.y;
  return Math.abs(e.x - G.P.x) < rx && Math.abs(ey - G.P.y) < ry;
}
function interact(e) {
  if (!e) return;
  G.target = null; G.keys = {};
  if ((e.k === 'door' || e.k === 'exit') && e.to) {
    const lock = e.lock ? e.lock() : null;
    if (lock) return run(SC[lock]);
    SND.play('open');
    if (e.ch !== undefined) { G.mode = 'trans'; return showChapter(e.ch, () => transition(e.to, e.tx, 214)); }
    return transition(e.to, e.tx, e.k === 'door' ? 214 : G.P.y);
  }
  const tk = typeof e.talk === 'function' ? e.talk() : e.talk;
  let script = Array.isArray(tk) ? tk : SC[tk];
  if (!script) return;
  // 이미 끝낸 대화를 다시 걸면 : 같은 대사를 반복하지 않고 핵심 요약 + 지금 할 일을 알려 준다
  const key = typeof tk === 'string' ? tk : null;
  S.seen = S.seen || {};
  if (key && S.seen[key] && !/_r$|wait|lock/.test(key)) script = recapFor(key, e);
  run(script, key ? () => { S.seen[key] = 1; save(); } : null);
  G.npcTalk = e.k === 'npc';
}

function recapFor(key, e) {
  const R = (typeof RECAP !== 'undefined' && RECAP[key]) ? RECAP[key].slice() : [['so', `${e.name}에게 들은 이야기는 역사 노트(J)에 정리되어 있어.`]];
  const g = goalText();
  if (g && !/완료|완결/.test(g)) R.push(['so', `지금 할 일 — ${g}`]);
  return R;
}
/* ---------------- 전투 ---------------- */
/* 먹물 그림자 종류: ink(보통) · fast(빠르게 돌진) · shooter(멀리서 먹물탄) · tank(크고 단단함) · boss */
const FOE_KIND = {
  ink: { sp: 34, r: 9, kb: 140 },
  fast: { sp: 62, r: 7, kb: 170, hp: 2 },
  shooter: { sp: 30, r: 9, kb: 140 },
  tank: { sp: 18, r: 13, kb: 50, hp: 6 },
  boss: { sp: 24, r: 20, kb: 60 },
};
const kindOf = f => f.e.boss ? 'boss' : (f.e.kind || 'ink');
function hitR(f) { return FOE_KIND[kindOf(f)].r; }
function attack() {
  if (G.atkCd > 0) return;
  G.atk = { t: 0 }; G.atkCd = 0.32; SND.play('swing');
  const P = G.P, x0 = Math.min(P.x + P.face * 2, P.x + P.face * 30), x1 = Math.max(P.x + P.face * 2, P.x + P.face * 30);
  for (const f of G.foes) {
    if (f.dead) continue;
    const r = hitR(f), fx0 = f.x - r, fx1 = f.x + r;
    if (fx1 < x0 || fx0 > x1 || Math.abs(f.y - P.y) > r + 10) continue;
    f.hp--; f.hit = 0.15; f.vx = P.face * FOE_KIND[kindOf(f)].kb; f.dash = 0; SND.play('hit'); G.shake = 0.12;
    if (f.hp <= 0) killFoe(f);
    else checkPhase(f);
  }
  // 먹물탄도 붓으로 튕겨 낼 수 있다
  for (const s of G.shots) if (s.x >= x0 - 4 && s.x <= x1 + 4 && Math.abs(s.y - P.y) < 18) s.life = 0;
}
function checkPhase(f) {
  const ph = f.e.phases; if (!ph) return false;
  const k = `bp_${S.area}_${f.hp}`;
  if (ph[f.hp] && !has(k) && G.mode === 'play') { setFlag(k); f.vx = 0; G.hazards = []; G.shots = []; run(SC[ph[f.hp]]); return true; }
  return false;
}
function killFoe(f) {
  f.dead = true; SND.play('kill'); G.bursts.push({ x: f.x, y: f.y, t: 0, big: f.e.boss });
  if (f.e.temp) { setTimeout(() => { G.foes = G.foes.filter(x => x !== f); }, 350); return; }
  setFlag(`foe_${S.area}_${f.e.id}`);
  if (f.e.boss) { G.hazards = []; G.shots = []; G.foes.forEach(x => { if (x.e.temp) x.dead = true; }); }
  if (f.e.drop) { setFlag(f.e.drop); toast('먹물 그림자가 지도 조각을 떨어뜨렸다!'); SND.play('good'); }
  else toast(f.e.boss ? '망각의 그림자를 물리쳤다!' : '먹물 그림자를 물리쳤다!');
  setTimeout(() => {
    G.foes = G.foes.filter(x => x !== f && !x.dead); refreshEnts(); updateHud();
    const A = G.area;
    if (A.onClear && cleared(S.area) && !has('clr_' + S.area) && SC[A.onClear]) { setFlag('clr_' + S.area); if (G.mode === 'play') run(SC[A.onClear]); }
  }, 350);
}
function hurt(src) {
  if (G.inv > 0) return;
  S.hp--; G.inv = 1.3; G.shake = 0.25; SND.play('hurt');
  G.P.x = clamp(G.P.x + (G.P.x < src.x ? -16 : 16), 8, G.area.L - 8);
  updateHearts(); $('hearts').classList.remove('hit'); void $('hearts').offsetWidth; $('hearts').classList.add('hit');
  if (S.hp <= 0) defeat();
}
function shoot(x, y, tx, ty, sp = 85) {
  const d = Math.hypot(tx - x, ty - y) || 1;
  G.shots.push({ x, y, vx: (tx - x) / d * sp, vy: (ty - y) / d * sp * 0.7, life: 3.2 });
}
/* 보스 공격 패턴 : 경고 뒤에 먹물 웅덩이 · 먹물 띠 · 사방 먹물탄 · 졸개 소환 */
function bossPattern(f) {
  const P = G.P, A = G.area;
  const n = (f.pat = ((f.pat || 0) + 1)) % 4;
  if (n === 1) {
    const spots = [[P.x, P.y]];
    for (let i = 0; i < 4; i++) spots.push([clamp(P.x + (Math.random() - 0.5) * 200, 20, A.L - 20), YT + 6 + Math.random() * (YB - YT - 12)]);
    spots.forEach(([x, y]) => G.hazards.push({ type: 'pool', x, y, r: 16, t: 0, warn: 1.1, life: 2.4 }));
    toast('발밑에 먹물이 고인다! 붉은 원을 피하자!');
  } else if (n === 2) {
    const ys = [P.y, YT + 8 + Math.random() * (YB - YT - 16)];
    ys.forEach(y => G.hazards.push({ type: 'band', x: 0, y: clamp(y, YT + 6, YB - 6), r: 9, t: 0, warn: 1.2, life: 1.6 }));
    toast('먹물 파도가 밀려온다! 위아래로 피하자!');
  } else if (n === 3) {
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; shoot(f.x, f.y - 10, f.x + Math.cos(a) * 100, f.y - 10 + Math.sin(a) * 100, 70); }
  } else {
    for (let i = 0; i < 2; i++) G.foes.push({ e: { id: 'm' + Math.random(), k: 'foe', kind: 'fast', temp: true }, x: f.x + (i ? 30 : -30), y: clamp(f.y + (i ? 14 : -14), YT, YB), hp: 2, max: 2, hit: 0, vx: 0, seed: Math.random() * 6, face: -1 });
    toast('망각의 그림자가 졸개를 불러냈다!');
  }
}
function updateCombat(dt) {
  if (G.atkCd > 0) G.atkCd -= dt;
  if (G.atk) { G.atk.t += dt; if (G.atk.t > 0.22) G.atk = null; }
  if (G.inv > 0) G.inv -= dt;
  const P = G.P, A = G.area;
  for (const f of G.foes) {
    if (f.dead) continue;
    if (f.hit > 0) f.hit -= dt;
    if (checkPhase(f)) return;
    const kind = kindOf(f), K = FOE_KIND[kind];
    const dx = P.x - f.x, dy = P.y - f.y, d = Math.hypot(dx, dy);
    f.face = dx > 0 ? 1 : -1; f.moving = false;
    if (kind === 'shooter') {
      if (d < 170) {
        const want = d < 80 ? -1 : d > 130 ? 1 : 0;
        if (want) { f.x += dx / d * K.sp * want * dt; f.y += dy / d * K.sp * 0.6 * want * dt; f.moving = true; }
        f.cd = (f.cd == null ? 1.2 : f.cd) - dt;
        if (f.cd <= 0) { f.cd = 1.9; f.flashT = 0.25; shoot(f.x + f.face * 6, f.y - 12, P.x, P.y - 10); }
      }
      if (f.flashT > 0) f.flashT -= dt;
    } else if (kind === 'fast') {
      f.cd = (f.cd == null ? 1.0 : f.cd) - dt;
      if (f.dash > 0) { f.dash -= dt; f.x += f.dvx * dt; f.y += f.dvy * dt; f.moving = true; }
      else if (d < 190 && d > 1) {
        f.x += dx / d * K.sp * 0.5 * dt; f.y += dy / d * K.sp * 0.35 * dt; f.moving = true;
        if (f.cd <= 0 && d < 120) { f.cd = 2.0; f.dash = 0.35; f.dvx = dx / d * 190; f.dvy = dy / d * 120; }
      }
    } else if (d < 170 && d > 1) { f.x += dx / d * K.sp * dt; f.y += dy / d * K.sp * 0.7 * dt; f.moving = true; }
    else f.x += Math.sin(G.t * 1.3 + f.seed) * 8 * dt;
    if (kind === 'boss') { f.pt = (f.pt == null ? 2.0 : f.pt) - dt; if (f.pt <= 0) { f.pt = 3.6; bossPattern(f); } }
    f.x += f.vx * dt; f.vx *= Math.pow(0.02, dt);
    f.x = clamp(f.x, 10, A.L - 10); f.y = clamp(f.y, YT, YB);
    if (Math.abs(P.x - f.x) < K.r + 2 && Math.abs(P.y - f.y) < K.r) hurt(f);
  }
  for (const s of G.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.y < YT - 30 || s.y > YB + 10) s.life = 0;
    if (s.life > 0 && Math.abs(s.x - P.x) < 6 && Math.abs(s.y - (P.y - 10)) < 9) { s.life = 0; hurt(s); }
  }
  G.shots = G.shots.filter(s => s.life > 0);
  for (const h of G.hazards) {
    h.t += dt;
    if (h.t > h.warn && h.t < h.warn + h.life) {
      const inside = h.type === 'band' ? Math.abs(P.y - h.y) < h.r : Math.hypot((P.x - h.x) / 1.6, P.y - h.y) < h.r * 0.7;
      if (inside) hurt(h.type === 'band' ? { x: P.x - G.P.face } : h);
    }
  }
  G.hazards = G.hazards.filter(h => h.t < h.warn + h.life);
}

/* ---------------- 입력 ---------------- */
const MOVE = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ShiftLeft: 'run', ShiftRight: 'run' };
const ADV = ['Space', 'Enter', 'NumpadEnter', 'KeyE'];
window.addEventListener('keydown', e => {
  SND.unlock();
  const inInput = e.target && e.target.tagName === 'INPUT';
  if (inInput) { if (e.code === 'Enter') $('nameGo').click(); return; }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (MG.active) return MG.key(e);
  if (Quiz.active) return Quiz.key(e);
  if (G.overlay) return overlayKey(e);
  if (G.mode === 'title') { if (e.code === 'F2') { e.preventDefault(); openDebug(); } return; }
  if (G.mode === 'focus') { skipFocus(); return; }
  if (G.mode === 'script') {
    if (!$('choices').hidden) { const n = parseInt(e.key, 10); const bs = $('choices').querySelectorAll('.choice'); if (n >= 1 && n <= bs.length) bs[n - 1].click(); return; }
    if (e.code === 'Escape') { endTalk(); return; }
    if (e.code === 'ArrowLeft') { histMove(-1); return; }
    if (e.code === 'ArrowRight') { if (!e.repeat) advance(); return; }
    if (ADV.includes(e.code)) { if (!e.repeat) advance(); return; }
    if (e.code === 'KeyM') return openMap();
    if (e.code === 'KeyJ') return openRecs();
    if (e.code === 'KeyL') return openLog();
    return;
  }
  if (G.mode !== 'play') return;
  if (MOVE[e.code]) {
    const dir = MOVE[e.code];
    if (dir !== 'run' && !e.repeat) {
      const now = performance.now();
      if (G.lastDir === dir && now - G.lastDirT < 300) G.dash = true;
      G.lastDir = dir; G.lastDirT = now; G.target = null;
    }
    G.keys[dir] = true; return;
  }
  if (e.code === 'KeyZ') { attack(); return; }
  if (ADV.includes(e.code)) { if (G.near && !e.repeat) interact(G.near); return; }
  if (e.code === 'KeyM') return openMap();
  if (e.code === 'KeyJ') return openRecs();
  if (e.code === 'KeyL') return openLog();
  if (e.code === 'Escape') return openMenu();
  if (e.code === 'F2') { e.preventDefault(); return openDebug(); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') e.preventDefault(); if (MOVE[e.code]) G.keys[MOVE[e.code]] = false; });
window.addEventListener('blur', () => { G.keys = {}; G.dash = false; });

function stagePoint(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * VW, y: (ev.clientY - r.top) / r.height * VH }; }
$('stage').addEventListener('pointerdown', () => SND.unlock());
cv.addEventListener('click', ev => {
  if (G.mode === 'focus') { skipFocus(); return; }
  if (G.mode === 'script') { advance(); return; }
  if (G.mode !== 'play' || G.overlay) return;
  const p = stagePoint(ev), wx = p.x + G.cam;
  let hit = null, best = 1e9;
  for (const e of G.vis) {
    let x0 = e.x - 12, x1 = e.x + 12, y0 = e.y - 36, y1 = e.y + 4;
    if (e.k === 'door') { x0 = e.x - 14; x1 = e.x + 14; y0 = 120; y1 = YT + 6; }
    if (e.k === 'exit') { x0 = e.x - 14; x1 = e.x + 14; y0 = 160; y1 = 205; }
    if (wx >= x0 && wx <= x1 && p.y >= y0 && p.y <= y1) { const d = Math.abs(wx - e.x); if (d < best) { best = d; hit = e; } }
  }
  if (hit) {
    if (inRange(hit)) return interact(hit);
    const ty = hit.k === 'door' ? YT : hit.k === 'exit' ? G.P.y : clamp(hit.y + 8, YT, YB);
    G.target = { x: hit.x - (hit.k === 'npc' || hit.k === 'obj' ? Math.sign(hit.x - G.P.x || 1) * 12 : 0), y: ty, ent: hit };
  } else if (p.y > YT - 30) G.target = { x: clamp(wx, 10, G.area.L - 10), y: clamp(p.y, YT, YB) };
});
$('dlg').addEventListener('click', e => { e.stopPropagation(); if (G.mode === 'script') advance(); });

/* ---------------- 업데이트 ---------------- */
function update(dt) {
  G.t += dt;
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 0.9);
  if (G.shake > 0) G.shake -= dt;
  for (const b of G.bursts) b.t += dt; G.bursts = G.bursts.filter(b => b.t < 0.5);
  if (G.speaker) G.speaker.t += dt;
  if (G.inkFx) { G.inkFx.t += dt; if (S && has('pro_map') && G.foes.length) G.inkFx = null; }
  for (const d of G.dust) d.t += dt; G.dust = G.dust.filter(d => d.t < 0.45);
  if (G.mode === 'title') { G.titleCam = (G.titleCam + dt * 14) % (AREAS.kf_market.L - VW); return; }
  if (!G.area || !S) return;
  S.play += dt;
  if (G.mode === 'focus' && G.focus) { updateFocus(dt); return; }
  const P = G.P, Fo = G.Fo, A = G.area;
  let dx = 0, dy = 0;
  const free = G.mode === 'play' && !G.overlay;
  if (free) {
    if (G.keys.l) dx -= 1; if (G.keys.r) dx += 1; if (G.keys.u) dy -= 1; if (G.keys.d) dy += 1;
    if (!dx && !dy && G.target) {
      const tx = G.target.x - P.x, ty = G.target.y - P.y, d = Math.hypot(tx, ty);
      if (G.target.ent && inRange(G.target.ent)) { const e = G.target.ent; G.target = null; P.moving = false; interact(e); return; }
      if (d < 2) G.target = null; else { dx = tx / d; dy = ty / d; }
    }
    if (!dx && !dy && !G.target) G.dash = false;
  }
  const running = G.dash || G.keys.run;
  if (dx || dy) {
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    let sp = running ? 150 : 90; if (A.horse && has(A.horse)) sp *= 1.45;
    P.x = clamp(P.x + dx * sp * dt, 8, A.L - 8); P.y = clamp(P.y + dy * sp * 0.72 * dt, YT, YB);
    if (Math.abs(dx) > 0.1) P.face = dx > 0 ? 1 : -1;
    P.walk += dt * (running ? 16 : 11); P.moving = true;
    if (running) { G.dustT = (G.dustT || 0) - dt; if (G.dustT <= 0) { G.dustT = 0.07; G.dust.push({ x: P.x - P.face * 5, y: P.y, t: 0 }); } }
  } else P.moving = false;
  const fx = P.x - P.face * 20, fy = clamp(P.y - 6, YT - 4, YB);
  const ddx = fx - Fo.x, ddy = fy - Fo.y, d = Math.hypot(ddx, ddy);
  if (d > 5) { const sp = Math.min(d * 3.4, 220); Fo.x += ddx / d * sp * dt; Fo.y += ddy / d * sp * dt; Fo.moving = true; Fo.walk += dt * 11; if (Math.abs(ddx) > 2) Fo.face = ddx > 0 ? 1 : -1; }
  else { Fo.moving = false; Fo.face = P.face; }
  if (free) updateCombat(dt);
  const camT = clamp(G.camFocus != null ? G.camFocus - VW / 2 : P.x - VW * 0.42, 0, Math.max(0, A.L - VW));
  G.cam += (camT - G.cam) * Math.min(1, dt * (G.camFocus != null ? 3 : 6));
  if (free) {
    let best = null, bd = 1e9;
    for (const e of G.vis) { if (!e.talk && !e.to) continue; if (inRange(e)) { const dd = Math.abs(e.x - P.x); if (dd < bd) { bd = dd; best = e; } } }
    G.near = best; if (best) showPrompt(best); else hidePrompt();
  } else G.near = null;
  G.saveT += dt; if (G.saveT > 4 && G.mode === 'play') { G.saveT = 0; save(); }
}

/* ---------------- 그리기 ---------------- */
function render(dt) {
  ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.imageSmoothingEnabled = false;
  ART.begin(ctx);
  if (G.mode === 'title' || !G.area) {
    const A = AREAS.kf_market;
    ART.bg(A, G.titleCam, G.t);
    for (const e of A.ents) if (e.k === 'npc') ART.person(e.x - G.titleCam, e.y, e.look, { face: e.face || 1, t: G.t, seed: e.x });
    ART.fg(A, G.titleCam, G.t, dt);
    return;
  }
  const z = G.zoom, k = G.zk;
  const cx = 240 + (G.zfx - 240) * k, cy = 135 + (G.zfy - 135) * k;
  const sh = G.shake > 0 ? (Math.random() - 0.5) * 4 : 0;
  // 대화 중에는 장면을 살짝 들어 올려 말하는 인물이 대화창에 가리지 않게 한다
  const liftT = !$('dlg').hidden ? 46 : 0;
  G.lift = (G.lift || 0) + (liftT - (G.lift || 0)) * Math.min(1, dt * 7);
  if (G.lift > 0.5) { ctx.fillStyle = '#120e0b'; ctx.fillRect(0, 0, VW, VH); }
  ctx.setTransform(2 * z, 0, 0, 2 * z, 480 - 2 * z * cx + sh, 270 - 2 * z * cy - 2 * Math.round(G.lift));
  const A = G.area, cam = Math.round(G.cam);
  ART.bg(A, cam, G.t);
  const list = [];
  for (const e of G.vis) list.push({ y: e.y || YT - 1, e });
  for (const f of G.foes) list.push({ y: f.y, f });
  list.push({ y: G.P.y, p: 'me' }); list.push({ y: G.Fo.y, p: 'so' });
  list.sort((a, b) => a.y - b.y);
  // 말하는 사람 찾기 (튀어 오르는 연출 · 감정 표시)
  const spk = G.speaker, talking = spk && G.typing && !G.typing.done;
  const hop = () => talking ? -Math.round(Math.abs(Math.sin(G.t * 11)) * 2) : 0;
  let spkEnt = null;
  if (spk && spk.spk !== 'me' && spk.spk !== 'so' && spk.look) {
    let bd = 1e9; for (const e of G.vis) if (e.k === 'npc' && e.look === spk.look) { const d = Math.abs(e.x - G.P.x); if (d < bd) { bd = d; spkEnt = e; } }
  }
  for (const h of G.hazards) ART.hazard(h.type === 'band' ? 0 : h.x - cam, h.y, h, G.t);
  for (const d of G.dust) { const a = 1 - d.t / 0.45; ctx.fillStyle = `rgba(220,200,160,${0.55 * a})`; ctx.beginPath(); ctx.arc(d.x - cam, d.y - d.t * 8, 1.5 + d.t * 6, 0, Math.PI * 2); ctx.fill(); }
  let emoteAt = null;
  for (const it of list) {
    if (it.p === 'me') {
      if (G.inv > 0 && Math.floor(G.t * 16) % 2) continue;
      const h = spk && spk.spk === 'me' ? hop() : 0;
      ART.person(G.P.x - cam, G.P.y + h, 'me', { face: G.P.face, walk: G.P.walk, moving: G.P.moving, t: G.t, seed: 1 });
      if (spk && spk.spk === 'me') emoteAt = [G.P.x - cam, G.P.y - 34 + h];
      if (G.atk) ART.swoosh(G.P.x - cam, G.P.y, G.P.face, G.atk.t / 0.22);
    } else if (it.p === 'so') {
      const h = spk && spk.spk === 'so' ? hop() : 0;
      ART.person(G.Fo.x - cam, G.Fo.y + h, 'so', { face: G.Fo.face, walk: G.Fo.walk, moving: G.Fo.moving, t: G.t, seed: 2 });
      if (spk && spk.spk === 'so') emoteAt = [G.Fo.x - cam, G.Fo.y - 34 + h];
    }
    else if (it.f) { const f = it.f; if (!f.dead) ART.foe(f.x - cam, f.y, G.t, { hp: f.hp, max: f.max, hit: f.hit, boss: f.e.boss, seed: f.seed, face: f.face, shield: G.mode === 'script' && f.e.boss, kind: kindOf(f), moving: f.moving, flash: f.flashT > 0 }); }
    else {
      const e = it.e, sx = e.x - cam;
      if (sx < -40 || sx > VW + 40) continue;
      if (e.k === 'npc') {
        let face = e.face || 1; if (Math.abs(G.P.x - e.x) < 70) face = G.P.x > e.x ? 1 : -1;
        const idle = Math.sin(G.t * 2.2 + e.x * 0.37) > 0.75 ? -1 : 0;
        const h = e === spkEnt ? hop() : idle;
        ART.person(sx, e.y + h, e.look, { face, t: G.t, seed: e.x, kite: e.kite });
        if (e === spkEnt) emoteAt = [sx, e.y - 34 + h];
      }
      else if (e.k === 'obj') ART.obj(e.draw, sx, e.y, G.t, e.mark && e.mark() === '!', { lit: e.lit && e.lit(), seed: e.x });
      else if (e.k === 'exit') ART.exitSign(sx, e.y, e.dir, G.t);
    }
  }
  for (const b of G.bursts) ART.burst(b.x - cam, b.y, b.t / 0.5);
  if (G.inkFx) drawInkFx(cam);
  for (const s of G.shots) ART.shot(s.x - cam, s.y, s, G.t);
  if (emoteAt && spk.emote && spk.t < 1.6) ART.emote(emoteAt[0], emoteAt[1], spk.emote, spk.t, G.t);
  for (const e of G.vis) {
    const mk = e.mark ? e.mark() : ''; const sx = e.x - cam;
    if (sx < -20 || sx > VW + 20) continue;
    const top = e.k === 'npc' ? e.y - 36 : e.k === 'door' ? 112 : e.k === 'exit' ? 160 : e.y - (e.draw === 'shelf' ? 52 : e.draw === 'board' ? 38 : e.draw === 'tablet' ? 44 : e.draw === 'scroll' ? 36 : 24);
    if (e.k === 'npc') ART.nameTag(sx, e.y - 44, e.name, G.near === e);
    if (G.near === e && G.mode === 'play') ART.keycap(sx, top - (e.k === 'npc' ? 12 : 0) - (mk ? 14 : 0), G.t);
    else if (mk && !liftT) ART.mark(sx, top - (e.k === 'npc' ? 12 : 0), mk, G.t);
  }
  ART.fg(A, cam, G.t, dt);
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  if (!liftT && G.mode === 'play') drawGuideArrows(cam);
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,246,220,${Math.min(1, G.flash * 1.4)})`; ctx.fillRect(0, 0, VW, VH); }
  if (G.inv > 1.1) { ctx.fillStyle = 'rgba(200,40,30,.18)'; ctx.fillRect(0, 0, VW, VH); }
}
/* 화면 밖에 있는 목표(! · ?)의 방향을 화면 왼쪽·오른쪽 끝에 화살표로 알려 준다 */
function drawGuideArrows(cam) {
  const sides = { l: null, r: null };
  for (const e of G.vis) {
    const mk = e.mark ? e.mark() : ''; if (!mk) continue;
    const sx = e.x - cam, side = sx < 4 ? 'l' : sx > VW - 4 ? 'r' : null; if (!side) continue;
    const dist = Math.abs(e.x - G.P.x), cur = sides[side];
    const pri = mk === '!' ? 0 : 1;
    if (!cur || pri < cur.pri || (pri === cur.pri && dist < cur.dist)) sides[side] = { e, mk, dist, pri };
  }
  for (const side of ['l', 'r']) {
    const s = sides[side]; if (!s) continue;
    ART.guide(side === 'l' ? 10 : VW - 10, 150, side === 'l' ? -1 : 1, s.e.name, s.mk, G.t);
  }
}
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try { update(dt); render(dt); } catch (err) { console.error(err); }
  requestAnimationFrame(loop);
}

/* ---------------- 퀴즈 ---------------- */
const Quiz = (() => {
  let active = false, cur = null, cb = null, wrong = 0, solved = false;
  const praise = ['정확해!', '바로 그거야!', '완벽해, 글자가 선명하게 돌아왔어!', '역시! 제대로 이해했구나.', '훌륭해, 지도가 환하게 빛난다!'];
  function open(id, done) {
    const q = QUIZ[id]; cur = id; cb = done; wrong = 0; solved = false; active = true;
    const el = $('quiz'); el.hidden = false;
    const opts = q.opts.slice().sort(() => Math.random() - 0.5);
    const order = C().quiz, idx = order.indexOf(id) + 1;
    el.innerHTML = `<div class="quiz-panel ${S.camp === 'review' ? 'rev' : ''}" role="dialog" aria-label="역사 퀴즈">
      <div class="quiz-top"><span class="quiz-seal">記錄<br>復元</span><div><p class="quiz-eyebrow">${escH(C().title)} · 기록 복원 ${idx} / ${order.length}</p>
      <p class="quiz-line">지워진 기록 — ${escH(q.line).replace('［？］', '<span class="quiz-blank" id="qBlank">？</span>')}</p></div></div>
      <h2 class="quiz-q">${escH(q.q)}</h2>
      <div class="quiz-opts ${opts.some(o => o.length > 14) ? 'long' : ''}">${opts.map((o, i) => `<button class="qopt" data-v="${escH(o)}"><span class="kbd">${i + 1}</span>${escH(o)}</button>`).join('')}</div>
      <div class="quiz-hint" id="qHint" hidden></div>
      <div class="quiz-stamp" id="qStamp" hidden>正解</div><div class="quiz-res" id="qRes" hidden><p class="quiz-praise" id="qPraise"></p><p class="quiz-exp">${escH(q.exp)}</p><button class="btn gold" id="qGo">지도에 새기기 <span class="kbd">Enter</span></button></div>
    </div>`;
    el.querySelectorAll('.qopt').forEach(b => b.onclick = () => pick(b));
    $('qGo').onclick = closeQ; SND.play('open');
  }
  function pick(b) {
    if (solved || b.disabled) return;
    const q = QUIZ[cur];
    if (b.dataset.v === q.a) {
      solved = true; b.classList.add('right'); $('quiz').querySelectorAll('.qopt').forEach(x => x.disabled = true);
      S.quiz[cur] = 1; if (!wrong) S.qfirst++; S.qtries[cur] = wrong + 1; save();
      const qb = $('qBlank'); if (qb) { qb.textContent = q.a.length > 12 ? '✔' : q.a; qb.classList.add('fill'); }
      $('qHint').hidden = true; $('qPraise').textContent = praise[Math.floor(Math.random() * praise.length)] + (wrong ? '' : ' 한 번에 맞혔어!');
      $('qRes').hidden = false; $('qStamp').hidden = false; $('qGo').focus(); SND.play('win');
    } else {
      wrong++; b.classList.add('wrong'); b.disabled = true; SND.play('bad');
      S.wrongs = (S.wrongs || 0) + 1; penalize(5, 1); save();
      const h = $('qHint'); h.hidden = false; h.innerHTML = `<b>소연의 힌트</b> ${escH(q.hint)}<span class="q-pen">−5점 · ♥−1</span>`;
      h.classList.remove('shake'); void h.offsetWidth; h.classList.add('shake');
    }
  }
  function closeQ() { active = false; $('quiz').hidden = true; $('quiz').innerHTML = ''; const f = cb; cb = null; f && f(); }
  return { open, get active() { return active; },
    key(e) {
      if (solved) { if (['Enter', 'Space', 'NumpadEnter'].includes(e.code)) { e.preventDefault(); if (!e.repeat) closeQ(); } return; }
      const n = parseInt(e.key, 10); const bs = $('quiz').querySelectorAll('.qopt'); if (n >= 1 && n <= bs.length) pick(bs[n - 1]);
    } };
})();

/* ---------------- 기록 ---------------- */
function recCardHTML(id, full) {
  const r = REC[id];
  return `<div class="rec-card big"><div class="rec-seal">${r.seal}</div><p class="rec-ch">${escH(r.ch)} · ${escH(r.place)}</p><h3>${escH(r.t)}</h3>
    ${full ? `<p class="rec-note">역사 노트</p><ul>${r.facts.map(f => `<li>${escH(f)}</li>`).join('')}</ul>` : ''}</div>`;
}
function giveRec(id, next) {
  if (S.recs.includes(id)) return next();
  S.recs.push(id); save(); updateHud(); hideDialog();
  const r = REC[id];
  const el = $('recpop'); el.innerHTML = `<div class="rays" aria-hidden="true"></div><div class="recpop-panel slim"><p class="recpop-eyebrow">기록 ${S.recs.length} / ${C().recs.length}</p>
    <div class="rec-card big"><div class="rec-seal">${r.seal}</div><h3>${escH(r.t)}</h3><ul>${r.facts.map(f => `<li>${escH(f)}</li>`).join('')}</ul></div><button class="btn gold" id="recGo">확인</button></div>`;
  el.hidden = false; SND.play('rec'); G.overlay = 'recpop';
  const go = () => { el.hidden = true; el.innerHTML = ''; G.overlay = null; next(); };
  $('recGo').onclick = go; G.recpopClose = go;
}

/* ---------------- 지도 ---------------- */
const SONGMAP = (() => {
  const px = lon => (lon - 100) * 20, py = lat => (45 - lat) * 20;
  const pts = a => a.map(([lo, la]) => `${px(lo).toFixed(0)},${py(la).toFixed(0)}`).join(' ');
  const LAND = [[100, 45], [131, 45], [130.6, 42.4], [129.7, 41], [128.5, 40.5], [127.5, 39.6], [128.2, 38.6], [129.3, 37], [129.5, 36], [129.3, 35.2], [128.5, 34.8], [127.5, 34.6], [126.4, 34.4], [126.5, 35.3], [126.2, 36], [126.6, 37], [126.2, 37.7], [124.8, 38], [125.3, 38.7], [125, 39.5], [124.3, 39.9], [122.3, 39.3], [121.2, 38.8], [121.8, 40.6], [120, 40.2], [119.3, 39.4], [117.8, 38.9], [118.6, 38.1], [119.1, 37.2], [120.7, 37.8], [122.5, 37.3], [121, 36.4], [119.5, 35.2], [120.3, 34.3], [121, 32.6], [121.9, 31.6], [121.9, 30.9], [120.6, 30.3], [121.8, 29.9], [121.9, 29], [121.4, 28], [120.5, 27], [119.6, 26], [118.8, 25], [118, 24.5], [117, 23.6], [116, 22.9], [114.5, 22.4], [113.5, 22.2], [112, 21.7], [110.5, 21.2], [110.2, 20.3], [109.7, 21.5], [108.5, 21.6], [107, 21], [106, 19.8], [105.8, 18.5], [106.8, 16.8], [108.8, 15.3], [108.9, 15], [100, 15]];
  const ISL = [[[121, 25.2], [122, 25], [121.5, 23.5], [120.8, 22], [120.2, 23], [120.6, 24.5]], [[108.7, 19.2], [110, 20.1], [111, 19.6], [110.2, 18.3], [109, 18.5]], [[129.8, 33.5], [130.9, 33.9], [132, 33.2], [131.5, 31.4], [130.3, 31.2], [129.7, 32.6]], [[130.9, 34.1], [131.6, 34.7], [133, 35.6], [135, 35.8], [135, 33.8], [133.5, 34], [132, 34]], [[132.5, 33.9], [134.6, 34.2], [134.7, 33.3], [133, 32.8]]];
  const YELLOW = [[102, 36], [106, 37.5], [110.5, 40.5], [111, 38], [110.5, 35], [113, 34.8], [114.3, 35], [116, 36], [118.8, 37.7]];
  const YANGTZE = [[102, 29], [106.5, 29.5], [110, 31], [112, 30.3], [114.3, 30.6], [117, 30.5], [118.8, 32], [121.8, 31.6]];
  return { px, py, pts, LAND, ISL, YELLOW, YANGTZE };
})();
function northPower() {
  const a = S && S.area;
  if (['kf_street', 'kf_exam'].includes(a)) return '거란 (요)';
  if (['border', 'kf_office', 'kf_market', 'kf_workshop'].includes(a)) return '요 (거란족)';
  if (['border_late', 'port'].includes(a)) return '금 (여진족)';
  if (['linan', 'warehouse2'].includes(a)) return '원 (몽골)';
  return '';
}
function songMapSVG(opts = {}) {
  const { px, py, pts, LAND, ISL, YELLOW, YANGTZE } = SONGMAP;
  const full = opts.full || (S && S.recs.includes('rec9'));
  const routes = [];
  if (full || S.recs.includes('rec5')) routes.push(`<polyline class="route canal" points="${pts([[114.3, 34.8], [116.5, 33.8], [119.4, 32.4], [120.2, 30.3]])}"/>`);
  if (full || S.recs.includes('rec8')) {
    const qz = [118.6, 24.9];
    [[qz, [122.5, 28], [124.5, 34], [126.4, 37.6]], [qz, [124, 28.5], [128, 31.5], [130.4, 33.6]], [qz, [114.5, 21], [111.5, 17.5], [110, 15.2]], [qz, [113, 20.5], [108, 17.6], [101, 15.6]], [[120.2, 30.3], [122.6, 30.4], [124.5, 34], [126.4, 37.6]]]
      .forEach(r => routes.push(`<polyline class="route sea" points="${pts(r)}"/>`));
  }
  const N = CAMPS.song.nodes;
  const nodes = Object.entries(N).map(([k, n]) => nodeSVG(k, n, px(n.lon), py(n.lat), opts.cur, opts.dest, full || visitedNode(k))).join('');
  const np = northPower(), foreign = full || S.recs.includes('rec8');
  return `<svg viewBox="0 30 700 480" class="mapsvg" aria-label="송나라 교역 지도">${mapDefs()}
    <rect y="0" width="700" height="600" class="sea-bg"/><rect width="700" height="600" fill="url(#wv)"/>
    <polygon class="land" points="${pts(LAND)}"/>${ISL.map(i => `<polygon class="land" points="${pts(i)}"/>`).join('')}
    <polyline class="river" points="${pts(YELLOW)}"/><polyline class="river" points="${pts(YANGTZE)}"/>
    <text class="rl" x="${px(108)}" y="${py(38.4)}">황허강</text><text class="rl" x="${px(108.5)}" y="${py(31.4)}">창장강</text>
    <ellipse class="yanyun" cx="${px(117.3)}" cy="${py(40.9)}" rx="46" ry="18"/><text class="yl" x="${px(117.3)}" y="${py(40.9) + 5}">연운 16주</text>
    ${np ? `<text class="np" x="${px(118)}" y="${py(42.4)}">${np}</text>` : ''}${routes.join('')}
    ${foreign ? `<text class="fl" x="${px(127.4)}" y="${py(38.7)}">고려</text><text class="fl" x="${px(131.6)}" y="${py(32.6)}">일본</text><text class="fl" x="${px(111.4)}" y="${py(20.0)}">↙ 동남아시아 · 인도 · 아라비아</text>` : ''}
    ${nodes}<g transform="translate(640,70)" class="rose"><circle r="26"/><path d="M0 -22 L5 0 L0 22 L-5 0Z"/><text y="-30">北</text><text y="40">南</text></g></svg>`;
}
const YMAP = (() => {
  const px = lon => (lon - 5) * 5.2, py = lat => (62 - lat) * 8.7;
  const pts = a => a.map(([lo, la]) => `${px(lo).toFixed(1)},${py(la).toFixed(1)}`).join(' ');
  const EUR = [[5, 62], [140, 62], [140, 46], [135, 43], [131, 42.5], [129.7, 41], [128.5, 40.5], [127.5, 39.6], [128.2, 38.6], [129.3, 37], [129.5, 36], [129.3, 35.2], [128.5, 34.8], [126.4, 34.4], [126.5, 35.3], [126.6, 37], [124.8, 38], [125, 39.5], [124.3, 39.9], [122.3, 39.3], [121.2, 38.8], [121.8, 40.6], [120, 40.2], [117.8, 38.9], [118.6, 38.1], [119.1, 37.2], [122.5, 37.3], [119.5, 35.2], [120.3, 34.3], [121, 32.6], [121.9, 31.6], [120.6, 30.3], [121.9, 29], [120.5, 27], [118.8, 25], [117, 23.6], [114.5, 22.4], [112, 21.7], [110.2, 20.3], [108.5, 21.6], [106, 19.8], [106.8, 16.8], [108.8, 15.3], [109.2, 12.5], [106.5, 10.5], [104.8, 8.6], [103, 10.5], [100.2, 13.4], [100.5, 7], [101.5, 4], [99, 6], [98.5, 8], [98.2, 13], [97.5, 16.5], [94.3, 16], [94, 19.5], [92, 21.5], [89, 21.8], [86.9, 20.7], [85, 19.5], [82.5, 17], [80.3, 15.5], [79.8, 10.3], [77.5, 8.1], [76.3, 9.8], [74.8, 12.9], [73, 17.5], [72.8, 21], [70.2, 22.5], [68.5, 23.7], [66.6, 25.4], [61.6, 25.2], [57.3, 25.8], [56.3, 27.2], [54, 26.6], [51.5, 27.9], [50, 30], [48, 30], [48.5, 28.5], [50, 26], [51.5, 24.5], [54, 24.2], [56.5, 24.4], [58.5, 23.6], [59.8, 22.5], [58.5, 20.5], [55.5, 17.8], [52, 16], [48.7, 14], [45, 12.8], [43.5, 12.7], [42.7, 15.5], [40, 20], [38.5, 23.5], [35, 28], [34.5, 29.5], [32.5, 30], [32, 31.3], [34.5, 31.5], [35.8, 35], [36, 36.8], [33, 36.2], [29, 36.5], [27.2, 37.5], [26.3, 39.5], [26.6, 40.5], [24, 40.5], [23, 39.5], [22.5, 36.5], [21, 38.5], [19.4, 41.8], [16, 43.5], [13.6, 45.6], [12.3, 45.4], [12.6, 44], [14.2, 42.3], [16.1, 41.4], [18.5, 40.2], [17.1, 39], [16.1, 38], [15.6, 38.3], [15.8, 40], [14.2, 40.8], [12.5, 41.7], [10.5, 43], [9.5, 44.3], [8, 43.9], [5, 43.4]];
  const AFR = [[5, 37], [10.2, 37.2], [11, 35.5], [10, 34], [15, 32], [20, 30.8], [20, 32.2], [25, 32], [29, 30.9], [32, 31.3], [32.5, 30], [35, 24], [37.2, 21], [38.5, 18], [41.5, 14.2], [43.2, 12.4], [51, 11.8], [51, 10], [48, 4], [5, 4]];
  const WATER = [[[28, 41.2], [28, 43.5], [30, 45.5], [33, 45.8], [36.5, 45.3], [39.5, 47.2], [41.5, 42], [36, 41.7], [31, 41.1]], [[47, 45.5], [50.5, 46.8], [53, 45], [52.5, 41], [53.5, 37.5], [51, 36.8], [49, 38], [49.5, 40.5], [47.5, 43]]];
  const ISL = [[[129.8, 33.5], [130.9, 33.9], [132, 33.2], [131.5, 31.4], [130.3, 31.2]], [[130.9, 34.1], [133, 35.6], [136, 35.8], [140, 38], [140, 35], [137, 34.4], [133.5, 34]], [[121, 25.2], [122, 25], [121.5, 23.5], [120.8, 22], [120.2, 23]], [[108.7, 19.2], [110, 20.1], [111, 19.6], [110.2, 18.3]], [[79.9, 9.8], [81.9, 7.5], [81, 6], [80, 6.5]], [[95.3, 5.6], [98, 4], [100, 3], [97, 3]]];
  const EMPIRE = [[25, 52], [45, 57], [90, 55], [125, 52], [130, 44], [122, 40], [121, 32], [114, 22], [106, 22], [100, 28], [90, 32], [75, 34], [62, 30], [50, 30], [44, 33], [38, 38], [30, 44]];
  const R = {
    steppe: [[116.4, 39.9], [110, 44], [101, 46.5], [88, 47], [75, 46], [62, 47], [50, 47.5], [40, 48], [30, 47]],
    silk: [[116.4, 39.9], [108.9, 34.3], [103.8, 36], [94.7, 40.1], [80, 41.2], [76, 39.5], [66.9, 39.6], [59, 37], [51.4, 35.7], [44.4, 33.3], [36.3, 33.5], [35.5, 35.5]],
    silkSea: [[35.5, 35.5], [28, 35.2], [20, 36.5], [18.5, 40], [12.3, 45.4]],
    seaA: [[120.2, 30.3], [118.6, 24.9], [113, 18], [109.5, 11], [105, 6.5], [100.5, 4.5]],
    seaB: [[96, 6.5], [88, 8.5], [82, 5.5], [78, 6.8], [74, 12], [67, 20], [60, 22.5], [56.8, 25.3]], seaC: [[67, 17], [56, 13.8], [47, 12.2]],
    canal: [[116.4, 39.9], [117.2, 37], [118, 34.8], [119.4, 32.4], [120.2, 30.3]],
  };
  return { px, py, pts, EUR, AFR, WATER, ISL, EMPIRE, R };
})();
/* 원나라 지도 : 지금 필요한 것만 보이도록 단순하게 (제국 영역 → 육로 → 바닷길 순서로 드러남) */
function yuanMapSVG(opts = {}) {
  const { px, py, pts, R } = YMAP;
  const f = S ? S.flags : {}, all = opts.full || (S && S.camp === 'review');
  const show = { empire: all || f.y1_done, land: all || f.y6_s1 || f.y5_done, sea: all || f.y6_done, west: all || f.y7_yus };
  const L = [];
  if (show.empire) L.push(`<polygon class="empire" points="${pts(YMAP.EMPIRE)}"/><text class="emp" x="${px(80)}" y="${py(56.5)}">몽골 제국</text>`);
  if (show.land) L.push(`<polyline class="route steppe" points="${pts(R.steppe)}"/><polyline class="route silk" points="${pts(R.silk)}"/>`,
    `<text class="rt" x="${px(56)}" y="${py(50.3)}">초원길</text><text class="rt" x="${px(80)}" y="${py(35.6)}">비단길</text>`);
  if (show.land && show.west) L.push(`<polyline class="route silk dot" points="${pts(R.silkSea)}"/>`);
  if (show.sea) L.push(`<polyline class="route sea" points="${pts(R.seaA)}"/><polyline class="route sea" points="${pts(R.seaB)}"/>`,
    `<text class="rt sea" x="${px(74)}" y="${py(13)}">바닷길</text><text class="fl" x="${px(84)}" y="${py(7.5)}">인도양</text>`);
  if (show.west) L.push(`<text class="fl" x="${px(14)}" y="${py(51)}">유럽</text>`);
  const camp = CAMPS.yuan;
  const nodes = Object.entries(camp.nodes).filter(([k]) => {
    if (k === opts.cur || k === opts.dest || all) return true;
    if (k === 'venice') return show.west;
    return visitedY(k);
  }).map(([k, n]) => nodeSVG(k, n, px(n.lon), py(n.lat), opts.cur, opts.dest, true, true)).join('');
  const songR = opts.withSong ? `<polyline class="route canal" points="${pts([[114.3, 34.8], [116.5, 33.8], [119.4, 32.4], [120.2, 30.3]])}"/>` : '';
  return miniMapSVG(L.join('') + songR + nodes + `<g transform="translate(660,60)" class="rose"><circle r="24"/><path d="M0 -20 L5 0 L0 20 L-5 0Z"/><text y="-28">北</text><text y="38">南</text></g>`, '0 0 702 490', 'mapsvg');
}
/* 원나라 지도의 바탕(육지·바다)만 그린 작은 지도 : 미니게임에서도 씀 */
function miniMapSVG(inner, vb = '0 0 702 490', cls = 'minimap') {
  const { pts, EUR, AFR, WATER, ISL } = YMAP;
  return `<svg viewBox="${vb}" class="${cls}" preserveAspectRatio="xMidYMid meet" aria-label="지도">${mapDefs()}
    <rect x="-100" y="-100" width="950" height="750" class="sea-bg"/><rect x="-100" y="-100" width="950" height="750" fill="url(#wv)"/>
    <polygon class="land" points="${pts(EUR)}"/><polygon class="land" points="${pts(AFR)}"/>${ISL.map(i => `<polygon class="land" points="${pts(i)}"/>`).join('')}
    ${WATER.map(w => `<polygon class="sea-in" points="${pts(w)}"/>`).join('')}${inner}</svg>`;
}
function mapDefs() { return `<defs><pattern id="wv" width="24" height="12" patternUnits="userSpaceOnUse"><path d="M0 8 q6 -5 12 0 t12 0" fill="none" stroke="rgba(60,90,100,.18)" stroke-width="1.2"/></pattern></defs>`; }
function nodeSVG(k, n, x, y, cur, dest, known, small) {
  const isCur = k === cur, isDest = k === dest;
  return `<g class="mnode ${isCur ? 'cur' : ''} ${isDest ? 'dest' : ''} ${known ? '' : 'unk'} ${small ? 'sm' : ''}" data-node="${k}" transform="translate(${x.toFixed(0)},${y.toFixed(0)})" ${isDest ? 'tabindex="0" role="button"' : ''}>
    ${isDest ? '<circle class="hit" r="44"/><circle class="aim" r="30"/><circle class="pulse" r="22"/>' : ''}<circle class="dot" r="${isCur || isDest ? 8 : 6}"/>
    <text class="ml" x="12" y="-2">${known ? n.t : '？'}</text>${small ? '' : `<text class="ms" x="12" y="13">${known ? n.s : ''}</text>`}
    ${isCur ? '<text class="here" x="0" y="-15">현재 위치</text>' : ''}${isDest ? '<text class="go" x="0" y="32">▶ 다음 목적지</text>' : ''}</g>`;
}
function visitedNode(k) { const f = S.flags; return k === 'kaifeng' ? !!f.in_kf_street : k === 'border' ? !!f.in_border : k === 'quanzhou' ? !!f.in_port : k === 'linan' ? !!f.in_linan : false; }
function visitedY(k) { const f = S.flags; return { steppe: f.in_y_steppe, camp: f.in_y_camp, dadu: f.in_y_dadu, hangzhou: f.in_y_hangzhou, quanzhou: f.y6_done }[k] ? true : false; }
function openMap() {
  if (S.camp === 'song' && !S.items.map) { toast('아직 지도가 없다. 창고를 더 둘러보자!'); return; }
  const camp = C(), dest = S.pending ? camp.dest[S.pending] : null;
  const cur = camp.areaNode[S.area];
  const svg = camp.map === 'song' ? songMapSVG({ cur, dest: dest && dest.node }) : yuanMapSVG({ cur, dest: dest && dest.node, withSong: camp.map === 'all' });
  const el = $('map'), restored = S.recs.length, tot = camp.recs.length;
  el.innerHTML = `<div class="map-panel" role="dialog" aria-label="교역 지도">
    <header class="map-head"><div><p class="eyebrow">천하상단의 교역 지도 · ${escH(camp.tag)}</p><h2>${camp.map === 'song' ? '송나라 교역 지도' : camp.map === 'yuan' ? '몽골 제국과 원나라의 교역 지도' : '천하상단 교역 지도 (송 · 원)'}</h2></div>
    <div class="map-prog"><span>복원된 기록</span><b>${restored} / ${tot}</b><div class="bar"><i style="width:${restored / tot * 100}%"></i></div></div>
    <button class="x" id="mapX" aria-label="닫기">닫기 <span class="kbd">Esc</span></button></header>
    <div class="map-body">${svg}
      <aside class="map-side">${dest ? `<div class="dest-card"><p class="eyebrow">나침반이 가리키는 곳</p><h3>${camp.nodes[dest.node].t}</h3><p>${dest.era} · ${camp.chapters[dest.ch].n}</p><p class="small">${camp.chapters[dest.ch].t}</p><button class="btn gold" id="mapGo">이동하기 <span class="kbd">Enter</span></button></div>` : `<div class="dest-card idle"><p class="eyebrow">현재 위치</p><h3>${escH(G.area.place)}</h3><p>${escH(G.area.era)}</p><p class="small">${escH(goalText())}</p></div>`}
      <ul class="legend"><li><i class="lg cur"></i>현재 위치</li><li><i class="lg dest"></i>다음 목적지</li><li><i class="lg sea"></i>바닷길</li>${camp.map !== 'song' ? '<li><i class="lg steppe"></i>초원길</li><li><i class="lg silk"></i>비단길</li>' : ''}<li><i class="lg canal"></i>운하</li></ul></aside></div></div>`;
  el.hidden = false; G.overlay = 'map'; SND.play('open'); hidePrompt();
  $('mapX').onclick = closeMap;
  if (dest) {
    $('mapGo').onclick = travel;
    const n = el.querySelector('.mnode.dest');
    // 이동하기 버튼이나 목적지 근처에 마우스를 올리면 지도에서 갈 곳이 크게 표시된다
    const hov = on => n && n.classList.toggle('hov', on);
    $('mapGo').addEventListener('mouseenter', () => hov(true)); $('mapGo').addEventListener('mouseleave', () => hov(false));
    if (n) { n.addEventListener('mouseenter', () => hov(true)); n.addEventListener('mouseleave', () => hov(false)); n.addEventListener('click', travel); n.addEventListener('keydown', e => { if (e.code === 'Enter') travel(); }); }
  }
}
function closeMap() { $('map').hidden = true; $('map').innerHTML = ''; G.overlay = null; if (G.mode === 'play') updateHud(); }
function travel() {
  const d = C().dest[S.pending]; if (!d) return;
  closeMap(); S.pending = null; save(); SND.play('flash'); // 체력은 지역을 옮겨도 그대로 이어진다
  G.mode = 'trans';
  showChapter(d.ch, () => transition(d.area));
}

/* ---------------- 역사 노트 · 로그 · 메뉴 ---------------- */
function openRecs(sel, campId, still) {
  const el = $('recs'); const cid = campId || S.camp;
  const st = cid === S.camp ? S : loadSave(cid); const recs = st ? st.recs : [];
  const camp = CAMPS[cid];
  const id = sel || recs[recs.length - 1] || null;
  const after = !!G.recsAfter;
  el.innerHTML = `<div class="recs-panel ${still ? 'still' : ''}" role="dialog" aria-label="역사 노트"><header class="map-head"><div><p class="eyebrow">역사 노트</p><h2>${escH(camp.title)} · 기록 ${recs.length} / ${camp.recs.length}</h2></div>
    ${after ? '' : `<nav class="recs-tabs">${CAMP_ORDER.map(c => `<button class="rtab ${c === cid ? 'on' : ''}" data-c="${c}">${CAMPS[c].tag}</button>`).join('')}</nav>`}
    <button class="x ${after ? 'gold' : ''}" id="recsX">${after ? '다음' : '닫기'}</button></header>
    <div class="recs-body"><div class="recs-grid">${camp.recs.map(r => {
      const got = recs.includes(r);
      return `<button class="rec-slot ${got ? 'got' : ''} ${r === id ? 'sel' : ''}" data-r="${r}" ${got ? '' : 'disabled'}><span class="rs-seal">${got ? REC[r].seal : '？'}</span><span class="rs-t">${got ? escH(REC[r].t) : '아직 지워진 기록'}</span><span class="rs-c">${escH(REC[r].ch)}</span></button>`;
    }).join('')}</div>
    <div class="recs-detail" id="recsDetail">${id ? recCardHTML(id, true) : '<p class="empty">아직 복원한 기록이 없다.</p>'}</div></div></div>`;
  el.hidden = false; G.overlay = 'recs'; SND.play('page'); hidePrompt();
  $('recsX').onclick = closeOv;
  el.querySelectorAll('.rec-slot.got').forEach(b => b.onclick = () => {
    el.querySelectorAll('.rec-slot').forEach(x => x.classList.toggle('sel', x === b));
    $('recsDetail').innerHTML = recCardHTML(b.dataset.r, true); SND.play('page');
  });
  el.querySelectorAll('.rtab').forEach(b => b.onclick = () => openRecs(null, b.dataset.c, true));
}function openLog() {
  const el = $('logov');
  el.innerHTML = `<div class="log-panel" role="dialog" aria-label="대화 기록"><header class="map-head"><div><p class="eyebrow">L · 대화 기록</p><h2>지나간 대화</h2></div><button class="x" id="logX">닫기 <span class="kbd">Esc</span></button></header>
    <div class="log-body" id="logBody">${G.log.length ? G.log.map(l => `<p>${l.n ? `<b>${escH(l.n)}</b>` : '<i>·</i>'}${escH(l.t)}</p>`).join('') : '<p class="empty">아직 나눈 대화가 없다.</p>'}</div></div>`;
  el.hidden = false; G.overlay = 'log'; hidePrompt();
  $('logX').onclick = closeOv; const b = $('logBody'); b.scrollTop = b.scrollHeight;
}
function openMenu() {
  const el = $('menu');
  el.innerHTML = `<div class="menu-panel menu2" role="dialog" aria-label="메뉴"><h2>메뉴</h2>
    <div class="menu-grid"><button class="btn gold wide" data-a="resume">계속하기</button>
    <button class="btn" data-a="note">역사 노트</button><button class="btn" data-a="log">대화 기록</button>
    <button class="btn" data-a="set">설정</button><button class="btn" data-a="help">조작 방법</button>
    <button class="btn" data-a="camps">챕터 선택</button><button class="btn" data-a="title">타이틀로</button></div>
    <p class="menu-note">자동 저장됨 · ${fmtTime(S.play)} · ${scoreOf(S)}점</p></div>`;
  el.hidden = false; G.overlay = 'menu'; hidePrompt();
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'resume') closeOv();
    if (a === 'note') { closeOv(); openRecs(); }
    if (a === 'set') { closeOv(); openSettings(); }
    if (a === 'log') { closeOv(); openLog(); }
    if (a === 'help') { closeOv(); showHelp(); }
    if (a === 'camps') { save(); closeOv(); toTitle(); openCamps(); }
    if (a === 'title') { save(); closeOv(); toTitle(); }
  });
}
function showHelp() {
  const el = $('menu');
  el.innerHTML = `<div class="menu-panel" role="dialog" aria-label="조작 방법"><h2>조작 방법</h2>
    <dl class="help"><dt><span class="kbd">← → ↑ ↓</span></dt><dd>이동 · 두 번 빠르게 누르면 달리기</dd>
    <dt><span class="kbd">Z</span></dt><dd>공격</dd>
    <dt><span class="kbd">X</span></dt><dd>스킬</dd>
    <dt><span class="kbd">Q</span> · <span class="kbd">C</span></dt><dd>무기 바꾸기 · 약초 탕약 마시기</dd>
    <dt><span class="kbd">Space</span></dt><dd>대화 · 조사 · 대사 넘기기</dd>
    <dt><span class="kbd">Esc</span></dt><dd>메뉴 · 대화 중에는 대화 끝내기</dd>
    <dt><span class="kbd">M</span> · <span class="kbd">J</span></dt><dd>지도 · 역사 노트</dd></dl>
    <div class="menu-btns"><button class="btn gold" id="helpX">확인</button></div></div>`;
  el.hidden = false; G.overlay = 'menu';
  $('helpX').onclick = closeOv;
}function closeOv() { ['recs', 'logov', 'menu'].forEach(id => { $(id).hidden = true; $(id).innerHTML = ''; }); G.overlay = null; if (G.mode === 'play') updateHud(); const af = G.recsAfter; G.recsAfter = null; af && af(); }
function overlayKey(e) {
  const o = G.overlay;
  if (o === 'chap') { if (['Enter', 'Space', 'Escape'].includes(e.code)) G.chapClose && G.chapClose(); return; }
  if (o === 'recpop') { if (['Enter', 'Space', 'NumpadEnter'].includes(e.code) && !e.repeat) G.recpopClose && G.recpopClose(); return; }
  if (o === 'img') { if (['Enter', 'Space', 'NumpadEnter'].includes(e.code) && !e.repeat) G.imgClose && G.imgClose(); return; }
  if (o === 'intro') { if (['Enter', 'Space', 'NumpadEnter'].includes(e.code) && !e.repeat) G.introNext && G.introNext(); return; }
  if (o === 'defeat') { if (['Enter', 'Space', 'NumpadEnter'].includes(e.code) && !e.repeat) G.defeatGo && G.defeatGo(); return; }
  if (o === 'guide') { if (['Enter', 'Space', 'NumpadEnter', 'Escape'].includes(e.code) && !e.repeat) G.guideClose && G.guideClose(); return; }
  if (o === 'map') { if (e.code === 'Escape' || e.code === 'KeyM') closeMap(); else if ((e.code === 'Enter' || e.code === 'NumpadEnter') && S.pending && G.mode !== 'script') travel(); return; }
  if (o === 'ending') { if (['Enter', 'Space'].includes(e.code)) G.endingNext && G.endingNext(); return; }
  if (o === 'theend') { if (['Enter', 'Space', 'NumpadEnter'].includes(e.code) && !e.repeat) G.theendGo && G.theendGo(); return; }
  if (o === 'modal') return;
  if (e.code === 'Escape' || (o === 'recs' && e.code === 'KeyJ') || (o === 'log' && e.code === 'KeyL')) closeOv();
}
const fmtTime = s => { s = Math.floor(s || 0); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분 ${s % 60}초`; };

/* ---------------- 엔딩 · 결과 ---------------- */
function startEnding() {
  const el = $('ending'), camp = C(); G.overlay = 'ending';
  const svg = camp.map === 'song' ? songMapSVG({ full: true }) : yuanMapSVG({ full: true, withSong: true });
  el.innerHTML = `<div class="ending-panel">${svg}<div class="ending-text"><p class="eyebrow">교역 지도 완성 · ${escH(camp.title)}</p>
    <p class="ending-quote">${camp.endQuote}</p><p class="ending-years">${camp.endYears}</p>
    <button class="btn gold" id="endGo">천하상단으로 돌아가기 <span class="kbd">Enter</span></button></div></div>`;
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); SND.play('rec');
  const go = () => { G.endingNext = null; el.hidden = true; el.innerHTML = ''; G.overlay = null; G.flash = 1; SND.play('flash'); transition(camp.endArea, 300, 214); };
  setTimeout(() => { G.endingNext = go; $('endGo').onclick = go; }, 600);
}
function campDone() {
  S.done = true; save();
  const prog = loadProg(), score = scoreOf(S), rank = rankOf(score);
  const prev = prog[S.camp];
  const keepPrev = prev && prev.score > score;
  prog[S.camp] = { done: true, score: keepPrev ? prev.score : score, rank: keepPrev ? prev.rank : rank, time: keepPrev ? (prev.time || (prev.last && prev.last.time)) : S.play, last: { score, rank, qfirst: S.qfirst, deaths: S.deaths, time: S.play } };
  const allDone = CAMP_ORDER.every(c => prog[c] && prog[c].done);
  if (allDone) { const avg = Math.round(CAMP_ORDER.reduce((a, c) => a + prog[c].score, 0) / 3); prog.final = { score: avg, rank: rankOf(avg) }; }
  saveProg(prog);
  // 챕터가 끝나면 먼저 이번 편의 역사 노트를 보여 주고, 노트를 닫으면 클리어 창
  const notes = () => { G.recsAfter = () => showResult(score, rank, prog, allDone); openRecs(null, S.camp); };
  if (S.camp === 'review') showTheEnd(notes); else notes();
}
/* 마지막 편이 끝나면 : 화면이 서서히 검게 변하고 '천하상단 : 사라진 교역 지도 / THE END'. 연출이 끝난 뒤에만 넘어간다 */
function showTheEnd(done) {
  let el = $('theend'); if (!el) { el = document.createElement('div'); el.id = 'theend'; $('stage').appendChild(el); }
  el.innerHTML = `<div class="te-text"><p class="te-title">천하상단 : 사라진 교역 지도</p><p class="te-end">THE END</p></div><p class="te-hint">화면을 누르면 계속</p>`;
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); G.overlay = 'theend';
  setTimeout(() => SND.play('win'), 1500);
  let ready = false; setTimeout(() => { ready = true; el.classList.add('ready'); }, 2700);
  const go = () => { if (!ready) return; ready = false; G.theendGo = null; el.classList.add('out'); setTimeout(() => { el.hidden = true; el.classList.remove('go', 'out', 'ready'); G.overlay = null; done(); }, 500); };  el.onclick = go; G.theendGo = go;
}
function rankSeal(r, big, useImg) {
  const u = useImg && UIART.rank[r]; // 랭크 도장 그림은 챕터 선택창에서만
  return u ? `<img class="rank-img ${big ? 'big' : ''}" src="${u}" alt="${r} 랭크">` : `<span class="rank r${r} ${big ? 'big' : ''}">${r}</span>`;
}
/* 결과창 : 노을 진 강가 배경 위에 '챕터 클리어!' 현수막 · 랭크 · 점수 · 역사 기록 · 오답 · 걸린 시간 */
function showResult(score, rank, prog, allDone) {
  const el = $('credits'), camp = C(); G.overlay = 'modal';
  const i = CAMP_ORDER.indexOf(S.camp), next = CAMP_ORDER[i + 1], U = UIART.res;
  const img = (k, cls = '') => U[k] ? `<img class="rs-img ${cls}" src="${U[k].url}" alt="">` : '';
  const isFinal = S.camp === 'review' || allDone;
  const record = isFinal
    ? `<div class="rs-final">${CAMP_ORDER.map(c => `<span><small>${CAMPS[c].tag}</small>${prog[c] && prog[c].done ? `<b class="rs-letter sm r${prog[c].rank}">${prog[c].rank}</b>` : '<em>—</em>'}</span>`).join('')}<span class="fin"><small>최종</small>${prog.final ? `<b class="rs-letter sm r${prog.final.rank}">${prog.final.rank}</b>` : '<em>—</em>'}</span></div>`
    : `<b class="rs-rec">${S.recs.length} <i>/</i> ${camp.recs.length}</b>`;
  el.innerHTML = `<div class="rs-wrap">
    <div class="rs-banner">${img('banner')}<p class="rs-camp">${escH(camp.tag)} ${escH(camp.title)}</p></div>
    <div class="rs-row"><div class="rs-box rs-rank">${img('rank')}<div class="rs-val"><span class="rs-letter r${rank}">${rank}</span></div></div>
      <div class="rs-box">${img('score')}<div class="rs-val"><b class="rs-num" id="rsScore">0</b><small>점</small></div></div></div>
    <div class="rs-box rs-wide">${img('record')}<div class="rs-val">${record}</div></div>
    <div class="rs-row"><div class="rs-box">${img('wrong')}<div class="rs-val"><b class="rs-num">${S.wrongs || 0}</b><small>개</small></div></div>
      <div class="rs-box">${img('time')}<div class="rs-val"><b class="rs-num sm">${fmtTime(S.play)}</b></div></div></div>
    <div class="rs-row rs-btns">${next ? `<button class="rs-btn" id="resNext" aria-label="다음 챕터로">${img('next')}</button>` : ''}<button class="rs-btn" id="resCamps" aria-label="챕터 선택">${img('camps')}</button></div>
  </div>`;
  el.classList.add('result'); el.hidden = false; SND.play('win');
  // 점수가 0부터 올라가고, 다 오르면 랭크 도장이 쾅
  const sc = $('rsScore'), t0 = performance.now();
  const tick = now => { const k = Math.min(1, (now - t0 - 900) / 900); if (!sc.isConnected) return; sc.textContent = Math.round(score * Math.max(0, k)); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  setTimeout(() => { SND.play('stamp'); G.shake = 0.2; }, 1900);
  const close = () => { el.hidden = true; el.classList.remove('result'); el.innerHTML = ''; G.overlay = null; };
  if (next) $('resNext').onclick = () => { close(); startCamp(next, true); };
  $('resCamps').onclick = () => { close(); toTitle(); openCamps(); };
}
/* ---------------- 타이틀 · 챕터 선택 ---------------- */
function toTitle(msg) {
  G.mode = 'title'; G.area = null; G.focus = null; G.zoom = 1; G.zk = 0; hideDialog(); hidePrompt();
  ['hud', 'goal', 'keyhint', 'hearts', 'focusTag', 'areaBanner'].forEach(id => $(id).hidden = true);
  ['map', 'recs', 'logov', 'menu', 'credits', 'quit', 'ending', 'recpop', 'imgpop', 'camps'].forEach(id => { $(id).hidden = true; });
  G.overlay = null; $('title').hidden = false;
  const prog = loadProg(), any = hasAnyData();
  $('btnCont').disabled = !any;
  $('contInfo').textContent = any ? '' : '저장된 기록 없음';
  $('titleRank').innerHTML = prog.final ? `천하상단 최종 랭크 ${rankSeal(prog.final.rank)}` : '';
  if (msg) toast(msg);
}
/* 챕터 선택 카드의 장면 그림 (게임 그래픽으로 직접 그림) */
const THUMBS = {
  song: { area: 'kf_market', cam: 250, ox: 160, oy: 94, actors: [['me', 300, 200, 1], ['so', 278, 194, 1]] },
  yuan: { area: 'y_steppe', cam: 40, ox: 130, oy: 94, actors: [['me', 250, 200, 1], ['so', 228, 194, 1]] },
  review: { area: 'r_song', cam: 100, ox: 60, oy: 94, actors: [['me', 170, 200, 1], ['so', 148, 194, 1]], foes: [[250, 200], [290, 196]] },
};
function drawThumb(cvs) {
  const T = THUMBS[cvs.dataset.c], A = AREAS[T.area], x = cvs.getContext('2d');
  x.imageSmoothingEnabled = false; x.setTransform(2, 0, 0, 2, -2 * T.ox, -2 * T.oy); ART.begin(x);
  try {
    ART.bg(A, T.cam, 3);
    for (const e of A.ents) {
      const sx = e.x - T.cam; if (sx < -30 || sx > 510) continue;
      if (e.k === 'npc') ART.person(sx, e.y, e.look, { face: e.face || 1, t: 3, seed: e.x });
      else if (e.k === 'obj' && e.draw === 'tablet') ART.obj('tablet', sx, e.y, 3, false, { lit: true });
    }
    for (const [l, ax, ay, f] of T.actors) ART.person(ax, ay, l, { face: f, t: 3 });
    (T.foes || []).forEach(([fx, fy], i) => ART.foe(fx, fy, 3, { hp: 3, max: 3, seed: i, face: -1 }));
    ART.fg(A, T.cam, 3, 0);
  } catch (e) { console.error(e); }
  ART.begin(ctx);
}
/* 챕터 선택 : 배경 그림 위에 챕터 카드 세 장. 앞 편을 클리어해야 다음 편이 열린다 */
const campOpen = (c, prog = loadProg()) => { const i = CAMP_ORDER.indexOf(c); return i === 0 || !!prog.unlockAll || !!(prog[CAMP_ORDER[i - 1]] && prog[CAMP_ORDER[i - 1]].done); };
function openCamps() {
  const el = $('camps'), prog = loadProg(); G.overlay = 'modal';
  const card = (c, i) => {
    const camp = CAMPS[c], sv = loadSave(c), pr = prog[c], open = campOpen(c, prog);
    const best = pr && pr.done ? `${pr.score}점<small>${fmtTime(pr.time || (pr.last && pr.last.time) || 0)}</small>` : '—';
    return `<article class="cc2 ${open ? '' : 'locked'}" style="--d:${i * 0.12}s">
      <div class="cc2-frame"><canvas class="cc2-img" width="480" height="216" data-c="${c}"></canvas></div>
      <p class="cc2-tag">${escH(camp.tag)}</p><h3>${escH(camp.title)}</h3><p class="cc2-sub">${escH(camp.sub)}</p>
      <p class="cc2-blurb">${escH(camp.blurb)}</p>
      <div class="cc2-row"><span class="lab">랭크</span><span class="val">${pr && pr.done ? rankSeal(pr.rank, false, true) : '—'}</span></div>
      <div class="cc2-row"><span class="lab">최고 기록</span><span class="val">${best}</span></div>
      <div class="cc2-btns"><button class="cbtn red" data-new="${c}" ${open ? '' : 'disabled'}>처음부터</button><button class="cbtn brown" data-cont="${c}" ${open && sv && !sv.done ? '' : 'disabled'}>이어하기</button></div>
      ${open ? '' : `<div class="cc2-lock"><span>🔒</span>${escH(CAMPS[CAMP_ORDER[i - 1]].tag)}를 클리어하면 열려요</div>`}</article>`;
  };
  el.innerHTML = `<div class="cs-wrap"><header class="cs-head"><h2>챕터 선택</h2><button class="cs-x" id="campsX" aria-label="닫기">✕</button></header>
    <div class="cs-grid">${CAMP_ORDER.map(card).join('')}</div>
    <footer class="cs-final"><span class="lab">최종 랭크</span><span class="val">${prog.final ? rankSeal(prog.final.rank, false, true) : '—'}</span><span class="lab">평균 점수</span><span class="val">${prog.final ? prog.final.score + '점' : '—'}</span><em>${prog.final ? '' : '세 편을 모두 클리어하면 기록돼요'}</em></footer></div>`;
  el.classList.add('cs'); el.hidden = false; el.querySelectorAll('.cc2-img').forEach(drawThumb); SND.play('open');
  el.querySelectorAll('.cc2.locked').forEach(c => c.onclick = () => SND.play('lock'));
  const close = () => { el.hidden = true; G.overlay = null; };
  $('campsX').onclick = () => { SND.play('close'); close(); };
  // 처음부터 : 그 편의 이야기만 처음부터 (돈 · 무기 · 스킬 · 다른 편 기록은 그대로)
  el.querySelectorAll('[data-new]').forEach(b => b.onclick = () => {
    const c = b.dataset.new, sv = loadSave(c), go = () => { close(); startCamp(c, true); };
    if (sv && !sv.done) confirmBox('돈 · 무기 · 스킬은 그대로 남아요.', go, `${CAMPS[c].title}을 처음부터 할까요?`, '처음부터'); else go();
  });
  el.querySelectorAll('[data-cont]').forEach(b => b.onclick = () => { close(); startCamp(b.dataset.cont, false); });
}function confirmBox(msg, yes, title = '모든 데이터가 초기화됩니다', yesLabel = '초기화하고 시작') {
  $('confTitle').textContent = title; $('confYes').textContent = yesLabel; $('confMsg').textContent = msg; $('confirm').hidden = false;
  $('confYes').onclick = () => { $('confirm').hidden = true; yes(); };
  $('confNo').onclick = () => { $('confirm').hidden = true; };
}
function startCamp(c, fresh) {
  const prog = loadProg();
  const begin = name => {
    prog.name = name; prog.last = c; saveProg(prog);
    let st;
    if (fresh) { try { localStorage.removeItem(SKEY(c)); } catch (e) { } st = newState(c, name); }
    else st = Object.assign(newState(c, name), loadSave(c) || {});
    startGame(st, fresh);
  };
  if (fresh && !prog.name) askName(begin); else begin(prog.name || '진호');
}
function startGame(state, fresh) {
  S = state; G.log = []; KW_SORTED = null;
  $('title').hidden = true; ['hud', 'keyhint', 'hearts'].forEach(id => $(id).hidden = false);
  if (S.hp == null || S.hp <= 0) S.hp = MAXHP;
  if (fresh) {
    G.mode = 'trans';
    const begin = () => showChapter(0, () => { loadArea(S.area, S.x, S.y); G.mode = 'play'; afterEnter(); });
    if (S.camp === 'song' || !loadProg().introSeen) showIntro(begin); else begin();
  }
  else { loadArea(S.area, S.x, S.y); G.mode = 'play'; if (S.pending) openMap(); else afterEnter(); }
}
function askName(cb) {
  const el = $('namebox'); el.hidden = false; G.overlay = 'modal';
  const inp = $('nameIn'); inp.value = '진호'; setTimeout(() => { inp.focus(); inp.select(); }, 30);
  $('nameGo').onclick = () => { const nm = (inp.value || '').trim().slice(0, 8) || '진호'; el.hidden = true; G.overlay = null; cb(nm); };
  $('nameBack').onclick = () => { el.hidden = true; G.overlay = null; };
}
/* 게임 시작 · 처음부터 : 저장된 모든 데이터(세 편의 진행, 랭크, 돈 · 무기 · 스킬)를 지우고 새로 시작 */
function hasAnyData() { const p = loadProg(); return CAMP_ORDER.some(c => loadSave(c)) || !!p.name || !!p.rpg || !!p.unlockAll; }
function wipeAll() {
  try { CAMP_ORDER.forEach(c => localStorage.removeItem(SKEY(c))); localStorage.removeItem(PKEY); } catch (e) { }
  if (window.resetRPG) window.resetRPG();
}
function askReset(go) {
  if (!hasAnyData()) { wipeAll(); return go(); }
  confirmBox('저장된 데이터가 있다면 이어하기를 눌러 주세요.', () => { wipeAll(); toTitle(); go(); });
}
$('btnNew').onclick = () => { SND.unlock(); askReset(() => startCamp('song', true)); };
$('btnCont').onclick = () => { SND.unlock(); if (hasAnyData()) openCamps(); };
$('btnCred').onclick = () => { $('about').hidden = false; G.overlay = 'modal'; };
$('aboutX').onclick = () => { $('about').hidden = true; G.overlay = null; };
$('btnQuit').onclick = () => showQuit();
function showQuit() { G.mode = 'title'; G.area = null; $('title').hidden = true; ['hud', 'goal', 'keyhint', 'hearts'].forEach(id => $(id).hidden = true); hidePrompt(); hideDialog(); $('quit').hidden = false; G.overlay = 'modal'; }
$('quitBack').onclick = () => { $('quit').hidden = true; G.overlay = null; toTitle(); };
const hudOk = () => (G.mode === 'play' || G.mode === 'script') && !G.overlay && !MG.active && !Quiz.active;
$('hudMap').onclick = () => { if (hudOk()) openMap(); };
$('hudRecBtn').onclick = () => { if (hudOk()) openRecs(); };
$('hudMenu').onclick = () => { if (G.mode === 'play' && !G.overlay) openMenu(); };

/* ---------------- 점검 모드 (F2) ---------------- */
function openDebug(campId) {
  const el = $('menu');
  const cid = campId || (S ? S.camp : 'song');
  const tabs = CAMP_ORDER.map(c => `<button class="btn ${c === cid ? 'gold' : ''}" data-tab="${c}">${CAMPS[c].tag}</button>`).join('');
  const camp = CAMPS[cid];
  el.innerHTML = `<div class="menu-panel"><p class="eyebrow">교사용 점검 모드 (F2)</p><h2>장 바로 가기</h2>
    <div class="menu-btns row">${tabs}</div>
    <p class="menu-note">선택한 장 이전의 기록·퀴즈를 완료한 상태로 이동합니다. 해당 편의 저장이 덮어써집니다.</p>
    <div class="menu-btns">${camp.jump.areas.map((a, i) => `<button class="btn" data-j="${i}">${camp.chapters[i] ? camp.chapters[i].n + ' · ' + camp.chapters[i].t : a}</button>`).join('')}<button class="btn" data-j="x">닫기</button></div></div>`;
  el.hidden = false; G.overlay = 'menu';
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => openDebug(b.dataset.tab));
  el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => {
    if (b.dataset.j === 'x') { closeOv(); return; }
    const c = cid, cp = CAMPS[c], k = +b.dataset.j; const prog = loadProg();
    const st = newState(c, prog.name || '진호');
    for (let i = 0; i < k; i++) { (cp.jump.flags[i] || []).forEach(f => st.flags[f] = 1); st.recs.push(...(cp.jump.recs[i] || [])); (cp.jump.quiz[i] || []).forEach(q => st.quiz[q] = 1); (cp.jump.mg[i] || []).forEach(m => st.mg[m] = 1); }
    if (c === 'song' && k > 0) { st.items.map = 1; st.items.compass = 1; }
    st.area = cp.jump.areas[k];
    prog.last = c; saveProg(prog);
    closeOv(); $('title').hidden = true; startGame(st, false);
  });
}

/* ---------------- 시작 ---------------- */
/* 타이틀 그림(로고 + 버튼 3개)을 잘라 각각의 그림으로 쓴다 (원본: img/title.webp, 1218×1291) */
const TITLE_CUTS = { tLogo: [26, 16, 1187, 636], tBtn1: [245, 676, 729, 176], tBtn2: [246, 869, 727, 172], tBtn3: [246, 1057, 727, 172] };
function cutTitle(im) {
  for (const [id, [x, y, w, h]] of Object.entries(TITLE_CUTS)) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(im, x, y, w, h, 0, 0, w, h);
    try { $(id).src = c.toDataURL('image/png'); } catch (e) { $(id).src = 'img/title.webp'; }
  }
}
/* 로딩 : 그림과 글꼴을 모두 불러오면 자동으로 타이틀 화면으로 넘어간다 */
function preload() {
  G.mode = 'loading';
  // 게임에 쓰는 그림을 모두 미리 불러온다 (장면 그림 · 타이틀 · 배경 · 결과창 · 챕터 · 랭크)
  const srcs = [...new Set(Object.values(IMGS).map(v => typeof v === 'string' ? v : v && v.src).filter(Boolean).concat('img/title.webp', 'img/bg_scene.webp', 'img/ui_result.webp', 'img/ui_ranks.webp', 'img/ui_cards.webp'))];
  const total = srcs.length + 2; let done = 0;
  const step = () => { done++; const p = Math.round(done / total * 100); $('loadFill').style.width = p + '%'; $('loadMsg').textContent = `불러오는 중… ${p}%`; };
  const imgs = srcs.map(src => new Promise(res => {
    const im = new Image();
    im.onload = () => (im.decode ? im.decode().catch(() => { }) : Promise.resolve()).then(() => { if (src.endsWith('title.webp')) cutTitle(im); step(); res(); });
    im.onerror = () => { step(); res(); }; im.src = src;
  }));
  const fonts = (document.fonts && document.fonts.load ? Promise.race([document.fonts.load('400 20px "Song Myung"').then(() => document.fonts.ready), new Promise(r => setTimeout(r, 4000))]) : Promise.resolve()).then(step);
  const ui = UIART.load.then(step); // 결과창 · 랭크 조각 자르기까지 끝낸다
  Promise.all([...imgs, fonts, ui]).then(() => setTimeout(() => {
    $('loading').classList.add('out');
    setTimeout(() => { $('loading').hidden = true; toTitle(); autoFull = true; setFull(true, true); }, 450);
  }, 250));
}

/* ---------------- 설정 · 코드 입력 · 자동 넘기기 ---------------- */
const AUTO_KEY = 'cheonha-auto-unlock';
// 코드는 저장하지 않는다 : 새로 열면 항상 코드를 넣지 않은 상태로 시작
try { localStorage.removeItem(AUTO_KEY); } catch (e) { }
let CODE_OK = false;
function autoUnlocked() { return CODE_OK; }
/* 코드로 열리는 두 버튼 : 자동 넘기기(1) · 매우 빠르게(2) */
const AUTO_SHOW = 'cheonha-auto-show', CTRL_KEY = 'cheonha-ctrl';
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
function syncAutoBtn() {
  const hide = !autoUnlocked() || lsGet(AUTO_SHOW, '1') !== '1' || G.mode === 'title' || G.mode === 'loading';
  $('autoBox').hidden = hide; if (hide && G.auto) G.auto = 0;
  $('autoBtn').classList.toggle('on', G.auto === 1); $('fastBtn').classList.toggle('on', G.auto === 2);
}const setAuto = m => { G.auto = G.auto === m ? 0 : m; syncAutoBtn(); if (G.auto && G.typing) { if (!G.typing.done && G.auto === 2) G.typing.end(); else if (G.typing.done) advance(); } };
$('autoBtn').onclick = e => { e.stopPropagation(); setAuto(1); };
$('fastBtn').onclick = e => { e.stopPropagation(); setAuto(2); };

function openSettings() {
  const el = $('menu');
  const fs = () => !!document.fullscreenElement;
  const mode = () => lsGet(CTRL_KEY, 'auto');
  const tg = (id, on) => `<button class="tg ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${on}"><i></i></button>`;
  const setTg = (id, on) => { const b = $(id); if (b) { b.classList.toggle('on', on); b.setAttribute('aria-checked', on); } };
  el.innerHTML = `<div class="set2" role="dialog" aria-label="설정">
    <header><h2>설정</h2><button class="set-x" id="setX" aria-label="닫기">✕</button></header>
    <div class="set-sec">
      <div class="set-row"><span>소리</span>${tg('setSnd', SND.on)}</div>
      <div class="set-row"><span>전체 화면</span>${tg('setFs', fs())}</div>
      <div class="set-row"><span>조작 모드</span><div class="seg" id="setMode">${[['auto', '자동'], ['pc', 'PC'], ['mobile', '모바일']].map(([m, n]) => `<button class="${mode() === m ? 'on' : ''}" data-m="${m}">${n}</button>`).join('')}</div></div>
      ${autoUnlocked() ? `<div class="set-row"><span>자동 넘기기 버튼</span>${tg('setAuto', lsGet(AUTO_SHOW, '1') === '1')}</div>` : ''}
    </div>
    <button class="set-link" id="setHelp"><span>조작 방법</span><b>›</b></button>
    <div class="set-code"><input id="codeIn" autocomplete="off" spellcheck="false" placeholder="코드 입력"><button id="codeGo">확인</button></div>
    <p class="set-msg" id="codeMsg"></p></div>`;
  el.hidden = false; G.overlay = 'menu'; hidePrompt(); SND.play('open');
  $('setSnd').onclick = () => { SND.toggle(); setTg('setSnd', SND.on); SND.play('toggle'); };
  $('setFs').onclick = async () => {
    SND.play('toggle');
    try { if (fs()) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (e) { $('codeMsg').textContent = '이 브라우저에서는 전체 화면을 쓸 수 없어요.'; }
    setTimeout(() => { setTg('setFs', fs()); fit(); }, 200);
  };
  $('setMode').querySelectorAll('button').forEach(b => b.onclick = () => {
    lsSet(CTRL_KEY, b.dataset.m); $('setMode').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); SND.play('toggle');
    if (window.applyCtrlMode) window.applyCtrlMode();
  });
  if ($('setAuto')) $('setAuto').onclick = () => { lsSet(AUTO_SHOW, lsGet(AUTO_SHOW, '1') === '1' ? '0' : '1'); setTg('setAuto', lsGet(AUTO_SHOW, '1') === '1'); SND.play('toggle'); syncAutoBtn(); };
  $('setHelp').onclick = () => { closeOv(); showHelp(); };
  $('setX').onclick = () => { SND.play('close'); closeOv(); };
  const go = () => {
    const v = ($('codeIn').value || '').trim().toLowerCase();
    if (v === 'eastbusan') { CODE_OK = true; lsSet(AUTO_SHOW, '1'); SND.play('win'); syncAutoBtn(); openSettings(); $('codeMsg').textContent = '자동 넘기기 버튼이 생겼어요.'; }
    // 모든 챕터 열기 : 진행 기록에 남겨 두고, 타이틀의 '게임 시작'(전체 초기화)을 누르면 사라진다
    else if (v === 'eastbusan1') { const pr = loadProg(); pr.unlockAll = 1; saveProg(pr); SND.play('win'); $('codeMsg').textContent = '모든 챕터가 열렸어요.'; $('btnCont').disabled = false; $('contInfo').textContent = ''; }
    else { $('codeMsg').textContent = '알 수 없는 코드예요.'; SND.play('bad'); }
  };
  $('codeGo').onclick = go;
  $('codeIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.code === 'Enter' || e.code === 'NumpadEnter') go(); if (e.code === 'Escape') closeOv(); });
}function setFull(on, silent) {
  const el = document.documentElement;
  if (on && !document.fullscreenElement && el.requestFullscreen) return el.requestFullscreen().catch(() => { if (!silent) toast('이 화면에서는 전체 화면을 쓸 수 없어요.'); });
  if (!on && document.fullscreenElement) return document.exitFullscreen().catch(() => { });
}
document.addEventListener('fullscreenchange', () => {
  setTimeout(fit, 100);
  if (document.fullscreenElement) toast('ESC를 누르면 전체 화면이 꺼집니다');
  else toast('설정에서 전체 화면을 켤 수 있어요');
  document.querySelectorAll('.fs-btn').forEach(b => b.classList.toggle('on', !!document.fullscreenElement));
});
// 브라우저는 사용자의 클릭 · 키 입력 없이 전체 화면을 켜지 못해서, 로딩이 끝난 뒤 첫 입력 때 바로 켠다
let autoFull = false;
const tryAutoFull = () => { if (!autoFull || document.fullscreenElement) return; autoFull = false; setFull(true); };
window.addEventListener('pointerdown', tryAutoFull, true);
document.querySelectorAll('.fs-btn').forEach(b => b.onclick = e => { e.stopPropagation(); setFull(!document.fullscreenElement); }); window.addEventListener('keydown', tryAutoFull, true);$('hudSet').onclick = () => { if ((G.mode === 'play' || G.mode === 'script') && !G.overlay && !MG.active && !Quiz.active) openSettings(); };

/* ---------------- 감점 · 패배 ---------------- */
function penalize(pts, hp) {
  S.penalty = (S.penalty || 0) + pts;
  if (hp) { S.hp = Math.max(1, S.hp - hp); updateHearts(); $('hearts').classList.remove('hit'); void $('hearts').offsetWidth; $('hearts').classList.add('hit'); }
  const el = $('penalty');
  el.innerHTML = `<b>−${pts}</b>`;
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
}
function defeat() {
  if (G.mode === 'defeat') return;
  S.deaths = (S.deaths || 0) + 1; S.penalty = (S.penalty || 0) + 10; G.hazards = []; G.shots = []; G.mode = 'defeat'; G.keys = {}; save();
  SND.play('hurt'); setTimeout(() => SND.play('bad'), 300);
  const el = $('defeat');
  el.innerHTML = `<div class="defeat-inner"><p class="df-t">쓰러졌다</p><div class="df-pen">−10</div>
    <button class="btn gold" id="dfGo">다시 일어나기</button></div>`;
  el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); G.overlay = 'defeat';
  const go = () => { if (!G.defeatGo) return; G.defeatGo = null; el.hidden = true; el.innerHTML = ''; G.overlay = null; S.hp = MAXHP; updateHearts(); transition(S.area, null, null); };
  setTimeout(() => { G.defeatGo = go; const b = $('dfGo'); if (b) { b.onclick = go; b.focus(); } }, 1200);
}

/* ---------------- 작은 지도 : 대사 속 장소를 붉은 원으로 표시 ---------------- */
const MM_PLACES = [
  ['연운 16주', 117.3, 40.9], ['카이펑', 114.3, 34.8], ['변경', 114.3, 34.8], ['임안', 120.2, 30.3], ['항저우', 120.2, 30.3], ['취안저우', 118.6, 24.9],
  ['대도', 116.4, 39.9], ['베이징', 116.4, 39.9], ['고려', 127, 37.5], ['일본', 131, 33.5], ['동남아시아', 108, 15.5], ['인도', 78, 15], ['아라비아', 52, 22],
  ['베네치아', 12.3, 45.4], ['중앙아시아', 67, 40], ['초원길', 72, 47], ['비단길', 82, 40], ['초원', 108, 47.5], ['국경', 115.6, 38.9], ['북쪽', 116, 40],
  ['바닷길', 124, 27], ['바다', 124, 27], ['남쪽', 118, 28],
];
function mapHighlight(text, mapType) {
  const proj = mapType === 'song' ? SONGMAP : YMAP;
  const view = mapType === 'song' ? [0, 30, 700, 510] : [0, 0, 702, 490];
  const out = []; const used = [];
  for (const [kw, lon, lat] of MM_PLACES) {
    if (!text.includes(kw) || used.some(u => u.includes(kw))) continue;
    const x = proj.px(lon), y = proj.py(lat);
    if (x < view[0] || x > view[2] || y < view[1] || y > view[3]) continue;
    if (used.some(u => Math.hypot(u.x - x, u.y - y) < 40)) continue; // 가까운 곳은 하나만
    used.push(Object.assign(new String(kw), { x, y }));
    out.push(`<g class="mm-hl" transform="translate(${x.toFixed(0)},${y.toFixed(0)})"><circle class="r1" r="16"/><circle class="r2" r="16"/><text y="-22">${kw}</text></g>`);
    if (out.length >= 3) break;
  }
  return out.join('');
}

/* ---------------- 게임 시작 전 세계관 · 인물 소개 ---------------- */
function showIntro(done) {
  const name = (S && S.name) || '진호';
  const slides = [
    { t: '천하상단', html: `<p class="in-lead">강남에서 이름난 상단, <b>천하상단</b>.</p><p>비단과 차, 도자기를 배에 싣고 강과 바다를 오가며 세상과 장사하는 곳.</p><p>오래된 창고에는 아무도 열어 보지 않은 상자들이 잠들어 있다.</p>` },
    { t: '등장인물', html: `<div class="in-cast">
      <figure><canvas class="in-pt" width="26" height="26" data-look="me"></canvas><figcaption><b>${escH(name)}</b><span>천하상단의 <em>견습</em> 상인</span><small>호기심 많고 행동이 앞서지만, 역사는 잘 모른다. 장부 정리는 더 모른다.</small></figcaption></figure>
      <figure><canvas class="in-pt" width="26" height="26" data-look="so"></canvas><figcaption><b>소연</b><span>천하상단의 <em>견습</em> 상인</span><small>지도와 역사에 밝은 똑똑이. ${escH(name)}와(과) 늘 티격태격한다.</small></figcaption></figure>
      <figure><canvas class="in-pt" width="26" height="26" data-look="boss"></canvas><figcaption><b>대행수</b><span>천하상단을 이끄는 사람</span><small>엄하고 무섭다. 특히 장부 정리에는.</small></figcaption></figure></div>` },
  ];
  let i = 0; const el = $('intro'); G.overlay = 'intro';
  const show = () => {
    const s = slides[i];
    el.innerHTML = `<div class="intro-inner"><p class="in-step">${i + 1} / ${slides.length}</p><h2 class="in-t">${s.t}</h2><div class="in-body">${s.html}</div>
      <div class="in-btns"><button class="t-quit" id="inSkip">건너뛰기</button><button class="btn gold" id="inNext">${i < slides.length - 1 ? '다음' : '모험 시작'} <span class="kbd">Space</span></button></div></div>`;
    el.querySelectorAll('canvas[data-look]').forEach(cv => { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; ART.portrait(x, cv.dataset.look); });
    $('inNext').onclick = next; $('inSkip').onclick = end;
  };
  const next = () => { SND.play('tick'); i++; if (i >= slides.length) end(); else show(); };
  const end = () => {
    if (!G.introNext) return; G.introNext = null;
    const p = loadProg(); p.introSeen = 1; saveProg(p);
    el.classList.add('out'); setTimeout(() => { el.hidden = true; el.classList.remove('out'); el.innerHTML = ''; G.overlay = null; done(); }, 900);
  };
  el.hidden = false; show(); G.introNext = next;
}

$('btnSet').onclick = () => { if (!G.overlay) openSettings(); };

/* 나침반 연출 : 화면 위쪽에 나침반이 떠올라 바늘이 돌다가 방향을 가리킨다 (대화는 그대로 이어짐) */
const COMPASS_DIR = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
function showCompass(dir, spins, done) {
  const el = $('compassFx'); if (!el) return done && done();
  const to = (typeof dir === 'number' ? dir : (COMPASS_DIR[dir] ?? 0)) + 360 * ((spins || 0) + 1);
  el.innerHTML = `<div class="cp-face"><span class="cp-n">北</span><span class="cp-e">東</span><span class="cp-s">南</span><span class="cp-w">西</span><i class="cp-needle"></i><b class="cp-pin"></b></div>`;
  // 바늘이 돌고(dur) → 잠깐 멈춰 보여 주고(0.4초) → 사라진 뒤(0.4초) 다음 대사로 넘어간다
  const dur = 1.4 + (spins || 0) * 0.4;
  el.style.setProperty('--to', to + 'deg'); el.style.setProperty('--dur', dur + 's');
  el.classList.remove('on', 'out'); void el.offsetWidth; el.classList.add('on');
  SND.play('open');
  clearTimeout(G.compassT);
  G.compassT = setTimeout(() => { el.classList.add('out'); G.compassT = setTimeout(() => { el.classList.remove('on', 'out'); done && done(); }, 400); }, (dur + 0.4) * 1000);
}

preload();
UIART.load.then(() => { const p = loadProg(); if (p.final) $('titleRank').innerHTML = `천하상단 최종 랭크 ${rankSeal(p.final.rank)}`; });
requestAnimationFrame(loop);
window.__G = G;
setInterval(syncAutoBtn, 500);
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('contextmenu', e => { if (!(e.target && e.target.tagName === 'INPUT')) e.preventDefault(); });
document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('.btn, .cbtn, .hud-btn, .t-btn, .t-quit, .menu-grid button, .set-link, .rtab, .rec-slot'); if (b && !b.disabled) { SND.unlock(); SND.play('ui'); } }, true);
$('dlgX').onclick = e => { e.stopPropagation(); endTalk(); };
setInterval(() => { $('dlgX').hidden = !(G.npcTalk && G.mode === 'script' && !G.overlay && !Quiz.active && !MG.active); }, 150);
