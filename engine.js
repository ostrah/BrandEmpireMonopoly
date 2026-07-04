/* =====================================================================
   МОНОПОЛИЯ · «Биржа 1929» — игровой движок (чистый модуль, без I/O)
   Контракт — SPEC.md разделы 4/5/6. Экспорт:
     createGame, act, autoAction, currentActor, autoLiquidate, BOARD, CARDS
   Состояние game — plain-объект (сериализуется клиенту как есть).
   ===================================================================== */
'use strict';

/* ---------------- ДОСКА (40 клеток) ---------------- */
// prop: {t,n,logo,g,p,r:[6],hc}; air:{t,n,logo,p}; util:{t,n,logo,p};
// corner:{t,k}; tax:{t,k,p}; chance/chest:{t}. r=[база,1дом,2,3,4,штаб].
const BOARD = [
  {t:'corner', k:'go'},
  {t:'prop', n:'Nokla', logo:'nokla', g:'brown', p:60, r:[2,10,30,90,160,250], hc:50},
  {t:'chest'},
  {t:'prop', n:'Yahwoo!', logo:'yahwoo', g:'brown', p:60, r:[4,20,60,180,320,450], hc:50},
  {t:'tax', k:'income', p:200},
  {t:'air', n:'FodEx', logo:'fodex', p:200},
  {t:'prop', n:'Skyqe', logo:'skyqe', g:'lblue', p:100, r:[6,30,90,270,400,550], hc:50},
  {t:'chance'},
  {t:'prop', n:'Zoon', logo:'zoon', g:'lblue', p:100, r:[6,30,90,270,400,550], hc:50},
  {t:'prop', n:'T-Nobile', logo:'tnobile', g:'lblue', p:120, r:[8,40,100,300,450,600], hc:50},
  {t:'corner', k:'jail'},
  {t:'prop', n:'Tvitter', logo:'tvitter', g:'pink', p:140, r:[10,50,150,450,625,750], hc:100},
  {t:'util', n:'Tesler Power', logo:'tesler', p:150},
  {t:'prop', n:'Instaglam', logo:'instaglam', g:'pink', p:140, r:[10,50,150,450,625,750], hc:100},
  {t:'prop', n:'Snapchit', logo:'snapchit', g:'pink', p:160, r:[12,60,180,500,700,900], hc:100},
  {t:'air', n:'UDS', logo:'uds', p:200},
  {t:'prop', n:'SoundClod', logo:'soundclod', g:'orange', p:180, r:[14,70,200,550,750,950], hc:100},
  {t:'chest'},
  {t:'prop', n:'Shazoom', logo:'shazoom', g:'orange', p:180, r:[14,70,200,550,750,950], hc:100},
  {t:'prop', n:'Spatify', logo:'spatify', g:'orange', p:200, r:[16,80,220,600,800,1000], hc:100},
  {t:'corner', k:'parking'},
  {t:'prop', n:'Cosa-Cola', logo:'cosacola', g:'red', p:220, r:[18,90,250,700,875,1050], hc:150},
  {t:'chance'},
  {t:'prop', n:"McRonald's", logo:'mcronalds', g:'red', p:220, r:[18,90,250,700,875,1050], hc:150},
  {t:'prop', n:'Startbucks', logo:'startbucks', g:'red', p:240, r:[20,100,300,750,925,1100], hc:150},
  {t:'air', n:'DHK', logo:'dhk', p:200},
  {t:'prop', n:'YouTune', logo:'youtune', g:'yellow', p:260, r:[22,110,330,800,975,1150], hc:150},
  {t:'prop', n:'Twutch', logo:'twutch', g:'yellow', p:260, r:[22,110,330,800,975,1150], hc:150},
  {t:'util', n:'Goggle Cloud', logo:'gogglecloud', p:150},
  {t:'prop', n:'Netflex', logo:'netflex', g:'yellow', p:280, r:[24,120,360,850,1025,1200], hc:150},
  {t:'corner', k:'gotojail'},
  {t:'prop', n:'WhatsUpp', logo:'whatsupp', g:'green', p:300, r:[26,130,390,900,1100,1275], hc:200},
  {t:'prop', n:'Discorde', logo:'discorde', g:'green', p:300, r:[26,130,390,900,1100,1275], hc:200},
  {t:'chest'},
  {t:'prop', n:'Telegrom', logo:'telegrom', g:'green', p:320, r:[28,150,450,1000,1200,1400], hc:200},
  {t:'air', n:'Ubar', logo:'ubar', p:200},
  {t:'chance'},
  {t:'prop', n:'Nozama', logo:'nozama', g:'dblue', p:350, r:[35,175,500,1100,1300,1500], hc:200},
  {t:'tax', k:'audit', p:100},
  {t:'prop', n:'Epple', logo:'epple', g:'dblue', p:400, r:[50,200,600,1400,1700,2000], hc:200},
];

