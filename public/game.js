/* =====================================================================
   МОНОПОЛИЯ · «БИРЖА 1929» — игровой клиент (Агент C)
   Экран комнаты (#page-room) и экран игры (#page-game).
   Протокол: window.Net (app.js) — Net.on / Net.api / Net.get.
   Экспорт: window.Game = { showRoom, showGame, reset, rerender }.
   Порядок подключения: i18n.js → logos.js → app.js → game.js.
   ===================================================================== */
(function(){
'use strict';

/* ===================== СЛОВАРЬ ИГРОВЫХ КЛЮЧЕЙ ===================== */
const GAME_I18N = {
ru: {
  /* --- общие --- */
  'g.bank':'банк', 'g.ok':'Понятно', 'g.close':'Закрыть', 'g.yes':'Да', 'g.no':'Отмена',
  'g.copy':'копировать', 'g.copied':'скопировано!',
  'g.chat':'Чат', 'g.chat.ph':'Сообщение...',
  'g.waiting':'Ожидаем решения: {p}', 'g.out':'Вы выбыли из партии — наблюдайте за торгами',
  'g.turn':'Ход:', 'g.round':'круг {n}', 'g.roundOf':'круг {n} из {max}', 'g.inflation':'рента ×{m}', 'g.salary':'СТАРТ +{s}', 'g.players':'Акционеры',
  'g.badge.now':'ходит', 'g.badge.jail':'под следствием', 'g.badge.bankrupt':'банкрот', 'g.badge.you':'вы',
  'g.stamp':'залог',

  /* --- комната --- */
  'g.room.head':'Комната', 'g.room.code':'Код для приглашения',
  'g.room.rules':'Условия партии', 'g.room.players':'Игроков', 'g.room.capital':'Капитал',
  'g.room.turntime':'Время на ход', 'g.room.unlimited':'без лимита',
  'g.room.private':'приватная', 'g.room.public':'открытая',
  'g.room.seats':'За столом', 'g.room.host':'распорядитель', 'g.room.bot':'бот',
  'g.room.free':'место свободно', 'g.room.token':'Выбери фишку',
  'g.room.addbot':'+ Бот', 'g.room.rembot':'− Бот',
  'g.room.start':'Начать партию', 'g.room.leave':'Покинуть',
  'g.room.min2':'Для старта нужно минимум два участника',

  /* --- сайдбар / действия --- */
  'g.roll':'🎲 Бросить кубики', 'g.endturn':'Завершить ход', 'g.assets':'Активы', 'g.trade':'Сделка',
  'g.jail.title':'Вы под следствием', 'g.jail.tries':'попытка {n} из 3',
  'g.jail.roll':'🎲 Бросить (нужен дубль)', 'g.jail.pay':'Заплатить $50', 'g.jail.card':'Карта «свободен»',

  /* --- сертификат покупки --- */
  'g.buy':'Купить {price}', 'g.decline':'На аукцион',
  'g.cert.label':'— Сертификат акции —', 'g.cert.tile':'поле №{n}',
  'g.cert.rent':'Рента', 'g.cert.rentgroup':'Со всей группой',
  'g.cert.r1':'С 1 отделением', 'g.cert.r2':'С 2 отделениями', 'g.cert.r3':'С 3 отделениями', 'g.cert.r4':'С 4 отделениями',
  'g.cert.rhq':'Со штаб-квартирой', 'g.cert.branch':'Отделение', 'g.cert.mortgage':'Залог',
  'g.cert.air1':'Рента (1 сеть)', 'g.cert.air2':'2 сети', 'g.cert.air3':'3 сети', 'g.cert.air4':'4 сети',
  'g.cert.util1':'Рента (одна сеть)', 'g.cert.util1v':'×4 суммы кубиков',
  'g.cert.util2':'Обе сети', 'g.cert.util2v':'×10 суммы кубиков',

  /* --- группы --- */
  'g.grp.brown':'🦖 Динозавры', 'g.grp.lblue':'📞 Созвоны', 'g.grp.pink':'📸 Соцсети',
  'g.grp.orange':'🎵 Музыка', 'g.grp.red':'🍔 Еда и напитки', 'g.grp.yellow':'🎬 Видео',
  'g.grp.green':'✉️ Мессенджеры', 'g.grp.dblue':'👑 Титаны',
  'g.grp.air':'✈ Логистика', 'g.grp.util':'⚡ Инфраструктура',

  /* --- аукцион --- */
  'g.auc.title':'Аукцион', 'g.auc.lot':'Лот', 'g.auc.bid':'Текущая ставка',
  'g.auc.leader':'лидер', 'g.auc.nobids':'ставок нет', 'g.auc.pass':'Пас',
  'g.auc.passed':'Вы спасовали', 'g.auc.youlead':'Вы лидируете',

  /* --- долг / банкротство --- */
  'g.debt.title':'Долг', 'g.debt.owe':'Вы должны {amount} — {to}',
  'g.debt.hint':'Продавайте отделения и закладывайте активы, пока не наберёте сумму',
  'g.debt.other':'{p} собирает средства на долг {amount}',
  'g.bankrupt':'Признать банкротство',
  'g.bankrupt.confirm':'Признать банкротство? Все активы будут переданы кредитору, а вы выбываете из партии.',

  /* --- активы --- */
  'g.as.title':'Управление активами', 'g.as.empty':'У вас пока нет собственности',
  'g.as.build':'+ Отделение', 'g.as.sellh':'Продать', 'g.as.mort':'Заложить', 'g.as.unmort':'Выкупить',
  'g.as.mortgaged':'заложена', 'g.as.hq':'штаб-квартира',
  'g.hint.group':'нужна вся цветовая группа', 'g.hint.even':'стройте равномерно по группе',
  'g.hint.evensell':'продавайте равномерно по группе', 'g.hint.mortgroup':'в группе есть заложенная клетка',
  'g.hint.houses':'сначала продайте отделения в группе', 'g.hint.nocash':'не хватает наличности',
  'g.hint.turn':'только в свой ход', 'g.hint.max5':'достроена штаб-квартира', 'g.hint.nohouses':'нет отделений',

  /* --- сделки --- */
  'g.tr.panel':'Сделки', 'g.tr.title':'Конструктор сделки', 'g.tr.partner':'Партнёр',
  'g.tr.igive':'Вы отдаёте', 'g.tr.itake':'Вы получаете', 'g.tr.cash':'Наличные',
  'g.tr.send':'Отправить предложение', 'g.tr.incoming':'Входящая сделка',
  'g.tr.offer':'{p} предлагает вам сделку', 'g.tr.accept':'Принять', 'g.tr.decline':'Отклонить',
  'g.tr.cancel':'Отозвать', 'g.tr.out':'вы → {p}', 'g.tr.in':'{p} → вам', 'g.tr.view':'Смотреть',
  'g.tr.nothing':'— ничего —', 'g.tr.notiles':'нет доступных клеток',

  /* --- победа --- */
  'g.win.title':'Победитель', 'g.win.bankrupt':'Все соперники разорены', 'g.win.worth':'Самое большое состояние после {rounds} кругов', 'g.win.fortunes':'Итоговые состояния',
  'g.win.lobby':'В лобби',

  /* --- центр доски --- */
  'g.deck.chance':'Биржа', 'g.deck.chest':'Совет',
  'g.deck.chance.t':'? Биржа', 'g.deck.chance.s':'курс качнулся',
  'g.deck.chest.t':'❖ Совет', 'g.deck.chest.s':'директоров',

  /* --- ошибки движка --- */
  'g.err.not_your_turn':'Сейчас не ваш ход', 'g.err.bad_phase':'Сейчас это действие недоступно',
  'g.err.no_cash':'Не хватает наличности', 'g.err.build_limit':'Лимит: 3 постройки за ход', 'g.err.bad_tile':'Эта клетка не подходит',
  'g.err.not_owner':'Это не ваша собственность', 'g.err.uneven':'Стройте и продавайте равномерно',
  'g.err.has_houses':'Сначала продайте отделения', 'g.err.mortgaged':'Клетка заложена',
  'g.err.bad_trade':'Такую сделку нельзя предложить', 'g.err.bad_amount':'Неверная сумма',
  'g.err.not_found':'Не найдено', 'g.err.taken':'Уже занято', 'g.err.cant':'Сейчас нельзя',
  'g.err.full':'Комната полна', 'g.err.started':'Партия уже началась', 'g.err.in_room':'Вы уже в комнате',

  /* --- события лога --- */
  'ev.roll':'{p} выбрасывает {a} + {b} = {s}',
  'ev.move':'{p} переходит на {t}',
  'ev.pass_go':'{p} проходит СТАРТ и получает {amount}',
  'ev.buy':'{p} покупает {t} за {amount}',
  'ev.rent':'{p} платит {to} ренту {amount} за {t}',
  'ev.tax':'{p} платит налог {amount} — {t}',
  'ev.card':'{p} тянет карту «{deck}»',
  'ev.pay':'{p} выплачивает {amount} ({to})',
  'ev.gain':'{p} получает {amount} ({from})',
  'ev.jail_in':'{p} отправляется под следствие',
  'ev.jail_out_pay':'{p} платит $50 и выходит из-под следствия',
  'ev.jail_out_card':'{p} предъявляет карту «свободен» и выходит',
  'ev.jail_out_doubles':'{p} выбрасывает дубль и выходит из-под следствия',
  'ev.jail_out_force':'{p} после трёх попыток принудительно платит $50',
  'ev.auction_start':'{t} выставляется на аукцион',
  'ev.bid':'{p} ставит {amount}',
  'ev.auction_pass':'{p} пасует',
  'ev.auction_win':'{p} выигрывает аукцион: {t} за {amount}',
  'ev.auction_none':'Аукцион не состоялся — {t} остаётся у банка',
  'ev.build':'{p} строит отделение на {t} ({houses}/5)',
  'ev.build_hq':'{p} возводит штаб-квартиру на {t}',
  'ev.sell_house':'{p} продаёт отделение на {t} ({houses}/5)',
  'ev.mortgage':'{p} закладывает {t}',
  'ev.unmortgage':'{p} выкупает {t} из залога',
  'ev.trade_offer':'{from} предлагает {to} сделку',
  'ev.trade_accept':'Сделка заключена: {from} ↔ {to}',
  'ev.trade_decline':'Сделка отклонена',
  'ev.trade_cancel':'Предложение сделки отозвано',
  'ev.debt':'{p} в долгу: {amount} ({to})',
  'ev.bankrupt':'{p} — банкрот! Активы переходят: {to}',
  'ev.turn':'Ход переходит к {p} — круг {round}',
  'ev.win':'🏆 {p} побеждает!', 'ev.timeup':'⏰ {rounds} кругов сыграно — торги закрыты, считаем состояния', 'ev.worth':'Состояние {p}: {amount}', 'ev.deal':'{p} получает {t} при раздаче',

  /* --- карты «Биржа» (Шанс) --- */
  'card.ch_go':'Курс ваших акций взлетел! Пройдите на СТАРТ и получите $200.',
  'card.ch_jail':'Комиссия по ценным бумагам заинтересовалась вашими сделками. Отправляйтесь под следствие!',
  'card.ch_jailfree':'Ваш адвокат творит чудеса. Сохраните эту карту — она выведет вас из-под следствия.',
  'card.ch_pay_each_50':'Вас уличили в инсайдерской торговле. Выплатите каждому игроку по $50 отступных.',
  'card.ch_div150':'Совет директоров объявляет дивиденды. Получите $150.',
  'card.ch_fine100':'Штраф за манипуляции с котировками: заплатите $100.',
  'card.ch_to39':'Срочная командировка в Купертино! Отправляйтесь на Epple.',
  'card.ch_to19':'Пожар в браузере! Спешите на Firefax.',
  'card.ch_back3':'Рынок откатился. Вернитесь на три клетки назад.',
  'card.ch_repairs':'Капитальный ремонт всех офисов: $40 за каждое отделение и $115 за штаб-квартиру.',
  'card.ch_gain100':'Удачная спекуляция на бирже принесла вам $100.',
  'card.ch_to_ubar':'Водитель уже ждёт у подъезда. Поезжайте на Ubar.',

  /* --- карты «Совет» (Казна) --- */
  'card.cc_gain200':'Банк ошибся в вашу пользу. Получите $200.',
  'card.cc_from_each50':'Вы устраиваете благотворительный ужин. Каждый игрок вносит по $50.',
  'card.cc_pay50':'Врачебный осмотр для магната: заплатите $50.',
  'card.cc_jailfree':'Совет директоров на вашей стороне. Карта выхода из-под следствия — сохраните её.',
  'card.cc_jail':'Аудит вскрыл двойную бухгалтерию. Под следствие!',
  'card.cc_gain100':'Страховая премия по итогам года: получите $100.',
  'card.cc_pay100':'Больничные счета: заплатите $100.',
  'card.cc_gain25':'Гонорар за консультацию: получите $25.',
  'card.cc_repairs':'Городская ассамблея требует ремонта фасадов: $25 за отделение и $100 за штаб-квартиру.',
  'card.cc_go':'Пройдите на СТАРТ и получите $200.',
  'card.cc_gain10':'Вы заняли второе место в конкурсе красоты. Приз — $10.',
  'card.cc_pay75':'Школьный сбор: заплатите $75.',
},
en: {
  /* --- common --- */
  'g.bank':'the bank', 'g.ok':'Got it', 'g.close':'Close', 'g.yes':'Yes', 'g.no':'Cancel',
  'g.copy':'copy', 'g.copied':'copied!',
  'g.chat':'Chat', 'g.chat.ph':'Message...',
  'g.waiting':'Waiting for {p}', 'g.out':'You are out of the game — enjoy the show',
  'g.turn':'Turn:', 'g.round':'round {n}', 'g.roundOf':'round {n} of {max}', 'g.inflation':'rent ×{m}', 'g.salary':'GO +{s}', 'g.players':'Shareholders',
  'g.badge.now':'playing', 'g.badge.jail':'under investigation', 'g.badge.bankrupt':'bankrupt', 'g.badge.you':'you',
  'g.stamp':'pledged',

  /* --- room --- */
  'g.room.head':'Room', 'g.room.code':'Invite code',
  'g.room.rules':'Game terms', 'g.room.players':'Players', 'g.room.capital':'Capital',
  'g.room.turntime':'Turn time', 'g.room.unlimited':'no limit',
  'g.room.private':'private', 'g.room.public':'open',
  'g.room.seats':'At the table', 'g.room.host':'host', 'g.room.bot':'bot',
  'g.room.free':'seat available', 'g.room.token':'Pick your token',
  'g.room.addbot':'+ Bot', 'g.room.rembot':'− Bot',
  'g.room.start':'Start the game', 'g.room.leave':'Leave',
  'g.room.min2':'At least two participants are needed to start',

  /* --- sidebar / actions --- */
  'g.roll':'🎲 Roll dice', 'g.endturn':'End turn', 'g.assets':'Assets', 'g.trade':'Trade',
  'g.jail.title':'You are under investigation', 'g.jail.tries':'attempt {n} of 3',
  'g.jail.roll':'🎲 Roll (need doubles)', 'g.jail.pay':'Pay $50', 'g.jail.card':'“Get out” card',

  /* --- purchase certificate --- */
  'g.buy':'Buy {price}', 'g.decline':'To auction',
  'g.cert.label':'— Share certificate —', 'g.cert.tile':'tile #{n}',
  'g.cert.rent':'Rent', 'g.cert.rentgroup':'With full set',
  'g.cert.r1':'With 1 branch', 'g.cert.r2':'With 2 branches', 'g.cert.r3':'With 3 branches', 'g.cert.r4':'With 4 branches',
  'g.cert.rhq':'With HQ', 'g.cert.branch':'Branch', 'g.cert.mortgage':'Mortgage',
  'g.cert.air1':'Rent (1 network)', 'g.cert.air2':'2 networks', 'g.cert.air3':'3 networks', 'g.cert.air4':'4 networks',
  'g.cert.util1':'Rent (one network)', 'g.cert.util1v':'4× dice total',
  'g.cert.util2':'Both networks', 'g.cert.util2v':'10× dice total',

  /* --- groups --- */
  'g.grp.brown':'🦖 Dinosaurs', 'g.grp.lblue':'📞 Calls', 'g.grp.pink':'📸 Social',
  'g.grp.orange':'🎵 Music', 'g.grp.red':'🍔 Food & drinks', 'g.grp.yellow':'🎬 Video',
  'g.grp.green':'✉️ Messengers', 'g.grp.dblue':'👑 Titans',
  'g.grp.air':'✈ Logistics', 'g.grp.util':'⚡ Utilities',

  /* --- auction --- */
  'g.auc.title':'Auction', 'g.auc.lot':'Lot', 'g.auc.bid':'Current bid',
  'g.auc.leader':'leader', 'g.auc.nobids':'no bids yet', 'g.auc.pass':'Pass',
  'g.auc.passed':'You passed', 'g.auc.youlead':'You are leading',

  /* --- debt / bankruptcy --- */
  'g.debt.title':'Debt', 'g.debt.owe':'You owe {amount} — {to}',
  'g.debt.hint':'Sell branches and mortgage assets until you cover the sum',
  'g.debt.other':'{p} is raising funds for a debt of {amount}',
  'g.bankrupt':'Declare bankruptcy',
  'g.bankrupt.confirm':'Declare bankruptcy? All assets go to the creditor and you are out of the game.',

  /* --- assets --- */
  'g.as.title':'Asset management', 'g.as.empty':'You own no property yet',
  'g.as.build':'+ Branch', 'g.as.sellh':'Sell', 'g.as.mort':'Mortgage', 'g.as.unmort':'Redeem',
  'g.as.mortgaged':'mortgaged', 'g.as.hq':'headquarters',
  'g.hint.group':'you need the whole colour set', 'g.hint.even':'build evenly across the set',
  'g.hint.evensell':'sell evenly across the set', 'g.hint.mortgroup':'a tile in the set is mortgaged',
  'g.hint.houses':'sell the branches in the set first', 'g.hint.nocash':'not enough cash',
  'g.hint.turn':'only on your turn', 'g.hint.max5':'headquarters already built', 'g.hint.nohouses':'no branches',

  /* --- trades --- */
  'g.tr.panel':'Deals', 'g.tr.title':'Deal builder', 'g.tr.partner':'Partner',
  'g.tr.igive':'You give', 'g.tr.itake':'You receive', 'g.tr.cash':'Cash',
  'g.tr.send':'Send offer', 'g.tr.incoming':'Incoming deal',
  'g.tr.offer':'{p} offers you a deal', 'g.tr.accept':'Accept', 'g.tr.decline':'Decline',
  'g.tr.cancel':'Withdraw', 'g.tr.out':'you → {p}', 'g.tr.in':'{p} → you', 'g.tr.view':'View',
  'g.tr.nothing':'— nothing —', 'g.tr.notiles':'no eligible tiles',

  /* --- victory --- */
  'g.win.title':'Winner', 'g.win.bankrupt':'All rivals went bankrupt', 'g.win.worth':'The largest fortune after {rounds} rounds', 'g.win.fortunes':'Final fortunes',
  'g.win.lobby':'To lobby',

  /* --- board centre --- */
  'g.deck.chance':'Market', 'g.deck.chest':'Board',
  'g.deck.chance.t':'? Market', 'g.deck.chance.s':'the rate swung',
  'g.deck.chest.t':'❖ Board', 'g.deck.chest.s':'of directors',

  /* --- engine errors --- */
  'g.err.not_your_turn':'It is not your turn', 'g.err.bad_phase':'This action is unavailable right now',
  'g.err.no_cash':'Not enough cash', 'g.err.build_limit':'Limit: 3 builds per turn', 'g.err.bad_tile':'That tile does not qualify',
  'g.err.not_owner':'That is not your property', 'g.err.uneven':'Build and sell evenly',
  'g.err.has_houses':'Sell the branches first', 'g.err.mortgaged':'The tile is mortgaged',
  'g.err.bad_trade':'This deal cannot be offered', 'g.err.bad_amount':'Invalid amount',
  'g.err.not_found':'Not found', 'g.err.taken':'Already taken', 'g.err.cant':'Not possible now',
  'g.err.full':'The room is full', 'g.err.started':'The game has already started', 'g.err.in_room':'You are already in a room',

  /* --- log events --- */
  'ev.roll':'{p} rolls {a} + {b} = {s}',
  'ev.move':'{p} moves to {t}',
  'ev.pass_go':'{p} passes GO and collects {amount}',
  'ev.buy':'{p} buys {t} for {amount}',
  'ev.rent':'{p} pays {to} rent of {amount} for {t}',
  'ev.tax':'{p} pays a tax of {amount} — {t}',
  'ev.card':'{p} draws a “{deck}” card',
  'ev.pay':'{p} pays {amount} ({to})',
  'ev.gain':'{p} receives {amount} ({from})',
  'ev.jail_in':'{p} goes under investigation',
  'ev.jail_out_pay':'{p} pays $50 and walks free',
  'ev.jail_out_card':'{p} plays a “get out” card and walks free',
  'ev.jail_out_doubles':'{p} rolls doubles and walks free',
  'ev.jail_out_force':'{p} is forced to pay $50 after three attempts',
  'ev.auction_start':'{t} goes up for auction',
  'ev.bid':'{p} bids {amount}',
  'ev.auction_pass':'{p} passes',
  'ev.auction_win':'{p} wins the auction: {t} for {amount}',
  'ev.auction_none':'No takers — {t} stays with the bank',
  'ev.build':'{p} builds a branch on {t} ({houses}/5)',
  'ev.build_hq':'{p} erects a headquarters on {t}',
  'ev.sell_house':'{p} sells a branch on {t} ({houses}/5)',
  'ev.mortgage':'{p} mortgages {t}',
  'ev.unmortgage':'{p} redeems {t} from mortgage',
  'ev.trade_offer':'{from} offers {to} a deal',
  'ev.trade_accept':'Deal closed: {from} ↔ {to}',
  'ev.trade_decline':'The deal was declined',
  'ev.trade_cancel':'The offer was withdrawn',
  'ev.debt':'{p} is in debt: {amount} ({to})',
  'ev.bankrupt':'{p} is bankrupt! Assets go to: {to}',
  'ev.turn':'The turn passes to {p} — round {round}',
  'ev.win':'🏆 {p} wins!', 'ev.timeup':'⏰ {rounds} rounds played — the floor closes, counting fortunes', 'ev.worth':'{p} net worth: {amount}', 'ev.deal':'{p} receives {t} in the deal',

  /* --- “Market” cards (Chance) --- */
  'card.ch_go':'Your shares are soaring! Advance to GO and collect $200.',
  'card.ch_jail':'The Securities Commission has taken an interest in your dealings. Go under investigation!',
  'card.ch_jailfree':'Your lawyer works miracles. Keep this card — it will get you out of the investigation.',
  'card.ch_pay_each_50':'You are caught insider trading. Pay every player $50 in damages.',
  'card.ch_div150':'The board declares a dividend. Collect $150.',
  'card.ch_fine100':'Fine for manipulating quotations: pay $100.',
  'card.ch_to39':'Urgent business trip to Cupertino! Advance to Epple.',
  'card.ch_to19':'Fire in the browser! Hurry to Firefax.',
  'card.ch_back3':'The market slips back. Go back three tiles.',
  'card.ch_repairs':'Full renovation of all offices: $40 per branch and $115 per headquarters.',
  'card.ch_gain100':'A lucky speculation on the exchange nets you $100.',
  'card.ch_to_ubar':'Your driver is waiting outside. Ride to Ubar.',

  /* --- “Board” cards (Chest) --- */
  'card.cc_gain200':'Bank error in your favour. Collect $200.',
  'card.cc_from_each50':'You host a charity dinner. Every player chips in $50.',
  'card.cc_pay50':'A magnate’s medical check-up: pay $50.',
  'card.cc_jailfree':'The board of directors is on your side. A get-out-of-investigation card — keep it.',
  'card.cc_jail':'The audit uncovered double bookkeeping. Under investigation!',
  'card.cc_gain100':'Year-end insurance premium: collect $100.',
  'card.cc_pay100':'Hospital bills: pay $100.',
  'card.cc_gain25':'Consulting fee: collect $25.',
  'card.cc_repairs':'The city assembly demands façade repairs: $25 per branch and $100 per headquarters.',
  'card.cc_go':'Advance to GO and collect $200.',
  'card.cc_gain10':'You take second place in a beauty contest. The prize is $10.',
  'card.cc_pay75':'School levy: pay $75.',
},
};

/* вливаем игровые ключи в общий словарь */
if(window.I18N){
  Object.assign(window.I18N.ru, GAME_I18N.ru);
  Object.assign(window.I18N.en, GAME_I18N.en);
}

/* ===================== КОНСТАНТЫ ===================== */
const TOKEN_EMOJIS = ['🎩','💼','📈','🚢','🏎️','👑','💰','⌛'];
const PLAYER_COLORS = ['#15563d','#7c2230','#274b7a','#2f6f6a','#8a5a1f','#5e3a63'];
const CORNER_ICO = {go:'💰', jail:'🔒', parking:'🏝️', gotojail:'👮'};
const TAX_ICO = {income:'💸', audit:'🔎'};
const AIR_RENTS = [25,50,100,200];
const PIPS = {1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8]};

/* ===================== СОСТОЯНИЕ КЛИЕНТА ===================== */
const G = {
  me: null,          // {id, username}
  room: null,        // снапшот комнаты
  game: null,        // снапшот игры
  screen: null,      // 'room' | 'game'
  chat: [],          // последние сообщения чата
  logEvents: [],     // события для лога (новые в начале)
  dispPos: {},       // playerId → отображаемая позиция фишки
  anim: {queue: [], running: false},
  timer: {iv: null, deadline: 0, total: 0},
  modal: null,       // {ov, kind, lock}
  winEl: null,       // оверлей победителя
  rdom: null,        // ссылки на DOM комнаты
  gdom: null,        // ссылки на DOM игры
  buyBusy: false,    // защита от двойного клика в модалке покупки
};

/* ===================== ХЕЛПЕРЫ ===================== */
const t = k => (window.t ? window.t(k) : k);

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
/* подстановка параметров в шаблон перевода; значения уже экранированы */
function fmt(key, params){
  let s = t(key);
  for(const k in params) s = s.split('{'+k+'}').join(params[k]);
  return s;
}
const wait = ms => new Promise(res => setTimeout(res, ms));

/* ---------- звуки: WebAudio-синтез, без внешних файлов ---------- */
const SFX = (function(){
  let ctx = null, on = true;
  try{ on = localStorage.getItem('mono_sound') !== '0'; }catch(e){}
  function ac(){
    if(!ctx){ const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null; try{ ctx = new AC(); }catch(e){ return null; } }
    if(ctx.state === 'suspended'){ try{ ctx.resume(); }catch(e){} }
    return ctx;
  }
  function tone(freq, dur, type, vol, delay){
    if(!on) return;
    const c = ac(); if(!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol || .12, t0 + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + .05);
  }
  function rattle(dur, vol){   // шорох кубиков
    if(!on) return;
    const c = ac(); if(!c) return;
    const n = c.createBufferSource();
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = (Math.random()*2 - 1) * (1 - i/d.length);
    n.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1600;
    const g = c.createGain(); g.gain.value = vol || .08;
    n.connect(f); f.connect(g); g.connect(c.destination);
    n.start();
  }
  return {
    get on(){ return on; },
    toggle(){ on = !on; try{ localStorage.setItem('mono_sound', on ? '1' : '0'); }catch(e){} if(on) tone(660, .09, 'triangle', .1); return on; },
    unlock(){ ac(); },
    dice(){ rattle(.32, .1); tone(210, .05, 'square', .045, .06); tone(180, .05, 'square', .04, .16); },
    step(){ tone(950, .03, 'square', .028); },
    cash(){ tone(880, .07, 'triangle', .1); tone(1318, .13, 'triangle', .1, .07); },
    pay(){ tone(330, .1, 'triangle', .09); tone(247, .15, 'triangle', .08, .1); },
    card(){ rattle(.1, .05); tone(1568, .06, 'sine', .05, .04); },
    myturn(){ tone(659, .09, 'triangle', .11); tone(880, .15, 'triangle', .11, .1); },
    jail(){ tone(196, .16, 'sawtooth', .06); tone(147, .24, 'sawtooth', .06, .15); },
    win(){ [523, 659, 784, 1047].forEach((f, i)=>tone(f, .2, 'triangle', .12, i * .14)); },
  };
})();
/* браузер требует жеста для звука — разблокируем на первом клике */
document.addEventListener('pointerdown', function once(){ SFX.unlock(); document.removeEventListener('pointerdown', once); });

/* звук по игровому событию (не проигрываем при загрузке старого лога) */
function sfxFor(e){
  const me = G.me && G.me.id;
  switch(e.k){
    case 'roll': SFX.dice(); break;
    case 'buy': case 'auction_win': (e.p === me) ? SFX.cash() : SFX.card(); break;
    case 'rent': case 'tax': case 'pay':
      if(e.p === me) SFX.pay(); else if(e.to === me) SFX.cash(); break;
    case 'gain': case 'pass_go': if(e.p === me) SFX.cash(); break;
    case 'card': SFX.card(); break;
    case 'jail_in': if(e.p === me) SFX.jail(); break;
    case 'turn': if(e.p === me) SFX.myturn(); break;
    case 'win': SFX.win(); break;
  }
}
const sum = n => '<span class="sum">$'+(n|0)+'</span>';

function safeColor(c){ return /^#[0-9a-fA-F]{3,8}$/.test(String(c||'')) ? c : 'var(--ink)'; }
function playerById(id){ return G.game ? G.game.players.find(p => p.id === id) : null; }
function pName(id){
  const p = playerById(id);
  if(!p) return '<b>?</b>';
  return '<b style="color:'+safeColor(p.color)+'">'+esc(p.name)+'</b>';
}
function tileName(i){
  const b = G.game && G.game.board[i];
  if(!b) return '#'+i;
  if(b.t === 'corner') return t('board.'+b.k);
  if(b.t === 'tax') return t('board.tax.'+b.k);
  if(b.t === 'chance') return t('board.chance');
  if(b.t === 'chest') return t('board.chest');
  return b.n;
}
function groupColor(b){
  if(b.t === 'prop') return 'var(--g-'+b.g+')';
  if(b.t === 'air') return 'var(--ink-soft)';
  return 'var(--gold)';
}
/* блиц-экономика (формулы синхронны с engine.js) */
function blitzMult(g){
  if(!g || !g.settings || g.settings.mode !== 'blitz') return 1;
  if(g.round >= 10) return 3;
  if(g.round >= 7) return 2;
  if(g.round >= 4) return 1.5;
  return 1;
}
function blitzSalary(g){
  if(!g || !g.settings || g.settings.mode !== 'blitz') return 200;
  if(g.round <= 4) return 200;
  if(g.round <= 8) return 100;
  return 0;
}
function hcOf(i){
  const g = G.game, b = g.board[i];
  const hc = b.hc || 0;
  return g.settings && g.settings.mode === 'blitz' ? Math.floor(hc / 2) : hc;
}
function clientOwnsGroup(owner, color){
  const g = G.game;
  for(let i = 0; i < 40; i++)
    if(g.board[i].t === 'prop' && g.board[i].g === color && g.tiles[i].owner !== owner) return false;
  return true;
}
function clientCountType(owner, type){
  const g = G.game; let c = 0;
  for(let i = 0; i < 40; i++) if(g.board[i].t === type && g.tiles[i].owner === owner) c++;
  return c;
}
/* текущая рента клетки (для доски и тултипа); null если нечего показать */
function tileRentLabel(i){
  const g = G.game, b = g.board[i], st = g.tiles[i];
  if(!st || st.owner == null || st.mortgaged) return null;
  const m = blitzMult(g);
  if(b.t === 'util'){ const c = clientCountType(st.owner, 'util'); return (Math.round((c >= 2 ? 10 : 4) * m * 10) / 10) + '×🎲'; }
  let raw;
  if(b.t === 'air'){ const c = clientCountType(st.owner, 'air'); raw = [25,50,100,200][c-1] || 0; }
  else if(st.houses > 0) raw = b.r[st.houses];
  else raw = clientOwnsGroup(st.owner, b.g) ? b.r[0] * 2 : b.r[0];
  return '$' + Math.round(raw * m);
}

function groupLabel(b){
  if(b.t === 'prop') return t('g.grp.'+b.g);
  return b.t === 'air' ? t('g.grp.air') : t('g.grp.util');
}
function myPlayer(){ return G.me ? playerById(G.me.id) : null; }
function isMyTurn(){
  const g = G.game;
  return !!(g && G.me && g.players[g.turnIdx] && g.players[g.turnIdx].id === G.me.id);
}
function hostId(r){ return r && r.host && typeof r.host === 'object' ? r.host.id : (r ? r.host : null); }
function fmtMoney(n){ return (n|0).toLocaleString(window.LANG === 'ru' ? 'ru-RU' : 'en-US'); }

/* геометрия доски 11×11, по часовой от СТАРТа (как в design/app.js) */
function gridPos(i){
  if(i <= 10) return {r:11, c:11-i};
  if(i <= 20) return {r:11-(i-10), c:1};
  if(i <= 30) return {r:1, c:(i-20)+1};
  return {r:(i-30)+1, c:11};
}
function sideClass(i){
  if(i === 0 || i === 10 || i === 20 || i === 30) return 'corner';
  if(i < 10) return 'row-bottom';
  if(i < 20) return 'side-left';
  if(i < 30) return 'row-top';
  return 'side-right';
}

/* показать вкладку (дублирует навигацию app.js — идемпотентно) */
function activatePage(name){
  const pg = document.getElementById('page-'+name);
  if(!pg) return;
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  pg.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  window.scrollTo({top:0, behavior:'instant'});
}

/* уведомление: тост app.js или свой запасной */
function notify(msg){
  if(typeof window.toast === 'function'){ window.toast(msg); return; }
  let el = document.querySelector('.gm-toast');
  if(el) el.remove();
  el = document.createElement('div');
  el.className = 'gm-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('bye'); setTimeout(() => el.remove(), 400); }, 2600);
}
function trErr(code){
  const k1 = 'g.err.'+code, k2 = 'api.'+code;
  if(t(k1) !== k1) return t(k1);
  if(t(k2) !== k2) return t(k2);
  return code;
}

/* обёртки над Net */
function act(action){
  return window.Net.api('/api/game/action', {action}).then(r => {
    if(r && r.error) notify(trErr(r.error));
    return r;
  }).catch(() => null);
}
function roomApi(path, body){
  return window.Net.api(path, body || {}).then(r => {
    if(r && r.error) notify(trErr(r.error));
    return r;
  }).catch(() => null);
}
function ensureMe(){
  if(G.me) return Promise.resolve(G.me);
  return window.Net.get('/api/me').then(r => {
    if(r && r.ok) G.me = r.user;
    return G.me;
  }).catch(() => null);
}

/* ===================== МОДАЛКИ ===================== */
function closeModal(){
  if(G.modal){
    G.modal.ov.remove(); G.modal = null;
    /* после закрытия окна вернуть отложенное решение (например, модалку покупки) */
    setTimeout(()=>{ try{ if(!G.modal && G.screen === 'game') syncDecisionUI(); }catch(e){} }, 80);
  }
}
function closeModalIf(pred){
  if(G.modal && pred(G.modal.kind)) closeModal();
}
function openModal(html, opts){
  opts = opts || {};
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'gm-overlay';
  const box = document.createElement('div');
  box.className = 'gm-modal' + (opts.cls ? ' '+opts.cls : '');
  box.innerHTML = html;
  ov.appendChild(box);
  if(!opts.lock){
    ov.addEventListener('click', e => { if(e.target === ov) closeModal(); });
    const x = document.createElement('button');
    x.className = 'gm-close';
    x.textContent = '✕';
    x.addEventListener('click', closeModal);
    box.appendChild(x);
  }
  document.body.appendChild(ov);
  G.modal = {ov, box, kind: opts.kind || '', lock: !!opts.lock};
  return box;
}
/* универсальное подтверждение */
function openConfirm(text, onYes){
  const box = openModal(
    '<div class="gm-confirm"><p>'+esc(text)+'</p>'+
    '<div class="gm-row"><button class="btn btn-buy" id="gmCfYes">'+esc(t('g.yes'))+'</button>'+
    '<button class="btn" id="gmCfNo">'+esc(t('g.no'))+'</button></div></div>',
    {kind:'confirm'});
  box.querySelector('#gmCfYes').addEventListener('click', () => { closeModal(); onYes(); });
  box.querySelector('#gmCfNo').addEventListener('click', closeModal);
}

/* ===================================================================
   ЭКРАН КОМНАТЫ (#page-room)
   =================================================================== */
function buildRoomDom(){
  const page = document.getElementById('page-room');
  if(!page) return;
  if(G.rdom && G.rdom.page === page && page.contains(G.rdom.members)) return;
  page.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'room-wrap';
  wrap.innerHTML =
    '<div class="panel room-main">'+
      '<div class="rm-name" id="rmName"></div>'+
      '<div class="rm-code-row"><span class="rm-code-lbl" id="rmCodeLbl"></span>'+
        '<button class="rm-code" id="rmCode" type="button"></button></div>'+
      '<h3 id="rmRulesH"></h3><div class="rm-set" id="rmSet"></div>'+
      '<h3 id="rmSeatsH"></h3><div id="rmMembers"></div>'+
      '<h3 id="rmTokenH"></h3><div class="tokens-pick rm-tokens" id="rmTokens"></div>'+
      '<div class="rm-btns" id="rmBtns"></div>'+
      '<div class="rm-hint" id="rmHint"></div>'+
    '</div>'+
    '<aside class="room-side">'+
      '<div class="panel chat"><h3 id="rmChatH"></h3>'+
        '<div class="msgs" id="rmMsgs"></div>'+
        '<input id="rmChatIn" type="text" maxlength="300"></div>'+
    '</aside>';
  page.appendChild(wrap);
  G.rdom = {
    page,
    name: wrap.querySelector('#rmName'), codeLbl: wrap.querySelector('#rmCodeLbl'),
    code: wrap.querySelector('#rmCode'), rulesH: wrap.querySelector('#rmRulesH'),
    set: wrap.querySelector('#rmSet'), seatsH: wrap.querySelector('#rmSeatsH'),
    members: wrap.querySelector('#rmMembers'), tokenH: wrap.querySelector('#rmTokenH'),
    tokens: wrap.querySelector('#rmTokens'), btns: wrap.querySelector('#rmBtns'),
    hint: wrap.querySelector('#rmHint'), chatH: wrap.querySelector('#rmChatH'),
    msgs: wrap.querySelector('#rmMsgs'), input: wrap.querySelector('#rmChatIn'),
  };
  G.rdom.code.addEventListener('click', () => {
    const id = G.room ? String(G.room.id) : '';
    const done = () => {
      G.rdom.code.classList.add('ok');
      G.rdom.code.textContent = t('g.copied');
      setTimeout(() => { if(G.room && G.rdom){ G.rdom.code.classList.remove('ok'); G.rdom.code.textContent = String(G.room.id); } }, 1200);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(id).then(done).catch(done);
    } else done();
  });
  G.rdom.input.addEventListener('keydown', e => {
    if(e.key === 'Enter') sendChat(G.rdom.input);
  });
}

function renderRoom(){
  const r = G.room;
  if(!r || !G.rdom) return;
  const d = G.rdom;
  const meId = G.me ? G.me.id : null;
  const iAmHost = hostId(r) === meId;

  d.name.textContent = r.name || t('g.room.head');
  d.codeLbl.textContent = t('g.room.code')+':';
  if(!d.code.classList.contains('ok')) d.code.textContent = String(r.id);
  d.code.title = t('g.copy');
  d.rulesH.textContent = t('g.room.rules');
  d.seatsH.textContent = t('g.room.seats');
  d.tokenH.textContent = t('g.room.token');
  d.chatH.textContent = t('g.chat');
  d.input.placeholder = t('g.chat.ph');

  /* условия партии */
  const tt = r.turnTime ? r.turnTime+'s' : t('g.room.unlimited');
  d.set.innerHTML =
    '<span class="rs"><b>'+esc(t('g.room.players'))+'</b>'+(r.members?r.members.length:0)+' / '+esc(r.maxPlayers)+'</span>'+
    '<span class="rs"><b>'+esc(t('g.room.capital'))+'</b>$'+esc(r.capital)+'</span>'+
    '<span class="rs"><b>'+esc(t('g.room.turntime'))+'</b>'+esc(tt)+'</span>'+
    '<span class="rs"><b>'+esc(r.private ? '🔒' : '🌐')+'</b>'+esc(t(r.private ? 'g.room.private' : 'g.room.public'))+'</span>';

  /* места за столом */
  const members = r.members || [];
  let mh = '';
  members.forEach((m, i) => {
    const col = PLAYER_COLORS[i % PLAYER_COLORS.length];
    const badges =
      (m.id === hostId(r) ? '<span class="badge host">'+esc(t('g.room.host'))+'</span>' : '')+
      (m.isBot ? '<span class="badge bot">🤖 '+esc(t('g.room.bot'))+'</span>' : '')+
      (m.id === meId ? '<span class="badge now">'+esc(t('g.badge.you'))+'</span>' : '');
    const rmBot = (iAmHost && m.isBot)
      ? '<button class="rm-kick" data-bot="'+esc(m.id)+'" title="'+esc(t('g.room.rembot'))+'">✕</button>' : '';
    mh += '<div class="player rm-seat" style="--pc:'+col+'">'+
      '<div class="ava">'+esc(m.emoji || '❔')+'</div>'+
      '<div class="info"><div class="nm">'+esc(m.name)+' '+badges+'</div></div>'+rmBot+'</div>';
  });
  for(let i = members.length; i < (r.maxPlayers || 0); i++){
    mh += '<div class="player rm-seat empty"><div class="ava">·</div>'+
      '<div class="info"><div class="nm free">'+esc(t('g.room.free'))+'</div></div></div>';
  }
  d.members.innerHTML = mh;
  d.members.querySelectorAll('.rm-kick').forEach(b => {
    b.addEventListener('click', () => roomApi('/api/rooms/bot', {op:'remove', botId: b.dataset.bot}));
  });

  /* выбор фишки */
  const taken = {};
  members.forEach(m => { if(m.emoji) taken[m.emoji] = m; });
  d.tokens.innerHTML = TOKEN_EMOJIS.map(e => {
    const by = taken[e];
    const mine = by && by.id === meId;
    const cls = 'tk' + (mine ? ' sel' : '') + (by && !mine ? ' taken' : '');
    const title = by ? esc(by.name) : '';
    return '<div class="'+cls+'" data-tk="'+e+'" title="'+title+'">'+e+'</div>';
  }).join('');
  d.tokens.querySelectorAll('.tk').forEach(el => {
    el.addEventListener('click', () => {
      if(el.classList.contains('taken') || el.classList.contains('sel')) return;
      roomApi('/api/rooms/token', {emoji: el.dataset.tk});
    });
  });

  /* кнопки */
  let bh = '';
  if(iAmHost){
    bh += '<button class="btn" id="rmAddBot">'+esc(t('g.room.addbot'))+'</button>';
    bh += '<button class="btn" id="rmRemBot"'+(members.some(m => m.isBot) ? '' : ' disabled')+'>'+esc(t('g.room.rembot'))+'</button>';
    bh += '<button class="btn btn-primary" id="rmStart"'+(members.length >= 2 ? '' : ' disabled')+'>'+esc(t('g.room.start'))+'</button>';
  }
  bh += '<button class="btn" id="rmLeave">'+esc(t('g.room.leave'))+'</button>';
  d.btns.innerHTML = bh;
  const addB = d.btns.querySelector('#rmAddBot');
  if(addB) addB.addEventListener('click', () => roomApi('/api/rooms/bot', {op:'add'}));
  const remB = d.btns.querySelector('#rmRemBot');
  if(remB) remB.addEventListener('click', () => {
    const bots = members.filter(m => m.isBot);
    if(bots.length) roomApi('/api/rooms/bot', {op:'remove', botId: bots[bots.length-1].id});
  });
  const stB = d.btns.querySelector('#rmStart');
  if(stB) stB.addEventListener('click', () => roomApi('/api/rooms/start', {}));
  d.btns.querySelector('#rmLeave').addEventListener('click', () => roomApi('/api/rooms/leave', {}));

  d.hint.textContent = (iAmHost && members.length < 2) ? t('g.room.min2') : '';
}

/* ===================================================================
   ЭКРАН ИГРЫ (#page-game)
   =================================================================== */
function buildGameDom(){
  const page = document.getElementById('page-game');
  if(!page) return;
  if(G.gdom && G.gdom.page === page && page.contains(G.gdom.board)) return;
  page.innerHTML = '';
  const lay = document.createElement('div');
  lay.className = 'game-layout';
  lay.innerHTML =
    '<div class="board-wrap"><div class="board" id="gmBoard">'+
      '<div class="board-center">'+
        '<div class="bc-crest">'+(window.CREST || '')+'</div>'+
        '<div class="bc-logo" id="gmBcLogo"></div>'+
        '<div class="bc-sub" id="gmBcSub"></div>'+
        '<div class="bc-rule"></div>'+
        '<div class="dice-zone"><div class="die" id="gmDie1"></div><div class="die" id="gmDie2"></div></div>'+
        '<div class="decks">'+
          '<div class="deck chance"><span class="corner-flor tl">❦</span><span class="dt" id="gmDeckCh"></span><span class="ds" id="gmDeckChS"></span><span class="corner-flor br">❦</span></div>'+
          '<div class="deck chest"><span class="corner-flor tl">❦</span><span class="dt" id="gmDeckCc"></span><span class="ds" id="gmDeckCcS"></span><span class="corner-flor br">❦</span></div>'+
        '</div>'+
        '<ul class="log" id="gmLog"></ul>'+
      '</div>'+
    '</div></div>'+
    '<aside class="sidebar">'+
      '<div class="panel">'+
        '<div class="turn-timer"><h3><span id="gmTurnLbl"></span> <span id="gmTurnName"></span></h3>'+
          '<span class="tt-right"><button class="gm-snd" id="gmSnd" type="button"></button><span class="t" id="gmTimerT">—</span></span></div>'+
        '<div class="tbar"><i id="gmTimerBar"></i></div>'+
        '<div class="gm-round" id="gmRound"></div>'+
      '</div>'+
      '<div class="panel"><h3 id="gmPlayersH"></h3><div id="gmPlayers"></div></div>'+
      '<div class="panel actions" id="gmCtx"></div>'+
      '<div class="panel" id="gmTradesPanel" style="display:none"><h3 id="gmTradesH"></h3><div id="gmTrades"></div></div>'+
      '<div class="panel chat"><h3 id="gmChatH"></h3><div class="msgs" id="gmMsgs"></div>'+
        '<input id="gmChatIn" type="text" maxlength="300"></div>'+
    '</aside>';
  page.appendChild(lay);

  const board = lay.querySelector('#gmBoard');
  const cells = [];
  for(let i = 0; i < 40; i++){
    const d = document.createElement('div');
    const {r, c} = gridPos(i);
    d.style.gridRow = r; d.style.gridColumn = c;
    board.appendChild(d);
    cells.push(d);
  }
  G.gdom = {
    page, board, cells,
    bcLogo: lay.querySelector('#gmBcLogo'), bcSub: lay.querySelector('#gmBcSub'),
    die1: lay.querySelector('#gmDie1'), die2: lay.querySelector('#gmDie2'),
    deckCh: lay.querySelector('#gmDeckCh'), deckChS: lay.querySelector('#gmDeckChS'),
    deckCc: lay.querySelector('#gmDeckCc'), deckCcS: lay.querySelector('#gmDeckCcS'),
    log: lay.querySelector('#gmLog'),
    turnLbl: lay.querySelector('#gmTurnLbl'), turnName: lay.querySelector('#gmTurnName'),
    timerT: lay.querySelector('#gmTimerT'), timerBar: lay.querySelector('#gmTimerBar'),
    round: lay.querySelector('#gmRound'),
    playersH: lay.querySelector('#gmPlayersH'), players: lay.querySelector('#gmPlayers'),
    ctx: lay.querySelector('#gmCtx'),
    tradesPanel: lay.querySelector('#gmTradesPanel'), tradesH: lay.querySelector('#gmTradesH'),
    trades: lay.querySelector('#gmTrades'),
    chatH: lay.querySelector('#gmChatH'), msgs: lay.querySelector('#gmMsgs'), input: lay.querySelector('#gmChatIn'),
  };
  G.gdom.input.addEventListener('keydown', e => {
    if(e.key === 'Enter') sendChat(G.gdom.input);
  });
  /* кнопка звука */
  const snd = lay.querySelector('#gmSnd');
  if(snd){
    const upd = () => { snd.textContent = SFX.on ? '🔊' : '🔇'; };
    snd.addEventListener('click', () => { SFX.toggle(); upd(); });
    upd();
  }
  setDie(G.gdom.die1, 3); setDie(G.gdom.die2, 5);
  renderCenterLabels();
  fitBoard();
}

/* ---------- адаптивность: доска масштабируется под экран ---------- */
function fitBoard(){
  if(!G.gdom || !G.gdom.board) return;
  const wrap = G.gdom.board.parentElement;   // .board-wrap
  if(!wrap) return;
  const avail = Math.min(document.documentElement.clientWidth - 14, 760);
  const s = Math.min(1, avail / 760);
  G.gdom.board.style.transform = s < 1 ? 'scale(' + s + ')' : '';
  G.gdom.board.style.transformOrigin = 'top left';
  wrap.style.width = Math.round(760 * s) + 'px';
  wrap.style.height = Math.round(760 * s) + 'px';
}
window.addEventListener('resize', () => { try{ fitBoard(); }catch(e){} });

function renderCenterLabels(){
  const d = G.gdom; if(!d) return;
  d.bcLogo.textContent = t('brand.word');
  d.bcSub.textContent = t('bc.sub') === 'bc.sub' ? 'БИРЖА 1929' : t('bc.sub');
  d.deckCh.textContent = t('g.deck.chance.t'); d.deckChS.textContent = t('g.deck.chance.s');
  d.deckCc.textContent = t('g.deck.chest.t'); d.deckCcS.textContent = t('g.deck.chest.s');
  d.turnLbl.textContent = t('g.turn');
  d.playersH.textContent = t('g.players');
  d.tradesH.textContent = t('g.tr.panel');
  d.chatH.textContent = t('g.chat');
  d.input.placeholder = t('g.chat.ph');
}

/* ---------- клетки доски ---------- */
function cellInner(i){
  const b = G.game.board[i];
  const st = G.game.tiles[i];
  let html = '';
  if(b.t === 'corner'){
    const nm = t('board.'+b.k), sub = t('board.'+b.k+'.sub');
    html = '<div class="c-ico">'+(CORNER_ICO[b.k] || '')+'</div><div class="c-name">'+esc(nm)+'</div>'+
      (sub && sub !== 'board.'+b.k+'.sub' ? '<div class="c-sub">'+esc(sub)+'</div>' : '');
  } else if(b.t === 'chance'){
    html = '<div class="marker"><div class="glyph">?</div><span class="cap">'+esc(t('board.chance'))+'</span></div>';
  } else if(b.t === 'chest'){
    html = '<div class="marker"><div class="glyph">❖</div><span class="cap">'+esc(t('board.chest'))+'</span></div>';
  } else if(b.t === 'tax'){
    html = '<div class="tax-ico">'+(TAX_ICO[b.k] || '💸')+'</div><div class="name">'+esc(t('board.tax.'+b.k))+'</div>'+
      '<div class="price" style="color:var(--oxblood)">−$'+b.p+'</div>';
  } else {
    if(b.t === 'prop') html += '<div class="band" style="--gc:var(--g-'+b.g+')"></div>';
    html += '<div class="logo">'+((window.LOGOS && window.LOGOS[b.logo]) || '')+'</div>';
    html += '<div class="name">'+esc(b.n)+'</div>';
    const rl = tileRentLabel(i);
    if(rl) html += '<div class="price rent">'+rl+'</div>';
    else if(!(st && st.mortgaged)) html += '<div class="price">$'+b.p+'</div>';
    if(st && st.houses > 0){
      html += '<div class="houses">'+(st.houses >= 5 ? '<i class="hotel"></i>' : '<i class="house"></i>'.repeat(st.houses))+'</div>';
    }
    if(st && st.mortgaged) html += '<span class="m-stamp">'+esc(t('g.stamp'))+'</span>';
    /* владелец теперь показан заливкой клетки (класс .owned + --own в updateCells) */
  }
  return html;
}
function updateCells(){
  if(!G.gdom || !G.game) return;
  const hot = G.game.pendingTile != null ? G.game.pendingTile
    : (G.game.auction ? G.game.auction.tile : null);
  for(let i = 0; i < 40; i++){
    const b = G.game.board[i];
    const st = G.game.tiles[i];
    const cell = G.gdom.cells[i];
    cell.className = 'cell ' + sideClass(i) + ' t-' + b.t +
      (b.g ? ' grp-' + b.g : '') +
      (b.t === 'corner' && b.k ? ' ' + b.k : '') +
      (st && st.mortgaged ? ' mortgaged' : '') +
      (hot === i ? ' here' : '');
    /* владелец: заливка клетки цветом игрока (вместо мелких печатей) */
    const ow = st && st.owner != null ? playerById(st.owner) : null;
    if(ow){
      cell.classList.add('owned');
      cell.style.setProperty('--own', safeColor(ow.color));
      const rl = tileRentLabel(i);
      cell.title = (b.n || '') + ' — ' + ow.name + (rl ? ' · ' + t('g.cert.rent') + ' ' + rl : '');
    } else {
      cell.style.removeProperty('--own');
      cell.title = b.n || '';
    }
    /* фишки сохраняем — перерисуем отдельно */
    const tz = cell.querySelector('.tokens');
    cell.innerHTML = cellInner(i);
    if(tz) cell.appendChild(tz);
  }
  renderTokens();
}

/* ---------- фишки ---------- */
function renderTokens(){
  if(!G.gdom || !G.game) return;
  G.gdom.cells.forEach(c => { const tz = c.querySelector('.tokens'); if(tz) tz.remove(); });
  const by = {};
  G.game.players.forEach(pl => {
    if(pl.bankrupt) return;
    const pos = (G.dispPos[pl.id] != null) ? G.dispPos[pl.id] : pl.pos;
    (by[pos] = by[pos] || []).push(pl);
  });
  for(const pos in by){
    const cell = G.gdom.cells[pos];
    if(!cell) continue;
    const tz = document.createElement('div');
    tz.className = 'tokens';
    by[pos].forEach(pl => {
      const s = document.createElement('span');
      s.className = 'token';
      s.style.setProperty('--tc', safeColor(pl.color));
      s.textContent = pl.emoji || '🎲';
      s.title = pl.name;
      tz.appendChild(s);
    });
    cell.appendChild(tz);
  }
}
function seedPositions(){
  if(!G.game) return;
  G.game.players.forEach(pl => { if(G.dispPos[pl.id] == null) G.dispPos[pl.id] = pl.pos; });
}
function flashGo(){
  const cell = G.gdom && G.gdom.cells[0];
  if(!cell) return;
  cell.classList.remove('flash-go');
  void cell.offsetWidth; /* перезапуск анимации */
  cell.classList.add('flash-go');
}

/* ---------- кубики ---------- */
function setDie(el, v){
  if(!el) return;
  el.innerHTML = '';
  for(let i = 0; i < 9; i++){
    const p = document.createElement('i');
    p.className = 'pip' + ((PIPS[v] || []).includes(i) ? ' on' : '');
    el.appendChild(p);
  }
}
function diceAnim(a, b){
  return new Promise(res => {
    const d1 = G.gdom && G.gdom.die1, d2 = G.gdom && G.gdom.die2;
    if(!d1){ res(); return; }
    d1.classList.add('rolling'); d2.classList.add('rolling');
    let n = 0;
    const iv = setInterval(() => {
      setDie(d1, 1+Math.floor(Math.random()*6));
      setDie(d2, 1+Math.floor(Math.random()*6));
      if(++n > 8){
        clearInterval(iv);
        setDie(d1, a); setDie(d2, b);
        d1.classList.remove('rolling'); d2.classList.remove('rolling');
        setTimeout(res, 160);
      }
    }, 60);
  });
}

/* ---------- анимация хода фишки ---------- */
function moveAnim(e){
  return new Promise(res => {
    let cur = (G.dispPos[e.p] != null) ? G.dispPos[e.p] : e.from;
    if(cur !== e.from) cur = e.from;
    const fwd = ((e.to - cur) + 40) % 40;
    const back = ((cur - e.to) + 40) % 40;
    const dir = (!e.passGo && back < fwd && back <= 3) ? -1 : 1;
    const steps = dir === 1 ? fwd : back;
    if(steps === 0){
      G.dispPos[e.p] = e.to; renderTokens(); res(); return;
    }
    const dt = steps > 14 ? 45 : 90;
    let n = 0;
    const iv = setInterval(() => {
      cur = (cur + dir + 40) % 40;
      G.dispPos[e.p] = cur;
      renderTokens();
      SFX.step();
      if(cur === 0 && dir === 1) flashGo();
      if(++n >= steps){ clearInterval(iv); setTimeout(res, 120); }
    }, dt);
  });
}

/* ---------- лог событий ---------- */
function evHtml(e){
  const P = id => pName(id);
  const T = i => '<b>'+esc(tileName(i))+'</b>';
  const B = () => esc(t('g.bank'));
  switch(e.k){
    case 'roll': return fmt('ev.roll', {p:P(e.p), a:e.a, b:e.b, s:e.a+e.b});
    case 'move': return fmt('ev.move', {p:P(e.p), t:T(e.to)});
    case 'pass_go': return fmt('ev.pass_go', {p:P(e.p), amount:sum(e.amount != null ? e.amount : 200)});
    case 'buy': return fmt('ev.buy', {p:P(e.p), t:T(e.t), amount:sum(e.price)});
    case 'rent': return fmt('ev.rent', {p:P(e.p), to:P(e.to), t:T(e.t), amount:sum(e.amount)});
    case 'tax': return fmt('ev.tax', {p:P(e.p), t:T(e.t), amount:sum(e.amount)});
    case 'card': return fmt('ev.card', {p:P(e.p), deck:esc(t(e.deck === 'chance' ? 'g.deck.chance' : 'g.deck.chest'))});
    case 'pay': return fmt('ev.pay', {p:P(e.p), amount:sum(e.amount), to:(e.to != null ? P(e.to) : B())});
    case 'gain': return fmt('ev.gain', {p:P(e.p), amount:sum(e.amount), from:(e.from != null && playerById(e.from) ? P(e.from) : B())});
    case 'jail_in': return fmt('ev.jail_in', {p:P(e.p)});
    case 'jail_out': return fmt('ev.jail_out_'+e.how, {p:P(e.p)});
    case 'auction_start': return fmt('ev.auction_start', {t:T(e.t)});
    case 'bid': return fmt('ev.bid', {p:P(e.p), amount:sum(e.amount)});
    case 'auction_pass': return fmt('ev.auction_pass', {p:P(e.p)});
    case 'auction_win': return fmt('ev.auction_win', {p:P(e.p), t:T(e.t), amount:sum(e.amount)});
    case 'auction_none': return fmt('ev.auction_none', {t:T(e.t)});
    case 'build': return e.houses >= 5
      ? fmt('ev.build_hq', {p:P(e.p), t:T(e.t)})
      : fmt('ev.build', {p:P(e.p), t:T(e.t), houses:e.houses});
    case 'sell_house': return fmt('ev.sell_house', {p:P(e.p), t:T(e.t), houses:e.houses});
    case 'mortgage': return fmt('ev.mortgage', {p:P(e.p), t:T(e.t)});
    case 'unmortgage': return fmt('ev.unmortgage', {p:P(e.p), t:T(e.t)});
    case 'trade_offer': return fmt('ev.trade_offer', {from:P(e.from), to:P(e.to)});
    case 'trade_accept': return fmt('ev.trade_accept', {from:P(e.from), to:P(e.to)});
    case 'trade_decline': return t('ev.trade_decline');
    case 'trade_cancel': return t('ev.trade_cancel');
    case 'debt': return fmt('ev.debt', {p:P(e.p), amount:sum(e.amount), to:(e.to != null ? P(e.to) : B())});
    case 'bankrupt': return fmt('ev.bankrupt', {p:P(e.p), to:(e.to != null ? P(e.to) : B())});
    case 'turn': return fmt('ev.turn', {p:P(e.p), round:e.round});
    case 'win': return fmt('ev.win', {p:P(e.p)});
    case 'timeup': return fmt('ev.timeup', {rounds:e.rounds});
    case 'worth': return fmt('ev.worth', {p:P(e.p), amount:sum(e.amount)});
    case 'deal': return fmt('ev.deal', {p:P(e.p), t:T(e.t)});
    default: return '';
  }
}
function renderLog(){
  if(!G.gdom || !G.gdom.log) return;
  G.gdom.log.innerHTML = G.logEvents.slice(0, 8)
    .map(e => { const h = evHtml(e); return h ? '<li>'+h+'</li>' : ''; }).join('');
}
function pushLog(e){
  if(e.k === 'move' && e.passGo) pushLog({k:'pass_go', p:e.p});
  G.logEvents.unshift(e);
  if(G.logEvents.length > 80) G.logEvents.length = 80;
  if(!G.seeding) sfxFor(e);
  renderLog();
}
function seedLog(){
  G.logEvents = [];
  G.seeding = true;                              // старый лог — без звуков
  (G.game.log || []).forEach(e => pushLog(e));
  G.seeding = false;
}

/* ---------- сайдбар: игроки ---------- */
function renderSidebar(){
  const g = G.game, d = G.gdom;
  if(!g || !d) return;
  const cur = g.players[g.turnIdx];

  d.turnLbl.textContent = t('g.turn');
  d.turnName.textContent = cur ? cur.name : '—';
  d.turnName.style.color = cur ? safeColor(cur.color) : '';
  if(g.settings && g.settings.maxRounds){
    let txt = fmt('g.roundOf', {n: Math.min(g.round, g.settings.maxRounds), max: g.settings.maxRounds});
    const mult = blitzMult(g);
    if(mult > 1) txt += ' · ' + fmt('g.inflation', {m: mult});
    const sal = blitzSalary(g);
    if(sal < 200) txt += ' · ' + fmt('g.salary', {s: '$' + sal});
    d.round.textContent = txt;
  } else {
    d.round.textContent = fmt('g.round', {n:g.round});
  }

  let html = '';
  g.players.forEach(pl => {
    const isCur = cur && pl.id === cur.id && g.phase !== 'ended';
    const isMe = G.me && pl.id === G.me.id;
    /* плашки-активы: по клетке на каждую собственность */
    let chips = '';
    g.tiles.forEach((st, i) => {
      if(st.owner !== pl.id) return;
      chips += '<i class="asset'+(st.mortgaged ? ' m' : '')+'" style="--ac:'+groupColor(g.board[i])+'" title="'+esc(g.board[i].n || tileName(i))+'"></i>';
    });
    const badges =
      (isCur ? '<span class="badge now">'+esc(t('g.badge.now'))+'</span>' : '')+
      (pl.inJail && !pl.bankrupt ? '<span class="badge jail">'+esc(t('g.badge.jail'))+'</span>' : '')+
      (pl.bankrupt ? '<span class="badge dead">'+esc(t('g.badge.bankrupt'))+'</span>' : '');
    html += '<div class="player'+(isCur ? ' active' : '')+(isMe ? ' me' : '')+(pl.bankrupt ? ' dead' : '')+'" style="--pc:'+safeColor(pl.color)+'">'+
      '<div class="ava">'+esc(pl.emoji || '🎲')+'</div>'+
      '<div class="info"><div class="nm">'+esc(pl.name)+' '+badges+'</div>'+
      (chips ? '<div class="assets">'+chips+'</div>' : '')+'</div>'+
      '<div class="money">'+fmtMoney(pl.cash)+'</div></div>';
  });
  d.players.innerHTML = html;
}

/* ---------- сайдбар: контекстные действия ---------- */
function renderCtx(){
  const g = G.game, d = G.gdom;
  if(!g || !d) return;
  const me = myPlayer();
  const ctx = d.ctx;
  const cur = g.players[g.turnIdx];
  let html = '';

  const btnAssets = '<button class="btn" data-act="assets">'+esc(t('g.assets'))+'</button>';
  const btnTrade = '<button class="btn" data-act="trade">'+esc(t('g.trade'))+'</button>';
  const waitLine = cur ? '<div class="gm-wait">'+fmt('g.waiting', {p:pName(cur.id)})+'</div>' : '';

  if(g.phase === 'ended'){
    ctx.innerHTML = '';
    return;
  }
  if(!me || me.bankrupt){
    ctx.innerHTML = '<div class="gm-wait">'+esc(t('g.out'))+'</div>';
    return;
  }

  if(g.phase === 'auction' && g.auction){
    const a = g.auction;
    const b = g.board[a.tile];
    const passed = (a.passed || []).includes(me.id);
    const leader = a.highBidder != null ? playerById(a.highBidder) : null;
    const base = a.highBidder != null ? a.highBid : 0;
    html = '<div class="auc">'+
      '<h3>'+esc(t('g.auc.title'))+'</h3>'+
      '<div class="auc-lot"><span class="auc-band" style="--gc:'+groupColor(b)+'"></span>'+
        '<b>'+esc(b.n || tileName(a.tile))+'</b><span class="auc-price">$'+(b.p||0)+'</span></div>'+
      '<div class="auc-cur">'+esc(t('g.auc.bid'))+': <span class="auc-bid">'+(a.highBidder != null ? '$'+a.highBid : esc(t('g.auc.nobids')))+'</span>'+
        (leader ? ' · '+esc(t('g.auc.leader'))+': '+pName(leader.id) : '')+'</div>';
    if(passed){
      html += '<div class="gm-wait">'+esc(t('g.auc.passed'))+'</div>';
    } else {
      if(leader && leader.id === me.id) html += '<div class="auc-lead">'+esc(t('g.auc.youlead'))+'</div>';
      html += '<div class="row auc-btns">'+
        [10,50,100].map(step => {
          const amt = base + step;
          const dis = me.cash < amt ? ' disabled' : '';
          return '<button class="btn btn-gold" data-bid="'+amt+'"'+dis+'>$'+amt+'</button>';
        }).join('')+'</div>'+
        '<button class="btn" data-act="pass">'+esc(t('g.auc.pass'))+'</button>';
    }
    html += '</div>';
    ctx.innerHTML = html;
    ctx.querySelectorAll('[data-bid]').forEach(b2 => {
      b2.addEventListener('click', () => { b2.disabled = true; act({type:'bid', amount: +b2.dataset.bid}); });
    });
    const pb = ctx.querySelector('[data-act="pass"]');
    if(pb) pb.addEventListener('click', () => { pb.disabled = true; act({type:'pass'}); });
    return;
  }

  if(g.phase === 'debt' && g.debt){
    if(g.debt.playerId === me.id){
      const to = g.debt.to != null ? pName(g.debt.to) : esc(t('g.bank'));
      html = '<div class="debt-plaque">'+
        '<b>'+esc(t('g.debt.title'))+'</b> '+fmt('g.debt.owe', {amount:sum(g.debt.amount), to})+
        '<div class="debt-hint">'+esc(t('g.debt.hint'))+'</div></div>'+
        btnAssets + btnTrade +
        '<button class="btn btn-buy" data-act="bankrupt">'+esc(t('g.bankrupt'))+'</button>';
    } else {
      html = '<div class="gm-wait">'+fmt('g.debt.other', {p:pName(g.debt.playerId), amount:sum(g.debt.amount)})+'</div>' + btnTrade;
    }
  } else if(isMyTurn()){
    if(g.phase === 'roll'){
      if(me.inJail){
        html = '<div class="jail-head">'+esc(t('g.jail.title'))+' · '+fmt('g.jail.tries', {n:(me.jailTurns|0)+1})+'</div>'+
          '<button class="btn btn-primary" data-act="roll">'+esc(t('g.jail.roll'))+'</button>'+
          '<div class="row">'+
          '<button class="btn" data-act="jailPay"'+(me.cash < 50 ? ' disabled' : '')+'>'+esc(t('g.jail.pay'))+'</button>'+
          '<button class="btn" data-act="jailCard"'+((me.jailCards|0) < 1 ? ' disabled' : '')+'>'+esc(t('g.jail.card'))+'</button>'+
          '</div>'+
          '<div class="row">'+btnAssets+btnTrade+'</div>';
      } else {
        html = '<button class="btn btn-primary" data-act="roll">'+esc(t('g.roll'))+'</button>'+
          '<div class="row">'+btnAssets+btnTrade+'</div>';
      }
    } else if(g.phase === 'buy'){
      html = waitLine; /* решение — в модалке-сертификате */
    } else if(g.phase === 'idle'){
      html = '<button class="btn btn-primary" data-act="endTurn">'+esc(t('g.endturn'))+'</button>'+
        '<div class="row">'+btnAssets+btnTrade+'</div>';
    }
  } else {
    html = waitLine + '<div class="row">'+btnAssets+btnTrade+'</div>';
  }
  ctx.innerHTML = html;

  ctx.querySelectorAll('[data-act]').forEach(b => {
    b.addEventListener('click', () => {
      const a = b.dataset.act;
      if(a === 'roll'){ b.disabled = true; act({type:'roll'}); }
      else if(a === 'endTurn'){ b.disabled = true; act({type:'endTurn'}); }
      else if(a === 'jailPay'){ b.disabled = true; act({type:'jailPay'}); }
      else if(a === 'jailCard'){ b.disabled = true; act({type:'jailCard'}); }
      else if(a === 'assets') openAssetsModal();
      else if(a === 'trade') openTradeModal();
      else if(a === 'bankrupt') openConfirm(t('g.bankrupt.confirm'), () => act({type:'bankrupt'}));
    });
  });
}

/* ---------- сайдбар: сделки ---------- */
function renderTrades(){
  const g = G.game, d = G.gdom;
  if(!g || !d) return;
  const meId = G.me ? G.me.id : null;
  const list = (g.trades || []).filter(tr => tr.from === meId || tr.to === meId);
  if(!list.length){ d.tradesPanel.style.display = 'none'; return; }
  d.tradesPanel.style.display = '';
  d.trades.innerHTML = list.map(tr => {
    if(tr.to === meId){
      return '<div class="trp-row">'+fmt('g.tr.in', {p:pName(tr.from)})+
        '<button class="btn btn-gold trp-btn" data-view="'+esc(tr.id)+'">'+esc(t('g.tr.view'))+'</button></div>';
    }
    return '<div class="trp-row">'+fmt('g.tr.out', {p:pName(tr.to)})+
      '<button class="btn trp-btn" data-cancel="'+esc(tr.id)+'">'+esc(t('g.tr.cancel'))+'</button></div>';
  }).join('');
  d.trades.querySelectorAll('[data-view]').forEach(b => {
    b.addEventListener('click', () => openIncomingTrade(b.dataset.view));
  });
  d.trades.querySelectorAll('[data-cancel]').forEach(b => {
    b.addEventListener('click', () => act({type:'tradeCancel', id: b.dataset.cancel}));
  });
}

/* ===================================================================
   МОДАЛКИ ИГРЫ
   =================================================================== */

/* --- сертификат клетки (таблица ренты) --- */
function certHtml(i, withActions){
  const g = G.game, b = g.board[i];
  const rows = [];
  const row = (lbl, val, hl) => rows.push('<tr'+(hl ? ' class="hl"' : '')+'><td>'+esc(lbl)+'</td><td>'+esc(val)+'</td></tr>');
  if(b.t === 'prop'){
    row(t('g.cert.rent'), '$'+b.r[0], true);
    row(t('g.cert.rentgroup'), '$'+(b.r[0]*2));
    row(t('g.cert.r1'), '$'+b.r[1]);
    row(t('g.cert.r2'), '$'+b.r[2]);
    row(t('g.cert.r3'), '$'+b.r[3]);
    row(t('g.cert.r4'), '$'+b.r[4]);
    row(t('g.cert.rhq'), '$'+b.r[5]);
    row(t('g.cert.branch'), '$'+hcOf(i));
    row(t('g.cert.mortgage'), '$'+(b.p/2));
  } else if(b.t === 'air'){
    row(t('g.cert.air1'), '$'+AIR_RENTS[0], true);
    row(t('g.cert.air2'), '$'+AIR_RENTS[1]);
    row(t('g.cert.air3'), '$'+AIR_RENTS[2]);
    row(t('g.cert.air4'), '$'+AIR_RENTS[3]);
    row(t('g.cert.mortgage'), '$'+(b.p/2));
  } else {
    row(t('g.cert.util1'), t('g.cert.util1v'), true);
    row(t('g.cert.util2'), t('g.cert.util2v'));
    row(t('g.cert.mortgage'), '$'+(b.p/2));
  }
  const me = myPlayer();
  const foot = withActions
    ? '<div class="foot">'+
      '<button class="btn btn-buy" id="gmBuyOk"'+(me && me.cash < b.p ? ' disabled title="'+esc(t('g.hint.nocash'))+'"' : '')+'>'+
        esc(fmt('g.buy', {price:'$'+b.p}))+'</button>'+
      '<button class="btn" id="gmBuyNo">'+esc(t('g.decline'))+'</button></div>'+
      '<div class="foot foot2"><button class="btn" id="gmBuyAssets">💼 '+esc(t('g.assets'))+'</button></div>'
    : '';
  const GSYM = {brown:'🦖', lblue:'📞', pink:'📸', orange:'🎵', red:'🍔', yellow:'🎬', green:'✉️', dblue:'👑'};
  const gsym = b.t === 'air' ? '✈️' : (b.t === 'util' ? '⚡' : (GSYM[b.g] || ''));
  return '<div class="cert" style="--cg:'+groupColor(b)+'"><div class="band-top" style="--cg:'+groupColor(b)+'"></div>'+
    '<div class="cert-in"><div class="cert-head">'+
      (gsym ? '<span class="cert-gsym">'+gsym+'</span>' : '')+
      '<span class="pos">'+esc(fmt('g.cert.tile', {n:i}))+'</span>'+
      '<div class="certlbl">'+esc(t('g.cert.label'))+'</div>'+
      '<div class="logo-lg">'+((window.LOGOS && window.LOGOS[b.logo]) || '')+'</div>'+
      '<div class="ttl">'+esc(b.n)+'</div>'+
      '<div class="grp">'+esc(groupLabel(b))+'</div>'+
    '</div><table>'+rows.join('')+'</table>'+foot+'</div></div>';
}

/* --- модалка покупки --- */
function openBuyModal(i){
  G.buyBusy = false;
  const box = openModal(certHtml(i, true), {lock:true, kind:'buy:'+i, cls:'bare'});
  const ok = box.querySelector('#gmBuyOk'), no = box.querySelector('#gmBuyNo');
  ok.addEventListener('click', () => {
    if(G.buyBusy) return; G.buyBusy = true;
    ok.disabled = true; no.disabled = true;
    act({type:'buy'}).then(r => { if(!r || r.error){ G.buyBusy = false; ok.disabled = false; no.disabled = false; } });
  });
  no.addEventListener('click', () => {
    if(G.buyBusy) return; G.buyBusy = true;
    ok.disabled = true; no.disabled = true;
    act({type:'decline'}).then(r => { if(!r || r.error){ G.buyBusy = false; ok.disabled = false; no.disabled = false; } });
  });
  /* «Активы»: продать/заложить, чтобы наскрести на покупку; закрытие вернёт эту модалку */
  const as = box.querySelector('#gmBuyAssets');
  if(as) as.addEventListener('click', () => openAssetsModal());
}

/* --- карта Шанс/Совет --- */
function showCardModal(e){
  if(G.modal && G.modal.lock) return; /* не перекрываем блокирующую модалку */
  const isCh = e.deck === 'chance';
  const box = openModal(
    '<div class="gm-card '+(isCh ? 'chance' : 'chest')+'">'+
      '<span class="corner-flor tl">❦</span><span class="corner-flor br">❦</span>'+
      '<div class="gc-glyph">'+(isCh ? '?' : '❖')+'</div>'+
      '<div class="gc-deck">'+esc(t(isCh ? 'g.deck.chance' : 'g.deck.chest'))+'</div>'+
      '<div class="gc-text">'+esc(t('card.'+e.id))+'</div>'+
      '<div class="gc-who">'+pName(e.p)+'</div>'+
      '<button class="btn btn-gold gc-ok">'+esc(t('g.ok'))+'</button>'+
    '</div>', {kind:'card', cls:'gm-cardbox'});
  box.querySelector('.gc-ok').addEventListener('click', closeModal);
  setTimeout(() => closeModalIf(k => k === 'card'), 7000);
}

/* --- проверки even-rule для активов --- */
function groupIdx(gname){
  const out = [];
  G.game.board.forEach((c, i) => { if(c.t === 'prop' && c.g === gname) out.push(i); });
  return out;
}
function ownsGroup(pid, gname){
  return groupIdx(gname).every(i => G.game.tiles[i].owner === pid);
}
function manageAllowed(){
  const g = G.game, me = myPlayer();
  if(!g || !me || me.bankrupt) return false;
  if(g.phase === 'debt') return g.debt && g.debt.playerId === me.id;
  return isMyTurn() && (g.phase === 'roll' || g.phase === 'idle');
}
function canBuild(i){
  const g = G.game, b = g.board[i], st = g.tiles[i], me = myPlayer();
  if(b.t !== 'prop') return {ok:false, why:''};
  if(!ownsGroup(me.id, b.g)) return {ok:false, why:'g.hint.group'};
  const gi = groupIdx(b.g);
  if(gi.some(x => g.tiles[x].mortgaged)) return {ok:false, why:'g.hint.mortgroup'};
  if(st.houses >= 5) return {ok:false, why:'g.hint.max5'};
  const mn = Math.min.apply(null, gi.map(x => g.tiles[x].houses));
  if(st.houses > mn) return {ok:false, why:'g.hint.even'};
  if(me.cash < hcOf(i)) return {ok:false, why:'g.hint.nocash'};
  return {ok:true, why:''};
}
function canSellHouse(i){
  const g = G.game, b = g.board[i], st = g.tiles[i];
  if(b.t !== 'prop' || st.houses < 1) return {ok:false, why:'g.hint.nohouses'};
  const gi = groupIdx(b.g);
  const mx = Math.max.apply(null, gi.map(x => g.tiles[x].houses));
  if(st.houses < mx) return {ok:false, why:'g.hint.evensell'};
  return {ok:true, why:''};
}
function canMortgage(i){
  const g = G.game, b = g.board[i], st = g.tiles[i];
  if(st.mortgaged) return {ok:false, why:'g.err.mortgaged'};
  if(b.t === 'prop' && groupIdx(b.g).some(x => g.tiles[x].houses > 0))
    return {ok:false, why:'g.hint.houses'};
  return {ok:true, why:''};
}
function unmortCost(p){ return Math.round((p/2)*1.1); }

/* --- модалка управления активами --- */
function assetsInner(){
  const g = G.game, me = myPlayer();
  if(!me) return '';
  const mine = [];
  g.tiles.forEach((st, i) => { if(st.owner === me.id) mine.push(i); });
  if(!mine.length) return '<div class="gm-wait">'+esc(t('g.as.empty'))+'</div>';
  const allowed = manageAllowed();
  const rows = mine.map(i => {
    const b = g.board[i], st = g.tiles[i];
    const houses = st.houses >= 5
      ? '<i class="hotel"></i>'
      : '<i class="house"></i>'.repeat(st.houses);
    let acts = '', note = '';
    const dis = (chk) => {
      if(!allowed) return {d:' disabled', w:'g.hint.turn'};
      return chk.ok ? {d:'', w:''} : {d:' disabled', w:chk.why};
    };
    if(b.t === 'prop' && !st.mortgaged){
      const cb = dis(canBuild(i)), cs = dis(canSellHouse(i));
      acts += '<button class="btn" data-op="build" data-t="'+i+'"'+cb.d+'>'+esc(t('g.as.build'))+' $'+hcOf(i)+'</button>';
      acts += '<button class="btn" data-op="sellHouse" data-t="'+i+'"'+cs.d+'>'+esc(t('g.as.sellh'))+' +$'+Math.floor(hcOf(i)/2)+'</button>';
      if(cb.w && cb.w !== 'g.hint.group') note = cb.w;
    }
    if(st.mortgaged){
      const cost = unmortCost(b.p);
      const cu = dis({ok: me.cash >= cost, why:'g.hint.nocash'});
      acts += '<button class="btn btn-gold" data-op="unmortgage" data-t="'+i+'"'+cu.d+'>'+esc(t('g.as.unmort'))+' −$'+cost+'</button>';
    } else {
      const cm = dis(canMortgage(i));
      acts += '<button class="btn" data-op="mortgage" data-t="'+i+'"'+cm.d+'>'+esc(t('g.as.mort'))+' +$'+(b.p/2)+'</button>';
      if(!note && cm.w === 'g.hint.houses' && b.t === 'prop' && st.houses === 0) note = cm.w;
    }
    return '<div class="as-row'+(st.mortgaged ? ' m' : '')+'">'+
      '<span class="as-band" style="--gc:'+groupColor(b)+'"></span>'+
      '<div class="as-info"><div class="as-name">'+esc(b.n || tileName(i))+
        (st.mortgaged ? ' <span class="as-mflag">'+esc(t('g.as.mortgaged'))+'</span>' : '')+
        (st.houses >= 5 ? ' <span class="as-mflag hq">'+esc(t('g.as.hq'))+'</span>' : '')+'</div>'+
        (houses ? '<div class="as-h">'+houses+'</div>' : '')+
        (note ? '<div class="as-note">'+esc(t(note))+'</div>' : '')+'</div>'+
      '<div class="as-acts">'+acts+'</div></div>';
  }).join('');
  return rows;
}
function openAssetsModal(){
  const box = openModal(
    '<h3 class="gm-h">'+esc(t('g.as.title'))+'</h3><div class="as-list" id="gmAsList">'+assetsInner()+'</div>',
    {kind:'assets', cls:'wide'});
  wireAssets(box);
}
function refreshAssets(){
  if(!G.modal || G.modal.kind !== 'assets') return;
  const list = G.modal.box.querySelector('#gmAsList');
  if(list){ list.innerHTML = assetsInner(); wireAssets(G.modal.box); }
}
function wireAssets(box){
  box.querySelectorAll('[data-op]').forEach(b => {
    b.addEventListener('click', () => {
      b.disabled = true;
      act({type: b.dataset.op, tile: +b.dataset.t});
    });
  });
}

/* --- конструктор сделки --- */
function tradableTiles(pid){
  const g = G.game, out = [];
  g.tiles.forEach((st, i) => {
    if(st.owner !== pid) return;
    if(g.pendingTile === i) return;
    if(g.auction && g.auction.tile === i) return;
    const b = g.board[i];
    if(b.t === 'prop' && groupIdx(b.g).some(x => g.tiles[x].houses > 0)) return;
    out.push(i);
  });
  return out;
}
function openTradeModal(){
  const g = G.game, me = myPlayer();
  if(!g || !me || me.bankrupt) return;
  if(g.phase === 'auction' || g.phase === 'ended'){ notify(trErr('bad_phase')); return; }
  const partners = g.players.filter(p => !p.bankrupt && p.id !== me.id);
  if(!partners.length) return;
  let partner = partners[0].id;

  const box = openModal(
    '<h3 class="gm-h">'+esc(t('g.tr.title'))+'</h3>'+
    '<div class="field"><label>'+esc(t('g.tr.partner'))+'</label>'+
      '<select class="gm-sel" id="gmTrWho">'+
      partners.map(p => '<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+
      '</select></div>'+
    '<div class="tr-cols">'+
      '<div><h4>'+esc(t('g.tr.igive'))+'</h4><div class="tr-list" id="gmTrGive"></div>'+
        '<label class="tr-cash-l">'+esc(t('g.tr.cash'))+' (≤ $'+me.cash+')</label>'+
        '<input class="gm-num" id="gmTrGiveCash" type="number" min="0" step="1" value="0"></div>'+
      '<div><h4>'+esc(t('g.tr.itake'))+'</h4><div class="tr-list" id="gmTrTake"></div>'+
        '<label class="tr-cash-l">'+esc(t('g.tr.cash'))+'</label>'+
        '<input class="gm-num" id="gmTrTakeCash" type="number" min="0" step="1" value="0"></div>'+
    '</div>'+
    '<button class="btn btn-primary gm-full" id="gmTrSend">'+esc(t('g.tr.send'))+'</button>',
    {kind:'trade', cls:'wide'});

  const listHtml = (pid) => {
    const tls = tradableTiles(pid);
    if(!tls.length) return '<div class="tr-empty">'+esc(t('g.tr.notiles'))+'</div>';
    return tls.map(i => {
      const b = g.board[i], st = g.tiles[i];
      return '<label class="tr-item"><input type="checkbox" value="'+i+'">'+
        '<span class="as-band" style="--gc:'+groupColor(b)+'"></span>'+
        esc(b.n || tileName(i))+(st.mortgaged ? ' <span class="as-mflag">'+esc(t('g.as.mortgaged'))+'</span>' : '')+
        '</label>';
    }).join('');
  };
  const giveBox = box.querySelector('#gmTrGive'), takeBox = box.querySelector('#gmTrTake');
  const fill = () => {
    giveBox.innerHTML = listHtml(me.id);
    takeBox.innerHTML = listHtml(partner);
  };
  fill();
  box.querySelector('#gmTrWho').addEventListener('change', e => { partner = e.target.value; fill(); });
  box.querySelector('#gmTrSend').addEventListener('click', () => {
    const picked = el => Array.from(el.querySelectorAll('input:checked')).map(x => +x.value);
    const giveCash = Math.max(0, Math.min(me.cash, (+box.querySelector('#gmTrGiveCash').value) | 0));
    const takeCash = Math.max(0, (+box.querySelector('#gmTrTakeCash').value) | 0);
    act({type:'trade', to: partner, giveCash, takeCash,
      giveTiles: picked(giveBox), takeTiles: picked(takeBox)})
      .then(r => { if(r && r.ok) closeModal(); });
  });
}

/* --- входящая сделка --- */
function openIncomingTrade(id){
  const g = G.game;
  const tr = (g.trades || []).find(x => String(x.id) === String(id));
  if(!tr) return;
  if(G.modal && G.modal.lock) return;
  const names = idx => idx.map(i => '<span class="tr-tile"><span class="as-band" style="--gc:'+groupColor(g.board[i])+'"></span>'+esc(g.board[i].n || tileName(i))+'</span>').join('');
  const gets = []; /* что получаю я */
  if(tr.giveCash > 0) gets.push(sum(tr.giveCash));
  if((tr.giveTiles || []).length) gets.push(names(tr.giveTiles));
  const gives = []; /* что отдаю я */
  if(tr.takeCash > 0) gives.push(sum(tr.takeCash));
  if((tr.takeTiles || []).length) gives.push(names(tr.takeTiles));
  const box = openModal(
    '<h3 class="gm-h">'+esc(t('g.tr.incoming'))+'</h3>'+
    '<div class="tr-from">'+fmt('g.tr.offer', {p:pName(tr.from)})+'</div>'+
    '<div class="tr-cols">'+
      '<div><h4>'+esc(t('g.tr.itake'))+'</h4><div class="tr-sum">'+(gets.join('<br>') || esc(t('g.tr.nothing')))+'</div></div>'+
      '<div><h4>'+esc(t('g.tr.igive'))+'</h4><div class="tr-sum">'+(gives.join('<br>') || esc(t('g.tr.nothing')))+'</div></div>'+
    '</div>'+
    '<div class="gm-row">'+
      '<button class="btn btn-primary" id="gmTrYes">'+esc(t('g.tr.accept'))+'</button>'+
      '<button class="btn" id="gmTrNo">'+esc(t('g.tr.decline'))+'</button>'+
    '</div>', {kind:'trin:'+tr.id});
  box.querySelector('#gmTrYes').addEventListener('click', () => {
    act({type:'tradeAccept', id: tr.id}).then(() => closeModalIf(k => k === 'trin:'+tr.id));
  });
  box.querySelector('#gmTrNo').addEventListener('click', () => {
    act({type:'tradeDecline', id: tr.id}).then(() => closeModalIf(k => k === 'trin:'+tr.id));
  });
}

/* --- оверлей победителя --- */
function showWinner(){
  const g = G.game;
  const w = g && g.winner != null ? playerById(g.winner) : null;
  if(!w) return;
  if(G.winEl){
    G.winEl.querySelector('.win-name').textContent = w.name;
    return;
  }
  closeModal();
  /* причина победы: лимит кругов (по состоянию) или все разорены */
  const byWorth = (g.log || []).some(e => e.k === 'timeup');
  const sub = byWorth
    ? fmt('g.win.worth', {rounds: (g.settings && g.settings.maxRounds) || g.round})
    : t('g.win.bankrupt');
  /* итоговые состояния: деньги + собственность + отделения */
  const worthOf = pl => {
    if(pl.bankrupt) return 0;
    let v = pl.cash;
    for(let i = 0; i < 40; i++){
      const ti = g.tiles[i];
      if(ti.owner !== pl.id) continue;
      const b = g.board[i];
      v += ti.mortgaged ? Math.floor(b.p / 2) : b.p;
      if(b.hc) v += ti.houses * hcOf(i);
    }
    return v;
  };
  const rows = g.players.slice()
    .map(pl => ({pl, w: worthOf(pl)}))
    .sort((a, b2) => (a.pl.bankrupt ? 1 : 0) - (b2.pl.bankrupt ? 1 : 0) || b2.w - a.w)
    .map(({pl, w: wv}) =>
      '<div class="win-row'+(pl.id === g.winner ? ' top' : '')+(pl.bankrupt ? ' dead' : '')+'">'+
      '<span class="wr-dot" style="--pc:'+safeColor(pl.color)+'"></span>'+
      '<span class="wr-name">'+esc(pl.emoji || '')+' '+esc(pl.name)+'</span>'+
      '<span class="wr-sum">'+(pl.bankrupt ? '💀' : '$'+wv.toLocaleString('ru-RU'))+'</span></div>'
    ).join('');
  const el = document.createElement('div');
  el.className = 'gm-winner';
  el.innerHTML = '<div class="win-card">'+
    '<div class="win-crest">'+(window.CREST || '')+'</div>'+
    '<div class="win-lbl">'+esc(t('g.win.title'))+'</div>'+
    '<div class="win-name" style="color:'+safeColor(w.color)+'">'+esc(w.emoji || '')+' '+esc(w.name)+'</div>'+
    '<div class="win-sub">'+esc(sub)+'</div>'+
    '<div class="win-tbl"><div class="win-tbl-h">'+esc(t('g.win.fortunes'))+'</div>'+rows+'</div>'+
    '<button class="btn btn-gold" id="gmWinLobby">'+esc(t('g.win.lobby'))+'</button></div>';
  document.body.appendChild(el);
  G.winEl = el;
  el.querySelector('#gmWinLobby').addEventListener('click', () => {
    roomApi('/api/rooms/leave', {}).then(() => {
      hideWinner();
      Game.reset();
      activatePage('lobby');
    });
  });
}
function hideWinner(){
  if(G.winEl){ G.winEl.remove(); G.winEl = null; }
}

/* ===================================================================
   ТАЙМЕР ХОДА (локальный отсчёт от turnTime)
   =================================================================== */
function stopTimer(){
  if(G.timer.iv){ clearInterval(G.timer.iv); G.timer.iv = null; }
}
function setTimerDisplay(left){
  const d = G.gdom;
  if(!d || !d.timerT) return;
  if(left == null){
    d.timerT.textContent = '∞';
    d.timerBar.style.width = '100%';
    d.timerBar.classList.remove('low');
    return;
  }
  const m = Math.floor(left/60), s = Math.floor(left%60);
  d.timerT.textContent = m+':'+String(s).padStart(2, '0');
  d.timerBar.style.width = (G.timer.total ? Math.max(0, left/G.timer.total*100) : 100)+'%';
  d.timerBar.classList.toggle('low', left <= 10);
}
function tickTimer(){
  const left = Math.max(0, (G.timer.deadline - Date.now())/1000);
  setTimerDisplay(left);
  if(left <= 0) stopTimer();
}
function restartTimer(){
  /* до прихода серверного дедлайна ничего не выдумываем */
  stopTimer();
  setTimerDisplay(null);
}
/* авторитетный дедлайн приходит с сервера в каждом game-сообщении —
   локальный отсчёт больше НЕ расходится с сервером */
function setDeadline(dl){
  stopTimer();
  if(!dl){ setTimerDisplay(null); return; }
  G.timer.deadline = dl;
  G.timer.total = Math.max(1, (dl - Date.now()) / 1000);
  G.timer.iv = setInterval(tickTimer, 250);
  tickTimer();
}

/* ===================================================================
   ЧАТ
   =================================================================== */
function chatColor(id){
  const p = playerById(id);
  if(p) return safeColor(p.color);
  if(G.room && G.room.members){
    const i = G.room.members.findIndex(m => m.id === id);
    if(i >= 0) return PLAYER_COLORS[i % PLAYER_COLORS.length];
  }
  return 'var(--ink)';
}
function renderChat(){
  const html = G.chat.map(m =>
    '<div class="msg"><b style="color:'+chatColor(m.from && m.from.id)+'">'+esc(m.from && m.from.name)+':</b> '+esc(m.text)+'</div>'
  ).join('');
  [G.gdom && G.gdom.msgs, G.rdom && G.rdom.msgs].forEach(box => {
    if(box){ box.innerHTML = html; box.scrollTop = box.scrollHeight; }
  });
}
function sendChat(input){
  const v = (input.value || '').trim();
  if(!v) return;
  input.value = '';
  window.Net.api('/api/chat', {text: v.slice(0, 300)}).catch(() => null);
}

/* ===================================================================
   ОБРАБОТКА СОБЫТИЙ / АНИМАЦИИ
   =================================================================== */
function animateEvent(e){
  switch(e.k){
    case 'roll': return diceAnim(e.a, e.b);
    case 'move': return moveAnim(e);
    case 'jail_in':
      G.dispPos[e.p] = 10;
      renderTokens();
      return wait(320);
    case 'card':
      showCardModal(e);
      return wait(900);
    case 'trade_offer':
      if(G.me && e.to === G.me.id) openIncomingTrade(e.id);
      return Promise.resolve();
    default:
      return Promise.resolve();
  }
}
function enqueueEvents(events){
  events.forEach(e => G.anim.queue.push(e));
  processQueue();
}
function processQueue(){
  if(G.anim.running) return;
  G.anim.running = true;
  const step = () => {
    const e = G.anim.queue.shift();
    if(!e){
      G.anim.running = false;
      finalizeSync();
      return;
    }
    pushLog(e);
    /* самозалечивание: ни одно событие не может заморозить очередь навсегда
       (троттлинг таймеров в фоновой вкладке, зависший интервал и т.п.) —
       если анимация не завершилась за 2.6с, всё равно идём дальше */
    let advanced = false;
    const go = () => { if(advanced) return; advanced = true; step(); };
    const cap = setTimeout(go, 2600);
    Promise.resolve().then(() => animateEvent(e)).then(
      () => { clearTimeout(cap); go(); },
      () => { clearTimeout(cap); go(); }
    );
  };
  step();
}
/* после проигрыша всех событий — привести картинку к снапшоту */
function finalizeSync(){
  const g = G.game;
  if(!g || !G.gdom) return;
  g.players.forEach(pl => { G.dispPos[pl.id] = pl.pos; });
  renderTokens();
  if(G.gdom.die1) G.gdom.die1.classList.remove('rolling');
  if(G.gdom.die2) G.gdom.die2.classList.remove('rolling');
  if(g.rolled){ setDie(G.gdom.die1, g.rolled[0]); setDie(G.gdom.die2, g.rolled[1]); }
  syncDecisionUI();
}

/* модалки, зависящие от фазы */
function syncDecisionUI(){
  const g = G.game;
  if(!g) return;
  if(g.phase === 'ended'){
    if(g.winner != null) showWinner();
    closeModalIf(k => k.indexOf('buy:') === 0);
    return;
  }
  hideWinner();
  const needBuy = g.phase === 'buy' && g.pendingTile != null && isMyTurn();
  if(!needBuy && G.buyFailsafe){ clearTimeout(G.buyFailsafe); G.buyFailsafe = null; }
  if(needBuy){
    if(G.anim.running && !G.modal){
      /* даём фишке дойти до клетки; страховка на случай зависшей анимации */
      if(!G.buyFailsafe) G.buyFailsafe = setTimeout(()=>{ G.buyFailsafe = null; try{ syncDecisionUI(); }catch(e){} }, 4000);
    } else if(!G.modal){
      if(G.buyFailsafe){ clearTimeout(G.buyFailsafe); G.buyFailsafe = null; }
      openBuyModal(g.pendingTile);           // не перекрываем «Активы» и др. окна
    } else if(G.modal.kind === 'buy:'+g.pendingTile){
      /* касса могла измениться (продал/заложил) — обновить кнопку покупки */
      const me = myPlayer();
      const okBtn = G.modal.box.querySelector('#gmBuyOk');
      if(okBtn && me && !G.buyBusy) okBtn.disabled = me.cash < g.board[g.pendingTile].p;
    }
  } else {
    closeModalIf(k => k.indexOf('buy:') === 0);
  }
  /* входящая сделка испарилась — закрыть окно */
  if(G.modal && G.modal.kind.indexOf('trin:') === 0){
    const id = G.modal.kind.slice(5);
    if(!(g.trades || []).some(x => String(x.id) === id)) closeModal();
  }
  refreshAssets();
}

/* статичная часть экрана (без фишек) */
function renderStatic(){
  if(!G.game || !G.gdom) return;
  /* анимация не идёт (напр. реконнект без событий) — позиции берём из снапшота */
  if(!G.anim.running && !G.anim.queue.length){
    G.game.players.forEach(pl => { G.dispPos[pl.id] = pl.pos; });
  }
  updateCells();
  renderSidebar();
  renderCtx();
  renderTrades();
  if(!G.anim.running){
    if(G.game.rolled){ setDie(G.gdom.die1, G.game.rolled[0]); setDie(G.gdom.die2, G.game.rolled[1]); }
  }
  /* решающий UI (модалка покупки, кнопки хода, аукцион) обновляем ВСЕГДА —
     он не должен зависеть от того, доиграла ли визуальная анимация фишек */
  syncDecisionUI();
}

/* ===================================================================
   ПУБЛИЧНОЕ API: window.Game
   =================================================================== */
function showRoom(room){
  if(room) G.room = room;
  if(!G.room) return;
  G.screen = 'room';
  activatePage('room');
  buildRoomDom();
  renderRoom();
  renderChat();
  ensureMe().then(() => { if(G.screen === 'room') renderRoom(); });
}

function showGame(game){
  if(game) G.game = game;
  if(!G.game) return;
  const first = G.screen !== 'game';
  G.screen = 'game';
  activatePage('game');
  buildGameDom();
  seedPositions();
  if(first){
    seedLog();
    restartTimer();
  }
  renderCenterLabels();
  renderStatic();
  renderChat();
  ensureMe().then(() => { if(G.screen === 'game') renderStatic(); });
}

function reset(){
  stopTimer();
  closeModal();
  hideWinner();
  G.room = null; G.game = null; G.screen = null;
  G.chat = []; G.logEvents = []; G.dispPos = {};
  G.anim.queue = []; G.anim.running = false;
  const pr = document.getElementById('page-room');
  const pg = document.getElementById('page-game');
  if(pr) pr.innerHTML = '';
  if(pg) pg.innerHTML = '';
  G.rdom = null; G.gdom = null;
}

/* полная перерисовка при смене языка */
function rerender(){
  if(G.screen === 'room' && G.room){
    buildRoomDom();
    renderRoom();
    renderChat();
  } else if(G.screen === 'game' && G.game){
    renderCenterLabels();
    renderStatic();
    renderLog();
    renderChat();
    if(G.game.rolled){ setDie(G.gdom.die1, G.game.rolled[0]); setDie(G.gdom.die2, G.game.rolled[1]); }
  }
}

window.Game = {showRoom, showGame, reset, rerender};

/* ===================================================================
   ПОДПИСКИ НА ПОТОК
   =================================================================== */
if(window.Net && typeof window.Net.on === 'function'){
  window.Net.on('hello', msg => {
    if(msg.user) G.me = msg.user;
  });

  window.Net.on('room', msg => {
    if(msg.room === null){
      /* нас больше нет в комнате */
      if(G.screen === 'room' || G.screen === 'game'){
        reset();
        activatePage('lobby');
      }
      G.room = null;
      return;
    }
    if(!msg.room) return;
    G.room = msg.room;
    if(G.screen === 'game') return; /* идёт партия — комнату не показываем */
    showRoom(msg.room);
  });

  window.Net.on('game', msg => {
    if(!msg.game) return;
    const first = G.screen !== 'game';
    G.game = msg.game;
    if(first){
      showGame(msg.game); /* первый снапшот: без анимаций, лог из game.log */
    } else {
      if(msg.events && msg.events.length) enqueueEvents(msg.events);
      renderStatic();
    }
    if('deadline' in msg) setDeadline(msg.deadline);
  });

  window.Net.on('chat', msg => {
    G.chat.push(msg);
    if(G.chat.length > 80) G.chat.splice(0, G.chat.length - 80);
    renderChat();
  });
}

})();
