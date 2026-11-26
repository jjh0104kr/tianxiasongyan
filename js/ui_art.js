/* =====================================================================
   ui_art.js : 결과창 · 챕터 선택 · 랭크 도장 그림을 원본 이미지에서 잘라 쓴다
   - 조각은 '연결된 픽셀 덩어리'를 따라 잘라서 옆 조각이 섞이지 않게 한다
   ===================================================================== */
const UIART = (() => {
  const out = { ready: false, rank: {}, res: {}, cards: [] };
  const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const toCanvas = im => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); return c; };

  // 씨앗 점에서 이어진 불투명 픽셀만 골라 잘라 낸다 (allow 로 영역을 더 좁힐 수 있음)
  function piece(src, sx, sy, allow, pad = 2) {
    const W = src.width, H = src.height, d = src.getContext('2d').getImageData(0, 0, W, H).data;
    const mark = new Uint8Array(W * H), st = [sy * W + sx];
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    while (st.length) {
      const k = st.pop(); if (mark[k]) continue;
      const x = k % W, y = (k / W) | 0;
      if (d[k * 4 + 3] < 8 || (allow && !allow(x, y))) continue;
      mark[k] = 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0) st.push(k - 1); if (x < W - 1) st.push(k + 1); if (y > 0) st.push(k - W); if (y < H - 1) st.push(k + W);
    }
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d'), id = cx.createImageData(w, h);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const k = y * W + x; let keep = mark[k];
      // 가장자리의 반투명 테두리(안티에일리어싱)도 함께 살린다
      if (!keep && d[k * 4 + 3] > 0 && d[k * 4 + 3] < 8 && (!allow || allow(x, y))) keep = (mark[k - 1] || mark[k + 1] || mark[k - W] || mark[k + W]);
      if (!keep) continue;
      const o = ((y - y0) * w + (x - x0)) * 4; id.data[o] = d[k * 4]; id.data[o + 1] = d[k * 4 + 1]; id.data[o + 2] = d[k * 4 + 2]; id.data[o + 3] = d[k * 4 + 3];
    }
    cx.putImageData(id, 0, 0);
    return { url: c.toDataURL('image/png'), w, h };
  }

  // 챕터 카드 그림 : 바탕에 구워진 회색 체크무늬를 가장자리부터 지운다
  function clearChecker(c) {
    const W = c.width, H = c.height, x = c.getContext('2d'), id = x.getImageData(0, 0, W, H), d = id.data;
    const bg = i => { const r = d[i], g = d[i + 1], b = d[i + 2]; return Math.max(r, g, b) - Math.min(r, g, b) < 16 && r > 120; };
    const seen = new Uint8Array(W * H), st = [];
    for (let i = 0; i < W; i++) st.push(i, (H - 1) * W + i);
    for (let i = 0; i < H; i++) st.push(i * W, i * W + W - 1);
    while (st.length) {
      const k = st.pop(); if (seen[k] || !bg(k * 4)) continue; seen[k] = 1; d[k * 4 + 3] = 0;
      const kx = k % W, ky = (k / W) | 0;
      if (kx > 0) st.push(k - 1); if (kx < W - 1) st.push(k + 1); if (ky > 0) st.push(k - W); if (ky < H - 1) st.push(k + W);
    }
    x.putImageData(id, 0, 0); return c;
  }

  out.load = (async () => {
    try {
      const [res, rk, cd] = await Promise.all(['img/ui_result.webp', 'img/ui_ranks.webp', 'img/ui_cards.webp'].map(load));
      const R = toCanvas(res);
      // 위쪽 현수막과 랭크 · 점수 틀이 등불 술 부분에서 맞닿아 있어 경계를 나눠 자른다
      out.res.banner = piece(R, 760, 150, (x, y) => !(y >= 354 && x >= 240 && x <= 1300) && !(y >= 328 && y < 354 && x >= 290 && x <= 1250));
      out.res.rank = piece(R, 500, 420, (x, y) => y >= 328 && x < 770 && !(y < 356 && x < 290));
      out.res.score = piece(R, 1040, 420, (x, y) => y >= 328 && x > 770 && !(y < 356 && x > 1245));
      out.res.record = piece(R, 768, 590);
      // 오답 · 걸린 시간 틀과 아래 버튼은 희미한 테두리로 이어져 있어 y=835에서 나눈다
      out.res.wrong = piece(R, 480, 760, (x, y) => y < 835 && x < 770);
      out.res.time = piece(R, 1050, 760, (x, y) => y < 835 && x > 770);
      out.res.next = piece(R, 480, 912, (x, y) => y >= 835 && x < 770);
      out.res.camps = piece(R, 1050, 912, (x, y) => y >= 835 && x > 770);
      const K = toCanvas(rk);
      [['S', 388, 284], ['A', 797, 282], ['B', 1183, 283], ['C', 229, 748], ['D', 599, 748], ['E', 957, 749], ['F', 1322, 749]].forEach(([r, x, y]) => out.rank[r] = piece(K, x, y).url);
      // 챕터 카드 세 장은 구름 장식끼리 살짝 맞닿아 있어 x=519 · 1018에서 나눈다
      const Cv = toCanvas(cd), cut = [0, 519, 1018, 9999];
      [260, 770, 1270].forEach((sx, i) => out.cards.push(piece(Cv, sx, 600, x => x >= cut[i] && x < cut[i + 1])));
      out.ready = true;
    } catch (e) { console.warn('UI art', e); }
  })();
  return out;
})();