/* ---------------- КАРТЫ (id стабильны, текст — на клиенте) ---------------- */
const CARDS = {
  chance: ['ch_go','ch_jail','ch_jailfree','ch_pay_each_50','ch_div150','ch_fine100',
           'ch_to39','ch_to19','ch_back3','ch_repairs','ch_gain100','ch_to_ubar'],
  chest:  ['cc_gain200','cc_from_each50','cc_pay50','cc_jailfree','cc_jail','cc_gain100',
           'cc_pay100','cc_gain25','cc_repairs','cc_go','cc_gain10','cc_pay75'],
};

/* ---------------- утилиты ---------------- */
function d6(){ return 1 + Math.floor(Math.random() * 6); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const x=a[i]; a[i]=a[j]; a[j]=x; } return a; }
function byId(g, id){ return g.players.find(p => p.id === id) || null; }
function curP(g){ return g.players[g.turnIdx]; }
function ownsFullGroup(g, owner, color){
  for(let i=0;i<40;i++){ const b=BOARD[i]; if(b.t==='prop' && b.g===color && g.tiles[i].owner!==owner) return false; }
  return true;
}
function groupTiles(color){ const a=[]; for(let i=0;i<40;i++){ if(BOARD[i].t==='prop'&&BOARD[i].g===color) a.push(i); } return a; }
function countType(g, owner, type){ let c=0; for(let i=0;i<40;i++){ if(BOARD[i].t===type && g.tiles[i].owner===owner) c++; } return c; }
function ownedTiles(g, id){ const a=[]; for(let i=0;i<40;i++){ if(g.tiles[i].owner===id) a.push(i); } return a; }
function ok(g, events){ g.log.push(...events); if(g.log.length>60) g.log.splice(0, g.log.length-60); return { ok:true, events }; }
function err(code){ return { ok:false, error:code }; }

/* ---------------- создание партии ---------------- */
function createGame(players, settings){
  const cap = (settings && settings.capital) || 1500;
  /* режим: 'blitz' — быстрая партия (раздача собственности, инфляция ренты,
     лимит кругов с победой по состоянию); 'classic' — как обычно */
  const mode = (settings && settings.mode === 'blitz') ? 'blitz' : 'classic';
  const g = {
    settings: { capital: cap, turnTime: settings ? settings.turnTime : 60,
                mode, maxRounds: mode === 'blitz' ? 12 : null },
    board: BOARD,
    players: players.map(pl => ({
      id: pl.id, name: pl.name, emoji: pl.emoji, color: pl.color,
      cash: cap, pos: 0, inJail: false, jailTurns: 0, jailCards: 0,
      bankrupt: false, isBot: !!pl.isBot,
    })),
    tiles: BOARD.map(() => ({ owner: null, houses: 0, mortgaged: false })),
    turnIdx: 0, phase: 'roll', rolled: null, doublesCount: 0, extraDenied: false,
    pendingTile: null, auction: null, debt: null, trades: [], tradeSeq: 0, builtThisTurn: 0,
    decks: { chance: shuffle(CARDS.chance.slice()), chest: shuffle(CARDS.chest.slice()) },
    log: [], winner: null, round: 1,
  };
  /* блиц: каждому игроку — ПОЛНАЯ группа-монополия со старта (стройка и
     смертельные ренты с первого хода) + одна логистика/инфраструктура.
     Группы берём соседние по цене (окно тиров), чтобы без диких перекосов. */
  if(mode === 'blitz'){
    const ladder = ['brown','lblue','pink','orange','red','yellow','green','dblue'];
    const nP = g.players.length;
    const startTier = Math.floor(Math.random() * (ladder.length - nP + 1));
    const window = shuffle(ladder.slice(startTier, startTier + nP));
    g.players.forEach((pl, i)=>{
      for(const idx of groupTiles(window[i])){
        g.tiles[idx].owner = pl.id;
        g.log.push({ k:'deal', p: pl.id, t: idx });
      }
    });
    const extras = [];
    for(let i = 0; i < 40; i++) if(BOARD[i].t === 'air' || BOARD[i].t === 'util') extras.push(i);
    shuffle(extras);
    for(const pl of g.players){
      const idx = extras.pop();
      if(idx == null) break;
      g.tiles[idx].owner = pl.id;
      g.log.push({ k:'deal', p: pl.id, t: idx });
    }
  }
  g.log.push({ k:'turn', p: g.players[0].id, round: 1 });
  return g;
}

