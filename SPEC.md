# СПЕЦИФИКАЦИЯ: «МОНОПОЛИЯ · Биржа 1929» — рабочая онлайн-игра

Превращаем дизайн-мокап (`monopoly/design/`, скопирован в `monopoly/public/`) в полноценную
локальную онлайн-игру. Node 22, Windows. **Ноль npm-зависимостей** — только встроенные модули
(http, crypto, fs, path). Порт **3200**.

## Файлы и владение (КРИТИЧНО: правь только свои файлы)

| Файл | Владелец | Содержимое |
|---|---|---|
| `monopoly/engine.js` | Агент E | Чистый игровой движок (CommonJS), без I/O |
| `monopoly/test/engine.test.js` | Агент E | Юнит-тесты (node:test) |
| `monopoly/test/sim.js` | Агент E | Монте-карло: боты доигрывают N партий |
| `monopoly/server.js` | Агент S | HTTP + статика + auth + комнаты + SSE + таймеры + боты |
| `monopoly/public/game.js` | Агент C | Клиент игры: SSE-состояние, доска, модалки, анимации |
| `monopoly/public/game.css` | Агент C | Стили игровых компонентов (подключает index.html) |
| `monopoly/public/index.html` | Агент A | Экраны: home/login/register/verify/lobby + пустые `#page-room`, `#page-game` |
| `monopoly/public/app.js` | Агент A | Оболочка: навигация, auth, лобби, `window.Net`, i18n-инициализация |
| `monopoly/public/styles.css` | Агент A | Правки стилей auth/lobby (game-стили НЕ здесь) |
| `monopoly/public/i18n.js` | Агент A | Ключи auth/lobby/общие (игровые ключи — в game.js) |
| `monopoly/public/logos.js` | никто | Не менять (LOGOS, CREST уже есть) |

Стиль кода: как в существующих файлах (русские комментарии, компактно). Клиент — глобальные
скрипты без модулей (порядок подключения: i18n.js → logos.js → app.js → game.js).

## Визуальный язык (обязателен для C и A)

Используй существующие CSS-переменные из styles.css: `--paper --paper-2 --ink --ink-2 --ink-soft
--emerald --emerald-dk --emerald-lt --oxblood --gold --navy --teal --line --line-soft
--g-brown --g-lblue --g-pink --g-orange --g-red --g-yellow --g-green --g-dblue`,
шрифты `--f-display` (Playfair), `--f-body` (Garamond), `--f-caps` (Oswald), классы `.btn
.btn-primary .btn-buy .btn-gold .panel .badge .seal .house .hotel .cell .board ...`.
Всё новое — в том же винтажном стиле «биржа 1929»: бумага, гравюрные рамки, золото.

---

# 1. AUTH API (Агент S — сервер, Агент A — клиент)

Все ответы: `{ok:true, ...}` либо `{error:'<code>'}` (HTTP 200 всегда, кроме 401 на /api/me и
защищённых). Сессия — cookie `mono_sid` (httpOnly, SameSite=Lax, 30 дней). Хранение:
`monopoly/data/users.json` (авто-создание; структура на усмотрение S). Пароли — `crypto.scryptSync`
(salt 16 байт hex). Валидация: username 2–24 символа, email по regex `/^\S+@\S+\.\S+$/`,
пароль ≥ 6.

- `POST /api/register {username, email, password}` → `{ok, needVerify:true}`.
  Создаёт неподтверждённого юзера, генерирует 6-значный код (истекает 15 мин, 5 попыток),
  кладёт «письмо» в демо-почту + `console.log`. Ошибки: `email_taken`, `bad_input`.
- `POST /api/verify {email, code}` → `{ok, user}` + ставит cookie (авто-вход).
  Ошибки: `bad_code`, `expired`, `too_many_attempts`, `not_found`.
- `POST /api/resend {email}` → `{ok}` (новый код, новое письмо).
- `POST /api/login {email, password}` → `{ok, user}` + cookie. Ошибки: `bad_credentials`,
  `unverified` (клиент тогда показывает экран верификации).
- `POST /api/goggle {name}` → `{ok, user}` + cookie. Пародийный OAuth: создаёт/находит
  подтверждённого юзера с email `<slug>@goggle.demo`. Имя 2–24 символа.
