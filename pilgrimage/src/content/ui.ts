import type { L } from './types';

// ─── Interface strings ───────────────────────────────────────────────────────
// No hardcoded text in components: every label lives here as a paired record.

const v = (en: string, vi: string, viStatus: 'verified' | 'unverified' = 'unverified'): L => ({
  en,
  vi,
  viStatus,
});

export const UI = {
  appName: v('The Pilgrimage', 'Hành Hương', 'unverified'),

  // Navigation — exactly three destinations, ever.
  navToday: v('Today', 'Hôm nay'),
  navRoad: v('The Road', 'Con đường'),
  navChapel: v('My Chapel', 'Nhà nguyện'),

  // Onboarding — three screens, nothing more.
  obChooseLanguage: v('Choose your language', 'Chọn ngôn ngữ của bạn'),
  obLanguageNote: v('You can change this anytime.', 'Bạn có thể thay đổi bất cứ lúc nào.'),
  obYourName: v('What should we call you?', 'Chúng tôi nên gọi bạn là gì?'),
  obNamePlaceholder: v('Your name', 'Tên của bạn'),
  obWelcomeLine: v(
    'This is a quiet road through the great holy places of the world. Walk it at your own pace.',
    'Đây là một con đường yên tĩnh qua những nơi thánh thiêng lớn của thế giới. Hãy đi theo nhịp của riêng bạn.',
  ),
  obContinue: v('Continue', 'Tiếp tục'),
  obSkipName: v('Continue without a name', 'Tiếp tục mà không cần tên'),
  dataTools: v('Backup & data', 'Sao lưu & dữ liệu'),
  obMapLine: v('Every pilgrimage begins with a single step.', 'Mọi cuộc hành hương đều bắt đầu bằng một bước chân.'),
  obBegin: v('Step inside', 'Bước vào'),

  // Onboarding — meeting the voice that walks with you.
  obGuideTitle: v('A voice to walk with you', 'Một giọng nói đồng hành cùng bạn'),
  obGuideBody: v(
    'I can read every story, prayer, and step aloud as it opens — so you can simply listen and walk. You can turn this off anytime.',
    'Tôi có thể đọc to mỗi câu chuyện, lời kinh và bước đi khi chúng mở ra — để bạn chỉ cần lắng nghe và bước đi. Bạn có thể tắt bất cứ lúc nào.',
  ),
  obGuideYes: v('Read to me', 'Hãy đọc cho tôi'),
  obGuideNo: v('I’ll read myself', 'Tôi sẽ tự đọc'),
  // Spoken the moment the voice is first turned on, so you hear it at once.
  obGuideSample: v(
    'Peace be with you. I will walk beside you, and read each story aloud, so you can simply listen.',
    'Bình an cho bạn. Tôi sẽ đồng hành bên bạn, và đọc to mỗi câu chuyện, để bạn chỉ cần lắng nghe.',
  ),

  // Today
  todayGreeting: v('Peace be with you', 'Bình an cho bạn'),
  greetMorning: v('Good morning', 'Chào buổi sáng'),
  greetAfternoon: v('Good afternoon', 'Chào buổi chiều'),
  greetEvening: v('Good evening', 'Chào buổi tối'),
  streakLine: v('day streak', 'ngày liên tiếp'),
  todaysStep: v('Today’s step', 'Bước chân hôm nay'),
  begin: v('Begin', 'Bắt đầu'),
  continueWord: v('Continue', 'Tiếp tục'),
  resumeLine: v('We kept your page. The story waits where you left it.', 'Trang sách vẫn được giữ. Câu chuyện đợi bạn ở nơi bạn dừng lại.'),
  minutesShort: v('min', 'phút'),
  doneToday: v('You have walked today. The candle is lit.', 'Hôm nay bạn đã bước đi. Ngọn nến đã được thắp.'),
  walkFurther: v('Walk a little further?', 'Đi thêm một đoạn nữa?'),
  roadComplete: v('You have walked the whole road that is open today. More of the road is being prepared.', 'Bạn đã đi hết đoạn đường đang mở. Những đoạn đường mới đang được chuẩn bị.'),

  // Lesson player
  tapToEnter: v('Tap to enter', 'Chạm để bước vào'),
  check: v('Check', 'Kiểm tra'),
  gentleRight: v('Yes — beautifully done.', 'Đúng vậy — thật tuyệt.'),
  gentleWrong: v('Almost — and now you know. Here it is.', 'Gần đúng rồi — và giờ bạn đã biết. Đây là câu trả lời.'),
  orderHint: v('Tap the cards in order, from first to last.', 'Chạm các thẻ theo thứ tự, từ đầu đến cuối.'),
  orderReset: v('Start over', 'Làm lại'),
  matchHint: v('Tap a symbol, then its meaning.', 'Chạm một biểu tượng, rồi chạm ý nghĩa của nó.'),
  tapArtHint: v('Tap each glowing point to look closer.', 'Chạm vào từng điểm sáng để nhìn gần hơn.'),
  treasureLabel: v('A treasure for your journey', 'Một kho báu cho hành trình của bạn'),
  prayerKept: v('Kept in My Chapel', 'Được giữ trong Nhà nguyện'),
  reflectionPrompt: v('What stayed with you today?', 'Điều gì còn đọng lại trong bạn hôm nay?'),
  reflectionNote: v('Only for you. Never graded, never shared.', 'Chỉ dành cho bạn. Không chấm điểm, không chia sẻ.'),
  reflectionPlaceholder: v('A word or a line, if you like — or simply light the candle.', 'Một từ hay một dòng, nếu bạn muốn — hoặc chỉ cần thắp nến.'),
  skipForNow: v('Skip for now', 'Để sau'),
  lightTheCandle: v('Light the candle', 'Thắp nến'),
  candleLit: v('The candle is lit.', 'Ngọn nến đã được thắp.'),
  seeTheRoad: v('See the road', 'Xem con đường'),
  backToToday: v('Back to Today', 'Về Hôm nay'),
  goDeeper: v('Go deeper', 'Tìm hiểu thêm'),
  cccRef: v('Catechism of the Catholic Church', 'Sách Giáo lý Hội Thánh Công giáo'),
  originalBeauty: v('Original wording', 'Bản văn truyền thống'),
  inPlainWords: v('In plain words', 'Nói một cách đơn giản'),
  simplifiedRendering: v('simplified rendering', 'bản diễn đạt đơn giản'),

  // The Road
  roadTitle: v('The Road', 'Con đường'),
  openPassport: v('Open your passport', 'Mở hộ chiếu của bạn'),
  lockedWorld: v('Further along the road', 'Xa hơn trên con đường'),
  lessonsWord: v('steps', 'bước'),
  vigilWord: v('Vigil', 'Đêm canh thức'),
  worldComplete: v('Stamped', 'Đã đóng dấu'),
  comingSoon: v('The road continues soon', 'Con đường sẽ sớm tiếp tục'),

  // Passport
  passportTitle: v('Pilgrim’s Passport', 'Hộ chiếu người hành hương'),
  passportName: v('Pilgrim', 'Người hành hương'),
  passportStampDate: v('Stamped on', 'Đóng dấu ngày'),
  passportNotYet: v('This page waits for you.', 'Trang này đang đợi bạn.'),
  passportFinalPage: v('Reserved for the day of your baptism.', 'Dành cho ngày bạn lãnh nhận Bí tích Rửa tội.'),
  passportCandles: v('candles lit', 'ngọn nến đã thắp'),
  close: v('Close', 'Đóng'),

  // My Chapel
  chapelTitle: v('My Chapel', 'Nhà nguyện của tôi'),
  chapelCandles: v('Your candles', 'Những ngọn nến của bạn'),
  chapelCandlesNote: v(
    'One candle for each day you walked. If a day is missed, nothing is lost — candles can always be lit again.',
    'Một ngọn nến cho mỗi ngày bạn bước đi. Nếu lỡ một ngày, không sao cả — nến luôn có thể được thắp lại.',
  ),
  chapelPrayers: v('Prayers you keep', 'Những lời kinh bạn giữ'),
  chapelNoPrayers: v('Prayers you learn on the road will rest here.', 'Những lời kinh bạn học trên đường sẽ được giữ ở đây.'),
  chapelJournal: v('Your journal', 'Nhật ký của bạn'),
  chapelNoJournal: v('Your private reflections will gather here.', 'Những suy tư riêng của bạn sẽ được lưu lại ở đây.'),
  chapelSettings: v('Settings', 'Cài đặt'),
  language: v('Language', 'Ngôn ngữ'),
  exportSave: v('Export my pilgrimage (JSON)', 'Xuất hành trình của tôi (JSON)'),
  importSave: v('Import a saved pilgrimage', 'Nhập hành trình đã lưu'),
  importOk: v('Welcome back. Your pilgrimage is restored.', 'Chào mừng trở lại. Hành trình của bạn đã được khôi phục.'),
  importBad: v('That file could not be read.', 'Không thể đọc tệp này.'),
  viReviewExport: v('Vietnamese review list (for a native speaker)', 'Danh sách cần kiểm tra tiếng Việt (cho người bản xứ)'),
  parishNote: v(
    'Your parish and your priest lead this journey. This app just walks beside you.',
    'Giáo xứ và cha xứ của bạn dẫn dắt hành trình này. Ứng dụng chỉ đồng hành bên bạn.',
  ),

  // Streak / candles
  streakDays: v('days walked', 'ngày đã đi'),
  restDay: v('rest day', 'ngày nghỉ'),

  // Daily Reliquary
  reliquaryTitle: v('The Daily Reliquary', 'Hộp thánh tích mỗi ngày'),
  reliquaryHint: v('Something small waits inside.', 'Một điều nhỏ bé đang đợi bên trong.'),
  reliquaryOpened: v('Opened today. Another gift tomorrow.', 'Đã mở hôm nay. Ngày mai sẽ có món quà khác.'),

  // Install to home screen
  installTitle: v('Keep it on your home screen', 'Lưu vào màn hình chính'),
  installBody: v('Install The Pilgrimage like an app — full screen, and it works offline.', 'Cài Hành Hương như một ứng dụng — toàn màn hình, và dùng được khi không có mạng.'),
  installButton: v('Install', 'Cài đặt'),
  installHow: v('How to add it', 'Cách thêm vào'),
  installLater: v('Later', 'Để sau'),
  installIosHint: v('Tap the Share button at the bottom of the screen, then choose “Add to Home Screen.”', 'Chạm nút Chia sẻ ở cuối màn hình, rồi chọn “Thêm vào MH chính.”'),

  // Rose Window
  roseWindow: v('The Rose Window', 'Cửa sổ hoa hồng'),

  // Practices (Mass walkthrough, Rosary trainer)
  chapelPractices: v('Practices', 'Thực hành'),
  massTitle: v('Walk through the Mass', 'Bước theo Thánh lễ'),
  massSubtitle: v('Every moment explained — what to say, when to stand, sit, and kneel.', 'Từng khoảnh khắc được giải thích — nói gì, khi nào đứng, ngồi và quỳ.'),
  postureStand: v('Stand', 'Đứng'),
  postureSit: v('Sit', 'Ngồi'),
  postureKneel: v('Kneel', 'Quỳ'),
  massPriestSays: v('The priest says', 'Linh mục đọc'),
  massYouSay: v('You answer', 'Bạn thưa'),
  massDone: v('You have walked the whole Mass. Next Sunday, none of it will be a stranger to you.', 'Bạn đã đi trọn một Thánh lễ. Chúa nhật tới, sẽ không còn điều gì xa lạ với bạn nữa.'),
  massPostureNote: v('Postures vary a little from country to country. When unsure, simply follow your neighbors.', 'Tư thế có thể khác đôi chút giữa các nước. Khi không chắc, bạn cứ làm theo những người bên cạnh.'),
  rosaryTitle: v('The Rosary', 'Kinh Mân Côi'),
  rosarySubtitle: v('Bead by bead, with all four sets of mysteries.', 'Từng hạt một, với cả bốn mầu nhiệm Mân Côi.'),

  // The Stations of the Cross
  stationsTitle: v('The Stations of the Cross', 'Đàng Thánh Giá'),
  stationsSubtitle: v('Fourteen stations, walked slowly — prayed on Fridays and in Lent.', 'Mười bốn chặng, bước đi chậm rãi — cầu nguyện các ngày thứ Sáu và trong Mùa Chay.'),
  stationWord: v('Station', 'Chặng thứ'),
  stationsDone: v('You have walked the Way of the Cross. Go home in the hope of the third day.', 'Bạn đã đi trọn Đàng Thánh Giá. Hãy trở về trong niềm hy vọng của ngày thứ ba.'),
  tapToContinue: v('Tap to continue', 'Chạm để tiếp tục'),

  // The Divine Mercy Chaplet
  mercySubtitle: v('Seven minutes of mercy, on ordinary rosary beads — the three o’clock prayer.', 'Bảy phút của lòng thương xót, trên tràng hạt Mân Côi — lời kinh lúc ba giờ chiều.'),
  mercyDone: v('Jesus, I trust in you. The chaplet is complete.', 'Lạy Chúa Giêsu, con tín thác vào Chúa. Chuỗi kinh đã hoàn tất.'),
  rosaryAnnounce: v('The next mystery', 'Mầu nhiệm tiếp theo'),
  rosaryTapNext: v('Tap for the next bead', 'Chạm để sang hạt tiếp theo'),
  rosaryDone: v('A whole rosary, prayed. The beads in your hands know their purpose now.', 'Trọn một chuỗi Mân Côi đã được nguyện. Những hạt chuỗi trong tay bạn giờ đã biết sứ mạng của mình.'),

  // RCIA tracker
  rciaTitle: v('Your RCIA road', 'Hành trình RCIA của bạn'),
  rciaDays: v('days to go', 'ngày nữa'),
  rciaToday: v('Today.', 'Hôm nay.'),
  rciaPassed: v('Received', 'Đã lãnh nhận'),

  // Sound
  soundLabel: v('Sound (bell and stamp)', 'Âm thanh (chuông và con dấu)'),
  soundNote: v('Silence is the default, like a church.', 'Thinh lặng là mặc định, như trong một nhà thờ.'),

  // Ambient chant
  ambientLabel: v('Gregorian chant (background)', 'Thánh ca Gregorian (nhạc nền)'),
  ambientNote: v('A soft chant plays in the background while you walk. Requires sound to also be on for the chime.', 'Thánh ca nhẹ nhàng chơi ở nền trong khi bạn bước đi.'),

  // Narration — the guide that reads aloud
  narrateLabel: v('Read aloud as I walk', 'Đọc to khi tôi bước đi'),
  narrateNote: v('The guide reads each story, prayer, and step aloud as it opens. Tap any speaker to replay, or to listen on your own pace.', 'Người dẫn đường đọc to mỗi câu chuyện, lời kinh và bước đi khi chúng mở ra. Chạm vào biểu tượng loa để nghe lại, hoặc nghe theo nhịp của riêng bạn.'),
  narratePlay: v('Read this aloud', 'Đọc to phần này'),
  narrateStop: v('Stop reading', 'Dừng đọc'),
  narratePreview: v('Hear the guide', 'Nghe người dẫn đường'),
  narrateNoVoice: v('Your device has no Vietnamese voice installed, so reading may use an English voice.', 'Thiết bị của bạn chưa cài giọng đọc tiếng Việt, nên phần đọc có thể dùng giọng tiếng Anh.'),
  guideReading: v('Reading aloud', 'Đang đọc'),
  guideTapToStop: v('Tap to stop', 'Chạm để dừng'),

  stepsWalked: v('steps walked', 'bước đã đi'),

  // App update — a newer build is ready
  updateReady: v('The road ahead has been repaved — a newer version is ready.', 'Con đường phía trước đã được làm mới — phiên bản mới đã sẵn sàng.'),
  updateAction: v('Refresh', 'Làm mới'),
  updateLater: v('Not now', 'Để sau'),

  // Bonus roads
  bonusRoads: v('Further roads', 'Những con đường xa hơn'),
  bonusLocked: v('Opens with your first stamp', 'Mở ra cùng con dấu đầu tiên của bạn'),
  bonusPreparing: v('Being prepared', 'Đang được chuẩn bị'),

  // Rosary mystery sets
  rosaryChooseSet: v('Which mysteries today?', 'Hôm nay nguyện mầu nhiệm nào?'),
  rosaryTodaySet: v('Today’s mysteries', 'Mầu nhiệm của hôm nay'),
} as const;

export type UIKey = keyof typeof UI;
