import type { L, Lesson } from '../types';

// ─── Bonus world · "The Vatican" ────────────────────────────────────────────
// Unlocked after Paris: the heart of the family she has come to know.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const VATICAN_LESSONS: Lesson[] = [
  // ── 1: The Fisherman's Tomb ────────────────────────────────────────────
  {
    id: 'vatican-1',
    title: u('The Fisherman’s Tomb', 'Ngôi mộ người ngư phủ'),
    minutes: 4,
    door: {
      art: 'st-peters',
      line: u(
        'The largest church on earth stands over the grave of a fisherman who once denied he knew Jesus.',
        'Ngôi nhà thờ lớn nhất trái đất đứng trên phần mộ của một ngư phủ từng chối là mình biết Chúa Giêsu.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'st-peters',
        text: u(
          'Rome, year 64. Peter — the fisherman from the lake, the friend who denied Jesus three times and was forgiven three times — is executed in Nero’s circus and buried in a simple grave on Vatican hill.',
          'Rôma, năm 64. Phêrô — người ngư phủ của hồ xưa, người bạn đã chối Chúa ba lần và được tha thứ ba lần — chịu hành hình trong hý trường của Nêrô và được chôn trong một ngôi mộ đơn sơ trên đồi Vatican.',
        ),
      },
      {
        id: 'c2',
        art: 'st-peters',
        text: u(
          'Christians never forgot the spot. Sixteen centuries of building later, the high altar of St. Peter’s Basilica stands directly above that grave — measured, excavated, and confirmed in the 1940s.',
          'Các Kitô hữu không bao giờ quên vị trí ấy. Mười sáu thế kỷ xây dựng sau đó, bàn thờ chính của Vương cung thánh đường Thánh Phêrô đứng ngay trên ngôi mộ ấy — được đo đạc, khai quật và xác nhận vào thập niên 1940.',
        ),
      },
      {
        id: 'c3',
        art: 'keys-shepherd',
        text: u(
          'That is the whole logic of the place: not a palace built for power, but a basilica built over a friendship that failed and was repaired. The Church’s headquarters is a forgiven man’s grave.',
          'Đó là trọn ý nghĩa của nơi này: không phải cung điện xây cho quyền lực, mà là một vương cung thánh đường xây trên một tình bạn từng đổ vỡ và được hàn gắn. Trung tâm của Giáo hội là ngôi mộ của một người đã được tha thứ.',
        ),
      },
      {
        id: 'c4',
        art: 'st-peters',
        text: u(
          'Bernini’s colonnade reaches out from the basilica like two arms around the square. The architecture is a doctrine you already know: the Father who runs, holding the whole world in an embrace.',
          'Hàng cột của Bernini vươn ra từ thánh đường như hai cánh tay ôm lấy quảng trường. Kiến trúc ấy là một giáo lý bạn đã biết: người Cha chạy ra đón, ôm cả thế giới vào lòng.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 2,
        prompt: u('What lies beneath the high altar of St. Peter’s?', 'Điều gì nằm dưới bàn thờ chính của Đền Thánh Phêrô?'),
        options: [
          { text: u('The grave of Peter the fisherman', 'Phần mộ của ngư phủ Phêrô') },
          { text: u('The treasury of the popes', 'Kho báu của các giáo hoàng') },
        ],
        answer: 0,
        why: u(
          'A forgiven friend’s grave. Remember that whenever the Church looks too grand: at its center is mercy, in the ground.',
          'Ngôi mộ của một người bạn đã được tha thứ. Hãy nhớ điều ấy mỗi khi Giáo hội trông quá nguy nga: ở trung tâm của nó là lòng thương xót, nằm trong lòng đất.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What do Bernini’s colonnades represent?', 'Hàng cột của Bernini tượng trưng điều gì?'),
        options: [
          { text: u('Two arms embracing the world', 'Hai cánh tay ôm lấy thế giới') },
          { text: u('A defensive wall', 'Một bức tường phòng thủ') },
        ],
        answer: 0,
        why: u(
          'Bernini said it himself: the church receives the world “with open arms.” Stone can preach.',
          'Chính Bernini đã nói: thánh đường đón thế giới “bằng vòng tay rộng mở.” Đá cũng biết giảng.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'st-peters',
      title: u('St. Peter’s', 'Đền Thánh Phêrô'),
      note: u(
        'When you eventually fly to Rome — and one day you will — stand in the square at dusk and find the lamps. You will recognize the embrace.',
        'Khi một ngày nào đó bạn bay đến Rôma — và sẽ có ngày ấy — hãy đứng giữa quảng trường lúc hoàng hôn và tìm những ngọn đèn. Bạn sẽ nhận ra vòng tay ấy.',
      ),
    },
    reflection: u('What would you say at the fisherman’s grave?', 'Bạn sẽ nói gì bên ngôi mộ người ngư phủ?'),
    deeper: {
      ccc: [552, 881],
      note: u('On Peter, the rock.', 'Về Phêrô, tảng đá.'),
    },
  },

  // ── 2: The Mother and the Marble ───────────────────────────────────────
  {
    id: 'vatican-2',
    title: u('The Mother and the Marble', 'Người Mẹ và khối cẩm thạch'),
    minutes: 4,
    door: {
      art: 'pieta',
      line: u(
        'Just inside the basilica’s door stands the most tender sculpture ever cut from stone.',
        'Ngay bên trong cửa thánh đường là bức tượng dịu dàng nhất từng được tạc từ đá.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'pieta',
        text: u(
          'Michelangelo was twenty-four when he carved the Pietà: Mary holding the body of her son, taken down from the cross. Her face is impossibly young, impossibly calm.',
          'Michelangelo hai mươi bốn tuổi khi tạc tượng Đức Mẹ Sầu Bi: Mẹ Maria ôm thân xác con mình vừa được hạ xuống khỏi thập giá. Gương mặt Mẹ trẻ đến lạ, bình thản đến lạ.',
        ),
      },
      {
        id: 'c2',
        art: 'pieta',
        text: u(
          'Look at her left hand: open, palm up. Not clenched in protest — offered. The sculpture holds the hardest prayer in the world: the yes of the small room in Nazareth, said again at the foot of the cross.',
          'Hãy nhìn bàn tay trái của Mẹ: mở ra, ngửa lên. Không nắm chặt phản kháng — mà dâng hiến. Bức tượng giữ lấy lời cầu nguyện khó nhất thế gian: tiếng xin vâng của căn phòng nhỏ ở Nadarét, được thưa lại dưới chân thập giá.',
        ),
      },
      {
        id: 'c3',
        art: 'creation-light',
        text: u(
          'Everything you learned in Paris about beauty reaches its peak in this building: Michelangelo’s dome, his ceiling nearby in the Sistine Chapel where God’s finger reaches toward Adam’s. Art this great is not decoration for the faith. It is the faith, thinking out loud.',
          'Mọi điều bạn học ở Paris về cái đẹp đạt tới đỉnh trong tòa nhà này: mái vòm của Michelangelo, và gần đó là trần Nhà nguyện Sistina, nơi ngón tay Thiên Chúa vươn về phía ngón tay Ađam. Nghệ thuật lớn đến thế không phải trang trí cho đức tin. Nó chính là đức tin, đang suy tư thành hình.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What does Mary’s open hand in the Pietà say?', 'Bàn tay mở của Đức Mẹ trong tượng Sầu Bi nói điều gì?'),
        options: [
          { text: u('Her yes, said again in grief', 'Tiếng xin vâng của Mẹ, được thưa lại trong đau thương') },
          { text: u('That the sculptor ran out of time', 'Rằng nhà điêu khắc hết thời gian') },
        ],
        answer: 0,
        why: u(
          'From “let it be done to me” to this open palm — one yes, carried a whole lifetime.',
          'Từ “xin Chúa cứ làm cho tôi” đến bàn tay mở này — một tiếng xin vâng, mang theo trọn một đời.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'pieta',
      title: u('The Pietà', 'Đức Mẹ Sầu Bi'),
      note: u(
        'Michelangelo carved his name on no other work — only this one, on the band across her chest. Even he needed the world to know he had touched this.',
        'Michelangelo không khắc tên mình lên tác phẩm nào khác — chỉ duy bức này, trên dải băng ngang ngực Mẹ. Ngay cả ông cũng cần thế giới biết mình đã chạm vào điều này.',
      ),
    },
    reflection: u('Which sorrow of yours could be held like that?', 'Nỗi đau nào của bạn có thể được ôm lấy như thế?'),
    deeper: {
      ccc: [964],
      note: u('On Mary at the foot of the cross.', 'Về Đức Mẹ dưới chân thập giá.'),
    },
  },

  // ── 3: The Bishop Who Hoped ────────────────────────────────────────────
  {
    id: 'vatican-3',
    title: u('The Bishop Who Hoped', 'Vị giám mục của hy vọng'),
    minutes: 4,
    door: {
      art: 'candle-single',
      line: u(
        'From Sài Gòn to a prison cell to the Vatican: the story of Phanxicô Xaviê Nguyễn Văn Thuận.',
        'Từ Sài Gòn đến phòng biệt giam đến Vatican: câu chuyện Đức cha Phanxicô Xaviê Nguyễn Văn Thuận.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'prayer-night',
        text: u(
          'In 1975, days after being named bishop of Sài Gòn, Nguyễn Văn Thuận was arrested. He spent thirteen years in prison — nine of them in solitary confinement.',
          'Năm 1975, ít ngày sau khi được bổ nhiệm Tổng giám mục phó Sài Gòn, Đức cha Nguyễn Văn Thuận bị bắt. Ngài trải qua mười ba năm tù — chín năm trong biệt giam.',
        ),
      },
      {
        id: 'c2',
        art: 'last-supper',
        text: u(
          'In his cell, he celebrated Mass from memory each day with three drops of smuggled wine in the palm of his hand and a crumb of bread. He wrote messages of hope on scraps of paper that were copied and passed across Việt Nam.',
          'Trong phòng giam, mỗi ngày ngài dâng Thánh lễ thuộc lòng với ba giọt rượu lễ giấu được trong lòng bàn tay và một mẩu bánh nhỏ. Ngài viết những dòng hy vọng trên các mảnh giấy vụn, được chép lại và chuyền tay khắp Việt Nam.',
        ),
      },
      {
        id: 'c3',
        art: 'st-peters',
        text: u(
          'His guards kept being transferred away — because he kept converting them with kindness. Released and exiled, he was called to Rome, made a cardinal, and asked by the Pope to preach to the Vatican itself. He is now on the road to sainthood.',
          'Lính canh của ngài cứ phải thuyên chuyển liên tục — vì ngài cứ cảm hóa họ bằng lòng nhân hậu. Được thả và bị trục xuất, ngài được mời về Rôma, được phong hồng y, và được Đức Giáo hoàng mời giảng tĩnh tâm cho chính giáo triều Vatican. Nay ngài đang trên đường được tuyên thánh.',
        ),
      },
      {
        id: 'c4',
        art: 'candle-single',
        text: u(
          'His secret, he said, was small: “I will not wait. I live the present moment, filling it to the brim with love.” One sentence, from a Vietnamese prison, that you can carry onto any flight.',
          'Bí quyết của ngài, như ngài nói, rất nhỏ bé: “Tôi sẽ không chờ đợi. Tôi sống phút hiện tại, và làm cho nó đầy tràn yêu thương.” Một câu nói, từ một nhà tù Việt Nam, mà bạn có thể mang lên bất cứ chuyến bay nào.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('How did he celebrate Mass in prison?', 'Ngài dâng Thánh lễ trong tù bằng cách nào?'),
        options: [
          { text: u('Three drops of wine in his palm, from memory', 'Ba giọt rượu trong lòng bàn tay, đọc thuộc lòng') },
          { text: u('He waited until release', 'Ngài đợi đến khi được thả') },
        ],
        answer: 0,
        why: u(
          'The Eucharist — the source and summit — fits in the palm of a prisoner’s hand. Nothing about the faith requires a cathedral.',
          'Thánh Thể — nguồn mạch và tột đỉnh — nằm gọn trong lòng bàn tay một tù nhân. Không điều gì của đức tin đòi buộc phải có một nhà thờ lớn.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('The present moment', 'Phút hiện tại'),
      note: u(
        'Once today, when you catch yourself waiting — for boarding, for an answer, for life to start — try his sentence: fill this exact moment to the brim with love. It was tested in a harder place than a departure gate.',
        'Một lần trong hôm nay, khi thấy mình đang chờ đợi — chờ lên máy bay, chờ một câu trả lời, chờ cuộc sống bắt đầu — hãy thử câu nói của ngài: làm cho chính phút này đầy tràn yêu thương. Câu ấy đã được thử lửa ở một nơi khắc nghiệt hơn cửa khởi hành nhiều.',
      ),
    },
    reflection: u('What are you waiting for, that he would tell you to stop waiting for?', 'Bạn đang chờ đợi điều gì mà ngài sẽ khuyên bạn đừng chờ nữa?'),
  },
];
