import type { ArtKind, L } from './types';

// ─── The Stations of the Cross ───────────────────────────────────────────────
// The Way of the Cross (Đàng Thánh Giá) — fourteen stations, walked slowly.
// Each station: the traditional versicle and response, then a short
// meditation in the app's own voice. Prayed especially on Fridays and in Lent.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export interface Station {
  n: number;
  title: L;
  art: ArtKind;
  meditation: L;
}

/** Said at the opening of every station. */
export const STATIONS_VERSICLE: L = u(
  'We adore you, O Christ, and we praise you.',
  'Lạy Chúa Kitô, chúng con thờ lạy và ngợi khen Chúa.',
);
export const STATIONS_RESPONSE: L = u(
  'Because by your holy Cross you have redeemed the world.',
  'Vì Chúa đã dùng Thánh Giá mà chuộc tội cho thiên hạ.',
);

export const STATIONS: Station[] = [
  {
    n: 1,
    title: u('Jesus is condemned to death', 'Chúa Giêsu bị kết án tử hình'),
    art: 'prayer-night',
    meditation: u(
      'An innocent man stands silent while the crowd shouts. He accepts the sentence for love of you. Stand with him a moment before the walking begins.',
      'Một người vô tội đứng lặng thinh giữa tiếng la hét của đám đông. Người nhận bản án vì yêu thương bạn. Hãy đứng bên Người một lát trước khi con đường bắt đầu.',
    ),
  },
  {
    n: 2,
    title: u('Jesus takes up his cross', 'Chúa Giêsu vác thánh giá'),
    art: 'symbol-cross',
    meditation: u(
      'He does not have the cross forced onto him — he takes it. Whatever you are carrying today, he knows its weight from the inside.',
      'Thánh giá không bị ép đặt lên Người — chính Người đón lấy. Bất cứ điều gì bạn đang mang hôm nay, Người thấu hiểu sức nặng của nó từ bên trong.',
    ),
  },
  {
    n: 3,
    title: u('Jesus falls the first time', 'Chúa Giêsu ngã xuống đất lần thứ nhất'),
    art: 'gethsemane',
    meditation: u(
      'The Son of God is in the dust. Falling is not failing; he rises and keeps walking. So can you.',
      'Con Thiên Chúa nằm trong bụi đất. Ngã không phải là thất bại; Người trỗi dậy và bước tiếp. Bạn cũng có thể như thế.',
    ),
  },
  {
    n: 4,
    title: u('Jesus meets his mother', 'Chúa Giêsu gặp Đức Mẹ'),
    art: 'visitation',
    meditation: u(
      'No words are recorded — only two faces meeting in the crowd. Mary cannot take the cross away, so she gives what love can give: presence.',
      'Không lời nào được ghi lại — chỉ hai gương mặt gặp nhau giữa đám đông. Mẹ Maria không thể cất thánh giá đi, nên Mẹ trao điều tình yêu có thể trao: sự hiện diện.',
    ),
  },
  {
    n: 5,
    title: u('Simon of Cyrene helps Jesus carry the cross', 'Ông Simon vác đỡ thánh giá'),
    art: 'samaritan-road',
    meditation: u(
      'Simon did not volunteer — he was pulled from the crowd. Grace often begins as an interruption. Who has been Simon for you?',
      'Ông Simon không tình nguyện — ông bị kéo ra từ đám đông. Ân sủng thường bắt đầu như một sự gián đoạn. Ai đã là Simon cho bạn?',
    ),
  },
  {
    n: 6,
    title: u('Veronica wipes the face of Jesus', 'Bà Veronica lau mặt Chúa'),
    art: 'white-garment',
    meditation: u(
      'One small kindness in the middle of cruelty — a cloth, a face, a moment. No act of tenderness is ever wasted.',
      'Một nghĩa cử nhỏ giữa sự tàn nhẫn — một tấm khăn, một gương mặt, một khoảnh khắc. Không cử chỉ dịu dàng nào là vô ích.',
    ),
  },
  {
    n: 7,
    title: u('Jesus falls the second time', 'Chúa Giêsu ngã xuống đất lần thứ hai'),
    art: 'cross-dawn',
    meditation: u(
      'The same fall, again. He knows what it is to struggle with the same weakness twice — and more than twice. He does not despise you for it.',
      'Cùng một cú ngã, lần nữa. Người biết thế nào là chiến đấu với cùng một yếu đuối hai lần — và hơn hai lần. Người không khinh chê bạn vì điều đó.',
    ),
  },
  {
    n: 8,
    title: u('Jesus meets the women of Jerusalem', 'Chúa Giêsu an ủi các phụ nữ thành Giêrusalem'),
    art: 'jerusalem-city',
    meditation: u(
      'Even now he turns toward the weeping and speaks to them. Bruised and bleeding, he is still the comforter.',
      'Ngay cả lúc này, Người vẫn hướng về những người than khóc và nói với họ. Dù bầm dập và đổ máu, Người vẫn là Đấng an ủi.',
    ),
  },
  {
    n: 9,
    title: u('Jesus falls the third time', 'Chúa Giêsu ngã xuống đất lần thứ ba'),
    art: 'martyrs-palm',
    meditation: u(
      'So near the end, the hardest fall. When you are almost through and your strength gives out — this station is yours.',
      'Gần đến đích, cú ngã nặng nề nhất. Khi bạn sắp vượt qua mà sức lực cạn kiệt — chặng này là dành cho bạn.',
    ),
  },
  {
    n: 10,
    title: u('Jesus is stripped of his garments', 'Chúa Giêsu bị lột áo'),
    art: 'candle-single',
    meditation: u(
      'They take everything, even his clothing. He stands with nothing — and still possesses everything that matters: love, and the will of the Father.',
      'Họ lấy đi tất cả, cả áo của Người. Người đứng đó không còn gì — nhưng vẫn có tất cả những gì đáng kể: tình yêu, và thánh ý Chúa Cha.',
    ),
  },
  {
    n: 11,
    title: u('Jesus is nailed to the cross', 'Chúa Giêsu chịu đóng đinh vào thánh giá'),
    art: 'cross-passion',
    meditation: u(
      'His hands, which healed and blessed and broke bread, are fixed open. Even nailed down, they remain open — toward you.',
      'Đôi tay từng chữa lành, chúc phúc và bẻ bánh, nay bị ghim chặt trong tư thế mở ra. Dù bị đóng đinh, đôi tay ấy vẫn mở — hướng về bạn.',
    ),
  },
  {
    n: 12,
    title: u('Jesus dies on the cross', 'Chúa Giêsu chết trên thánh giá'),
    art: 'cross-dawn',
    meditation: u(
      'The world goes quiet. "It is finished." Stay here longer than feels comfortable. This is the price, and it was paid freely.',
      'Cả thế giới lặng đi. "Mọi sự đã hoàn tất." Hãy ở lại đây lâu hơn mức bạn thấy thoải mái. Đây là cái giá, và nó đã được trả một cách tự nguyện.',
    ),
  },
  {
    n: 13,
    title: u('Jesus is taken down from the cross', 'Tháo xác Chúa Giêsu xuống khỏi thánh giá'),
    art: 'pieta',
    meditation: u(
      'Mary receives her son the way she first received him: in her arms. Grief held in love is still love.',
      'Mẹ Maria đón nhận con mình như thuở ban đầu: trong vòng tay Mẹ. Nỗi đau được ôm trong tình yêu vẫn là tình yêu.',
    ),
  },
  {
    n: 14,
    title: u('Jesus is laid in the tomb', 'Táng xác Chúa Giêsu trong mộ'),
    art: 'tomb-morning',
    meditation: u(
      'The stone rolls shut, and everything seems over. But you already know what this tomb will do on the third day. Walk home in that hope.',
      'Tảng đá lấp cửa mộ, và mọi sự dường như chấm dứt. Nhưng bạn đã biết ngôi mộ này sẽ ra sao vào ngày thứ ba. Hãy trở về trong niềm hy vọng ấy.',
    ),
  },
];