/* ---------------- блиц: инфляция ренты и победа по состоянию ---------------- */
function rentMult(g){
  if(g.settings.mode !== 'blitz') return 1;
  if(g.round >= 10) return 3;
  if(g.round >= 7) return 2;
  if(g.round >= 4) return 1.5;
  return 1;
}
/* блиц: зарплата на СТАРТе тает — экономика сжимается, банкротства неизбежны */
function goSalary(g){
  if(g.settings.mode !== 'blitz') return 200;
  if(g.round <= 4) return 200;
  if(g.round <= 8) return 100;
  return 0;
}
/* блиц: отделения вдвое дешевле — застройка приходит быстро */
function hCost(g, idx){
  const hc = BOARD[idx].hc || 0;
  return g.settings.mode === 'blitz' ? Math.floor(hc / 2) : hc;
}
function netWorth(g, p){
  let w = p.cash;
  for(const i of ownedTiles(g, p.id)){
    const b = BOARD[i], t = g.tiles[i];
    w += t.mortgaged ? Math.floor(b.p / 2) : b.p;
    if(b.hc) w += t.houses * hCost(g, i);
  }
  return w;
}
function endByWorth(g, events){
  events.push({ k:'timeup', rounds: g.settings.maxRounds });
  let best = null, bestW = -1;
  for(const p of g.players){
    if(p.bankrupt) continue;
    const w = netWorth(g, p);
    events.push({ k:'worth', p: p.id, amount: w });
    if(w > bestW){ bestW = w; best = p; }
  }
  g.winner = best ? best.id : null;
  g.phase = 'ended';
  if(best) events.push({ k:'win', p: best.id });
}

/* ---------------- денежные операции ---------------- */
function gain(g, p, amount, from, events){ p.cash += amount; events.push({ k:'gain', p:p.id, amount, from }); }
// списать amount у p в пользу toId (или банка при null). true=оплачено, false=долг.
function settle(g, p, amount, toId, events){
  if(amount <= 0) return true;
  if(p.cash >= amount){
    p.cash -= amount;
    if(toId != null){ const o = byId(g, toId); if(o) o.cash += amount; }
    return true;
  }
  g.debt = { playerId: p.id, amount, to: (toId != null ? toId : null) };
  g.phase = 'debt';
  events.push({ k:'debt', p:p.id, amount, to: (toId != null ? toId : null) });
  return false;
}

/* ---------------- движение и посадка ---------------- */
function sendToJail(g, p, events){
  p.pos = 10; p.inJail = true; p.jailTurns = 0; g.doublesCount = 0;
  events.push({ k:'jail_in', p:p.id });
}
function moveTo(g, p, target, awardGo, events){
  const from = p.pos;
  const passed = awardGo && target < from;   // прошли СТАРТ вперёд
  p.pos = target;
  events.push({ k:'move', p:p.id, from, to:target, passGo: passed });
  if(passed){ const sal = goSalary(g); if(sal > 0){ p.cash += sal; events.push({ k:'pass_go', p:p.id, amount:sal }); } }
  resolveLanding(g, p, events);
}
function moveBy(g, p, n, events){
  const from = p.pos;
  const passed = from + n >= 40;
  const to = (from + n) % 40;
  p.pos = to;
  events.push({ k:'move', p:p.id, from, to, passGo: passed });
  if(passed){ const sal = goSalary(g); if(sal > 0){ p.cash += sal; events.push({ k:'pass_go', p:p.id, amount:sal }); } }
  resolveLanding(g, p, events);
}
function computeRent(g, idx){
  const b = BOARD[idx], t = g.tiles[idx];
  if(t.mortgaged || t.owner == null) return 0;
  let raw;
  if(b.t === 'air'){ const c = countType(g, t.owner, 'air'); raw = [25,50,100,200][c-1] || 0; }
  else if(b.t === 'util'){ const c = countType(g, t.owner, 'util'); const s = g.rolled ? g.rolled[0]+g.rolled[1] : 7; raw = s * (c >= 2 ? 10 : 4); }
  else if(t.houses > 0) raw = b.r[t.houses];
  else raw = ownsFullGroup(g, t.owner, b.g) ? b.r[0] * 2 : b.r[0];
  return Math.round(raw * rentMult(g));   // блиц: инфляция с 5-го круга
}
function resolveLanding(g, p, events){
  const idx = p.pos, b = BOARD[idx];
  if(b.t === 'corner'){ if(b.k === 'gotojail') sendToJail(g, p, events); return; }
  if(b.t === 'tax'){ events.push({ k:'tax', p:p.id, t:idx, amount:b.p }); settle(g, p, b.p, null, events); return; }
  if(b.t === 'chance'){ drawCard(g, p, 'chance', events); return; }
  if(b.t === 'chest'){ drawCard(g, p, 'chest', events); return; }
  const t = g.tiles[idx];
  if(t.owner == null){ g.phase = 'buy'; g.pendingTile = idx; return; }
  if(t.owner === p.id || t.mortgaged) return;
  const amount = computeRent(g, idx);
  events.push({ k:'rent', p:p.id, to:t.owner, t:idx, amount });
  settle(g, p, amount, t.owner, events);
}

