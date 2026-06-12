import type { ArtKind, L } from './types';

// ─── The Rosary Trainer ──────────────────────────────────────────────────────
// The rosary she owns becomes something she can actually pray: bead by bead,
// with all four sets of mysteries on their traditional days.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export interface Mystery {
  n: number;
  title: L;
  art: ArtKind;
  meditation: L;
}

export type MysterySetId = 'joyful' | 'sorrowful' | 'glorious' | 'luminous';

export interface MysterySet {
  id: MysterySetId;
  name: L;
  /** Traditional weekday schedule (0 = Sunday). */
  days: number[];
  mysteries: Mystery[];
}

export const JOYFUL_MYSTERIES: Mystery[] = [
  {
    n: 1,
    title: u('The Annunciation', 'Thiên thần truyền tin'),
    art: 'annunciation',
    meditation: u(
      'The angel greets Mary, and she says yes. While the beads pass, stay in that small room.',
      'Thiên thần chào Đức Mẹ Maria, và Mẹ thưa xin vâng. Khi lần chuỗi, hãy ở lại trong căn phòng nhỏ ấy.',
    ),
  },
  {
    n: 2,
    title: u('The Visitation', 'Đức Mẹ thăm viếng bà Êlisabét'),
    art: 'visitation',
    meditation: u(
      'Mary hurries through the hills to help her older cousin Elizabeth. Joy travels; love goes first.',
      'Mẹ Maria vội vã băng đồi đến giúp người chị họ lớn tuổi Êlisabét. Niềm vui biết lên đường; tình yêu luôn đi trước.',
    ),
  },
  {
    n: 3,
    title: u('The Nativity', 'Chúa Giêsu giáng sinh'),
    art: 'nativity',
    meditation: u(
      'The child is born in Bethlehem. Hold one face you love before the manger as you pray.',
      'Hài nhi sinh ra ở Bêlem. Khi đọc kinh, hãy đặt một gương mặt bạn thương trước máng cỏ.',
    ),
  },
  {
    n: 4,
    title: u('The Presentation', 'Dâng Chúa trong Đền Thánh'),
    art: 'presentation-temple',
    meditation: u(
      'Mary and Joseph bring the baby to the temple, and old Simeon holds the light of the world in his arms.',
      'Mẹ Maria và thánh Giuse đem hài nhi lên Đền Thánh, và cụ già Simêon được ẵm trên tay ánh sáng của trần gian.',
    ),
  },
  {
    n: 5,
    title: u('The Finding in the Temple', 'Tìm thấy Chúa trong Đền Thánh'),
    art: 'finding-temple',
    meditation: u(
      'Twelve years old, lost for three days, found among the teachers. Whatever feels lost can be found in his Father’s house.',
      'Mười hai tuổi, lạc mất ba ngày, được tìm thấy giữa các bậc thầy. Điều gì tưởng đã mất đều có thể tìm lại trong nhà Cha Ngài.',
    ),
  },
];

export const SORROWFUL_MYSTERIES: Mystery[] = [
  {
    n: 1,
    title: u('The Agony in the Garden', 'Chúa Giêsu hấp hối trong vườn'),
    art: 'gethsemane',
    meditation: u(
      'He is afraid, and he prays anyway: not my will, but yours. Bring your own fear into the olive trees.',
      'Ngài sợ hãi, và Ngài vẫn cầu nguyện: xin đừng theo ý con, mà theo ý Cha. Hãy mang nỗi sợ của chính bạn vào giữa rặng ô liu.',
    ),
  },
  {
    n: 2,
    title: u('The Scourging', 'Chúa chịu đánh đòn'),
    art: 'cross-passion',
    meditation: u(
      'He bears it in silence, for love. Pray for everyone whose suffering is hidden.',
      'Ngài chịu đựng trong thinh lặng, vì yêu thương. Hãy cầu cho những ai đang đau khổ âm thầm.',
    ),
  },
  {
    n: 3,
    title: u('The Crowning with Thorns', 'Chúa chịu đội mão gai'),
    art: 'cross-passion',
    meditation: u(
      'They mock his kingship. He never answers cruelty with cruelty. Pray for the strength of gentleness.',
      'Người ta nhạo báng vương quyền Ngài. Ngài không bao giờ đáp trả tàn nhẫn bằng tàn nhẫn. Hãy cầu xin sức mạnh của sự dịu dàng.',
    ),
  },
  {
    n: 4,
    title: u('The Carrying of the Cross', 'Chúa vác thập giá'),
    art: 'cross-dawn',
    meditation: u(
      'Step by step up the hill, helped once by a stranger named Simon. Pray to notice who is carrying something near you.',
      'Từng bước lên đồi, một lần được đỡ vác bởi một người lạ tên Simon. Hãy xin ơn nhận ra ai gần mình đang phải gánh một điều nặng.',
    ),
  },
  {
    n: 5,
    title: u('The Crucifixion', 'Chúa chịu đóng đinh'),
    art: 'cross-passion',
    meditation: u(
      '“Father, forgive them.” Stay at the foot of the cross with Mary, and name the person you find hardest to forgive.',
      '“Lạy Cha, xin tha cho họ.” Hãy đứng dưới chân thập giá cùng Mẹ Maria, và thầm gọi tên người bạn thấy khó tha thứ nhất.',
    ),
  },
];

