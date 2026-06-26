import type { ArtKind, L } from './types';

// ─── Walk through the Mass ───────────────────────────────────────────────────
// Every moment of the liturgy, explained as it happens: what is happening,
// what to say, and when to stand, sit, or kneel. This solves her
// "I did not understand anything" problem directly.
//
// Responses follow the current English Roman Missal and common Vietnamese
// usage; both are flagged for native/liturgical review. A gentle note in the
// player reminds her that postures vary a little from country to country.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export type Posture = 'stand' | 'sit' | 'kneel';
export type MassPart = 'intro' | 'word' | 'eucharist' | 'concluding';

export interface MassMoment {
  id: string;
  part: MassPart;
  posture: Posture;
  art: ArtKind;
  title: L;
  /** What is happening, in plain words. */
  what: L;
  /** Optional dialogue: what the priest says, and what you answer. */
  say?: { priest: L; people: L }[];
  /** Why it matters — one warm line. */
  why: L;
}

export const MASS_PARTS: Record<MassPart, L> = {
  intro: u('The Introductory Rites', 'Nghi thức đầu lễ'),
  word: u('The Liturgy of the Word', 'Phụng vụ Lời Chúa'),
  eucharist: u('The Liturgy of the Eucharist', 'Phụng vụ Thánh Thể'),
  concluding: u('The Concluding Rites', 'Nghi thức kết lễ'),
};

