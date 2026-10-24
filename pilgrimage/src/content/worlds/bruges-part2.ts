import type { L, Lesson } from '../types';

// ─── World 2 · Bruges · lessons 8–14 ────────────────────────────────────────
// The Jesus arc, part two: bread and storms, then the Holy Week arc told
// with great care, the relic of the Holy Blood, and the Vigil.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const BRUGES_LESSONS_2: Lesson[] = [
  // ── 8: Bread on the Hill, Feet on the Sea ──────────────────────────────
  {
    id: 'bruges-8',
    title: u('Bread on the Hill, Feet on the Sea', 'Bánh trên đồi, bước chân trên biển'),
    minutes: 5,
    door: {
      art: 'loaves-fishes',
      line: u(
        'Five thousand hungry people, one boy’s lunch, and a night of high waves.',
        'Năm ngàn người đói, phần ăn trưa của một cậu bé, và một đêm sóng lớn.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'teacher-hill',
        text: u(
          'Crowds follow Jesus everywhere now — the sick, the curious, the hopeful. One evening, far from any town, five thousand of them are hungry, and there is nothing to eat.',
          'Giờ đây đám đông theo Chúa Giêsu khắp nơi — người bệnh, người tò mò, người hy vọng. Một buổi chiều, xa mọi làng mạc, năm ngàn người đói, và chẳng có gì để ăn.',
        ),
      },
      {
        id: 'c2',
        art: 'loaves-fishes',
        text: u(
          'All they can find is one boy’s lunch: five small loaves, two fish. Jesus takes it, gives thanks, breaks the bread — and the baskets keep filling. Everyone eats. Twelve baskets are left over.',
          'Tất cả những gì tìm được là phần ăn của một cậu bé: năm chiếc bánh nhỏ, hai con cá. Chúa Giêsu cầm lấy, tạ ơn, bẻ bánh — và những chiếc giỏ cứ đầy mãi. Mọi người đều được ăn no. Còn dư mười hai giỏ.',
        ),
      },
      {
        id: 'c3',
        art: 'loaves-fishes',
        text: u(
          'Notice the pattern: he takes, gives thanks, breaks, and gives. Hold onto those four movements. You will meet them again at every Mass for the rest of your life.',
          'Hãy để ý trình tự: Ngài cầm lấy, tạ ơn, bẻ ra, và trao đi. Hãy ghi nhớ bốn động tác ấy. Bạn sẽ gặp lại chúng trong mỗi Thánh lễ suốt cả cuộc đời.',
        ),
      },
      {
        id: 'c4',
        art: 'storm-sea',
        text: u(
          'That same night, the friends row across the lake without him. A storm rises. Hours of fighting the waves, going nowhere. Then, through the spray, they see a figure — walking on the sea.',
          'Ngay đêm đó, các môn đệ chèo thuyền qua hồ mà không có Ngài. Bão nổi lên. Hàng giờ vật lộn với sóng, không tiến được. Rồi, qua màn nước tung tóe, họ thấy một bóng người — đang đi trên mặt biển.',
        ),
      },
      {
        id: 'c5',
        art: 'storm-sea',
        text: u('They scream. And the figure speaks.', 'Họ kêu thét lên. Và bóng người ấy cất tiếng.'),
        scripture: {
          ref: 'Matthew 14:27',
          verse: u(
            'Take courage. It is I. Do not be afraid.',
            'Cứ yên tâm, chính Thầy đây, đừng sợ!',
          ),
          plain: u(
            'The storm does not stop right away — but suddenly they are not alone in it. That changes everything before anything changes.',
            'Cơn bão chưa dừng ngay — nhưng bỗng nhiên họ không còn đơn độc giữa bão nữa. Điều đó thay đổi tất cả, trước cả khi điều gì khác thay đổi.',
          ),
          bridge: u(
            'You have flown through storms and told frightened passengers, with a calm voice, that it will be all right. That voice, in the storm, is his specialty.',
            'Bạn đã từng bay qua giông bão và trấn an hành khách bằng một giọng nói bình tĩnh rằng mọi sự sẽ ổn. Giọng nói ấy, giữa cơn bão, chính là điều Ngài làm giỏi nhất.',
          ),
        },
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'order',
        afterCard: 2,
        prompt: u('Put the four movements of the bread in order.', 'Sắp xếp bốn động tác với tấm bánh theo thứ tự.'),
        items: [
          u('He takes the bread', 'Ngài cầm lấy bánh'),
          u('He gives thanks', 'Ngài tạ ơn'),
          u('He breaks it', 'Ngài bẻ ra'),
          u('He gives it away', 'Ngài trao đi'),
        ],
        why: u(
          'Take, thank, break, give. The Mass repeats these exact movements — this hillside was the rehearsal.',
          'Cầm lấy, tạ ơn, bẻ ra, trao đi. Thánh lễ lặp lại đúng những động tác này — sườn đồi ấy là buổi tập dượt.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What did Jesus say to the terrified friends in the boat?', 'Chúa Giêsu nói gì với các môn đệ đang hoảng sợ trên thuyền?'),
        options: [
          { text: u('“Why did you sail without me?”', '“Sao các con ra khơi mà không có Thầy?”') },
          { text: u('“It is I. Do not be afraid.”', '“Chính Thầy đây, đừng sợ!”') },
          { text: u('“Row harder.”', '“Chèo mạnh nữa lên.”') },
        ],
        answer: 1,
        why: u(
          '“Do not be afraid” is the most repeated sentence in the whole Bible. Someone knew we would need to hear it often.',
          '“Đừng sợ” là câu được lặp lại nhiều nhất trong cả Kinh Thánh. Hẳn có Đấng biết chúng ta cần nghe câu ấy thường xuyên.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'loaves-fishes',
      title: u('The loaves and the fish', 'Bánh và cá'),
      note: u(
        'One of the oldest Christian artworks in the world is a simple mosaic of loaves and fish, laid on a church floor at Tabgha by the very lake of this story, sixteen centuries ago.',
        'Một trong những tác phẩm Kitô giáo cổ nhất thế giới là bức khảm đơn sơ hình bánh và cá, đặt trên nền một nhà thờ ở Tabgha, ngay bên bờ hồ của câu chuyện này, từ mười sáu thế kỷ trước.',
      ),
    },
    reflection: u('What storm would you want him to walk into?', 'Bạn muốn Ngài bước vào cơn bão nào của đời mình?'),
    deeper: {
      ccc: [547, 548],
      note: u('On miracles as signs of the kingdom, not magic.', 'Về phép lạ là dấu chỉ của Nước Trời, không phải ma thuật.'),
    },
  },

  // ── 9: The King on a Donkey ────────────────────────────────────────────
  {
    id: 'bruges-9',
    title: u('The King on a Donkey', 'Vị Vua trên lưng lừa'),
    minutes: 4,
    door: {
      art: 'palm-gate',
      line: u(
        'Holy Week begins. The city sings — and the shadow of a cross already falls across the gate.',
        'Tuần Thánh bắt đầu. Cả thành phố hát vang — và bóng của một cây thập giá đã đổ xuống cổng thành.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'palm-gate',
        text: u(
          'Jerusalem, the great feast of Passover. Jesus rides into the city — not on a warhorse, but on a young donkey, the animal of peace.',
          'Giêrusalem, đại lễ Vượt Qua. Chúa Giêsu tiến vào thành — không trên chiến mã, mà trên một con lừa con, loài vật của hòa bình.',
        ),
      },
      {
        id: 'c2',
        art: 'palm-gate',
        text: u(
          'The crowds explode with joy. They tear branches from the palm trees and lay their cloaks on the road like a carpet for a king. “Hosanna!” they sing. “Blessed is he who comes in the name of the Lord!”',
          'Đám đông vỡ òa trong niềm vui. Họ bẻ cành lá vạn tuế, trải áo choàng xuống đường như thảm đón vua. “Hoan hô!” họ hát. “Chúc tụng Đấng nhân danh Chúa mà đến!”',
        ),
      },
      {
        id: 'c3',
        art: 'palm-gate',
        text: u(
          'This is Palm Sunday. Every year, one week before Easter, Catholics around the world hold real palm branches and sing those same words. The Church does not just remember this story — she walks into it.',
          'Đây là Chúa nhật Lễ Lá. Mỗi năm, một tuần trước Phục Sinh, người Công giáo khắp thế giới cầm cành lá thật trên tay và hát chính những lời ấy. Giáo hội không chỉ nhớ lại câu chuyện này — mà bước hẳn vào trong nó.',
        ),
      },
      {
        id: 'c4',
        art: 'lake-evening',
        text: u(
          'But Jesus weeps as he rides. He knows what crowds are. Many voices singing Hosanna today will shout something very different by Friday.',
          'Nhưng Chúa Giêsu đã khóc khi tiến vào. Ngài biết lòng đám đông. Nhiều tiếng hát Hoan hô hôm nay, đến thứ Sáu sẽ gào lên những lời rất khác.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('Why a donkey and not a warhorse?', 'Vì sao là một con lừa mà không phải chiến mã?'),
        options: [
          { text: u('It was all he could afford', 'Vì Ngài không đủ tiền thuê ngựa') },
          { text: u('He came as a king of peace, not of armies', 'Vì Ngài đến như vị vua hòa bình, không phải vua chinh chiến') },
        ],
        answer: 1,
        why: u(
          'The prophets had promised exactly this: your king comes to you humble, riding on a donkey.',
          'Các ngôn sứ đã hứa đúng như vậy: vua của ngươi đến với ngươi cách khiêm hạ, cưỡi trên lưng lừa.',
        ),
      },
      {
        id: 'q2',
        kind: 'predict',
        prompt: u('The whole city is singing his praise. What is coming next?', 'Cả thành đang ca tụng Ngài. Điều gì sẽ đến tiếp theo?'),
        options: [
          { text: u('A coronation in the palace', 'Một lễ đăng quang trong cung điện') },
          { text: u('The hardest week in the world’s story', 'Tuần lễ khốc liệt nhất trong lịch sử thế giới') },
        ],
        answer: 1,
        why: u(
          'Between the palms and the cross lie only five days. The Church calls them Holy Week, and we will walk them slowly.',
          'Giữa cành lá và thập giá chỉ có năm ngày. Giáo hội gọi đó là Tuần Thánh, và chúng ta sẽ đi qua từng ngày thật chậm.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'palm-gate',
      title: u('The entry into Jerusalem', 'Tiến vào Giêrusalem'),
      note: u(
        'In Giotto’s famous fresco of this scene, children climb the trees to see him. Look for the palms in any Catholic home — many keep them folded behind a cross all year.',
        'Trong bức bích họa nổi tiếng của Giotto về cảnh này, trẻ em trèo lên cây để nhìn Ngài. Hãy để ý những cành lá trong các gia đình Công giáo — nhiều nhà gài lá sau thánh giá suốt cả năm.',
      ),
    },
    reflection: u('When has a crowd swept you along — for good or not?', 'Có khi nào đám đông cuốn bạn đi — theo hướng tốt hay không tốt?'),
    deeper: {
      ccc: [559, 560],
      note: u('On the messianic entrance into Jerusalem.', 'Về cuộc tiến vào Giêrusalem của Đấng Mêsia.'),
    },
  },

  // ── 10: The Last Supper ────────────────────────────────────────────────
  {
    id: 'bruges-10',
    title: u('The Last Supper', 'Bữa Tiệc Ly'),
    minutes: 5,
    door: {
      art: 'last-supper',
      line: u(
        'Thursday night. An upstairs room, twelve friends, and a gift that will outlast the world.',
        'Đêm thứ Năm. Một căn phòng trên lầu, mười hai người bạn, và một món quà sẽ tồn tại lâu hơn cả thế giới.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'last-supper',
        text: u(
          'Jesus knows it is his last evening. He gathers his closest friends for the Passover meal — the ancient supper remembering the night God freed Israel from slavery.',
          'Chúa Giêsu biết đây là buổi tối cuối cùng của mình. Ngài quy tụ những người bạn thân nhất cho bữa tiệc Vượt Qua — bữa ăn cổ xưa tưởng nhớ đêm Thiên Chúa giải thoát Israel khỏi kiếp nô lệ.',
        ),
      },
      {
        id: 'c2',
        art: 'last-supper',
        text: u(
          'First, he does something shocking: he kneels and washes their feet — the job of the lowest servant. “I have given you an example,” he says. “Love one another as I have loved you.”',
          'Trước hết, Ngài làm một điều gây sửng sốt: Ngài quỳ xuống rửa chân cho họ — việc của người đầy tớ thấp nhất. “Thầy đã nêu gương cho các con,” Ngài nói. “Các con hãy yêu thương nhau như Thầy đã yêu thương các con.”',
        ),
      },
      {
        id: 'c3',
        art: 'last-supper',
        text: u('Then he takes the bread. Takes, gives thanks, breaks, gives — the four movements from the hillside.', 'Rồi Ngài cầm lấy bánh. Cầm lấy, tạ ơn, bẻ ra, trao đi — bốn động tác từ sườn đồi năm xưa.'),
        scripture: {
          ref: 'Luke 22:19–20',
          verse: u(
            '“This is my body, given for you. Do this in memory of me.” And with the cup: “This is my blood, poured out for you.”',
            '“Đây là Mình Thầy, hiến dâng vì các con. Các con hãy làm việc này mà nhớ đến Thầy.” Và với chén rượu: “Đây là Máu Thầy, đổ ra cho các con.”',
          ),
          plain: u(
            'Not “this represents.” He says: this IS. Catholics have taken him at his word for two thousand years. This gift is the {{eucharist}} — and tomorrow, on the cross, he will keep the promise these words make tonight.',
            'Không phải “cái này tượng trưng.” Ngài nói: đây LÀ. Hai ngàn năm qua, người Công giáo tin đúng theo lời Ngài. Món quà này là {{eucharist}} — và ngày mai, trên thập giá, Ngài sẽ giữ trọn lời hứa mà những lời này nói ra đêm nay.',
          ),
        },
        terms: ['eucharist'],
      },
      {
        id: 'c4',
        art: 'last-supper',
        text: u(
          '“Do this in memory of me.” That one sentence built every Mass ever celebrated — including the Dutch one that moved you before you understood a word, and every Mass in Vietnamese tonight in Hà Nội.',
          '“Hãy làm việc này mà nhớ đến Thầy.” Một câu nói ấy đã dựng nên mọi Thánh lễ từng được cử hành — kể cả Thánh lễ tiếng Hà Lan từng làm bạn xúc động khi chưa hiểu một lời, và mọi Thánh lễ tiếng Việt đêm nay ở Hà Nội.',
        ),
      },
      {
        id: 'c5',
        art: 'gethsemane',
        text: u(
          'They sing a hymn and walk out into the night, toward an olive garden called Gethsemane. One of the twelve has already slipped away, carrying thirty silver coins’ worth of betrayal.',
          'Họ hát một bài thánh ca rồi bước ra màn đêm, hướng về khu vườn ô liu tên là Ghếtsêmani. Một người trong nhóm mười hai đã lẻn đi từ trước, mang theo sự phản bội đáng giá ba mươi đồng bạc.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'tapArt',
        afterCard: 3,
        prompt: u('Look closer at the table.', 'Hãy nhìn gần hơn bàn tiệc.'),
        art: 'last-supper',
        hotspots: [
          {
            x: 50,
            y: 50,
            label: u('The cup', 'Chén rượu'),
            meaning: u('Lifted at the center: “This is my blood.” At Mass, this moment is the holiest point of the week.', 'Được nâng lên ở trung tâm: “Đây là Máu Thầy.” Trong Thánh lễ, đây là khoảnh khắc thánh thiêng nhất của cả tuần.'),
          },
          {
            x: 30,
            y: 64,
            label: u('The bread', 'Tấm bánh'),
            meaning: u('Broken to be shared. The early Christians called the whole Mass simply “the breaking of the bread.”', 'Được bẻ ra để chia sẻ. Các Kitô hữu đầu tiên gọi cả Thánh lễ đơn giản là “lễ bẻ bánh.”'),
          },
          {
            x: 50,
            y: 25,
            label: u('The window', 'Ô cửa sổ'),
            meaning: u('Night outside. Everything that happens next happens in darkness — which makes this lamplit table glow brighter.', 'Bên ngoài là đêm. Mọi điều xảy ra tiếp theo đều diễn ra trong bóng tối — càng làm bàn tiệc thắp đèn này sáng hơn.'),
          },
        ],
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What did Jesus say over the bread?', 'Chúa Giêsu nói gì trên tấm bánh?'),
        options: [
          { text: u('“This is a symbol of my body”', '“Đây là biểu tượng của Mình Thầy”') },
          { text: u('“This is my body, given for you”', '“Đây là Mình Thầy, hiến dâng vì các con”') },
        ],
        answer: 1,
        why: u(
          'The plain word “is” carries the whole Catholic faith in the Eucharist. We will spend a whole world (Paris) on what it means.',
          'Chữ “là” đơn sơ ấy mang trọn niềm tin Công giáo về Thánh Thể. Chúng ta sẽ dành cả một chặng đường (Paris) để hiểu ý nghĩa của nó.',
        ),
      },
    ],
    treasure: {
      kind: 'word',
      termId: 'eucharist',
      note: u(
        'The word means “thanksgiving.” You now know where it was born: at a table, among friends, the night before the cross.',
        'Từ này có nghĩa là “tạ ơn.” Giờ bạn đã biết nó sinh ra ở đâu: nơi một bàn tiệc, giữa những người bạn, đêm trước thập giá.',
      ),
    },
    reflection: u('Whose feet would you find hardest to wash?', 'Bạn thấy khó nhất khi phải rửa chân cho ai?'),
    deeper: {
      ccc: [1337, 1339, 1340],
      note: u('On the institution of the Eucharist.', 'Về việc Chúa Giêsu thiết lập Bí tích Thánh Thể.'),
    },
  },

  // ── 11: The Garden and the Cross ───────────────────────────────────────
  {
    id: 'bruges-11',
    title: u('The Garden and the Cross', 'Khu vườn và Thánh giá'),
    minutes: 6,
    door: {
      art: 'gethsemane',
      line: u(
        'The hardest part of the story. Walk it slowly. He walked it for you.',
        'Phần khó nhất của câu chuyện. Hãy đi thật chậm. Ngài đã đi quãng đường này vì bạn.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'gethsemane',
        text: u(
          'In the olive garden, Jesus is afraid. Truly afraid — he sweats, he trembles, he asks his Father if there is any other way. Remember this when you are afraid: he knows the feeling from inside.',
          'Trong vườn ô liu, Chúa Giêsu sợ hãi. Sợ thật sự — Ngài đổ mồ hôi, run rẩy, và hỏi Cha xem có con đường nào khác không. Hãy nhớ điều này khi bạn sợ hãi: Ngài biết cảm giác ấy từ bên trong.',
        ),
      },
      {
        id: 'c2',
        art: 'gethsemane',
        text: u(
          'Then he prays the bravest prayer there is: “Father, not my will, but yours be done.” Mary’s yes, spoken again in the dark. Torches appear among the trees. The betrayer greets him with a kiss.',
          'Rồi Ngài thưa lời cầu nguyện can đảm nhất: “Lạy Cha, xin đừng theo ý con, mà xin theo ý Cha.” Tiếng xin vâng của Mẹ Maria, được thốt lên lần nữa trong bóng tối. Đuốc sáng xuất hiện giữa rặng cây. Kẻ phản bội chào Ngài bằng một nụ hôn.',
        ),
      },
      {
        id: 'c3',
        art: 'cross-passion',
        text: u(
          'The night collapses quickly: a rushed trial, false witnesses, an exhausted governor washing his hands. The crowd that sang Hosanna is given a choice — and shouts for a criminal to go free instead of him.',
          'Đêm ấy sụp đổ rất nhanh: một phiên xử vội vã, những nhân chứng giả, một quan tổng trấn mệt mỏi rửa tay chối bỏ trách nhiệm. Đám đông từng hát Hoan hô được trao quyền chọn — và đã gào lên đòi tha một tên tội phạm thay vì Ngài.',
        ),
      },
      {
        id: 'c4',
        art: 'cross-passion',
        text: u(
          'They beat him, crown him with thorns, and make him carry his own cross up a hill called Golgotha. There, at noon, they nail him to it. He is thirty-three years old.',
          'Họ đánh đòn Ngài, đội vòng gai lên đầu Ngài, và bắt Ngài vác chính thập giá của mình lên ngọn đồi tên Gôngôtha. Tại đó, giữa trưa, họ đóng đinh Ngài vào thập giá. Ngài ba mươi ba tuổi.',
        ),
      },
      {
        id: 'c5',
        art: 'cross-passion',
        text: u('And from the cross, while they mock him, he speaks.', 'Và từ trên thập giá, giữa những lời nhạo báng, Ngài cất tiếng.'),
        scripture: {
          ref: 'Luke 23:34',
          verse: u(
            'Father, forgive them. They do not know what they are doing.',
            'Lạy Cha, xin tha cho họ, vì họ không biết việc họ làm.',
          ),
          plain: u(
            'His first words from the cross are mercy for the people killing him. This is the Father who runs — running even here.',
            'Những lời đầu tiên của Ngài trên thập giá là lòng thương xót dành cho chính những kẻ đang giết Ngài. Đây là người cha chạy ra đón — vẫn đang chạy, ngay cả ở đây.',
          ),
        },
      },
      {
        id: 'c6',
        art: 'cross-passion',
        text: u(
          'At three in the afternoon, he cries out: “It is finished.” And he gives up his spirit. The sky darkens. A Roman soldier — a foreigner, an executioner — is the one who says it aloud: truly, this man was the Son of God.',
          'Ba giờ chiều, Ngài kêu lớn: “Mọi sự đã hoàn tất.” Và Ngài trao phó linh hồn. Bầu trời tối sầm. Một người lính Rôma — kẻ ngoại bang, kẻ hành hình — lại là người nói lớn điều ấy: quả thật, người này là Con Thiên Chúa.',
        ),
      },
      {
        id: 'c7',
        art: 'cross-dawn',
        text: u(
          'Why did he do it? The Church’s answer is one sentence: there is no greater love than to lay down your life for those you love. The tree of the garden broke the world. This tree begins to mend it.',
          'Vì sao Ngài làm vậy? Câu trả lời của Giáo hội gói trong một câu: không có tình yêu nào lớn hơn tình yêu của người hiến mạng sống vì người mình yêu. Cái cây trong khu vườn xưa làm thế giới đổ vỡ. Cây thập giá này bắt đầu chữa lành nó.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 4,
        prompt: u('What were Jesus’ first words from the cross?', 'Lời đầu tiên của Chúa Giêsu trên thập giá là gì?'),
        options: [
          { text: u('“Father, forgive them”', '“Lạy Cha, xin tha cho họ”') },
          { text: u('“Why have you done this?”', '“Sao các ngươi làm điều này?”') },
          { text: u('“You will regret this”', '“Các ngươi sẽ phải hối hận”') },
        ],
        answer: 0,
        why: u(
          'Forgiveness, before anything else. The cross is mercy at full strength.',
          'Tha thứ, trước mọi điều khác. Thập giá là lòng thương xót ở mức trọn vẹn nhất.',
        ),
      },
      {
        id: 'q2',
        kind: 'fill',
        prompt: u('The hardest line of the Our Father belongs to this day. Complete it.', 'Câu khó nhất của Kinh Lạy Cha thuộc về ngày này. Hãy hoàn thành.'),
        before: u('And forgive us our trespasses, as we', 'Và tha nợ chúng con, như chúng con cũng'),
        after: u('…', '…'),
        options: [
          u('forgive those who trespass against us.', 'tha kẻ có nợ chúng con.'),
          u('forget those who hurt us.', 'quên những ai làm tổn thương mình.'),
          u('avoid those who trespass against us.', 'tránh xa kẻ có lỗi với chúng con.'),
        ],
        answer: 0,
        why: u(
          'He did not just teach the line. On Friday afternoon, he showed what it costs — and that it is possible.',
          'Ngài không chỉ dạy câu kinh ấy. Chiều thứ Sáu hôm đó, Ngài cho thấy cái giá của nó — và cho thấy nó là điều có thể.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('For the hard days', 'Cho những ngày khó khăn'),
      note: u(
        'A prayer of five words, for turbulence of any kind: “Father, into your hands.” It is the last thing Jesus said. It fits in one breath, at 38,000 feet or anywhere.',
        'Một lời nguyện năm chữ, cho mọi loại giông bão: “Lạy Cha, trong tay Cha.” Đó là lời sau cùng của Chúa Giêsu. Vừa vặn trong một hơi thở, ở độ cao 11.000 mét hay bất cứ đâu.',
      ),
    },
    reflection: u('Stay with one image from this day. Which one?', 'Hãy ở lại với một hình ảnh của ngày này. Hình ảnh nào?'),
    deeper: {
      ccc: [612, 616, 617],
      note: u('On the agony, and the love that gave the cross its power.', 'Về cơn hấp hối, và tình yêu làm nên sức mạnh của thập giá.'),
    },
  },

  // ── 12: The Silence and the Morning ────────────────────────────────────
  {
    id: 'bruges-12',
    title: u('The Silence and the Morning', 'Sự thinh lặng và buổi sáng'),
    minutes: 5,
    door: {
      art: 'tomb-morning',
      line: u(
        'Saturday: the longest silence in history. And then, before sunrise on the third day —',
        'Thứ Bảy: sự thinh lặng dài nhất lịch sử. Và rồi, trước bình minh ngày thứ ba —',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'prayer-night',
        text: u(
          'They take his body down and lay it in a borrowed tomb, sealed with a great stone. Then comes Saturday. Nothing happens. God is silent. The friends hide behind locked doors, hollowed out by grief.',
          'Người ta hạ xác Ngài xuống, đặt trong một ngôi mộ mượn, chặn lại bằng tảng đá lớn. Rồi đến thứ Bảy. Không gì xảy ra. Thiên Chúa thinh lặng. Các môn đệ trốn sau những cánh cửa cài then, lòng rỗng hoác vì đau buồn.',
        ),
      },
      {
        id: 'c2',
        art: 'prayer-night',
        text: u(
          'The Church keeps this silence every year on Holy Saturday. No Mass, bare altars. Because everyone, sooner or later, lives a Saturday: the day after the worst day, when heaven seems empty. The story honors that day instead of skipping it.',
          'Mỗi năm, Giáo hội giữ sự thinh lặng này vào Thứ Bảy Tuần Thánh. Không Thánh lễ, bàn thờ trống trơn. Vì ai rồi cũng có một ngày thứ Bảy như thế: ngày sau ngày tồi tệ nhất, khi trời cao dường như trống rỗng. Câu chuyện trân trọng ngày ấy thay vì bỏ qua nó.',
        ),
      },
      {
        id: 'c3',
        art: 'tomb-morning',
        text: u(
          'Sunday, before dawn. Women come to the tomb with burial spices — Mary Magdalene first. She finds the great stone rolled away, and the tomb empty, and the cloth folded.',
          'Chúa nhật, trước rạng đông. Các phụ nữ mang dầu thơm ra mộ — bà Maria Mácđala đi đầu. Bà thấy tảng đá lớn đã lăn sang một bên, ngôi mộ trống không, và khăn liệm được xếp gọn.',
        ),
      },
      {
        id: 'c4',
        art: 'tomb-morning',
        text: u(
          'She stands weeping in the garden, and a man she takes for the gardener asks why. Then he says one word: “Mary.” And she knows the voice.',
          'Bà đứng khóc trong khu vườn, và một người bà ngỡ là người làm vườn hỏi vì sao bà khóc. Rồi người ấy gọi một tiếng: “Maria.” Và bà nhận ra giọng nói ấy.',
        ),
        scripture: {
          ref: 'John 20:16',
          verse: u(
            'Jesus said to her, “Mary.” She turned and cried out, “Teacher!”',
            'Chúa Giêsu gọi bà: “Maria.” Bà quay lại và reo lên: “Lạy Thầy!”',
          ),
          plain: u(
            'Risen from death — not a ghost, not a memory, but alive, with a voice that says your name. This is the {{resurrection}}: the hinge on which all Christian hope turns.',
            'Sống lại từ cõi chết — không phải bóng ma, không phải ký ức, mà là Đấng đang sống, với giọng nói gọi đúng tên bạn. Đây là {{resurrection}}: bản lề mà mọi niềm hy vọng Kitô giáo xoay quanh.',
          ),
        },
        terms: ['resurrection'],
      },
      {
        id: 'c5',
        art: 'tomb-morning',
        text: u(
          'This morning is why churches face the sunrise, why Sunday is the Christian day, why the woman you saw crying at Mass can cry with hope. Death does not get the last word. He does.',
          'Buổi sáng này là lý do các nhà thờ hướng về phía mặt trời mọc, lý do Chúa nhật là ngày của Kitô hữu, lý do người phụ nữ bạn thấy khóc trong Thánh lễ có thể khóc trong hy vọng. Sự chết không có tiếng nói cuối cùng. Ngài mới có.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'order',
        afterCard: 3,
        prompt: u('Put the three sacred days in order.', 'Sắp xếp ba ngày thánh theo thứ tự.'),
        items: [
          u('Friday: the cross', 'Thứ Sáu: thập giá'),
          u('Saturday: the silence', 'Thứ Bảy: sự thinh lặng'),
          u('Sunday: the empty tomb', 'Chúa nhật: ngôi mộ trống'),
        ],
        why: u(
          'Cross, silence, morning. The Church calls these the Triduum — the three days at the heart of everything.',
          'Thập giá, thinh lặng, buổi sáng. Giáo hội gọi đó là Tam Nhật Thánh — ba ngày ở trung tâm của tất cả.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('How did Mary Magdalene recognize the risen Jesus?', 'Bà Maria Mácđala nhận ra Chúa Phục Sinh bằng cách nào?'),
        options: [
          { text: u('He said her name', 'Ngài gọi tên bà') },
          { text: u('He showed identification', 'Ngài đưa giấy tờ chứng minh') },
          { text: u('She saw the angels first', 'Bà thấy các thiên thần trước') },
        ],
        answer: 0,
        why: u(
          'One name, spoken with love. The risen Lord still introduces himself this way — personally.',
          'Một cái tên, được gọi bằng tình yêu. Chúa Phục Sinh đến nay vẫn tỏ mình theo cách ấy — với từng người một.',
        ),
      },
    ],
    treasure: {
      kind: 'prayer',
      prayerId: 'glory-be',
      note: u(
        'The Church’s shortest shout of joy, born from this morning. Pray it when something good and undeserved happens — a safe landing, a sunrise from the jump seat.',
        'Tiếng reo vui ngắn nhất của Giáo hội, sinh ra từ buổi sáng này. Hãy đọc kinh ấy khi một điều tốt lành bất ngờ xảy đến — một chuyến hạ cánh an toàn, một bình minh nhìn từ ghế tiếp viên.',
      ),
    },
    reflection: u('What would change, if death does not get the last word?', 'Điều gì sẽ thay đổi, nếu sự chết không có tiếng nói cuối cùng?'),
    deeper: {
      ccc: [624, 638, 640],
      note: u('On Holy Saturday and the empty tomb.', 'Về Thứ Bảy Tuần Thánh và ngôi mộ trống.'),
    },
  },

  // ── 13: The Blood of Bruges ────────────────────────────────────────────
  {
    id: 'bruges-13',
    title: u('The Blood of Bruges', 'Máu Thánh Bruges'),
    minutes: 4,
    door: {
      art: 'basilica-bruges',
      line: u(
        'Now you can return to the little basilica — and understand what you touched there.',
        'Giờ bạn có thể trở lại vương cung thánh đường nhỏ ấy — và hiểu điều mình đã chạm đến ở đó.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'basilica-bruges',
        text: u(
          'On a quiet square in Bruges stands the Basilica of the Holy Blood. You walked in by accident, between canals and chocolate shops. Upstairs, in a side chapel, a priest held out a crystal vial.',
          'Trên một quảng trường yên tĩnh ở Bruges là Vương cung thánh đường Máu Thánh. Bạn đã tình cờ bước vào, giữa những con kênh và những tiệm sô-cô-la. Trên lầu, trong một nhà nguyện nhỏ, một linh mục nâng một ống pha lê.',
        ),
      },
      {
        id: 'c2',
        art: 'relic-blood',
        text: u(
          'Inside is a cloth said to hold the blood of Jesus, brought from Jerusalem after the Crusades, honored here for more than eight hundred years. It is a {{relic}} — and now you know whose blood, and what it bought.',
          'Bên trong là tấm vải được tin là thấm Máu Chúa Giêsu, đưa về từ Giêrusalem sau các cuộc Thập tự chinh, được tôn kính tại đây hơn tám trăm năm. Đó là một {{relic}} — và giờ bạn đã biết là máu của ai, và máu ấy đã đổi lấy điều gì.',
        ),
        terms: ['relic'],
      },
      {
        id: 'c3',
        art: 'relic-blood',
        text: u(
          'Why do Catholics keep relics? For the same reason you keep a late grandparent’s ring, or your mother keeps your childhood photos. Love holds onto what belonged to the beloved. It is your family-altar instinct again, written in gold and crystal.',
          'Vì sao người Công giáo gìn giữ thánh tích? Cũng vì lý do bạn giữ chiếc nhẫn của ông bà đã khuất, hay mẹ bạn giữ những tấm ảnh thuở nhỏ của bạn. Tình yêu luôn giữ lại những gì thuộc về người mình yêu. Lại là tấm lòng của bàn thờ gia đình — viết bằng vàng và pha lê.',
        ),
      },
      {
        id: 'c4',
        art: 'relic-blood',
        text: u(
          'You queued, you touched the glass, you felt something you had no words for. The Church would say: that day, grace got there before the explanations. The explanations have now caught up.',
          'Bạn đã xếp hàng, chạm vào mặt kính, và cảm nhận một điều không gọi được thành tên. Giáo hội sẽ nói: hôm ấy, Ơn Chúa đã đến trước những lời giải thích. Giờ thì những lời giải thích đã theo kịp.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 2,
        prompt: u('Why do Catholics honor relics?', 'Vì sao người Công giáo tôn kính thánh tích?'),
        options: [
          { text: u('They are magic objects with powers', 'Vì đó là những vật phép thuật có quyền năng') },
          { text: u('Love keeps what belonged to the beloved', 'Vì tình yêu giữ lại những gì thuộc về người mình yêu') },
        ],
        answer: 1,
        why: u(
          'A relic is honored, never worshiped — like your family’s photographs and incense. The love passes through the object to the person.',
          'Thánh tích được tôn kính, không bao giờ bị thờ phượng — như di ảnh và nén hương của gia đình bạn. Tình yêu đi xuyên qua kỷ vật để đến với con người.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('Whose blood does the Bruges relic honor — and what did it do?', 'Thánh tích ở Bruges tôn kính máu của ai — và máu ấy đã làm gì?'),
        options: [
          { text: u('A king’s blood, which won a war', 'Máu của một vị vua, đã thắng một cuộc chiến') },
          { text: u('Jesus’ blood, poured out in love on the cross', 'Máu Chúa Giêsu, đã đổ ra vì yêu thương trên thập giá') },
        ],
        answer: 1,
        why: u(
          '“This is my blood, poured out for you.” The vial in Bruges points straight back to that Thursday table and that Friday hill.',
          '“Đây là Máu Thầy, đổ ra cho các con.” Ống pha lê ở Bruges chỉ thẳng về bàn tiệc đêm thứ Năm và ngọn đồi chiều thứ Sáu ấy.',
        ),
      },
    ],
    treasure: {
      kind: 'word',
      termId: 'relic',
      note: u(
        'Next time you are in Bruges, you can climb those stairs knowing the whole story — from a garden, through a cross, to a crystal vial that a flight attendant once touched by accident.',
        'Lần tới ở Bruges, bạn có thể bước lên những bậc thang ấy với trọn câu chuyện trong lòng — từ một khu vườn, qua một thập giá, đến ống pha lê mà một nữ tiếp viên hàng không từng tình cờ chạm vào.',
      ),
    },
    reflection: u('What did you feel that day in Bruges, honestly?', 'Hôm ấy ở Bruges, thật lòng bạn đã cảm thấy gì?'),
    deeper: {
      ccc: [1674],
      note: u('On the veneration of relics in Catholic life.', 'Về việc tôn kính thánh tích trong đời sống Công giáo.'),
    },
  },

  // ── Vigil: He Goes Before You ──────────────────────────────────────────
  {
    id: 'bruges-vigil',
    vigil: true,
    title: u('Vigil: He Goes Before You', 'Canh thức: Ngài đi trước bạn'),
    minutes: 6,
    door: {
      art: 'emmaus-road',
      line: u(
        'No questions tonight. Only the road, the stranger who walks it with us, and the second stamp.',
        'Tối nay không có câu hỏi. Chỉ có con đường, người khách lạ cùng đi với chúng ta, và con dấu thứ hai.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'emmaus-road',
        text: u(
          'Easter evening. Two heartbroken friends walk home to a village called Emmaus, talking about everything they lost on Friday. A stranger falls in step beside them.',
          'Chiều ngày Phục Sinh. Hai môn đệ tan nát cõi lòng đi bộ về làng Emmau, vừa đi vừa nói về tất cả những gì họ đã mất hôm thứ Sáu. Một người khách lạ rảo bước đi cùng họ.',
        ),
      },
      {
        id: 'c2',
        art: 'emmaus-road',
        text: u(
          'Mile after mile, the stranger opens the scriptures to them — the garden, the prophets, the promise — showing how the whole story pointed to the cross and through it. Their hearts burn, and they do not know why.',
          'Suốt chặng đường dài, người khách lạ mở Kinh Thánh cho họ — khu vườn, các ngôn sứ, lời hứa — cho thấy cả câu chuyện đều hướng về thập giá và đi xuyên qua nó. Lòng họ bừng cháy, mà không hiểu vì sao.',
        ),
      },
      {
        id: 'c3',
        art: 'last-supper',
        text: u(
          'At their table that evening, the stranger takes the bread, gives thanks, breaks it, gives it. Four movements. Their eyes are opened — it is him — and he vanishes. They run the whole road back in the dark, to tell the others.',
          'Bên bàn ăn tối hôm ấy, người khách lạ cầm lấy bánh, tạ ơn, bẻ ra, trao đi. Bốn động tác. Mắt họ mở ra — chính là Ngài — rồi Ngài biến mất. Họ chạy ngược cả quãng đường trong đêm tối, để báo tin cho các bạn.',
        ),
      },
      {
        id: 'c4',
        art: 'tomb-morning',
        text: u(
          'For forty days he appears: to the fearful friends behind locked doors, to doubting Thomas who needed to touch the wounds, to seven tired fishermen at dawn with breakfast already cooking on the shore.',
          'Suốt bốn mươi ngày, Ngài hiện đến: với các môn đệ sợ hãi sau cửa khóa, với Tôma cứng lòng cần chạm vào các vết thương, với bảy ngư phủ mệt nhoài lúc rạng đông — bữa sáng đã dọn sẵn trên bờ.',
        ),
      },
      {
        id: 'c5',
        art: 'ascension',
        text: u(
          'Then, on a hilltop, he blesses them and is lifted from their sight, into the cloud of God’s presence. His last promise still stands: “I am with you always, until the end of the world.”',
          'Rồi, trên một ngọn đồi, Ngài chúc lành cho họ và được cất lên khỏi tầm mắt, vào đám mây của sự hiện diện Thiên Chúa. Lời hứa cuối của Ngài vẫn còn nguyên: “Thầy ở cùng các con mọi ngày cho đến tận thế.”',
        ),
      },
      {
        id: 'c6',
        art: 'relic-blood',
        text: u(
          'You have walked the whole arc now: a garden lost, a promise kept, a yes, a birth, water into wine, mercy running down a road, bread broken, a cross, a silence, and a morning that never ends.',
          'Bạn đã đi trọn vòng cung câu chuyện: một khu vườn đánh mất, một lời hứa được giữ, một tiếng xin vâng, một hài nhi, nước hóa thành rượu, lòng thương xót chạy ra giữa đường, tấm bánh được bẻ ra, một thập giá, một sự thinh lặng, và một buổi sáng không bao giờ tàn.',
        ),
      },
      {
        id: 'c7',
        art: 'basilica-bruges',
        text: u(
          'The second page of your passport is ready. The road turns now toward Paris — toward an organ you have heard with your own ears, and the question of what the Church actually is.',
          'Trang thứ hai trong hộ chiếu của bạn đã sẵn sàng. Con đường giờ hướng về Paris — về cây đàn organ bạn đã nghe bằng chính đôi tai mình, và câu hỏi: Giáo hội thật ra là gì.',
        ),
      },
    ],
    questions: [],
    treasure: {
      kind: 'art',
      art: 'emmaus-road',
      title: u('The road to Emmaus', 'Đường Emmau'),
      note: u(
        'The Church’s favorite picture of itself: people walking a road, hearts burning, recognizing him in the breaking of the bread. You are on that road now.',
        'Bức tranh Giáo hội yêu thích nhất về chính mình: những con người đi trên một con đường, lòng bừng cháy, nhận ra Ngài khi bánh được bẻ ra. Bạn đang ở trên con đường ấy.',
      ),
    },
    reflection: u('Looking back over the whole story of Jesus — what stays with you most?', 'Nhìn lại trọn câu chuyện của Chúa Giêsu — điều gì ở lại trong bạn nhiều nhất?'),
    deeper: {
      ccc: [641, 659],
      note: u('On the appearances of the Risen Lord and the Ascension.', 'Về các lần hiện ra của Chúa Phục Sinh và việc Chúa Lên Trời.'),
    },
  },
];