/* ---------------- карты ---------------- */
function drawCard(g, p, deckName, events){
  const deck = g.decks[deckName];
  const id = deck.shift();
  events.push({ k:'card', p:p.id, deck:deckName, id });
  applyCard(g, p, id, events);
  if(id !== 'ch_jailfree' && id !== 'cc_jailfree') deck.push(id);  // jailfree держим у игрока
}
function repairsCost(g, id, perHouse, perHotel){
  let sum = 0;
  for(const i of ownedTiles(g, id)){ const h = g.tiles[i].houses; if(h === 5) sum += perHotel; else if(h > 0) sum += h * perHouse; }
  return sum;
}
function payEach(g, p, amount, events){
  for(const o of g.players){ if(o.id === p.id || o.bankrupt) continue; events.push({ k:'pay', p:p.id, amount, to:o.id }); if(!settle(g, p, amount, o.id, events)) break; }
}
function collectEach(g, p, amount, events){
  for(const o of g.players){ if(o.id === p.id || o.bankrupt) continue; const a = Math.min(amount, o.cash); o.cash -= a; p.cash += a; events.push({ k:'pay', p:o.id, amount:a, to:p.id }); }
}
function payBank(g, p, amount, events){ events.push({ k:'pay', p:p.id, amount, to:null }); settle(g, p, amount, null, events); }
function applyCard(g, p, id, events){
  switch(id){
    case 'ch_go': case 'cc_go': moveTo(g, p, 0, true, events); break;
    case 'ch_jail': case 'cc_jail': sendToJail(g, p, events); break;
    case 'ch_jailfree': case 'cc_jailfree': p.jailCards++; break;
    case 'ch_pay_each_50': payEach(g, p, 50, events); break;
    case 'cc_from_each50': collectEach(g, p, 50, events); break;
    case 'ch_div150': gain(g, p, 150, 'card', events); break;
    case 'ch_fine100': case 'cc_pay100': payBank(g, p, 100, events); break;
    case 'ch_to39': moveTo(g, p, 39, true, events); break;
    case 'ch_to19': moveTo(g, p, 19, true, events); break;
    case 'ch_to_ubar': moveTo(g, p, 35, true, events); break;
    case 'ch_back3': moveTo(g, p, (p.pos - 3 + 40) % 40, false, events); break;
    case 'ch_repairs': payBank(g, p, repairsCost(g, p.id, 40, 115), events); break;
    case 'cc_repairs': payBank(g, p, repairsCost(g, p.id, 25, 100), events); break;
    case 'ch_gain100': case 'cc_gain100': gain(g, p, 100, 'card', events); break;
    case 'cc_gain200': gain(g, p, 200, 'card', events); break;
    case 'cc_gain25': gain(g, p, 25, 'card', events); break;
    case 'cc_gain10': gain(g, p, 10, 'card', events); break;
    case 'cc_pay50': payBank(g, p, 50, events); break;
    case 'cc_pay75': payBank(g, p, 75, events); break;
  }
}

/* ---------------- ход: бросок ---------------- */
function doRoll(g, p, events){
  const a = d6(), b = d6();
  g.rolled = [a, b];
  events.push({ k:'roll', p:p.id, a, b });
  const dbl = a === b;
  if(p.inJail){
    if(dbl){
      p.inJail = false; p.jailTurns = 0; g.doublesCount = 0; g.extraDenied = true;
      events.push({ k:'jail_out', p:p.id, how:'doubles' });
      moveBy(g, p, a + b, events);
      if(g.phase === 'roll') g.phase = 'idle';
    } else {
      p.jailTurns++;
      if(p.jailTurns >= 3){
        const paid = settle(g, p, 50, null, events);
        if(!paid) return;                       // застрял в долге, решает позже
        p.inJail = false; p.jailTurns = 0; g.extraDenied = true;
        events.push({ k:'jail_out', p:p.id, how:'force' });
        moveBy(g, p, a + b, events);
        if(g.phase === 'roll') g.phase = 'idle';
      } else {
        g.phase = 'idle';                        // остался сидеть, ход завершится
      }
    }
    return;
  }
  if(dbl) g.doublesCount++; else g.doublesCount = 0;
  if(g.doublesCount === 3){ g.doublesCount = 0; sendToJail(g, p, events); g.phase = 'idle'; return; }
  moveBy(g, p, a + b, events);
}
function finishMove(g, events){
  const p = curP(g);
  if(p.inJail){ g.phase = 'idle'; g.doublesCount = 0; g.extraDenied = false; return; }
  const dbl = !g.extraDenied && g.rolled && g.rolled[0] === g.rolled[1];
  g.extraDenied = false;
  if(dbl){ g.phase = 'roll'; g.rolled = null; }
  else { g.phase = 'idle'; }
}

