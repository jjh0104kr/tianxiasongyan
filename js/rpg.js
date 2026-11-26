/* =====================================================================
   천하상단 RPG 확장 : 돈(냥) · 약초 상인 · 무기 상인 · 무기 4종 · X 스킬 · 서브 퀘스트 · 역사 훈장 퀴즈
   - 돈 · 무기 · 스킬 · 약초는 세 편이 함께 쓴다 (진행 기록에 저장)
   ===================================================================== */
(() => {
  /* ---------------- 공용 저장 ---------------- */
  const R = Object.assign({ money: 0, potions: 0, wpn: 'brush', owned: { brush: 1 }, skills: {} }, loadProg().rpg || {});
  const saveR = () => { const p = loadProg(); p.rpg = R; saveProg(p); };
  window.RPG = R;
  window.resetRPG = () => { for (const k of Object.keys(R)) delete R[k]; Object.assign(R, { money: 0, potions: 0, wpn: 'brush', owned: { brush: 1 }, skills: {} }); G.skCd = {}; syncHud(true); };

  const WPN = {
    brush: { n: '붓', range: 30, dmg: 1, cd: 0.32, sk: { id: 'brush', n: '묵향 회오리', cd: 6, d: '붓을 크게 휘둘러 주위의 먹물 그림자를 모두 밀쳐 낸다 (주변 전체 공격)' } },
    bow: { n: '활', range: 170, dmg: 0.5, cd: 0.4, sk: { id: 'bow', n: '화살비', cd: 6, d: '앞쪽으로 화살 다섯 대를 부채꼴로 한꺼번에 쏜다' } },
    sword: { n: '검', range: 30, dmg: 2, cd: 0.34, sk: { id: 'sword', n: '질풍 베기', cd: 7, d: '앞으로 순식간에 돌진하며 길 위의 적을 모두 벤다 (돌진 중 무적)' } },
    spear: { n: '창', range: 44, dmg: 1, cd: 0.34, sk: { id: 'spear', n: '용 찌르기', cd: 6, d: '창을 길게 내질러 일직선 위의 적을 모두 꿰뚫는다' } },
  };
  const ORDER = ['brush', 'bow', 'sword', 'spear'];
  // 상점 하나 : 약초 상인 + 무기 상인 (화면 위 '상점' 버튼으로 언제든 열기)
  const SHOP_ITEMS = [
    { id: 'potion', t: '약초 탕약', d: '마시면 체력 ♥ +1 · 필드에서 C 키', price: 15 },
    { id: 'bow', t: '활', d: '사거리가 아주 길다 · 공격력은 붓보다 약함', price: 300 },
    { id: 'spear', t: '창', d: '사거리가 붓보다 조금 길다 · 공격력은 붓과 같음', price: 300 },
    { id: 'sword', t: '검', d: '사거리는 붓과 같다 · 공격력이 붓의 두 배', price: 300 },
  ];
  const KILL_PAY = { ink: 4, fast: 5, shooter: 6, tank: 9, boss: 30 };

  /* ---------------- 사이드 대화 : 원래 있던 조연들에게 다시 말을 걸면 ----------------
     · 돈 문제 : 역사 문제 하나 (맞히면 10냥, 기회는 한 번)
     · 비법 시험 : 문제 세 개를 모두 맞히면 무기 스킬 (틀리면 언제든 다시 도전)
     메인 스토리 대화를 한 번 마친 뒤에만 나오고, 이야기 진행에는 영향을 주지 않는다 */
  const Q = (q, a, w, x) => ({ q, a, w, x });
  // [말하는 사람, 앞 대화에서 이어지는 한마디, 질문, 정답, 오답들, 정답 뒤 한마디]
  const SQ = (spk, lead, q, a, w, x) => [spk, { lead, q, a, w, x }];
  const SIDE_QUIZ = {
    'kf_street.kid1': SQ('kid1', '그럼 똑똑한지 시험해 볼래요? 맞히면 내 엿값 줄게요!', '송나라를 세운 사람은 누구게요?', '조광윤', ['왕안석', '칭기즈 칸'], '헤헤, 진짜 똑똑하네!'),
    'kf_exam.ma': SQ('ma', '...괜찮소. 미안하면 공부나 좀 도와주시오. 맞히면 노잣돈을 드리리다.', '황제가 직접 치르는 마지막 시험은?', '전시', ['해시', '성시'], '그렇지! 해시, 성시, 그리고 전시!'),
    'border_late.oldm': SQ('oldm', '장사하는 젊은이들이면 하나 물어보세. 맞히면 남은 노잣돈을 좀 나눠 주지.', '우리를 여기까지 밀어낸 여진족의 나라를 아는가?', '금', ['요', '원'], '그래, 금나라라네...'),
    'kf_office.peti': SQ('peti', '젊은이들, 관청 사정 좀 아오? 하나만 물읍시다. 알려 주면 사례하리다.', '그 새 법을 반대하는 관리들은 뭐라고 부르오?', '보수파', ['개혁파', '절도사'], '보수파라... 높은 분들 싸움이구먼.'),
    'kf_market.boat': SQ('boat', '배 타려면 뱃삯부터 알아야지! 이거 맞히면 오히려 내가 삯을 쳐 주리다.', '뱃삯으로도 받는 송나라의 종이 돈은?', '교자', ['교초', '세폐'], '교자! 무거운 동전 대신이지.'),
    'kf_market.kid2': SQ('kid2', '나 퀴즈도 낼 수 있다! 맞히면 엽전 줄게!', '그 공연을 하는 무대 이름이 뭐게?', '구란', ['서원', '역참'], '맞아, 구란! 난간 두른 무대!'),
    'kf_workshop.kwak': SQ('kwak', '허허, 아가씨 말이 맞소. 그럼 하나 맞혀 보시오. 맞히면 품삯을 드리지.', '필승이 진흙으로 하나씩 만든 글자 조각을 뭐라 하오?', '활자', ['교자', '나침반'], '활자! 그걸 조합하는 게 활판 인쇄술이오.'),
    'port.kim': SQ('kim', '허허, 잘 아는구려. 그럼 이것도 아시오? 맞히면 인삼 값을 쳐 드리지.', '배가 이 항구를 드나들려면 어느 관청의 허락을 받아야 하오?', '시박사', ['역참', '군기감'], '시박사 허락 없인 배가 못 뜨지요.'),
    'linan.kid3': SQ('kid3', '누나, 형! 연 받았으니까 내 문제 하나 풀어 줘요. 맞히면 내 용돈 줄게요!', '금나라에 밀려 남쪽으로 내려온 송을 뭐라고 불러요?', '남송', ['북송', '후송'], '맞아요! 여기 임안이 남송의 수도예요.'),
    'y_steppe.elder': SQ('melder', '허허, 기록을 아끼는 젊은이들이로군. 하나만 물어보세. 맞히면 여비를 주지.', '부족을 하나로 모은 테무친은 훗날 어떤 칭호로 불리게 될까?', '칭기즈 칸', ['쿠빌라이 칸', '조광윤'], '칭기즈 칸... 좋은 이름이로군.'),
    'y_camp.herd': SQ('herd', '헤헤, 수상해~ 그럼 이거 맞히면 믿어 줄게요! 엽전도 줄게요.', '칸의 자손들이 각자 다스리는 땅과 사람을 뭐라고 해요?', '울루스', ['와자', '역참'], '울루스! 우리 아버지가 그랬어요.'),
    'y_dadu.hasa': SQ('hasa', '...아, 가기 전에 하나만. 시험 준비 삼아 묻겠소. 맞히면 사례하리다.', '이 나라의 수도, 이 성의 이름은?', '대도', ['임안', '카이펑'], '대도, 훗날 베이징이라 불릴 곳이오.'),
    'y_office.ali': SQ('ali', '그 전에 셈 빠른 사람인지 하나 봅시다. 맞히면 수고비를 드리지.', '우리처럼 서역에서 와 재정을 맡은 사람들을 뭐라 부르오?', '색목인', ['남인', '한인'], '색목인! 여러 지역에서 온 사람들이란 뜻이오.'),
    'y_market.cotton': SQ('cotton', '이 면포를 사려면 돈부터 아셔야죠. 맞히면 덤을 얹어 드리지요.', '원나라에서 쓰는 지폐 이름은?', '교초', ['교자', '세폐'], '교초! 교자는 송나라 돈이고요.'),
    'y_market.music': SQ('music', '띵~ 귀가 밝구먼! 그럼 이것도 맞혀 보게. 맞히면 공연 수고비를 나눠 주지.', '노래와 연극이 어우러진 이 공연의 이름은?', '잡극', ['탈춤', '가부키'], '잡극이지! 반주는 내 몫이고.'),
    'y_hangzhou.port': SQ('yport', '바닷길 이야기가 나왔으니 하나 묻겠소. 맞히면 통행세를 돌려 드리지.', '원나라도 큰 항구마다 두어 무역을 관리한 관청은?', '시박사', ['역참', '대운하'], '송나라 때처럼 시박사가 맡는다오.'),
    'y_city.astro': SQ('astro', '허허, 기술이 오가듯 하늘의 지식도 오갔지. 문제 하나 내리다. 맞히면 사례하겠소.', '곽수경 공께서 만드신 달력의 이름은?', '수시력', ['태음력', '그레고리력'], '수시력이오. 이슬람 천문학도 큰 도움이 되었지.'),
    'y_final.oldw': SQ('oldw', '젊은이들이 똑똑하구먼. 이 늙은이 물음에도 답해 보게. 맞히면 쌈짓돈을 주지.', '요즘 붉은 두건을 두르고 들고일어난 무리를 뭐라 부르던가?', '홍건적', ['황건적', '여진족'], '홍건적... 세상이 뒤숭숭하구먼.'),
  };  const SIDE_SKILL = {
    'border.look': { spk: 'look', sk: 'bow', intro: '그래도 먹물 그림자가 나오면 싸워야겠지. 국경 이야기를 맞히면 내 활 비법을 알려 주마.', qs: [
      Q('송과 대립한 거란족의 나라는?', '요', ['금', '원']), Q('송이 평화를 위해 요에 보낸 비단과 은은?', '세폐', ['교자', '조공미']), Q('거란이 차지한 산 너머 땅은?', '연운 16주', ['강남', '취안저우'])] },
    'kf_market.hong': { spk: 'hong', sk: 'sword', intro: '호호, 배짱이라면 제 검무도 지지 않아요. 와자 이야기를 맞히면 검무 비법을 알려 드릴게요.', qs: [
      Q('송나라 도시의 오락 거리는?', '와자', ['역참', '서원']), Q('와자 안의 전문 공연장은?', '구란', ['군기감', '시박사']), Q('와자가 번성한 까닭은?', '서민의 생활 수준이 높아져서', ['귀족만 즐겨서', '전쟁이 많아서'])] },
    'port.sailor': { spk: 'sailor', sk: 'spear', intro: '바다에선 바람만큼 작살 솜씨도 중요하지. 바다 이야기를 맞히면 내 작살 비법을 알려 주마.', qs: [
      Q('흐린 날 바다에서 길을 알려 주는 송의 발명품은?', '나침반', ['화약', '활자']), Q('송에서 무역을 관리한 관청은?', '시박사', ['역참', '군기감']), Q('송 때 동아시아와 인도양을 잇던 교역권은?', '동아시아·인도양 교역권', ['초원길 교역권', '지중해 교역권'])] },
    'kf_workshop.lim': { spk: 'lim', sk: 'brush', intro: '기분 좋은 김에, 학문 이야기를 맞히면 붓으로 먹을 휘감는 묘법을 알려 드리리다.', qs: [
      Q('남송의 주희가 집대성한 학문은?', '성리학', ['실학', '불교']), Q('송나라 때 학문과 교육을 하던 곳은?', '서원', ['구란', '역참']), Q('성리학이 훗날 된 것은?', '동아시아 여러 나라의 통치 이념', ['상인의 장부 규칙', '군대의 훈련법'])] },
    'y_steppe.herd': { spk: 'herd', sk: 'bow', intro: '맞아요! 그 활 솜씨, 문제 맞히면 나도 알려 줄게요!', qs: [
      Q('몽골 부족을 통일한 사람의 원래 이름은?', '테무친', ['쿠빌라이', '바투']), Q('칭기즈 칸으로 추대된 해는?', '1206년', ['1271년', '1368년']), Q('몽골군이 강했던 까닭은?', '강력한 기마병', ['거대한 함대', '화약 무기'])] },
    'y_camp.envoy': { spk: 'envoy', sk: 'sword', intro: '이 끈처럼 내 검도 바람처럼 휘지요. 제국 이야기를 맞히면 그 검술을 알려 드리리다.', qs: [
      Q('칸의 자손들이 각자 다스린 땅은?', '울루스', ['와자', '서원']), Q('몽골 제국은 어떤 형태로 유지되었나?', '느슨한 연합', ['하나의 중앙 집권 국가', '도시 국가 동맹']), Q('울루스를 다스린 사람들은?', '칭기즈 칸의 자손들', ['송의 황족', '이슬람 상인'])] },
    'y_market.book': { spk: 'bookm', sk: 'brush', intro: '그 이야기들, 다 붓끝에서 나온다오. 시장 이야기를 맞히면 내 붓놀림 비법을 알려 드리지.', qs: [
      Q('원나라에서 널리 쓰인 지폐는?', '교초', ['교자', '세폐']), Q('원나라 때 생산이 늘어 면직물이 발달한 작물은?', '목화', ['차', '사탕수수']), Q('원나라에서 크게 유행한 공연은?', '잡극', ['탈춤', '판소리'])] },
    'y_city.monk': { spk: 'monk', sk: 'spear', intro: '여러 사람이 모이니 지혜도 모이지요. 이 거리 이야기를 맞히면 제 봉술 비법을 알려 드리리다.', qs: [
      Q('『동방견문록』을 남긴 사람은?', '마르코 폴로', ['이븐 바투타', '곽수경']), Q('원나라에 전해진 종교가 아닌 것은?', '성리학', ['이슬람교', '크리스트교']), Q('14세기에 중국을 찾은 이슬람 여행가는?', '이븐 바투타', ['마르코 폴로', '칭기즈 칸'])] },
  };
  const PAY = { rec: 5, quiz: 5, mg: 5 };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sideKey = (aid, id) => aid + '.' + id;
  function sideScript(aid, e) {
    const k = sideKey(aid, e.id);
    const sq = SIDE_QUIZ[k];
    if (sq && !has('bq_' + k)) {
      const [spk, q] = sq;
      const ask = (opts, pay) => ({ choice: shuffle(opts).map(o => ({ t: o, s: [['me', o], ...(o === q.a
        ? [[spk, `맞아요! ${q.x}`], { flag: 'bq_' + k }, { money: pay, why: '' }]
        : opts.length > 2 ? [[spk, '아니에요. 다시 골라 봐요.'], ask(opts.filter(x => x !== o), Math.max(5, Math.round(pay / 2)))]
        : [[spk, `정답은 ${q.a}! ${q.x}`], { flag: 'bq_' + k }])] })) });
      return [[spk, q.lead], [spk, q.q], ask([q.a, ...q.w], 20)];
    }    const ss = SIDE_SKILL[k];
    if (ss && !has('sk_' + k)) {
      const w = WPN[ss.sk];
      const ask = i => {
        if (i >= ss.qs.length) return [[ss.spk, `세 문제 모두 맞혔구려! 약속대로 비법 「${w.sk.n}」을 알려 드리지.`], { flag: 'sk_' + k }, { skill: ss.sk }];
        const q = ss.qs[i];
        return [[ss.spk, `${i + 1}번째 문제. ${q.q}`], { choice: shuffle([q.a, ...q.w]).map(o => ({ t: o, s: [['me', o], ...(o === q.a ? ask(i + 1) : [[ss.spk, '틀렸소! 공부하고 다시 도전하시오. 언제든 기다리겠소.']])] })) }];
      };
      return [[ss.spk, ss.intro], [ss.spk, `문제는 세 개. 모두 맞히면 **${w.sk.n}**!`],
        { choice: [{ t: '도전할게요!', s: [['me', '도전할게요!'], ...ask(0)] }, { t: '다음에 할게요.', s: [['me', '다음에 할게요.']] }] }];
    }
    return null;
  }
  // 메인 대화를 한 번 마친 조연에게만 붙인다 (대화 키가 이미 본 것 · _r · 배열)
  const mainDone = tk => typeof tk === 'string' ? !!((S.seen && S.seen[tk]) || /_r$/.test(tk)) : Array.isArray(tk);
  function hookSide() {
    for (const k of new Set([...Object.keys(SIDE_QUIZ), ...Object.keys(SIDE_SKILL)])) {
      const [aid, id] = k.split('.'); const A = AREAS[aid]; if (!A) continue;
      const e = A.ents.find(x => x.id === id && x.k === 'npc'); if (!e || e._side) continue;
      e._side = true; const base = e.talk;
      e.sideOn = () => { const tk = typeof base === 'function' ? base() : base; return mainDone(tk) && !!sideScript(aid, e); };
      e.talk = () => {
        const tk = typeof base === 'function' ? base() : base;
        if (mainDone(tk)) { const s = sideScript(aid, e); return s || tk; }
        // 처음 나누는 메인 대화 : 대화가 끝나면 그대로 이어서 문제를 낸다
        const main = typeof tk === 'string' && !/wait|lock|0$/.test(tk) ? SC[tk] : null;
        if (Array.isArray(main) && !main.some(c => c && !Array.isArray(c) && (c.go || c.map || c.ending || c.campDone))) {
          const s = sideScript(aid, e); if (s) return [...main, { seenKey: tk }, ...s];
        }
        return tk;
      };
    }
  }
  /* ---------------- 늘어난 먹물 그림자 (처치하면 돈) ---------------- */
  const TOWNS = {
    kf_street: ['ink', 'ink'], border: ['fast', 'ink'], border_late: ['ink', 'shooter'], kf_market: ['ink', 'fast', 'ink'],
    port: ['shooter', 'ink'], linan: ['tank', 'fast'],
    y_steppe: ['fast', 'ink'], y_camp: ['ink', 'shooter'], y_dadu: ['ink', 'fast'], y_market: ['shooter', 'ink', 'fast'],
    y_post: ['fast', 'tank'], y_city: ['shooter', 'ink'], y_final: ['tank', 'fast'],
  };
  SPK.herbS = { n: '약초 상인', look: 'ha' };
  SPK.wpnS = { n: '무기 상인', look: 'wi' };

  function placeAll() {
    for (const [aid, foes] of Object.entries(TOWNS)) {
      const A = AREAS[aid]; if (!A || A._rpg || A.onClear) continue; A._rpg = true;
      const used = [], dir = A.spawn[0] < A.L / 2 ? 1 : -1;
      const spot = (d0, gap = 30) => {
        for (let d = d0; d <= A.L; d += 6) {
          const x = Math.round(A.spawn[0] + dir * d);
          if (x < 30 || x > A.L - 30) continue;
          if (A.ents.every(e => Math.abs(e.x - x) >= gap) && used.every(u => Math.abs(u - x) >= gap)) { used.push(x); return x; }
        }
        return null;
      };
      foes.forEach((kind, i) => { const fx = spot(360 + i * 150); if (fx != null) A.ents.push({ id: 'rpg_f' + i, k: 'foe', kind, x: fx, y: 190 + (i % 3) * 22 }); });
    }
  }
  /* ---------------- 돈 ---------------- */
  function addMoney(n, why, x, y) {
    R.money += n; saveR(); syncHud(true);
    if (x != null) G.rpgFloat.push({ x, y, t: 0, txt: `+${n}냥` });
    else moneyPop(n);
    SND.play('tick');
  }
  window.addMoney = addMoney;
  function moneyPop(n) {
    const el = document.createElement('span'); el.className = 'rh-gain'; el.textContent = `+${n}`;
    $('stage').appendChild(el); setTimeout(() => el.remove(), 1300);
  }

  /* ---------------- 상점 : 약초 상인 + 무기 상인 (화면 위 '상점' 버튼) ---------------- */
  const shopEl = document.createElement('div'); shopEl.id = 'shop'; shopEl.className = 'ov'; shopEl.hidden = true; $('stage').appendChild(shopEl);
  let shopCtx = null;
  function openShop(next) {
    if (shopCtx) return;
    shopCtx = { next }; G.overlay = 'shop'; G.keys = {}; shopEl.hidden = false; SND.play('open'); renderShop();
  }
  window.openShop = openShop;
  const skNote = id => `스킬: ${WPN[id].sk.n}${R.skills[id] ? ' (배움)' : ' (이야기 속 인물에게 배울 수 있음)'}`;
  function renderShop(msg) {
    const rows = SHOP_ITEMS.map((it, i) => {
      const owned = it.id !== 'potion' && R.owned[it.id];
      const btn = it.id === 'potion' || !owned ? `<button class="btn gold" data-i="${i}">사기 · ${it.price}냥 <span class="kbd">${i + 1}</span></button>`
        : R.wpn === it.id ? '<span class="sh-on">장착 중</span>' : `<button class="btn" data-i="${i}">장착하기 <span class="kbd">${i + 1}</span></button>`;
      return `<li><i class="sh-ic ic-${it.id}"></i><div><b>${it.t}</b><small>${it.d}</small><em>${it.id === 'potion' ? `가진 탕약 ${R.potions}첩` : skNote(it.id)}</em></div>${btn}</li>`;
    });
    const brush = `<li><i class="sh-ic ic-brush"></i><div><b>붓 (기본 무기)</b><small>사거리·공격력 보통 · 먹물탄을 튕겨 낼 수 있다</small><em>${skNote('brush')}</em></div>${R.wpn === 'brush' ? '<span class="sh-on">장착 중</span>' : '<button class="btn" data-i="b">장착하기 <span class="kbd">0</span></button>'}</li>`;
    shopEl.innerHTML = `<div class="shop-panel" role="dialog" aria-label="상점"><header><canvas class="sh-pt" width="26" height="26" data-look="ha"></canvas><canvas class="sh-pt" width="26" height="26" data-look="wi"></canvas>
      <div><p class="eyebrow">약초 상인 · 무기 상인</p><h2>천하 상점</h2></div><p class="sh-money">가진 돈 <b>${R.money}냥</b></p></header>
      <p class="sh-sec">약초</p><ul class="sh-list">${rows[0]}</ul>
      <p class="sh-sec">무기</p><ul class="sh-list">${brush}${rows.slice(1).join('')}</ul>
      <p class="sh-msg">${msg || '&nbsp;'}</p><button class="btn" id="shopX">나가기 <span class="kbd">Esc</span></button></div>`;
    shopEl.querySelectorAll('canvas[data-look]').forEach(cv => { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; ART.portrait(x, cv.dataset.look); });
    shopEl.querySelectorAll('[data-i]').forEach(b => b.onclick = () => buy(b.dataset.i));
    $('shopX').onclick = closeShop;
  }
  function buy(i) {
    if (i === 'b') { R.wpn = 'brush'; saveR(); SND.play('tick'); syncHud(true); return renderShop('붓을 들었다.'); }
    const it = SHOP_ITEMS[+i]; if (!it) return;
    if (it.id !== 'potion' && R.owned[it.id]) { R.wpn = it.id; saveR(); SND.play('tick'); syncHud(true); return renderShop(`${it.t}을 들었다.`); }
    if (R.money < it.price) { SND.play('bad'); return renderShop(`돈이 모자라요! (${it.price - R.money}냥 더 필요) 이야기를 진행하며 퀴즈와 미션을 해내고, 먹물 그림자를 물리치면 돈이 모여요.`); }
    if (it.id === 'potion' && R.potions >= 9) { SND.play('bad'); return renderShop('탕약은 9첩까지만 들고 다닐 수 있어요.'); }
    R.money -= it.price;
    if (it.id === 'potion') { R.potions++; SND.play('good'); saveR(); syncHud(true); return renderShop('약초 탕약을 샀다! 필드에서 C 키로 마시면 체력이 1 회복된다.'); }
    R.owned[it.id] = 1; R.wpn = it.id; saveR(); SND.play('win'); syncHud(true);
    renderShop(`${it.t}을 사서 바로 장착했다! 필드에서 Q 키로 무기를 바꿀 수 있다.`);
  }
  function closeShop() {
    if (!shopCtx) return; const n = shopCtx.next; shopCtx = null;
    shopEl.hidden = true; shopEl.innerHTML = ''; G.overlay = null; n && n();
  }
  window.addEventListener('keydown', e => {
    if (!shopCtx) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') return closeShop();
    const n = parseInt(e.key, 10);
    if (n === 0) buy('b'); else if (n >= 1 && n <= SHOP_ITEMS.length) buy(String(n - 1));
  }, true);
  // 화면 위 HUD에 '상점' 버튼
  const shopBtn = document.createElement('button'); shopBtn.className = 'hud-btn hud-shop'; shopBtn.id = 'hudShop'; shopBtn.title = '상점'; shopBtn.innerHTML = '<i class="sh-ic ic-potion"></i>상점';
  $('hudSet').before(shopBtn);
  shopBtn.onclick = () => { if (G.mode === 'play' && !G.overlay && !MG.active && !Quiz.active) { shopBtn.classList.remove('hint'); openShop(); } else toast('대화나 미션이 끝난 뒤에 상점을 열 수 있어요.'); };

  /* ---------------- 스크립트 명령 추가 : shop · money · skill ---------------- */
  const _exec = exec;
  exec = function (c, next) {
    if (c && !Array.isArray(c)) {
      if (c.shop) { hideDialog(); return openShop(next); }
      if (c.money) { addMoney(c.money, c.why); return next(); }
      if (c.seenKey) { (S.seen = S.seen || {})[c.seenKey] = 1; save(); return next(); }
      if (c.skill) return learnSkill(c.skill, next);
    }
    return _exec(c, next);
  };
  function learnSkill(id, next) {
    const w = WPN[id], sk = w.sk;
    if (R.skills[id]) { addMoney(30, '이미 아는 비법이라 여비로 받았다'); return next(); }
    R.skills[id] = 1; saveR(); SND.play('rec'); hideDialog();
    skillPop(id, next);
  }
  function skillPop(id, next) {
    const w = WPN[id], el = $('guide');
    el.innerHTML = `<div class="guide-card sk-card" role="dialog" aria-label="새 스킬"><i class="sk-ic sk-${id}"></i><p class="sk-new">새 스킬</p><h3>${w.sk.n}</h3><p class="sk-how">${w.n} · <span class="kbd">X</span></p><button class="btn gold" id="guideGo">확인</button></div>`;
    el.hidden = false; G.overlay = 'guide';
    const go = () => { el.hidden = true; el.innerHTML = ''; G.overlay = null; G.guideClose = null; next(); };
    $('guideGo').onclick = go; G.guideClose = go;
  }
  /* ---------------- 이야기 진행 보상 : 기록 · 퀴즈 · 미션 ---------------- */
  const _giveRec = giveRec;
  giveRec = function (id, next) { const isNew = !S.recs.includes(id); _giveRec(id, () => { if (isNew) addMoney(PAY.rec, '교역 기록 복원 보상'); next(); }); };
  const _qopen = Quiz.open;
  Quiz.open = function (id, next) {
    const had = S.quiz[id];
    _qopen.call(Quiz, id, () => {
      if (had || !S.quiz[id]) return next();
      const tries = (S.qtries && S.qtries[id]) || 1;
      addMoney(Math.max(1, PAY.quiz - (tries - 1) * 2), '퀴즈 정답'); next();
    });
  };
  const _mgstart = MG.start;
  MG.start = function (id, done) {
    _mgstart.call(MG, id, () => {
      addMoney(PAY.mg, '미션 완료'); done();
    });
  };

  /* ---------------- 처음 마을에 들어서면 약초 상인 · 무기 상인이 안내 ---------------- */
  const SHOP_GUIDE = [
    ['herbS', '견습 상인들! 약초랑 무기가 필요하면 위의 **상점** 버튼을 누르시오.'],
    ['wpnS', '탕약은 C, 무기 바꾸기는 Q, 스킬은 X요.'],
    ['herbS', '돈은 기록 · 미션 · 퀴즈, 그리고 먹물 그림자를 잡으면 모이지.'],
    ['wpnS', '말풍선 뜬 사람한테 말 걸어 보시오. 문제를 맞히면 비법도 알려 줄 거요.'],
  ];  function maybeShopGuide() {
    if (R.guided || !S || !G.area || G.mode !== 'play' || G.overlay || RUN || /wh|warehouse/.test(S.area)) return;
    R.guided = 1; saveR();
    run(SHOP_GUIDE, () => { shopBtn.classList.add('hint'); });
  }
  /* ---------------- 전투 : 무기별 공격 ---------------- */
  G.arrows = []; G.rpgFx = []; G.rpgFloat = []; G.skCd = {}; G.sdash = null;
  function damageFoe(f, dmg, dir) {
    if (f.dead) return;
    const old = f.hp; let nh = old - dmg;
    const ph = f.e.phases;
    if (ph) { const ks = Object.keys(ph).map(Number).filter(k => k < old && k >= nh && !has(`bp_${S.area}_${k}`)).sort((a, b) => b - a); if (ks.length) nh = ks[0]; }
    f.hp = Math.round(nh * 10) / 10; f.hit = 0.15; f.vx = dir * FOE_KIND[kindOf(f)].kb; f.dash = 0; SND.play('hit'); G.shake = 0.12;
    if (f.hp <= 0) { f.hp = 0; killFoe(f); } else checkPhase(f);
  }
  function melee(range, dmg, yPad = 10, x0off = 2) {
    const P = G.P, x0 = Math.min(P.x + P.face * x0off, P.x + P.face * range), x1 = Math.max(P.x + P.face * x0off, P.x + P.face * range);
    for (const f of G.foes) {
      if (f.dead) continue;
      const r = hitR(f);
      if (f.x + r < x0 || f.x - r > x1 || Math.abs(f.y - P.y) > r + yPad) continue;
      damageFoe(f, dmg, P.face);
    }
    for (const s of G.shots) if (s.x >= x0 - 4 && s.x <= x1 + 4 && Math.abs(s.y - P.y) < 18) s.life = 0;
  }
  function fireArrow(vyk, dmg) { const P = G.P; G.arrows.push({ x: P.x + P.face * 8, y: P.y - 12, vx: P.face * 260, vy: vyk * 260, life: 170 / 260, dmg, dir: P.face }); }
  attack = function () {
    if (G.atkCd > 0) return;
    const w = WPN[R.wpn] || WPN.brush;
    G.atkCd = w.cd; SND.play('swing');
    if (R.wpn === 'bow') { fireArrow(0, w.dmg); G.rpgFx.push({ k: 'bowpull', t: 0, life: 0.18 }); return; }
    G.atk = { t: 0 };
    melee(w.range, w.dmg);
    if (R.wpn === 'spear') G.rpgFx.push({ k: 'thrust', t: 0, life: 0.16, len: w.range });
    if (R.wpn === 'sword') G.rpgFx.push({ k: 'slash', t: 0, life: 0.2 });
  };
  function useSkill() {
    const id = R.wpn, w = WPN[id], sk = w.sk;
    if (!R.skills[id]) { toast(`${w.n} 스킬 「${sk.n}」은 아직 배우지 못했다. 머리 위에 말풍선이 뜬 마을 사람에게 비법 시험을 받아 보자!`); SND.play('bad'); return; }
    if ((G.skCd[id] || 0) > 0) { toast(`「${sk.n}」 다시 쓰려면 ${Math.ceil(G.skCd[id])}초!`); return; }
    G.skCd[id] = sk.cd; SND.play('flash'); G.shake = 0.2;
    const P = G.P;
    if (id === 'brush') {
      for (const f of G.foes) { if (f.dead) continue; const dx = f.x - P.x, dy = (f.y - P.y) * 1.6; if (Math.hypot(dx, dy) < 58 + hitR(f)) damageFoe(f, 2, dx >= 0 ? 1 : -1); }
      G.shots = G.shots.filter(s => Math.hypot(s.x - P.x, (s.y - P.y) * 1.6) > 64);
      G.rpgFx.push({ k: 'ring', t: 0, life: 0.45, x: P.x, y: P.y });
    } else if (id === 'bow') {
      [-0.28, -0.14, 0, 0.14, 0.28].forEach(v => fireArrow(v, 1));
      G.rpgFx.push({ k: 'bowpull', t: 0, life: 0.25 });
    } else if (id === 'sword') {
      G.sdash = { t: 0, dur: 0.2, dir: P.face, hit: new Set() }; G.inv = Math.max(G.inv, 0.35);
    } else if (id === 'spear') {
      melee(118, 2, 12, 0);
      G.rpgFx.push({ k: 'dragon', t: 0, life: 0.35, len: 118 });
    }
  }
  const _killFoe = killFoe;
  killFoe = function (f) { const k = kindOf(f); const pay = f.e.temp ? 2 : (KILL_PAY[k] || 4); _killFoe(f); addMoney(pay, '', f.x, f.y - 30); };

  const _uc = updateCombat;
  updateCombat = function (dt) {
    _uc(dt);
    for (const k in G.skCd) if (G.skCd[k] > 0) G.skCd[k] -= dt;
    const P = G.P, A = G.area;
    if (G.sdash) {
      const d = G.sdash; d.t += dt;
      P.x = clamp(P.x + d.dir * 420 * dt, 8, A.L - 8); P.face = d.dir;
      for (const f of G.foes) { if (f.dead || d.hit.has(f)) continue; if (Math.abs(f.x - P.x) < hitR(f) + 10 && Math.abs(f.y - P.y) < hitR(f) + 12) { d.hit.add(f); damageFoe(f, 2, d.dir); } }
      if (Math.random() < 0.8) G.dust.push({ x: P.x - d.dir * 6, y: P.y, t: 0 });
      if (d.t >= d.dur) G.sdash = null;
    }
    for (const a of G.arrows) {
      a.x += a.vx * dt; a.y += a.vy * dt * 0.5; a.life -= dt;
      for (const f of G.foes) { if (f.dead) continue; const r = hitR(f); if (Math.abs(f.x - a.x) < r + 2 && Math.abs((f.y - 10) - a.y) < r + 6) { damageFoe(f, a.dmg, a.dir); a.life = 0; break; } }
    }
    G.arrows = G.arrows.filter(a => a.life > 0);
  };
  const _upd = update;
  let hudT = 0;
  update = function (dt) {
    _upd(dt);
    for (const f of G.rpgFx) f.t += dt; G.rpgFx = G.rpgFx.filter(f => f.t < f.life);
    for (const f of G.rpgFloat) f.t += dt; G.rpgFloat = G.rpgFloat.filter(f => f.t < 1.1);
    hudT -= dt; if (hudT <= 0) { hudT = 0.15; syncHud(); G.guideWait = G.mode === 'play' && !G.overlay && !RUN ? (G.guideWait || 0) + 0.15 : 0; if (G.guideWait > 0.8) maybeShopGuide(); }
  };

  /* ---------------- 그리기 (월드 좌표, 전경 바로 뒤) ---------------- */
  const _fg = ART.fg;
  ART.fg = function (A, cam, t, dt) {
    _fg.apply(ART, arguments);
    if (!S || !G.area || G.mode === 'title' || cam !== Math.round(G.cam)) return;
    const c = ctx, P = G.P, px = P.x - cam;
    // 손에 든 무기
    if (!(G.inv > 0 && Math.floor(G.t * 16) % 2) && G.mode !== 'trans') {
      const f = P.face, bx = Math.round(px + f * 6), by = Math.round(P.y - 14);
      if (R.wpn === 'bow') { c.strokeStyle = '#7a4a24'; c.lineWidth = 1.5; c.beginPath(); c.arc(bx - f * 2, by, 7, f > 0 ? -1.2 : Math.PI - 1.9, f > 0 ? 1.2 : Math.PI + 1.9); c.stroke(); c.strokeStyle = '#e8dcc4'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(bx - f * 2 + f * 2.5, by - 6.5); c.lineTo(bx - f * 2 + f * 2.5, by + 6.5); c.stroke(); }
      else if (R.wpn === 'sword') { c.fillStyle = '#5a3a24'; c.fillRect(bx - 1, by + 2, 2, 4); c.fillStyle = '#c9a35a'; c.fillRect(bx - 3, by + 1, 6, 1); c.fillStyle = '#d8dde4'; c.fillRect(bx - 1, by - 10, 2, 11); }
      else if (R.wpn === 'spear') { c.fillStyle = '#7a5134'; c.fillRect(bx, by - 16, 1.5, 26); c.fillStyle = '#d8dde4'; c.beginPath(); c.moveTo(bx + 0.75, by - 22); c.lineTo(bx + 3, by - 16); c.lineTo(bx - 1.5, by - 16); c.fill(); c.fillStyle = '#b23a2a'; c.fillRect(bx - 1, by - 15, 3.5, 2); }
    }
    for (const a of G.arrows) {
      const x = a.x - cam; c.strokeStyle = '#6a4a2a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - a.dir * 9, a.y - a.vy * 0.015); c.lineTo(x, a.y); c.stroke();
      c.fillStyle = '#d8dde4'; c.beginPath(); c.moveTo(x + a.dir * 3, a.y); c.lineTo(x - a.dir * 1, a.y - 2); c.lineTo(x - a.dir * 1, a.y + 2); c.fill();
      c.fillStyle = '#e8dcc4'; c.fillRect(x - a.dir * 10, a.y - 1.5, 2, 3);
    }
    for (const f of G.rpgFx) {
      const k = f.t / f.life;
      if (f.k === 'ring') { c.strokeStyle = `rgba(40,20,60,${0.8 * (1 - k)})`; c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.ellipse(f.x - cam, f.y - 6, 10 + 56 * k, (10 + 56 * k) / 1.6, 0, 0, Math.PI * 2); c.stroke(); c.strokeStyle = `rgba(160,110,230,${0.6 * (1 - k)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(f.x - cam, f.y - 6, 6 + 50 * k, (6 + 50 * k) / 1.6, G.t * 6, 0, Math.PI * 1.3); c.stroke(); }
      else if (f.k === 'thrust' || f.k === 'dragon') {
        const len = f.len * Math.min(1, k * 2.5), y = P.y - 12, x0 = px + P.face * 6;
        c.strokeStyle = f.k === 'dragon' ? `rgba(230,180,70,${1 - k})` : `rgba(240,240,255,${0.9 * (1 - k)})`; c.lineWidth = f.k === 'dragon' ? 5 * (1 - k) + 1 : 2;
        c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + P.face * len, y); c.stroke();
        if (f.k === 'dragon') { c.fillStyle = `rgba(178,58,42,${1 - k})`; for (let i = 0; i < 6; i++) { const xx = x0 + P.face * len * i / 6; c.fillRect(xx, y - 3 + Math.sin(i * 1.7 + G.t * 20) * 3, 3, 2); } }
      } else if (f.k === 'slash') {
        c.strokeStyle = `rgba(235,240,255,${1 - k})`; c.lineWidth = 2.5; c.beginPath(); c.arc(px + P.face * 8, P.y - 12, 20, P.face > 0 ? -1.3 + k : Math.PI + 1.3 - k, P.face > 0 ? 0.9 : Math.PI - 0.9, P.face < 0); c.stroke();
      }
    }
    if (G.sdash) { c.fillStyle = 'rgba(235,240,255,.55)'; for (let i = 1; i <= 3; i++) c.fillRect(px - G.sdash.dir * i * 9 - 4, P.y - 24, 8, 22); }
    // 사이드 대화(문제 · 비법 시험)가 있는 조연 머리 위 말풍선
    if (G.mode === 'play' || G.mode === 'script') for (const e of G.vis) {
      if (!e.sideOn || !e.sideOn()) continue;
      const sx = Math.round(e.x - cam + 9), sy = Math.round(e.y - 60 + Math.sin(G.t * 3 + e.x) * 1.5);
      if (sx < -10 || sx > VW + 10) continue;
      c.fillStyle = '#2a1a12'; c.fillRect(sx - 8, sy - 6, 16, 11); c.fillRect(sx - 4, sy + 5, 3, 2);
      c.fillStyle = '#fff6dc'; c.fillRect(sx - 7, sy - 5, 14, 9); c.fillRect(sx - 3, sy + 4, 1, 1);
      c.fillStyle = '#d9a842'; for (let i = 0; i < 3; i++) c.fillRect(sx - 5 + i * 4, sy - 1 + (Math.floor(G.t * 4) % 3 === i ? -1 : 0), 2, 2);
    }
    c.font = 'bold 8px "Gowun Dodum", sans-serif'; c.textAlign = 'center';
    for (const f of G.rpgFloat) { const a = 1 - f.t / 1.1; c.fillStyle = `rgba(42,26,18,${a})`; c.fillText(f.txt, f.x - cam + 0.5, f.y - f.t * 16 + 0.5); c.fillStyle = `rgba(255,214,110,${a})`; c.fillText(f.txt, f.x - cam, f.y - f.t * 16); }
  };

  /* ---------------- HUD : 돈 · 탕약 · 무기 · 스킬 ---------------- */
  const hud = document.createElement('div'); hud.id = 'rpgHud'; hud.hidden = true; $('stage').appendChild(hud);
  let lastHud = '';
  function syncHud(force) {
    const show = !!S && !$('hud').hidden && G.mode !== 'title';
    hud.hidden = !show; if (!show) return;
    hud.classList.toggle('dim', !$('dlg').hidden || !!G.overlay);
    const w = WPN[R.wpn] || WPN.brush, sk = w.sk, cd = Math.max(0, G.skCd[R.wpn] || 0);
    const st = !R.skills[R.wpn] ? 'off' : cd > 0 ? 'cd' : 'ok';
    // 스킬은 아이콘으로만 (잠김 · 쿨타임 · 준비 완료)
    const skIcon = `<span class="rh-sk ${st}" title="${sk.n}${st === 'off' ? ' (아직 못 배움)' : ''}" style="--p:${st === 'cd' ? (cd / sk.cd * 360).toFixed(0) : 0}deg"><i class="sk-ic sk-${R.wpn}"></i>${st === 'cd' ? `<b>${Math.ceil(cd)}</b>` : ''}${st === 'off' ? '<i class="sk-lock"></i>' : ''}<span class="kbd">X</span></span>`;
    const html = `<span class="rh-money"><i class="rh-coin"></i>${R.money}냥</span><span class="rh-pot" title="약초 탕약"><i class="sh-ic ic-potion"></i>${R.potions}<span class="kbd">C</span></span><span class="rh-wpn" title="무기 바꾸기"><i class="sh-ic ic-${R.wpn}"></i>${w.n}<span class="kbd">Q</span></span>${skIcon}`;
    if (force || html !== lastHud) { hud.innerHTML = html; lastHud = html; }
  }
  window.syncRpgHud = syncHud;
  const kh = $('keyhint'); if (kh) kh.innerHTML = '<span class="kbd">←→↑↓</span> 이동 · 연타 달리기 · <span class="kbd">Z</span> 공격 · <span class="kbd">X</span> 스킬 · <span class="kbd">Q</span> 무기 · <span class="kbd">C</span> 탕약 · <span class="kbd">Space</span> 대화';

  /* ---------------- 키 : X 스킬 · Q 무기 바꾸기 · C 탕약 ---------------- */
  window.addEventListener('keydown', e => {
    if (e.repeat || G.mode !== 'play' || G.overlay || MG.active || Quiz.active) return;
    if (e.code === 'KeyX') useSkill();
    else if (e.code === 'KeyQ') {
      const own = ORDER.filter(k => R.owned[k]);
      if (own.length < 2) { toast('바꿀 무기가 없다. 무기 상인에게서 활 · 검 · 창을 살 수 있다!'); return; }
      R.wpn = own[(own.indexOf(R.wpn) + 1) % own.length]; saveR(); SND.play('tick'); syncHud(true); toast(`무기: ${WPN[R.wpn].n}`);
    } else if (e.code === 'KeyC') {
      if (R.potions <= 0) { toast('약초 탕약이 없다. 마을의 약초 상인에게서 살 수 있다!'); SND.play('bad'); return; }
      if (S.hp >= MAXHP) { toast('체력이 이미 가득하다.'); return; }
      R.potions--; S.hp = Math.min(MAXHP, S.hp + 1); saveR(); updateHearts(); SND.play('good'); toast('약초 탕약을 마셨다! 체력 +1'); syncHud(true);
      G.rpgFloat.push({ x: G.P.x, y: G.P.y - 34, t: 0, txt: '♥ +1' });
    }
  });

  /* ---------------- 보스 · 대형 먹물 그림자 강화 ---------------- */
  FOE_KIND.boss.sp = 34; FOE_KIND.tank.hp = 9; FOE_KIND.tank.sp = 22;
  for (const A of Object.values(AREAS)) for (const e of A.ents) if (e.boss && e.phases && !e._hard) {
    e._hard = true; const keys = Object.keys(e.phases).map(Number).sort((a, b) => b - a), scripts = keys.map(k => e.phases[k]);
    e.hp = 18; e.phases = {}; [18, 13, 8, 4].forEach((h, i) => { if (scripts[i]) e.phases[h] = scripts[i]; });
  }
  const liveBoss = () => G.foes.find(f => f.e.boss && !f.dead);
  bossPattern = function (f) {
    const P = G.P, A = G.area, enr = f.hp <= f.max / 2;
    const n = (f.pat = (f.pat || 0) + 1) % 5;
    const same = () => liveBoss() === f && G.area === A;
    if (n === 1) {
      const spots = [[P.x, P.y]];
      for (let i = 0; i < (enr ? 8 : 6); i++) spots.push([clamp(P.x + (Math.random() - 0.5) * 240, 20, A.L - 20), YT + 6 + Math.random() * (YB - YT - 12)]);
      spots.forEach(([x, y]) => G.hazards.push({ type: 'pool', x, y, r: 16, t: 0, warn: 0.9, life: 2.4 }));
    } else if (n === 2) {
      const ys = [P.y, YT + 8 + Math.random() * (YB - YT - 16)]; if (enr) ys.push(YT + 8 + Math.random() * (YB - YT - 16));
      ys.forEach(y => G.hazards.push({ type: 'band', x: 0, y: clamp(y, YT + 6, YB - 6), r: 9, t: 0, warn: 1.0, life: 1.6 }));
    } else if (n === 3) {
      const ring = off => { for (let i = 0; i < 14; i++) { const a = (i + off) / 14 * Math.PI * 2; shoot(f.x, f.y - 10, f.x + Math.cos(a) * 100, f.y - 10 + Math.sin(a) * 100, 75); } };
      ring(0); setTimeout(() => same() && ring(0.5), 450); if (enr) setTimeout(() => same() && ring(0.25), 900);
    } else if (n === 4) {
      ['fast', 'shooter', 'fast'].forEach((kind, i) => G.foes.push({ e: { id: 'm' + Math.random(), k: 'foe', kind, temp: true }, x: f.x + (i - 1) * 34, y: clamp(f.y + (i - 1) * 16, YT, YB), hp: 2, max: 2, hit: 0, vx: 0, seed: Math.random() * 6, face: -1 }));
    } else {
      const fan = () => { for (let i = -2; i <= 2; i++) { const a = Math.atan2(P.y - 10 - (f.y - 10), P.x - f.x) + i * 0.18; shoot(f.x, f.y - 10, f.x + Math.cos(a) * 100, f.y - 10 + Math.sin(a) * 100, 115); } };
      fan(); setTimeout(() => same() && fan(), 500);
    }
  };
  // 보스전 중 퀴즈를 틀리면 보스 체력이 늘어난다
  const _pen = penalize;
  penalize = function (pts, hp) {
    _pen(pts, hp);
    const b = liveBoss(); if (b) { b.hp += 2; b.max += 2; G.rpgFloat.push({ x: b.x, y: b.y - 50, t: 0, txt: '보스 체력 +2' }); }
  };
  const _uc2 = updateCombat;
  updateCombat = function (dt) {
    _uc2(dt);
    const P = G.P, A = G.area; if (!A) return;
    for (const f of G.foes) {
      if (f.dead) continue;
      const kind = kindOf(f);
      if (kind === 'boss') { const lim = f.hp <= f.max / 2 ? 2.2 : 2.8; if (f.pt > lim) f.pt = lim; continue; }
      if (kind !== 'tank') continue;
      if (f.flashT > 0) f.flashT -= dt;
      const dx = P.x - f.x, dy = P.y - f.y, d = Math.hypot(dx, dy) || 1;
      if (f.wind > 0) { f.wind -= dt; if (f.wind <= 0) { f.charge = 0.45; f.cvx = dx / d * 210; f.cvy = dy / d * 140; } continue; }
      if (f.charge > 0) { f.charge -= dt; f.x = clamp(f.x + f.cvx * dt, 10, A.L - 10); f.y = clamp(f.y + f.cvy * dt, YT, YB); f.moving = true; if (Math.random() < 0.6) G.dust.push({ x: f.x, y: f.y, t: 0 }); continue; }
      f.tk = (f.tk == null ? 1.8 : f.tk) - dt;
      if (f.tk > 0 || d > 170) continue;
      f.tk = 3.0; const n = (f.tp = (f.tp || 0) + 1) % 3;
      if (n === 1) { // 내려찍기 : 발밑과 내 발밑에 경고 원
        G.hazards.push({ type: 'pool', x: f.x, y: f.y, r: 30, t: 0, warn: 0.8, life: 0.5 });
        G.hazards.push({ type: 'pool', x: P.x, y: P.y, r: 18, t: 0, warn: 0.9, life: 0.6 });
      } else if (n === 2) { // 먹물 파동 : 사방으로 먹물탄
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; shoot(f.x, f.y - 12, f.x + Math.cos(a) * 100, f.y - 12 + Math.sin(a) * 100, 62); }
      } else { // 돌진 : 번쩍인 뒤 달려든다
        f.flashT = 0.55; f.wind = 0.55;
      }
    }
  };

  placeAll(); hookSide();
})();