- `POST /api/logout` → `{ok}` (гасит сессию).
- `GET /api/me` → `{ok, user:{id, username, email}}` или 401 `{error:'unauthorized'}`.
- `GET /api/mailbox?email=<e>` → `{ok, letters:[{to, subject, code, ts}]}` — демо-почтовый ящик
  (только localhost; это осознанный демо-режим, письма не покидают сервер).

# 2. КОМНАТЫ И ПОТОК (S)

Юзер может быть максимум в одной комнате/игре. Комнаты живут в памяти (рестарт = сброс партий,
аккаунты сохраняются).

- `GET /api/rooms` → `{ok, rooms:[{id, name, host:{id,username}, members:N, maxPlayers, status}]}`
  (только публичные со status='waiting').
- `POST /api/rooms/create {name, maxPlayers(2..6), capital(1000|1500|2000), turnTime(30|60|120|null), private:bool}`
  → `{ok, roomId}`. Имя ≤ 40 символов.
- `POST /api/rooms/join {roomId}` → `{ok}`. Ошибки: `not_found`, `full`, `started`, `in_room`.
- `POST /api/rooms/leave {}` → `{ok}`. Хост ушёл из waiting-комнаты → хост передаётся или комната
  умирает, если пусто. Из идущей игры: игрок помечается disconnected, играет авто-таймер.
- `POST /api/rooms/bot {op:'add'|'remove', botId?}` → `{ok}` (только хост, waiting).
  Имена ботов: `Botschild, Monopolina, Lord Deposit, Margie Call, Baron Rent` (эмодзи 🤖).
- `POST /api/rooms/token {emoji}` → `{ok}` — выбрать фишку из `🎩 💼 📈 🚢 🏎️ 👑 💰 ⌛`
  (уникальна в комнате; ошибка `taken`).
- `POST /api/rooms/start {}` → `{ok}` (хост, участников ≥ 2). Создаёт игру через engine.
- `POST /api/game/action {action:{type,...}}` → `{ok}` | `{error}` (типы — раздел 4).
- `POST /api/chat {text}` → `{ok}` (≤ 300 символов; рассылается комнате/игре).

Цвета игроков по порядку: `#15563d #7c2230 #274b7a #2f6f6a #8a5a1f #5e3a63`.

# 3. SSE-ПОТОК (S ↔ A/C)

`GET /api/stream` (cookie-auth; SSE `data:<json>\n\n`; heartbeat-комментарий каждые 25 c).
Сообщения:

- `{type:'hello', user, where:'lobby'|'room'|'game'}` — при подключении.
- `{type:'lobby', rooms:[...]}` — юзерам в лобби при любом изменении списка.
- `{type:'room', room:{id,name,host,private,maxPlayers,capital,turnTime,status,members:[{id,name,emoji,isBot}]}}`
  — участникам waiting-комнаты. `room:null` = ты больше не в комнате.
- `{type:'game', game:<полный стейт из engine, вкл. board>, events:[<события с прошлой рассылки>]}`
  — после каждого изменения. Полный снапшот, клиент просто перерисовывает (события — для анимаций).
- `{type:'chat', from:{id,name}, text, ts}`.

Клиентский хелпер `window.Net` (пишет A, использует C):
```js
Net.connect()                    // открыть EventSource (переоткрывается сам)
Net.on('game', fn)               // подписка по type (несколько подписчиков)
Net.api('/api/rooms/join', {roomId}) // fetch POST JSON (credentials), → Promise<json>
Net.get('/api/rooms')            // fetch GET → Promise<json>
```

# 4. ДВИЖОК (Агент E) — `monopoly/engine.js`

CommonJS, чистые функции над plain-объектом `game`. Экспорт:
```js
module.exports = { createGame, act, autoAction, currentActor, autoLiquidate, BOARD, CARDS };
createGame(players /*[{id,name,emoji,color,isBot}]*/, settings /*{capital,turnTime}*/) → game
act(game, playerId, action) → {ok:true, events:[...]} | {ok:false, error:'code'}   // мутирует game
autoAction(game) → action|null      // что сделать по таймауту за текущего решающего
currentActor(game) → playerId|null  // чьё решение ждём (null в 'auction' — решает сервер-таймер)
autoLiquidate(game, playerId) → events[]  // продать дома/заложить до покрытия долга, иначе банкрот
```

