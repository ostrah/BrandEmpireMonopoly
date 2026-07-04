/* =====================================================================
   ЛОКАЛИЗАЦИЯ (RU / EN)
   Словарь + движок. Статический текст помечен в HTML атрибутами:
     data-i18n="key"       → textContent
     data-i18n-html="key"  → innerHTML (для строк с разметкой)
     data-i18n-ph="key"    → placeholder
     data-i18n-val="key"   → value (input)
   Динамика (доска, бренд-кит, котировки, ошибки) переводится в app.js
   через window.t('key').
   ===================================================================== */
window.I18N = {
  ru: {
    /* --- навигация / шапка --- */
    'brand.word':'МОНОПОЛИЯ', 'brand.sub':'БИРЖА · 1929',
    'nav.home':'Главная', 'nav.lobby':'Лобби', 'nav.game':'Партия',
    'nav.card':'Сертификат', 'nav.brands':'Бренд-кит', 'nav.style':'Стиль',
    'auth.login':'Войти', 'auth.register':'Регистрация',

    /* --- главная (газета) --- */
    'home.issue':'Выпуск №1929', 'home.price':'Цена — 1 акция', 'home.day':'Понедельник · утренний',
    'home.title':'Биржевой Вестник', 'home.tagline':'ежедневник спекулянта и настольного магната',
    'home.kicker':'Сенсация сезона', 'home.headline':'«Монополия» выходит в онлайн',
    'home.lede':'Собери портфель пародийных корпораций, дави конкурентов рентой и стань единственным магнатом за столом. От 2 до 6 игроков, живые торги, аукционы и сделки — прямо в браузере.',
    'home.cta.register':'Открыть счёт — бесплатно', 'home.cta.login':'Войти', 'home.cta.quick':'Быстрая игра',
    'home.stat.online':'игроков в сети', 'home.stat.games':'партии идут', 'home.stat.corps':'корпораций', 'home.stat.table':'за столом',
    'home.quote':'«Покупай дёшево, сдавай в аренду дорого.»', 'home.quote.src':'— золотое правило доски',
    'home.how.title':'Как играть',
    'home.how.1':'Бросай кубики и обходи доску по кругу.',
    'home.how.2':'Скупай компании и собирай цветовые группы.',
    'home.how.3':'Ставь отделения — рента растёт в разы.',
    'home.how.4':'Разори всех соперников и останься один.',
    'home.why.title':'Чем хороша',
    'home.why.1':'🎩 Пародийные бренды вместо скучных улиц',
    'home.why.2':'⚖️ Аукционы и сделки в реальном времени',
    'home.why.3':'🔒 «Под следствием» вместо тюрьмы',
    'home.why.4':'📈 Рейтинг и таблица магнатов',
    'home.why.5':'💬 Чат и голосования прямо в партии',
    'home.quotes.title':'Котировки дня',
    'home.footer':'© 1929 Биржевой Вестник · дружеская пародия · играйте честно',

    /* --- вход / регистрация --- */
    'login.title':'Вход в контору', 'login.sub':'Рады видеть снова, магнат',
    'login.remember':'Запомнить меня', 'login.forgot':'Забыли пароль?', 'login.submit':'Войти',
    'login.google':'Войти через Goggle', 'login.altq':'Нет счёта?', 'login.altlink':'Открыть счёт',
    'reg.title':'Открыть счёт', 'reg.sub':'Минута — и вы в игре',
    'reg.terms':'Согласен с правилами биржи и играю честно', 'reg.submit':'Зарегистрироваться',
    'reg.google':'Регистрация через Goggle', 'reg.altq':'Уже есть счёт?', 'reg.altlink':'Войти',
    'field.email':'Почта', 'field.password':'Пароль', 'field.username':'Имя магната', 'field.confirm':'Повторите пароль',
    'ph.email':'broker@birzha.ru', 'ph.password':'••••••••', 'ph.username':'Как вас звать за столом?',
    'ph.password2':'Придумайте пароль', 'ph.confirm':'Ещё раз', 'ph.chat':'Сообщение...',
    'auth.or':'или',
    'pw.show':'показать', 'pw.hide':'скрыть', 'pw.default':'—',
    'pw.weak':'слабый', 'pw.medium':'средний', 'pw.good':'хороший', 'pw.strong':'крепкий',
    'err.email':'Введите корректную почту', 'err.password':'Минимум 6 символов',
    'err.username':'Имя — от 2 до 24 символов', 'err.confirm':'Пароли не совпадают',
    'err.terms':'Нужно согласиться с правилами биржи',

    /* --- шапка после входа / тосты --- */
    'auth.logout':'Выйти',
    'toast.hello':'Добро пожаловать, {name}!',
    'toast.bye':'До встречи на торгах!',
    'toast.needLogin':'Сначала войдите в контору',
    'toast.codeSent':'Новая телеграмма с кодом уже в ящике',

    /* --- подтверждение почты --- */
    'verify.title':'Подтверждение почты',
    'verify.sub':'Мы отправили телеграмму с кодом на',
    'verify.hint':'Введите шесть цифр из письма — или вставьте код целиком из буфера',
    'verify.submit':'Подтвердить',
    'verify.noCode':'Телеграмма не дошла?',
    'verify.resend':'Отправить ещё раз',
    'verify.resendIn':'Повторно через {s} с',
    'verify.openMail':'📮 Открыть почту',
    'verify.err.short':'Введите все шесть цифр',

    /* --- демо-почта --- */
    'mail.title':'Почтовое отделение',
    'mail.demo':'демо',
    'mail.note':'Демо-режим: письма не покидают сервер.',
    'mail.to':'Кому',
    'mail.subject':'Тема',
    'mail.code':'код доступа',
    'mail.empty':'Пока ни одной телеграммы.',
    'mail.close':'Закрыть',

    /* --- пародийный вход Goggle --- */
    'goggle.pick':'Выберите счёт',
    'goggle.or':'или представьтесь',
    'goggle.ph':'Как вас записать?',
    'goggle.continue':'Продолжить',
    'goggle.note':'Дружеская пародия: настоящий Google не участвует, письма никуда не уходят.',
    'goggle.err.name':'Имя — от 2 до 24 символов',
    'goggle.acc1':'Барон фон Демо',
    'goggle.acc2':'Гостья Биржи',

    /* --- лобби (реальные комнаты) --- */
    'lobby.codehead':'Вход по коду',
    'lobby.codeph':'код комнаты, например r_x7f2',
    'lobby.join':'Войти',
    'lobby.empty':'Открытых комнат пока нет — учредите первую.',

    /* --- ошибки API (тосты и подписи) --- */
    'api.error':'Что-то пошло не так — попробуйте ещё раз',
    'api.bad_input':'Проверьте заполнение полей',
    'api.email_taken':'Эта почта уже числится на бирже',
    'api.bad_code':'Код не подходит',
    'api.expired':'Код истёк — запросите новый',
    'api.too_many_attempts':'Слишком много попыток — запросите новый код',
    'api.not_found':'Не найдено — проверьте код комнаты',
    'api.bad_credentials':'Неверная почта или пароль',
    'api.unverified':'Почта не подтверждена — введите код из письма',
    'api.full':'Комната уже заполнена',
    'api.started':'Партия уже началась',
    'api.in_room':'Вы уже состоите в комнате',
    'api.taken':'Уже занято',
    'api.unauthorized':'Сначала войдите',
    'api.cant':'Сейчас так нельзя',

    /* --- имена игроков --- */
    'name.alex':'Алексей', 'name.marta':'Marta', 'name.dan':'Дэн', 'name.yuki':'Юки',

    /* --- партия --- */
    'game.turn':'Ход:', 'game.players':'Акционеры',
    'badge.now':'ходит', 'badge.jail':'под следствием',
    'game.roll':'🎲 Бросить кубики', 'game.buy':'Купить', 'game.auction':'Аукцион',
    'game.trade':'Сделка', 'game.endturn':'Завершить ход', 'game.chat':'Чат',
    'game.rolled':'выбросил',
    'bc.sub':'БИРЖА 1929',
    'deck.chance.t':'? Биржа', 'deck.chance.s':'курс качнулся',
    'deck.chest.t':'❖ Совет', 'deck.chest.s':'директоров',
    'log.1':"<b>Юки</b> купила <b>Reddat</b> за <span class='sum'>$180</span>",
    'log.2':"<b>Дэн</b> выбросил <span class='sum'>8</span> и попал на «Биржу»",
    'log.3':"<b>Marta</b> заплатила ренту <b>Алексею</b> — <span class='sum'>$24</span>",
    'chat.1':"<b class='c-2'>Marta:</b> вытащите меня из-под следствия 😭",
    'chat.2':"<b class='c-3'>Дэн:</b> меняю Twutch на UDS + $100",
    'chat.3':"<b class='c-1'>Алексей:</b> беру Firefax и оранжевая моя",

    /* --- доска --- */
    'board.go':'СТАРТ', 'board.go.sub':'+$200',
    'board.jail':'ПОД СЛЕДСТВИЕМ', 'board.jail.sub':'SEC',
    'board.parking':'ОФШОР', 'board.parking.sub':'отдых',
    'board.gotojail':'АРЕСТ АКТИВОВ', 'board.gotojail.sub':'',
    'board.chance':'Биржа', 'board.chest':'Совет',
    'board.tax.income':'Налог на прибыль', 'board.tax.audit':'Аудит',

    /* --- лобби --- */
    'lobby.tag':'Биржа · 1929', 'lobby.est':'Собери портфель корпораций и разори конкурентов',
    'lobby.create':'Учредить партию', 'lobby.roomname':'Название комнаты', 'lobby.roomval':'Вечерние торги',
    'lobby.private':'Приватная комната', 'lobby.mode':'Режим', 'lobby.mode.blitz':'⚡ Блиц · ~15 мин', 'lobby.mode.classic':'Классика', 'lobby.players':'Акционеров', 'lobby.capital':'Стартовый капитал',
    'lobby.turntime':'Время на ход', 'lobby.opengame':'Открыть торги', 'lobby.openrooms':'Открытые комнаты',
    'lobby.host':'распорядитель:', 'lobby.enter':'Войти', 'lobby.full':'Полная', 'lobby.picktoken':'Выбери фишку',
    'seg.30':'30с', 'seg.60':'60с', 'seg.120':'120с',
    'room.1':'Биржевой замес', 'room.2':'Без сделок, только хардкор', 'room.3':'Новичкам рады', 'room.4':'Турнир №14 — финал',

    /* --- сертификат --- */
    'cert.label':'— Сертификат акции —', 'cert.pos1':'поле №34', 'cert.pos2':'поле №5',
    'cert.grp.green':'Зелёная группа', 'cert.grp.air':'✈ Логистика',
    'cert.rent':'Рента', 'cert.rentgroup':'Со всей группой',
    'cert.r1':'С 1 отделением', 'cert.r2':'С 2 отделениями', 'cert.r3':'С 3 отделениями', 'cert.r4':'С 4 отделениями',
    'cert.rhq':'Со штаб-квартирой', 'cert.branch':'Отделение', 'cert.mortgage':'Залог',
    'cert.air1':'Рента (1 сеть)', 'cert.air2':'2 сети', 'cert.air3':'3 сети', 'cert.air4':'4 сети',
    'cert.buy1':'Купить $320', 'cert.buy2':'Купить $200', 'cert.auction':'На аукцион',
    'cert.note.title':'Модалка покупки',
    'cert.note.body':'Появляется, когда фишка встаёт на свободную клетку. Подсвечена <b>текущая ставка ренты</b>. Отказ от покупки автоматически выставляет актив на <b>аукцион</b> между всеми игроками — по классическим правилам.',

    /* --- бренд-кит --- */
    'brands.title':'Бренд-кит: 28 пародийных марок',
    'brands.intro':'Все логотипы нарисованы с нуля как <b>SVG-код</b> (в файле <code>logos.js</code>) — это не копии оригиналов, а перерисовка: узнаётся силуэт и палитра, но название и детали «сдвинуты». Так игра остаётся забавной и юридически безопасной пародией. Полоска сверху карточки — цветовая группа на доске; подпись снизу — цена.',
    'hint.nokla':'финский телефон-легенда', 'hint.yahwoo':'старый портал с восклицанием',
    'hint.tvitter':'птичка-микроблог', 'hint.skyqe':'звонки из облака', 'hint.zoon':'видеоконференции',
    'hint.instaglam':'фото-лента с градиентом', 'hint.tnobile':'розовый оператор', 'hint.twutch':'стримы игр',
    'hint.reddat':'форумы с пришельцем', 'hint.soundclod':'звук из облака', 'hint.firefax':'огненный браузер',
    'hint.cosacola':'красная газировка', 'hint.youtune':'красная кнопка play', 'hint.netflex':'стриминг сериалов',
    'hint.mcronalds':'золотые арки', 'hint.ikeya':'мебель из Швеции', 'hint.snapchit':'исчезающие фото',
    'hint.spatify':'музыка в наушниках', 'hint.whatsupp':'зелёный мессенджер', 'hint.startbucks':'кофе с сиреной',
    'hint.nozama':'маркетплейс-гигант', 'hint.epple':'надкушенный фрукт',
    'hint.fodex':'доставка со скрытой стрелкой', 'hint.uds':'коричневые курьеры',
    'hint.dhk':'жёлто-красная логистика', 'hint.ubar':'вызов такси',
    'hint.tesler':'электро-энергия', 'hint.gogglecloud':'четырёхцветное облако',

    /* --- дизайн-система --- */
    'ds.palette':'Палитра «Биржа 1929»',
    'ds.paper':'Бумага', 'ds.ink':'Чернила', 'ds.emerald':'Изумруд', 'ds.oxblood':'Бордо',
    'ds.gold':'Золото', 'ds.indigo':'Индиго', 'ds.teal':'Бирюза', 'ds.cloth':'Сукно',
    'ds.groups':'Цветовые группы на доске',
    'ds.g.brown':'Коричневая', 'ds.g.lblue':'Голубая', 'ds.g.pink':'Розовая', 'ds.g.orange':'Оранжевая',
    'ds.g.red':'Красная', 'ds.g.yellow':'Жёлтая', 'ds.g.green':'Зелёная', 'ds.g.dblue':'Синяя',
    'ds.typo':'Типографика',
    'ds.typo.1':'Playfair Display — <i>заголовки и гербы</i>',
    'ds.typo.2':'Playfair 700 — названия компаний и суммы',
    'ds.typo.3':'EB Garamond — основной текст интерфейса, 16px, с засечками',
    'ds.typo.4':'Oswald — метки, тикеры, кнопки, цифры на клетках',
    'ds.components':'Компоненты',
    'ds.c.primary':'Основная', 'ds.c.buy':'Покупка', 'ds.c.gold':'Золотая', 'ds.c.default':'Обычная', 'ds.c.disabled':'Недоступна',
  },

  en: {
    /* --- nav / header --- */
    'brand.word':'MONOPOLY', 'brand.sub':'EXCHANGE · 1929',
    'nav.home':'Home', 'nav.lobby':'Lobby', 'nav.game':'Game',
    'nav.card':'Certificate', 'nav.brands':'Brand kit', 'nav.style':'Style',
    'auth.login':'Log in', 'auth.register':'Sign up',

    /* --- home (gazette) --- */
    'home.issue':'Issue No. 1929', 'home.price':'Price — 1 share', 'home.day':'Monday · morning edition',
    'home.title':'The Exchange Herald', 'home.tagline':'daily paper of the speculator and boardroom magnate',
    'home.kicker':'Scoop of the season', 'home.headline':'“Monopoly” goes online',
    'home.lede':'Build a portfolio of parody corporations, crush rivals with rent, and become the last magnate standing. From 2 to 6 players — live trading, auctions and deals, right in your browser.',
    'home.cta.register':'Open an account — free', 'home.cta.login':'Log in', 'home.cta.quick':'Quick game',
    'home.stat.online':'players online', 'home.stat.games':'games in progress', 'home.stat.corps':'corporations', 'home.stat.table':'per table',
    'home.quote':'“Buy low, rent high.”', 'home.quote.src':'— the golden rule of the board',
    'home.how.title':'How to play',
    'home.how.1':'Roll the dice and move around the board.',
    'home.how.2':'Buy up companies and complete colour sets.',
    'home.how.3':'Add branches — rent grows many times over.',
    'home.how.4':'Ruin every rival and be the last one standing.',
    'home.why.title':'Why it rocks',
    'home.why.1':'🎩 Parody brands instead of dull streets',
    'home.why.2':'⚖️ Auctions and deals in real time',
    'home.why.3':'🔒 “Under investigation” instead of jail',
    'home.why.4':'📈 Ranking and a leaderboard of magnates',
    'home.why.5':'💬 Chat and votes right in the game',
    'home.quotes.title':'Today’s quotes',
    'home.footer':'© 1929 The Exchange Herald · a friendly parody · play fair',

    /* --- login / register --- */
    'login.title':'Enter the office', 'login.sub':'Good to see you again, magnate',
    'login.remember':'Remember me', 'login.forgot':'Forgot password?', 'login.submit':'Log in',
    'login.google':'Continue with Goggle', 'login.altq':'No account?', 'login.altlink':'Open one',
    'reg.title':'Open an account', 'reg.sub':'A minute and you are in',
    'reg.terms':'I agree to the exchange rules and play fair', 'reg.submit':'Sign up',
    'reg.google':'Sign up with Goggle', 'reg.altq':'Already have an account?', 'reg.altlink':'Log in',
    'field.email':'Email', 'field.password':'Password', 'field.username':'Magnate name', 'field.confirm':'Repeat password',
    'ph.email':'broker@birzha.com', 'ph.password':'••••••••', 'ph.username':'What is your name at the table?',
    'ph.password2':'Create a password', 'ph.confirm':'Once more', 'ph.chat':'Message...',
    'auth.or':'or',
    'pw.show':'show', 'pw.hide':'hide', 'pw.default':'—',
    'pw.weak':'weak', 'pw.medium':'medium', 'pw.good':'good', 'pw.strong':'strong',
    'err.email':'Enter a valid email', 'err.password':'At least 6 characters',
    'err.username':'Name must be 2–24 characters', 'err.confirm':'Passwords do not match',
    'err.terms':'You must agree to the exchange rules',

    /* --- header after login / toasts --- */
    'auth.logout':'Log out',
    'toast.hello':'Welcome, {name}!',
    'toast.bye':'See you on the trading floor!',
    'toast.needLogin':'Log in to the office first',
    'toast.codeSent':'A fresh telegram with the code is in your box',

    /* --- email verification --- */
    'verify.title':'Verify your email',
    'verify.sub':'We wired a telegram with a code to',
    'verify.hint':'Type the six digits from the letter — or paste the whole code at once',
    'verify.submit':'Confirm',
    'verify.noCode':'Telegram lost in transit?',
    'verify.resend':'Send it again',
    'verify.resendIn':'Again in {s} s',
    'verify.openMail':'📮 Open the mail',
    'verify.err.short':'Enter all six digits',

    /* --- demo mail --- */
    'mail.title':'Post Office',
    'mail.demo':'demo',
    'mail.note':'Demo mode: letters never leave the server.',
    'mail.to':'To',
    'mail.subject':'Subject',
    'mail.code':'access code',
    'mail.empty':'No telegrams yet.',
    'mail.close':'Close',

    /* --- parody Goggle sign-in --- */
    'goggle.pick':'Choose an account',
    'goggle.or':'or introduce yourself',
    'goggle.ph':'What shall we call you?',
    'goggle.continue':'Continue',
    'goggle.note':'A friendly parody: no real Google involved, nothing is sent anywhere.',
    'goggle.err.name':'Name must be 2–24 characters',
    'goggle.acc1':'Baron von Demo',
    'goggle.acc2':'Guest of the Exchange',

    /* --- lobby (real rooms) --- */
    'lobby.codehead':'Join by code',
    'lobby.codeph':'room code, e.g. r_x7f2',
    'lobby.join':'Join',
    'lobby.empty':'No open rooms yet — found the first one.',

    /* --- API errors (toasts and captions) --- */
    'api.error':'Something went wrong — please try again',
    'api.bad_input':'Check the form fields',
    'api.email_taken':'This email is already listed on the exchange',
    'api.bad_code':'That code does not fit',
    'api.expired':'The code has expired — request a new one',
    'api.too_many_attempts':'Too many attempts — request a new code',
    'api.not_found':'Not found — check the room code',
    'api.bad_credentials':'Wrong email or password',
    'api.unverified':'Email not verified — enter the code from the letter',
    'api.full':'The room is already full',
    'api.started':'The game has already started',
    'api.in_room':'You are already in a room',
    'api.taken':'Already taken',
    'api.unauthorized':'Log in first',
    'api.cant':'You cannot do that right now',

    /* --- player names --- */
    'name.alex':'Alex', 'name.marta':'Marta', 'name.dan':'Dan', 'name.yuki':'Yuki',

    /* --- game --- */
    'game.turn':'Turn:', 'game.players':'Shareholders',
    'badge.now':'playing', 'badge.jail':'under investigation',
    'game.roll':'🎲 Roll dice', 'game.buy':'Buy', 'game.auction':'Auction',
    'game.trade':'Trade', 'game.endturn':'End turn', 'game.chat':'Chat',
    'game.rolled':'rolled',
    'bc.sub':'EXCHANGE 1929',
    'deck.chance.t':'? Market', 'deck.chance.s':'the rate swung',
    'deck.chest.t':'❖ Board', 'deck.chest.s':'of directors',
    'log.1':"<b>Yuki</b> bought <b>Reddat</b> for <span class='sum'>$180</span>",
    'log.2':"<b>Dan</b> rolled <span class='sum'>8</span> and landed on the Market",
    'log.3':"<b>Marta</b> paid rent to <b>Alex</b> — <span class='sum'>$24</span>",
    'chat.1':"<b class='c-2'>Marta:</b> someone bail me out of the investigation 😭",
    'chat.2':"<b class='c-3'>Dan:</b> trading Twutch for UDS + $100",
    'chat.3':"<b class='c-1'>Alex:</b> grabbing Firefax and orange is mine",

    /* --- board --- */
    'board.go':'START', 'board.go.sub':'+$200',
    'board.jail':'INVESTIGATION', 'board.jail.sub':'SEC',
    'board.parking':'OFFSHORE', 'board.parking.sub':'rest',
    'board.gotojail':'ASSET SEIZURE', 'board.gotojail.sub':'',
    'board.chance':'Market', 'board.chest':'Board',
    'board.tax.income':'Income Tax', 'board.tax.audit':'Audit',

    /* --- lobby --- */
    'lobby.tag':'Exchange · 1929', 'lobby.est':'Build a corporate portfolio and ruin your rivals',
    'lobby.create':'Found a game', 'lobby.roomname':'Room name', 'lobby.roomval':'Evening session',
    'lobby.private':'Private room', 'lobby.mode':'Mode', 'lobby.mode.blitz':'⚡ Blitz · ~15 min', 'lobby.mode.classic':'Classic', 'lobby.players':'Players', 'lobby.capital':'Starting capital',
    'lobby.turntime':'Turn time', 'lobby.opengame':'Open the floor', 'lobby.openrooms':'Open rooms',
    'lobby.host':'host:', 'lobby.enter':'Join', 'lobby.full':'Full', 'lobby.picktoken':'Pick your token',
    'seg.30':'30s', 'seg.60':'60s', 'seg.120':'120s',
    'room.1':'Exchange brawl', 'room.2':'No deals, hardcore only', 'room.3':'Newcomers welcome', 'room.4':'Tournament No. 14 — final',

    /* --- certificate --- */
    'cert.label':'— Share certificate —', 'cert.pos1':'tile #34', 'cert.pos2':'tile #5',
    'cert.grp.green':'Green set', 'cert.grp.air':'✈ Logistics',
    'cert.rent':'Rent', 'cert.rentgroup':'With full set',
    'cert.r1':'With 1 branch', 'cert.r2':'With 2 branches', 'cert.r3':'With 3 branches', 'cert.r4':'With 4 branches',
    'cert.rhq':'With HQ', 'cert.branch':'Branch', 'cert.mortgage':'Mortgage',
    'cert.air1':'Rent (1 network)', 'cert.air2':'2 networks', 'cert.air3':'3 networks', 'cert.air4':'4 networks',
    'cert.buy1':'Buy $320', 'cert.buy2':'Buy $200', 'cert.auction':'To auction',
    'cert.note.title':'Purchase modal',
    'cert.note.body':'Appears when a token lands on an unowned tile. The <b>current rent tier</b> is highlighted. Declining the purchase automatically sends the asset to <b>auction</b> among all players — by the classic rules.',

    /* --- brand kit --- */
    'brands.title':'Brand kit: 28 parody marks',
    'brands.intro':'Every logo is drawn from scratch as <b>SVG code</b> (in <code>logos.js</code>) — not copies of the originals but redraws: the silhouette and palette are recognisable, yet the name and details are shifted. That keeps the game a fun, legally safe parody. The strip atop each card is the board colour group; the caption below is the price.',
    'hint.nokla':'legendary Finnish phone', 'hint.yahwoo':'old portal with a bang',
    'hint.tvitter':'the little-bird microblog', 'hint.skyqe':'calls from the cloud', 'hint.zoon':'video meetings',
    'hint.instaglam':'gradient photo feed', 'hint.tnobile':'the pink carrier', 'hint.twutch':'game streams',
    'hint.reddat':'forums with an alien', 'hint.soundclod':'sound from the cloud', 'hint.firefax':'the fiery browser',
    'hint.cosacola':'red fizzy drink', 'hint.youtune':'red play button', 'hint.netflex':'series streaming',
    'hint.mcronalds':'golden arches', 'hint.ikeya':'furniture from Sweden', 'hint.snapchit':'vanishing photos',
    'hint.spatify':'music in your ears', 'hint.whatsupp':'the green messenger', 'hint.startbucks':'coffee with a siren',
    'hint.nozama':'marketplace giant', 'hint.epple':'the bitten fruit',
    'hint.fodex':'delivery with a hidden arrow', 'hint.uds':'brown couriers',
    'hint.dhk':'yellow-and-red logistics', 'hint.ubar':'ride hailing',
    'hint.tesler':'electric power', 'hint.gogglecloud':'four-colour cloud',

    /* --- design system --- */
    'ds.palette':'“Exchange 1929” palette',
    'ds.paper':'Paper', 'ds.ink':'Ink', 'ds.emerald':'Emerald', 'ds.oxblood':'Oxblood',
    'ds.gold':'Gold', 'ds.indigo':'Indigo', 'ds.teal':'Teal', 'ds.cloth':'Cloth',
    'ds.groups':'Board colour groups',
    'ds.g.brown':'Brown', 'ds.g.lblue':'Light blue', 'ds.g.pink':'Pink', 'ds.g.orange':'Orange',
    'ds.g.red':'Red', 'ds.g.yellow':'Yellow', 'ds.g.green':'Green', 'ds.g.dblue':'Dark blue',
    'ds.typo':'Typography',
    'ds.typo.1':'Playfair Display — <i>headings & crests</i>',
    'ds.typo.2':'Playfair 700 — company names and sums',
    'ds.typo.3':'EB Garamond — main interface text, 16px, serif',
    'ds.typo.4':'Oswald — labels, tickers, buttons, tile numbers',
    'ds.components':'Components',
    'ds.c.primary':'Primary', 'ds.c.buy':'Buy', 'ds.c.gold':'Gold', 'ds.c.default':'Default', 'ds.c.disabled':'Disabled',
  },
};

/* текущий язык + переводчик */
window.LANG = 'ru';
window.t = function(key){
  const d = window.I18N[window.LANG] || window.I18N.ru;
  if(key in d) return d[key];
  if(key in window.I18N.ru) return window.I18N.ru[key];
  return key;
};

/* применить перевод ко всему статическому HTML */
window.applyStaticI18n = function(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = window.t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{ el.innerHTML = window.t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{ el.setAttribute('placeholder', window.t(el.dataset.i18nPh)); });
  document.querySelectorAll('[data-i18n-val]').forEach(el=>{ el.value = window.t(el.dataset.i18nVal); });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{ el.title = window.t(el.dataset.i18nTitle); });
};
