'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../engine.js');

/* --- помощники --- */
function newGame(n = 2, cap = 1500){
  const pls = [];
  for(let i=0;i<n;i++) pls.push({ id:'p'+i, name:'P'+i, emoji:'x', color:'#000', isBot:false });
  return E.createGame(pls, { capital: cap, turnTime: null });
}
let _orig = Math.random;
function forceDice(faces){ let i=0; Math.random = () => (faces[i++ % faces.length] - 0.5) / 6; }
function restore(){ Math.random = _orig; }
test.afterEach(() => restore());

/* --- базовое --- */
test('createGame: игроки, касса, тайлы, фаза', () => {
  const g = newGame(3, 2000);
  assert.equal(g.players.length, 3);
  assert.equal(g.players[0].cash, 2000);
  assert.equal(g.tiles.length, 40);
  assert.equal(g.phase, 'roll');
  assert.equal(g.round, 1);
  assert.ok(g.tiles.every(t => t.owner === null && t.houses === 0 && !t.mortgaged));
});

test('BOARD: 40 клеток, ренты по 6, цены заданы', () => {
  assert.equal(E.BOARD.length, 40);
  for(const b of E.BOARD){
    if(b.t === 'prop'){ assert.equal(b.r.length, 6); assert.ok(b.p > 0); assert.ok(b.hc > 0); }
    if(b.t === 'air') assert.equal(b.p, 200);
    if(b.t === 'util') assert.equal(b.p, 150);
  }
  assert.equal(E.CARDS.chance.length, 12);
  assert.equal(E.CARDS.chest.length, 12);
});

test('roll двигает фишку и меняет фазу', () => {
  const g = newGame(2);
  forceDice([2,4]); // сумма 6, не дубль
  const r = E.act(g, 'p0', { type:'roll' });
  assert.ok(r.ok);
  assert.equal(g.players[0].pos, 6);
  assert.ok(r.events.some(e => e.k === 'roll'));
  assert.ok(g.phase === 'buy' || g.phase === 'idle' || g.phase === 'roll');
});

test('проход СТАРТа даёт +200', () => {
  const g = newGame(2);
  g.players[0].pos = 38;
  forceDice([2,4]); // 38+6=44 -> 4, прошли GO
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].pos, 4);
  // на клетке 4 налог -200; итог 1500 +200(go) -200(tax) = 1500
  assert.equal(g.players[0].cash, 1500);
});

test('покупка собственности', () => {
  const g = newGame(2);
  g.turnIdx = 0; g.players[0].pos = 0;
  forceDice([2,4]); // -> клетка 6 Tvitter (100), фаза buy
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.phase, 'buy');
  assert.equal(g.pendingTile, 6);
  const r = E.act(g, 'p0', { type:'buy' });
  assert.ok(r.ok);
  assert.equal(g.tiles[6].owner, 'p0');
  assert.equal(g.players[0].cash, 1400);
});

test('отказ от покупки открывает аукцион', () => {
  const g = newGame(2);
  g.phase = 'buy'; g.pendingTile = 6;
  const r = E.act(g, 'p0', { type:'decline' });
  assert.ok(r.ok);
  assert.equal(g.phase, 'auction');
  assert.equal(g.auction.tile, 6);
});

test('аукцион: ставка и пас -> победа', () => {
  const g = newGame(2);
  g.phase = 'auction'; g.pendingTile = null;
  g.auction = { tile:6, highBid:0, highBidder:null, passed:[] };
  assert.ok(E.act(g, 'p0', { type:'bid', amount:50 }).ok);
  assert.equal(g.auction.highBidder, 'p0');
  const r = E.act(g, 'p1', { type:'pass' });
  assert.ok(r.ok);
  // p0 остался один с ставкой -> выиграл
  assert.equal(g.tiles[6].owner, 'p0');
  assert.equal(g.players[0].cash, 1450);
});

test('аукцион: все пасуют -> ничейная', () => {
  const g = newGame(2);
  g.phase = 'auction';
  g.auction = { tile:6, highBid:0, highBidder:null, passed:[] };
  E.act(g, 'p0', { type:'pass' });
  E.act(g, 'p1', { type:'pass' });
  assert.equal(g.tiles[6].owner, null);
  assert.equal(g.auction, null);
});