## Стейт (точные имена полей!)
```js
game = {
  settings: {capital, turnTime},
  board: BOARD,                    // статика, см. раздел 5
  players: [{id, name, emoji, color, cash, pos, inJail, jailTurns, jailCards, bankrupt, isBot}],
  tiles: Array(40) из {owner:null|id, houses:0..5, mortgaged:false},  // houses:5 = штаб-квартира
  turnIdx: 0,
  phase: 'roll'|'buy'|'auction'|'idle'|'debt'|'ended',
  rolled: null|[a,b], doublesCount: 0,
  pendingTile: null|idx,           // клетка, ждущая решения buy/decline
  auction: null|{tile, highBid, highBidder:null|id, passed:[ids]},
  debt: null|{playerId, amount, to:null|id},
  trades: [{id, from, to, giveCash, takeCash, giveTiles:[], takeTiles:[]}],
  decks: {chance:[ids], chest:[ids]},   // перетасованы при создании
  log: [],                         // последние 60 событий (engine пушит сам)
  winner: null|id,
  round: 1
}
```

## Действия `act` (все типы)
`{type:'roll'}` `{type:'buy'}` `{type:'decline'}` `{type:'bid', amount}` `{type:'pass'}`
`{type:'auctionClose'}` (только сервер, playerId=null) `{type:'endTurn'}`
`{type:'build', tile}` `{type:'sellHouse', tile}` `{type:'mortgage', tile}` `{type:'unmortgage', tile}`
`{type:'jailPay'}` `{type:'jailCard'}`
`{type:'trade', to, giveCash, takeCash, giveTiles, takeTiles}`
`{type:'tradeAccept', id}` `{type:'tradeDecline', id}` `{type:'tradeCancel', id}`
`{type:'bankrupt'}` `{type:'autoResolveDebt'}` (сервер-таймер → autoLiquidate)
Коды ошибок: `not_your_turn bad_phase no_cash bad_tile not_owner uneven has_houses mortgaged
bad_trade bad_amount not_found taken cant`.

## Правила (классика с оговорками)
- Бросок: 2d6. Дубль → ходит ещё раз; 3 дубля подряд → тюрьма («под следствием»).
- СТАРТ: +$200 за проход и посадку. Налоги: idx4 −$200, idx38 −$100. Парковка (Офшор): ничего.
- Покупка: встал на ничейную → phase 'buy' (buy/decline). decline → аукцион.
- Аукцион: участвуют все не-банкроты (вкл. отказавшегося). Стартовая ставка $10, шаг ≥ $10.
  `bid` перебивает, `pass` — навсегда. Остался один активный с ставкой → он победил (движок сам
  закрывает). Никто не поставил и все спасовали (или `auctionClose` при бездействии) → клетка
  остаётся ничейной. После аукциона — как после buy: дубль → 'roll', иначе 'idle'.
- Рента: платится автоматически при посадке (событие). Владелец в тюрьме — получает. Заложенная —
  не платится. Полная группа без домов → базовая ×2. Логистика (ж/д): 25/50/100/200 по числу сетей
  у владельца. Инфраструктура: 4× сумма броска (одна) / 10× (обе).
- Дома («отделения», 5-й = «штаб-квартира»): строит только владелец полной незаложенной группы,
  только в свой ход (phase 'roll' или 'idle'), равномерно (even-build). Продажа за полцены,
  равномерно (even-sell). Лимиты банка на дома не моделируем.
- Залог: клетка без домов во всей группе → получаешь price/2. Выкуп: price/2 × 1.1 (округлить).
- Тюрьма (idx10, «под следствием»): вход — idx30, карта, 3 дубля. В свой ход: `roll` (дубль →
  выходишь и идёшь, без доп. хода), `jailPay` ($50 → потом обычный бросок), `jailCard`.
  3-я неудача → принудительно $50 (нет денег → debt) и идёшь по выброшенному.
