import type { L, Lesson } from '../types';

// ─── Bonus world · "Saints of Asia" ─────────────────────────────────────────
// Unlocked after the Hà Nội stamp: people from her own homeland among the
// saints. Lanterns on dark water.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const ASIA_LESSONS: Lesson[] = [
  // ── 1: The Hundred and Seventeen ───────────────────────────────────────
  {
    id: 'asia-1',
    title: u('The Hundred and Seventeen', 'Một trăm mười bảy vị'),
    minutes: 4,
    door: {
      art: 'asia-lanterns',
      line: u(
        'A bonus road, lit by lanterns: the saints who speak your language.',
        'Một con đường thêm, thắp sáng bằng đèn lồng: các vị thánh nói tiếng của bạn.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'martyrs-palm',
        text: u(
          'Between 1745 and 1862, in waves of persecution, an enormous number of Vietnamese Catholics — some estimates say over one hundred thousand — died rather than abandon the faith. The Church has formally named 117 of them.',
          'Từ năm 1745 đến 1862, qua những đợt bách hại, một số lượng rất lớn người Công giáo Việt Nam — có ước tính nói hơn một trăm ngàn — đã chết chứ không bỏ đạo. Giáo hội đã chính thức tuyên phong 117 vị trong số đó.',
        ),
      },
      {
        id: 'c2',
        art: 'asia-lanterns',
        text: u(
          'Read who they were: 8 bishops, 50 priests — and 59 lay people. Farmers, fishermen, a tailor, soldiers, mothers, catechists. Most of the 117 were ordinary Vietnamese believers, people who would have understood your life.',
          'Hãy xem các ngài là ai: 8 giám mục, 50 linh mục — và 59 giáo dân. Nông dân, ngư phủ, một người thợ may, binh lính, những người mẹ, các thầy giảng. Phần lớn trong 117 vị là tín hữu Việt Nam bình thường, những con người hẳn sẽ hiểu được cuộc sống của bạn.',
        ),
      },
      {
        id: 'c3',
        art: 'martyrs-palm',
        text: u(
          'In 1988, Pope John Paul II canonized all 117 together as “Anrê Dũng Lạc and companions.” Their feast, November 24, is kept by the whole world — a Vietnamese day on every Catholic calendar on earth.',
          'Năm 1988, Đức Giáo hoàng Gioan Phaolô II tuyên thánh cả 117 vị cùng lúc, với danh hiệu “Anrê Dũng Lạc và các bạn tử đạo.” Lễ kính các ngài, ngày 24 tháng 11, được cả thế giới cử hành — một ngày của Việt Nam trên mọi cuốn lịch Công giáo trên trái đất.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('Who made up the largest group among the 117?', 'Nhóm đông nhất trong 117 vị là ai?'),
        options: [
          { text: u('Bishops', 'Các giám mục') },
          { text: u('Ordinary lay people', 'Những giáo dân bình thường') },
        ],
        answer: 1,
        why: u(
          'Holiness is not a job title. The majority were people with families, boats, fields, and markets.',
          'Sự thánh thiện không phải một chức danh. Đa số là những người có gia đình, có thuyền, có ruộng, có phiên chợ.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'asia-lanterns',
      title: u('Lanterns on the water', 'Đèn lồng trên mặt nước'),
      note: u(
        'On their feast day, Vietnamese parishes around the world fill with áo dài, incense, and drums. If you are ever flying on November 24, find one. It will feel like home, because it is.',
        'Vào ngày lễ các ngài, các giáo xứ Việt Nam khắp thế giới rợp áo dài, hương trầm và tiếng trống. Nếu ngày 24 tháng 11 nào đó bạn đang bay, hãy tìm một giáo xứ như thế. Bạn sẽ thấy như ở nhà — vì đúng là nhà.',
      ),
    },
    reflection: u('What does it mean that ordinary people can be saints?', 'Việc những người bình thường có thể nên thánh nói với bạn điều gì?'),
    deeper: {
      ccc: [2473],
      note: u('On martyrdom as witness.', 'Về tử đạo là chứng tá.'),
    },
  },

  // ── 2: The Lady of La Vang ─────────────────────────────────────────────
  {
    id: 'asia-2',
    title: u('The Lady of La Vang', 'Đức Mẹ La Vang'),
    minutes: 4,
    door: {
      art: 'visitation',
      line: u(
        '1798. A forest in central Việt Nam, families hiding from persecution — and a visitor in the leaves.',
        'Năm 1798. Một khu rừng ở miền Trung Việt Nam, những gia đình trốn cơn bách hại — và một vị khách giữa tán lá.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'lake-evening',
        text: u(
          'Catholic families fled into the deep forest of La Vang to escape persecution. They were sick, hungry, and afraid. At night they gathered under a great tree to pray the rosary — the only thing they had carried with them.',
          'Các gia đình Công giáo trốn vào rừng sâu La Vang để tránh cơn bách hại. Họ bệnh tật, đói khát và sợ hãi. Đêm đêm họ tụ dưới một tán cây lớn để lần chuỗi Mân Côi — điều duy nhất họ kịp mang theo.',
        ),
      },
      {
        id: 'c2',
        art: 'visitation',
        text: u(
          'There, the story tells, a Lady appeared in the branches, radiant, holding a child, with words of comfort: she had heard their prayers; she taught them to boil the leaves around them for medicine; she promised her protection in that place.',
          'Tại đó, câu chuyện kể, một Bà đẹp rạng ngời hiện ra giữa tán cây, tay bồng một hài nhi, với những lời an ủi: Bà đã nghe lời họ khẩn cầu; Bà chỉ cho họ nấu lá cây quanh đó làm thuốc; Bà hứa chở che họ ở chốn ấy.',
        ),
      },
      {
        id: 'c3',
        art: 'cathedral-hanoi',
        text: u(
          'La Vang became Việt Nam’s great shrine of Mary. Millions make pilgrimage there. Notice the pattern of the story: she came not to the comfortable, but to the hunted, and she came while they prayed the prayer you now know how to pray.',
          'La Vang trở thành trung tâm hành hương Đức Mẹ lớn nhất của Việt Nam. Hàng triệu người tuôn về đó. Hãy để ý nét đẹp của câu chuyện: Mẹ không đến với người an nhàn, mà đến với những người bị săn đuổi — và Mẹ đến đang lúc họ đọc lời kinh mà giờ đây bạn đã biết nguyện.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What were the families doing when the Lady came?', 'Các gia đình đang làm gì khi Đức Bà hiện đến?'),
        options: [
          { text: u('Praying the rosary together', 'Cùng nhau lần chuỗi Mân Côi') },
          { text: u('Building a church', 'Xây một nhà thờ') },
        ],
        answer: 0,
        why: u(
          'The rosary in your bag is the same prayer that filled that forest. It has been Việt Nam’s prayer in the dark for centuries.',
          'Chuỗi Mân Côi trong túi bạn chính là lời kinh đã vang trong khu rừng ấy. Bao thế kỷ qua, đó là lời kinh của Việt Nam trong đêm tối.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('One Hail Mary for Việt Nam', 'Một Kinh Kính Mừng cho Việt Nam'),
      note: u(
        'Tonight, pray one Hail Mary for your homeland and your family — the prayer of La Vang, prayed by a daughter of Việt Nam. Đức Mẹ La Vang, cầu cho chúng con.',
        'Tối nay, hãy đọc một Kinh Kính Mừng cho quê hương và gia đình bạn — lời kinh của La Vang, được một người con gái Việt Nam dâng lên. Đức Mẹ La Vang, cầu cho chúng con.',
      ),
    },
    reflection: u('Where would you want her to find you?', 'Bạn muốn Mẹ tìm thấy bạn ở nơi nào?'),
  },

  // ── 3: A Mother Among the Martyrs ──────────────────────────────────────
  {
    id: 'asia-3',
    title: u('A Mother Among the Martyrs', 'Một người mẹ giữa các thánh tử đạo'),
    minutes: 4,
    door: {
      art: 'asia-lanterns',
      line: u(
        'Anê Lê Thị Thành: grandmother, mother of six, and the first Vietnamese woman named a saint.',
        'Anê Lê Thị Thành: một người bà, người mẹ của sáu đứa con, và người phụ nữ Việt Nam đầu tiên được tuyên thánh.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'incense-altar',
        text: u(
          'She was no missionary and no nun — a farmer’s wife from Phát Diệm, known for raising her children well and for hiding hunted priests in her home. In 1841, at around sixty years old, she was arrested for it.',
          'Bà không phải nhà truyền giáo, cũng không phải nữ tu — chỉ là vợ một nông dân ở Phát Diệm, nổi tiếng vì nuôi dạy con cái tốt và vì giấu các linh mục bị truy lùng trong nhà mình. Năm 1841, khi đã khoảng sáu mươi tuổi, bà bị bắt vì điều đó.',
        ),
      },
      {
        id: 'c2',
        art: 'martyrs-palm',
        text: u(
          'In prison she was beaten until her clothes were soaked with blood. When her daughter visited and wept at the sight, her mother smiled and said words Việt Nam has never forgotten: “Don’t cry, child. I am wearing the roses the Lord has sent me.”',
          'Trong ngục, bà bị đánh đến áo đẫm máu. Khi con gái vào thăm và bật khóc, người mẹ mỉm cười nói những lời mà Việt Nam không bao giờ quên: “Con đừng khóc. Mẹ đang mặc áo hoa hồng Chúa gửi cho mẹ đấy.”',
        ),
      },
      {
        id: 'c3',
        art: 'heaven-light',
        text: u(
          'She died in prison in 1844, still praying. Her path to holiness was cooking, raising children, opening her door — and one final act of courage. Holiness, it turns out, can look exactly like a Vietnamese mother.',
          'Bà qua đời trong ngục năm 1844, miệng vẫn còn cầu nguyện. Con đường nên thánh của bà là nấu ăn, nuôi con, mở cửa nhà mình — và một hành vi can đảm sau cùng. Hóa ra, sự thánh thiện có thể mang đúng dáng hình một người mẹ Việt Nam.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What did she call the blood on her clothes?', 'Bà gọi những vết máu trên áo mình là gì?'),
        options: [
          { text: u('Roses the Lord had sent her', 'Áo hoa hồng Chúa gửi cho bà') },
          { text: u('A debt to be repaid', 'Một món nợ phải đòi') },
        ],
        answer: 0,
        why: u(
          'A mother comforting her child, even from inside her own suffering. That is the fourth commandment and the eighth beatitude in one sentence.',
          'Một người mẹ an ủi con mình, ngay từ trong chính nỗi đau của bà. Đó là điều răn thứ tư và mối phúc thứ tám trong cùng một câu nói.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('A name for the journey', 'Một cái tên cho hành trình'),
      note: u(
        'If you are still wondering about a confirmation name — here is a Vietnamese mother, a saint of the ordinary, who hid the hunted and comforted her daughter from a prison floor. Anê. It would suit a brave traveler.',
        'Nếu bạn vẫn đang phân vân về tên thánh Thêm sức — đây là một người mẹ Việt Nam, vị thánh của đời thường, người đã che giấu kẻ bị săn đuổi và an ủi con gái mình từ nền nhà ngục. Anê. Cái tên ấy rất hợp với một lữ khách can đảm.',
      ),
    },
    reflection: u('Who is the holiest ordinary person you know?', 'Người bình thường thánh thiện nhất bạn biết là ai?'),
  },
];
