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
    'This is a quiet road through places you have stood. Walk it at your own pace.',
    'Đây là một con đường yên tĩnh qua những nơi bạn từng đặt chân đến. Hãy đi theo nhịp của riêng bạn.',
  ),
  obContinue: v('Continue', 'Tiếp tục'),
  obMapLine: v('The road begins where you began.', 'Con đường bắt đầu từ nơi bạn đã bắt đầu.'),
  obBegin: v('Step inside', 'Bước vào'),

  // Today
  todayGreeting: v('Peace be with you', 'Bình an cho bạn'),
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
  gentleRight: v('Yes.', 'Đúng vậy.'),
  gentleWrong: v('Almost — here it is.', 'Gần đúng rồi — đây là câu trả lời.'),
  orderHint: v('Tap the cards in order, from first to last.', 'Chạm các thẻ theo thứ tự, từ đầu đến cuối.'),
  orderReset: v('Start over', 'Làm lại'),
  matchHint: v('Tap a symbol, then its meaning.', 'Chạm một biểu tượng, rồi chạm ý nghĩa của nó.'),
  tapArtHint: v('Tap each glowing point to look closer.', 'Chạm vào từng điểm sáng để nhìn gần hơn.'),
  treasureLabel: v('A treasure for your journey', 'Một kho báu cho hành trình của bạn'),
  prayerKept: v('Kept in My Chapel', 'Được giữ trong Nhà nguyện'),
  reflectionPrompt: v('What stayed with you today?', 'Điều gì còn đọng lại trong bạn hôm nay?'),
  reflectionNote: v('Only for you. Never graded, never shared.', 'Chỉ dành cho bạn. Không chấm điểm, không chia sẻ.'),
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
    'Your parish and Father Matthew lead this journey. This app just walks beside you.',
    'Giáo xứ và cha Matthew dẫn dắt hành trình này. Ứng dụng chỉ đồng hành bên bạn.',
  ),

  // Streak / candles
  streakDays: v('days walked', 'ngày đã đi'),
  restDay: v('rest day', 'ngày nghỉ'),

  // Daily Reliquary
  reliquaryTitle: v('The Daily Reliquary', 'Hộp thánh tích mỗi ngày'),
  reliquaryHint: v('Something small waits inside.', 'Một điều nhỏ bé đang đợi bên trong.'),
  reliquaryOpened: v('Opened today. Another gift tomorrow.', 'Đã mở hôm nay. Ngày mai sẽ có món quà khác.'),

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
  rosarySubtitle: v('Your own rosary, bead by bead. The Joyful Mysteries.', 'Chuỗi Mân Côi của bạn, từng hạt một. Năm Sự Vui.'),
  rosaryAnnounce: v('The next mystery', 'Mầu nhiệm tiếp theo'),
  rosaryTapNext: v('Tap for the next bead', 'Chạm để sang hạt tiếp theo'),
  rosaryDone: v('A whole rosary, prayed. The beads your fiancé gave you know their purpose now.', 'Trọn một chuỗi Mân Côi đã được nguyện. Những hạt chuỗi vị hôn phu tặng bạn giờ đã biết sứ mạng của mình.'),
} as const;

export type UIKey = keyof typeof UI;