test('минимальный шаг ставки', () => {
  const g = newGame(2);
  g.phase = 'auction';
  g.auction = { tile:6, highBid:50, highBidder:'p1', passed:[] };
  assert.equal(E.act(g, 'p0', { type:'bid', amount:55 }).error, 'bad_amount');
  assert.ok(E.act(g, 'p0', { type:'bid', amount:60 }).ok);
});

test('рента одиночной собственности', () => {
  const g = newGame(2);
  g.tiles[6].owner = 'p1';               // p1 владеет Tvitter (голубая, r[0]=6)
  g.turnIdx = 0; g.players[0].pos = 0;
  forceDice([2,4]);                       // p0 -> клетка 6
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1494);  // -6
  assert.equal(g.players[1].cash, 1506);  // +6
});

test('рента x2 за полную группу без домов', () => {
  const g = newGame(2);
  g.tiles[1].owner = 'p1'; g.tiles[3].owner = 'p1';  // вся коричневая у p1
  g.turnIdx = 0; g.players[0].pos = 0;
  forceDice([1,2]);                        // -> клетка 3 (Yahwoo r[0]=4)
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1492);   // -8 (4*2)
});

test('рента растёт с домами', () => {
  const g = newGame(2);
  g.tiles[1].owner = 'p1'; g.tiles[3].owner = 'p1';
  g.tiles[3].houses = 2;                    // Yahwoo r[2]=60
  g.turnIdx = 0; g.players[0].pos = 0;
  forceDice([1,2]);
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1440);    // -60
});

test('рента логистики зависит от числа сетей', () => {
  const g = newGame(2);
  g.tiles[5].owner = 'p1'; g.tiles[15].owner = 'p1'; // 2 сети -> 50
  g.turnIdx = 0; g.players[0].pos = 0;
  forceDice([2,3]);                          // -> клетка 5
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1450);     // -50
});

test('рента инфраструктуры = сумма броска ×4', () => {
  const g = newGame(2);
  g.tiles[12].owner = 'p1';                  // одна util
  g.turnIdx = 0; g.players[0].pos = 8;
  forceDice([1,3]);                          // сумма 4 -> клетка 12, рента 4*4=16
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1484);
});

test('дома строятся только равномерно', () => {
  const g = newGame(2);
  g.tiles[1].owner = 'p0'; g.tiles[3].owner = 'p0'; // вся коричневая
  g.phase = 'idle'; g.turnIdx = 0;
  assert.ok(E.act(g, 'p0', { type:'build', tile:1 }).ok);
  // теперь на 1 дом, на 3 — ноль: нельзя строить второй на 1
  assert.equal(E.act(g, 'p0', { type:'build', tile:1 }).error, 'cant');
  assert.ok(E.act(g, 'p0', { type:'build', tile:3 }).ok);
  assert.equal(g.tiles[1].houses, 1);
  assert.equal(g.tiles[3].houses, 1);
});

test('нельзя строить без полной группы', () => {
  const g = newGame(2);
  g.tiles[1].owner = 'p0';                    // только одна из двух
  g.phase = 'idle';
  assert.equal(E.act(g, 'p0', { type:'build', tile:1 }).error, 'cant');
});

test('продажа домов равномерно и за полцены', () => {
  const g = newGame(2);
  g.tiles[1].owner = 'p0'; g.tiles[3].owner = 'p0';
  g.tiles[1].houses = 1; g.tiles[3].houses = 1;
  g.phase = 'idle';
  const c0 = g.players[0].cash;
  assert.ok(E.act(g, 'p0', { type:'sellHouse', tile:1 }).ok);
  assert.equal(g.players[0].cash, c0 + 25);   // hc 50 / 2
  // теперь 1:0, 3:1 — продать с 1 нельзя (это min), только с 3
  assert.equal(E.act(g, 'p0', { type:'sellHouse', tile:1 }).error, 'cant');
});

test('залог даёт p/2 и снимает ренту', () => {
  const g = newGame(2);
  g.tiles[6].owner = 'p1';
  g.phase = 'idle'; g.turnIdx = 1;
  assert.ok(E.act(g, 'p1', { type:'mortgage', tile:6 }).ok);
  assert.equal(g.players[1].cash, 1550);       // +50
  assert.ok(g.tiles[6].mortgaged);
  // p0 встаёт на заложенную — без ренты
  g.turnIdx = 0; g.players[0].pos = 0; g.phase = 'roll';
  forceDice([2,4]);
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1500);
});

