import type { L, Lesson } from '../types';

// ─── World 2 · Bruges · lessons 1–7 ─────────────────────────────────────────
// The Jesus arc, part one: the fall, the waiting, Mary's yes, Bethlehem,
// Cana, and two parables of mercy.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const BRUGES_LESSONS_1: Lesson[] = [
  // ── 1: The Garden and the Fall ─────────────────────────────────────────
  {
    id: 'bruges-1',
    title: u('The Garden and the Fall', 'Khu vườn và sự sa ngã'),
    minutes: 4,
    door: {
      art: 'eden-tree',
      line: u(
        'Before Bruges, before everything — a garden, a gift, and a choice.',
        'Trước Bruges, trước tất cả — một khu vườn, một món quà, và một lựa chọn.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'eden-tree',
        text: u(
          'The story begins in a garden. The first people had everything: the world, each other, and God walking close to them, like family.',
          'Câu chuyện bắt đầu trong một khu vườn. Những con người đầu tiên có tất cả: thế giới, có nhau, và Thiên Chúa ở thật gần, như người nhà.',
        ),
      },
      {
        id: 'c2',
        art: 'eden-tree',
        text: u(
          'One thing was asked of them: trust me. One tree was not theirs to take. And a quiet voice — the serpent — whispered: God is holding out on you. Take it, and you will not need him.',
          'Chỉ một điều được yêu cầu nơi họ: hãy tin Ta. Một cái cây không phải của họ. Và một tiếng nói thầm — con rắn — rỉ tai: Thiên Chúa đang giấu các ngươi điều tốt. Cứ hái đi, rồi các ngươi sẽ không cần Ngài nữa.',
        ),
      },
      {
        id: 'c3',
        art: 'eden-tree',
        text: u(
          'They took it. And something tore. Not the fruit — the trust. Shame came in, and hiding, and blame. The Church calls this wound {{sin}}.',
          'Họ đã hái. Và một điều gì đó rạn vỡ. Không phải trái cây — mà là lòng tin. Xấu hổ kéo đến, rồi trốn tránh, rồi đổ lỗi. Giáo hội gọi vết thương ấy là {{sin}}.',
        ),
        terms: ['sin'],
      },
      {
        id: 'c4',
        art: 'prayer-night',
        text: u(
          'You know this tear. Everyone does — the distance between the person we want to be and what we actually do. The story is not about two people long ago. It is about all of us.',
          'Bạn biết vết rạn này. Ai cũng biết — khoảng cách giữa con người ta muốn trở thành và điều ta thật sự làm. Câu chuyện không chỉ về hai người thuở xưa. Mà về tất cả chúng ta.',
        ),
      },
      {
        id: 'c5',
        art: 'creation-light',
        text: u(
          'But listen to what God does next. He does not abandon the garden. Standing in the wreckage, he makes a promise: one day, someone born of a woman will crush the serpent.',
          'Nhưng hãy nghe điều Thiên Chúa làm tiếp theo. Ngài không bỏ rơi khu vườn. Đứng giữa đổ nát, Ngài hứa: một ngày kia, một người con sinh bởi người nữ sẽ đạp nát đầu con rắn.',
        ),
        scripture: {
          ref: 'Genesis 3:15',
          verse: u(
            'I will put enmity between you and the woman, between your offspring and hers. He will strike at your head.',
            'Ta sẽ đặt mối thù giữa ngươi và người nữ, giữa dòng dõi ngươi và dòng dõi người ấy. Người sẽ đạp nát đầu ngươi.',
          ),
          plain: u(
            'On the worst day in the story, God already speaks of a rescue. The whole Bible after this page is the keeping of that promise.',
            'Ngay trong ngày tồi tệ nhất của câu chuyện, Thiên Chúa đã nói về một cuộc giải cứu. Cả phần Kinh Thánh sau trang này là việc Ngài giữ lời hứa ấy.',
          ),
        },
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'predict',
        afterCard: 2,
        prompt: u(
          'The first people have broken trust with God. What does he do?',
          'Những con người đầu tiên đã đánh mất lòng tin với Thiên Chúa. Ngài sẽ làm gì?',
        ),
        options: [
          { text: u('He destroys the garden and walks away', 'Ngài phá hủy khu vườn và bỏ đi') },
          { text: u('He promises a rescue', 'Ngài hứa một cuộc giải cứu') },
        ],
        answer: 1,
        why: u(
          'This is the pattern of the whole story: where we break things, God begins repairs.',
          'Đây là khuôn mẫu của cả câu chuyện: nơi chúng ta làm đổ vỡ, Thiên Chúa bắt đầu chữa lành.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What was actually broken in the garden?', 'Điều gì thật sự bị đổ vỡ trong khu vườn?'),
        options: [
          { text: u('A rule about fruit', 'Một luật lệ về trái cây') },
          { text: u('Trust between God and his children', 'Lòng tin giữa Thiên Chúa và con cái Ngài') },
        ],
        answer: 1,
        why: u(
          'Sin is never really about the fruit. It is the turning away from someone who loves us.',
          'Tội lỗi không bao giờ thật sự là chuyện trái cây. Mà là sự quay lưng với Đấng yêu thương mình.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'eden-tree',
      title: u('The tree and the serpent', 'Cái cây và con rắn'),
      note: u(
        'Artists paint this scene in every cathedral, because the next chapters make no sense without it. Remember the tree — at the end of this world, you will see another one, shaped like a cross.',
        'Các nghệ sĩ vẽ cảnh này trong mọi nhà thờ lớn, vì những chương sau sẽ vô nghĩa nếu thiếu nó. Hãy nhớ cái cây này — cuối chặng đường này, bạn sẽ thấy một cái cây khác, mang hình Thánh giá.',
      ),
    },
    reflection: u('Where have you felt that tear between who you want to be and what you do?', 'Bạn từng cảm thấy vết rạn giữa con người mình muốn trở thành và điều mình làm ở đâu?'),
    deeper: {
      ccc: [397, 410, 411],
      note: u('On the fall, and the first promise of a Savior.', 'Về sự sa ngã, và lời hứa đầu tiên về Đấng Cứu Thế.'),
    },
  },

  // ── 2: The Long Waiting ────────────────────────────────────────────────
  {
    id: 'bruges-2',
    title: u('The Long Waiting', 'Sự chờ đợi dài lâu'),
    minutes: 4,
    door: {
      art: 'prophet-night',
      line: u(
        'Centuries pass. A people keeps watch in the dark, holding one promise.',
        'Hàng thế kỷ trôi qua. Một dân tộc canh thức trong đêm tối, ôm giữ một lời hứa.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'prophet-night',
        text: u(
          'God chose a small people, Israel, to carry his promise through history. They were freed from slavery, given a land, and they waited.',
          'Thiên Chúa chọn một dân tộc nhỏ bé, Israel, để mang lời hứa của Ngài xuyên qua lịch sử. Họ được giải thoát khỏi kiếp nô lệ, được ban một vùng đất, và họ chờ đợi.',
        ),
      },
      {
        id: 'c2',
        art: 'prophet-night',
        text: u(
          'When they forgot, God sent {{prophet}}s — men and women who spoke for him. Again and again the prophets pointed ahead: someone is coming.',
          'Khi họ quên, Thiên Chúa sai các {{prophet}} — những người nam nữ nói thay Ngài. Hết lần này đến lần khác, các ngôn sứ chỉ về phía trước: có một Đấng đang đến.',
        ),
        terms: ['prophet'],
      },
      {
        id: 'c3',
        art: 'creation-light',
        text: u('Seven hundred years before Bethlehem, Isaiah wrote it down.', 'Bảy trăm năm trước Bêlem, ngôn sứ Isaia đã viết xuống.'),
        scripture: {
          ref: 'Isaiah 9:6',
          verse: u(
            'For a child is born to us, a son is given to us. He will be called Wonderful Counselor, Mighty God, Prince of Peace.',
            'Vì một trẻ thơ đã chào đời để cứu ta, một người con đã được ban tặng cho ta. Người sẽ được gọi là Cố Vấn Kỳ Diệu, Thiên Chúa Quyền Năng, Hoàng Tử Bình An.',
          ),
          plain: u(
            'The rescue would not arrive as an army. It would arrive as a baby. No one expected that.',
            'Cuộc giải cứu sẽ không đến như một đạo quân. Mà đến như một em bé. Không ai ngờ được điều đó.',
          ),
          bridge: u(
            'Like waiting at an arrivals gate for years, holding a name on a sign.',
            'Như đứng đợi ở cửa đến của sân bay suốt nhiều năm, tay cầm tấm bảng ghi một cái tên.',
          ),
        },
      },
      {
        id: 'c4',
        art: 'lake-evening',
        text: u(
          'Waiting is its own kind of faith. Advent — the season before Christmas — keeps this waiting alive every year, so we never forget what it cost to hope.',
          'Chờ đợi cũng là một dạng đức tin. Mùa Vọng — mùa trước Giáng Sinh — giữ cho sự chờ đợi này sống lại mỗi năm, để ta không bao giờ quên niềm hy vọng đã phải trả giá thế nào.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What was a prophet’s job?', 'Công việc của một ngôn sứ là gì?'),
        options: [
          { text: u('To predict the lottery', 'Đoán số trúng thưởng') },
          { text: u('To speak for God and keep hope alive', 'Nói thay Thiên Chúa và giữ niềm hy vọng sống mãi') },
          { text: u('To rule as kings', 'Cai trị như vua chúa') },
        ],
        answer: 1,
        why: u(
          'Prophets were the keepers of the promise — lamps in a long night.',
          'Các ngôn sứ là người canh giữ lời hứa — những ngọn đèn trong đêm dài.',
        ),
      },
      {
        id: 'q2',
        kind: 'fill',
        prompt: u('You learned this line in Hà Nội. Complete it.', 'Bạn đã học câu này ở Hà Nội. Hãy hoàn thành.'),
        before: u('Our Father, who art in heaven,', 'Lạy Cha chúng con ở trên trời,'),
        after: u('…', '…'),
        options: [
          u('hallowed be thy name.', 'chúng con nguyện danh Cha cả sáng,'),
          u('blessed be the morning.', 'chúng con chúc tụng buổi sáng,'),
          u('listen to our plans.', 'xin nghe các kế hoạch của chúng con,'),
        ],
        answer: 0,
        why: u(
          'Israel’s long waiting was exactly this prayer: may your name be known, may your kingdom come.',
          'Sự chờ đợi dài lâu của Israel chính là lời kinh này: nguyện danh Cha cả sáng, nước Cha trị đến.',
        ),
      },
    ],
    treasure: {
      kind: 'word',
      termId: 'prophet',
      note: u(
        'A word for the watchers in the dark. When you next stand in a night airport, think of them: people who kept believing the light would come.',
        'Một từ dành cho những người canh thức trong đêm. Lần tới khi bạn đứng trong sân bay lúc nửa đêm, hãy nghĩ đến họ: những người không ngừng tin rằng ánh sáng sẽ đến.',
      ),
    },
    reflection: u('What are you waiting for, honestly?', 'Thật lòng, bạn đang chờ đợi điều gì?'),
    deeper: {
      ccc: [522],
      note: u('On the long preparation for the coming of Christ.', 'Về sự chuẩn bị dài lâu cho việc Chúa Kitô đến.'),
    },
  },

  // ── 3: Mary's Yes ──────────────────────────────────────────────────────
  {
    id: 'bruges-3',
    title: u('Mary’s Yes', 'Tiếng "Xin Vâng" của Mẹ Maria'),
    minutes: 5,
    door: {
      art: 'annunciation',
      line: u(
        'A village girl, an ordinary morning, and a visitor who bows to her.',
        'Một thiếu nữ làng quê, một buổi sáng bình thường, và một vị khách cúi chào cô.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'annunciation',
        text: u(
          'Her name is Maria — Mary. She is young, poor, engaged to a carpenter named Joseph, in a town too small for maps. Heaven chooses her.',
          'Tên cô là Maria. Cô trẻ tuổi, nghèo, đã đính hôn với một bác thợ mộc tên Giuse, ở một thị trấn nhỏ đến mức bản đồ không ghi. Và Trời cao đã chọn cô.',
        ),
      },
      {
        id: 'c2',
        art: 'annunciation',
        text: u(
          'An angel stands before her. “Hail, full of grace. The Lord is with you.” Mary is troubled — what kind of greeting is this, for a girl like her?',
          'Một thiên thần đứng trước mặt cô. “Kính mừng Bà đầy ơn phúc. Đức Chúa Trời ở cùng Bà.” Maria bối rối — lời chào này nghĩa là gì, với một thiếu nữ như cô?',
        ),
      },
      {
        id: 'c3',
        art: 'annunciation',
        text: u(
          'The angel tells her: you will bear a son, and name him Jesus. He will be called Son of the Most High. The promise of every prophet lands on her shoulders.',
          'Thiên thần nói: Bà sẽ sinh một con trai, và đặt tên là Giêsu. Người sẽ được gọi là Con Đấng Tối Cao. Lời hứa của mọi ngôn sứ đặt xuống đôi vai cô.',
        ),
      },
      {
        id: 'c4',
        art: 'annunciation',
        text: u(
          'She could have said no. Nothing forced her. That is the astonishing part: God waited on the free yes of a young woman.',
          'Cô đã có thể nói không. Không gì ép buộc cô cả. Đó là điều kỳ diệu: Thiên Chúa chờ đợi tiếng xin vâng tự do của một người thiếu nữ.',
        ),
        branch: {
          prompt: u('Standing where Mary stood — what would rise in you first?', 'Nếu đứng ở nơi Maria đứng — điều gì sẽ trào dâng trong bạn trước tiên?'),
          choices: [
            {
              label: u('Fear', 'Sợ hãi'),
              response: u(
                'The angel’s first words were “Do not be afraid.” Fear is allowed in this story. It always has been.',
                'Lời đầu tiên của thiên thần là “Đừng sợ.” Nỗi sợ được phép có mặt trong câu chuyện này. Xưa nay vẫn vậy.',
              ),
            },
            {
              label: u('Questions', 'Những câu hỏi'),
              response: u(
                'Mary asked one too: “How can this be?” Asking is not doubting. She asked, and then she trusted.',
                'Maria cũng đã hỏi: “Việc ấy xảy ra thế nào được?” Hỏi không phải là nghi ngờ. Cô đã hỏi, rồi cô tin.',
              ),
            },
            {
              label: u('A quiet yes', 'Một tiếng xin vâng lặng lẽ'),
              response: u(
                'Then you already understand her. The greatest yes in history was spoken quietly, in a small room.',
                'Vậy là bạn đã hiểu cô ấy. Tiếng xin vâng vĩ đại nhất lịch sử được thốt lên thật khẽ, trong một căn phòng nhỏ.',
              ),
            },
          ],
        },
      },
      {
        id: 'c5',
        art: 'annunciation',
        text: u('And Mary answers.', 'Và Maria trả lời.'),
        scripture: {
          ref: 'Luke 1:38',
          verse: u(
            'Behold, I am the servant of the Lord. Let it be done to me according to your word.',
            'Vâng, tôi đây là nữ tỳ của Chúa. Xin Chúa cứ làm cho tôi như lời sứ thần nói.',
          ),
          plain: u(
            'Her yes undid the old no of the garden. Where trust was broken, trust was given back — freely, completely.',
            'Tiếng xin vâng của Mẹ tháo gỡ tiếng "không" xưa kia trong khu vườn. Nơi lòng tin từng đổ vỡ, lòng tin được trao lại — tự do, trọn vẹn.',
          ),
          bridge: u(
            'Your own baptism will be a yes like this one: never demanded, only invited.',
            'Bí tích Rửa tội của chính bạn cũng sẽ là một tiếng xin vâng như thế: không bao giờ bị đòi hỏi, chỉ được mời gọi.',
          ),
        },
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'tapArt',
        afterCard: 2,
        prompt: u('Look closer at the Annunciation.', 'Hãy nhìn gần hơn bức Truyền Tin.'),
        art: 'annunciation',
        hotspots: [
          {
            x: 27,
            y: 60,
            label: u('The angel Gabriel', 'Sứ thần Gabriel'),
            meaning: u('God’s messenger. His wings are gold — painters used real gold to say: heaven touches earth here.', 'Sứ giả của Thiên Chúa. Đôi cánh màu vàng — các họa sĩ dùng vàng thật để nói: nơi đây trời chạm đất.'),
          },
          {
            x: 75,
            y: 62,
            label: u('Mary', 'Đức Mẹ Maria'),
            meaning: u('She bows, but she is the most important person in the room. Heaven is waiting for her answer.', 'Mẹ cúi mình, nhưng Mẹ là người quan trọng nhất trong căn phòng. Cả thiên đàng đang đợi câu trả lời của Mẹ.'),
          },
          {
            x: 50,
            y: 21,
            label: u('The dove', 'Chim bồ câu'),
            meaning: u('The Holy Spirit, descending on a ray of light. The child will be conceived by God’s own power.', 'Chúa Thánh Thần, ngự xuống trên một tia sáng. Hài nhi sẽ được thụ thai bởi quyền năng của chính Thiên Chúa.'),
          },
          {
            x: 52,
            y: 84,
            label: u('The lily', 'Hoa huệ'),
            meaning: u('The painter’s signature for purity. Wherever you see a lily in sacred art, Mary is near.', 'Dấu hiệu của sự thanh khiết trong hội họa. Ở đâu có hoa huệ trong nghệ thuật thánh, ở đó có Mẹ Maria.'),
          },
        ],
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('Why does Mary’s yes matter so much?', 'Vì sao tiếng xin vâng của Mẹ Maria quan trọng đến thế?'),
        options: [
          { text: u('It was free — God invited, never forced', 'Vì nó tự do — Thiên Chúa mời gọi, không hề ép buộc') },
          { text: u('She had no other choice', 'Vì cô không còn lựa chọn nào khác') },
        ],
        answer: 0,
        why: u(
          'Love that is forced is not love. The whole rescue of the world waited on a freely given yes.',
          'Tình yêu bị ép buộc thì không phải tình yêu. Cả cuộc giải cứu thế giới đã chờ một tiếng xin vâng tự nguyện.',
        ),
      },
    ],
    treasure: {
      kind: 'prayer',
      prayerId: 'hail-mary',
      note: u(
        'The prayer of your own rosary. Its first words are the angel’s greeting you just heard. When you pray it, you stand in that small room.',
        'Lời kinh của chính chuỗi Mân Côi bạn đang có. Những lời đầu là lời chào của thiên thần bạn vừa nghe. Khi đọc kinh này, bạn đang đứng trong căn phòng nhỏ ấy.',
      ),
    },
    reflection: u('What would you need, to say a yes like hers?', 'Bạn cần điều gì để có thể nói một tiếng xin vâng như thế?'),
    deeper: {
      ccc: [494],
      note: u('On Mary’s free obedience of faith.', 'Về sự vâng phục tự do trong đức tin của Mẹ Maria.'),
    },
  },

  // ── 4: The Night in Bethlehem ──────────────────────────────────────────
  {
    id: 'bruges-4',
    title: u('The Night in Bethlehem', 'Đêm Bêlem'),
    minutes: 4,
    door: {
      art: 'nativity',
      line: u(
        'No room at the inn. A stable, a star, and the promise arriving with a newborn’s cry.',
        'Quán trọ hết chỗ. Một chuồng gia súc, một ngôi sao, và lời hứa đến trong tiếng khóc của một hài nhi.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'nativity',
        text: u(
          'A census forces Joseph and Mary to travel to Bethlehem while she is heavily pregnant. The town is full. The only shelter left is where the animals sleep.',
          'Một cuộc kiểm tra dân số buộc Giuse và Maria phải về Bêlem khi Mẹ đang gần ngày sinh. Thị trấn chật kín. Chỗ trú duy nhất còn lại là nơi gia súc ngủ.',
        ),
      },
      {
        id: 'c2',
        art: 'nativity',
        text: u(
          'And there, in the night, the child is born. The one the prophets promised. God himself, small enough to hold.',
          'Và tại đó, trong đêm, hài nhi chào đời. Đấng các ngôn sứ đã hứa. Chính Thiên Chúa, bé nhỏ đến mức có thể ẵm trên tay.',
        ),
        scripture: {
          ref: 'Luke 2:7',
          verse: u(
            'She gave birth to her firstborn son, wrapped him in cloth, and laid him in a manger, because there was no room for them at the inn.',
            'Bà sinh con trai đầu lòng, lấy tã bọc con, rồi đặt nằm trong máng cỏ, vì hai ông bà không tìm được chỗ trong nhà trọ.',
          ),
          plain: u(
            'The King of everything arrived with nothing. God chose to enter the world from below, so that no one would ever be beneath him.',
            'Vua của muôn loài đã đến mà không có gì cả. Thiên Chúa chọn bước vào thế giới từ chỗ thấp nhất, để không ai bị xem là thấp hơn Ngài.',
          ),
        },
      },
      {
        id: 'c3',
        art: 'nativity',
        text: u(
          'The first guests were not kings or priests. They were shepherds — night workers, low on every list. Angels filled their sky with song and sent them running to a feeding trough.',
          'Những vị khách đầu tiên không phải vua chúa hay tư tế. Mà là những người chăn chiên — người làm đêm, đứng cuối mọi danh sách. Các thiên thần hát vang trời và bảo họ chạy đến bên một máng cỏ.',
        ),
      },
      {
        id: 'c4',
        art: 'nativity',
        text: u(
          'Christmas is this night, kept forever. Every crib scene in every church window you have ever passed is this stable, still glowing.',
          'Giáng Sinh chính là đêm này, được lưu giữ mãi mãi. Mỗi hang đá trong mỗi ô cửa nhà thờ bạn từng đi qua đều là chuồng gia súc này, vẫn đang tỏa sáng.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 2,
        prompt: u('Who did the angels invite first to meet the newborn King?', 'Các thiên thần mời ai đến gặp vị Vua mới sinh trước tiên?'),
        options: [
          { text: u('The emperor’s officials', 'Các quan chức của hoàng đế') },
          { text: u('Shepherds working the night shift', 'Những người chăn chiên làm ca đêm') },
          { text: u('The innkeeper', 'Chủ quán trọ') },
        ],
        answer: 1,
        why: u(
          'God’s guest list starts from the bottom. It always has.',
          'Danh sách khách mời của Thiên Chúa luôn bắt đầu từ những người bé nhỏ nhất. Xưa nay vẫn thế.',
        ),
      },
      {
        id: 'q2',
        kind: 'fill',
        prompt: u('Complete the angel’s greeting you received as a treasure.', 'Hoàn thành lời chào của thiên thần mà bạn đã nhận làm kho báu.'),
        before: u('Hail Mary, full of', 'Kính mừng Maria đầy'),
        after: u('…', '…'),
        options: [u('grace,', 'ơn phúc,'), u('songs,', 'bài ca,'), u('light,', 'ánh sáng,')],
        answer: 0,
        why: u(
          'Full of grace — full of God’s own gift. The prayer keeps the angel’s exact word.',
          'Đầy ơn phúc — đầy chính quà tặng của Thiên Chúa. Lời kinh giữ đúng từng chữ của thiên thần.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'nativity',
      title: u('The Nativity', 'Chúa Giáng Sinh'),
      note: u(
        'Painters like Giotto put real night into this scene — deep blue, one star, gold only around the child. The colors of this entire app come from that night.',
        'Các họa sĩ như Giotto đã đưa màn đêm thật vào cảnh này — xanh thẳm, một ngôi sao, sắc vàng chỉ quanh hài nhi. Màu sắc của cả ứng dụng này đến từ đêm ấy.',
      ),
    },
    reflection: u('Where were you the last time something felt holy?', 'Lần gần nhất bạn cảm thấy điều gì đó thánh thiêng, bạn đang ở đâu?'),
    deeper: {
      ccc: [525],
      note: u('On the humility of the Nativity.', 'Về sự khiêm hạ của đêm Giáng Sinh.'),
    },
  },

  // ── 5: Water into Wine ─────────────────────────────────────────────────
  {
    id: 'bruges-5',
    title: u('Water into Wine', 'Nước hóa thành rượu'),
    minutes: 4,
    door: {
      art: 'cana-jars',
      line: u(
        'Thirty years later. A wedding, an empty cellar, and a mother who notices.',
        'Ba mươi năm sau. Một tiệc cưới, hầm rượu cạn, và một người mẹ tinh ý.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'cana-jars',
        text: u(
          'Jesus has grown up. At a village wedding in Cana, the unthinkable happens: the wine runs out. For the young couple, this means public shame on the happiest day of their lives.',
          'Chúa Giêsu đã trưởng thành. Tại một tiệc cưới làng quê ở Cana, điều khó xử xảy ra: rượu hết. Với đôi tân hôn, đó là nỗi xấu hổ trước mọi người, ngay trong ngày hạnh phúc nhất đời.',
        ),
      },
      {
        id: 'c2',
        art: 'cana-jars',
        text: u(
          'Mary notices first — mothers always do. She tells Jesus simply: “They have no wine.” Then she turns to the servants with the best advice ever given: “Do whatever he tells you.”',
          'Mẹ Maria nhận ra trước tiên — những người mẹ luôn vậy. Mẹ nói với Chúa Giêsu thật ngắn: “Họ hết rượu rồi.” Rồi Mẹ quay sang các gia nhân với lời khuyên hay nhất từng có: “Người bảo gì, các anh cứ làm theo.”',
        ),
      },
      {
        id: 'c3',
        art: 'cana-jars',
        text: u(
          'Jesus points to six huge stone jars. “Fill them with water.” The servants pour — six hundred liters. And somewhere between the jar and the cup, the water becomes wine. The best wine of the feast.',
          'Chúa Giêsu chỉ vào sáu chum đá lớn. “Hãy đổ đầy nước.” Các gia nhân đổ vào — sáu trăm lít. Và đâu đó giữa chum và chén, nước đã trở thành rượu. Thứ rượu ngon nhất của bữa tiệc.',
        ),
      },
      {
        id: 'c4',
        art: 'cana-jars',
        text: u(
          'This is the first {{miracle}} — and look where it happens: not in a temple, but at a party. Saving two newlyweds from embarrassment. God cares about joy.',
          'Đây là {{miracle}} đầu tiên — và hãy xem nó xảy ra ở đâu: không phải trong đền thờ, mà giữa một bữa tiệc. Để cứu đôi tân hôn khỏi ngượng ngùng. Thiên Chúa quan tâm đến niềm vui.',
        ),
        terms: ['miracle'],
      },
      {
        id: 'c5',
        art: 'sky-flight',
        text: u(
          'You are planning a wedding too. This story is the Church’s favorite to tell engaged couples: invite him, and the feast does not run dry.',
          'Bạn cũng đang chuẩn bị một đám cưới. Đây là câu chuyện Giáo hội thích kể nhất cho các đôi sắp cưới: hãy mời Ngài đến, và bữa tiệc sẽ không bao giờ cạn.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'predict',
        afterCard: 1,
        prompt: u('The wine is gone. What will Jesus do?', 'Rượu đã hết. Chúa Giêsu sẽ làm gì?'),
        options: [
          { text: u('Tell everyone to go home', 'Bảo mọi người về nhà') },
          { text: u('Quietly save the feast', 'Lặng lẽ cứu lấy bữa tiệc') },
        ],
        answer: 1,
        why: u(
          'Quietly is the key. Only the servants knew. His greatest works rarely announce themselves.',
          '“Lặng lẽ” là từ then chốt. Chỉ các gia nhân biết. Những việc lớn nhất của Ngài hiếm khi phô trương.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What does Cana show about God?', 'Tiệc cưới Cana cho thấy điều gì về Thiên Chúa?'),
        options: [
          { text: u('He only cares about serious religious things', 'Ngài chỉ quan tâm đến những việc đạo nghiêm trang') },
          { text: u('Human joy matters to him', 'Niềm vui của con người quan trọng với Ngài') },
        ],
        answer: 1,
        why: u(
          'The first miracle protected a celebration. Joy is not a distraction from faith — it is one of its homes.',
          'Phép lạ đầu tiên là để gìn giữ một niềm vui. Niềm vui không làm xao lãng đức tin — nó là một mái nhà của đức tin.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('Mary’s advice', 'Lời khuyên của Mẹ Maria'),
      note: u(
        '“Do whatever he tells you.” Five words to carry into your wedding year. When you do not know how to pray, you can simply tell him what is missing — “they have no wine” — and leave it with him.',
        '“Người bảo gì, cứ làm theo.” Một câu để mang theo trong năm cưới của bạn. Khi không biết cầu nguyện thế nào, bạn chỉ cần nói với Ngài điều đang thiếu — “họ hết rượu rồi” — và phó thác cho Ngài.',
      ),
    },
    reflection: u('What is running low in your life right now?', 'Điều gì trong đời bạn đang dần cạn?'),
    deeper: {
      ccc: [1613, 2618],
      note: u('On Cana, marriage, and Mary’s intercession.', 'Về Cana, hôn nhân, và lời chuyển cầu của Mẹ Maria.'),
    },
  },

  // ── 6: The Father Who Runs ─────────────────────────────────────────────
  {
    id: 'bruges-6',
    title: u('The Father Who Runs', 'Người cha chạy ra đón'),
    minutes: 5,
    door: {
      art: 'prodigal-embrace',
      line: u(
        'Jesus told stories. This one, people say, is the most beautiful short story ever written.',
        'Chúa Giêsu kể chuyện. Câu chuyện này, người ta nói, là truyện ngắn đẹp nhất từng được viết.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'prodigal-embrace',
        text: u(
          'A {{parable}}: a man has two sons. The younger one says: give me my inheritance now. In that culture, it meant: Father, to me you are already dead.',
          'Một {{parable}}: người kia có hai con trai. Đứa em nói: xin cha chia gia tài cho con bây giờ. Trong văn hóa ấy, câu đó nghĩa là: thưa cha, với con, cha như đã chết rồi.',
        ),
        terms: ['parable'],
      },
      {
        id: 'c2',
        art: 'samaritan-road',
        text: u(
          'The father lets him go. The son travels far, spends everything, and ends up feeding pigs — hungry enough to envy their food. At the bottom, he rehearses a speech: Father, I am not worthy to be called your son. Take me as a servant.',
          'Người cha để con đi. Đứa con đi xa, tiêu sạch tất cả, rồi phải đi chăn heo — đói đến mức thèm cả thức ăn của heo. Dưới đáy vực, cậu tập dượt một bài nói: Thưa cha, con không đáng được gọi là con của cha nữa. Xin nhận con như một người làm công.',
        ),
      },
      {
        id: 'c3',
        art: 'prodigal-embrace',
        text: u('He turns toward home. And then, the line that changes everything.', 'Cậu quay về nhà. Và rồi, câu văn thay đổi tất cả.'),
        scripture: {
          ref: 'Luke 15:20',
          verse: u(
            'While he was still far away, his father saw him and was filled with compassion. He ran to his son, embraced him, and kissed him.',
            'Khi cậu còn ở đằng xa, người cha đã trông thấy, chạnh lòng thương, chạy ra ôm chầm lấy con mà hôn.',
          ),
          plain: u(
            '“While he was still far away” — the father had been watching the road the whole time. Dignified old men did not run in that world. This one runs.',
            '“Khi cậu còn ở đằng xa” — nghĩa là người cha đã dõi nhìn con đường ấy suốt bao ngày. Ở xứ đó, các bậc trưởng lão không bao giờ chạy. Người cha này đã chạy.',
          ),
        },
      },
      {
        id: 'c4',
        art: 'prodigal-embrace',
        text: u(
          'The son starts his speech — and the father talks over him. Bring the best robe! A ring! A feast! The rehearsed words about being a servant are never finished. He came back a servant; he is received as a son.',
          'Đứa con bắt đầu bài nói đã tập — nhưng người cha nói át đi. Mau đem áo đẹp nhất ra đây! Xỏ nhẫn vào tay! Mở tiệc ăn mừng! Những lời tập dượt về việc làm công không bao giờ được nói hết. Cậu trở về như một người làm công; cậu được đón nhận như một người con.',
        ),
      },
      {
        id: 'c5',
        art: 'prodigal-embrace',
        text: u(
          'Jesus is describing his Father. Yours. This is what God is like when someone turns around: not arms crossed, but arms open, already running. The Church calls it {{mercy}}.',
          'Chúa Giêsu đang mô tả Cha của Ngài. Cũng là Cha của bạn. Thiên Chúa là như thế khi một người quay về: không khoanh tay, mà dang rộng vòng tay, và đã chạy ra từ trước. Giáo hội gọi đó là {{mercy}}.',
        ),
        terms: ['mercy'],
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'predict',
        afterCard: 1,
        prompt: u(
          'The son is coming home with his speech prepared. How will the father receive him?',
          'Đứa con đang về nhà với bài nói đã chuẩn bị. Người cha sẽ đón cậu thế nào?',
        ),
        options: [
          { text: u('He runs to embrace him before the speech', 'Ông chạy ra ôm con trước cả khi nghe bài nói') },
          { text: u('He listens, then accepts him as a servant', 'Ông lắng nghe, rồi nhận cậu làm người làm công') },
          { text: u('He turns him away to teach a lesson', 'Ông đuổi đi để dạy cho một bài học') },
        ],
        answer: 0,
        why: u(
          'Mercy does not wait for the apology to finish. It is already running down the road.',
          'Lòng thương xót không đợi lời xin lỗi nói xong. Nó đã chạy ra giữa đường từ trước.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What is this parable really about?', 'Dụ ngôn này thật ra nói về điều gì?'),
        options: [
          { text: u('How to manage an inheritance', 'Cách quản lý gia tài') },
          { text: u('What God the Father is like', 'Thiên Chúa Cha là Đấng như thế nào') },
        ],
        answer: 1,
        why: u(
          'Every parable is a window. This one looks straight into the Father’s heart.',
          'Mỗi dụ ngôn là một ô cửa sổ. Ô cửa này nhìn thẳng vào trái tim của Chúa Cha.',
        ),
      },
    ],
    treasure: {
      kind: 'word',
      termId: 'mercy',
      note: u(
        'The most important word in this whole world of lessons. If you remember one thing from Bruges, let it be the father, running.',
        'Từ quan trọng nhất trong cả chặng đường này. Nếu bạn chỉ nhớ một điều từ Bruges, hãy nhớ hình ảnh người cha đang chạy.',
      ),
    },
    reflection: u('Is there a road you have been afraid to walk back down?', 'Có con đường nào bạn vẫn sợ phải quay bước trở về?'),
    deeper: {
      ccc: [1439],
      note: u('The prodigal son as the picture of conversion and mercy.', 'Dụ ngôn người con hoang đàng là bức tranh về sự hoán cải và lòng thương xót.'),
    },
  },

  // ── 7: The Stranger on the Road ────────────────────────────────────────
  {
    id: 'bruges-7',
    title: u('The Stranger on the Road', 'Người lạ trên đường'),
    minutes: 4,
    door: {
      art: 'samaritan-road',
      line: u(
        '“And who is my neighbor?” a lawyer asks, hoping for a short list. Jesus answers with a road.',
        '“Nhưng ai là người thân cận của tôi?” một luật sĩ hỏi, mong nhận được một danh sách ngắn. Chúa Giêsu trả lời bằng một con đường.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'samaritan-road',
        text: u(
          'A man travels the steep road from Jerusalem to Jericho. Robbers beat him, take everything, and leave him half dead in the dust.',
          'Một người đi trên con đường dốc từ Giêrusalem xuống Giêricô. Bọn cướp đánh ông, lấy sạch mọi thứ, và bỏ mặc ông dở sống dở chết bên vệ đường.',
        ),
      },
      {
        id: 'c2',
        art: 'samaritan-road',
        text: u(
          'A priest comes by — and crosses to the other side. A temple worker does the same. Both are respectable. Both are busy. Both keep walking.',
          'Một tư tế đi ngang — và tránh sang bên kia đường. Một thầy trợ tế cũng làm y như vậy. Cả hai đều đáng kính. Cả hai đều bận rộn. Cả hai đều bước tiếp.',
        ),
      },
      {
        id: 'c3',
        art: 'samaritan-road',
        text: u(
          'Then comes a Samaritan — a foreigner, from a people the listeners despised. He sees the wounded man, and he stops. He cleans the wounds, lifts him onto his own donkey, pays for his lodging, and promises to return.',
          'Rồi một người Samari đi tới — một người ngoại bang, thuộc dân tộc mà người nghe vốn khinh ghét. Ông thấy người bị nạn, và ông dừng lại. Ông rửa vết thương, đỡ người ấy lên lưng lừa của mình, trả tiền trọ, và hứa sẽ quay lại.',
        ),
      },
      {
        id: 'c4',
        art: 'samaritan-road',
        text: u(
          '“Which of the three was a neighbor to the wounded man?” Jesus asks. The lawyer cannot even say “the Samaritan” — he answers, “the one who showed mercy.” Jesus says: Go and do the same.',
          '“Trong ba người, ai là người thân cận của kẻ bị nạn?” Chúa Giêsu hỏi. Vị luật sĩ thậm chí không nói nổi chữ “người Samari” — ông đáp: “kẻ đã tỏ lòng thương.” Chúa Giêsu nói: Hãy đi và làm như vậy.',
        ),
        scripture: {
          ref: 'Luke 10:36–37',
          verse: u(
            '“Which one was a neighbor to the man?” — “The one who showed him mercy.” — “Go and do the same.”',
            '“Ai là người thân cận của người ấy?” — “Kẻ đã tỏ lòng thương với ông ta.” — “Hãy đi, và cũng làm như vậy.”',
          ),
          plain: u(
            'Jesus flips the question. Not “who counts as my neighbor?” but “will I be one?” A neighbor is not found. A neighbor is chosen — by stopping.',
            'Chúa Giêsu lật ngược câu hỏi. Không phải “ai đáng là người thân cận của tôi?” mà là “tôi có trở thành người thân cận không?” Người thân cận không phải được tìm thấy. Mà được chọn — bằng việc dừng lại.',
          ),
          bridge: u(
            'You work in a metal tube full of strangers. Few people on earth get more chances to stop for someone than you do.',
            'Bạn làm việc trong một ống kim loại đầy người xa lạ. Ít ai trên đời có nhiều cơ hội dừng lại vì một người như bạn.',
          ),
        },
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'predict',
        afterCard: 1,
        prompt: u('Two respected religious men have passed by. Who will stop?', 'Hai người đạo mạo đáng kính đã đi qua. Ai sẽ là người dừng lại?'),
        options: [
          { text: u('A third, even holier priest', 'Một vị tư tế thứ ba, thánh thiện hơn nữa') },
          { text: u('A despised foreigner', 'Một người ngoại bang bị khinh miệt') },
        ],
        answer: 1,
        why: u(
          'Jesus chose the hero his listeners would least accept. Mercy ignores every border we draw.',
          'Chúa Giêsu chọn người hùng mà thính giả khó chấp nhận nhất. Lòng thương xót không màng mọi ranh giới ta vạch ra.',
        ),
      },
      {
        id: 'q2',
        kind: 'order',
        prompt: u('Put the Samaritan’s mercy in order.', 'Sắp xếp các bước của lòng thương xót theo thứ tự.'),
        items: [
          u('He sees the wounded man', 'Ông thấy người bị nạn'),
          u('He stops', 'Ông dừng lại'),
          u('He treats the wounds', 'Ông băng bó vết thương'),
          u('He carries him to safety', 'Ông đưa người ấy đến nơi an toàn'),
          u('He promises to come back', 'Ông hứa sẽ quay lại'),
        ],
        why: u(
          'Mercy is a sequence, and it starts small: seeing, then stopping. Everything else follows from those two.',
          'Lòng thương xót là một chuỗi hành động, bắt đầu thật nhỏ: nhìn thấy, rồi dừng lại. Mọi điều khác đều theo sau hai bước ấy.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('This week: stop once', 'Tuần này: dừng lại một lần'),
      note: u(
        'One passenger, one stranger, one colleague having a hidden bad day. See them. Stop for thirty seconds. That is the whole assignment.',
        'Một hành khách, một người lạ, một đồng nghiệp đang âm thầm có một ngày tồi tệ. Hãy nhìn thấy họ. Dừng lại ba mươi giây. Bài tập chỉ có vậy thôi.',
      ),
    },
    reflection: u('Who stopped for you, once?', 'Ai đã từng dừng lại vì bạn?'),
    deeper: {
      ccc: [1825],
      note: u('On love of neighbor, even the enemy.', 'Về tình yêu người thân cận, kể cả kẻ thù.'),
    },
  },
];