/* ---------------- смена хода ---------------- */
function nextTurn(g, events){
  const n = g.players.length;
  let idx = g.turnIdx, guard = 0;
  do { idx = (idx + 1) % n; if(idx === 0) g.round++; guard++; } while(g.players[idx].bankrupt && guard < n * 2);
  /* блиц: лимит кругов исчерпан — победа по состоянию */
  if(g.settings.maxRounds && g.round > g.settings.maxRounds){ endByWorth(g, events); return; }
  g.turnIdx = idx; g.rolled = null; g.doublesCount = 0; g.extraDenied = false; g.pendingTile = null; g.builtThisTurn = 0; g.phase = 'roll';
  events.push({ k:'turn', p: g.players[idx].id, round: g.round });
}

/* ---------------- аукцион ---------------- */
function startAuction(g, tile, events){
  g.auction = { tile, highBid: 0, highBidder: null, passed: [] };
  g.pendingTile = null; g.phase = 'auction';
  events.push({ k:'auction_start', t: tile });
}
function auctionActive(g){ return g.players.filter(p => !p.bankrupt && !g.auction.passed.includes(p.id)); }
function maybeCloseAuction(g, events){
  const au = g.auction; if(!au) return;
  const active = auctionActive(g);
  if(au.highBidder != null){
    const others = active.filter(p => p.id !== au.highBidder);
    if(others.length === 0) awardAuction(g, events);
  } else if(active.length === 0){
    events.push({ k:'auction_none', t: au.tile }); g.auction = null; finishMove(g, events);
  }
}
function awardAuction(g, events){
  const au = g.auction, w = byId(g, au.highBidder);
  w.cash -= au.highBid; g.tiles[au.tile].owner = w.id;
  events.push({ k:'auction_win', p: w.id, t: au.tile, amount: au.highBid });
  g.auction = null; finishMove(g, events);
}
function auctionClose(g, events){
  const au = g.auction; if(!au) return;
  if(au.highBidder != null) awardAuction(g, events);
  else { events.push({ k:'auction_none', t: au.tile }); g.auction = null; finishMove(g, events); }
}

/* ---------------- дома / залог ---------------- */
function groupMinMax(g, color){
  let mn = 99, mx = 0;
  for(const i of groupTiles(color)){ const h = g.tiles[i].houses; if(h < mn) mn = h; if(h > mx) mx = h; }
  return { mn, mx };
}
function groupHasHouses(g, color){ return groupTiles(color).some(i => g.tiles[i].houses > 0); }
function canBuild(g, pid, idx){
  const b = BOARD[idx]; if(!b || b.t !== 'prop') return false;
  const t = g.tiles[idx];
  if(t.owner !== pid || t.mortgaged || t.houses >= 5) return false;
  if(!ownsFullGroup(g, pid, b.g)) return false;
  if(groupTiles(b.g).some(i => g.tiles[i].mortgaged)) return false;
  return t.houses === groupMinMax(g, b.g).mn;   // even-build
}
function canSell(g, pid, idx){
  const b = BOARD[idx]; if(!b || b.t !== 'prop') return false;
  const t = g.tiles[idx];
  if(t.owner !== pid || t.houses <= 0) return false;
  return t.houses === groupMinMax(g, b.g).mx;    // even-sell
}
function sellOneHouse(g, p, events){
  let best = -1;
  for(const i of ownedTiles(g, p.id)){ if(canSell(g, p.id, i)){ if(best < 0 || g.tiles[i].houses > g.tiles[best].houses) best = i; } }
  if(best < 0) return false;
  g.tiles[best].houses--; p.cash += Math.floor(hCost(g, best) / 2);
  events.push({ k:'sell_house', p:p.id, t:best, houses: g.tiles[best].houses });
  return true;
}
function mortgageOne(g, p, events){
  for(const i of ownedTiles(g, p.id)){
    const t = g.tiles[i]; if(t.mortgaged) continue;
    if(BOARD[i].t === 'prop' && groupHasHouses(g, BOARD[i].g)) continue;
    t.mortgaged = true; p.cash += Math.floor(BOARD[i].p / 2);
    events.push({ k:'mortgage', p:p.id, t:i }); return true;
  }
  return false;
}