test('выкуп залога стоит ceil(p/2*1.1)', () => {
  const g = newGame(2);
  g.tiles[6].owner = 'p0'; g.tiles[6].mortgaged = true;
  g.phase = 'idle';
  assert.ok(E.act(g, 'p0', { type:'unmortgage', tile:6 }).ok);
  assert.equal(g.players[0].cash, 1500 - 55); // ceil(50*1.1)=55
  assert.ok(!g.tiles[6].mortgaged);
});

test('нельзя заложить, если в группе есть дома', () => {
  const g = newGame(2);
  g.tiles[1].owner = 'p0'; g.tiles[3].owner = 'p0';
  g.tiles[1].houses = 1;
  g.phase = 'idle';
  assert.equal(E.act(g, 'p0', { type:'mortgage', tile:3 }).error, 'has_houses');
});

test('налоговая клетка списывает деньги', () => {
  const g = newGame(2);
  g.players[0].pos = 0;
  forceDice([1,3]);                            // -> клетка 4, налог 200
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1300);
});

test('клетка «в тюрьму» сажает', () => {
  const g = newGame(2);
  g.players[0].pos = 20;
  forceDice([4,6]);                            // 20+10=30 gotojail
  E.act(g, 'p0', { type:'roll' });
  assert.ok(g.players[0].inJail);
  assert.equal(g.players[0].pos, 10);
});

test('выход из тюрьмы за $50', () => {
  const g = newGame(2);
  g.players[0].inJail = true; g.players[0].pos = 10; g.phase = 'roll';
  const r = E.act(g, 'p0', { type:'jailPay' });
  assert.ok(r.ok);
  assert.ok(!g.players[0].inJail);
  assert.equal(g.players[0].cash, 1450);
});

test('выход из тюрьмы по карте', () => {
  const g = newGame(2);
  g.players[0].inJail = true; g.players[0].jailCards = 1; g.phase = 'roll';
  assert.ok(E.act(g, 'p0', { type:'jailCard' }).ok);
  assert.ok(!g.players[0].inJail);
  assert.equal(g.players[0].jailCards, 0);
});

test('3 неудачи в тюрьме -> штраф и выход', () => {
  const g = newGame(2);
  g.players[0].inJail = true; g.players[0].jailTurns = 2; g.players[0].pos = 10; g.phase = 'roll';
  forceDice([2,4]);                            // не дубль
  E.act(g, 'p0', { type:'roll' });
  assert.ok(!g.players[0].inJail);
  assert.equal(g.players[0].cash, 1450);       // -50
  assert.equal(g.players[0].pos, 16);          // 10+6
});

test('долг при нехватке денег на ренту', () => {
  const g = newGame(2);
  g.tiles[19].owner = 'p1'; g.tiles[19].houses = 5; // Firefax отель r[5]=1000
  g.players[0].cash = 100;
  g.turnIdx = 0; g.players[0].pos = 15;
  forceDice([1,3]);                            // -> клетка 19
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.phase, 'debt');
  assert.ok(g.debt && g.debt.playerId === 'p0' && g.debt.to === 'p1');
});

test('банкротство передаёт активы и определяет победителя (2и)', () => {
  const g = newGame(2);
  g.tiles[19].owner = 'p1'; g.tiles[19].houses = 5;
  g.tiles[6].owner = 'p0';                     // у p0 есть актив
  g.players[0].cash = 50;
  g.turnIdx = 0; g.players[0].pos = 15;
  forceDice([1,3]);
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.phase, 'debt');
  const r = E.act(g, 'p0', { type:'bankrupt' });
  assert.ok(r.ok);
  assert.ok(g.players[0].bankrupt);
  assert.equal(g.tiles[6].owner, 'p1');        // актив ушёл кредитору
  assert.equal(g.phase, 'ended');
  assert.equal(g.winner, 'p1');
});

test('сделка: обмен собственностью и деньгами', () => {
  const g = newGame(2);
  g.tiles[6].owner = 'p0'; g.tiles[8].owner = 'p1';
  const r = E.act(g, 'p0', { type:'trade', to:'p1', giveCash:100, takeCash:0, giveTiles:[6], takeTiles:[8] });
  assert.ok(r.ok);
  const tid = g.trades[0].id;
  assert.ok(E.act(g, 'p1', { type:'tradeAccept', id:tid }).ok);
  assert.equal(g.tiles[6].owner, 'p1');
  assert.equal(g.tiles[8].owner, 'p0');
  assert.equal(g.players[0].cash, 1400);       // отдал 100
  assert.equal(g.players[1].cash, 1600);
});

