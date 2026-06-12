import type { L, Lesson } from '../types';

// ─── Bonus world · "The Holy Land" ──────────────────────────────────────────
// Unlocked after Bruges: the actual ground where the story happened.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const HOLYLAND_LESSONS: Lesson[] = [
  // ── 1: Nazareth, the Hidden Years ──────────────────────────────────────
  {
    id: 'holyland-1',
    title: u('Nazareth, the Hidden Years', 'Nadarét, những năm ẩn dật'),
    minutes: 4,
    door: {
      art: 'parish-home',
      line: u(
        'Thirty of Jesus’ thirty-three years were spent here — and the Gospels say almost nothing about them.',
        'Ba mươi trong ba mươi ba năm của Chúa Giêsu trôi qua ở đây — và các sách Tin Mừng hầu như không nói gì về chúng.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'parish-home',
        text: u(
          'A small hill town in Galilee. A workshop smelling of wood shavings. Water carried from the well, bread baked, prayers said at dusk. For thirty years, God’s life on earth looked exactly like ordinary life.',
          'Một thị trấn nhỏ trên đồi xứ Galilê. Một xưởng mộc thơm mùi vỏ bào. Nước gánh từ giếng về, bánh nướng trong lò, lời kinh đọc lúc chiều tà. Suốt ba mươi năm, cuộc sống của Thiên Chúa nơi trần gian trông y hệt một cuộc sống bình thường.',
        ),
      },
      {
        id: 'c2',
        art: 'annunciation',
        text: u(
          'Today the great Basilica of the Annunciation stands over a small cave-house — held by tradition as Mary’s home, the room of the yes. Pilgrims from every nation queue to look into one ordinary room.',
          'Ngày nay, Vương cung thánh đường Truyền Tin đứng trên một ngôi nhà hang đá nhỏ — được lưu truyền là nhà của Đức Mẹ Maria, căn phòng của tiếng xin vâng. Khách hành hương từ mọi dân tộc xếp hàng chỉ để nhìn vào một căn phòng bình thường.',
        ),
      },
      {
        id: 'c3',
        art: 'candle-single',
        text: u(
          'The hidden years are a doctrine in disguise: if God spent thirty years doing laundry, carpentry, and family dinners, then no ordinary day of yours — no layover, no early call time — is too small to be holy.',
          'Những năm ẩn dật là một bài giáo lý trá hình: nếu Thiên Chúa dành ba mươi năm cho việc giặt giũ, nghề mộc và những bữa cơm gia đình, thì không một ngày bình thường nào của bạn — không một chặng nghỉ, không một ca trực sớm nào — là quá nhỏ bé để nên thánh.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 2,
        prompt: u('What do the hidden years of Nazareth teach?', 'Những năm ẩn dật ở Nadarét dạy điều gì?'),
        options: [
          { text: u('Ordinary life can be holy', 'Cuộc sống bình thường có thể nên thánh') },
          { text: u('Only public years matter', 'Chỉ những năm hoạt động công khai mới đáng kể') },
        ],
        answer: 0,
        why: u(
          'Thirty hidden years against three public ones. God’s own ratio says most of holiness is quiet.',
          'Ba mươi năm ẩn dật so với ba năm công khai. Tỷ lệ của chính Thiên Chúa nói rằng phần lớn sự thánh thiện là thầm lặng.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('A Nazareth day', 'Một ngày Nadarét'),
      note: u(
        'Choose one chore this week — packing your case, making tea, ironing a uniform — and do it the Nazareth way: unhurried, with love, as if it mattered. It does.',
        'Hãy chọn một việc nhỏ trong tuần này — xếp vali, pha trà, là phẳng bộ đồng phục — và làm theo cách của Nadarét: không vội vã, với tình yêu, như thể nó quan trọng. Vì nó quan trọng thật.',
      ),
    },
    reflection: u('What is your most “Nazareth” hour of the day?', 'Giờ nào trong ngày của bạn “Nadarét” nhất?'),
    deeper: {
      ccc: [531, 533],
      note: u('On the hidden life of Nazareth.', 'Về đời sống ẩn dật ở Nadarét.'),
    },
  },

  // ── 2: The Lake ────────────────────────────────────────────────────────
  {
    id: 'holyland-2',
    title: u('The Lake', 'Biển Hồ'),
    minutes: 4,
    door: {
      art: 'storm-sea',
      line: u(
        'The Sea of Galilee: thirteen miles of water where half the Gospel happened.',
        'Biển Hồ Galilê: hai mươi cây số mặt nước nơi một nửa Tin Mừng đã diễn ra.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'storm-sea',
        text: u(
          'It is still there, and still working: fishermen still cast nets at dawn on the Sea of Galilee. On these shores Jesus called Peter and Andrew mid-haul: “Follow me, and I will make you fishers of men.”',
          'Hồ ấy vẫn còn đó, và vẫn đang lao động: những ngư phủ vẫn quăng lưới lúc rạng đông trên Biển Hồ Galilê. Trên những bờ hồ này, Chúa Giêsu đã gọi Phêrô và Anrê giữa mẻ lưới: “Hãy theo Thầy, Thầy sẽ làm cho các con thành những kẻ lưới người.”',
        ),
      },
      {
        id: 'c2',
        art: 'loaves-fishes',
        text: u(
          'Around this one lake: the hillside of the Beatitudes, the grass where five thousand ate, the waves he walked on, the shore where the risen Jesus cooked breakfast and asked Peter three times, “Do you love me?”',
          'Quanh một hồ nước này: sườn đồi của các Mối Phúc, bãi cỏ nơi năm ngàn người được ăn no, những con sóng Ngài đã bước lên, và bờ hồ nơi Chúa Phục Sinh nướng bữa sáng và hỏi Phêrô ba lần: “Con có yêu mến Thầy không?”',
        ),
      },
      {
        id: 'c3',
        art: 'sky-flight',
        text: u(
          'Pilgrims say the lake is the place where the Gospel feels nearest — because water does not change. The waves you would see are the waves they saw. Some places hold their stories the way the sky holds yours.',
          'Khách hành hương nói Biển Hồ là nơi Tin Mừng gần gũi nhất — vì nước không thay đổi. Những con sóng bạn sẽ thấy chính là những con sóng họ đã thấy. Có những nơi giữ câu chuyện của mình, như bầu trời đang giữ câu chuyện của bạn.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What did the risen Jesus ask Peter on this shore?', 'Trên bờ hồ này, Chúa Phục Sinh hỏi Phêrô điều gì?'),
        options: [
          { text: u('“Do you love me?” — three times', '“Con có yêu mến Thầy không?” — ba lần') },
          { text: u('“Where were you on Friday?”', '“Hôm thứ Sáu con ở đâu?”') },
        ],
        answer: 0,
        why: u(
          'One question for each denial. Mercy does not interrogate the past; it asks about love, today.',
          'Một câu hỏi cho mỗi lần chối. Lòng thương xót không tra khảo quá khứ; nó chỉ hỏi về tình yêu, hôm nay.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'storm-sea',
      title: u('The Sea of Galilee', 'Biển Hồ Galilê'),
      note: u(
        'Two hundred meters below sea level, ringed by hills — which is why storms drop onto it so suddenly, exactly as the Gospels describe. The geography keeps vouching for the story.',
        'Thấp hơn mực nước biển hai trăm mét, bốn bề là đồi núi — vì thế những cơn bão ập xuống hồ rất đột ngột, đúng như các sách Tin Mừng mô tả. Chính địa hình vẫn đang làm chứng cho câu chuyện.',
      ),
    },
    reflection: u('Which lakeside story would you want to stand inside?', 'Bạn muốn được đứng trong câu chuyện nào bên hồ?'),
  },

  // ── 3: The Empty Tomb, Today ───────────────────────────────────────────
  {
    id: 'holyland-3',
    title: u('The Empty Tomb, Today', 'Ngôi mộ trống, hôm nay'),
    minutes: 4,
    door: {
      art: 'tomb-morning',
      line: u(
        'In the middle of Jerusalem’s old city stands a church built around a tomb — because of what is not in it.',
        'Giữa lòng phố cổ Giêrusalem là một ngôi nhà thờ xây quanh một ngôi mộ — vì điều không còn ở trong đó.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'cathedral-door',
        text: u(
          'The Church of the Holy Sepulchre covers both Golgotha and the tomb — the hill of the cross and the garden grave, a hundred meters apart, under one roof since the year 335.',
          'Nhà thờ Mộ Thánh bao trùm cả Gôngôtha lẫn ngôi mộ — ngọn đồi thập giá và phần mộ trong vườn, cách nhau trăm mét, dưới cùng một mái từ năm 335.',
        ),
      },
      {
        id: 'c2',
        art: 'tomb-morning',
        text: u(
          'Pilgrims queue for hours to stoop into a small stone room and touch a shelf of rock where, for one Sabbath, the body of Jesus lay. The room is famous for being empty.',
          'Khách hành hương xếp hàng nhiều giờ để cúi mình bước vào một gian đá nhỏ và chạm vào phiến đá nơi thân xác Chúa Giêsu đã nằm, trong một ngày Sabát duy nhất. Căn phòng ấy nổi tiếng vì nó trống không.',
        ),
      },
      {
        id: 'c3',
        art: 'candle-single',
        text: u(
          'Every Easter, the church fills for the ancient vigil; candles pass flame to flame out the doors and into the streets — the same gesture as your baptism night, at the place where the morning began.',
          'Mỗi lễ Phục Sinh, nhà thờ chật kín cho đêm canh thức cổ xưa; những ngọn nến chuyền lửa cho nhau ra tận cửa và tràn xuống các con phố — cùng một cử chỉ như đêm Rửa tội của bạn, tại chính nơi buổi sáng ấy đã bắt đầu.',
        ),
      },
      {
        id: 'c4',
        art: 'sky-flight',
        text: u(
          'Maybe one day a roster change puts Tel Aviv on your schedule. But even if it never does: every altar you will ever kneel at is connected to that empty shelf of stone. The pilgrimage you finished in this app is the same road, walked from the other end.',
          'Có thể một ngày nào đó lịch bay đưa bạn đến Tel Aviv. Nhưng dù điều đó không bao giờ xảy ra: mọi bàn thờ bạn sẽ quỳ trước đều nối liền với phiến đá trống ấy. Cuộc hành hương bạn đã hoàn thành trong ứng dụng này chính là con đường đó, đi từ đầu bên kia.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('Why is the small stone room the most visited place in Christianity?', 'Vì sao gian đá nhỏ ấy là nơi được viếng thăm nhiều nhất của Kitô giáo?'),
        options: [
          { text: u('Because of what is not in it', 'Vì điều không còn ở trong đó') },
          { text: u('Because of its architecture', 'Vì kiến trúc của nó') },
        ],
        answer: 0,
        why: u(
          'Every other shrine on earth holds something. This one holds an absence — and the absence is the good news.',
          'Mọi đền thánh khác trên đời đều lưu giữ một điều gì đó. Nơi này lưu giữ một sự trống vắng — và chính sự trống vắng ấy là Tin Mừng.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'tomb-morning',
      title: u('The morning that never ends', 'Buổi sáng không bao giờ tàn'),
      note: u(
        'The bonus roads end here, where the main road’s story began its forever. Wherever you fly next, you carry the whole map now.',
        'Những con đường thêm kết thúc tại đây, nơi câu chuyện của con đường chính bắt đầu sự vĩnh cửu của nó. Dù bạn bay đến đâu tiếp theo, giờ đây bạn đã mang theo trọn tấm bản đồ.',
      ),
    },
    reflection: u('The road is walked. What will you keep?', 'Con đường đã đi qua. Bạn sẽ giữ lại điều gì?'),
    deeper: {
      ccc: [640],
      note: u('On the empty tomb as the first sign.', 'Về ngôi mộ trống là dấu chỉ đầu tiên.'),
    },
  },
];