export const GLORIOUS_MYSTERIES: Mystery[] = [
  {
    n: 1,
    title: u('The Resurrection', 'Chúa sống lại'),
    art: 'tomb-morning',
    meditation: u(
      'The stone is rolled away and he says her name: “Mary.” Listen for yours.',
      'Tảng đá đã lăn sang một bên và Ngài gọi tên bà: “Maria.” Hãy lắng nghe tên của chính bạn.',
    ),
  },
  {
    n: 2,
    title: u('The Ascension', 'Chúa lên trời'),
    art: 'ascension',
    meditation: u(
      '“I am with you always.” He leaves their sight, not their side. Pray with that promise.',
      '“Thầy ở cùng các con mọi ngày.” Ngài rời khỏi tầm mắt, không rời khỏi bên cạnh. Hãy cầu nguyện với lời hứa ấy.',
    ),
  },
  {
    n: 3,
    title: u('The Descent of the Holy Spirit', 'Chúa Thánh Thần hiện xuống'),
    art: 'pentecost-fire',
    meditation: u(
      'Wind, fire, courage. Ask for one flame’s worth of boldness for tomorrow.',
      'Gió, lửa, lòng can đảm. Hãy xin một ngọn lửa nhỏ của sự dạn dĩ cho ngày mai.',
    ),
  },
  {
    n: 4,
    title: u('The Assumption of Mary', 'Đức Mẹ lên trời'),
    art: 'heaven-light',
    meditation: u(
      'The mother is brought home, body and soul. The first of us to arrive where all of us are invited.',
      'Người Mẹ được đưa về quê trời, cả hồn lẫn xác. Người đầu tiên trong chúng ta đến nơi mà tất cả chúng ta được mời.',
    ),
  },
  {
    n: 5,
    title: u('The Coronation of Mary', 'Đức Mẹ được tôn vinh Nữ Vương'),
    art: 'creation-light',
    meditation: u(
      'The girl from Nazareth, crowned queen of heaven. God does not forget anyone’s yes.',
      'Người thiếu nữ Nadarét, được tôn làm Nữ Vương thiên đàng. Thiên Chúa không quên tiếng xin vâng của bất cứ ai.',
    ),
  },
];