test('нельзя торговать клеткой с домами в группе', () => {
  const g = newGame(2);
  g.tiles[1].owner = 'p0'; g.tiles[3].owner = 'p0'; g.tiles[1].houses = 1;
  const r = E.act(g, 'p0', { type:'trade', to:'p1', giveCash:0, takeCash:0, giveTiles:[3], takeTiles:[] });
  assert.equal(r.error, 'bad_trade');
});

test('карта «на СТАРТ» перемещает и даёт 200', () => {
  const g = newGame(2);
  // подложим карту наверх колоды chance и встанем на клетку 7 (chance)
  g.decks.chance = ['ch_go', ...g.decks.chance.filter(x => x !== 'ch_go')];
  g.players[0].pos = 4; g.phase = 'roll';
  forceDice([1,2]);                            // 4+3=7 chance
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].pos, 0);
  assert.equal(g.players[0].cash, 1700);       // +200
});

test('карта «капремонт» берёт плату за дома', () => {
  const g = newGame(2);
  g.tiles[1].owner = 'p0'; g.tiles[3].owner = 'p0';
  g.tiles[1].houses = 2; g.tiles[3].houses = 1; // 3 дома -> 3*40=120
  g.decks.chance = ['ch_repairs', ...g.decks.chance.filter(x => x !== 'ch_repairs')];
  g.players[0].pos = 4; g.phase = 'roll';
  forceDice([1,2]);                            // -> 7 chance
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1500 - 120);
});

test('дубль даёт дополнительный ход', () => {
  const g = newGame(2);
  g.players[0].pos = 0; g.phase = 'roll';
  forceDice([1,1]);                            // дубль, сумма 2 -> клетка 2 (chest)
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.phase, 'roll');               // снова его ход
  assert.equal(g.doublesCount, 1);
});

test('три дубля подряд -> тюрьма', () => {
  const g = newGame(2);
  g.players[0].pos = 0; g.phase = 'roll';
  forceDice([2,2, 3,3, 1,1]);                  // три дубля
  E.act(g, 'p0', { type:'roll' });             // ->4 tax
  E.act(g, 'p0', { type:'roll' });             // ->10 (visiting)
  E.act(g, 'p0', { type:'roll' });             // третий дубль -> тюрьма
  assert.ok(g.players[0].inJail);
  assert.equal(g.players[0].pos, 10);
});

test('чужой ход отклоняется', () => {
  const g = newGame(2);
  assert.equal(E.act(g, 'p1', { type:'roll' }).error, 'not_your_turn');
});

test('currentActor и autoAction согласованы', () => {
  const g = newGame(2);
  assert.equal(E.currentActor(g), 'p0');
  assert.deepEqual(E.autoAction(g), { type:'roll' });
  g.phase = 'idle';
  assert.deepEqual(E.autoAction(g), { type:'endTurn' });
  g.phase = 'ended';
  assert.equal(E.currentActor(g), null);
});

/* --- блиц-режим --- */
test('блиц: каждому — полная группа-монополия + 1 экстра, классика — без раздачи', () => {
  const pls = [0,1,2].map(i => ({ id:'p'+i, name:'P'+i, emoji:'x', color:'#000', isBot:false }));
  const g = E.createGame(pls, { capital:1500, mode:'blitz' });
  for(const p of g.players){
    // у игрока есть цвет, которым он владеет ПОЛНОСТЬЮ
    const colors = new Set();
    g.board.forEach((b, i) => { if(b.t === 'prop' && g.tiles[i].owner === p.id) colors.add(b.g); });
    const full = [...colors].some(c =>
      g.board.every((b, i) => b.t !== 'prop' || b.g !== c || g.tiles[i].owner === p.id));
    assert.ok(full, 'нет полной группы у ' + p.id);
    // плюс одна логистика/инфраструктура
    const extra = g.board.filter((b, i) => (b.t === 'air' || b.t === 'util') && g.tiles[i].owner === p.id).length;
    assert.equal(extra, 1);
  }
  assert.equal(g.settings.maxRounds, 12);
  const gc = E.createGame(pls, { capital:1500 });
  assert.ok(gc.tiles.every(t => t.owner === null));
  assert.equal(gc.settings.maxRounds, null);
});