- Долг (phase 'debt'): не хватает на платёж → debt фиксируется, игрок может sellHouse/mortgage/trade;
  как только cash ≥ долга — движок сам списывает и продолжает. `bankrupt` — сдаться.
  Банкротство: кредитору-игроку → все клетки (с флагами залога), деньги, jail-карты; дома продаются
  банку за полцены (деньги тоже кредитору). Кредитор-банк → клетки становятся ничейными и чистыми.
- Сделки: любой живой игрок любому в любой phase кроме 'ended'/'auction'. Нельзя тайлы с домами в
  группе, нельзя pendingTile/auction.tile. Кэш ≤ наличности. Максимум 3 исходящих на игрока.
  Заложенные передаются как есть (без 10% сбора — упрощение).
- Конец хода: `endTurn` (только phase 'idle' без долга). Следующий не-банкрот. round++ на круге.
- Победа: остался один → phase 'ended', winner. События 'win'.

## События (каждое — `{k:'...', ...параметры}`; движок пушит в game.log и возвращает из act)
`roll{p,a,b}` `move{p,from,to,passGo}` `buy{p,t,price}` `rent{p,to,t,amount}` `tax{p,t,amount}`
`card{p,deck,id}` `pay{p,amount,to}` `gain{p,amount,from}` `jail_in{p}` `jail_out{p,how}` (how:
pay|card|doubles|force) `auction_start{t}` `bid{p,amount}` `auction_pass{p}` `auction_win{p,t,amount}`
`auction_none{t}` `build{p,t,houses}` `sell_house{p,t,houses}` `mortgage{p,t}` `unmortgage{p,t}`
`trade_offer{id,from,to}` `trade_accept{id,from,to}` `trade_decline{id}` `trade_cancel{id}`
`debt{p,amount,to}` `bankrupt{p,to}` `turn{p,round}` `win{p}`
(p/to/from — id игроков, t — индекс клетки.)

# 5. ДОСКА (константа BOARD в engine; клетка = объект)

Форматы: property `{t:'prop', n, logo, g, p, r:[6], hc}`; логистика `{t:'air', n, logo, p:200}`;
инфраструктура `{t:'util', n, logo, p:150}`; углы/налоги/карты как ниже. Полный массив (idx: данные):

```
0  {t:'corner', k:'go'}
1  prop Nokla       brown  60  r[2,10,30,90,160,250]      hc50   logo nokla
2  {t:'chest'}
3  prop Yahwoo!     brown  60  r[4,20,60,180,320,450]     hc50   logo yahwoo
4  {t:'tax', k:'income', p:200}
5  air  FodEx       logo fodex
6  prop Tvitter     lblue  100 r[6,30,90,270,400,550]     hc50   logo tvitter
7  {t:'chance'}
8  prop Skyqe       lblue  100 r[6,30,90,270,400,550]     hc50   logo skyqe
9  prop Zoon        lblue  120 r[8,40,100,300,450,600]    hc50   logo zoon
10 {t:'corner', k:'jail'}
11 prop Instaglam   pink   140 r[10,50,150,450,625,750]   hc100  logo instaglam
12 util Tesler Power logo tesler
13 prop T-Nobile    pink   140 r[10,50,150,450,625,750]   hc100  logo tnobile
14 prop Twutch      pink   160 r[12,60,180,500,700,900]   hc100  logo twutch
15 air  UDS         logo uds
16 prop Reddat      orange 180 r[14,70,200,550,750,950]   hc100  logo reddat
17 {t:'chest'}
18 prop SoundClod   orange 180 r[14,70,200,550,750,950]   hc100  logo soundclod
19 prop Firefax     orange 200 r[16,80,220,600,800,1000]  hc100  logo firefax
20 {t:'corner', k:'parking'}
21 prop Cosa-Cola   red    220 r[18,90,250,700,875,1050]  hc150  logo cosacola
22 {t:'chance'}
23 prop YouTune     red    220 r[18,90,250,700,875,1050]  hc150  logo youtune
24 prop Netflex     red    240 r[20,100,300,750,925,1100] hc150  logo netflex
25 air  DHK         logo dhk
26 prop McRonald's  yellow 260 r[22,110,330,800,975,1150] hc150  logo mcronalds
27 prop IKEYA       yellow 260 r[22,110,330,800,975,1150] hc150  logo ikeya
28 util Goggle Cloud logo gogglecloud
29 prop Snapchit    yellow 280 r[24,120,360,850,1025,1200] hc150 logo snapchit
30 {t:'corner', k:'gotojail'}
31 prop Spatify     green  300 r[26,130,390,900,1100,1275] hc200 logo spatify
32 prop WhatsUpp    green  300 r[26,130,390,900,1100,1275] hc200 logo whatsupp
33 {t:'chest'}
34 prop Startbucks  green  320 r[28,150,450,1000,1200,1400] hc200 logo startbucks
35 air  Ubar        logo ubar
36 {t:'chance'}
37 prop Nozama      dblue  350 r[35,175,500,1100,1300,1500] hc200 logo nozama
38 {t:'tax', k:'audit', p:100}
39 prop Epple       dblue  400 r[50,200,600,1400,1700,2000] hc200 logo epple
```
Залог = p/2. Геометрия рендера (по часовой от старта в правом нижнем углу) — как в
`monopoly/design/app.js` (gridPos/sideClass).