export const LUMINOUS_MYSTERIES: Mystery[] = [
  {
    n: 1,
    title: u('The Baptism in the Jordan', 'Chúa chịu phép rửa'),
    art: 'font-water',
    meditation: u(
      '“This is my beloved Son.” The same words hover over every font — soon, over yours.',
      '“Đây là Con yêu dấu của Ta.” Những lời ấy phủ trên mọi giếng rửa tội — chẳng bao lâu nữa, trên giếng của bạn.',
    ),
  },
  {
    n: 2,
    title: u('The Wedding at Cana', 'Tiệc cưới Cana'),
    art: 'cana-jars',
    meditation: u(
      '“Do whatever he tells you.” Bring your own wedding into this decade.',
      '“Người bảo gì, cứ làm theo.” Hãy mang lễ cưới của chính bạn vào chục kinh này.',
    ),
  },
  {
    n: 3,
    title: u('The Proclamation of the Kingdom', 'Chúa rao giảng Nước Trời'),
    art: 'teacher-hill',
    meditation: u(
      'The hillside, the parables, the mercy. Pray for one person who has not yet heard a kind version of this story.',
      'Sườn đồi, các dụ ngôn, lòng thương xót. Hãy cầu cho một người chưa từng được nghe câu chuyện này theo cách nhân hậu.',
    ),
  },
  {
    n: 4,
    title: u('The Transfiguration', 'Chúa biến hình'),
    art: 'creation-light',
    meditation: u(
      'On the mountain, his friends see him in glory — light through light. A glimpse, to carry them through Friday.',
      'Trên núi, các bạn hữu thấy Ngài trong vinh quang — ánh sáng trong ánh sáng. Một thoáng nhìn, đủ để đưa họ qua ngày thứ Sáu.',
    ),
  },
  {
    n: 5,
    title: u('The Institution of the Eucharist', 'Chúa lập Bí tích Thánh Thể'),
    art: 'last-supper',
    meditation: u(
      'Take, thank, break, give. The night the table was set for you, two thousand years early.',
      'Cầm lấy, tạ ơn, bẻ ra, trao đi. Đêm mà bàn tiệc được dọn sẵn cho bạn, hai ngàn năm về trước.',
    ),
  },
];

export const MYSTERY_SETS: MysterySet[] = [
  {
    id: 'joyful',
    name: u('The Joyful Mysteries', 'Năm Sự Vui'),
    days: [1, 6], // Monday, Saturday
    mysteries: JOYFUL_MYSTERIES,
  },
  {
    id: 'sorrowful',
    name: u('The Sorrowful Mysteries', 'Năm Sự Thương'),
    days: [2, 5], // Tuesday, Friday
    mysteries: SORROWFUL_MYSTERIES,
  },
  {
    id: 'glorious',
    name: u('The Glorious Mysteries', 'Năm Sự Mừng'),
    days: [3, 0], // Wednesday, Sunday
    mysteries: GLORIOUS_MYSTERIES,
  },
  {
    id: 'luminous',
    name: u('The Luminous Mysteries', 'Năm Sự Sáng'),
    days: [4], // Thursday
    mysteries: LUMINOUS_MYSTERIES,
  },
];

/** The traditional set for a given weekday. */
export function todaysSet(date = new Date()): MysterySet {
  const day = date.getDay();
  return MYSTERY_SETS.find((s) => s.days.includes(day)) ?? MYSTERY_SETS[0];
}

// ─── Bead-by-bead sequence ───────────────────────────────────────────────────

export type BeadKind = 'cross' | 'large' | 'small' | 'chain' | 'medal';

export interface RosaryStep {
  bead: BeadKind;
  prayerId: string;
  /** For Hail Marys inside a decade: position within the ten. */
  count?: { i: number; n: number };
  /** Mystery being contemplated (1–5), when inside a decade. */
  mystery?: number;
  /** True when this step announces a new mystery. */
  announce?: boolean;
}

export function buildRosary(set: MysterySet): RosaryStep[] {
  const steps: RosaryStep[] = [
    { bead: 'cross', prayerId: 'sign-of-the-cross' },
    { bead: 'cross', prayerId: 'apostles-creed' },
    { bead: 'large', prayerId: 'our-father' },
  ];
  for (let i = 1; i <= 3; i++) {
    steps.push({ bead: 'small', prayerId: 'hail-mary', count: { i, n: 3 } });
  }
  steps.push({ bead: 'chain', prayerId: 'glory-be' });

  for (const m of set.mysteries) {
    steps.push({ bead: 'medal', prayerId: 'announce', mystery: m.n, announce: true });
    steps.push({ bead: 'large', prayerId: 'our-father', mystery: m.n });
    for (let i = 1; i <= 10; i++) {
      steps.push({ bead: 'small', prayerId: 'hail-mary', count: { i, n: 10 }, mystery: m.n });
    }
    steps.push({ bead: 'chain', prayerId: 'glory-be', mystery: m.n });
  }

  steps.push({ bead: 'medal', prayerId: 'hail-holy-queen' });
  steps.push({ bead: 'cross', prayerId: 'sign-of-the-cross' });
  return steps;
}
