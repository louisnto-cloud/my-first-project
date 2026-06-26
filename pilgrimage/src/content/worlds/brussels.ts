import type { L, Lesson } from '../types';

// ─── World 4 · Brussels · "The Sacraments" ──────────────────────────────────
// The Cathedral of St. Michael and St. Gudula. Theme: visible signs of
// invisible grace — with baptism front and center, because it is her horizon.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const BRUSSELS_LESSONS: Lesson[] = [
  // ── 1: Visible Signs ───────────────────────────────────────────────────
  {
    id: 'brussels-1',
    title: u('Visible Signs', 'Những dấu chỉ hữu hình'),
    minutes: 4,
    door: {
      art: 'brussels-cathedral',
      line: u(
        'Brussels. A cathedral of white stone, and a question: how does God touch a life?',
        'Brussels. Một nhà thờ chính tòa bằng đá trắng, và một câu hỏi: Thiên Chúa chạm vào một đời người bằng cách nào?',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'brussels-cathedral',
        text: u(
          'God could have stayed invisible. Instead, he keeps reaching us through things we can touch: water, oil, bread, a hand on a head, two rings.',
          'Thiên Chúa có thể đã ở lại trong vô hình. Nhưng Ngài luôn chạm đến chúng ta qua những điều có thể chạm vào: nước, dầu, bánh, một bàn tay đặt trên đầu, hai chiếc nhẫn.',
        ),
      },
      {
        id: 'c2',
        art: 'font-water',
        text: u(
          'The Church calls these meetings a {{sacrament}}: a visible sign through which God truly gives invisible {{grace}}. Not a symbol of something absent — a handshake from someone present.',
          'Giáo hội gọi những cuộc gặp gỡ ấy là {{sacrament}}: dấu chỉ hữu hình mà qua đó Thiên Chúa thật sự ban {{grace}} vô hình. Không phải biểu tượng của điều vắng mặt — mà là cái nắm tay của Đấng đang hiện diện.',
        ),
        terms: ['sacrament', 'grace'],
      },
      {
        id: 'c3',
        art: 'liturgical-wheel',
        text: u(
          'There are seven, and they cover a whole human life: birth (Baptism), growth (Confirmation), food (Eucharist), healing of the soul (Reconciliation), healing of the body (Anointing), vocation (Holy Orders and Matrimony).',
          'Có bảy Bí tích, ôm trọn cả một đời người: sinh ra (Rửa tội), lớn lên (Thêm sức), của ăn (Thánh Thể), chữa lành tâm hồn (Hòa giải), chữa lành thân xác (Xức dầu), ơn gọi (Truyền chức thánh và Hôn phối).',
        ),
      },
      {
        id: 'c4',
        art: 'font-water',
        text: u(
          'In the next days you will meet each one. Two of them are already printed on your calendar: the font before your wedding, and the rings at it.',
          'Những ngày tới bạn sẽ gặp từng Bí tích một. Hai trong số đó đã in sẵn trên tờ lịch của bạn: giếng Rửa tội trước lễ cưới, và đôi nhẫn trong lễ cưới.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What is a sacrament?', 'Bí tích là gì?'),
        options: [
          { text: u('A reminder of something far away', 'Một vật kỷ niệm về điều gì đó xa xôi') },
          { text: u('A visible sign through which God truly gives grace', 'Dấu chỉ hữu hình mà qua đó Thiên Chúa thật sự ban ơn') },
        ],
        answer: 1,
        why: u(
          'The key word is “truly.” Something real happens — not just a ceremony about something real.',
          'Từ then chốt là “thật sự.” Một điều có thật xảy ra — không chỉ là một nghi lễ nói về điều có thật.',
        ),
      },
      {
        id: 'q2',
        kind: 'match',
        prompt: u('Match the sign to its sacrament.', 'Ghép mỗi dấu chỉ với Bí tích của nó.'),
        pairs: [
          { symbol: 'symbol-water', label: u('Water', 'Nước'), meaning: u('Baptism — new life', 'Rửa tội — sự sống mới') },
          { symbol: 'symbol-bread', label: u('Bread', 'Bánh'), meaning: u('Eucharist — the food', 'Thánh Thể — của ăn') },
          { symbol: 'symbol-light', label: u('Fire', 'Lửa'), meaning: u('Confirmation — the Spirit’s strength', 'Thêm sức — sức mạnh Thánh Thần') },
          { symbol: 'symbol-cross', label: u('The Cross', 'Thánh giá'), meaning: u('Where all their power comes from', 'Nguồn sức mạnh của mọi Bí tích') },
        ],
      },
    ],
    treasure: {
      kind: 'word',
      termId: 'sacrament',
      note: u(
        'Seven doors, and behind each one, the same person. You already stood in front of the first door — it is shaped like a font.',
        'Bảy cánh cửa, và sau mỗi cánh cửa là cùng một Đấng. Bạn đã đứng trước cánh cửa đầu tiên rồi — nó mang hình một giếng nước.',
      ),
    },
    reflection: u('Which of the seven do you most want to understand?', 'Trong bảy Bí tích, bạn muốn hiểu Bí tích nào nhất?'),
    deeper: {
      ccc: [1131],
      note: u('On what sacraments are.', 'Về bản chất các Bí tích.'),
    },
  },

  // ── 2: The Water That Waits ────────────────────────────────────────────
  {
    id: 'brussels-2',
    title: u('The Water That Waits', 'Dòng nước đang đợi'),
    minutes: 5,
    door: {
      art: 'font-water',
      line: u(
        'Baptism, part one. This is your sacrament — the one on your horizon.',
        'Rửa tội, phần một. Đây là Bí tích của bạn — Bí tích đang ở phía chân trời của bạn.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'font-water',
        text: u(
          'Water has been carrying God’s story from the first page: the deep at creation, the sea that opened for the slaves walking free, the Jordan river where Jesus himself was baptized.',
          'Nước đã mang câu chuyện của Thiên Chúa từ trang đầu tiên: vực sâu thuở tạo dựng, biển rẽ đôi cho đoàn nô lệ bước ra tự do, sông Giođan nơi chính Chúa Giêsu chịu phép rửa.',
        ),
      },
      {
        id: 'c2',
        art: 'font-water',
        text: u(
          'What happens at the font is simple to watch: water is poured over your head three times, with the words “I baptize you in the name of the Father, and of the Son, and of the Holy Spirit.” Your first prayer, made into a doorway.',
          'Điều diễn ra nơi giếng rửa tội rất đơn sơ để nhìn: nước được đổ trên đầu bạn ba lần, cùng với lời đọc “Cha rửa con, nhân danh Cha, và Con, và Thánh Thần.” Lời kinh đầu tiên của bạn, trở thành một cánh cửa.',
        ),
      },
      {
        id: 'c3',
        art: 'tomb-morning',
        text: u(
          'What happens beneath the surface is the whole Gospel: you go into the water with everything old, and rise with Christ’s own risen life. The Church says it plainly: every sin of your past life — washed. All of it. Gone.',
          'Điều diễn ra bên dưới bề mặt là trọn cả Tin Mừng: bạn bước vào dòng nước cùng với tất cả những gì cũ kỹ, và trỗi dậy với chính sự sống phục sinh của Chúa Kitô. Giáo hội nói thẳng: mọi tội của đời trước — được rửa sạch. Tất cả. Không còn nữa.',
        ),
        scripture: {
          ref: 'Romans 6:4',
          verse: u(
            'We were buried with him through baptism, so that, as Christ was raised from the dead, we too might walk in newness of life.',
            'Nhờ phép rửa, chúng ta được mai táng với Người, để như Chúa Kitô đã sống lại từ cõi chết, chúng ta cũng được bước đi trong đời sống mới.',
          ),
          plain: u(
            'The font is a small tomb and a small womb at once. You will come out of it newborn — God’s daughter, by adoption so real it changes what you are.',
            'Giếng rửa tội vừa là một ngôi mộ nhỏ, vừa là một cung lòng. Bạn sẽ bước ra như người mới sinh — con gái của Thiên Chúa, bởi một sự nhận làm con thật đến mức thay đổi chính con người bạn.',
          ),
        },
      },
      {
        id: 'c4',
        art: 'font-water',
        text: u(
          'Look at a font closely: many are octagonal. Eight sides, for the “eighth day” — the day beyond the week, Easter morning, the start of the new creation. Architecture keeps the theology safe.',
          'Hãy nhìn kỹ một giếng rửa tội: nhiều giếng có tám cạnh. Tám cạnh, cho “ngày thứ tám” — ngày vượt ra ngoài tuần lễ, buổi sáng Phục Sinh, khởi đầu của cuộc tạo dựng mới. Kiến trúc gìn giữ thần học.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 2,
        prompt: u('What does the Church teach baptism does to past sins?', 'Giáo hội dạy Bí tích Rửa tội làm gì với tội lỗi quá khứ?'),
        options: [
          { text: u('They are washed away completely', 'Chúng được rửa sạch hoàn toàn') },
          { text: u('They are filed away for later', 'Chúng được lưu lại để xét sau') },
        ],
        answer: 0,
        why: u(
          'Completely. The Church has insisted on this for two thousand years: the font leaves nothing behind it.',
          'Hoàn toàn. Giáo hội đã khẳng định điều này suốt hai ngàn năm: giếng rửa tội không để sót lại điều gì.',
        ),
      },
      {
        id: 'q2',
        kind: 'fill',
        prompt: u('Complete the words of baptism — you already know them.', 'Hoàn thành lời đọc khi Rửa tội — bạn vốn đã biết những lời này.'),
        before: u('I baptize you in the name of the Father, and of the Son,', 'Cha rửa con, nhân danh Cha, và Con,'),
        after: u('…', '…'),
        options: [
          u('and of the Holy Spirit.', 'và Thánh Thần.'),
          u('and of the Church.', 'và Giáo hội.'),
          u('and of the saints.', 'và Các Thánh.'),
        ],
        answer: 0,
        why: u(
          'The Sign of the Cross — your very first treasure on this road — is the shape of your baptism.',
          'Dấu Thánh Giá — kho báu đầu tiên của bạn trên con đường này — chính là hình dáng của Bí tích Rửa tội bạn sẽ lãnh nhận.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'font-water',
      title: u('The font', 'Giếng Rửa tội'),
      note: u(
        'When you next enter a Catholic church, look for the font near the door — it stands there because everyone in the building came in through it. Soon that will include you.',
        'Lần tới khi bước vào một nhà thờ Công giáo, hãy tìm giếng rửa tội gần cửa — nó đứng đó vì mọi người trong tòa nhà ấy đều đã đi vào qua nó. Chẳng bao lâu nữa sẽ có cả bạn.',
      ),
    },
    reflection: u('What would you want washed away?', 'Bạn muốn điều gì được rửa sạch?'),
    deeper: {
      ccc: [1213, 1227, 1263],
      note: u('On baptism: new birth and the forgiveness of all sin.', 'Về Rửa tội: sự tái sinh và ơn tha mọi tội.'),
    },
  },

  // ── 3: The Garment and the Flame ───────────────────────────────────────
  {
    id: 'brussels-3',
    title: u('The Garment and the Flame', 'Tấm áo và ngọn lửa'),
    minutes: 4,
    door: {
      art: 'white-garment',
      line: u(
        'Baptism, part two: what you will wear, what you will hold, and who will stand beside you.',
        'Rửa tội, phần hai: bạn sẽ mặc gì, cầm gì, và ai sẽ đứng bên bạn.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'white-garment',
        text: u(
          'After the water, you are clothed in white — the garment of the newly born. It says without words: you have put on Christ; the old stains do not exist anymore.',
          'Sau dòng nước, bạn được khoác tấm áo trắng — y phục của người vừa được sinh ra. Tấm áo nói thay lời: bạn đã mặc lấy Chúa Kitô; những vết cũ không còn hiện hữu nữa.',
        ),
      },
      {
        id: 'c2',
        art: 'white-garment',
        text: u(
          'Then a small candle is lit for you — not from a match, but from the great Easter candle, the flame of the Resurrection itself. You will be told: keep this light burning.',
          'Rồi một cây nến nhỏ được thắp cho bạn — không phải từ que diêm, mà từ cây nến Phục Sinh vĩ đại, chính ngọn lửa của sự Sống Lại. Bạn sẽ được dặn: hãy giữ ánh sáng này luôn cháy.',
        ),
      },
      {
        id: 'c3',
        art: 'visitation',
        text: u(
          'Beside you stands your {{godparent}} — a companion who promises to help your faith grow. Choose someone who actually prays, not just someone you owe a favor. This is family by grace.',
          'Bên bạn là {{godparent}} — người đồng hành hứa giúp đức tin bạn lớn lên. Hãy chọn một người thật sự cầu nguyện, chứ không phải người mình nợ một ân tình. Đây là người thân bởi ân sủng.',
        ),
        terms: ['godparent'],
      },
      {
        id: 'c4',
        art: 'candle-single',
        text: u(
          'And one more thing changes, invisibly and forever: baptism marks the soul with a seal that nothing can remove. Whatever happens afterward, heaven never forgets whose you are.',
          'Và một điều nữa thay đổi, vô hình và vĩnh viễn: Rửa tội ghi vào linh hồn một ấn tín không gì xóa được. Dù sau này có ra sao, Thiên đàng không bao giờ quên bạn thuộc về ai.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('Where is the baptismal candle lit from?', 'Cây nến rửa tội được thắp từ đâu?'),
        options: [
          { text: u('The great Easter candle', 'Cây nến Phục Sinh') },
          { text: u('A lighter kept in the sacristy', 'Một chiếc bật lửa trong phòng thánh') },
        ],
        answer: 0,
        why: u(
          'Your flame will be a child of the Resurrection flame. The candles in this app have been practicing with you all along.',
          'Ngọn lửa của bạn sẽ là con của ngọn lửa Phục Sinh. Những ngọn nến trong ứng dụng này vẫn luôn cùng bạn tập dượt cho điều đó.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What does the white garment mean?', 'Tấm áo trắng có nghĩa gì?'),
        options: [
          { text: u('A dress code for ceremonies', 'Quy định trang phục cho nghi lễ') },
          { text: u('You have put on Christ; the old is gone', 'Bạn đã mặc lấy Chúa Kitô; điều cũ đã qua') },
        ],
        answer: 1,
        why: u(
          'Catholics keep the baptismal garment for life. Some are buried with it — the first clothes of the new creation.',
          'Người Công giáo giữ tấm áo rửa tội suốt đời. Có người được an táng cùng tấm áo ấy — y phục đầu tiên của cuộc tạo dựng mới.',
        ),
      },
    ],
    treasure: {
      kind: 'word',
      termId: 'godparent',
      note: u(
        'Something to begin praying about now: who will stand at the font with you? Talk to Father Matthew about it — choosing well is part of the preparation.',
        'Một điều để bắt đầu cầu nguyện ngay từ bây giờ: ai sẽ đứng bên giếng rửa tội cùng bạn? Hãy trao đổi với cha Matthew — chọn người đỡ đầu tốt cũng là một phần của sự chuẩn bị.',
      ),
    },
    reflection: u('Who in your life keeps a real flame lit?', 'Ai trong đời bạn đang giữ một ngọn lửa cháy thật?'),
    deeper: {
      ccc: [1243, 1272],
      note: u('On the garment, the candle, and the indelible seal.', 'Về tấm áo, cây nến, và ấn tín không phai.'),
    },
  },

  // ── 4: Sealed with Fire ────────────────────────────────────────────────
  {
    id: 'brussels-4',
    title: u('Sealed with Fire', 'Được ghi ấn bằng lửa'),
    minutes: 4,
    door: {
      art: 'pentecost-fire',
      line: u(
        'Confirmation and First Communion — likely your own Easter Vigil, all in one night.',
        'Thêm sức và Rước lễ lần đầu — rất có thể trong chính Đêm Vọng Phục Sinh của bạn, tất cả trong một đêm.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'pentecost-fire',
        text: u(
          'Remember Pentecost: fear becoming courage, a flame over each head. Confirmation is that fire, given personally to you. The bishop or priest anoints your forehead with sacred oil: “Be sealed with the gift of the Holy Spirit.”',
          'Hãy nhớ lễ Ngũ Tuần: nỗi sợ hóa thành can đảm, một ngọn lửa trên mỗi mái đầu. Thêm sức chính là ngọn lửa ấy, được trao riêng cho bạn. Giám mục hoặc linh mục xức dầu thánh trên trán bạn: “Hãy lãnh nhận ấn tín ơn Chúa Thánh Thần.”',
        ),
      },
      {
        id: 'c2',
        art: 'oil-hands',
        text: u(
          'Why oil? Athletes were oiled for strength; kings and prophets were anointed for a mission. The word “Christ” itself means The Anointed One. Confirmation oils you for the journey ahead.',
          'Vì sao là dầu? Các lực sĩ xưa được xoa dầu để thêm sức mạnh; các vua và ngôn sứ được xức dầu để lãnh nhận sứ mạng. Chính chữ “Kitô” nghĩa là Đấng được xức dầu. Thêm sức xức dầu cho bạn để đi quãng đường phía trước.',
        ),
      },
      {
        id: 'c3',
        art: 'monstrance',
        text: u(
          'Then, that same night, the table: your First Communion. After months of coming forward with crossed arms, you will open your hands. The waiting will have been part of the gift.',
          'Rồi cũng trong đêm ấy, bàn tiệc: lần Rước lễ đầu tiên của bạn. Sau bao tháng tiến lên với đôi tay khoanh trước ngực, bạn sẽ mở rộng đôi bàn tay. Chính sự chờ đợi cũng là một phần của món quà.',
        ),
      },
      {
        id: 'c4',
        art: 'white-garment',
        text: u(
          'Adults entering the Church usually receive all three sacraments of initiation in one liturgy — Baptism, Confirmation, Eucharist — at the Easter Vigil, the most beautiful Mass of the whole year, in the dark, by candlelight.',
          'Người trưởng thành gia nhập Giáo hội thường lãnh nhận cả ba Bí tích khai tâm trong một phụng vụ — Rửa tội, Thêm sức, Thánh Thể — trong Đêm Vọng Phục Sinh, Thánh lễ đẹp nhất của cả năm, giữa bóng đêm, dưới ánh nến.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What does the word “Christ” mean?', 'Chữ “Kitô” nghĩa là gì?'),
        options: [
          { text: u('The Anointed One', 'Đấng được xức dầu') },
          { text: u('The Teacher', 'Vị Thầy') },
          { text: u('The King of Rome', 'Vua của Rôma') },
        ],
        answer: 0,
        why: u(
          'At confirmation, you are anointed like him, for a mission like his: to love, where you are, with what you have.',
          'Khi Thêm sức, bạn được xức dầu như Ngài, cho một sứ mạng giống của Ngài: yêu thương, tại nơi mình sống, với những gì mình có.',
        ),
      },
      {
        id: 'q2',
        kind: 'order',
        prompt: u('Put the sacraments of one Easter Vigil in order.', 'Sắp xếp các Bí tích trong một Đêm Vọng Phục Sinh theo thứ tự.'),
        items: [
          u('Baptism: the water', 'Rửa tội: dòng nước'),
          u('Confirmation: the oil and the Spirit', 'Thêm sức: dầu thánh và Thánh Thần'),
          u('Eucharist: the table', 'Thánh Thể: bàn tiệc'),
        ],
        why: u(
          'Born, strengthened, fed — in one night. The Church has welcomed adults this way since its first centuries.',
          'Được sinh ra, được thêm sức, được nuôi dưỡng — trong một đêm. Giáo hội đã đón người trưởng thành theo cách này từ những thế kỷ đầu tiên.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('A name to carry', 'Một tên thánh để mang theo'),
      note: u(
        'Many people take a saint’s name at confirmation. Begin wondering about yours. You already know a few: Têrêsa, Cêcilia, Maria — or Anê Lê Thị Thành, the first woman among the Vietnamese Martyrs.',
        'Nhiều người nhận một tên thánh khi Thêm sức. Hãy bắt đầu nghĩ về tên của bạn. Bạn đã biết vài vị: Têrêsa, Cêcilia, Maria — hay Anê Lê Thị Thành, người phụ nữ đầu tiên trong Các Thánh tử đạo Việt Nam.',
      ),
    },
    reflection: u('If courage were given to you as a gift, where would you spend it?', 'Nếu lòng can đảm được trao cho bạn như một món quà, bạn sẽ dùng nó vào đâu?'),
    deeper: {
      ccc: [1285, 1302, 1322],
      note: u('On confirmation and first Eucharist.', 'Về Thêm sức và Rước lễ lần đầu.'),
    },
  },

  // ── 5: The Room of Mercy ───────────────────────────────────────────────
  {
    id: 'brussels-5',
    title: u('The Room of Mercy', 'Căn phòng của lòng thương xót'),
    minutes: 6,
    door: {
      art: 'confession-light',
      line: u(
        'Confession, without fear. A complete walkthrough, so the first time holds no surprises.',
        'Xưng tội, không sợ hãi. Một hướng dẫn trọn vẹn, để lần đầu tiên không còn điều gì bất ngờ.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'prodigal-embrace',
        text: u(
          'Start with what confession is NOT: it is not a courtroom, not an interrogation, not a place where a priest is shocked by you. Priests hear thousands of confessions. Nothing you say will be new to him — and he can never, ever repeat a word of it.',
          'Hãy bắt đầu từ điều mà xưng tội KHÔNG phải: không phải tòa án, không phải cuộc thẩm vấn, không phải nơi linh mục sửng sốt về bạn. Các linh mục nghe hàng ngàn lần xưng tội. Điều bạn nói sẽ không có gì mới với ngài — và ngài tuyệt đối không bao giờ được phép kể lại một lời nào.',
        ),
      },
      {
        id: 'c2',
        art: 'prodigal-embrace',
        text: u(
          'What it IS: the father running down the road, made into a sacrament. Jesus gave his apostles the power to forgive sins in his name, so that mercy would have an address — and a voice you can hear saying: you are forgiven.',
          'Điều mà xưng tội LÀ: người cha chạy ra giữa đường, được làm thành một Bí tích. Chúa Giêsu trao cho các Tông đồ quyền tha tội nhân danh Ngài, để lòng thương xót có một địa chỉ — và một giọng nói bạn nghe được: con đã được tha thứ.',
        ),
      },
      {
        id: 'c3',
        art: 'confession-light',
        text: u(
          'Here is the whole script. You sit or kneel; face to face or behind a screen — your choice. You begin: “Bless me, Father, for I have sinned. This is my first confession.” Then you simply say the things you are sorry for. Plain words. No speech required.',
          'Đây là trọn “kịch bản.” Bạn ngồi hoặc quỳ; đối diện hoặc sau tấm màn — tùy bạn chọn. Bạn bắt đầu: “Thưa cha, xin cha ban phép lành cho con. Đây là lần đầu con xưng tội.” Rồi bạn chỉ cần nói những điều mình hối tiếc. Lời lẽ đơn sơ. Không cần bài diễn văn.',
        ),
      },
      {
        id: 'c4',
        art: 'confession-light',
        text: u(
          'The priest may say a few gentle words, then gives you a small penance — usually a prayer. You pray the Act of Contrition (it is in your chapel now). Then he raises his hand and says the words this room exists for: “I absolve you from your sins, in the name of the Father, and of the Son, and of the Holy Spirit.”',
          'Linh mục có thể nói vài lời nhẹ nhàng, rồi trao cho bạn một việc đền tội nhỏ — thường là một lời kinh. Bạn đọc Kinh Ăn Năn Tội (kinh ấy giờ đã ở trong nhà nguyện của bạn). Rồi ngài giơ tay và đọc những lời mà căn phòng này hiện hữu vì chúng: “Cha tha tội cho con, nhân danh Cha, và Con, và Thánh Thần.”',
        ),
      },
      {
        id: 'c5',
        art: 'sky-flight',
        text: u(
          'People walk out of that room lighter than any landing you have ever felt. Note for your own path: your baptism will wash everything before it — your first confession comes later, as a gift for the road after.',
          'Người ta bước ra khỏi căn phòng ấy nhẹ nhõm hơn bất cứ cú hạ cánh nào bạn từng cảm nhận. Một ghi chú cho hành trình của bạn: Bí tích Rửa tội sẽ rửa sạch mọi sự trước đó — lần xưng tội đầu tiên của bạn đến sau này, như một món quà cho quãng đường tiếp theo.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'order',
        afterCard: 3,
        prompt: u('Put a confession in order.', 'Sắp xếp một lần xưng tội theo thứ tự.'),
        items: [
          u('“Bless me, Father, for I have sinned…”', '“Thưa cha, xin cha ban phép lành cho con…”'),
          u('Say what you are sorry for, simply', 'Nói đơn sơ những điều mình hối tiếc'),
          u('Receive a small penance', 'Nhận một việc đền tội nhỏ'),
          u('Pray the Act of Contrition', 'Đọc Kinh Ăn Năn Tội'),
          u('Hear the words of absolution', 'Nghe lời xá giải'),
        ],
        why: u(
          'Five small steps, and none of them is a trap. The whole shape exists to carry you to the last one.',
          'Năm bước nhỏ, và không bước nào là cạm bẫy. Cả tiến trình hiện hữu chỉ để đưa bạn đến bước cuối cùng.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('Can a priest ever reveal what he heard in confession?', 'Linh mục có bao giờ được tiết lộ điều nghe trong tòa giải tội không?'),
        options: [
          { text: u('Never, for any reason, even at the cost of his life', 'Không bao giờ, vì bất cứ lý do gì, kể cả phải trả giá bằng mạng sống') },
          { text: u('Only to the bishop', 'Chỉ với giám mục') },
        ],
        answer: 0,
        why: u(
          'The seal of confession is absolute. Priests have died rather than break it. Your words are safer there than anywhere on earth.',
          'Ấn tòa giải tội là tuyệt đối. Đã có những linh mục chịu chết chứ không phá vỡ nó. Lời của bạn ở đó an toàn hơn bất cứ nơi nào trên trái đất.',
        ),
      },
    ],
    treasure: {
      kind: 'prayer',
      prayerId: 'act-of-contrition',
      note: u(
        'The prayer of the room of mercy, now in your chapel. In plain words it says three things: I am sorry, I want to change, help me. You could pray that tonight.',
        'Lời kinh của căn phòng thương xót, giờ đã trong nhà nguyện của bạn. Nói đơn giản, kinh ấy thưa ba điều: con xin lỗi, con muốn đổi thay, xin giúp con. Tối nay bạn đã có thể cầu nguyện như vậy.',
      ),
    },
    reflection: u('What would it feel like, to hear “you are forgiven” out loud?', 'Sẽ thế nào, khi nghe thành tiếng câu “con đã được tha thứ”?'),
    deeper: {
      ccc: [1441, 1465, 1467],
      note: u('On confession: mercy, the confessor, and the absolute seal.', 'Về xưng tội: lòng thương xót, cha giải tội, và ấn tòa tuyệt đối.'),
    },
  },

  // ── 6: Oil for the Sick, Hands for the Altar ───────────────────────────
  {
    id: 'brussels-6',
    title: u('Oil for the Sick, Hands for the Altar', 'Dầu cho người bệnh, đôi tay cho bàn thờ'),
    minutes: 4,
    door: {
      art: 'oil-hands',
      line: u(
        'Two sacraments you will mostly witness in others — and should understand for the people you love.',
        'Hai Bí tích bạn sẽ chủ yếu chứng kiến nơi người khác — và nên hiểu, vì những người bạn thương.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'oil-hands',
        text: u(
          'Anointing of the Sick: when someone is seriously ill or near death, a priest anoints their forehead and hands with oil and prays for healing and peace. It is not a death sentence — it is Jesus sitting down at a bedside.',
          'Xức dầu bệnh nhân: khi một người bệnh nặng hoặc gần kề cái chết, linh mục xức dầu trên trán và đôi tay họ, cầu nguyện cho sự chữa lành và bình an. Đó không phải bản án tử — mà là Chúa Giêsu ngồi xuống bên giường bệnh.',
        ),
      },
      {
        id: 'c2',
        art: 'oil-hands',
        text: u(
          'For your family this matters: if someone you love who is Catholic is ever gravely ill, you can call a priest at any hour. It is one of the most beautiful services the Church offers, and it is never too late to ask.',
          'Với gia đình bạn, điều này quan trọng: nếu một người Công giáo bạn thương lâm bệnh nặng, bạn có thể gọi linh mục bất cứ giờ nào. Đó là một trong những việc phục vụ đẹp nhất của Giáo hội, và không bao giờ là quá muộn để xin.',
        ),
      },
      {
        id: 'c3',
        art: 'keys-shepherd',
        text: u(
          'Holy Orders: how a man becomes a deacon, priest, or bishop. The bishop lays hands on his head in silence — the same gesture passed from the apostles, hand to head, for twenty centuries. That chain of hands is how Father Matthew can do what he does.',
          'Truyền chức thánh: cách một người trở thành phó tế, linh mục hay giám mục. Giám mục đặt tay trên đầu người ấy trong thinh lặng — cùng một cử chỉ được truyền từ các Tông đồ, từ tay đến đầu, suốt hai mươi thế kỷ. Chuỗi bàn tay ấy là lý do cha Matthew có thể làm những việc ngài làm.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('When should a family call a priest for Anointing of the Sick?', 'Khi nào gia đình nên mời linh mục đến Xức dầu bệnh nhân?'),
        options: [
          { text: u('Only after death', 'Chỉ sau khi đã qua đời') },
          { text: u('In any serious illness — the sooner the better', 'Khi bệnh nặng — càng sớm càng tốt') },
        ],
        answer: 1,
        why: u(
          'It is a sacrament of the living: strength, peace, and sometimes healing. Do not wait for the last hour.',
          'Đó là Bí tích của người đang sống: sức mạnh, bình an, và đôi khi cả sự chữa lành. Đừng đợi đến giờ phút cuối.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What is the central gesture of ordination?', 'Cử chỉ trung tâm của việc truyền chức là gì?'),
        options: [
          { text: u('The laying on of hands, in silence', 'Việc đặt tay, trong thinh lặng') },
          { text: u('The signing of documents', 'Việc ký các văn kiện') },
        ],
        answer: 0,
        why: u(
          'Hands on a head, going back to the apostles. The quietest moment in the Church is also one of its strongest.',
          'Đôi tay trên một mái đầu, nối về tới các Tông đồ. Khoảnh khắc lặng lẽ nhất của Giáo hội cũng là một trong những khoảnh khắc mạnh mẽ nhất.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'oil-hands',
      title: u('Oil and hands', 'Dầu thánh và đôi tay'),
      note: u(
        'Olive oil, blessed once a year by the bishop at a special Mass, then carried to every parish — including yours. The same bottle of mercy reaches cathedral and village alike.',
        'Dầu ô liu, được giám mục làm phép mỗi năm một lần trong một Thánh lễ đặc biệt, rồi được đưa về mọi giáo xứ — kể cả giáo xứ của bạn. Cùng một bình dầu thương xót đến với nhà thờ chính tòa lẫn làng quê.',
      ),
    },
    reflection: u('Who would you want at your bedside, and why?', 'Bạn muốn ai ở bên giường bệnh của mình, và vì sao?'),
    deeper: {
      ccc: [1499, 1514, 1536],
      note: u('On anointing of the sick and holy orders.', 'Về Xức dầu bệnh nhân và Truyền chức thánh.'),
    },
  },

  // ── 7: The Sacrament You Will Live In ──────────────────────────────────
  {
    id: 'brussels-7',
    title: u('The Sacrament You Will Live In', 'Bí tích bạn sẽ sống trong đó'),
    minutes: 5,
    door: {
      art: 'wedding-rings',
      line: u(
        'Matrimony. The one with your name on it, this October.',
        'Hôn phối. Bí tích mang tên bạn, tháng Mười này.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'cana-jars',
        text: u(
          'Jesus’ first miracle was at a wedding — you walked through it in Bruges. That was not an accident of scheduling. Marriage is where most people will live out most of their faith.',
          'Phép lạ đầu tiên của Chúa Giêsu là tại một tiệc cưới — bạn đã đi qua câu chuyện ấy ở Bruges. Đó không phải sự tình cờ. Hôn nhân là nơi phần lớn con người sống phần lớn đức tin của mình.',
        ),
      },
      {
        id: 'c2',
        art: 'wedding-rings',
        text: u(
          'Here is the surprise: in this sacrament, the priest is only the witness. The ministers are the couple themselves. When you exchange consent — “I take you…” — you give the sacrament to each other.',
          'Đây là điều bất ngờ: trong Bí tích này, linh mục chỉ là người chứng. Thừa tác viên chính là đôi vợ chồng. Khi hai bạn trao lời ưng thuận — “Anh nhận em… Em nhận anh…” — chính hai bạn trao Bí tích cho nhau.',
        ),
      },
      {
        id: 'c3',
        art: 'wedding-rings',
        text: u(
          'What the Church believes about marriage is simple and enormous: free, faithful, total, and open to life — a love shaped like Christ’s own: I am yours, entirely, until death. The rings are round for a reason.',
          'Điều Giáo hội tin về hôn nhân vừa đơn sơ vừa lớn lao: tự do, chung thủy, trọn vẹn, và mở ra cho sự sống — một tình yêu mang hình dáng tình yêu của Chúa Kitô: anh thuộc về em, trọn vẹn, cho đến chết. Những chiếc nhẫn tròn là có lý do.',
        ),
      },
      {
        id: 'c4',
        art: 'wedding-rings',
        text: u(
          'And a quiet promise from this app, the one it has kept from the first card: no one — not the Church, not Father Matthew, not your fiancé — needs your baptism for the wedding to be beautiful. Your yes at the font, like Mary’s, is only worth anything because it is free.',
          'Và một lời hứa lặng lẽ từ ứng dụng này, lời hứa nó đã giữ từ tấm thẻ đầu tiên: không ai — không phải Giáo hội, không phải cha Matthew, không phải vị hôn phu của bạn — cần bạn chịu Rửa tội thì lễ cưới mới đẹp. Tiếng xin vâng của bạn nơi giếng nước, như tiếng xin vâng của Mẹ Maria, chỉ có giá trị vì nó tự do.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('Who gives the sacrament of matrimony?', 'Ai trao Bí tích Hôn phối?'),
        options: [
          { text: u('The priest', 'Linh mục') },
          { text: u('The couple, to each other', 'Đôi vợ chồng, trao cho nhau') },
        ],
        answer: 1,
        why: u(
          'The Church’s most domestic sacrament: it is performed by two people holding hands.',
          'Bí tích gần gũi đời thường nhất của Giáo hội: được cử hành bởi hai con người đang nắm tay nhau.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What four marks shape married love, in the Church’s eyes?', 'Bốn đặc tính nào làm nên tình yêu hôn nhân, theo Giáo hội?'),
        options: [
          { text: u('Free, faithful, total, open to life', 'Tự do, chung thủy, trọn vẹn, mở ra cho sự sống') },
          { text: u('Romantic, wealthy, public, planned', 'Lãng mạn, sung túc, công khai, có kế hoạch') },
        ],
        answer: 0,
        why: u(
          'The same shape as Christ’s love on the cross: freely given, never taken back, holding nothing in reserve, bearing fruit.',
          'Cùng hình dáng với tình yêu của Chúa Kitô trên thập giá: trao đi tự do, không bao giờ rút lại, không giữ lại gì, và sinh hoa trái.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('For the two of you', 'Cho hai bạn'),
      note: u(
        'Sometime before October, sit with your fiancé and tell him one thing this road has changed in you. He bought you the rosary; he has been on this pilgrimage longer than you know.',
        'Trước tháng Mười, hãy ngồi bên vị hôn phu và kể anh ấy nghe một điều con đường này đã thay đổi trong bạn. Anh ấy đã tặng bạn chuỗi Mân Côi; anh ấy đồng hành trên cuộc hành hương này lâu hơn bạn biết.',
      ),
    },
    reflection: u('What do you hope your marriage protects, no matter what?', 'Bạn mong hôn nhân của mình gìn giữ điều gì, dù có chuyện gì xảy ra?'),
    deeper: {
      ccc: [1601, 1623, 1641],
      note: u('On matrimony: the couple as ministers, and the grace of the bond.', 'Về Hôn phối: đôi bạn là thừa tác viên, và ân sủng của dây hôn phối.'),
    },
  },

  // ── Vigil: The Night of Water and Fire ─────────────────────────────────
  {
    id: 'brussels-vigil',
    vigil: true,
    title: u('Vigil: The Night of Water and Fire', 'Canh thức: Đêm của nước và lửa'),
    minutes: 6,
    door: {
      art: 'brussels-cathedral',
      line: u(
        'No questions tonight. A rehearsal, in candlelight, of the night that is coming for you.',
        'Tối nay không có câu hỏi. Một buổi tập dượt, dưới ánh nến, cho đêm trọng đại đang đến với bạn.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'brussels-cathedral',
        text: u(
          'Imagine it now, since soon you will not need to imagine. A church in total darkness, packed full, on the night before Easter. Outside the doors, a fire is kindled.',
          'Hãy hình dung ngay bây giờ, vì chẳng bao lâu nữa bạn sẽ không cần hình dung. Một nhà thờ tối hoàn toàn, chật kín người, trong đêm trước lễ Phục Sinh. Ngoài cửa, một đống lửa được nhóm lên.',
        ),
      },
      {
        id: 'c2',
        art: 'white-garment',
        text: u(
          'The great Easter candle is lit from that fire and carried into the dark. Three times a voice sings: “The Light of Christ.” And from that single flame, candle by candle, hand to hand, the whole church catches light.',
          'Cây nến Phục Sinh được thắp từ ngọn lửa ấy và rước vào bóng tối. Ba lần một giọng hát vang lên: “Ánh sáng Chúa Kitô.” Và từ một ngọn lửa duy nhất ấy, nến nối nến, tay chuyền tay, cả nhà thờ bừng sáng.',
        ),
      },
      {
        id: 'c3',
        art: 'bible-open',
        text: u(
          'Then the stories — the very ones you know: creation, the sea opening, the prophets, the empty tomb. The Church reads its whole memory aloud on this one night, because tonight, someone new is being born into it.',
          'Rồi đến những câu chuyện — chính những câu chuyện bạn đã biết: tạo dựng, biển rẽ đôi, các ngôn sứ, ngôi mộ trống. Giáo hội đọc lớn cả ký ức của mình trong một đêm duy nhất này, vì đêm nay, có một người mới đang được sinh ra trong lòng Giáo hội.',
        ),
      },
      {
        id: 'c4',
        art: 'font-water',
        text: u(
          'Then the font. The water is blessed with the Easter candle plunged into it — fire into water, the Resurrection into the deep. And the catechumens come forward, one by one. One of them, soon, will be you.',
          'Rồi đến giếng nước. Nước được làm phép khi cây nến Phục Sinh được nhúng vào — lửa vào nước, sự Phục Sinh vào vực sâu. Và các dự tòng tiến lên, từng người một. Một trong số họ, chẳng bao lâu nữa, sẽ là bạn.',
        ),
      },
      {
        id: 'c5',
        art: 'pentecost-fire',
        text: u(
          'Water, then oil, then — at last — the open hands at the table. The church will sing. Somewhere in the pews, people you love will be crying the good kind of tears, the kind you once saw and never forgot.',
          'Nước, rồi dầu thánh, rồi — cuối cùng — đôi tay mở rộng nơi bàn tiệc. Cả nhà thờ sẽ hát vang. Đâu đó trên những hàng ghế, những người bạn thương sẽ khóc những giọt nước mắt hạnh phúc — thứ nước mắt bạn từng thấy một lần và không bao giờ quên.',
        ),
      },
      {
        id: 'c6',
        art: 'brussels-cathedral',
        text: u(
          'The fourth stamp is ready. One world remains — and it is not far away at all. It is your own parish, and the road of ordinary days.',
          'Con dấu thứ tư đã sẵn sàng. Còn lại một chặng đường — và nó không hề xa xôi. Đó chính là giáo xứ của bạn, và con đường của những ngày thường.',
        ),
      },
    ],
    questions: [],
    treasure: {
      kind: 'art',
      art: 'white-garment',
      title: u('The garment, waiting', 'Tấm áo đang đợi'),
      note: u(
        'Somewhere, the white garment you will wear already exists — folded on a shelf, or not yet sewn. Either way, it is waiting, the way the whole night is.',
        'Ở đâu đó, tấm áo trắng bạn sẽ mặc đã hiện hữu — đang gấp trên một ngăn kệ, hoặc chưa được may. Dù thế nào, nó vẫn đang đợi, như cả đêm thánh ấy đang đợi.',
      ),
    },
    reflection: u('Picture yourself at the font. What do you feel?', 'Hãy hình dung mình bên giếng Rửa tội. Bạn cảm thấy gì?'),
    deeper: {
      ccc: [1217, 1254],
      note: u('On the Easter Vigil and baptismal grace.', 'Về Đêm Vọng Phục Sinh và ân sủng Rửa tội.'),
    },
  },
];