# 6. КАРТЫ (CARDS в engine; id стабильны — клиент переводит по id)

CHANCE («Биржа»): `ch_go`(на СТАРТ +200) `ch_jail`(в тюрьму) `ch_jailfree`(карта выхода)
`ch_pay_each_50`(каждому игроку по $50) `ch_div150`(+$150) `ch_fine100`(−$100)
`ch_to39`(на Epple) `ch_to19`(на Firefax) `ch_back3`(назад на 3) `ch_repairs`($40/дом, $115/штаб)
`ch_gain100`(+$100) `ch_to_ubar`(на Ubar, обычная посадка).
CHEST («Совет»): `cc_gain200` `cc_from_each50`(с каждого по $50) `cc_pay50` `cc_jailfree` `cc_jail`
`cc_gain100` `cc_pay100` `cc_gain25` `cc_repairs`($25/$100) `cc_go` `cc_gain10` `cc_pay75`.
Перемещение по карте: через СТАРТ → +200. jailfree удаляется из колоды до использования, потом в низ.

# 7. БОТЫ (реализует S поверх engine)

После каждой рассылки: если `currentActor` — бот (или в auction/trade ждут боты) → setTimeout
600–1200 мс → действие:
- roll всегда; тюрьма: card > pay (если cash ≥ 150) > roll.
- buy: если cash − price ≥ 150 → buy, иначе decline.
- auction: у каждого бота maxBid = 0.75×price (но cash−100); перебивает +10..50 пока ≤ maxBid.
- idle: пока cash > 400 → build самое дешёвое доступное (even-rule, буфер 300); unmortgage при
  cash > 500; затем endTurn.
- debt: autoLiquidate.
- trade-ответ (1 с): оценка = получаю(кэш+Σцен; клетка, завершающая МОЮ группу ×2) −
  отдаю(аналогично; завершающая группу ОППОНЕНТА ×2). Принять если ≥ +50.
- Таймер хода (settings.turnTime): по истечении сервер применяет autoAction/`autoResolveDebt`;
  аукцион: 12 с тишины → `auctionClose`.

# 8. КЛИЕНТ ИГРЫ (Агент C) — game.js + game.css

Владеет содержимым `#page-room` и `#page-game` (в HTML — пустые секции; C генерирует DOM).
Подписки: `Net.on('room'|'game'|'chat'|'hello')`. Глобально экспортирует `window.Game =
{showRoom(room), showGame(game), reset()}` — app.js зовёт при навигации/hello.

