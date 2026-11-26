/* =====================================================================
   모바일 · 터치 조작 : 왼쪽 가상 조이스틱 + 오른쪽 버튼 (공격 · 스킬 · 대화 · 무기 · 탕약)
   - 터치 화면에서만 나타난다. 대화 · 퀴즈 · 미니게임은 원래대로 화면을 눌러 진행
   ===================================================================== */
(() => {
  const isTouch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  let on = false;
  const stage = $('stage');

  const pad = document.createElement('div'); pad.id = 'tpad'; pad.hidden = true;
  pad.innerHTML = `<div class="tj" id="tJoy"><div class="tj-knob" id="tKnob"></div></div>
    <div class="tb-wrap">
      <button class="tb tb-sm" data-k="KeyC" aria-label="탕약"><i class="sh-ic ic-potion"></i></button>
      <button class="tb tb-sm" data-k="KeyQ" aria-label="무기 바꾸기">⇄</button>
      <button class="tb tb-talk" data-k="Space" aria-label="대화 · 조사">대화</button>
      <button class="tb tb-sk" data-k="KeyX" aria-label="스킬">스킬</button>
      <button class="tb tb-atk" data-k="KeyZ" aria-label="공격">공격</button>
    </div>`;
  stage.appendChild(pad);
  const rot = document.createElement('div'); rot.id = 'rotate'; rot.hidden = true;
  rot.innerHTML = '<div><span class="rot-ic">⟳</span><p>휴대폰을 가로로 돌려 주세요</p></div>';
  document.body.appendChild(rot);

  // 설정의 조작 모드 : 자동(터치 화면이면 모바일) · PC · 모바일
  let touched = false;
  function applyCtrlMode() {
    let m = 'auto'; try { m = localStorage.getItem('cheonha-ctrl') || 'auto'; } catch (e) { }
    on = m === 'mobile' || (m === 'auto' && (isTouch() || touched));
    document.body.classList.toggle('touch', on);
  }
  window.applyCtrlMode = applyCtrlMode;
  applyCtrlMode();
  window.addEventListener('touchstart', () => { touched = true; applyCtrlMode(); }, { once: true, passive: true });

  /* 조이스틱 */
  const joy = $('tJoy'), knob = $('tKnob');
  let jid = null, cx = 0, cy = 0;
  const setKeys = (dx, dy) => {
    const m = Math.hypot(dx, dy), dead = 0.28;
    G.keys.l = dx < -dead; G.keys.r = dx > dead; G.keys.u = dy < -dead; G.keys.d = dy > dead;
    G.dash = m > 0.92;
    if (m > dead) G.target = null;
  };
  joy.addEventListener('pointerdown', e => {
    e.preventDefault(); jid = e.pointerId; joy.setPointerCapture(jid);
    const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e);
  });
  const move = e => {
    if (e.pointerId !== jid) return;
    const r = joy.getBoundingClientRect(), R = r.width / 2;
    let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    knob.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`;
    if (G.mode === 'play' && !G.overlay) setKeys(dx, dy);
  };
  joy.addEventListener('pointermove', move);
  const up = e => { if (e.pointerId !== jid) return; jid = null; knob.style.transform = ''; G.keys.l = G.keys.r = G.keys.u = G.keys.d = false; G.dash = false; };
  joy.addEventListener('pointerup', up); joy.addEventListener('pointercancel', up);

  /* 버튼 : 키보드 입력을 그대로 흉내 낸다 */
  pad.querySelectorAll('.tb').forEach(b => {
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); SND.unlock();
      b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 140);
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: b.dataset.k, key: b.dataset.k === 'Space' ? ' ' : b.dataset.k.slice(-1).toLowerCase(), bubbles: true }));
    });
  });

  /* 보이기 · 숨기기 , 세로 화면 안내 */
  setInterval(() => {
    const show = on && !!S && G.mode === 'play' && !G.overlay && !$('hud').hidden && !MG.active && !Quiz.active;
    pad.hidden = !show;
    if (show) {
      pad.querySelector('.tb-talk').classList.toggle('lit', !!G.near);
      const sk = pad.querySelector('.tb-sk'), R = window.RPG;
      sk.classList.toggle('off', !(R && R.skills && R.skills[R.wpn]));
    } else if (jid == null && on) { /* 조작창이 숨으면 이동 멈춤 */ }
    rot.hidden = true; // 세로 화면에서도 그대로 플레이
  }, 120);
})();