export const MASS: MassMoment[] = [
  {
    id: 'entrance',
    part: 'intro',
    posture: 'stand',
    art: 'mass-altar',
    title: u('The Entrance', 'Ca nhập lễ'),
    what: u(
      'Everyone stands and sings as the priest walks to the altar. The song gathers a crowd of strangers into one family.',
      'Mọi người đứng và hát khi linh mục tiến lên bàn thờ. Bài ca quy tụ những người xa lạ thành một gia đình.',
    ),
    why: u(
      'You stand the way you stand when someone you love enters the room.',
      'Bạn đứng dậy như khi một người mình yêu quý bước vào phòng.',
    ),
  },
  {
    id: 'sign-cross',
    part: 'intro',
    posture: 'stand',
    art: 'symbol-cross',
    title: u('The Sign of the Cross', 'Dấu Thánh Giá'),
    what: u(
      'The whole church traces the cross together — the little prayer you learned first, now prayed by hundreds of people at once.',
      'Cả nhà thờ cùng làm Dấu Thánh Giá — lời kinh nhỏ bạn học đầu tiên, giờ được hàng trăm người cùng đọc một lúc.',
    ),
    say: [
      {
        priest: u('The Lord be with you.', 'Chúa ở cùng anh chị em.'),
        people: u('And with your spirit.', 'Và ở cùng cha.'),
      },
    ],
    why: u(
      'This exchange is two thousand years old. You will hear it four times in one Mass.',
      'Lời đối đáp này đã hai ngàn năm tuổi. Bạn sẽ nghe nó bốn lần trong một Thánh lễ.',
    ),
  },
  {
    id: 'penitential',
    part: 'intro',
    posture: 'stand',
    art: 'candle-single',
    title: u('Lord, Have Mercy', 'Kinh Thương Xót'),
    what: u(
      'A quiet moment of honesty: we admit we have not loved perfectly, and ask for mercy — the father running down the road, remember.',
      'Một khoảnh khắc thành thật: chúng ta nhìn nhận mình chưa yêu thương trọn vẹn, và xin lòng thương xót — hãy nhớ người cha chạy ra giữa đường.',
    ),
    say: [
      {
        priest: u('Lord, have mercy.', 'Xin Chúa thương xót chúng con.'),
        people: u('Lord, have mercy.', 'Xin Chúa thương xót chúng con.'),
      },
      {
        priest: u('Christ, have mercy.', 'Xin Chúa Kitô thương xót chúng con.'),
        people: u('Christ, have mercy.', 'Xin Chúa Kitô thương xót chúng con.'),
      },
    ],
    why: u(
      'No pretending is needed here. Everyone in the room says the same words.',
      'Ở đây không cần giả vờ điều gì. Mọi người trong nhà thờ đều nói cùng những lời ấy.',
    ),
  },
  {
    id: 'gloria',
    part: 'intro',
    posture: 'stand',
    art: 'creation-light',
    title: u('The Gloria', 'Kinh Vinh Danh'),
    what: u(
      'An explosion of praise that begins with the angels’ song over Bethlehem: “Glory to God in the highest!” It is sung on Sundays and feasts, and rests during Lent.',
      'Một bài ca chúc tụng bừng lên, mở đầu bằng lời các thiên thần hát trên Bêlem: “Vinh danh Thiên Chúa trên các tầng trời!” Kinh này được hát vào Chúa nhật và lễ trọng, và tạm nghỉ trong Mùa Chay.',
    ),
    why: u(
      'The shepherds heard the first line in a field at night. You get to sing along.',
      'Các mục đồng đã nghe câu đầu tiên giữa cánh đồng đêm. Còn bạn được hát theo.',
    ),
  },
  {
    id: 'first-reading',
    part: 'word',
    posture: 'sit',
    art: 'bible-open',
    title: u('The First Reading', 'Bài đọc một'),
    what: u(
      'Now everyone sits — it is time to listen. A reader proclaims a passage from the Old Testament: the long waiting you walked through in Bruges.',
      'Bây giờ mọi người ngồi xuống — đến lúc lắng nghe. Một người đọc công bố đoạn Cựu Ước: chính sự chờ đợi dài lâu bạn đã đi qua ở Bruges.',
    ),
    say: [
      {
        priest: u('The word of the Lord.', 'Đó là Lời Chúa.'),
        people: u('Thanks be to God.', 'Tạ ơn Chúa.'),
      },
    ],
    why: u(
      'Sitting is the posture of a student — and of someone being told a good story.',
      'Ngồi là tư thế của người học trò — và của người đang được nghe một câu chuyện hay.',
    ),
  },
  {
    id: 'psalm',
    part: 'word',
    posture: 'sit',
    art: 'organ-pipes',
    title: u('The Psalm', 'Thánh vịnh đáp ca'),
    what: u(
      'A cantor sings an ancient prayer-poem, and everyone answers with a repeated line. The psalms are three thousand years old and still know exactly how we feel.',
      'Một ca viên hát một bài thơ-kinh cổ xưa, và mọi người đáp lại bằng một câu lặp. Các thánh vịnh đã ba ngàn năm tuổi mà vẫn hiểu thấu lòng người hôm nay.',
    ),
    why: u(
      'You only need the one response line — it is sung for you first, so just echo it.',
      'Bạn chỉ cần một câu đáp — ca viên hát mẫu trước, bạn chỉ việc lặp lại.',
    ),
  },
  {
    id: 'gospel',
    part: 'word',
    posture: 'stand',
    art: 'bible-open',
    title: u('The Gospel', 'Tin Mừng'),
    what: u(
      'Everyone rises and sings “Alleluia!” — then the priest or deacon reads from the life of Jesus himself. Watch: people trace a small cross on forehead, lips, and heart.',
      'Mọi người đứng lên và hát “Alleluia!” — rồi linh mục hoặc phó tế đọc chính cuộc đời Chúa Giêsu. Hãy để ý: mọi người vẽ dấu thánh giá nhỏ trên trán, môi và ngực.',
    ),
    say: [
      {
        priest: u('A reading from the holy Gospel…', 'Tin Mừng Chúa Giêsu Kitô theo thánh…'),
        people: u('Glory to you, O Lord.', 'Lạy Chúa, vinh danh Chúa.'),
      },
      {
        priest: u('The Gospel of the Lord.', 'Đó là Lời Chúa.'),
        people: u('Praise to you, Lord Jesus Christ.', 'Lạy Chúa Kitô, ngợi khen Chúa.'),
      },
    ],
    why: u(
      'The little crosses mean: may this word be in my mind, on my lips, and in my heart.',
      'Những dấu thánh giá nhỏ ấy nghĩa là: xin Lời này ở trong trí con, trên môi con, và trong tim con.',
    ),
  },
  {
    id: 'homily',
    part: 'word',
    posture: 'sit',
    art: 'teacher-hill',
    title: u('The Homily', 'Bài giảng'),
    what: u(
      'Sit and rest. The priest — your Father Matthew — opens the readings like the stranger on the Emmaus road, connecting them to ordinary life.',
      'Hãy ngồi và lắng nghe. Linh mục — như cha Matthew của bạn — mở nghĩa các bài đọc, như người khách lạ trên đường Emmau, nối Lời Chúa với đời thường.',
    ),
    why: u(
      'No response needed here. Just listen for the one line meant for you.',
      'Phần này không cần thưa đáp. Chỉ cần lắng nghe câu nói dành riêng cho bạn.',
    ),
  },
  {
    id: 'creed',
    part: 'word',
    posture: 'stand',
    art: 'keys-shepherd',
    title: u('The Creed', 'Kinh Tin Kính'),
    what: u(
      'Everyone stands and professes the faith together — the same summary prayed at the start of your rosary. You have walked most of its lines already.',
      'Mọi người đứng và cùng tuyên xưng đức tin — chính bản tóm lược được đọc ở đầu chuỗi Mân Côi của bạn. Bạn đã đi qua hầu hết các dòng kinh ấy rồi.',
    ),
    why: u(
      'Said alone it is a statement. Said by a full church, it is a roll call of the family.',
      'Đọc một mình, đó là một lời tuyên bố. Cả nhà thờ cùng đọc, đó là lời điểm danh của một gia đình.',
    ),
  },
  {
    id: 'intercessions',
    part: 'word',
    posture: 'stand',
    art: 'prayer-night',
    title: u('The Prayers of the Faithful', 'Lời nguyện tín hữu'),
    what: u(
      'The community prays for the world, the Church, the suffering, the dead. After each intention, everyone answers together.',
      'Cộng đoàn cầu cho thế giới, cho Giáo hội, cho người đau khổ, cho người đã qua đời. Sau mỗi ý nguyện, mọi người cùng thưa.',
    ),
    say: [
      {
        priest: u('…let us pray to the Lord.', '…chúng con cầu xin Chúa.'),
        people: u('Lord, hear our prayer.', 'Xin Chúa nhậm lời chúng con.'),
      },
    ],
    why: u(
      'Your old prayer for the safety of your loved ones lives here, said aloud by everyone.',
      'Lời cầu quen thuộc của bạn cho người thân được bình an sống ở đây, được mọi người cùng đọc lớn tiếng.',
    ),
  },
  {
    id: 'offertory',
    part: 'eucharist',
    posture: 'sit',
    art: 'symbol-bread',
    title: u('The Offertory', 'Dâng lễ vật'),
    what: u(
      'Bread and wine are carried to the altar — ordinary things, about to become anything but. A collection may pass; giving is free, never required of a guest.',
      'Bánh và rượu được tiến dâng lên bàn thờ — những điều bình thường, sắp trở nên phi thường. Có thể có quyên góp; việc cho đi là tự nguyện, khách mời không buộc phải góp.',
    ),
    why: u(
      'The four movements are beginning: take, thank, break, give.',
      'Bốn động tác đang bắt đầu: cầm lấy, tạ ơn, bẻ ra, trao đi.',
    ),
  },
  {
    id: 'sanctus',
    part: 'eucharist',
    posture: 'stand',
    art: 'creation-light',
    title: u('Holy, Holy, Holy', 'Kinh Thánh, Thánh, Thánh'),
    what: u(
      'The priest invites: “Lift up your hearts.” Then everyone sings the song the angels sing forever — and the church kneels for what comes next.',
      'Linh mục mời gọi: “Hãy nâng tâm hồn lên.” Rồi mọi người hát bài ca các thiên thần hát đời đời — và cả nhà thờ quỳ xuống cho điều sắp đến.',
    ),
    say: [
      {
        priest: u('Lift up your hearts.', 'Hãy nâng tâm hồn lên.'),
        people: u('We lift them up to the Lord.', 'Chúng con đang hướng về Chúa.'),
      },
    ],
    why: u(
      '“Holy, holy, holy” comes from the prophet Isaiah’s vision of heaven. For one song, the room joins it.',
      '“Thánh, Thánh, Thánh” đến từ thị kiến thiên đàng của ngôn sứ Isaia. Trong một bài hát, cả nhà thờ được hòa vào đó.',
    ),
  },
  {
    id: 'consecration',
    part: 'eucharist',
    posture: 'kneel',
    art: 'mass-altar',
    title: u('The Consecration', 'Truyền phép'),
    what: u(
      'The stillest moment. The priest speaks Jesus’ own words from the Last Supper — “This is my body… this is my blood” — and Catholics believe the bread and wine truly become him. A bell may ring. Kneel, and simply look.',
      'Khoảnh khắc tĩnh lặng nhất. Linh mục đọc chính lời Chúa Giêsu trong Bữa Tiệc Ly — “Này là Mình Thầy… này là Máu Thầy” — và người Công giáo tin bánh rượu thật sự trở nên chính Ngài. Có thể có tiếng chuông. Hãy quỳ, và chỉ cần chiêm ngắm.',
    ),
    why: u(
      'This is why the woman you saw was crying. The upstairs room in Jerusalem is now this altar.',
      'Đây là lý do người phụ nữ bạn thấy đã khóc. Căn phòng trên lầu ở Giêrusalem giờ đây chính là bàn thờ này.',
    ),
  },
  {
    id: 'our-father',
    part: 'eucharist',
    posture: 'stand',
    art: 'teacher-hill',
    title: u('The Our Father', 'Kinh Lạy Cha'),
    what: u(
      'Everyone stands and prays the prayer Jesus taught — the one you know by heart now. In some churches people hold hands; follow what your neighbors do.',
      'Mọi người đứng và đọc lời kinh Chúa Giêsu đã dạy — lời kinh giờ đây bạn đã thuộc lòng. Ở vài nơi mọi người nắm tay nhau; cứ làm theo những người bên cạnh.',
    ),
    why: u(
      'Your first full prayer in this app, now spoken with a whole church. Notice how that feels.',
      'Lời kinh trọn vẹn đầu tiên bạn học trong ứng dụng này, giờ được đọc cùng cả nhà thờ. Hãy cảm nhận khoảnh khắc ấy.',
    ),
  },
  {
    id: 'peace',
    part: 'eucharist',
    posture: 'stand',
    art: 'visitation',
    title: u('The Sign of Peace', 'Chúc bình an'),
    what: u(
      'Everyone turns to their neighbors with a handshake or a bow: “Peace be with you.” In Việt Nam, a small bow is most common.',
      'Mọi người quay sang chào nhau bằng cái bắt tay hoặc cúi đầu: “Bình an của Chúa ở cùng anh chị em.” Ở Việt Nam, cúi chào nhẹ là phổ biến nhất.',
    ),
    say: [
      {
        priest: u('The peace of the Lord be with you always.', 'Bình an của Chúa hằng ở cùng anh chị em.'),
        people: u('And with your spirit.', 'Và ở cùng cha.'),
      },
    ],
    why: u(
      'For ten seconds, strangers bless each other. It is many people’s favorite moment.',
      'Trong mười giây, những người xa lạ chúc lành cho nhau. Đó là khoảnh khắc nhiều người yêu thích nhất.',
    ),
  },
  {
    id: 'communion',
    part: 'eucharist',
    posture: 'kneel',
    art: 'monstrance',
    title: u('Communion', 'Rước lễ'),
    what: u(
      'People process forward to receive the Eucharist. Until your baptism, you stay in your seat or join the line with arms crossed over your chest for a blessing — both are completely normal and welcome.',
      'Mọi người tiến lên rước Thánh Thể. Cho đến ngày được Rửa tội, bạn có thể ngồi tại chỗ, hoặc lên theo hàng và khoanh tay trước ngực để nhận phép lành — cả hai đều hoàn toàn bình thường và được chào đón.',
    ),
    say: [
      {
        priest: u('Behold the Lamb of God…', 'Đây Chiên Thiên Chúa…'),
        people: u(
          'Lord, I am not worthy that you should enter under my roof, but only say the word and my soul shall be healed.',
          'Lạy Chúa, con chẳng đáng Chúa ngự vào nhà con, nhưng xin Chúa phán một lời, thì linh hồn con sẽ lành mạnh.',
        ),
      },
    ],
    why: u(
      'Your empty hands are not a failure — they are an appetite. The day you first receive will mean more because you waited.',
      'Đôi tay chưa được nhận của bạn không phải là thiếu sót — mà là một niềm khao khát. Ngày đầu tiên bạn được rước lễ sẽ càng ý nghĩa vì bạn đã chờ đợi.',
    ),
  },
  {
    id: 'dismissal',
    part: 'concluding',
    posture: 'stand',
    art: 'cathedral-door',
    title: u('The Blessing and Sending', 'Phép lành và sai đi'),
    what: u(
      'The priest blesses everyone with the Sign of the Cross and sends the church out: “Go in peace.” The word “Mass” comes from this sending — missa, sent.',
      'Linh mục ban phép lành với Dấu Thánh Giá và sai cộng đoàn ra đi: “Anh chị em hãy ra về bình an.” Chữ “Misa” đến từ chính việc sai đi này — missa, được sai đi.',
    ),
    say: [
      {
        priest: u('Go forth, the Mass is ended.', 'Lễ xong, chúc anh chị em đi bình an.'),
        people: u('Thanks be to God.', 'Tạ ơn Chúa.'),
      },
    ],
    why: u(
      'The Mass does not really end. It is carried out through the doors — on every flight you work.',
      'Thánh lễ không thật sự kết thúc. Nó được mang qua những cánh cửa — lên cả những chuyến bay bạn phục vụ.',
    ),
  },
];