/* ---------------- долг / банкротство ---------------- */
function payDebt(g, events){
  const d = g.debt; const p = byId(g, d.playerId);
  p.cash -= d.amount; if(d.to != null){ const o = byId(g, d.to); if(o) o.cash += d.amount; }
  g.debt = null;
}
function doBankrupt(g, p, events, creditorId){
  for(const i of ownedTiles(g, p.id)){
    const t = g.tiles[i];
    if(t.houses > 0){ const refund = Math.floor(hCost(g, i) / 2) * t.houses; if(creditorId != null){ const c = byId(g, creditorId); if(c) c.cash += refund; } t.houses = 0; }
    if(creditorId != null){ t.owner = creditorId; }         // передать (залог как есть)
    else { t.owner = null; t.mortgaged = false; }           // банку — очистить
  }
  if(creditorId != null){ const c = byId(g, creditorId); if(c){ c.cash += Math.max(0, p.cash); c.jailCards += p.jailCards; } }
  p.cash = 0; p.jailCards = 0; p.bankrupt = true; g.debt = null;
  events.push({ k:'bankrupt', p:p.id, to: creditorId });
  const alive = g.players.filter(x => !x.bankrupt);
  if(alive.length === 1){ g.winner = alive[0].id; g.phase = 'ended'; events.push({ k:'win', p: alive[0].id }); }
  else { nextTurn(g, events); }
}
function resolveDebtAuto(g, events){
  const d = g.debt; if(!d) return;
  const p = byId(g, d.playerId); let guard = 0;
  while(p.cash < d.amount && guard++ < 300){ if(!sellOneHouse(g, p, events) && !mortgageOne(g, p, events)) break; }
  if(p.cash >= d.amount){ payDebt(g, events); finishMove(g, events); }
  else doBankrupt(g, p, events, d.to);
}
function maybeResolveDebt(g, events){
  if(g.phase === 'debt' && g.debt){ const p = byId(g, g.debt.playerId); if(p && p.cash >= g.debt.amount){ payDebt(g, events); finishMove(g, events); } }
}

/* ---------------- сделки ---------------- */
function tileTradable(g, idx){
  if(idx === g.pendingTile) return false;
  if(g.auction && g.auction.tile === idx) return false;
  const b = BOARD[idx];
  if(b.t === 'prop' && groupHasHouses(g, b.g)) return false;   // нельзя тайлы с домами в группе
  return true;
}
function validTrade(g, from, to, giveCash, takeCash, giveTiles, takeTiles){
  const pf = byId(g, from), pt = byId(g, to);
  if(!pf || !pt || pf.bankrupt || pt.bankrupt || from === to) return false;
  if(giveCash < 0 || takeCash < 0 || giveCash > pf.cash || takeCash > pt.cash) return false;
  if(!Array.isArray(giveTiles) || !Array.isArray(takeTiles)) return false;
  for(const i of giveTiles){ if(g.tiles[i] == null || g.tiles[i].owner !== from || !tileTradable(g, i)) return false; }
  for(const i of takeTiles){ if(g.tiles[i] == null || g.tiles[i].owner !== to || !tileTradable(g, i)) return false; }
  if(giveTiles.length + takeTiles.length === 0 && giveCash + takeCash === 0) return false;
  return true;
}

