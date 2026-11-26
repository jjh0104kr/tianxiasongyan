'use strict';
/* =========================================================
   minigames.js : 미션 미니게임 (타이밍 · 분류 · 빈칸 · 순서 · 짝짓기 · 나침반)
   ========================================================= */
const MG = (() => {
  let active = false, cb = null, st = null, raf = 0;
  const root = () => document.getElementById('mg');
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  function frame(d, body) {
    const r = root();
    r.innerHTML = `<div class="mg-panel" role="dialog" aria-label="${esc(d.title)}">
      <header class="mg-head"><span class="mg-tag">${esc(d.tag || '미션')}</span><h2>${esc(d.title)}</h2><p>${d.desc}</p></header>
      <div class="mg-body">${body}</div>
      <footer class="mg-foot"><p class="mg-msg" id="mgMsg" aria-live="polite"></p><button class="btn gold" id="mgDone" hidden>완료 <span class="kbd">Enter</span></button></footer>
    </div>`;
    r.hidden = false; active = true;
    document.getElementById('mgDone').onclick = () => close();
  }
  function msg(t, kind) { const m = document.getElementById('mgMsg'); if (!m) return; m.textContent = t; m.className = 'mg-msg ' + (kind || ''); }
  function finish(t) { msg(t, 'ok'); SND.play('win'); const b = document.getElementById('mgDone'); b.hidden = false; b.focus(); st.done = true; }
  function close() { cancelAnimationFrame(raf); const r = root(); r.hidden = true; r.innerHTML = ''; active = false; st = null; const f = cb; cb = null; f && f(); }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); SND.play('bad'); }

  /* 1. 타이밍 — 과거 답안 */
  function timing(d) {
    frame(d, `<div class="exam">
      <div class="exam-paper">${d.chars.map((ch, i) => `<div class="exam-slot" id="es${i}"><span class="exam-ch">${ch}</span><small>${esc(d.stages[i])}</small></div>`).join('')}</div>
      <div class="exam-bar"><div class="exam-zone" id="ez"></div><div class="exam-brush" id="eb"></div></div>
      <button class="btn" id="ebtn">붓 내리기 <span class="kbd">Space</span></button></div>`);
    st = { i: 0, t: 0, zone: [0.4, 0.62], speed: 1.6, done: false, key(e) { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (st.done) { if (e.code === 'Enter') close(); } else press(); } } };
    const widths = [0.24, 0.18, 0.13];
    const setZone = () => { const w = widths[st.i]; const s = 0.1 + Math.random() * (0.8 - w); st.zone = [s, s + w]; const z = document.getElementById('ez'); z.style.left = (s * 100) + '%'; z.style.width = (w * 100) + '%'; document.querySelectorAll('.exam-slot').forEach((el, k) => el.classList.toggle('now', k === st.i)); };
    setZone(); msg(`1차 · ${d.stages[0]} — 금빛 칸에 붓이 들어오면!`);
    let last = performance.now();
    const loop = now => { const dt = (now - last) / 1000; last = now; if (!st || st.done) return; st.t += dt * st.speed; st.pos = (Math.sin(st.t * 2) + 1) / 2; const b = document.getElementById('eb'); if (b) b.style.left = (st.pos * 100) + '%'; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    function press() {
      if (st.pos >= st.zone[0] && st.pos <= st.zone[1]) {
        const slot = document.getElementById('es' + st.i); slot.classList.add('ok'); slot.classList.remove('now'); SND.play('good');
        st.i++; st.speed += 0.45;
        if (st.i >= 3) { finish('세 글자 文 · 治 · 國 완성! "문(文)으로 나라(國)를 다스린다(治)."'); return; }
        setZone(); msg(`좋아! ${st.i + 1}차 · ${d.stages[st.i]}${st.i === 2 ? ' — 황제 앞이다, 침착하게!' : ''}`);
      } else { msg('먹이 번졌다! 숨을 고르고 다시 한 번.', 'bad'); shake(document.querySelector('.exam-bar')); }
    }
    document.getElementById('ebtn').onclick = () => { if (!st.done) press(); };
  }

  /* 2. 분류 */
  function sort(d) {
    const cards = shuffle(d.cards);
    const icon = k => k === 'coin' ? '<i class="ic-coin"></i>' : k === 'paper' ? '<i class="ic-paper"></i>' : k === 'string' ? '<i class="ic-string"></i>' : '';
    frame(d, `<div class="sort">
      <div class="sort-pool" id="pool">${cards.map((cd, i) => `<button class="card" data-i="${i}"><span>${esc(cd.t)}</span></button>`).join('')}</div>
      <div class="sort-bins">${d.bins.map(b => `<button class="bin" data-b="${b.id}"><h3>${icon(b.icon)}${esc(b.t)}</h3><div class="bin-in"></div></button>`).join('')}</div></div>`);
    st = { sel: null, left: cards.length, done: false, key(e) { if (st.done && e.code === 'Enter') close(); } };
    msg('카드를 하나 골라 보자.');
    const r = root();
    r.querySelectorAll('.card').forEach(el => el.onclick = () => { if (el.classList.contains('placed')) return; r.querySelectorAll('.card').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); st.sel = el; SND.play('tick'); msg('이제 들어갈 칸을 누르자.'); });
    r.querySelectorAll('.bin').forEach(bin => bin.onclick = () => {
      if (!st.sel) { msg('먼저 위의 카드를 골라야 해.'); return; }
      const cd = cards[+st.sel.dataset.i];
      if (cd.b === bin.dataset.b) {
        const chip = document.createElement('span'); chip.className = 'chip'; chip.innerHTML = st.sel.innerHTML; bin.querySelector('.bin-in').appendChild(chip);
        st.sel.classList.add('placed'); st.sel.classList.remove('sel'); st.sel = null; st.left--; SND.play('good');
        if (st.left === 0) finish(d.win || '모든 카드를 제자리에 정리했다!'); else msg('정확해! 다음 카드.', 'ok');
      } else { shake(bin); msg(d.wrong, 'bad'); }
    });
  }

  /* 3. 빈칸 */
  function blanks(d) {
    frame(d, `<div class="blanks">${d.rows.map((row, i) => `<div class="blank-row" data-r="${i}"><div class="blank-label">${esc(row.label)}</div><div class="blank-slot" id="bs${i}">？</div><div class="blank-opts">${shuffle(row.opts).map(o => `<button class="opt" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`).join('')}</div>`);
    st = { left: d.rows.length, done: false, key(e) { if (st.done && e.code === 'Enter') close(); } };
    msg('각 줄에서 알맞은 내용을 고르자.');
    root().querySelectorAll('.blank-row').forEach(rowEl => {
      const row = d.rows[+rowEl.dataset.r];
      rowEl.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (rowEl.classList.contains('solved')) return;
        if (b.dataset.v === row.a) {
          rowEl.classList.add('solved'); document.getElementById('bs' + rowEl.dataset.r).textContent = row.a; b.classList.add('right'); st.left--; SND.play('good');
          if (st.left === 0) finish(d.win || '보고서가 복원되었다!'); else msg('맞아!', 'ok');
        } else { b.classList.add('wrong'); b.disabled = true; shake(rowEl); msg(row.hint, 'bad'); }
      });
    });
  }

  /* 4. 순서 */
  function order(d) {
    const pool = shuffle(d.items.map((it, i) => ({ ...it, i })).concat((d.distract || []).map(it => ({ ...it, i: -1 }))));
    frame(d, `<div class="order ${d.big ? 'big' : ''}">
      <ol class="order-slots">${d.items.map((_, i) => `<li class="oslot" id="os${i}"><span class="onum">${i + 1}</span><span class="otxt">？</span></li>`).join('')}</ol>
      <div class="order-pool">${pool.map((it, k) => `<button class="ocard" data-k="${k}"><b>${esc(it.t)}</b>${d.big && it.s ? `<small>${esc(it.s)}</small>` : ''}</button>`).join('')}</div></div>`);
    st = { next: 0, done: false, key(e) { if (st.done && e.code === 'Enter') close(); } };
    msg('첫 번째부터 차례로 골라 보자.');
    root().querySelectorAll('.ocard').forEach(b => b.onclick = () => {
      if (b.classList.contains('placed')) return;
      const it = pool[+b.dataset.k];
      if (it.i === st.next) {
        const s = document.getElementById('os' + st.next); s.classList.add('ok');
        s.querySelector('.otxt').innerHTML = `<b>${esc(it.t)}</b>${it.s ? `<small>${esc(it.s)}</small>` : ''}`;
        b.classList.add('placed'); st.next++; SND.play('good');
        if (st.next >= d.items.length) finish(d.win || '순서대로 모두 정리했다!'); else msg('좋아, 다음!', 'ok');
      } else if (it.i === -1) { shake(b); b.classList.add('nope'); b.disabled = true; msg(d.dmsg || '이건 목록에 들어가지 않아.', 'bad'); }
      else { shake(b); msg(d.wrong, 'bad'); }
    });
  }

  /* 5. 짝짓기 */
  function match(d) {
    const L = d.pairs.map((p, i) => ({ t: p.l, i })), Rr = shuffle(d.pairs.map((p, i) => ({ t: p.r, i })));
    frame(d, `<div class="match"><div class="mcol">${L.map(x => `<button class="mitem l" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div>
      <div class="mcol">${Rr.map(x => `<button class="mitem r" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div></div>`);
    st = { sel: null, left: d.pairs.length, done: false, key(e) { if (st.done && e.code === 'Enter') close(); } };
    msg('왼쪽의 나라를 먼저 고르자.');
    const r = root(); const hues = ['#3e6f63', '#b23a2a', '#d9a842', '#3d6e8c'];
    r.querySelectorAll('.mitem.l').forEach(b => b.onclick = () => { if (b.classList.contains('done')) return; r.querySelectorAll('.mitem.l').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); st.sel = b; SND.play('tick'); msg(`${b.textContent}에서 온 물건은?`); });
    r.querySelectorAll('.mitem.r').forEach(b => b.onclick = () => {
      if (b.classList.contains('done')) return;
      if (!st.sel) { msg('먼저 왼쪽 나라를 골라야 해.'); return; }
      if (b.dataset.i === st.sel.dataset.i) {
        const col = hues[(d.pairs.length - st.left) % hues.length];
        [b, st.sel].forEach(x => { x.classList.add('done'); x.classList.remove('sel'); x.style.setProperty('--pc', col); });
        st.sel = null; st.left--; SND.play('good');
        if (st.left === 0) finish(d.win || '모두 짝지었다!'); else msg('맞아! 다음 나라.', 'ok');
      } else { shake(b); msg(d.wrong, 'bad'); }
    });
  }

  /* 5-2. 고르기 (정답 모두 고르기) */
  function pick(d) {
    const pool = shuffle(d.items);
    const need = d.items.filter(i => i.ok).length;
    frame(d, `<div class="pick">${pool.map((it, k) => `<button class="pcard" data-k="${k}"><b>${esc(it.t)}</b>${it.s ? `<small>${esc(it.s)}</small>` : ''}</button>`).join('')}</div>`);
    st = { left: need, done: false, key(e) { if (st.done && e.code === 'Enter') close(); } };
    msg(`알맞은 것을 모두 고르자. (0 / ${need})`);
    root().querySelectorAll('.pcard').forEach(b => b.onclick = () => {
      if (b.classList.contains('on') || b.disabled || st.done) return;
      const it = pool[+b.dataset.k];
      if (it.ok) { b.classList.add('on'); st.left--; SND.play('good'); if (st.left === 0) finish(d.win || '모두 찾았다!'); else msg(`좋아! (${need - st.left} / ${need})`, 'ok'); }
      else { shake(b); b.disabled = true; b.classList.add('nope'); msg(it.why || d.wrong, 'bad'); }
    });
  }

  /* ===== 새 미니게임 : 단순하고 직관적으로 ===== */
  const ICONS = {
    compass: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#e9d6a6" stroke="#5a3a24" stroke-width="3"/><polygon points="20,5 24,20 20,35 16,20" fill="#c8352a"/><polygon points="20,20 24,20 20,35 16,20" fill="#f4ecd8"/><circle cx="20" cy="20" r="2.5" fill="#2a1a12"/></svg>',
    fire: '<svg viewBox="0 0 40 40"><rect x="8" y="22" width="24" height="12" rx="3" fill="#7a5134"/><path d="M20 4 C28 14 30 18 26 24 C24 28 16 28 14 24 C10 18 14 12 20 4Z" fill="#e9692a"/><path d="M20 12 C24 18 24 22 20 24 C16 22 16 18 20 12Z" fill="#f6d04a"/></svg>',
    print: '<svg viewBox="0 0 40 40"><rect x="4" y="8" width="32" height="24" rx="2" fill="#7a5134"/><g fill="#e9d6a6"><rect x="8" y="12" width="6" height="6"/><rect x="17" y="12" width="6" height="6"/><rect x="26" y="12" width="6" height="6"/><rect x="8" y="21" width="6" height="6"/><rect x="17" y="21" width="6" height="6"/><rect x="26" y="21" width="6" height="6"/></g></svg>',
    star: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="#c9a35a" stroke-width="2.5"/><ellipse cx="20" cy="20" rx="15" ry="6" fill="none" stroke="#c9a35a" stroke-width="2.5" transform="rotate(-25 20 20)"/><circle cx="20" cy="20" r="3" fill="#3d6e8c"/><circle cx="31" cy="9" r="2" fill="#f2c14e"/></svg>',
    mosque: '<svg viewBox="0 0 40 40"><rect x="8" y="20" width="24" height="16" fill="#e4dcc8" stroke="#5a4a3a"/><path d="M8 20 A12 12 0 0 1 32 20Z" fill="#4f8a8a"/><rect x="33" y="8" width="4" height="28" fill="#e4dcc8" stroke="#5a4a3a"/><rect x="17" y="26" width="6" height="10" fill="#3a5a6a"/></svg>',
    church: '<svg viewBox="0 0 40 40"><rect x="10" y="18" width="20" height="18" fill="#d8ccb8" stroke="#5a4a3a"/><polygon points="8,19 20,8 32,19" fill="#6a4a3a"/><rect x="19" y="1" width="2" height="9" fill="#c9a35a"/><rect x="16" y="3" width="8" height="2" fill="#c9a35a"/><rect x="17" y="26" width="6" height="10" fill="#5a3a26"/></svg>',
  };
  const iconHTML = it => it.look ? `<canvas class="ic-pt" width="26" height="26" data-look="${it.look}"></canvas>` : it.ic ? `<span class="ic-svg">${ICONS[it.ic] || ''}</span>` : '';
  function paintLooks() { root().querySelectorAll('canvas[data-look]').forEach(cv => { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; ART.portrait(x, cv.dataset.look); }); }

  /* 퍼즐 : 조각을 누르면 제자리로 쏙 — 지식 부담 없이 지도를 완성 */
  function jigsaw(d) {
    const pts = d.pieces.map(p => ({ ...p, X: YMAP.px(p.lon) / 702 * 100, Y: YMAP.py(p.lat) / 490 * 100 }));
    frame(d, `<div class="jig"><div class="jig-board">${miniMapSVG('')}${pts.map((p, i) => `<div class="jig-slot" id="js${i}" style="left:${p.X}%;top:${p.Y}%;--pc:${p.col}"><span>?</span></div>`).join('')}<div class="jig-done" id="jigDone" hidden>${d.doneText}</div></div>
      <div class="jig-tray">${shuffle(pts.map((p, i) => ({ ...p, i }))).map(p => `<button class="jig-piece" data-i="${p.i}" style="--pc:${p.col}"><b>${esc(p.t)}</b><small>${esc(p.s || '')}</small></button>`).join('')}</div></div>`);
    st = { left: pts.length, done: false, key(e) { if (st.done && e.code === 'Enter') close(); } };
    msg('아래 조각을 하나씩 눌러 보자. 조각이 제자리로 날아간다!');
    root().querySelectorAll('.jig-piece').forEach(b => b.onclick = () => {
      if (b.disabled) return; b.disabled = true; b.classList.add('used');
      const p = pts[+b.dataset.i], slot = document.getElementById('js' + b.dataset.i);
      slot.classList.add('on'); slot.innerHTML = `<span>${esc(p.t)}</span>`; SND.play('good'); st.left--;
      msg(p.say || '딱 맞았다!', 'ok');
      if (st.left === 0) { document.getElementById('jigDone').hidden = false; finish(d.win); }
    });
  }

  /* 왼쪽·오른쪽 고르기 : 카드 한 장씩, ← → 키 또는 버튼 */
  function swipe(d) {
    const cards = shuffle(d.cards); let i = 0;
    frame(d, `<div class="swp"><button class="swp-side l" id="swL"><span class="kbd">←</span>${esc(d.left)}</button>
      <div class="swp-stage"><div class="swp-card" id="swCard"></div><p class="swp-count" id="swCnt"></p></div>
      <button class="swp-side r" id="swR">${esc(d.right)}<span class="kbd">→</span></button></div>
      <div class="swp-piles"><div class="pile l" id="pileL"></div><div class="pile r" id="pileR"></div></div>`);
    const show = () => {
      const c = cards[i], el = document.getElementById('swCard');
      el.className = 'swp-card in'; el.innerHTML = `${iconHTML(c)}<b>${esc(c.t)}</b>${c.s ? `<small>${esc(c.s)}</small>` : ''}`; paintLooks();
      document.getElementById('swCnt').textContent = `${i + 1} / ${cards.length}`;
    };
    const pick = side => {
      if (st.done || st.busy) return;
      const c = cards[i], el = document.getElementById('swCard');
      if (c.side === side) {
        st.busy = true; SND.play('good'); el.className = 'swp-card fly-' + side;
        const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = c.t; document.getElementById(side === 'l' ? 'pileL' : 'pileR').appendChild(chip);
        msg(c.ok || '맞아!', 'ok');
        setTimeout(() => { st.busy = false; i++; if (i >= cards.length) finish(d.win); else show(); }, 330);
      } else { shake(el); msg(c.why || d.wrong, 'bad'); }
    };
    st = { done: false, key(e) { if (st.done) { if (e.code === 'Enter') close(); return; } if (e.code === 'ArrowLeft' || e.code === 'KeyA') pick('l'); if (e.code === 'ArrowRight' || e.code === 'KeyD') pick('r'); } };
    document.getElementById('swL').onclick = () => pick('l'); document.getElementById('swR').onclick = () => pick('r');
    msg(d.start || '카드를 보고 알맞은 쪽을 고르자.'); show();
  }

  /* 잡기 : 날아다니는 것 중 알맞은 것만 클릭 */
  function catchGame(d) {
    frame(d, `<div class="cat"><div class="cat-field" id="catF"></div><div class="cat-bag"><span>모은 것</span><div id="catBag"></div><b id="catN">0 / ${d.need}</b></div></div>`);
    const F = document.getElementById('catF'); let got = 0, spawnT = 0, last = performance.now(), gi = 0;
    st = { done: false, key(e) { if (st.done && e.code === 'Enter') close(); } };
    msg(d.start || '알맞은 것만 클릭!');
    const spawn = () => {
      const pool = d.unique ? d.good.filter(g => !st.caught.has(g.t) && !st.items.some(o => !o.gone && o.it === g)) : d.good;
      const good = pool.length > 0 && Math.random() < (d.goodRate || 0.6);
      const it = good ? pool[gi++ % pool.length] : d.bad[Math.floor(Math.random() * d.bad.length)];
      const el = document.createElement('button'); el.className = 'cat-item ' + (good ? 'g' : 'b') + ' ' + (it.cls || '');
      el.innerHTML = `<b>${esc(it.t)}</b>${it.s ? `<small>${esc(it.s)}</small>` : ''}`;
      const fromL = Math.random() < 0.5, y = 8 + Math.random() * 70;
      const o = { el, x: fromL ? -18 : 108, y, vx: (fromL ? 1 : -1) * (14 + Math.random() * 10), ph: Math.random() * 6, good, it };
      el.style.left = o.x + '%'; el.style.top = o.y + '%'; F.appendChild(el); st.items.push(o);
      el.onclick = () => {
        if (st.done || o.gone) return;
        if (good) { o.gone = true; got++; st.caught.add(it.t); el.classList.add('caught'); SND.play('good'); const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = it.t; document.getElementById('catBag').appendChild(chip); document.getElementById('catN').textContent = `${got} / ${d.need}`; msg(it.ok || '잡았다!', 'ok'); setTimeout(() => el.remove(), 300); if (got >= d.need) { st.items.forEach(x => x.el.remove()); finish(d.win); } }
        else { el.classList.add('bad'); SND.play('bad'); msg(it.why || d.badMsg, 'bad'); }
      };
    };
    st.items = []; st.caught = new Set();
    const loop = now => {
      if (!st || st.done) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      spawnT -= dt; if (spawnT <= 0) { spawnT = d.every || 0.9; spawn(); }
      for (const o of st.items) { if (o.gone) continue; o.x += o.vx * dt; o.ph += dt * 3; o.el.style.left = o.x + '%'; o.el.style.top = (o.y + Math.sin(o.ph) * 4) + '%'; if (o.x < -25 || o.x > 115) { o.gone = true; o.el.remove(); } }
      st.items = st.items.filter(o => !o.gone || o.el.isConnected);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  /* 지도 클릭 : 지도 위 점 가운데 알맞은 곳 누르기 */
  function mapclick(d) {
    const pts = d.spots.map(p => ({ ...p, X: YMAP.px(p.lon), Y: YMAP.py(p.lat) }));
    const vb = d.vb || '330 150 372 260';
    frame(d, `<div class="mapc">${miniMapSVG(pts.map((p, i) => `<g class="mspot" data-i="${i}" transform="translate(${p.X},${p.Y})"><circle class="hit" r="14"/><circle class="dot" r="6"/><text y="-11">${esc(p.t)}</text></g>`).join(''), vb)}</div>`);
    const need = pts.filter(p => p.ok).length; let got = 0;
    st = { done: false, key(e) { if (st.done && e.code === 'Enter') close(); } };
    msg(d.start || `알맞은 곳을 눌러 보자. (0 / ${need})`);
    root().querySelectorAll('.mspot').forEach(g => g.addEventListener('click', () => {
      if (st.done || g.classList.contains('on')) return;
      const p = pts[+g.dataset.i];
      if (p.ok) { g.classList.add('on'); got++; SND.play('good'); if (got >= need) finish(d.win); else msg(`${p.say || '맞아!'} (${got} / ${need})`, 'ok'); }
      else { g.classList.add('no'); SND.play('bad'); msg(p.why || d.wrong, 'bad'); }
    }));
  }

  /* 여정 따라가기 : 버튼을 누를 때마다 다음 장소로 이동하며 이야기를 읽음 (틀릴 일 없음) */
  function travel(d) {
    const pts = d.stops.map(p => ({ ...p, X: YMAP.px(p.lon), Y: YMAP.py(p.lat) }));
    const path = pts.map(p => `${p.X},${p.Y}`).join(' ');
    frame(d, `<div class="trv"><div class="trv-map">${miniMapSVG(`<polyline class="trv-line" id="trvLine" points="${path}"/>${pts.map((p, i) => `<g class="tstop" id="ts${i}" transform="translate(${p.X},${p.Y})"><circle r="6"/><text y="-10">${esc(p.t)}</text></g>`).join('')}<g id="trvMk"><circle r="9" class="mk"/><text class="mkt" y="4">${esc(d.mark || '人')}</text></g>`, d.vb || '0 60 702 260')}</div>
      <div class="trv-side"><p class="trv-step" id="trvStep"></p><p class="trv-text" id="trvText"></p><button class="btn gold" id="trvGo">다음 장소로 ▶ <span class="kbd">Space</span></button></div></div>`);
    let i = 0;
    const mk = document.getElementById('trvMk');
    const place = () => {
      const p = pts[i]; mk.setAttribute('transform', `translate(${p.X},${p.Y})`); document.getElementById('ts' + i).classList.add('on');
      document.getElementById('trvStep').textContent = `${i + 1} / ${pts.length} · ${p.t}`; document.getElementById('trvText').textContent = p.say;
    };
    const next = () => {
      if (st.done) return close();
      i++; SND.play('tick');
      if (i >= pts.length) { finish(d.win); document.getElementById('trvGo').hidden = true; return; }
      place(); if (i === pts.length - 1) document.getElementById('trvGo').innerHTML = '여정 마치기 ✔ <span class="kbd">Space</span>';
    };
    st = { done: false, key(e) { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (st.done) close(); else next(); } } };
    document.getElementById('trvGo').onclick = next;
    msg(d.start || '버튼을 눌러 여정을 따라가 보자.'); place();
  }

  /* 길 잇기 : 버튼을 눌러 길을 하나씩 지도에 그리기 */
  function routes(d) {
    frame(d, `<div class="rts"><div class="rts-map">${miniMapSVG(d.lines.map((l, i) => `<polyline class="rts-line" id="rl${i}" style="--lc:${l.col}" points="${l.pts.map(([lo, la]) => `${YMAP.px(lo).toFixed(1)},${YMAP.py(la).toFixed(1)}`).join(' ')}"/>`).join('') + `<text class="rts-big" id="rtsBig" x="351" y="70">${esc(d.bigText)}</text>`)}</div>
      <div class="rts-btns">${d.lines.map((l, i) => `<button class="rts-b" data-i="${i}" style="--lc:${l.col}"><b>${esc(l.t)}</b><small>${esc(l.s)}</small></button>`).join('')}</div></div>`);
    let left = d.lines.length;
    st = { done: false, key(e) { if (st.done && e.code === 'Enter') close(); } };
    msg(d.start || '버튼을 눌러 길을 지도에 그려 보자.');
    root().querySelectorAll('.rts-b').forEach(b => b.onclick = () => {
      if (b.disabled) return; b.disabled = true; b.classList.add('on');
      const ln = document.getElementById('rl' + b.dataset.i); ln.classList.add('draw'); SND.play('good'); left--;
      msg(d.lines[+b.dataset.i].say, 'ok');
      if (left === 0) setTimeout(() => { document.getElementById('rtsBig').classList.add('on'); finish(d.win); }, 700);
    });
  }

  /* 6. 나침반 바늘 */
  function needle(d) {
    frame(d, `<div class="needle">
      <svg viewBox="-110 -110 220 220" class="bowl" aria-label="물그릇과 자석 바늘">
        <circle r="100" fill="#7fa99a"/><circle r="92" fill="#3f7a8a"/><circle r="84" fill="#5d9fb0"/>
        <text y="-66" class="dir">北</text><text y="78" class="dir">南</text><text x="-72" y="6" class="dir">西</text><text x="72" y="6" class="dir">東</text>
        <g id="ndl" transform="rotate(130)"><rect x="-14" y="-6" width="28" height="12" rx="5" fill="#b8925a"/><polygon points="0,-58 5,0 -5,0" fill="#e8e4da"/><polygon points="0,58 5,0 -5,0" fill="#c8352a"/><circle r="3" fill="#2a1a12"/></g>
      </svg>
      <div class="needle-side"><p>붉은 끝 = 바늘이 가리키는 쪽</p><button class="btn gold" id="nbtn">바늘을 물에 띄우기</button></div></div>`);
    st = { done: false, key(e) { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (st.done) close(); else if (!st.go) go(); } } };
    msg('나뭇조각 위에 바늘을 올려 물에 띄워 보자.');
    const go = () => {
      st.go = true; document.getElementById('nbtn').disabled = true; SND.play('tick');
      let a = 130, v = 0, t0 = performance.now();
      const loop = now => {
        const dt = Math.min(0.033, (now - t0) / 1000); t0 = now;
        v += (-(a - 0) * 6) * dt; v *= Math.pow(0.12, dt); a += v * dt * 10;
        const g = document.getElementById('ndl'); if (!g) return;
        g.setAttribute('transform', `rotate(${a.toFixed(2)})`);
        if (Math.abs(a) < 0.6 && Math.abs(v) < 0.6) { g.setAttribute('transform', 'rotate(0)'); finish('바늘이 스스로 돌아 남(南)과 북(北)을 가리켰다! 붉은 끝이 가리키는 곳이 남쪽.'); return; }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    document.getElementById('nbtn').onclick = go;
  }

  return {
    start(id, done) { cb = done; const d = MGDATA[id]; ({ timing, sort, blanks, order, match, needle, pick, jigsaw, swipe, catch: catchGame, mapclick, travel, routes })[d.type](d); },
    key(e) { if (st && st.key) st.key(e); },
    get active() { return active; },
  };
})();