**Экран комнаты (#page-room):** название + код комнаты (для приглашения), настройки, список мест
(аватар-эмодзи, имя, хост-метка), выбор фишки (клик по свободной), кнопки: «+ Бот» / «− Бот»
(хосту), «Начать партию» (хосту, ≥2), «Покинуть», чат.

**Экран игры (#page-game):** переиспользуй классы доски из styles.css (.board .cell .band .seal
.houses .tokens ...). Рендер из `game.board` + `game.tiles` + позиций игроков. Логотипы из LOGOS.
- Центр доски: кубики (анимация перебора при событии roll), лента лога (из событий, i18n),
  колоды. Фишка ходит с анимацией по клеткам (шаг ~90 мс, по событию move; passGo — мигнуть СТАРТ).
- Сайдбар: игроки (кэш live, метки «ходит»/«под следствием»/«банкрот», СВОЯ карточка выделена),
  таймер хода (обратный отсчёт от deadline не шлём — просто локальный от turnTime при событии turn),
  контекстные кнопки ТОЛЬКО когда решение за тобой:
  roll → «Бросить кубики» (или jailPay/jailCard/roll в тюрьме);
  buy → модалка-сертификат (как page-card в мокапе: логотип, таблица ренты) «Купить $N» / «На аукцион»;
  auction → панель аукциона: клетка, текущая ставка+лидер, кнопки +10/+50/+100/pass (жив всегда,
  не только в свой ход);
  idle → «Завершить ход», «Активы» (модалка управления: список моих клеток; build/sellHouse/
  mortgage/unmortgage с ценами), «Сделка» (модалка: выбор партнёра, мои/его клетки чекбоксами,
  кэш с обеих сторон, отправить);
  debt → красная плашка долга + «Активы» + «Признать банкротство» (с confirm).
- Входящая сделка → модалка предложения (принять/отклонить). Карта Шанс/Совет → модалка-карточка
  в винтажном стиле (текст по id из своего словаря).
- Конец игры → оверлей «Победитель» (герб, имя, «В лобби»).
- Чат внизу сайдбара. Лог событий: последние ~8, из event-потока + game.log при первом снапшоте.
- i18n: свой словарь `const GAME_I18N = {ru:{...}, en:{...}}` и в init:
  `Object.assign(I18N.ru, GAME_I18N.ru); Object.assign(I18N.en, GAME_I18N.en);`
  Ключи событий: `ev.roll ev.move ev.pass_go ev.buy ev.rent ev.tax ev.card ev.pay ev.gain
  ev.jail_in ev.jail_out_pay ev.jail_out_card ev.jail_out_doubles ev.jail_out_force
  ev.auction_start ev.bid ev.auction_pass ev.auction_win ev.auction_none ev.build ev.sell_house
  ev.mortgage ev.unmortgage ev.trade_offer ev.trade_accept ev.trade_decline ev.trade_cancel
  ev.debt ev.bankrupt ev.turn ev.win`; карты: `card.ch_* card.cc_*`; UI-ключи с префиксом `g.`.
  При смене языка app.js зовёт `Game.rerender()` (экспортируй и это).
- Всё пользовательское (имена, чат) вставлять как text (escape), не innerHTML.

# 9. ОБОЛОЧКА (Агент A) — index.html, app.js, styles.css, i18n.js

1. **Починить стили форм** (жалоба пользователя!): единый стиль для ВСЕХ инпутов
   (`.field input` — text/password/email; сейчас стилизован только `[type=text]` → пароли выглядят
   системно-белыми). Внутри `.pw` инпут без рамки, рамка на обёртке; кнопка «показать» по центру.
   Индикатор надёжности: полоса 8px + подпись, аккуратные отступы.
2. **Экран верификации** `#page-verify`: «Мы отправили код на …», 6 клеток кода (авто-фокус
   следующей, вставка из буфера), «Подтвердить» → `/api/verify` → в лобби; «Отправить ещё раз»
   (кулдаун 30 с). После `/api/register` — сразу сюда + автопоказ письма из демо-почты.
3. **Демо-почта**: кнопка «📮» в шапке (бейдж непрочитанных), модалка «Почтовое отделение · демо»
   в виде винтажной телеграммы: КОМУ, ТЕМА, код крупно (Playfair), пометка «демо-режим: письма не
   покидают сервер». Данные из `GET /api/mailbox?email=`.
4. **Goggle-вход**: обе кнопки открывают модалку-пародию аккаунт-чузера («Goggle», 4-цветный
   вордмарк из палитры gogglecloud-логотипа): поле имени + «Продолжить» → `/api/goggle` → лобби.
5. **Регистрация**: чекбокс правил обязателен (ошибка если нет), submit → `/api/register` →
   verify. **Вход**: `/api/login`; при `unverified` → экран verify с этим email.
6. **Шапка**: после входа вместо Войти/Регистрация — чип юзера (имя + 🎩) и «Выйти»
   (`/api/logout`). Вкладка «Лобби» требует входа (иначе → login). Вкладку «Партия» показывать
   только когда идёт игра. Мокап-вкладки Сертификат/Бренд-кит/Стиль оставить.
7. **Лобби — реальное**: список комнат из `Net.on('lobby')` + `GET /api/rooms` (кнопка «Войти» →
   join → room-экран); «Учредить партию» → `/api/rooms/create` → room-экран; поле «код комнаты»
   для приватных. Убрать мокапные комнаты/выбор фишки (фишка выбирается в комнате).
8. **window.Net** (раздел 3) — владелец A. `Net.on('hello')`: маршрутизация where →
   lobby/room/game (зови `Game.showRoom/showGame`). При 401 на /api/me — гость: Главная.
9. **app.js чистка**: рендер мокапной доски/кубиков/чата удалить (переехало в game.js);
   Котировки дня, тикер, навигация, i18n, переключатель языка остаются. При смене языка —
   `Game.rerender()` если есть.
10. **i18n.js**: добавить ключи всех новых экранов (verify, mailbox, goggle, лобби-реал, ошибки
    API: `api.email_taken api.bad_code api.expired api.bad_credentials api.unverified api.full
    api.not_found api.taken ...` — тосты). Тост-хелпер `window.toast(msg)` — винтажная плашка.
11. index.html: `<section class="tab-page" id="page-room"></section>` и `#page-game` пустые;
    подключить `game.css` и `game.js` (после app.js); версии `?v=4`.

# 10. СЕРВЕР (Агент S) — server.js

- Статика из `monopoly/public` (MIME + no-store, как в design/serve.js), `/` → index.html.
- JSON-body парсер (лимит 64КБ), cookie-парсер, роутер — всё руками, без зависимостей.
- SSE-реестр: connId → {userId, res}; рассылки по аудиториям (лобби = юзеры без комнаты; комната;
  игра). Отвал соединения — чистить. Heartbeat 25 с.
- Игровой цикл: после каждого успешного act → broadcast {type:'game'} с events → scheduleBots()
  → перезапуск таймера хода. Таймеры: ход (turnTime; null = нет), аукцион-тишина 12 с,
  боты 600–1200 мс. Все таймеры сбрасывать при действиях. Race-safety: действия обрабатывать
  синхронно (Node однопоточен — достаточно), таймеры проверяют актуальность (id действия/фазы).
- Игра кончилась (winner) → комната остаётся 60 с (показ победителя), потом расформировать,
  игроков в лобби. stats юзеров: games++, wins++ победителю (persist).
- console.log ключевых событий (регистрация: код письма!, старт партии, ошибки).
- Персист users.json атомарно (tmp+rename), debounce 500 мс.

# 11. DEFINITION OF DONE (каждый агент — самопроверка!)

- E: `node --check engine.js` ок; `node --test monopoly/test/engine.test.js` — ≥ 25 осмысленных
  тестов (покупка, рента ×2, дома even-rule, залог, аукцион, тюрьма 3 попытки, долг→банкрот,
  сделка, карты repairs, победа) — все зелёные; `node monopoly/test/sim.js` — 100 бот-партий
  (случайные валидные действия через autoAction+простые эвристики прямо в sim) доигрываются
  (или обрубаются на 5000 действий с отчётом), деньги не уходят в минус вне debt, инварианты ок.
- S: `node --check server.js`; сервер стартует; smoke: register→mailbox→verify→login→create→join
  (curl'ом самому себя проверить, порт 3201 чтобы не мешать, флаг `--port`; по умолчанию 3200).
- C: `node --check public/game.js`; в отчёте перечислить все Net-вызовы и типы action —
  сверить по спеке.
- A: `node --check public/app.js public/i18n.js`; в отчёте — список эндпоинтов, статус i18n
  (нет русских строк, зашитых в разметку без ключей).
Отчёт: что сделано, отклонения от спеки, вопросы к интеграции.