/* ---------------- главная точка: act ---------------- */
function act(g, pid, action){
  if(!g || !action) return err('cant');
  const type = action.type;
  const events = [];
  const p = curP(g);

  // ---- серверные ----
  if(type === 'auctionClose'){ if(g.phase !== 'auction') return err('bad_phase'); auctionClose(g, events); return ok(g, events); }
  if(type === 'autoResolveDebt'){ if(g.phase !== 'debt' || !g.debt || g.debt.playerId !== pid) return err('bad_phase'); resolveDebtAuto(g, events); return ok(g, events); }

  // ---- аукцион (любой активный игрок) ----
  if(type === 'bid' || type === 'pass'){
    if(g.phase !== 'auction' || !g.auction) return err('bad_phase');
    const pl = byId(g, pid); if(!pl || pl.bankrupt) return err('cant');
    if(g.auction.passed.includes(pid)) return err('cant');
    if(type === 'pass'){ if(g.auction.highBidder === pid) return err('cant'); g.auction.passed.push(pid); events.push({ k:'auction_pass', p:pid }); maybeCloseAuction(g, events); return ok(g, events); }
    const amount = action.amount | 0;
    const min = g.auction.highBid > 0 ? g.auction.highBid + 10 : 10;
    if(amount < min) return err('bad_amount');
    if(amount > pl.cash) return err('no_cash');
    g.auction.highBid = amount; g.auction.highBidder = pid;
    events.push({ k:'bid', p:pid, amount }); maybeCloseAuction(g, events); return ok(g, events);
  }

  // ---- сделки (любой живой игрок, не в ended/auction) ----
  if(type === 'trade'){
    if(g.phase === 'ended' || g.phase === 'auction') return err('bad_phase');
    const to = action.to;
    const giveCash = action.giveCash | 0, takeCash = action.takeCash | 0;
    const giveTiles = action.giveTiles || [], takeTiles = action.takeTiles || [];
    if((byId(g, pid) || {}).bankrupt) return err('cant');
    if(g.trades.filter(t => t.from === pid).length >= 3) return err('cant');
    if(!validTrade(g, pid, to, giveCash, takeCash, giveTiles, takeTiles)) return err('bad_trade');
    const id = 'tr' + (++g.tradeSeq);
    g.trades.push({ id, from: pid, to, giveCash, takeCash, giveTiles: giveTiles.slice(), takeTiles: takeTiles.slice() });
    events.push({ k:'trade_offer', id, from: pid, to }); return ok(g, events);
  }
  if(type === 'tradeAccept'){
    const tr = g.trades.find(t => t.id === action.id); if(!tr) return err('not_found');
    if(tr.to !== pid) return err('cant');
    if(!validTrade(g, tr.from, tr.to, tr.giveCash, tr.takeCash, tr.giveTiles, tr.takeTiles)){ g.trades = g.trades.filter(t => t.id !== tr.id); return err('bad_trade'); }
    const pf = byId(g, tr.from), pt = byId(g, tr.to);
    pf.cash += tr.takeCash - tr.giveCash; pt.cash += tr.giveCash - tr.takeCash;
    for(const i of tr.giveTiles) g.tiles[i].owner = tr.to;
    for(const i of tr.takeTiles) g.tiles[i].owner = tr.from;
    g.trades = g.trades.filter(t => t.id !== tr.id);
    events.push({ k:'trade_accept', id: tr.id, from: tr.from, to: tr.to });
    return ok(g, events);
  }
  if(type === 'tradeDecline'){ const tr = g.trades.find(t => t.id === action.id); if(!tr) return err('not_found'); if(tr.to !== pid) return err('cant'); g.trades = g.trades.filter(t => t.id !== tr.id); events.push({ k:'trade_decline', id: tr.id }); return ok(g, events); }
  if(type === 'tradeCancel'){ const tr = g.trades.find(t => t.id === action.id); if(!tr) return err('not_found'); if(tr.from !== pid) return err('cant'); g.trades = g.trades.filter(t => t.id !== tr.id); events.push({ k:'trade_cancel', id: tr.id }); return ok(g, events); }

  // ---- ход текущего игрока ----
  if(!p || pid !== p.id) return err('not_your_turn');

  switch(type){
    case 'roll': {
      if(g.phase !== 'roll') return err('bad_phase');
      doRoll(g, p, events);
      if(g.phase === 'roll') finishMove(g, events);
      return ok(g, events);
    }
    case 'jailPay': {
      if(g.phase !== 'roll' || !p.inJail) return err('bad_phase');
      if(!settle(g, p, 50, null, events)) return err('no_cash');
      p.inJail = false; p.jailTurns = 0; events.push({ k:'jail_out', p:p.id, how:'pay' });
      return ok(g, events);
    }
    case 'jailCard': {
      if(g.phase !== 'roll' || !p.inJail) return err('bad_phase');
      if(p.jailCards <= 0) return err('cant');
      p.jailCards--; p.inJail = false; p.jailTurns = 0;
      g.decks.chance.push('ch_jailfree');   // вернуть в низ колоды
      events.push({ k:'jail_out', p:p.id, how:'card' });
      return ok(g, events);
    }
    case 'buy': {
      if(g.phase !== 'buy' || g.pendingTile == null) return err('bad_phase');
      const idx = g.pendingTile, price = BOARD[idx].p;
      if(p.cash < price) return err('no_cash');
      p.cash -= price; g.tiles[idx].owner = p.id; g.pendingTile = null;
      events.push({ k:'buy', p:p.id, t:idx, price });
      finishMove(g, events);
      return ok(g, events);
    }
    case 'decline': {
      if(g.phase !== 'buy' || g.pendingTile == null) return err('bad_phase');
      startAuction(g, g.pendingTile, events);
      return ok(g, events);
    }
    case 'build': {
      if(g.phase !== 'roll' && g.phase !== 'idle') return err('bad_phase');
      const idx = action.tile;
      if((g.builtThisTurn || 0) >= 3) return err('build_limit');   // максимум 3 постройки за ход
      if(!canBuild(g, pid, idx)) return err('cant');
      const cost = hCost(g, idx);
      if(p.cash < cost) return err('no_cash');
      p.cash -= cost; g.tiles[idx].houses++; g.builtThisTurn = (g.builtThisTurn || 0) + 1;
      events.push({ k:'build', p:pid, t:idx, houses: g.tiles[idx].houses });
      return ok(g, events);
    }
    case 'sellHouse': {
      /* 'buy' тоже разрешаем: игрок может продать дома, чтобы наскрести на покупку */
      if(g.phase !== 'roll' && g.phase !== 'idle' && g.phase !== 'debt' && g.phase !== 'buy') return err('bad_phase');
      const idx = action.tile;
      if(!canSell(g, pid, idx)) return err('cant');
      g.tiles[idx].houses--; p.cash += Math.floor(hCost(g, idx) / 2);
      events.push({ k:'sell_house', p:pid, t:idx, houses: g.tiles[idx].houses });
      maybeResolveDebt(g, events);
      return ok(g, events);
    }
    case 'mortgage': {
      if(g.phase !== 'roll' && g.phase !== 'idle' && g.phase !== 'debt' && g.phase !== 'buy') return err('bad_phase');
      const idx = action.tile, t = g.tiles[idx];
      if(!t || t.owner !== pid) return err('not_owner');
      if(t.mortgaged) return err('mortgaged');
      if(BOARD[idx].t === 'prop' && groupHasHouses(g, BOARD[idx].g)) return err('has_houses');
      t.mortgaged = true; p.cash += Math.floor(BOARD[idx].p / 2);
      events.push({ k:'mortgage', p:pid, t:idx });
      maybeResolveDebt(g, events);
      return ok(g, events);
    }
    case 'unmortgage': {
      if(g.phase !== 'roll' && g.phase !== 'idle' && g.phase !== 'buy') return err('bad_phase');
      const idx = action.tile, t = g.tiles[idx];
      if(!t || t.owner !== pid) return err('not_owner');
      if(!t.mortgaged) return err('cant');
      const cost = Math.round(BOARD[idx].p / 2 * 1.1);   // залог + 10% (round гасит ошибку float)
      if(p.cash < cost) return err('no_cash');
      p.cash -= cost; t.mortgaged = false;
      events.push({ k:'unmortgage', p:pid, t:idx });
      return ok(g, events);
    }
    case 'endTurn': {
      if(g.phase !== 'idle') return err('bad_phase');
      nextTurn(g, events);
      return ok(g, events);
    }
    case 'bankrupt': {
      if(g.phase !== 'debt' || !g.debt || g.debt.playerId !== pid) return err('bad_phase');
      doBankrupt(g, p, events, g.debt.to);
      return ok(g, events);
    }
    default: return err('cant');
  }
}

