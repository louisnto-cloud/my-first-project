import type { L, Lesson } from '../types';

// ─── World 3 · Paris · "The Church" ─────────────────────────────────────────
// Notre-Dame de Paris, where she sat through an organ concert and felt peace.
// Theme: the Church, the Mass, and why Catholics worship the way they do.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const PARIS_LESSONS: Lesson[] = [
  // ── 1: Wind and Fire ───────────────────────────────────────────────────
  {
    id: 'paris-1',
    title: u('Wind and Fire', 'Gió và Lửa'),
    minutes: 4,
    door: {
      art: 'pentecost-fire',
      line: u(
        'Fifty days after Easter, a locked room, and a sound like a storm.',
        'Năm mươi ngày sau Phục Sinh, một căn phòng cài then, và một âm thanh như bão tố.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'pentecost-fire',
        text: u(
          'After the Ascension, the friends wait in Jerusalem as Jesus told them — Mary among them, praying. They are still mostly hiding. Fishermen, tax collectors, ordinary people.',
          'Sau khi Chúa Lên Trời, các môn đệ chờ đợi ở Giêrusalem như lời Ngài dặn — có Mẹ Maria ở giữa họ, cùng cầu nguyện. Họ vẫn còn ẩn mình. Những ngư phủ, người thu thuế, những con người bình thường.',
        ),
      },
      {
        id: 'c2',
        art: 'pentecost-fire',
        text: u(
          'Then, on the feast of Pentecost: a sound like a rushing wind fills the house, and what looks like tongues of fire rests on each of them. The Holy Spirit — God’s own breath — fills them.',
          'Rồi, vào ngày lễ Ngũ Tuần: một âm thanh như gió mạnh ùa vào đầy nhà, và hình lưỡi lửa đậu trên từng người. Chúa Thánh Thần — hơi thở của chính Thiên Chúa — tràn ngập họ.',
        ),
        scripture: {
          ref: 'Acts 2:4',
          verse: u(
            'They were all filled with the Holy Spirit, and began to speak in other languages.',
            'Ai nấy đều được tràn đầy Chúa Thánh Thần, và bắt đầu nói các thứ tiếng khác.',
          ),
          plain: u(
            'The fear burns away. They throw open the doors and start telling the story of Jesus — and pilgrims from every nation hear it, each in their own language.',
            'Nỗi sợ tan biến. Họ mở tung cửa và bắt đầu kể câu chuyện về Chúa Giêsu — và khách hành hương từ mọi dân tộc đều nghe được, mỗi người bằng chính tiếng mẹ đẻ của mình.',
          ),
          bridge: u(
            'Every language at once — like a gate area at a great airport, except this time everyone understands.',
            'Mọi ngôn ngữ cùng lúc — như sảnh chờ một sân bay lớn, chỉ khác là lần này ai cũng hiểu.',
          ),
        },
      },
      {
        id: 'c3',
        art: 'pentecost-fire',
        text: u(
          'That same day, about three thousand people are baptized. The Church is born — not as a building, but as a family lit from within.',
          'Ngay hôm đó, khoảng ba ngàn người được Rửa tội. Giáo hội ra đời — không phải như một tòa nhà, mà như một gia đình được thắp sáng từ bên trong.',
        ),
      },
      {
        id: 'c4',
        art: 'notre-dame',
        text: u(
          'Every church you have ever entered — Hà Nội, Bruges, Notre-Dame — grew from that one room. The fire spread for two thousand years, and one spark of it is reading this sentence.',
          'Mọi ngôi nhà thờ bạn từng bước vào — Hà Nội, Bruges, Nhà thờ Đức Bà — đều lớn lên từ căn phòng ấy. Ngọn lửa lan đi suốt hai ngàn năm, và một tia lửa của nó đang đọc dòng chữ này.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 2,
        prompt: u('What changed in the friends at Pentecost?', 'Điều gì thay đổi nơi các môn đệ trong ngày Ngũ Tuần?'),
        options: [
          { text: u('They became rich and powerful', 'Họ trở nên giàu có và quyền thế') },
          { text: u('Fear became courage; hiding became telling', 'Sợ hãi thành can đảm; ẩn mình thành ra đi loan báo') },
        ],
        answer: 1,
        why: u(
          'The Holy Spirit changes people from the inside. The locked room became a doorway.',
          'Chúa Thánh Thần biến đổi con người từ bên trong. Căn phòng cài then trở thành một cánh cửa mở.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What is the Church, before it is anything else?', 'Trước hết, Giáo hội là gì?'),
        options: [
          { text: u('A collection of beautiful buildings', 'Một bộ sưu tập những tòa nhà đẹp') },
          { text: u('A family lit by the Holy Spirit', 'Một gia đình được Chúa Thánh Thần thắp sáng') },
        ],
        answer: 1,
        why: u(
          'The buildings came later — built to give the family a home. The family came first.',
          'Những tòa nhà đến sau — được xây để gia đình ấy có một mái nhà. Gia đình có trước.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'pentecost-fire',
      title: u('Pentecost', 'Lễ Hiện Xuống'),
      note: u(
        'Painters show a small flame over each head — the same Spirit, personally given to each one. The candle you light each day in this app quietly carries that image.',
        'Các họa sĩ vẽ một ngọn lửa nhỏ trên đầu mỗi người — cùng một Thánh Thần, được trao riêng cho từng người. Ngọn nến bạn thắp mỗi ngày trong ứng dụng này âm thầm mang hình ảnh ấy.',
      ),
    },
    reflection: u('Where have you seen courage replace fear?', 'Bạn đã thấy lòng can đảm thay chỗ nỗi sợ ở đâu?'),
    deeper: {
      ccc: [731, 732],
      note: u('On Pentecost and the gift of the Spirit.', 'Về lễ Ngũ Tuần và ân huệ Chúa Thánh Thần.'),
    },
  },

  // ── 2: One Family, Four Words ──────────────────────────────────────────
  {
    id: 'paris-2',
    title: u('One Family, Four Words', 'Một gia đình, bốn dấu chỉ'),
    minutes: 4,
    door: {
      art: 'notre-dame',
      line: u(
        'One, holy, catholic, apostolic. Four old words, explained over coffee.',
        'Duy nhất, thánh thiện, công giáo, tông truyền. Bốn từ cổ kính, được kể lại như bên tách cà phê.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'notre-dame',
        text: u(
          'The Creed describes the Church with four marks. ONE: a single family across every border. The Mass you attended in Dutch was the same Mass as in Vietnamese — you were never actually a stranger there.',
          'Kinh Tin Kính mô tả Giáo hội bằng bốn dấu chỉ. DUY NHẤT: một gia đình duy nhất vượt mọi biên giới. Thánh lễ tiếng Hà Lan bạn từng dự cũng chính là Thánh lễ tiếng Việt — bạn chưa bao giờ thật sự là người xa lạ ở đó.',
        ),
      },
      {
        id: 'c2',
        art: 'candle-single',
        text: u(
          'HOLY: not because its members are perfect — they are famously not — but because the one who lights it is. A lamp is called bright because of its flame, not its glass.',
          'THÁNH THIỆN: không phải vì các thành viên hoàn hảo — ai cũng biết là không — mà vì Đấng thắp sáng Giáo hội là Đấng Thánh. Ngọn đèn được gọi là sáng nhờ ngọn lửa, không phải nhờ lớp kính.',
        ),
      },
      {
        id: 'c3',
        art: 'creation-world',
        text: u(
          'CATHOLIC: the word simply means {{catholic}} — universal. Vietnamese grandmothers, Belgian students, Brazilian taxi drivers, one table. You have seen this with your own eyes, in four countries.',
          'CÔNG GIÁO: từ này đơn giản nghĩa là {{catholic}} — phổ quát. Các bà cụ Việt Nam, sinh viên Bỉ, tài xế taxi Brazil, cùng một bàn tiệc. Bạn đã thấy điều này tận mắt, ở bốn quốc gia.',
        ),
        terms: ['catholic'],
      },
      {
        id: 'c4',
        art: 'keys-shepherd',
        text: u(
          'APOSTOLIC: the family keeps an unbroken line back to the apostles — the friends from the locked room. Father Matthew was ordained by a bishop, who stands in a chain of hands laid on heads going back to Peter.',
          'TÔNG TRUYỀN: gia đình này giữ một mạch nối không đứt đoạn về tới các Tông đồ — những người bạn trong căn phòng cài then. Cha Matthew được truyền chức bởi một giám mục, người đứng trong chuỗi những bàn tay đặt trên đầu nối dài về tới thánh Phêrô.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('The Church is called holy because…', 'Giáo hội được gọi là thánh thiện vì…'),
        options: [
          { text: u('its members never sin', 'các thành viên không bao giờ phạm lỗi') },
          { text: u('the one who lights it is holy', 'Đấng thắp sáng Giáo hội là Đấng Thánh') },
        ],
        answer: 1,
        why: u(
          'A Church of sinners, holding a holy fire. That is why there is room in it for everyone — including us.',
          'Một Giáo hội gồm những tội nhân, nâng niu một ngọn lửa thánh. Vì thế trong Giáo hội có chỗ cho tất cả — kể cả chúng ta.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What does the word “catholic” actually mean?', 'Từ “công giáo” thật ra nghĩa là gì?'),
        options: [
          { text: u('Universal — for everyone, everywhere', 'Phổ quát — cho mọi người, mọi nơi') },
          { text: u('Ancient — from long ago', 'Cổ xưa — từ thuở xa xưa') },
          { text: u('Roman — from one city', 'Rôma — thuộc về một thành phố') },
        ],
        answer: 0,
        why: u(
          'You have prayed in Dutch, walked in French, grown up in Vietnamese. One word covers all of it: universal.',
          'Bạn đã cầu nguyện bằng tiếng Hà Lan, dạo bước bằng tiếng Pháp, lớn lên bằng tiếng Việt. Một từ ôm trọn tất cả: phổ quát.',
        ),
      },
    ],
    treasure: {
      kind: 'word',
      termId: 'catholic',
      note: u(
        'Now the name on the door of every church you have loved makes sense. It was never a club name. It is an invitation addressed to everyone — including a flight attendant from Hà Nội.',
        'Giờ thì cái tên trên cửa mọi nhà thờ bạn yêu mến đã có nghĩa. Nó chưa bao giờ là tên một hội kín. Nó là lời mời gửi đến mọi người — kể cả một nữ tiếp viên hàng không đến từ Hà Nội.',
      ),
    },
    reflection: u('In which church did you most feel you belonged?', 'Ở ngôi nhà thờ nào bạn cảm thấy mình thuộc về nhất?'),
    deeper: {
      ccc: [811, 866, 867, 868, 869],
      note: u('On the four marks of the Church.', 'Về bốn đặc tính của Giáo hội.'),
    },
  },

  // ── 3: The Shepherds ───────────────────────────────────────────────────
  {
    id: 'paris-3',
    title: u('The Shepherds', 'Các mục tử'),
    minutes: 4,
    door: {
      art: 'keys-shepherd',
      line: u(
        'A Pope in Rome, a bishop in your city, and Father Matthew in your parish. How it fits together.',
        'Một Giáo hoàng ở Rôma, một giám mục ở thành phố bạn, và cha Matthew ở giáo xứ bạn. Mọi sự liên kết với nhau thế nào.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'storm-sea',
        text: u(
          'By the lake one morning, the risen Jesus asked Peter three times: “Do you love me?” — once for each time Peter had denied him. Then he gave him a job: “Feed my sheep.”',
          'Bên bờ hồ một buổi sáng, Chúa Phục Sinh hỏi ông Phêrô ba lần: “Con có yêu mến Thầy không?” — mỗi lần cho một lần Phêrô đã chối Thầy. Rồi Ngài trao cho ông một sứ mạng: “Hãy chăn dắt chiên của Thầy.”',
        ),
      },
      {
        id: 'c2',
        art: 'keys-shepherd',
        text: u(
          'Peter became the first shepherd of the whole flock — the first Pope. Every Pope since is his successor: not a king, but a servant who keeps the family one and keeps the story straight.',
          'Phêrô trở thành mục tử đầu tiên của cả đoàn chiên — vị Giáo hoàng đầu tiên. Mỗi Giáo hoàng kế tiếp là người kế vị ngài: không phải một vị vua, mà một người phục vụ, giữ cho gia đình hợp nhất và giữ cho câu chuyện không sai lạc.',
        ),
      },
      {
        id: 'c3',
        art: 'cathedral-hanoi',
        text: u(
          'Each region has a bishop — a successor of the apostles — whose chair stands in the {{cathedral}}. That is what made St. Joseph’s in Hà Nội a cathedral: your city’s shepherd sits there.',
          'Mỗi giáo phận có một giám mục — người kế vị các Tông đồ — với ngai tòa đặt trong {{cathedral}}. Chính điều đó làm Nhà thờ Lớn Hà Nội thành nhà thờ chính tòa: vị mục tử của thành phố bạn ngự ở đó.',
        ),
        terms: ['cathedral'],
      },
      {
        id: 'c4',
        art: 'teacher-hill',
        text: u(
          'And in each parish, a priest: ordained to teach, to baptize, to forgive sins in Jesus’ name, and to stand at the altar. Father Matthew is not just a kind man guiding you — he carries the family’s two-thousand-year mandate to do exactly that.',
          'Và trong mỗi giáo xứ, một linh mục: được truyền chức để giảng dạy, rửa tội, tha tội nhân danh Chúa Giêsu, và đứng nơi bàn thờ. Cha Matthew không chỉ là một người tốt bụng đang đồng hành với bạn — cha mang sứ mạng hai ngàn năm của gia đình này để làm chính những việc ấy.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What kind of leader is the Pope meant to be?', 'Giáo hoàng được mời gọi trở thành người lãnh đạo như thế nào?'),
        options: [
          { text: u('A servant-shepherd who keeps the family one', 'Một mục tử phục vụ, giữ gia đình hợp nhất') },
          { text: u('An emperor commanding nations', 'Một hoàng đế cai trị các quốc gia') },
        ],
        answer: 0,
        why: u(
          '“Feed my sheep” — the job description has never changed.',
          '“Hãy chăn dắt chiên của Thầy” — bản mô tả công việc chưa từng thay đổi.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('Why is St. Joseph’s in Hà Nội called a cathedral?', 'Vì sao Nhà thờ Lớn Hà Nội được gọi là nhà thờ chính tòa?'),
        options: [
          { text: u('Because it is the biggest building', 'Vì đó là tòa nhà lớn nhất') },
          { text: u('Because the bishop’s chair stands there', 'Vì ngai tòa giám mục đặt ở đó') },
        ],
        answer: 1,
        why: u(
          '“Cathedral” comes from cathedra — the chair. Your home church holds your shepherd’s seat.',
          '“Chính tòa” đến từ cathedra — chiếc ngai. Ngôi nhà thờ quê hương bạn giữ chỗ ngồi của vị mục tử thành phố.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('A prayer for your shepherd', 'Một lời cầu cho vị mục tử của bạn'),
      note: u(
        'Sometime this week, pray one Our Father for Father Matthew. Shepherds carry more than they show, and almost no one prays for them by name.',
        'Trong tuần này, hãy đọc một Kinh Lạy Cha cầu cho cha Matthew. Các mục tử mang nhiều gánh nặng hơn vẻ ngoài, và hầu như không ai cầu nguyện cho các ngài bằng chính tên gọi.',
      ),
    },
    reflection: u('Who shepherds you, when you are honest about it?', 'Thật lòng mà nói, ai đang dẫn dắt bạn?'),
    deeper: {
      ccc: [881, 886, 1564],
      note: u('On the Pope, bishops, and priests.', 'Về Giáo hoàng, giám mục và linh mục.'),
    },
  },

  // ── 4: The Book of Books ───────────────────────────────────────────────
  {
    id: 'paris-4',
    title: u('The Book of Books', 'Cuốn sách của mọi cuốn sách'),
    minutes: 5,
    door: {
      art: 'bible-open',
      line: u(
        'You have been hearing it for weeks without knowing. Time to meet the Bible properly.',
        'Bao tuần qua bạn vẫn nghe Lời ấy mà không hay. Đã đến lúc gặp Kinh Thánh một cách trọn vẹn.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'bible-open',
        text: u(
          'The Bible is not one book. It is a library of 73 books written across more than a thousand years: stories, poems, letters, songs, history, and the four Gospels.',
          'Kinh Thánh không phải một cuốn sách. Đó là một thư viện gồm 73 cuốn, viết trong hơn một ngàn năm: truyện kể, thi ca, thư từ, thánh ca, lịch sử, và bốn sách Tin Mừng.',
        ),
      },
      {
        id: 'c2',
        art: 'prophet-night',
        text: u(
          'It has two great halves. The Old Testament: creation, the promise, the prophets — the long waiting you walked in Bruges. The New Testament: Jesus, and the family he founded.',
          'Kinh Thánh có hai phần lớn. Cựu Ước: tạo dựng, lời hứa, các ngôn sứ — sự chờ đợi dài lâu bạn đã đi qua ở Bruges. Tân Ước: Chúa Giêsu, và gia đình Ngài thiết lập.',
        ),
      },
      {
        id: 'c3',
        art: 'bible-open',
        text: u(
          'At its heart stand the four {{gospel}}s — Matthew, Mark, Luke, John — four portraits of Jesus by four early believers. Every story you met in Bruges lives in them.',
          'Trái tim của Kinh Thánh là bốn sách {{gospel}} — Mátthêu, Máccô, Luca, Gioan — bốn bức chân dung về Chúa Giêsu của bốn tín hữu thời đầu. Mọi câu chuyện bạn gặp ở Bruges đều sống trong đó.',
        ),
        terms: ['gospel'],
      },
      {
        id: 'c4',
        art: 'bible-open',
        text: u(
          'How do Catholics read it? Never alone in spirit: with the Church, who collected these books in the first place. Not every line is a rule or a science claim — there are poems, parables, and songs, each true in its own way.',
          'Người Công giáo đọc Kinh Thánh thế nào? Không bao giờ đơn độc: luôn cùng với Giáo hội, là người đã sưu tập những cuốn sách này từ thuở đầu. Không phải dòng nào cũng là luật lệ hay tuyên bố khoa học — có thi ca, dụ ngôn, thánh ca, mỗi loại chân thật theo cách riêng của nó.',
        ),
      },
      {
        id: 'c5',
        art: 'mass-altar',
        text: u(
          'And the Bible’s natural habitat is the Mass: read aloud, in community, around a table. A reference for the verses in this app sits in every lesson — book, chapter, verse — so you can always find the page yourself.',
          'Và môi trường sống tự nhiên của Kinh Thánh là Thánh lễ: được đọc lớn tiếng, giữa cộng đoàn, quanh một bàn tiệc. Mỗi câu trích trong ứng dụng này đều ghi rõ nguồn — sách, chương, câu — để bạn luôn có thể tự tìm lại trang sách ấy.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 0,
        prompt: u('What is the Bible, really?', 'Kinh Thánh thật ra là gì?'),
        options: [
          { text: u('One book by one author', 'Một cuốn sách của một tác giả') },
          { text: u('A library of 73 books', 'Một thư viện gồm 73 cuốn sách') },
        ],
        answer: 1,
        why: u(
          'A whole library, with God’s story running through every shelf.',
          'Cả một thư viện, với câu chuyện của Thiên Chúa chảy xuyên qua từng kệ sách.',
        ),
      },
      {
        id: 'q2',
        kind: 'order',
        prompt: u('Put the Bible’s great story in order.', 'Sắp xếp dòng chuyện lớn của Kinh Thánh theo thứ tự.'),
        items: [
          u('Creation and the garden', 'Tạo dựng và khu vườn'),
          u('The promise and the prophets', 'Lời hứa và các ngôn sứ'),
          u('Jesus: the Gospels', 'Chúa Giêsu: các sách Tin Mừng'),
          u('The Church: letters and Acts', 'Giáo hội: các thư và sách Công vụ'),
        ],
        why: u(
          'You already know this arc — you have walked it. The Bible is the road map of the road you are on.',
          'Bạn đã biết vòng cung này — vì bạn đã bước đi trên đó. Kinh Thánh là tấm bản đồ của chính con đường bạn đang đi.',
        ),
      },
    ],
    treasure: {
      kind: 'word',
      termId: 'gospel',
      note: u(
        'If you ever want to read one book of the Bible first, the Church would hand you the Gospel of Luke — the storyteller of the Prodigal Son, the Good Samaritan, and Christmas night.',
        'Nếu bạn muốn đọc một cuốn Kinh Thánh đầu tiên, Giáo hội sẽ trao bạn Tin Mừng theo thánh Luca — người kể chuyện Người con hoang đàng, Người Samari nhân hậu, và đêm Giáng Sinh.',
      ),
    },
    reflection: u('Which story from the Bible has stayed with you so far?', 'Câu chuyện Kinh Thánh nào đã ở lại với bạn cho đến giờ?'),
    deeper: {
      ccc: [105, 125, 133],
      note: u('On Scripture, the Gospels, and reading with the Church.', 'Về Kinh Thánh, các sách Tin Mừng, và việc đọc cùng Giáo hội.'),
    },
  },

  // ── 5: The Shape of the Mass ───────────────────────────────────────────
  {
    id: 'paris-5',
    title: u('The Shape of the Mass', 'Hình dáng của Thánh lễ'),
    minutes: 5,
    door: {
      art: 'mass-altar',
      line: u(
        'The Mass you sat through without understanding — about to become a place you know by heart.',
        'Thánh lễ bạn từng dự mà không hiểu gì — sắp trở thành một nơi bạn thuộc nằm lòng.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'mass-altar',
        text: u(
          'Every Mass on earth — Dutch, Vietnamese, French, Latin — has the same shape. Learn the shape once, and no Mass will ever be foreign again.',
          'Mọi Thánh lễ trên trái đất — tiếng Hà Lan, tiếng Việt, tiếng Pháp, tiếng Latinh — đều có cùng một hình dáng. Học hình dáng ấy một lần, và sẽ không Thánh lễ nào còn xa lạ nữa.',
        ),
      },
      {
        id: 'c2',
        art: 'bible-open',
        text: u(
          'Two great halves. First, the {{liturgy}} of the Word: we sit around the family book — readings, a psalm, the Gospel, and the homily. Like the stranger on the Emmaus road, opening the scriptures.',
          'Hai phần lớn. Trước hết, {{liturgy}} Lời Chúa: chúng ta quây quần bên cuốn sách của gia đình — các bài đọc, thánh vịnh, Tin Mừng, và bài giảng. Như người khách lạ trên đường Emmau mở nghĩa Kinh Thánh.',
        ),
        terms: ['liturgy'],
      },
      {
        id: 'c3',
        art: 'last-supper',
        text: u(
          'Then the Liturgy of the Eucharist: the table. Bread and wine, the four movements — take, thank, break, give — and the Last Supper made present again. Emmaus again: they knew him in the breaking of the bread.',
          'Rồi đến Phụng vụ Thánh Thể: bàn tiệc. Bánh và rượu, bốn động tác — cầm lấy, tạ ơn, bẻ ra, trao đi — và Bữa Tiệc Ly hiện diện một lần nữa. Lại là Emmau: họ nhận ra Ngài khi bánh được bẻ ra.',
        ),
      },
      {
        id: 'c4',
        art: 'mass-altar',
        text: u(
          'Standing is greeting and praise. Sitting is listening. Kneeling is wonder. Your body prays along — that is why Mass feels different from a lecture, even when you understand nothing.',
          'Đứng là chào đón và ngợi khen. Ngồi là lắng nghe. Quỳ là cung kính trước mầu nhiệm. Thân thể bạn cũng cầu nguyện — vì thế Thánh lễ khác một buổi diễn thuyết, ngay cả khi bạn chưa hiểu gì.',
        ),
      },
      {
        id: 'c5',
        art: 'cathedral-door',
        text: u(
          'In My Chapel there is now a full walkthrough: every moment, every response, every posture, at your own pace. Walk it once this week — then sit in a real pew and feel the difference.',
          'Trong Nhà nguyện của bạn giờ đã có phần hướng dẫn trọn vẹn: từng khoảnh khắc, từng câu thưa, từng tư thế, theo nhịp riêng của bạn. Hãy đi qua một lần trong tuần này — rồi ngồi vào một hàng ghế nhà thờ thật và cảm nhận sự khác biệt.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'order',
        afterCard: 3,
        prompt: u('Put the Mass’s great parts in order.', 'Sắp xếp các phần chính của Thánh lễ theo thứ tự.'),
        items: [
          u('Gathering: song and the Sign of the Cross', 'Quy tụ: bài ca và Dấu Thánh Giá'),
          u('The Word: readings, Gospel, homily', 'Lời Chúa: các bài đọc, Tin Mừng, bài giảng'),
          u('The Eucharist: the table and communion', 'Thánh Thể: bàn tiệc và rước lễ'),
          u('The Sending: blessing, go in peace', 'Sai đi: phép lành, ra về bình an'),
        ],
        why: u(
          'Gather, listen, eat, go. The same shape as a family dinner — which is exactly what it is.',
          'Quy tụ, lắng nghe, dùng bữa, lên đường. Cùng hình dáng một bữa cơm gia đình — và đúng là như vậy.',
        ),
      },
      {
        id: 'q2',
        kind: 'match',
        prompt: u('Match the posture to its meaning.', 'Ghép mỗi tư thế với ý nghĩa của nó.'),
        pairs: [
          { symbol: 'symbol-light', label: u('Standing', 'Đứng'), meaning: u('Greeting and praise', 'Chào đón và ngợi khen') },
          { symbol: 'symbol-bread', label: u('Sitting', 'Ngồi'), meaning: u('Listening and receiving', 'Lắng nghe và đón nhận') },
          { symbol: 'symbol-cross', label: u('Kneeling', 'Quỳ'), meaning: u('Wonder before the mystery', 'Cung kính trước mầu nhiệm') },
        ],
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('Walk through the Mass', 'Bước theo Thánh lễ'),
      note: u(
        'Your treasure today is a whole experience: open My Chapel → Walk through the Mass. Take five quiet minutes. The next real Mass you attend will feel like returning somewhere, not arriving.',
        'Kho báu hôm nay là cả một trải nghiệm: mở Nhà nguyện → Bước theo Thánh lễ. Dành năm phút yên tĩnh. Thánh lễ thật tiếp theo bạn tham dự sẽ như trở về một nơi quen, chứ không phải lần đầu đặt chân đến.',
      ),
    },
    reflection: u('What do you remember from the Mass in Dutch — honestly?', 'Bạn còn nhớ gì về Thánh lễ tiếng Hà Lan ấy — thật lòng?'),
    deeper: {
      ccc: [1346, 1348],
      note: u('On the fundamental structure of the Mass.', 'Về cấu trúc căn bản của Thánh lễ.'),
    },
  },

  // ── 6: The Bread That Is Him ───────────────────────────────────────────
  {
    id: 'paris-6',
    title: u('The Bread That Is Him', 'Tấm Bánh là chính Ngài'),
    minutes: 5,
    door: {
      art: 'monstrance',
      line: u(
        'The center of everything. Why Catholics genuflect, why the lamp burns red, why she was crying.',
        'Trung tâm của tất cả. Vì sao người Công giáo bái gối, vì sao ngọn đèn chầu đỏ luôn cháy, vì sao người phụ nữ ấy đã khóc.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'loaves-fishes',
        text: u(
          'After feeding the five thousand, Jesus said something that scattered the crowd: “I am the bread of life. Whoever eats this bread will live forever.” Many left him that day. He did not soften the words.',
          'Sau khi cho năm ngàn người ăn no, Chúa Giêsu nói một điều khiến đám đông tản đi: “Ta là bánh trường sinh. Ai ăn bánh này sẽ sống đời đời.” Hôm ấy nhiều người đã bỏ Ngài. Nhưng Ngài không rút lại lời nào.',
        ),
      },
      {
        id: 'c2',
        art: 'last-supper',
        text: u(
          'At the Last Supper he kept the promise: “This is my body.” So Catholics believe plainly: after the consecration, the bread and wine are truly Jesus — his Body and Blood — under the appearance of bread and wine.',
          'Trong Bữa Tiệc Ly, Ngài đã giữ lời: “Đây là Mình Thầy.” Vì thế người Công giáo tin cách đơn sơ: sau khi truyền phép, bánh và rượu thật sự là Chúa Giêsu — Mình và Máu Ngài — dưới hình bánh và hình rượu.',
        ),
      },
      {
        id: 'c3',
        art: 'monstrance',
        text: u(
          'This is why a red lamp burns near the tabernacle in every Catholic church: it means he is here. Why people genuflect toward it. Why the Church calls the {{eucharist}} “the source and summit” of the whole Christian life.',
          'Vì thế một ngọn đèn đỏ luôn cháy gần nhà tạm trong mọi nhà thờ Công giáo: nghĩa là Ngài đang ở đây. Vì thế người ta bái gối hướng về đó. Vì thế Giáo hội gọi {{eucharist}} là “nguồn mạch và tột đỉnh” của cả đời sống Kitô hữu.',
        ),
        terms: ['eucharist'],
      },
      {
        id: 'c4',
        art: 'monstrance',
        text: u(
          'The quiet you felt in those churches was not emptiness. Catholics would tell you, gently: the building was not empty. Someone was home.',
          'Sự tĩnh lặng bạn cảm nhận trong những ngôi nhà thờ ấy không phải là sự trống vắng. Người Công giáo sẽ nói với bạn, thật khẽ: tòa nhà không hề trống. Có một Đấng đang ở nhà.',
        ),
      },
      {
        id: 'c5',
        art: 'candle-single',
        text: u(
          'At the Easter Vigil — God willing, your Easter Vigil — you will receive him for the first time. Everything in this app has quietly been walking toward that moment.',
          'Trong Đêm Vọng Phục Sinh — nếu Chúa muốn, chính Đêm Vọng của bạn — bạn sẽ rước Ngài lần đầu tiên. Mọi điều trong ứng dụng này vẫn âm thầm tiến về khoảnh khắc ấy.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What do Catholics believe the Eucharist is?', 'Người Công giáo tin Thánh Thể là gì?'),
        options: [
          { text: u('A symbol that helps us remember', 'Một biểu tượng giúp chúng ta tưởng nhớ') },
          { text: u('Truly Jesus, under the appearance of bread and wine', 'Thật sự là Chúa Giêsu, dưới hình bánh và hình rượu') },
        ],
        answer: 1,
        why: u(
          '“This is my body.” The Church has never found a reason to believe he exaggerated.',
          '“Đây là Mình Thầy.” Giáo hội chưa bao giờ tìm thấy lý do để nghĩ rằng Ngài nói quá.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What does the red lamp near the tabernacle mean?', 'Ngọn đèn đỏ gần nhà tạm có nghĩa gì?'),
        options: [
          { text: u('The church is open late', 'Nhà thờ mở cửa muộn') },
          { text: u('He is here', 'Ngài đang ở đây') },
        ],
        answer: 1,
        why: u(
          'Look for it in the next church you visit, in any country. You will never see an empty church the same way again.',
          'Hãy tìm ngọn đèn ấy trong nhà thờ tiếp theo bạn ghé thăm, ở bất cứ nước nào. Bạn sẽ không bao giờ nhìn một nhà thờ vắng người như trước nữa.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'monstrance',
      title: u('The monstrance', 'Mặt nhật'),
      note: u(
        'A sunburst of gold built to hold one small white host — the most precious thing the Church owns, displayed for silent prayer called adoration. The design says what words cannot: this is the sun.',
        'Một vầng hào quang bằng vàng được làm ra chỉ để nâng một tấm bánh thánh nhỏ màu trắng — điều quý giá nhất Giáo hội có, được đặt ra cho giờ cầu nguyện thinh lặng gọi là chầu Thánh Thể. Chính kiểu dáng ấy nói điều lời nói không thể: đây là mặt trời.',
      ),
    },
    reflection: u('What would change if he truly is there?', 'Điều gì sẽ thay đổi nếu Ngài thật sự ở đó?'),
    deeper: {
      ccc: [1324, 1374],
      note: u('On the real presence: source and summit.', 'Về sự hiện diện thật: nguồn mạch và tột đỉnh.'),
    },
  },

  // ── 7: Why Beauty? ─────────────────────────────────────────────────────
  {
    id: 'paris-7',
    title: u('Why Beauty?', 'Vì sao là cái đẹp?'),
    minutes: 4,
    door: {
      art: 'organ-pipes',
      line: u(
        'The organ concert that moved you in Notre-Dame was not a detour from faith. It was a door.',
        'Buổi hòa nhạc organ làm bạn xúc động ở Nhà thờ Đức Bà không phải một lối rẽ khỏi đức tin. Nó chính là một cánh cửa.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'organ-pipes',
        text: u(
          'You sat under the towers of Notre-Dame and let the great organ wash over you, and felt peace you could not explain. You are in enormous company. Beauty has been carrying people to God for as long as there have been people.',
          'Bạn đã ngồi dưới những ngọn tháp Nhà thờ Đức Bà, để tiếng đại phong cầm tràn qua mình, và cảm thấy một bình an không giải thích nổi. Bạn không hề đơn độc. Cái đẹp đã dẫn con người đến với Thiên Chúa từ thuở có con người.',
        ),
      },
      {
        id: 'c2',
        art: 'notre-dame',
        text: u(
          'The Church builds beautiful things on purpose. A cathedral is a sermon in stone. A rose window is theology in light. Gregorian chant is prayer that learned to float. None of it is decoration — it is all language.',
          'Giáo hội cố ý xây nên những điều đẹp đẽ. Một nhà thờ chính tòa là một bài giảng bằng đá. Một cửa sổ hoa hồng là thần học bằng ánh sáng. Bình ca Grêgôriô là lời cầu nguyện biết bay. Không gì trong đó là trang trí — tất cả đều là ngôn ngữ.',
        ),
      },
      {
        id: 'c3',
        art: 'organ-pipes',
        text: u(
          'That is why the Dutch Mass could move you while the words meant nothing. The music, the candles, the incense, the silence — they were speaking the part of the language you already knew.',
          'Vì thế Thánh lễ tiếng Hà Lan có thể làm bạn xúc động dù không hiểu lời nào. Âm nhạc, ánh nến, làn hương, sự thinh lặng — chúng nói phần ngôn ngữ mà bạn vốn đã hiểu.',
        ),
      },
      {
        id: 'c4',
        art: 'creation-light',
        text: u(
          'The Church’s teachers say beauty is one of God’s fingerprints: truth and goodness, made visible. If beauty is your doorway, you did not come in a side entrance. You came in the way the cathedral builders intended.',
          'Các bậc thầy của Giáo hội nói cái đẹp là một dấu vân tay của Thiên Chúa: chân lý và sự thiện, trở nên hữu hình. Nếu cái đẹp là cánh cửa của bạn, bạn không hề vào bằng cửa phụ. Bạn vào đúng lối mà những người xây nhà thờ đã mong muốn.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('Why does the Church make beautiful things?', 'Vì sao Giáo hội tạo nên những điều đẹp đẽ?'),
        options: [
          { text: u('To impress visitors', 'Để gây ấn tượng với du khách') },
          { text: u('Because beauty is a language that speaks of God', 'Vì cái đẹp là một ngôn ngữ nói về Thiên Chúa') },
        ],
        answer: 1,
        why: u(
          'A sermon in stone, theology in light, prayer that floats. Beauty is doctrine for the heart.',
          'Bài giảng bằng đá, thần học bằng ánh sáng, lời kinh biết bay. Cái đẹp là giáo lý dành cho trái tim.',
        ),
      },
      {
        id: 'q2',
        kind: 'predict',
        prompt: u(
          'A friend says: “I only feel something in churches because of the architecture.” What would this lesson answer?',
          'Một người bạn nói: “Tôi chỉ thấy xúc động trong nhà thờ vì kiến trúc thôi.” Bài học này sẽ trả lời thế nào?',
        ),
        options: [
          { text: u('“Maybe the architecture is how he is speaking to you.”', '“Có lẽ kiến trúc chính là cách Ngài đang nói với bạn.”') },
          { text: u('“Feelings in churches do not count.”', '“Cảm xúc trong nhà thờ không có giá trị.”') },
        ],
        answer: 0,
        why: u(
          'Doors are still doors, whatever they are made of. What matters is who stands behind them.',
          'Cửa vẫn là cửa, dù làm bằng gì đi nữa. Điều quan trọng là Đấng đứng sau cánh cửa ấy.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'organ-pipes',
      title: u('The great organ', 'Đại phong cầm'),
      note: u(
        'The organ of Notre-Dame has nearly 8,000 pipes and survived the fire of 2019. When it returned at the reopening in 2024, you were among the first generation to hear it again — at your concert.',
        'Đại phong cầm của Nhà thờ Đức Bà có gần 8.000 ống và đã sống sót qua vụ cháy năm 2019. Khi nó vang lên trở lại trong ngày mở cửa năm 2024, bạn thuộc thế hệ đầu tiên được nghe lại — trong chính buổi hòa nhạc của bạn.',
      ),
    },
    reflection: u('Describe the moment in Notre-Dame, in your own words.', 'Hãy tả lại khoảnh khắc ở Nhà thờ Đức Bà, bằng lời của riêng bạn.'),
    deeper: {
      ccc: [1156, 2502],
      note: u('On sacred music and art as ways to God.', 'Về thánh nhạc và nghệ thuật thánh như những nẻo đường đến với Thiên Chúa.'),
    },
  },

  // ── Vigil: The Organ at Notre-Dame ─────────────────────────────────────
  {
    id: 'paris-vigil',
    vigil: true,
    title: u('Vigil: The Organ at Notre-Dame', 'Canh thức: Đại phong cầm Nhà thờ Đức Bà'),
    minutes: 6,
    door: {
      art: 'notre-dame',
      line: u(
        'No questions tonight. Take your seat under the rose window one more time.',
        'Tối nay không có câu hỏi. Hãy ngồi xuống dưới cửa sổ hoa hồng một lần nữa.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'notre-dame',
        text: u(
          'Evening in Paris. The towers of Notre-Dame hold the last light. Inside, the candles are being lit, one by one, like the ones in your chapel.',
          'Chiều buông trên Paris. Hai ngọn tháp Nhà thờ Đức Bà giữ lại chút nắng cuối ngày. Bên trong, những ngọn nến đang được thắp lên, từng ngọn một, như những ngọn nến trong nhà nguyện của bạn.',
        ),
      },
      {
        id: 'c2',
        art: 'organ-pipes',
        text: u(
          'The organ begins — the same thunder and tenderness you heard at your concert. But now you know what the building is for, and the music has words underneath it.',
          'Tiếng đàn cất lên — vẫn sấm vang và dịu dàng như trong buổi hòa nhạc của bạn. Nhưng giờ bạn đã biết tòa nhà này để làm gì, và bên dưới âm nhạc đã có lời.',
        ),
      },
      {
        id: 'c3',
        art: 'pentecost-fire',
        text: u(
          'You have learned where the Church came from: a locked room, a rushing wind, tongues of fire, and three thousand baptisms before sunset.',
          'Bạn đã biết Giáo hội đến từ đâu: một căn phòng cài then, một cơn gió mạnh, những lưỡi lửa, và ba ngàn người được rửa tội trước khi mặt trời lặn.',
        ),
      },
      {
        id: 'c4',
        art: 'keys-shepherd',
        text: u(
          'You have met the shepherds — Peter and his successors, your bishop, your Father Matthew — and the library of books the family has carried across three thousand years.',
          'Bạn đã gặp các mục tử — thánh Phêrô và các đấng kế vị, vị giám mục của bạn, cha Matthew của bạn — và thư viện sách gia đình này đã mang theo suốt ba ngàn năm.',
        ),
      },
      {
        id: 'c5',
        art: 'mass-altar',
        text: u(
          'You know the shape of the Mass now — gather, listen, eat, go — and the secret at its center: the bread that is him, the reason for the red lamp, the reason for the tears.',
          'Bạn đã biết hình dáng của Thánh lễ — quy tụ, lắng nghe, dùng bữa, lên đường — và điều sâu kín ở trung tâm: Tấm Bánh là chính Ngài, lý do của ngọn đèn đỏ, lý do của những giọt nước mắt.',
        ),
      },
      {
        id: 'c6',
        art: 'monstrance',
        text: u(
          'And you know that your doorway — beauty — was never a lesser entrance. The whole cathedral was built for people who come in through wonder.',
          'Và bạn biết rằng cánh cửa của bạn — cái đẹp — chưa bao giờ là lối vào hạng hai. Cả nhà thờ chính tòa này được xây cho những ai bước vào bằng sự ngỡ ngàng.',
        ),
      },
      {
        id: 'c7',
        art: 'notre-dame',
        text: u(
          'The third stamp is ready. The road now turns to Brussels — to the sacraments, and above all to the water that is waiting for you.',
          'Con dấu thứ ba đã sẵn sàng. Con đường giờ hướng về Brussels — về các Bí tích, và trên hết, về dòng nước đang chờ đợi bạn.',
        ),
      },
    ],
    questions: [],
    treasure: {
      kind: 'art',
      art: 'notre-dame',
      title: u('Notre-Dame de Paris', 'Nhà thờ Đức Bà Paris'),
      note: u(
        'Begun in 1163, burned in 2019, reopened in 2024 — and your Hà Nội cathedral is her younger sister, built in her image. The two churches at the ends of your map have always been family.',
        'Khởi công năm 1163, cháy năm 2019, mở cửa lại năm 2024 — và Nhà thờ Lớn Hà Nội của bạn là người em gái, được xây theo hình ảnh của ngôi nhà thờ này. Hai ngôi nhà thờ ở hai đầu tấm bản đồ của bạn vốn luôn là người một nhà.',
      ),
    },
    reflection: u('You came in through beauty. Where has the road brought you so far?', 'Bạn đã bước vào bằng cái đẹp. Đến giờ, con đường đã đưa bạn tới đâu?'),
  },
];