test('блиц: инфляция ренты ×1.5 с 5-го круга, ×2 с 9-го', () => {
  const pls = [0,1].map(i => ({ id:'p'+i, name:'P'+i, emoji:'x', color:'#000', isBot:false }));
  const g = E.createGame(pls, { capital:1500, mode:'blitz' });
  g.tiles.forEach(t => { t.owner = null; });          // очистим раздачу для чистоты
  g.tiles[6].owner = 'p1';                             // Tvitter r[0]=6
  g.round = 5;
  g.turnIdx = 0; g.players[0].pos = 0; g.phase = 'roll';
  forceDice([2,4]);
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1500 - 9);           // 6×1.5=9
});

test('блиц: лимит кругов -> победа по состоянию', () => {
  const pls = [0,1].map(i => ({ id:'p'+i, name:'P'+i, emoji:'x', color:'#000', isBot:false }));
  const g = E.createGame(pls, { capital:1500, mode:'blitz' });
  g.tiles.forEach(t => { t.owner = null; });
  g.tiles[39].owner = 'p1';                            // Epple $400 — p1 богаче
  g.round = 12; g.turnIdx = 1; g.phase = 'idle';       // конец 12-го круга, ход p1
  const r = E.act(g, 'p1', { type:'endTurn' });        // p1 -> p0: новый круг 13 > 12
  assert.ok(r.ok);
  assert.equal(g.phase, 'ended');
  assert.equal(g.winner, 'p1');
  assert.ok(r.events.some(e => e.k === 'timeup'));
  assert.ok(r.events.filter(e => e.k === 'worth').length === 2);
});


/* --- блиц-экономика v2 --- */
test('блиц: зарплата тает — 200/100/0', () => {
  const pls = [0,1].map(i => ({ id:'p'+i, name:'P'+i, emoji:'x', color:'#000', isBot:false }));
  const g = E.createGame(pls, { capital:1500, mode:'blitz' });
  g.tiles.forEach(t => { t.owner = null; });
  // круг 5: +100
  g.round = 5; g.players[0].pos = 38; g.phase = 'roll'; g.turnIdx = 0;
  forceDice([1,1, 2,3]);                       // дубль 1+1: 38->0 (СТАРТ, посадка = проход)
  E.act(g, 'p0', { type:'roll' });
  assert.equal(g.players[0].cash, 1600);       // +100, круг 5
  // круг 9: +0
  const g2 = E.createGame(pls, { capital:1500, mode:'blitz' });
  g2.tiles.forEach(t => { t.owner = null; });
  g2.round = 9; g2.players[0].pos = 38; g2.phase = 'roll';
  forceDice([1,1]);
  E.act(g2, 'p0', { type:'roll' });
  assert.equal(g2.players[0].cash, 1500);      // ничего не дали
});

test('лимит: не больше 3 построек за ход', () => {
  const g = newGame(2);
  // синяя группа + жирная касса
  g.tiles[37].owner = 'p0'; g.tiles[39].owner = 'p0';
  g.players[0].cash = 5000; g.phase = 'idle';
  assert.ok(E.act(g, 'p0', { type:'build', tile:37 }).ok);
  assert.ok(E.act(g, 'p0', { type:'build', tile:39 }).ok);
  assert.ok(E.act(g, 'p0', { type:'build', tile:37 }).ok);
  assert.equal(E.act(g, 'p0', { type:'build', tile:39 }).error, 'build_limit');
  // новый ход — счётчик сброшен
  E.act(g, 'p0', { type:'endTurn' });
  g.turnIdx = 0; g.phase = 'idle';             // вернём ход p0 для чистоты теста
  assert.ok(E.act(g, 'p0', { type:'build', tile:39 }).ok);
});

test('блиц: отделения вдвое дешевле и продаются за четверть', () => {
  const pls = [0,1].map(i => ({ id:'p'+i, name:'P'+i, emoji:'x', color:'#000', isBot:false }));
  const g = E.createGame(pls, { capital:1500, mode:'blitz' });
  g.tiles.forEach(t => { t.owner = null; });
  g.tiles[1].owner = 'p0'; g.tiles[3].owner = 'p0';   // коричневая, hc 50 -> блиц 25
  g.phase = 'idle'; g.turnIdx = 0;
  assert.ok(E.act(g, 'p0', { type:'build', tile:1 }).ok);
  assert.equal(g.players[0].cash, 1500 - 25);
  assert.ok(E.act(g, 'p0', { type:'sellHouse', tile:1 }).ok);
  assert.equal(g.players[0].cash, 1500 - 25 + 12);    // floor(25/2)
});