/* ---------------- кто сейчас решает ---------------- */
function currentActor(g){
  if(!g || g.phase === 'ended' || g.phase === 'auction') return null;
  if(g.phase === 'debt') return g.debt ? g.debt.playerId : null;
  const p = curP(g); return p ? p.id : null;
}

/* ---------------- авто-действие (таймаут / отключившийся) ---------------- */
function autoAction(g){
  if(!g) return null;
  if(g.phase === 'debt') return { type:'autoResolveDebt' };
  if(g.phase === 'buy'){
    const p = curP(g), price = BOARD[g.pendingTile].p;
    return (p.cash - price >= 150) ? { type:'buy' } : { type:'decline' };
  }
  if(g.phase === 'idle') return { type:'endTurn' };
  if(g.phase === 'roll') return { type:'roll' };
  return null;
}

/* ---------------- принудительная ликвидация (последний рубеж сервера) ---------------- */
function autoLiquidate(g, pid){
  const events = [];
  if(g.debt && g.debt.playerId === pid) resolveDebtAuto(g, events);
  else { const p = byId(g, pid); if(p){ while(sellOneHouse(g, p, events)){} while(mortgageOne(g, p, events)){} } }
  g.log.push(...events); if(g.log.length > 60) g.log.splice(0, g.log.length - 60);
  return events;
}

module.exports = { createGame, act, autoAction, currentActor, autoLiquidate, BOARD, CARDS };
