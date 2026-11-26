'use strict';
/* =========================================================
   art.js : 픽셀 아트 렌더링 — 캐릭터 · 배경 · 소품 · 효과
   내부 해상도 480×270 (화면에는 2배·확대로 그려짐)
   ========================================================= */
const ART = (() => {
  const W = 480, H = 270, BY = 158;
  let c = null;
  const cache = new Map();
  function shade(hex, a) {
    const key = hex + '|' + a; let v = cache.get(key); if (v) return v;
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (a < 0) { r *= 1 + a; g *= 1 + a; b *= 1 + a; } else { r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; }
    v = '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
    cache.set(key, v); return v;
  }
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const glows = [];

  /* ---------------- 캐릭터 외형 ---------------- */
  const BASE = { skin: '#f1c6a0', hair: '#1f1612', trim: '#ead9ae', pants: '#2b2620', hatc: '#2a2a2a' };
  const RAW = {
    me: { robe: '#3d6e8c', trim: '#efdcb0', pants: '#2b2a33', hat: 'band', hatc: '#e0a63a', hair: '#2a1c14' },
    so: { skin: '#f6d2b0', robe: '#c4533c', trim: '#f4e4c4', pants: '#4e2a26', hat: 'twin', hatc: '#e9b44c', fem: 1 },
    elder: { skin: '#e8b68c', hair: '#e6e1d6', robe: '#8b7a5a', trim: '#d8c9a3', pants: '#4a4033', hat: 'topknot', beard: '#f2efe6', cane: 1 },
    yun: { robe: '#3f6e48', hat: 'futou' },
    teaman: { skin: '#e8b68c', robe: '#9a6b3f', hat: 'cap', hatc: '#3a2a20', apron: '#e8dcc4' },
    gateguard: { skin: '#e8b68c', robe: '#8f3a2c', hat: 'helm', hatc: '#6f6a60', armor: 1 },
    kid: { skin: '#f6d0ab', robe: '#d6923a', trim: '#f6e7c8', pants: '#4a3a2a', hat: 'tufts', small: 1 },
    examiner: { skin: '#e8b68c', robe: '#5b3a6e', hat: 'futou', beard: '#2a1c14' },
    ma: { robe: '#d9d2bf', trim: '#7a6a50', pants: '#5a5040', hat: 'scholar', hatc: '#2c2c2c' },
    captain: { skin: '#dca77c', robe: '#7c2f25', trim: '#c9a35a', hat: 'helm', hatc: '#8a857a', armor: 1, beard: '#1c1410' },
    soldier: { skin: '#e3b089', robe: '#5c4a33', trim: '#c9a35a', hat: 'helm', hatc: '#7a756a', armor: 1 },
    ung: { skin: '#e3b089', robe: '#7c2f25', trim: '#c9a35a', hat: 'helm', hatc: '#6f6a60', armor: 1, scar: 1 },
    refugee: { robe: '#8a8070', trim: '#c8bfa8', pants: '#4a4438', hat: 'scarf', hatc: '#7a5a40', fem: 1, bundle: 1 },
    jeong: { robe: '#6a2c5a', hat: 'futou' },
    gosook: { skin: '#e8b68c', robe: '#9b2f2a', hat: 'futou', beard: '#d8d4cc', hair: '#9a948a' },
    clerk: { robe: '#4a5a6a', hat: 'scholar', hatc: '#222', beard: '#3a2a20' },
    petitioner: { skin: '#d9a47a', robe: '#7a6a4a', trim: '#b8a882', pants: '#4a4030', hat: 'topknot' },
    farmer: { skin: '#d9a47a', robe: '#8a7650', trim: '#c8b890', pants: '#4a4030', hat: 'straw', hatc: '#c9a860' },
    baek: { robe: '#3c7a74', hat: 'cap', hatc: '#2a2a2a' },
    habaek: { robe: '#a5772f', hat: 'cap', hatc: '#5a3a20', bag: 1, beard: '#2a1c14' },
    mandu: { robe: '#b85a48', fem: 1, hat: 'scarf', hatc: '#efe4cc', apron: '#f1e6cf' },
    boatman: { skin: '#d39a6e', robe: '#5a6a70', trim: '#a8b0a8', hat: 'straw', hatc: '#b89a58' },
    yang: { robe: '#2f4a6a', hat: 'scholar', hatc: '#1f1f1f', fan: 1, beard: '#2a1c14' },
    hongran: { skin: '#f6d2b0', robe: '#d8607a', trim: '#f8e4ea', pants: '#8a3a4a', fem: 1, hat: 'flower', hatc: '#f6b8c4', sleeveLong: 1 },
    kwak: { robe: '#4a4038', hat: 'band', hatc: '#c8b080', apron: '#2e2a26' },
    bang: { skin: '#e8b68c', hair: '#cfcabe', robe: '#6a5a40', hat: 'topknot', beard: '#e8e4da' },
    wi: { skin: '#dca77c', robe: '#5a3a2a', hat: 'band', hatc: '#8a2a20', apron: '#3a2a20' },
    lim: { robe: '#e2dccb', trim: '#3a4a6a', pants: '#3a4a6a', hat: 'scholar', hatc: '#2a2a2a' },
    shipcap: { skin: '#d39a6e', robe: '#2e4a5e', hat: 'cap', hatc: '#1f2a30', beard: '#1c1410' },
    sailor: { skin: '#c98d62', robe: '#c8b89a', hat: 'band', hatc: '#c8402a', hair: '#bdb7aa', pants: '#5a4a3a' },
    yuk: { robe: '#3f6e48', hat: 'futou' },
    kim: { robe: '#e8e2d0', trim: '#5a7a9a', pants: '#6a7a8a', hat: 'gat', hatc: '#1a1a1a' },
    jp: { robe: '#3a4a7a', trim: '#e8e0c8', pants: '#2a2a3a', hat: 'eboshi', hatc: '#151515' },
    hasan: { skin: '#b8805a', robe: '#f0ece0', trim: '#2a7a8a', pants: '#8a7a5a', hat: 'turban', hatc: '#ffffff', beard: '#2a1c14' },
    seam: { skin: '#b07a52', robe: '#d9a23a', trim: '#2a6a4a', pants: '#6a3a2a', hat: 'wrap', hatc: '#b23a3a' },
    ha: { skin: '#e8b68c', hair: '#d8d2c6', robe: '#6a4a5a', trim: '#e8dcc8', fem: 1, hat: 'bunold' },
    lguard: { skin: '#e3b089', robe: '#7c2f25', trim: '#c9a35a', hat: 'helm', hatc: '#5a5550', armor: 1, beard: '#2a1c14' },
    // 원나라 편
    bat: { skin: '#d9a47a', robe: '#8a3a2a', trim: '#e9c46a', pants: '#3a2a20', hat: 'mongol', hatc: '#5a3a24', bag: 1, beard: '#2a1c14' },
    herd: { skin: '#e8b48a', robe: '#3d7a9a', trim: '#f2d27a', pants: '#3a2a20', hat: 'mongol', hatc: '#b23a2a', fem: 1 },
    melder: { skin: '#d39a6e', hair: '#d8d2c6', robe: '#6a4a7a', trim: '#e9c46a', hat: 'mongol', hatc: '#3a2a20', beard: '#ece6da', cane: 1 },
    mrider: { skin: '#d39a6e', robe: '#5a4a33', trim: '#c9a35a', hat: 'mongol', hatc: '#2a2420', armor: 1 },
    toghon: { skin: '#d9a47a', robe: '#2f4a7a', trim: '#e9c46a', hat: 'yuanhat', hatc: '#2a2a2a', beard: '#2a1c14' },
    semu: { skin: '#c48c62', robe: '#2a6a6a', trim: '#e9c46a', hat: 'turban', hatc: '#f2ece0', beard: '#3a2418' },
    hanli: { robe: '#5a6a5a', hat: 'scholar', hatc: '#222' },
    namin: { robe: '#d8d0bc', trim: '#4a5a7a', pants: '#4a5a7a', hat: 'scholar', hatc: '#2a2a2a', beard: '#2a1c14' },
    cottonm: { robe: '#e8e2d4', trim: '#7a5a3a', hat: 'cap', hatc: '#4a3a2a', apron: '#c8b89a' },
    yfarm: { skin: '#d9a47a', robe: '#6a7a4a', hat: 'straw', hatc: '#c9a860' },
    bookm: { robe: '#4a3a5a', hat: 'scholar', hatc: '#2a2a2a', beard: '#cfcabe', hair: '#cfcabe' },
    actor: { skin: '#f6e0d0', robe: '#c8402a', trim: '#f2d27a', pants: '#3a2a6a', hat: 'flower', hatc: '#e9c46a', sleeveLong: 1 },
    musician: { robe: '#3a6a4a', hat: 'cap', hatc: '#222', fan: 1 },
    postm: { skin: '#d9a47a', robe: '#6a5a3a', trim: '#e9c46a', hat: 'yuanhat', hatc: '#3a2a20' },
    postm2: { skin: '#e3b089', robe: '#4a5a6a', trim: '#e9c46a', hat: 'mongol', hatc: '#3a3a3a', beard: '#2a1c14' },
    canalman: { skin: '#d39a6e', robe: '#5a6a70', hat: 'straw', hatc: '#b89a58' },
    yusuf: { skin: '#b8805a', robe: '#3a5a8a', trim: '#e9c46a', hat: 'turban', hatc: '#e8d8b8', beard: '#2a1c14', bag: 1 },
    monk: { skin: '#d9a47a', hair: '#d9a47a', robe: '#8a2a2a', trim: '#e9b44c', pants: '#6a2020', hat: 'none' },
    priest: { robe: '#2a2a3a', trim: '#e8e0c8', hat: 'cap', hatc: '#1a1a1a', beard: '#6a5a4a', hair: '#6a5a4a' },
    astro: { robe: '#2f4a6a', trim: '#e9c46a', hat: 'yuanhat', hatc: '#1a1a2a', beard: '#2a1c14' },
    marco: { skin: '#f2d0b0', hair: '#6a4a2a', robe: '#6a2a4a', trim: '#e9c46a', pants: '#2a2a3a', hat: 'beret', hatc: '#b23a2a', beard: '#6a4a2a' },
    oldw: { skin: '#e8b68c', hair: '#d8d2c6', robe: '#5a4a5a', trim: '#e8dcc8', fem: 1, hat: 'bunold' },
    youth: { skin: '#e3b089', robe: '#7a6a4a', trim: '#c8b890', pants: '#4a4030', hat: 'band', hatc: '#5a5a5a' },
    ysold: { skin: '#d39a6e', robe: '#3a3a4a', trim: '#c9a35a', hat: 'mongol', hatc: '#2a2a2a', armor: 1 },
    boss: { skin: '#ecc09a', hair: '#bdb7aa', robe: '#3a2a4a', trim: '#e9c46a', fem: 1, hat: 'bunold' },
  };
  const LOOKS = {};
  for (const k in RAW) { const L = Object.assign({}, BASE, RAW[k]); L.sleeve = L.sleeve || shade(L.robe, -0.16); LOOKS[k] = L; }

  function person(x, y, look, o = {}) {
    const L = typeof look === 'string' ? LOOKS[look] : look; if (!L) return;
    x = Math.round(x); y = Math.round(y);
    const f = o.face || 1, t = o.t || 0, mv = !!o.moving, ph = o.walk || 0, seed = o.seed || 0;
    const sm = !!L.small;
    const step = mv ? Math.round(Math.sin(ph) * 1.6) : 0;
    const bob = mv && Math.abs(Math.cos(ph)) > 0.75 ? -1 : 0;
    const lH = sm ? 4 : 5, sH = sm ? 3 : 6, tH = sm ? 5 : 7;
    const top = y - lH - sH - tH - 8 + bob;
    const tTop = top + 8, sTop = tTop + tH, lTop = y - lH;
    if (!o.noShadow) { c.fillStyle = 'rgba(25,15,10,.28)'; c.beginPath(); c.ellipse(x, y, sm ? 5 : 7, 2, 0, 0, Math.PI * 2); c.fill(); }
    const sh = shade(L.pants, -0.45);
    R(x - 3 + step, lTop, 2, lH - 1, L.pants); R(x - 3 + step, y - 1, 3, 1, sh);
    R(x + 1 - step, lTop, 2, lH - 1, L.pants); R(x + 1 - step, y - 1, 3, 1, sh);
    if (L.bundle) R(f > 0 ? x - 9 : x + 4, tTop - 2, 5, 7, '#b8a07a');
    // 뒤쪽 팔
    const aS = mv ? step : 0;
    R(f > 0 ? x - 6 : x + 4, tTop + 1 - aS, 2, tH - 1, shade(L.sleeve, -0.15));
    // 치마(포)
    R(x - 5, sTop, 10, sH, L.robe);
    if (L.fem) R(x - 6, sTop + sH - 2, 12, 2, L.robe);
    R(x - 5, sTop + sH - 1, 10, 1, shade(L.robe, -0.25));
    // 몸통
    if (L.armor) {
      R(x - 4, tTop, 8, tH, '#8d887c');
      for (let yy = tTop + 1; yy < tTop + tH; yy += 2) for (let xx = x - 4 + ((yy - tTop) % 4 === 1 ? 0 : 1); xx < x + 4; xx += 2) R(xx, yy, 1, 1, '#6c675d');
      R(x - 4, tTop, 8, 1, L.robe); R(x - 5, sTop, 10, 2, '#6c675d');
    } else {
      R(x - 4, tTop, 8, tH, L.robe);
      R(x - 3, tTop, 2, 1, L.trim); R(x - 2, tTop + 1, 2, 1, L.trim); R(x - 1, tTop + 2, 2, 1, L.trim); R(x, tTop + 3, 1, 1, L.trim);
      R(x + 1, tTop, 2, 1, L.trim);
    }
    if (L.apron) R(x - 3, tTop + 3, 6, tH - 3 + sH - 1, L.apron);
    R(x - 4, sTop - 1, 8, 1, shade(L.trim, -0.25));
    if (L.bag) R(f > 0 ? x - 7 : x + 4, tTop + 3, 3, 5, '#6a4a2a');
    // 머리
    R(x - 4, top, 8, 8, L.skin);
    R(x - 4, top + 7, 8, 1, shade(L.skin, -0.12));
    R(x - 4, top - 1, 8, 3, L.hair);
    R(f > 0 ? x - 4 : x + 2, top + 2, 2, 3, L.hair);
    if (L.fem) R(f > 0 ? x - 5 : x + 3, top + 1, 2, sm ? 6 : 10, L.hair);
    const blink = ((t + seed * 1.7) % 3.9) < 0.13;
    const ex = f > 0 ? x : x - 3;
    if (blink) { R(ex, top + 5, 1, 1, '#2a1a14'); R(ex + 2, top + 5, 1, 1, '#2a1a14'); }
    else { R(ex, top + 4, 1, 2, '#1d130e'); R(ex + 2, top + 4, 1, 2, '#1d130e'); }
    if (L.beard) { R(x - 3, top + 6, 6, 2, L.beard); R(x - 2, top + 8, 4, 2, L.beard); R(f > 0 ? x : x - 1, top + 6, 2, 1, shade(L.skin, -0.25)); }
    else { R(ex - 1, top + 6, 1, 1, '#ec9f8f'); R(ex + 3, top + 6, 1, 1, '#ec9f8f'); }
    if (L.scar) R(f > 0 ? x - 2 : x + 1, top + 3, 1, 3, '#c07a5a');
    hat(L, x, top, f, t);
    // 앞쪽 팔
    if (L.sleeveLong) {
      const sw = Math.round(Math.sin(t * 3 + seed) * 1.5);
      R(x - 7 + sw, tTop + 1, 2, tH + 4, '#f6e9ef'); R(x + 5 - sw, tTop + 1, 2, tH + 5, '#f6e9ef');
    } else {
      R(f > 0 ? x + 4 : x - 6, tTop + 1 + aS, 2, tH - 1, L.sleeve);
      R(f > 0 ? x + 4 : x - 6, tTop + tH + aS, 2, 1, L.skin);
    }
    if (L.cane) { R(x + 6 * f, top + 12, 1, y - top - 12, '#6a4a2a'); R(x + 6 * f - (f > 0 ? 0 : 1), top + 11, 2, 1, '#6a4a2a'); }
    if (L.fan) { R(f > 0 ? x + 6 : x - 9, tTop + 2, 4, 3, '#e8dcc4'); R(f > 0 ? x + 6 : x - 9, tTop + 5, 4, 1, '#8a6a40'); }
    if (o.kite) { // 연
      const kx = x + 18, ky = top - 22 + Math.round(Math.sin(t * 2) * 2);
      c.strokeStyle = 'rgba(240,230,210,.7)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x + 5, tTop + 3); c.lineTo(kx, ky + 6); c.stroke();
      R(kx - 3, ky, 7, 7, '#c8453a'); R(kx - 1, ky + 2, 3, 3, '#f2d27a'); R(kx, ky + 7, 1, 4, '#c8453a');
    }
  }
  function hat(L, x, top, f, t) {
    const hc = L.hatc, d = '#141414';
    switch (L.hat) {
      case 'band':
        R(x - 1, top - 3, 3, 3, L.hair); R(x - 4, top + 1, 8, 1, hc);
        R(f > 0 ? x - 6 : x + 4, top + 1, 2, 1, hc); R(f > 0 ? x - 7 : x + 6, top + 2 + (Math.sin(t * 5) > 0 ? 1 : 0), 1, 2, hc); break;
      case 'twin':
        R(x - 6, top - 2, 3, 3, L.hair); R(x + 3, top - 2, 3, 3, L.hair);
        R(x - 6, top + 1, 1, 2, hc); R(x + 5, top + 1, 1, 2, hc); R(x - 3, top + 1, 6, 1, L.hair); break;
      case 'topknot':
        R(x - 1, top - 3, 3, 3, L.hair); R(x - 3, top - 2, 7, 1, '#c9a35a'); break;
      case 'futou':
        R(x - 4, top - 3, 8, 4, d); R(x - 3, top - 5, 6, 2, d);
        R(x - 13, top - 2, 9, 1, d); R(x + 4, top - 2, 9, 1, d); R(x - 13, top - 3, 1, 1, d); R(x + 12, top - 3, 1, 1, d); break;
      case 'helm':
        R(x - 5, top - 2, 10, 4, hc); R(x - 5, top + 1, 10, 1, shade(hc, -0.35)); R(x - 1, top - 5, 2, 3, '#c0392b'); R(f > 0 ? x - 5 : x + 3, top + 2, 2, 4, shade(hc, -0.2)); break;
      case 'cap':
        R(x - 4, top - 2, 8, 3, hc); R(x - 1, top - 3, 2, 1, hc); break;
      case 'scholar':
        R(x - 4, top - 3, 8, 4, hc); R(x - 3, top - 4, 6, 1, hc); R(f > 0 ? x - 6 : x + 4, top - 1, 2, 5, hc); break;
      case 'straw':
        for (let i = 0; i < 4; i++) { const w = 4 + i * 4; R(x - w / 2, top - 4 + i, w, 1, i % 2 ? hc : shade(hc, -0.12)); }
        R(x - 9, top, 18, 1, shade(hc, -0.25)); break;
      case 'scarf':
        R(x - 5, top - 2, 10, 4, hc); R(f > 0 ? x - 6 : x + 5, top + 1, 1, 4, hc); break;
      case 'tufts':
        R(x - 3, top - 2, 2, 2, L.hair); R(x + 1, top - 2, 2, 2, L.hair); break;
      case 'flower':
        R(x - 2, top - 3, 4, 3, L.hair); R(x + 2, top - 3, 2, 2, hc); R(x + 3, top - 4, 1, 1, '#fff'); R(x - 4, top - 2, 2, 2, hc); break;
      case 'gat':
        R(x - 3, top - 5, 6, 4, hc); R(x - 8, top - 1, 16, 1, hc); R(x - 3, top - 2, 6, 1, '#3a3a3a'); break;
      case 'eboshi':
        R(x - 2, top - 7, 5, 7, hc); R(x - 3, top - 1, 7, 1, hc); R(x + 2, top - 8, 1, 1, hc); break;
      case 'turban':
        R(x - 5, top - 3, 10, 5, hc); R(x - 4, top - 1, 8, 1, '#dcd6c8'); R(x - 2, top - 4, 4, 1, hc); break;
      case 'wrap':
        R(x - 5, top - 2, 10, 3, hc); R(f > 0 ? x - 7 : x + 5, top - 1, 2, 3, hc); break;
      case 'bunold':
        R(x - 2, top - 3, 4, 3, L.hair); R(x - 4, top - 2, 8, 1, '#9a7a4a'); break;
      case 'mongol':
        R(x - 4, top - 3, 8, 4, hc); R(x - 2, top - 5, 4, 2, hc); R(x - 1, top - 6, 2, 1, '#c8352a');
        R(x - 5, top, 10, 2, '#d8c8a8'); R(f > 0 ? x - 6 : x + 4, top + 1, 2, 5, '#d8c8a8'); break;
      case 'yuanhat':
        R(x - 7, top - 1, 14, 1, hc); R(x - 3, top - 4, 6, 3, hc); R(x - 1, top - 6, 2, 2, '#c9a35a'); break;
      case 'beret':
        R(x - 5, top - 2, 10, 3, hc); R(x - 3, top - 3, 6, 1, hc); R(x + 3, top - 4, 1, 2, '#f2efe6'); break;
      case 'none':
        break;
    }
  }
  function portrait(pc, look) {
    const prev = c; c = pc;
    pc.clearRect(0, 0, 26, 26);
    const L = LOOKS[look]; if (L) person(13, L.small ? 30 : 35, L, { face: 1, t: 0.5, noShadow: true });
    c = prev;
  }
  function mark(x, y, kind, t) {
    const b = Math.round(Math.sin(t * 4) * 1.5); y = Math.round(y + b); x = Math.round(x);
    const bg = kind === '!' ? '#f2c14e' : '#9fd8c8';
    R(x - 4, y - 11, 9, 11, '#2a1a12'); R(x - 3, y - 10, 7, 9, bg);
    if (kind === '!') { R(x, y - 9, 1, 5, '#2a1a12'); R(x, y - 3, 1, 1, '#2a1a12'); }
    else { R(x - 1, y - 9, 3, 1, '#2a1a12'); R(x + 1, y - 8, 1, 2, '#2a1a12'); R(x, y - 6, 1, 1, '#2a1a12'); R(x, y - 3, 1, 1, '#2a1a12'); }
    R(x - 1, y, 3, 1, '#2a1a12'); R(x, y + 1, 1, 1, '#2a1a12');
  }
  function keycap(x, y, t) {
    x = Math.round(x); y = Math.round(y + Math.sin(t * 6) * 0.8);
    R(x - 5, y - 9, 11, 9, '#2a1a12'); R(x - 4, y - 8, 9, 7, '#f6ecd4');
    c.fillStyle = '#2a1a12'; c.font = 'bold 7px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('E', x + 0.5, y - 4.2);
  }

  /* ---------------- 소품 ---------------- */
  function lantern(x, y, t, col = '#c8352a') {
    R(x, y, 1, 2, '#3a2a1a'); R(x - 2, y + 2, 5, 6, col); R(x - 1, y + 3, 1, 4, shade(col, 0.25));
    R(x - 2, y + 2, 5, 1, '#e9b44c'); R(x - 2, y + 7, 5, 1, '#e9b44c'); R(x, y + 8, 1, 2, '#e9b44c');
    glows.push([x + 0.5, y + 5, 22]);
  }
  function roof(x, y, w, col, over = 8, rows = 10) {
    for (let i = 0; i < rows; i++) {
      const inset = i * 1.3, rx = x - over + inset, rw = w + over * 2 - inset * 2;
      R(rx, y - 1 - i, rw, 1, i % 2 ? col : shade(col, -0.08));
      for (let tx = Math.ceil(rx) + 1; tx < rx + rw - 1; tx += 4) R(tx, y - 1 - i, 1, 1, shade(col, -0.25));
    }
    R(x - over + rows * 1.3 - 2, y - rows - 2, w + over * 2 - rows * 2.6 + 4, 3, shade(col, -0.3));
    R(x - over + rows * 1.3 - 3, y - rows - 5, 3, 3, shade(col, -0.3)); R(x + w + over - rows * 1.3, y - rows - 5, 3, 3, shade(col, -0.3));
    R(x - over - 2, y - 3, 3, 2, col); R(x - over - 3, y - 5, 2, 2, col);
    R(x + w + over - 1, y - 3, 3, 2, col); R(x + w + over + 1, y - 5, 2, 2, col);
    R(x, y, w, 2, 'rgba(0,0,0,.22)');
  }
  function sign(cx, y, text) {
    c.font = 'bold 9px "Song Myung", "Noto Serif KR", serif';
    const sw = Math.max(18, text.length * 10 + 6);
    R(cx - sw / 2, y, sw, 12, '#e9c46a'); R(cx - sw / 2 + 1, y + 1, sw - 2, 10, '#2a1a12');
    c.fillStyle = '#efcf7a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cx, y + 6.5);
  }
  function house(sx, p, t) {
    const b = p.base || BY, w = p.w, h = p.h || 46;
    const wall = p.wall || '#e8d8b8', wood = p.wood || '#6b4a33', pil = p.pillar || '#a8402e', rc = p.roof || '#4a5560';
    if (p.floors === 2) house(sx + 10, { w: w - 20, h: Math.round(h * 0.55), base: b - h - 6, wall, roof: rc, pillar: pil, win: 1, lant: 0 }, t);
    R(sx, b - h, w, h, wall);
    R(sx, b - 9, w, 9, shade(wood, 0.08)); R(sx, b - 9, w, 1, shade(wood, -0.2));
    const dw = p.gate ? 22 : 14, dh = p.gate ? 28 : 22, dx = sx + w / 2 - dw / 2;
    const ww = p.door ? Math.min(24, (w - dw) / 2 - 10) : Math.min(40, w - 16);
    const wy = b - h + 10, wh = Math.max(8, h - 26);
    const wins = p.door ? [sx + 7, sx + w - 7 - ww] : [sx + w / 2 - ww / 2];
    for (const wx of wins) {
      if (ww < 6) continue;
      R(wx, wy, ww, wh, '#4a3424'); R(wx + 1, wy + 1, ww - 2, wh - 2, '#d9c08e');
      for (let gx = wx + 3; gx < wx + ww - 1; gx += 3) R(gx, wy + 1, 1, wh - 2, '#6b4a33');
      for (let gy = wy + 3; gy < wy + wh - 1; gy += 3) R(wx + 1, gy, ww - 2, 1, '#6b4a33');
    }
    if (p.door) {
      R(dx - 1, b - dh - 1, dw + 2, dh + 1, '#2a1a12'); R(dx, b - dh, dw, dh, p.gate ? '#9a2f24' : '#5a3a26');
      R(dx + dw / 2, b - dh, 1, dh, '#2a1a12');
      if (p.gate) for (let yy = b - dh + 4; yy < b - 2; yy += 5) for (let xx = dx + 3; xx < dx + dw - 2; xx += 4) R(xx, yy, 1, 1, '#e9c46a');
    }
    R(sx + 1, b - h, 3, h, pil); R(sx + w - 4, b - h, 3, h, pil);
    if (p.door && w > 90) { R(dx - 5, b - h, 3, h, pil); R(dx + dw + 2, b - h, 3, h, pil); }
    roof(sx, b - h, w, rc, p.gate ? 10 : 8, p.gate ? 12 : 10);
    if (p.sign) sign(sx + w / 2, b - h + 3, p.sign);
    if (p.lant) { lantern(sx - 3, b - h + 1, t); lantern(sx + w + 2, b - h + 1, t); }
  }
  function willow(sx, b, t) {
    R(sx - 2, b - 44, 4, 44, '#5a4632'); R(sx - 1, b - 44, 1, 44, '#6e5840');
    R(sx - 4, b - 46, 8, 3, '#5a4632');
    for (let i = 0; i < 6; i++) R(sx - 18 + i * 6, b - 54 + (i % 2) * 2, 8, 6, i % 2 ? '#6f9a52' : '#5e8a46');
    for (let k = 0; k < 18; k++) {
      const ox = -18 + k * 2.2, len = 22 + ((k * 7) % 12), sway = Math.sin(t * 1.4 + k * 0.7) * 1.6;
      for (let j = 0; j < len; j += 2) R(sx + ox + sway * (j / len), b - 50 + j, 1, 2, (k + j) % 4 === 0 ? '#86b464' : '#6c9a4e');
    }
  }
  function pine(sx, b, col = '#3e5a3e') {
    R(sx - 1, b - 10, 3, 10, '#4a3a2a');
    for (let i = 0; i < 4; i++) { const w = 18 - i * 4; R(sx - w / 2, b - 10 - i * 7, w, 7, i % 2 ? col : shade(col, 0.08)); }
  }
  function stall(sx, p, t) {
    const b = p.base || 176, w = p.w || 50, wood = '#6b4a33';
    R(sx, b - 30, 2, 30, wood); R(sx + w - 2, b - 30, 2, 30, wood);
    const c1 = p.c1 || '#c8553d', c2 = p.c2 || '#efe2c4';
    for (let i = 0, k = 0; i < w + 6; i += 6, k++) { R(sx - 3 + i, b - 36, 6, 7, k % 2 ? c2 : c1); R(sx - 3 + i + 1, b - 29, 4, 1, k % 2 ? c2 : c1); }
    R(sx - 3, b - 37, w + 6, 1, shade(c1, -0.3));
    R(sx, b - 11, w, 11, '#7a5338'); R(sx - 1, b - 12, w + 2, 2, '#9a6b45');
    const g = p.goods;
    for (let i = 0; i < Math.floor((w - 4) / 8); i++) {
      const gx = sx + 3 + i * 8, gy = b - 16;
      if (g === 'pots') { R(gx, gy + 1, 6, 4, '#8fb8a8'); R(gx + 1, gy, 4, 1, '#a9cfc0'); R(gx + 1, gy + 1, 1, 2, '#c9e4da'); }
      else if (g === 'silk') { R(gx, gy - 1, 6, 5, ['#c8453a', '#3d6e8c', '#e0a63a', '#7a3b6a'][i % 4]); R(gx, gy, 6, 1, 'rgba(255,255,255,.3)'); }
      else if (g === 'buns') { R(gx, gy + 2, 6, 3, '#f4ecdc'); R(gx + 1, gy + 1, 4, 1, '#fbf6ea'); }
      else if (g === 'rice') { R(gx - 1, gy - 2, 8, 7, '#d8c49a'); R(gx, gy - 3, 6, 1, '#c2ad82'); R(gx + 2, gy, 3, 1, '#a8925f'); }
    }
    if (p.steam) for (let k = 0; k < 3; k++) { const yy = (t * 8 + k * 6) % 18; c.fillStyle = `rgba(255,255,255,${0.35 - yy / 60})`; c.fillRect(sx + 8 + k * 12 + Math.sin(t * 2 + k) * 2, b - 18 - yy, 3, 3); }
  }
  function crates(sx, n = 2, b = 174) {
    for (let i = 0; i < n; i++) {
      const x = sx + (i % 2) * 15 + (i > 1 ? 7 : 0), y = b - 12 - (i > 1 ? 12 : 0);
      R(x, y, 14, 12, '#9a7448'); R(x, y, 14, 1, '#b48a58'); R(x, y + 11, 14, 1, '#6b4a33');
      R(x + 1, y + 5, 12, 1, '#7a5636'); R(x + 6, y + 1, 1, 10, '#7a5636');
    }
  }
  function sacks(sx, b = 174) { for (let i = 0; i < 3; i++) { R(sx + i * 9, b - 9, 9, 9, '#cdb88a'); R(sx + i * 9 + 3, b - 11, 3, 2, '#b8a272'); R(sx + i * 9, b - 9, 9, 1, '#e0cfa4'); } }
  function barrels(sx, b = 174) { for (let i = 0; i < 2; i++) { R(sx + i * 12, b - 14, 10, 14, '#7a5134'); R(sx + i * 12, b - 11, 10, 1, '#3a2a1a'); R(sx + i * 12, b - 4, 10, 1, '#3a2a1a'); R(sx + i * 12 + 2, b - 14, 1, 14, '#8e6240'); } }
  function cart(sx, p, b = 178) {
    R(sx, b - 17, 40, 9, '#7a5134'); R(sx, b - 17, 40, 1, '#9a6b45'); R(sx + 40, b - 13, 14, 1, '#5a3a24');
    if (p.load === 'silk') {
      const cols = ['#c8453a', '#e0a63a', '#3d6e8c', '#efe2c4', '#7a3b6a', '#c8453a'];
      for (let i = 0; i < 6; i++) R(sx + 2 + i * 6, b - 25, 5, 8, cols[i]);
      R(sx + 4, b - 31, 10, 6, '#c9ccd0'); R(sx + 18, b - 31, 10, 6, '#c9ccd0'); R(sx + 4, b - 31, 10, 1, '#eef0f2'); R(sx + 18, b - 31, 10, 1, '#eef0f2');
    } else if (p.load === 'bundles') {
      for (let i = 0; i < 5; i++) R(sx + 2 + i * 7, b - 24 - (i % 2) * 3, 7, 8 + (i % 2) * 3, ['#b8a07a', '#8a7a5a', '#a88a6a'][i % 3]);
    }
    for (const wx of [sx + 7, sx + 31]) {
      c.fillStyle = '#4a3020'; c.beginPath(); c.arc(wx, b - 6, 6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8a6040'; c.beginPath(); c.arc(wx, b - 6, 4, 0, Math.PI * 2); c.fill();
      R(wx - 4, b - 6, 9, 1, '#4a3020'); R(wx, b - 10, 1, 9, '#4a3020');
    }
  }
  function horse(sx, b, t, col = '#8a5a3a') {
    const chew = Math.sin(t * 6) > 0 ? 1 : 0;
    R(sx, b - 20, 24, 9, col); R(sx + 2, b - 21, 20, 1, shade(col, 0.1));
    for (const lx of [sx + 2, sx + 6, sx + 17, sx + 21]) { R(lx, b - 11, 2, 11, shade(col, -0.15)); R(lx, b - 1, 2, 1, '#2a1a12'); }
    R(sx + 20, b - 28, 5, 10, col); R(sx + 22, b - 31 + chew, 9, 5, col); R(sx + 29, b - 29 + chew, 2, 2, '#2a1a12');
    R(sx + 19, b - 30, 2, 10, '#3a2a1a'); R(sx - 3, b - 20, 3, 9, '#3a2a1a');
    R(sx + 26, b - 30 + chew, 1, 1, '#1a1a1a');
  }
  function camel(sx, b, t) {
    const col = '#c9a46a';
    R(sx, b - 24, 30, 10, col); R(sx + 5, b - 30, 8, 6, col); R(sx + 17, b - 30, 8, 6, col);
    for (const lx of [sx + 3, sx + 8, sx + 21, sx + 26]) R(lx, b - 14, 2, 14, shade(col, -0.15));
    R(sx + 28, b - 34, 4, 14, col); R(sx + 29, b - 38, 8, 5, col); R(sx + 34, b - 37, 1, 1, '#2a1a12');
    R(sx + 4, b - 32, 20, 3, '#a8453a'); R(sx + 6, b - 28, 6, 8, '#3d6e8c');
  }
  function tent(sx, p, b = 166) {
    const w = p.big ? 60 : 40, h = p.big ? 30 : 24, col = p.torn ? '#8a7a64' : '#d8cdb2';
    for (let i = 0; i < h; i++) { const ww = (i / h) * w; R(sx + w / 2 - ww / 2, b - h + i, ww, 1, i % 4 === 0 ? shade(col, -0.1) : col); }
    R(sx + w / 2 - 1, b - h - 4, 2, 5, '#5a4a3a');
    for (let i = 0; i < h * 0.6; i++) { const ww = (i / (h * 0.6)) * (w * 0.3); R(sx + w / 2 - ww / 2, b - h * 0.6 + i, ww, 1, '#3a2a20'); }
    if (p.torn) { R(sx + 6, b - 8, 6, 3, '#3a2a20'); R(sx + w - 12, b - 12, 5, 4, '#3a2a20'); }
  }
  function watchtower(sx, p, b = 160, t = 0) {
    const wood = p.broken ? '#4a3626' : '#6b4a33';
    R(sx, b - 64, 3, 64, wood); R(sx + 22, b - 64, 3, 64, wood);
    for (let y = b - 60; y < b - 6; y += 14) { for (let i = 0; i < 22; i++) R(sx + 2 + i, y + Math.round(i * 0.55), 1, 1, wood); }
    R(sx - 4, b - 72, 33, 9, wood); R(sx - 4, b - 72, 33, 1, shade(wood, 0.2));
    if (!p.broken) {
      R(sx - 2, b - 84, 29, 12, '#8a6a48'); for (let x = sx; x < sx + 26; x += 5) R(x, b - 84, 2, 12, '#6b4a33');
      roof(sx - 2, b - 84, 29, '#4a4a48', 4, 6);
      R(sx + 12, b - 100, 1, 10, '#3a2a1a'); R(sx + 13, b - 100, 8, 5, '#b23a2a');
    } else {
      R(sx - 2, b - 80, 14, 8, '#4a3626'); R(sx + 14, b - 78, 10, 3, '#3a2a1a');
    }
  }
  function earthwall(sx, p, b = 160) {
    const col = p.broken ? '#7a6248' : '#9c7c52';
    R(sx, b - 34, p.w, 34, col); R(sx, b - 34, p.w, 2, shade(col, 0.18)); R(sx, b - 3, p.w, 3, shade(col, -0.25));
    for (let y = b - 30; y < b; y += 7) R(sx, y, p.w, 1, shade(col, -0.12));
    for (let x = sx; x < sx + p.w; x += 10) { if (p.broken && hash(x) < 0.3) continue; R(x, b - 40, 6, 6, col); }
    if (p.broken) for (let x = sx + 40; x < sx + p.w; x += 130) { R(x, b - 34, 18, 14, '#5a4a3a'); R(x + 2, b - 20, 14, 2, '#6a5a48'); }
  }
  function banner(sx, b, p, t) {
    R(sx, b - 56, 1, 56, '#4a3020'); R(sx - 1, b - 57, 3, 2, '#c9a35a');
    const col = p.col || '#b23a2a';
    for (let i = 0; i < 16; i++) { const wv = Math.round(Math.sin(t * 3 + i * 0.4) * 1); R(sx + 1 + i, b - 54 + wv, 1, p.torn && i > 10 ? 10 : 18, i % 5 === 4 ? shade(col, -0.15) : col); }
    if (p.ch) { c.fillStyle = '#f3d98a'; c.font = 'bold 10px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.ch, sx + 9, b - 45); }
  }
  function smoke(sx, b, t) {
    for (let k = 0; k < 7; k++) {
      const ph = (t * 10 + k * 13) % 90, y = b - 20 - ph, r = 4 + ph / 9, a = 0.32 * (1 - ph / 90);
      c.fillStyle = `rgba(60,50,52,${a})`; c.beginPath(); c.arc(sx + Math.sin(t + k) * 3 + ph * 0.25, y, r, 0, Math.PI * 2); c.fill();
    }
  }
  function stableProp(sx, b, t) {
    R(sx, b - 40, 70, 4, '#5a4632'); R(sx, b - 40, 2, 40, '#5a4632'); R(sx + 68, b - 40, 2, 40, '#5a4632');
    R(sx - 4, b - 44, 78, 4, '#8a7a5a');
    for (let i = 0; i < 70; i += 3) R(sx + i, b - 44, 1, 4, '#a8946a');
    R(sx, b - 14, 70, 2, '#6b4a33'); R(sx, b - 8, 70, 2, '#6b4a33');
    horse(sx + 8, b + 4, t, '#7a4a2a'); horse(sx + 40, b + 4, t + 1.3, '#3a2a20');
  }
  function bridge(sx, p, t) {
    const w = p.w || 160, b = 156;
    for (let i = 0; i <= w; i++) {
      const yy = b - Math.sin(Math.PI * i / w) * 34;
      R(sx + i, yy - 4, 1, 5, '#7a5134');
      R(sx + i, yy - 10, 1, 1, '#5a3a24');
      if (i % 9 === 0) R(sx + i, yy - 10, 1, 6, '#5a3a24');
      for (let k = 1; k <= 3; k++) { const by = yy + 2 + k * 5; if (by < b) R(sx + i, by, 1, 1, '#5a3a24'); }
      if (i % 6 === 0) { for (let yb = yy + 1; yb < b; yb += 1) if ((yb + i) % 6 === 0) R(sx + i, yb, 1, 1, '#4a3020'); }
    }
    // 다리 위 사람들
    const pp = [[0.25, '#3d6e8c'], [0.45, '#c8553d'], [0.6, '#e0a63a'], [0.78, '#5a6a70']];
    for (const [f, col] of pp) {
      const ox = ((f + t * 0.01) % 1) * w, yy = b - Math.sin(Math.PI * ox / w) * 34;
      R(sx + ox - 1, yy - 12, 3, 6, col); R(sx + ox - 1, yy - 14, 3, 2, '#f1c6a0');
    }
  }
  function boat(sx, p, t) {
    const y = 150 + Math.round(Math.sin(t * 1.5 + sx) * 0.6), dir = p.s ? -1 : 1;
    R(sx, y, 44, 4, '#5a3a24'); R(sx + 2, y + 4, 40, 2, '#4a3020');
    R(dir > 0 ? sx + 44 : sx - 4, y - 2, 4, 4, '#5a3a24'); R(dir > 0 ? sx - 2 : sx + 44, y - 1, 2, 3, '#5a3a24');
    R(sx + 12, y - 9, 20, 9, '#8a6a44'); R(sx + 10, y - 11, 24, 2, '#3a2a1a'); R(sx + 14, y - 7, 4, 4, '#d9c08e'); R(sx + 24, y - 7, 4, 4, '#d9c08e');
    R(sx + (dir > 0 ? 4 : 36), y - 8, 3, 8, '#5a6a70'); R(sx + (dir > 0 ? 3 : 35), y - 10, 5, 2, '#c9a860');
  }
  function ship(sx, p, t) {
    const w = p.w || 130, y = 138 + Math.round(Math.sin(t * 1.2 + sx * 0.1) * 1);
    R(sx, y, w, 14, '#4a2e1c'); R(sx, y, w, 2, '#6b4a33'); R(sx + 4, y + 14, w - 8, 4, '#3a2214');
    R(sx + w - 20, y - 12, 22, 12, '#5a3a24'); R(sx + w - 22, y - 14, 26, 2, '#3a2214');
    R(sx - 8, y + 2, 10, 8, '#4a2e1c'); R(sx - 10, y, 6, 3, '#4a2e1c');
    for (let i = 0; i < Math.floor(w / 12); i++) R(sx + 6 + i * 12, y + 5, 6, 3, '#2a1a10');
    const masts = [[0.35, 1], [0.62, 0.8]];
    for (const [mf, sc] of masts) {
      const mx = sx + w * mf, mh = 76 * sc;
      R(mx, y - mh, 2, mh, '#3a2214');
      const sw = 44 * sc, sh = 56 * sc, sxp = mx - sw * 0.45;
      R(sxp, y - mh + 4, sw, sh, p.s ? '#c78a52' : '#b0683a');
      for (let k = 0; k < sh; k += 6) R(sxp, y - mh + 4 + k, sw, 1, '#5a3a24');
      R(sxp, y - mh + 4, 1, sh, '#5a3a24'); R(sxp + sw - 1, y - mh + 4, 1, sh, '#5a3a24');
    }
    R(sx + w - 10, y - 34, 1, 22, '#3a2214'); R(sx + w - 9, y - 34 + Math.round(Math.sin(t * 4)), 8, 5, '#b23a2a');
  }
  function pagoda(sx, b, n, col, sc = 1) {
    let y = b;
    for (let i = 0; i < n; i++) {
      const w = (30 - i * 3.5) * sc, h = 9 * sc;
      R(sx - w / 2 + 3 * sc, y - h, w - 6 * sc, h, col);
      R(sx - w / 2, y - h - 2 * sc, w, 2 * sc, shade(col, -0.35));
      R(sx - w / 2 - 1 * sc, y - h - 3 * sc, 2 * sc, 1 * sc, shade(col, -0.35)); R(sx + w / 2 - 1 * sc, y - h - 3 * sc, 2 * sc, 1 * sc, shade(col, -0.35));
      y -= h + 2 * sc;
    }
    R(sx - 1 * sc, y - 10 * sc, 2 * sc, 10 * sc, shade(col, -0.35));
  }
  function kiln(sx, b, t) {
    R(sx, b - 26, 40, 26, '#9a5a3a');
    for (let y = b - 24; y < b; y += 4) for (let x = sx + ((y / 4) % 2) * 4; x < sx + 40; x += 8) R(x, y, 7, 3, '#a8684a');
    R(sx + 6, b - 34, 28, 8, '#9a5a3a'); R(sx + 12, b - 40, 16, 6, '#8a4a2e');
    R(sx + 14, b - 12, 12, 12, '#2a1a12');
    const fl = 0.6 + Math.sin(t * 9) * 0.2;
    c.fillStyle = `rgba(255,${140 + Math.round(Math.sin(t * 7) * 30)},60,${fl})`; c.fillRect(sx + 15, b - 9, 10, 9);
    glows.push([sx + 20, b - 6, 26]);
  }
  function printtable(sx, b = 178) {
    R(sx, b - 14, 46, 4, '#7a5338'); R(sx + 2, b - 10, 2, 10, '#5a3a24'); R(sx + 42, b - 10, 2, 10, '#5a3a24');
    R(sx + 4, b - 18, 24, 4, '#3a2a1a');
    for (let x = sx + 5; x < sx + 27; x += 3) R(x, b - 17, 2, 2, '#b89a6a');
    R(sx + 31, b - 17, 12, 3, '#f4ecd8'); R(sx + 32, b - 16, 3, 1, '#2a1a12'); R(sx + 36, b - 16, 3, 1, '#2a1a12');
  }
  function bowltable(sx, b = 178, t = 0) {
    R(sx, b - 12, 26, 3, '#7a5338'); R(sx + 2, b - 9, 2, 9, '#5a3a24'); R(sx + 22, b - 9, 2, 9, '#5a3a24');
    R(sx + 6, b - 17, 14, 5, '#8fb8a8'); R(sx + 7, b - 17, 12, 2, '#5d8fa0');
    R(sx + 9, b - 17, 8, 1, '#b23a2a');
  }
  function rack(sx, b = 176) {
    R(sx, b - 30, 2, 30, '#5a3a24'); R(sx + 26, b - 30, 2, 30, '#5a3a24'); R(sx, b - 28, 28, 2, '#5a3a24'); R(sx, b - 12, 28, 2, '#5a3a24');
    for (let i = 0; i < 4; i++) { R(sx + 4 + i * 6, b - 40, 1, 32, '#8a6a48'); R(sx + 3 + i * 6, b - 42, 3, 3, '#9aa0a6'); R(sx + 3 + i * 6, b - 22, 3, 4, '#7a2a20'); }
  }
  function theater(sx, p, t) {
    const w = p.w || 320, b = 176;
    R(sx, b - 70, w, 70, '#3a2418');
    R(sx + 8, b - 64, w - 16, 44, '#8a2a24');
    for (let x = sx + 8; x < sx + w - 8; x += 6) R(x, b - 64, 2, 44, '#a8382c');
    R(sx + 8, b - 64, w - 16, 5, '#e0a63a'); for (let x = sx + 10; x < sx + w - 10; x += 8) R(x, b - 59, 4, 3, '#e0a63a');
    R(sx + 4, b - 20, w - 8, 8, '#7a5338'); R(sx + 4, b - 20, w - 8, 1, '#a8784a');
    for (let x = sx + 6; x < sx + w - 6; x += 10) { R(x, b - 28, 2, 8, '#b23a2a'); }
    R(sx + 4, b - 28, w - 8, 2, '#b23a2a');
    roof(sx, b - 70, w, '#2f3a44', 10, 12);
    sign(sx + w / 2, b - 82, p.sign || '瓦子 · 勾欄');
    for (let i = 0; i < 4; i++) lantern(sx + 30 + i * ((w - 60) / 3), b - 68, t);
    // 그림자 인형극 막
    const scx = sx + w / 2;
    R(scx - 30, b - 54, 60, 30, '#f3e2b4');
    c.fillStyle = 'rgba(40,20,10,.75)';
    const s1 = Math.sin(t * 2.2) * 6, s2 = Math.cos(t * 1.8) * 5;
    c.fillRect(scx - 14 + s1, b - 44, 5, 12); c.fillRect(scx - 15 + s1, b - 48, 7, 4); c.fillRect(scx - 8 + s1, b - 42, 6, 1);
    c.fillRect(scx + 8 + s2, b - 44, 5, 12); c.fillRect(scx + 7 + s2, b - 48, 7, 4); c.fillRect(scx + 2 + s2, b - 41, 6, 1);
    glows.push([scx, b - 40, 40]);
  }
  function citygate(sx, p, t) {
    const w = p.w || 240, b = BY;
    R(sx, b - 64, w, 64, '#8a7a66');
    for (let y = b - 60; y < b; y += 6) for (let x = sx + ((y / 6) % 2) * 6; x < sx + w; x += 12) R(x, y, 11, 1, '#7a6a58');
    for (let x = sx; x < sx + w; x += 10) R(x, b - 70, 6, 6, '#8a7a66');
    const gx = sx + w / 2 - 18;
    R(gx, b - 40, 36, 40, '#2a1a12');
    c.fillStyle = '#2a1a12'; c.beginPath(); c.arc(gx + 18, b - 40, 18, Math.PI, 0); c.fill();
    R(gx + 2, b - 38, 15, 38, '#7a2a20'); R(gx + 19, b - 38, 15, 38, '#7a2a20');
    house(sx + w / 2 - 50, { w: 100, h: 22, base: b - 70, wall: '#c9b08a', roof: '#2f3a44', pillar: '#9a2f24', win: 1 }, t);
    if (p.sign) sign(sx + w / 2, b - 64, p.sign);
    lantern(sx + w / 2 - 26, b - 62, t); lantern(sx + w / 2 + 26, b - 62, t);
  }
  function shelfwall(sx, p) {
    const w = p.w, h = p.tall ? 120 : 78, b = BY;
    R(sx, b - h, w, h, '#5a3a24'); R(sx + 2, b - h + 2, w - 4, h - 4, '#3a2418');
    for (let y = b - h + 16; y < b; y += 18) {
      R(sx + 2, y, w - 4, 2, '#7a5134');
      for (let x = sx + 4; x < sx + w - 6; x += 5) {
        const wx = x - sx + p.x; // 화면이 아닌 월드 좌표로 무늬를 고정 (이동 시 깜빡임 방지)
        const hh = 6 + Math.floor(hash(wx * 3 + y) * 8), col = ['#d9c08e', '#b23a2a', '#3d6e8c', '#e8dcc4', '#7a5134'][Math.floor(hash(wx + y * 7) * 5)];
        R(x, y - hh, 4, hh, col); R(x + 1, y - hh, 2, 1, shade(col, 0.3));
      }
    }
  }
  function screenProp(sx, p) {
    const w = p.w || 140, b = 176, h = 62;
    for (let i = 0; i < 4; i++) {
      const x = sx + i * (w / 4);
      R(x, b - h, w / 4 - 1, h, '#5a3a24'); R(x + 2, b - h + 2, w / 4 - 5, h - 4, '#efe2c4');
      for (let k = 0; k < 6; k++) R(x + 4 + k * 4, b - h + 30 - Math.abs(k - 2.5) * 6, 4, 26 + Math.abs(k - 2.5) * 6 - 12, '#9aaa9a');
      R(x + 4, b - h + 8, 4, 4, '#b23a2a');
    }
  }
  function cubicles(sx, p, b = BY) {
    for (let x = sx; x < sx + p.w; x += 34) {
      R(x, b - 46, 30, 46, '#c9b48a'); R(x + 3, b - 36, 24, 34, '#3a2a20');
      R(x + 6, b - 18, 18, 3, '#7a5338'); R(x + 10, b - 26, 6, 8, '#d9d2bf'); R(x + 10, b - 28, 6, 3, '#2c2c2c');
      R(x + 9, b - 44, 12, 6, '#2a1a12'); R(x + 10, b - 43, 10, 4, '#e9c46a');
      roof(x, b - 46, 30, '#4a5560', 3, 5);
    }
  }
  function farhouses(sx, p, t, cam) {
    // 운하 건너편 집들 (base 136)
    for (let x = sx + 10, i = 0; x < sx + p.w; x += 96, i++) {
      if (x + 96 < cam - 20 || x > cam + W + 20) continue;
      house(x - cam, { w: 80, h: 34, base: 136, floors: i % 3 === 1 ? 2 : 1, wall: i % 2 ? '#e8d8b8' : '#dfcca4', roof: i % 2 ? '#4a5560' : '#55606a', lant: i % 2 }, t);
    }
  }

  /* ---------------- 상호작용 오브젝트 ---------------- */
  function obj(kind, x, y, t, hi, o = {}) {
    x = Math.round(x); y = Math.round(y);
    switch (kind) {
      case 'scroll':
        R(x - 1, y - 22, 2, 22, '#5a3a24'); R(x - 10, y - 30, 20, 3, '#7a5134');
        R(x - 9, y - 27, 18, 20, '#f2e6c8'); R(x - 10, y - 8, 20, 3, '#7a5134');
        for (let i = 0; i < 4; i++) { R(x - 6 + i * 4, y - 25, 2, 14, '#2a1a12'); R(x - 7 + i * 4, y - 20, 4, 1, '#2a1a12'); }
        R(x + 4, y - 12, 4, 3, '#b23a2a');
        if (hi) sparkle(x + 9, y - 32, t);
        break;
      case 'tablet':
        R(x - 10, y - 4, 20, 4, '#4a4458'); R(x - 8, y - 34, 16, 30, '#6a6480'); R(x - 6, y - 38, 12, 4, '#6a6480');
        R(x - 6, y - 30, 12, 22, o.lit ? '#e9d79a' : '#4a4460');
        if (o.lit) for (let i = 0; i < 3; i++) R(x - 4 + i * 3, y - 28, 1, 18, '#7a5a2a');
        if (hi) { c.fillStyle = `rgba(190,150,255,${0.3 + Math.sin(t * 4) * 0.2})`; c.fillRect(x - 9, y - 39, 18, 36); sparkle(x + 8, y - 42, t); }
        break;
      case 'piece':
        R(x - 5, y - 8 + Math.round(Math.sin(t * 3) * 1.5), 10, 8, '#e9d6a6'); R(x - 3, y - 6 + Math.round(Math.sin(t * 3) * 1.5), 6, 1, '#3e6f63');
        sparkle(x + 4, y - 14, t);
        break;
      case 'stationpost':
        R(x - 1, y - 30, 2, 30, '#5a3a24'); R(x - 9, y - 34, 18, 12, '#2a1a12'); R(x - 8, y - 33, 16, 10, '#e9c46a');
        c.fillStyle = '#2a1a12'; c.font = 'bold 9px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('站', x, y - 27.5);
        if (hi) sparkle(x + 9, y - 38, t);
        break;
      case 'chest':
        R(x - 11, y - 14, 22, 14, '#7a4a2a'); R(x - 11, y - 16, 22, 4, '#5a3420'); R(x - 11, y - 9, 22, 1, '#c9a35a');
        R(x - 2, y - 11, 4, 4, '#c9a35a'); R(x - 11, y - 14, 1, 14, '#c9a35a'); R(x + 10, y - 14, 1, 14, '#c9a35a');
        if (hi) { const a = 0.5 + Math.sin(t * 5) * 0.4; c.fillStyle = `rgba(255,214,110,${a})`; c.fillRect(x - 9, y - 17, 18, 1); sparkle(x + 6, y - 22, t); }
        break;
      case 'cloth':
        R(x - 12, y - 10, 24, 10, '#9a7448'); R(x - 12, y - 10, 24, 1, '#b48a58');
        R(x - 7, y - 16, 14, 6, '#c8b89a'); R(x - 5, y - 18, 10, 2, '#d8caa8'); R(x - 8, y - 11, 2, 2, '#c8b89a');
        if (hi) sparkle(x + 4, y - 22, t);
        break;
      case 'ledger':
        R(x - 12, y - 12, 24, 3, '#7a5338'); R(x - 10, y - 9, 2, 9, '#5a3a24'); R(x + 8, y - 9, 2, 9, '#5a3a24');
        for (let i = 0; i < 4; i++) R(x - 9 + (i % 2), y - 16 - i * 3, 16, 3, ['#d9c08e', '#c8b080', '#e0d0a8', '#b8a070'][i]);
        R(x - 9, y - 16, 16, 1, '#8a6a40');
        if (hi) sparkle(x + 8, y - 26, t);
        break;
      case 'jar':
        R(x - 7, y - 16, 14, 16, '#6a4a3a'); R(x - 5, y - 19, 10, 3, '#5a3a2a'); R(x - 8, y - 12, 16, 8, '#6a4a3a');
        R(x - 4, y - 21, 8, 3, '#c8352a'); R(x - 2, y - 13, 4, 5, '#e8dcc4'); R(x - 6, y - 14, 1, 8, '#8a6a5a');
        break;
      case 'board':
        R(x - 12, y - 30, 2, 30, '#5a3a24'); R(x + 10, y - 30, 2, 30, '#5a3a24');
        R(x - 13, y - 32, 26, 18, '#7a5338'); R(x - 11, y - 30, 22, 14, '#efe4c8');
        for (let i = 0; i < 4; i++) R(x - 9 + i * 5, y - 28, 3, 10, 'rgba(40,30,20,.45)');
        R(x - 15, y - 34, 30, 3, '#3a3a3a');
        if (hi) sparkle(x + 10, y - 36, t);
        break;
      case 'desk':
        R(x - 14, y - 10, 28, 3, '#6a4630'); R(x - 12, y - 7, 2, 7, '#4a3020'); R(x + 10, y - 7, 2, 7, '#4a3020');
        R(x - 8, y - 12, 12, 2, '#f4ecd8'); R(x + 6, y - 13, 4, 3, '#2a2a2a'); R(x + 7, y - 17, 1, 5, '#8a6a40');
        if (hi) sparkle(x + 2, y - 20, t);
        break;
      case 'table':
        R(x - 14, y - 12, 28, 3, '#6a4630'); R(x - 12, y - 9, 2, 9, '#4a3020'); R(x + 10, y - 9, 2, 9, '#4a3020');
        R(x - 8, y - 15, 4, 3, '#8fb8a8'); R(x - 2, y - 14, 10, 2, '#e8d4a8'); R(x + 9, y - 15, 3, 3, '#8fb8a8');
        if (hi) sparkle(x, y - 22, t);
        break;
      case 'paper': {
        const fl = Math.round(Math.sin(t * 2.5 + (o.seed || 0) * 0.7) * 0.6); // 화면 좌표 대신 고정값으로 흔들어 카메라가 움직여도 떨리지 않게
        R(x - 4, y - 4 + fl, 8, 5, '#f4ecd8'); R(x - 4, y - 4 + fl, 8, 1, '#d8ccb0'); R(x - 2, y - 2 + fl, 4, 1, '#8a7a6a');
        sparkle(x + 3, y - 10, t);
        break;
      }
      case 'shelf':
        R(x - 12, y - 46, 24, 46, '#5a3a24'); R(x - 10, y - 44, 20, 42, '#2e1e14');
        for (let yy = y - 34; yy < y; yy += 11) {
          R(x - 10, yy, 20, 2, '#7a5134');
          for (let xx = x - 9; xx < x + 9; xx += 3) { const col = ['#d9c08e', '#b23a2a', '#3d6e8c', '#e8dcc4'][Math.floor(hash((xx - x) * 5 + (yy - y) + (o.seed || 0)) * 4)]; R(xx, yy - 8, 2, 8, col); }
        }
        if (hi) sparkle(x + 8, y - 50, t);
        break;
    }
  }
  function sparkle(x, y, t) {
    const s = (Math.sin(t * 6) + 1) / 2, a = 0.4 + s * 0.6;
    c.fillStyle = `rgba(255,236,160,${a})`;
    c.fillRect(x, y - 2, 1, 5); c.fillRect(x - 2, y, 5, 1);
    if (s > 0.5) { c.fillRect(x - 1, y - 1, 3, 3); }
  }
  function exitSign(x, y, dir, t, label) {
    x = Math.round(x); const yy = 200;
    R(x - 1, yy - 26, 2, 26, '#5a3a24');
    R(x - 12, yy - 30, 24, 10, '#7a5338'); R(x - 11, yy - 29, 22, 8, '#e8d8b0');
    const ax = x + dir * Math.round(2 + Math.sin(t * 5) * 1.5);
    for (let i = 0; i < 4; i++) R(dir > 0 ? ax + 2 - i : ax - 3 + i, yy - 28 + i, 2, 7 - i * 2 > 0 ? 7 - i * 2 : 1, '#b23a2a');
    R(dir > 0 ? ax - 7 : ax, yy - 26, 7, 2, '#b23a2a');
  }

  /* ---------------- 원나라 소품 ---------------- */
  function ger(sx, p, b = 172) {
    const w = p.w || 40, felt = p.c || '#efe6d2';
    R(sx, b - 16, w, 16, felt); R(sx, b - 16, w, 1, shade(felt, -0.1));
    for (let i = 0; i < 9; i++) { const rw = w + 4 - i * (w / 9); R(sx + w / 2 - rw / 2, b - 17 - i, rw, 1, i % 3 === 0 ? shade(felt, -0.12) : shade(felt, -0.04)); }
    R(sx + w / 2 - 4, b - 27, 8, 2, '#8a6a48');
    R(sx, b - 10, w, 2, '#b23a2a'); R(sx, b - 5, w, 1, '#8a6a48');
    R(sx + w / 2 - 4, b - 12, 8, 12, '#b8453a'); R(sx + w / 2 - 3, b - 11, 6, 1, '#e9c46a'); R(sx + w / 2 - 3, b - 6, 6, 1, '#e9c46a');
    if (p.smoke) { for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(230,230,230,.35)'; c.fillRect(sx + w / 2 - 1 + k, b - 32 - k * 6, 3, 3); } }
  }
  function stupa(sx, b, sc = 1) {
    const s = sc;
    R(sx - 16 * s, b - 8 * s, 32 * s, 8 * s, '#e8e4dc'); R(sx - 12 * s, b - 14 * s, 24 * s, 6 * s, '#f2eee6');
    for (let i = 0; i < 12; i++) { const rw = (20 - Math.abs(i - 4) * 1.2) * s; R(sx - rw / 2, b - (15 + i * 1.6) * s, rw, 1.8 * s, '#f6f3ee'); }
    for (let i = 0; i < 7; i++) R(sx - (5 - i * 0.5) * s, b - (36 + i * 3) * s, (10 - i) * s, 2 * s, '#e8e4dc');
    R(sx - 7 * s, b - 58 * s, 14 * s, 3 * s, '#c9a35a'); R(sx - 1 * s, b - 64 * s, 2 * s, 6 * s, '#c9a35a');
  }
  function mosque(sx, p, t) {
    const b = BY, w = p.w || 110;
    R(sx, b - 40, w, 40, '#e4dcc8'); for (let i = 0; i < 3; i++) { R(sx + 16 + i * 30, b - 26, 12, 20, '#3a5a6a'); c.fillStyle = '#3a5a6a'; c.beginPath(); c.arc(sx + 22 + i * 30, b - 26, 6, Math.PI, 0); c.fill(); }
    c.fillStyle = '#4f8a8a'; c.beginPath(); c.arc(sx + w / 2, b - 40, 22, Math.PI, 0); c.fill(); R(sx + w / 2 - 1, b - 70, 2, 8, '#c9a35a');
    R(sx + w - 8, b - 86, 10, 86, '#e4dcc8'); R(sx + w - 10, b - 66, 14, 3, '#c9b48a'); R(sx + w - 6, b - 94, 6, 8, '#4f8a8a');
    if (p.sign) sign(sx + w / 2, b - 16, p.sign);
  }
  function church(sx, p, t) {
    const b = BY, w = p.w || 80;
    R(sx, b - 44, w, 44, '#d8ccb8'); R(sx + w / 2 - 7, b - 22, 14, 22, '#5a3a26');
    for (let i = 0; i < 10; i++) { const rw = w + 8 - i * 9; R(sx + w / 2 - rw / 2, b - 45 - i * 2, rw, 2, i % 2 ? '#6a4a3a' : '#7a5a46'); }
    R(sx + w / 2 - 1, b - 76, 2, 12, '#c9a35a'); R(sx + w / 2 - 4, b - 72, 8, 2, '#c9a35a');
    R(sx + 10, b - 36, 10, 14, '#a8c0d0'); R(sx + w - 20, b - 36, 10, 14, '#a8c0d0');
  }
  function observatory(sx, b, t) {
    R(sx, b - 40, 70, 40, '#8a8076'); for (let y = b - 36; y < b; y += 6) R(sx, y, 70, 1, '#7a7066');
    for (let i = 0; i < 8; i++) R(sx + 70 + i * 3, b - 40 + i * 5, 3, 40 - i * 5, '#9a9086');
    R(sx - 2, b - 42, 74, 3, '#6a6058');
    c.strokeStyle = '#c9a35a'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(sx + 35, b - 58, 13, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(sx + 35, b - 58, 13, 5, Math.sin(t * 0.5) * 0.6, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(sx + 35, b - 58, 5, 13, 0, 0, Math.PI * 2); c.stroke();
    R(sx + 34, b - 45, 2, 6, '#c9a35a');
  }
  function station(sx, p, t) {
    house(sx, { w: p.w || 110, h: 44, sign: p.sign || '驛站', door: 1, wall: '#e2cfa8', roof: '#4a5560', lant: 1 }, t);
    horse(sx + (p.w || 110) + 6, 178, t, '#7a4a2a');
  }
  function cotton(sx, b = 176) {
    for (let i = 0; i < 6; i++) { const x = sx + i * 7; R(x + 2, b - 14, 1, 14, '#6a8a4a'); R(x, b - 16, 5, 4, '#fbf8f0'); R(x + 1, b - 17, 3, 1, '#fff'); }
  }
  function foe(x, y, t, o) {
    x = Math.round(x); y = Math.round(y);
    const kind = o.boss ? 'boss' : (o.kind || 'ink');
    const s = { boss: 2.4, fast: 0.75, tank: 1.4, shooter: 1, ink: 1 }[kind], wob = Math.sin(t * (kind === 'fast' ? 9 : 4) + (o.seed || 0)) * 1.5;
    c.fillStyle = 'rgba(10,0,20,.32)'; c.beginPath(); c.ellipse(x, y, 9 * s, 2.5 * s, 0, 0, Math.PI * 2); c.fill();
    if (kind === 'fast' && o.moving) { c.fillStyle = 'rgba(120,70,200,.35)'; for (let k = 1; k <= 3; k++) c.fillRect(x - (o.face || 1) * (6 + k * 5), y - 12 + k * 2, 5, 1); }
    const base = { boss: '#20102e', fast: '#2e1450', tank: '#1a1410', shooter: '#0e2228', ink: '#1b1222' }[kind];
    const body = o.hit > 0 ? '#e8dcff' : o.flash ? '#3a6a7a' : base;
    c.fillStyle = body;
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + t * 1.5; c.beginPath(); c.arc(x + Math.cos(a) * 5 * s, y - 11 * s + wob + Math.sin(a) * 4 * s, 4.5 * s, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.arc(x, y - 10 * s + wob, 8 * s, 0, Math.PI * 2); c.fill();
    for (let k = 0; k < 3; k++) { const dy = ((t * 10 + k * 5) % 8) * s; R(x - 5 * s + k * 5 * s, y - 4 * s + dy * 0.4, 2 * s, 3 * s, body); }
    const f = o.face || 1, ex = x + f * 2 * s;
    R(ex - 4 * s, y - 13 * s + wob, 3 * s, 3 * s, '#fff4e0'); R(ex + 1 * s, y - 13 * s + wob, 3 * s, 3 * s, '#fff4e0');
    R(ex - 3 * s + f * s * 0.5, y - 12 * s + wob, 1.5 * s, 1.5 * s, '#c8352a'); R(ex + 2 * s + f * s * 0.5, y - 12 * s + wob, 1.5 * s, 1.5 * s, '#c8352a');
    if (kind === 'tank') { R(x - 7 * s, y - 19 * s + wob, 14 * s, 3 * s, '#6a5a48'); R(x - 9 * s, y - 13 * s + wob, 3 * s, 6 * s, '#6a5a48'); R(x + 6 * s, y - 13 * s + wob, 3 * s, 6 * s, '#6a5a48'); }
    if (kind === 'shooter') { R(x + (o.face || 1) * 6 - 2, y - 19 + wob, 4, 5, body); R(x + (o.face || 1) * 7 - 1, y - 21 + wob, 3, 2, o.flash ? '#9fe8ff' : '#4a8a9a'); }
    if (kind === 'fast') { R(x - 3, y - 20 * s + wob, 2, 4, body); R(x + 1, y - 21 * s + wob, 2, 5, body); }
    if (o.boss) { R(x - 10 * s, y - 22 * s + wob, 3 * s, 5 * s, body); R(x + 7 * s, y - 22 * s + wob, 3 * s, 5 * s, body); c.fillStyle = 'rgba(150,90,220,.18)'; c.beginPath(); c.arc(x, y - 10 * s, 20 * s, 0, Math.PI * 2); c.fill(); }
    if (o.shield) { c.strokeStyle = `rgba(160,220,255,${0.6 + Math.sin(t * 6) * 0.3})`; c.lineWidth = 2; c.setLineDash([4, 3]); c.beginPath(); c.arc(x, y - 10 * s, 13 * s, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
    const bw = 18 * s, by = y - 24 * s - (o.boss ? 6 : 2);
    R(x - bw / 2 - 1, by - 1, bw + 2, 4, '#1a1010'); R(x - bw / 2, by, bw, 2, '#4a2a2a'); R(x - bw / 2, by, bw * Math.max(0, o.hp / o.max), 2, o.boss ? '#b07aff' : '#e25a4a');
  }
  function swoosh(x, y, f, p) {
    x = Math.round(x); y = Math.round(y);
    c.strokeStyle = `rgba(255,250,235,${0.9 * (1 - p)})`; c.lineWidth = 3;
    c.beginPath(); const a0 = f > 0 ? -1.3 : Math.PI + 1.3, a1 = f > 0 ? 0.9 : Math.PI - 0.9;
    c.arc(x + f * 6, y - 14, 14, Math.min(a0, a1) + (f > 0 ? 0 : 0), Math.max(a0, a1)); c.stroke();
    c.strokeStyle = `rgba(29,23,18,${0.8 * (1 - p)})`; c.lineWidth = 1.2; c.beginPath(); c.arc(x + f * 6, y - 14, 11, Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
    R(x + f * (8 + p * 10), y - 18, 2, 2, '#1d1712');
  }
  /* 말하는 사람 머리 위 감정 표시 : 튀어나오듯 커졌다 둥실 떠오름 */
  function emote(x, y, kind, p, t) {
    x = Math.round(x);
    const pop = p < 0.18 ? p / 0.18 * 1.25 : p < 0.3 ? 1.25 - (p - 0.18) / 0.12 * 0.25 : 1;
    const fade = p > 1.25 ? 1 - (p - 1.25) / 0.35 : 1;
    y = Math.round(y - 4 - Math.min(p, 1) * 3);
    c.save(); c.globalAlpha = Math.max(0, fade); c.translate(x, y); c.scale(pop, pop);
    if (kind === 'sweat') {
      c.fillStyle = '#7ec4ea'; c.beginPath(); c.moveTo(7, -10); c.quadraticCurveTo(12, -2, 7, 0); c.quadraticCurveTo(2, -2, 7, -10); c.fill();
      c.fillStyle = '#d8f0ff'; c.fillRect(6, -5, 1, 2);
    } else if (kind === 'note') {
      const b = Math.sin(t * 6) * 1.5;
      c.fillStyle = '#2a1a12'; c.font = 'bold 10px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('♪', -5, -6 + b); c.fillText('♫', 6, -10 - b);
    } else {
      const map = { surprise: ['!!', '#c8352a', '#fff4d8'], question: ['?', '#3d6e8c', '#eef6fa'], laugh: ['ㅎㅎ', '#b8791e', '#fff8e0'] };
      const [txt, fg, bg] = map[kind] || ['!', '#2a1a12', '#fff'];
      const w = kind === 'laugh' ? 16 : 11;
      c.fillStyle = '#2a1a12'; c.fillRect(-w / 2 - 1, -12, w + 2, 11); c.fillStyle = bg; c.fillRect(-w / 2, -11, w, 9);
      c.fillStyle = '#2a1a12'; c.fillRect(-1, -1, 2, 2);
      if (kind === 'surprise') { c.fillStyle = '#e9b44c'; c.fillRect(-w / 2 - 4, -14, 2, 2); c.fillRect(w / 2 + 2, -14, 2, 2); c.fillRect(-w / 2 - 4, -4, 2, 2); }
      c.fillStyle = fg; c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, -6.2);
    }
    c.restore();
  }
  /* 보스의 바닥 공격 : 경고(붉은 테두리 깜빡임) → 먹물 웅덩이 */
  function hazard(x, y, h, t) {
    const warn = h.t < h.warn, p = warn ? h.t / h.warn : (h.t - h.warn) / h.life;
    if (h.type === 'band') {
      const top = Math.round(y - h.r), hh = h.r * 2;
      if (warn) {
        const blink = Math.floor(t * (6 + p * 10)) % 2;
        c.fillStyle = `rgba(220,50,40,${0.12 + p * 0.18})`; c.fillRect(0, top, W, hh);
        if (blink) { c.fillStyle = 'rgba(255,90,70,.8)'; c.fillRect(0, top, W, 1); c.fillRect(0, top + hh - 1, W, 1); }
        c.fillStyle = 'rgba(255,230,200,.9)'; c.font = 'bold 8px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('! ! !', 6, y);
      } else {
        const a = p > 0.8 ? (1 - p) * 5 : 1;
        c.fillStyle = `rgba(30,12,48,${0.85 * a})`; c.fillRect(0, top, W, hh);
        for (let k = 0; k < 24; k++) { const bx = ((k * 23 + t * 120) % (W + 20)) - 10; c.fillStyle = `rgba(120,70,200,${0.5 * a})`; c.fillRect(bx, top + 2 + (k % 3) * 5, 6, 2); }
      }
      return;
    }
    x = Math.round(x); y = Math.round(y);
    const rx = h.r * 1.6, ry = h.r * 0.7;
    if (warn) {
      const blink = Math.floor(t * (6 + p * 12)) % 2;
      c.strokeStyle = blink ? 'rgba(255,80,60,.95)' : 'rgba(255,160,120,.6)'; c.lineWidth = 1.5; c.setLineDash([3, 2]);
      c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      c.fillStyle = `rgba(220,50,40,${0.1 + p * 0.25})`; c.beginPath(); c.ellipse(x, y, rx * p, ry * p, 0, 0, Math.PI * 2); c.fill();
    } else {
      const a = p > 0.8 ? (1 - p) * 5 : 1, grow = Math.min(1, p * 6);
      c.fillStyle = `rgba(26,10,40,${0.9 * a})`; c.beginPath(); c.ellipse(x, y, rx * grow, ry * grow, 0, 0, Math.PI * 2); c.fill();
      for (let k = 0; k < 4; k++) { const bb = ((t * 2 + k * 0.3) % 1); c.fillStyle = `rgba(150,100,230,${0.6 * a * (1 - bb)})`; c.beginPath(); c.arc(x - rx * 0.5 + k * rx * 0.33, y - bb * 6, 1.5, 0, Math.PI * 2); c.fill(); }
    }
  }
  function shot(x, y, s, t) {
    c.fillStyle = 'rgba(40,20,60,.35)'; c.beginPath(); c.arc(x - s.vx * 0.05, y - s.vy * 0.05, 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a0e26'; c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#b07aff'; c.fillRect(Math.round(x) - 1, Math.round(y) - 2, 1, 1);
  }
  /* NPC 머리 위 이름표 */
  function nameTag(x, y, label, hi) {
    if (!label) return;
    x = Math.round(x); y = Math.round(y);
    c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = Math.ceil(c.measureText(label).width) + 6;
    c.fillStyle = hi ? 'rgba(178,58,42,.92)' : 'rgba(20,14,10,.72)'; c.fillRect(x - w / 2, y - 4, w, 9);
    c.fillStyle = hi ? '#fff4dc' : '#f2e5c7'; c.fillText(label, x, y + 0.5);
  }
  /* 화면 밖 목표 안내 화살표 */
  function guide(x, y, dir, label, mk, t) {
    const b = Math.round(Math.sin(t * 6) * 2) * dir;
    x = Math.round(x + b);
    const col = mk === '!' ? '#f2c14e' : '#9fd8c8';
    c.fillStyle = '#2a1a12';
    for (let i = 0; i < 7; i++) c.fillRect(x + dir * i - (dir > 0 ? 1 : 0), y - 7 + i, 2, 14 - i * 2);
    c.fillStyle = col;
    for (let i = 1; i < 6; i++) c.fillRect(x + dir * i - (dir > 0 ? 1 : 0), y - 6 + i, 1, 12 - i * 2);
    c.font = 'bold 7px sans-serif'; const w = Math.ceil(c.measureText(label).width) + 8;
    const lx = dir > 0 ? x - 6 - w : x + 6;
    c.fillStyle = 'rgba(20,14,10,.85)'; c.fillRect(lx, y - 6, w, 12); c.fillStyle = col; c.fillRect(lx, y - 6, 2, 12);
    c.fillStyle = '#f2e5c7'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(label, lx + 5, y + 0.5);
  }
  function burst(x, y, p) {
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, r = p * 26; c.fillStyle = `rgba(30,15,40,${1 - p})`; c.fillRect(x + Math.cos(a) * r, y - 10 + Math.sin(a) * r, 3, 3); }
  }

  /* ---------------- 배경 ---------------- */
  const THEMES = {
    steppe: { sky: ['#78b0d8', '#eef2e0'], far: 'mount', mount: '#9ab49a', mount2: '#7f9e7c', ground: '#8fae5e', ground2: '#7a9a4c', gtype: 'grass', birds: 1 },
    steppe_camp: { sky: ['#8a9ec0', '#f2d6a6'], far: 'mount', mount: '#a6a890', mount2: '#8a8c70', ground: '#9aa868', ground2: '#848f54', gtype: 'grass', dust: 1 },
    dadu: { sky: ['#8cb8d0', '#f0e4c8'], far: 'wall', farc: '#a2927e', mount: '#a7b3b6', ground: '#b4a080', ground2: '#9c8868', gtype: 'stone', birds: 1, stupa: 1 },
    road: { sky: ['#9cc0d4', '#efe4c6'], far: 'mount', mount: '#9aa8a0', mount2: '#7f8c84', ground: '#b49a70', ground2: '#9a8058', gtype: 'dirt', dust: 1 },
    dadu_dusk: { sky: ['#2e2232', '#c8683a'], far: 'wall', farc: '#5a4a48', mount: '#4a3a44', ground: '#8a7666', ground2: '#74604f', gtype: 'stone', ash: 1, tint: 'rgba(110,40,30,.18)', night: 0.6, stupa: 1 },
    memory: { sky: ['#140f28', '#4a3a6e'], far: 'none', mount: '#2e2648', ground: '#3a3050', ground2: '#2a2240', gtype: 'stone', tint: 'rgba(70,30,110,.16)', night: 0.7, fire: 1, glyphs: 1 },
    warehouse_night: { interior: 1, wall: '#3a3040', ground: '#4a3e46', ground2: '#3a2e36', gtype: 'wood', beam: 1, tint: 'rgba(30,20,70,.3)', night: 0.5 },
    warehouse: { interior: 1, wall: '#5a4030', ground: '#6e5038', ground2: '#5a3e2a', gtype: 'wood', beam: 1 },
    warehouse_end: { interior: 1, wall: '#6a4a34', ground: '#7a5a3e', ground2: '#5a3e2a', gtype: 'wood', beam: 1, warm: 1 },
    kaifeng: { sky: ['#8ec0d4', '#f3e3c0'], far: 'wall', farc: '#a8987e', mount: '#9fb2b6', ground: '#b9a382', ground2: '#a28c6a', gtype: 'stone', birds: 1 },
    exam: { sky: ['#a7c6cf', '#efe1c2'], far: 'none', mount: '#b0bec0', ground: '#c2ae8a', ground2: '#ab9672', gtype: 'stone' },
    border: { sky: ['#a9c2c9', '#e6dcc4'], far: 'mount', mount: '#8a9aa0', mount2: '#6f8088', ground: '#b49a6e', ground2: '#9a8058', gtype: 'dirt', dust: 1 },
    border_dusk: { sky: ['#3e2432', '#e07a42'], far: 'mount', mount: '#4a3038', mount2: '#36242c', ground: '#7a5a40', ground2: '#5e4430', gtype: 'dirt', ash: 1, tint: 'rgba(120,40,20,.16)', night: 0.4 },
    hall: { interior: 'hall', wall: '#c9b28a', ground: '#8a6a4a', ground2: '#6e5238', gtype: 'tile' },
    market: { sky: ['#8fc3d8', '#f6e6c2'], far: 'wall', farc: '#a8987e', mount: '#a4b6ba', ground: '#bda783', ground2: '#a68f6b', gtype: 'stone', canal: 1, birds: 1 },
    workshop: { sky: ['#b7c3c0', '#efdcc0'], far: 'wall', farc: '#9a8a74', mount: '#a7b2b0', ground: '#ac9576', ground2: '#937c5e', gtype: 'stone' },
    port: { sky: ['#7fb6d6', '#f0e4c8'], far: 'sea', mount: '#8aa6b0', ground: '#8a6a4a', ground2: '#6e5238', gtype: 'dock', gulls: 1 },
    linan: { sky: ['#2c2a4e', '#e9865a'], far: 'lake', mount: '#4a3a5a', ground: '#8a7666', ground2: '#74604f', gtype: 'stone', tint: 'rgba(40,20,80,.20)', night: 0.75, fire: 1 },
  };
  function sky(th) {
    const [a, b] = th.sky; const n = 10;
    for (let i = 0; i < n; i++) { R(0, i * (BY / n), W, BY / n + 1, mix(a, b, i / (n - 1))); }
  }
  function mix(a, b, f) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) * (1 - f)) + ((pb >> 16) * f)), g = Math.round((((pa >> 8) & 255) * (1 - f)) + (((pb >> 8) & 255) * f)), bl = Math.round(((pa & 255) * (1 - f)) + ((pb & 255) * f));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  function mountains(cam, par, base, amp, col, seed) {
    const off = cam * par;
    for (let x = 0; x < W; x += 2) {
      const wx = x + off;
      const h = amp * (0.55 + 0.25 * Math.sin(wx * 0.011 + seed) + 0.15 * Math.sin(wx * 0.027 + seed * 2) + 0.05 * Math.sin(wx * 0.09));
      R(x, base - h, 2, h + 1, col);
    }
  }
  function cityWall(cam, par, base, col) {
    const off = cam * par;
    R(0, base - 20, W, 20, col); R(0, base - 20, W, 1, shade(col, 0.12));
    for (let x = -(off % 8); x < W; x += 8) R(x, base - 24, 5, 4, col);
    const per = 320;
    for (let gx = -(off % per) - per; gx < W + per; gx += per) {
      const tx = gx + 160;
      R(tx - 22, base - 38, 44, 18, shade(col, -0.08));
      R(tx - 6, base - 34, 4, 6, shade(col, -0.4)); R(tx + 2, base - 34, 4, 6, shade(col, -0.4));
      for (let i = 0; i < 6; i++) R(tx - 30 + i * 1.5, base - 39 - i, 60 - i * 3, 1, shade(col, -0.45));
    }
  }
  function sea(t, cam) {
    R(0, 96, W, BY - 96, '#4f8fae');
    for (let y = 98; y < BY; y += 5) {
      const off = (cam * (0.3 + (y - 96) / 120) + t * 6) % 22;
      for (let x = -off; x < W; x += 22) R(x + ((y * 7) % 11), y, 6, 1, 'rgba(220,240,250,.35)');
    }
    R(0, 96, W, 1, '#9cc7d8');
  }
  function lake(t, cam) {
    mountains(cam, 0.08, 112, 30, '#4a3a5a', 3);
    R(0, 112, W, BY - 112, '#5a5478');
    for (let y = 114; y < BY; y += 4) {
      const off = (cam * 0.25 + t * 4) % 26;
      for (let x = -off; x < W; x += 26) R(x + ((y * 5) % 13), y, 7, 1, 'rgba(255,190,140,.28)');
    }
    const px = 380 - cam * 0.15;
    pagoda(px, 114, 6, '#2e2640', 1.1);
    c.fillStyle = 'rgba(255,170,120,.18)'; c.fillRect(px - 10, 114, 20, 30);
    // 호숫가 둑
    R(0, BY - 6, W, 6, '#3e3a4e');
  }
  function canal(t, cam) {
    R(0, 136, W, 22, '#5d8fa0');
    for (let y = 138; y < BY; y += 4) {
      const off = (cam + t * 8) % 24;
      for (let x = -off; x < W; x += 24) R(x + ((y * 5) % 9), y, 7, 1, 'rgba(225,245,250,.35)');
    }
    R(0, 136, W, 1, '#8a7a62'); R(0, BY - 2, W, 2, '#8a7a62');
  }
  function ground(th, cam) {
    R(0, BY, W, H - BY, th.ground);
    const g2 = th.ground2;
    if (th.gtype === 'stone') {
      for (let row = 0, y = BY + 6; y < H; y += 10, row++) {
        R(0, y, W, 1, g2);
        const off = ((cam + row * 13) % 26 + 26) % 26;
        for (let x = -off; x < W; x += 26) R(x, y - 9, 1, 9, g2);
      }
    } else if (th.gtype === 'dirt') {
      for (let k = Math.floor(cam / 9); k < (cam + W) / 9 + 1; k++) {
        R(k * 9 - cam + hash(k) * 8, BY + 4 + hash(k + 7) * 108, 2, 1, g2);
        if (hash(k * 3) > 0.7) R(k * 9 - cam + hash(k + 2) * 8, BY + 6 + hash(k + 9) * 100, 3, 2, shade(th.ground, 0.12));
      }
    } else if (th.gtype === 'grass') {
      for (let k = Math.floor(cam / 7); k < (cam + W) / 7 + 1; k++) {
        const gx = k * 7 - cam + hash(k) * 6, gy = BY + 4 + hash(k + 11) * 108;
        R(gx, gy, 1, 3, g2); R(gx + 2, gy + 1, 1, 2, g2);
        if (hash(k * 5) > 0.93) { R(gx, gy - 1, 2, 2, ['#f2d24a', '#f6f0e8', '#d86a8a'][k % 3]); }
      }
    } else if (th.gtype === 'wood' || th.gtype === 'tile') {
      for (let row = 0, y = BY + 4; y < H; y += 9, row++) {
        R(0, y, W, 1, g2);
        const per = th.gtype === 'tile' ? 18 : 44, off = ((cam + row * 17) % per + per) % per;
        for (let x = -off; x < W; x += per) R(x, y - 8, 1, 8, g2);
      }
    } else if (th.gtype === 'dock') {
      for (let y = BY + 3; y < H; y += 7) { R(0, y, W, 1, g2); }
      const off = ((cam) % 40 + 40) % 40;
      for (let x = -off; x < W; x += 40) for (let y = BY + 3; y < H; y += 7) R(x + ((y * 3) % 20), y + 3, 1, 1, '#4a3424');
      R(0, BY, W, 3, '#4a3524');
      for (let x = -(cam % 30); x < W; x += 30) R(x, BY - 4, 3, 8, '#3a2818');
    }
    R(0, BY, W, 2, shade(th.ground, -0.22));
  }
  function interior(th, cam, t) {
    if (th.interior === 'hall') {
      R(0, 0, W, BY, th.wall);
      for (let y = 30; y < BY; y += 24) R(0, y, W, 1, shade(th.wall, -0.1));
      R(0, 0, W, 22, '#2f4a4a');
      for (let x = -((cam * 1) % 24); x < W; x += 24) { R(x, 4, 18, 6, '#3e7a6a'); R(x + 4, 6, 10, 2, '#e9c46a'); R(x, 14, 24, 2, '#b23a2a'); }
      R(0, 22, W, 3, '#5a3a24');
      for (let wx = Math.floor(cam / 140) * 140 + 60; wx < cam + W + 40; wx += 140) {
        const x = wx - cam;
        R(x - 4, 25, 9, BY - 25, '#a8382c'); R(x - 3, 25, 2, BY - 25, '#c8483a');
        R(x - 6, BY - 6, 13, 6, '#8a8076');
      }
      R(0, BY - 6, W, 6, '#6e5238');
      return;
    }
    R(0, 0, W, BY, th.wall);
    for (let x = -(((cam) % 18) + 18) % 18; x < W; x += 18) R(x, 12, 1, BY - 12, shade(th.wall, -0.2));
    for (let x = -(((cam * 1) % 18) + 18) % 18 + 9; x < W; x += 18) { const wx = Math.round(x + cam); if (hash(wx) > 0.85) R(x, 40 + hash(wx + 3) * 80, 2, 2, shade(th.wall, -0.3)); }
    R(0, 0, W, 12, shade(th.wall, -0.5));
    for (let x = -(((cam) % 120) + 120) % 120; x < W; x += 120) R(x, 0, 10, BY, shade(th.wall, -0.35));
    R(0, BY - 6, W, 6, shade(th.wall, -0.3));
  }
  function windowProp(sx, th) {
    R(sx, 40, 50, 46, '#3a2418'); R(sx + 3, 43, 44, 40, th.warm ? '#f4b878' : '#cfe0e0');
    for (let x = sx + 3; x < sx + 47; x += 7) R(x, 43, 1, 40, '#3a2418');
    for (let y = 43; y < 83; y += 7) R(sx + 3, y, 44, 1, '#3a2418');
  }

  function bg(area, cam, t) {
    glows.length = 0;
    const th = THEMES[area.theme] || THEMES.kaifeng;
    if (th.interior) interior(th, cam, t);
    else {
      sky(th);
      if (th.mount) mountains(cam, 0.1, th.far === 'sea' ? 96 : 128, 34, th.mount, 1.3);
      if (th.far === 'mount') mountains(cam, 0.22, 146, 40, th.mount2 || shade(th.mount, -0.2), 4.1);
      if (th.far === 'wall') { if (th.stupa) stupa(330 - cam * 0.12, 128, 1.1); else pagoda(300 - cam * 0.12, 118, 9, shade(th.farc, -0.15), 1); cityWall(cam, 0.3, 142, th.farc); }
      if (th.glyphs) for (let i = 0; i < 14; i++) { const gx = ((i * 97 - cam * 0.2 + t * 4) % 520 + 520) % 520 - 20, gy = 20 + (i * 37) % 120 + Math.sin(t + i) * 4; c.fillStyle = `rgba(200,170,255,${0.18 + (i % 3) * 0.08})`; c.font = '10px serif'; c.fillText('宋元記錄商路'[i % 6], gx, gy); }
      if (th.far === 'sea') { sea(t, cam); pagoda(620 - cam * 0.2, 100, 5, '#7a7a88', 0.8); }
      if (th.far === 'lake') lake(t, cam);
      if (th.canal) canal(t, cam);
      if (area.theme === 'exam') { R(0, 96, W, 62, '#c9b48a'); for (let x = -(cam * 0.6 % 40); x < W; x += 40) R(x, 92, 30, 4, '#4a5560'); }
      if (th.birds) birds(t, cam);
    }
    ground(th, cam);
    // 배경 소품
    for (const p of area.props) {
      if (p.k === 'farhouses') { farhouses(p.x, p, t, cam); continue; }
      const sx = p.x - cam, w = p.w || 60;
      if (sx > W + 80 || sx + w < -80) continue;
      switch (p.k) {
        case 'house': house(sx, p, t); break;
        case 'willow': willow(sx, 176, t); break;
        case 'pine': pine(sx, 168); break;
        case 'stall': stall(sx, p, t); break;
        case 'crates': crates(sx, p.n || 2); break;
        case 'sacks': sacks(sx); break;
        case 'barrels': barrels(sx); break;
        case 'cart': cart(sx, p); break;
        case 'tent': tent(sx, p); break;
        case 'watchtower': watchtower(sx, p, 160, t); break;
        case 'earthwall': earthwall(sx, p); break;
        case 'banner': banner(sx, 174, p, t); break;
        case 'smoke': smoke(sx, 150, t); break;
        case 'stable': stableProp(sx, 176, t); break;
        case 'bridge': bridge(sx, p, t); break;
        case 'boat': { const drift = ((t * 6 * (p.s ? -1 : 1)) % 200 + 200) % 200 - 100; boat(sx + drift, p, t); break; }
        case 'ship': ship(sx, p, t); break;
        case 'camel': camel(sx, 178, t); break;
        case 'theater': theater(sx, p, t); break;
        case 'kiln': kiln(sx, 176, t); break;
        case 'printtable': printtable(sx); break;
        case 'bowltable': bowltable(sx, 178, t); break;
        case 'rack': rack(sx); break;
        case 'citygate': citygate(sx, p, t); break;
        case 'shelfwall': shelfwall(sx, p); break;
        case 'window': windowProp(sx, th); break;
        case 'screen': screenProp(sx, p); break;
        case 'cubicles': cubicles(-((cam) % 34), { w: W + 40 }); break;
        case 'ger': ger(sx, p); break;
        case 'stupa': stupa(sx, p.base || 176, p.s || 1.4); break;
        case 'mosque': mosque(sx, p, t); break;
        case 'church': church(sx, p, t); break;
        case 'observatory': observatory(sx, 176, t); break;
        case 'station': station(sx, p, t); break;
        case 'cotton': cotton(sx); break;
        case 'horse': horse(sx, 178, t, p.c || '#8a5a3a'); break;
        case 'pagoda': pagoda(sx, p.base || 160, p.n || 7, p.c || '#7a7068', p.s || 1); break;
      }
    }
  }
  function birds(t, cam) {
    for (let i = 0; i < 4; i++) {
      const x = ((i * 137 + t * (8 + i * 2)) % (W + 60)) - 30, y = 30 + i * 11 + Math.sin(t * 2 + i) * 3;
      const f = Math.sin(t * 8 + i) > 0 ? 1 : 0;
      R(x, y + f, 2, 1, '#3a3a40'); R(x + 2, y, 1, 1, '#3a3a40'); R(x + 3, y + f, 2, 1, '#3a3a40');
    }
  }

  /* ---------------- 전경 효과 ---------------- */
  const parts = [];
  let lastTheme = '';
  function fg(area, cam, t, dt) {
    const th = THEMES[area.theme] || THEMES.kaifeng;
    if (lastTheme !== area.theme) { parts.length = 0; lastTheme = area.theme; }
    if (th.beam) {
      const wx = (area.props.find(p => p.k === 'window') || { x: 250 }).x - cam;
      c.fillStyle = th.warm ? 'rgba(255,190,110,.16)' : 'rgba(255,240,200,.11)';
      c.beginPath(); c.moveTo(wx + 3, 43); c.lineTo(wx + 47, 43); c.lineTo(wx + 110, H); c.lineTo(wx + 30, H); c.closePath(); c.fill();
    }
    if (th.tint) { c.fillStyle = th.tint; c.fillRect(0, 0, W, H); }
    if (th.night) {
      c.globalCompositeOperation = 'lighter';
      for (const [gx, gy, r] of glows) {
        const fl = 0.85 + Math.sin(t * 7 + gx) * 0.08;
        const g = c.createRadialGradient(gx, gy, 0, gx, gy, r * fl);
        g.addColorStop(0, `rgba(255,170,80,${0.32 * th.night})`); g.addColorStop(1, 'rgba(255,120,40,0)');
        c.fillStyle = g; c.fillRect(gx - r, gy - r, r * 2, r * 2);
      }
      c.globalCompositeOperation = 'source-over';
    }
    // 입자
    const spawn = th.dust ? 'dust' : th.ash ? 'ash' : th.fire ? 'fly' : th.gulls ? 'gull' : th.beam ? 'mote' : null;
    if (spawn && Math.random() < dt * (spawn === 'gull' ? 0.25 : spawn === 'mote' ? 6 : 5)) {
      if (spawn === 'dust') parts.push({ k: spawn, x: W + 5, y: 170 + Math.random() * 90, vx: -30 - Math.random() * 30, vy: -2, life: 9 });
      if (spawn === 'ash') parts.push({ k: spawn, x: Math.random() * W, y: -4, vx: -6 + Math.random() * 4, vy: 10 + Math.random() * 10, life: 14, ph: Math.random() * 6 });
      if (spawn === 'fly') parts.push({ k: spawn, x: Math.random() * W, y: 120 + Math.random() * 130, vx: (Math.random() - 0.5) * 6, vy: -3 - Math.random() * 4, life: 6, ph: Math.random() * 6 });
      if (spawn === 'gull') parts.push({ k: spawn, x: -10, y: 30 + Math.random() * 50, vx: 20 + Math.random() * 10, vy: 0, life: 30, ph: Math.random() * 6 });
      if (spawn === 'mote') { const wx = (area.props.find(p => p.k === 'window') || { x: 250 }).x - cam; parts.push({ k: spawn, x: wx + Math.random() * 60, y: 50 + Math.random() * 150, vx: 1, vy: -1, life: 5, ph: Math.random() * 6 }); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
      if (q.life <= 0 || q.x < -20 || q.x > W + 20 || q.y > H + 10) { parts.splice(i, 1); continue; }
      if (q.k === 'dust') { c.fillStyle = 'rgba(230,210,170,.5)'; c.fillRect(q.x, q.y, 2, 1); }
      if (q.k === 'ash') { c.fillStyle = Math.sin(t * 9 + q.ph) > 0 ? 'rgba(255,150,70,.8)' : 'rgba(120,110,110,.6)'; c.fillRect(q.x + Math.sin(t * 2 + q.ph) * 3, q.y, 1, 1); }
      if (q.k === 'fly') { const a = 0.4 + Math.sin(t * 5 + q.ph) * 0.4; c.fillStyle = `rgba(255,214,130,${a})`; c.fillRect(q.x + Math.sin(t + q.ph) * 4, q.y, 1, 1); }
      if (q.k === 'gull') { const f = Math.sin(t * 7 + q.ph) > 0 ? 1 : 0; R(q.x, q.y + f, 3, 1, '#f4f4f4'); R(q.x + 3, q.y, 1, 1, '#f4f4f4'); R(q.x + 4, q.y + f, 3, 1, '#f4f4f4'); }
      if (q.k === 'mote') { c.fillStyle = `rgba(255,240,200,${0.3 + Math.sin(t * 3 + q.ph) * 0.2})`; c.fillRect(q.x + Math.sin(t + q.ph) * 6, q.y, 1, 1); }
    }
  }

  return {
    W, H, BY, LOOKS,
    begin(ctx) { c = ctx; },
    bg, fg, person, portrait, mark, keycap, obj, exitSign, foe, swoosh, burst, emote, hazard, shot, guide, nameTag,
  };
})();
