import type { L, World } from '../types';

// ─── World 1 · The Desert · "Beginning" ─────────────────────────────────────
// Mount Sinai, where God first told the world his name.
// Theme: Who is God? Creation, the dignity of the person, and prayer.
//
// All Vietnamese narrative strings are marked 'unverified' and flow into the
// native-review export. Locked sacred terms follow content/terminology.ts.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const SINAI: World = {
  id: 'sinai',
  name: u('Beginning', 'Khởi đầu'),
  church: u('Mount Sinai', 'Núi Sinai'),
  place: u('The Desert', 'Sa mạc'),
  theme: u('Who is God?', 'Thiên Chúa là ai?'),
  lessons: [
    // ── Lesson 1: The Burning Bush ───────────────────────────────────────
    {
      id: 'sinai-1',
      title: u('The Burning Bush', 'Bụi gai bốc cháy'),
      minutes: 4,
      door: {
        art: 'sinai-bush',
        line: u(
          'Night in the desert. A bush is on fire — and it is not burning away.',
          'Đêm giữa sa mạc. Một bụi gai đang bốc cháy — mà không hề tàn lụi.',
        ),
      },
      cards: [
        {
          id: 'c1',
          art: 'sinai-mountain',
          text: u(
            'Every pilgrimage starts somewhere. Ours starts at the foot of a mountain in the desert, where a shepherd named Moses saw something impossible and walked toward it.',
            'Mọi cuộc hành hương đều khởi đầu từ một nơi nào đó. Hành trình của chúng ta bắt đầu dưới chân một ngọn núi giữa sa mạc, nơi một người chăn chiên tên Môsê thấy một điều không thể tin nổi — và đã bước về phía nó.',
          ),
        },
        {
          id: 'c2',
          art: 'sinai-bush',
          text: u(
            'A bush, on fire, yet not consumed. And out of the fire, a voice that knew his name: “Moses, Moses. Take off your sandals — the ground you stand on is holy.”',
            'Một bụi gai, bốc cháy, mà không hề thiêu rụi. Và từ giữa ngọn lửa, một tiếng nói biết rõ tên ông: “Môsê, Môsê. Hãy cởi dép ra — nơi ngươi đang đứng là đất thánh.”',
          ),
        },
        {
          id: 'c3',
          art: 'sinai-bush',
          text: u(
            'Moses asked the fire its name. The answer was unlike anything ever spoken: “I AM WHO AM.” Not a force. Not an idea. Someone — who is, who knows you, and who wanted you to exist.',
            'Môsê hỏi tên của ngọn lửa. Câu trả lời không giống bất cứ điều gì từng được nói ra: “TA LÀ ĐẤNG HẰNG HỮU.” Không phải một sức mạnh vô hình. Không phải một ý niệm. Mà là một Đấng — đang hiện hữu, biết rõ bạn, và muốn bạn hiện hữu.',
          ),
        },
        {
          id: 'c4',
          art: 'creation-light',
          text: u('Centuries later, the Bible would say who this someone is, in three small words.', 'Nhiều thế kỷ sau, Kinh Thánh sẽ nói rõ Đấng ấy là ai, trong mấy chữ thật ngắn.'),
          scripture: {
            ref: '1 John 4:8',
            verse: u('God is love.', 'Thiên Chúa là tình yêu.'),
            plain: u(
              'Everything else the Church teaches begins here. Before anything existed, there was love. God does not just have love — he is love.',
              'Mọi điều Giáo hội dạy đều bắt đầu từ đây. Trước khi có bất cứ điều gì, đã có tình yêu. Thiên Chúa không chỉ có tình yêu — Ngài chính là tình yêu.',
            ),
            bridge: u(
              'The peace some people feel inside a great church, or under a night sky — that is not the stone or the stars. It is the one they were made by.',
              'Sự bình an mà nhiều người cảm nhận trong một ngôi nhà thờ lớn, hay dưới bầu trời đêm — không đến từ đá hay những vì sao. Mà từ Đấng đã làm nên chúng.',
            ),
          },
        },
        {
          id: 'c5',
          art: 'sinai-bush',
          text: u(
            'Jesus gave God another name. He said: call him Father.',
            'Chúa Giêsu cho chúng ta một tên gọi khác của Thiên Chúa. Ngài nói: hãy gọi Ngài là Cha.',
          ),
          branch: {
            prompt: u(
              'If you could ask one thing at this fire, what would it be?',
              'Nếu được hỏi một điều bên ngọn lửa này, bạn sẽ hỏi gì?',
            ),
            choices: [
              {
                label: u('“Are you really there?”', '“Ngài có thật không?”'),
                response: u(
                  'An honest question. The whole road ahead is the answer, walked one step at a time. You are allowed to ask it the entire way.',
                  'Một câu hỏi chân thành. Cả con đường phía trước là câu trả lời, đi từng bước một. Bạn được phép hỏi câu ấy suốt cả hành trình.',
                ),
              },
              {
                label: u('“Do you know my family?”', '“Ngài có biết gia đình con không?”'),
                response: u(
                  'He does. Every name you pray for when you ask for their safety — he hears each one.',
                  'Ngài biết. Mỗi cái tên bạn nhắc đến khi cầu mong bình an cho họ — Ngài nghe từng tên một.',
                ),
              },
              {
                label: u('“Why am I here?”', '“Sao con lại ở đây?”'),
                response: u(
                  'Maybe the same reason the bush kept burning. Some invitations are quiet.',
                  'Có lẽ cùng một lý do khiến bụi gai cứ cháy mãi. Có những lời mời rất thầm lặng.',
                ),
              },
            ],
          },
        },
      ],
      questions: [
        {
          id: 'q1',
          kind: 'choice',
          afterCard: 3,
          prompt: u('What do Catholics believe God is, before anything else?', 'Trước hết, người Công giáo tin Thiên Chúa là gì?'),
          options: [
            { text: u('A set of rules', 'Một bộ luật lệ') },
            { text: u('Love itself', 'Chính là tình yêu') },
            { text: u('A distant force', 'Một sức mạnh xa vời') },
          ],
          answer: 1,
          why: u(
            '“God is love” — the rest of the faith grows out of this one line.',
            '“Thiên Chúa là tình yêu” — mọi điều khác của đức tin lớn lên từ câu này.',
          ),
        },
        {
          id: 'q2',
          kind: 'choice',
          prompt: u('What name did Jesus tell us to use for God?', 'Chúa Giêsu dạy chúng ta gọi Thiên Chúa bằng tên nào?'),
          options: [
            { text: u('Master', 'Chủ nhân') },
            { text: u('Judge', 'Quan tòa') },
            { text: u('Father', 'Cha') },
          ],
          answer: 2,
          why: u(
            'Father. Not a far-away king — family.',
            'Cha. Không phải một vị vua xa cách — mà là người nhà.',
          ),
        },
      ],
      treasure: {
        kind: 'prayer',
        prayerId: 'sign-of-the-cross',
        note: u(
          'Your first prayer. Touch your forehead, your heart, your left shoulder, your right. You are tracing a cross over yourself — a quiet way of saying: I am here, with him.',
          'Lời kinh đầu tiên của bạn. Chạm trán, chạm ngực, vai trái, rồi vai phải. Bạn đang vẽ một Thánh giá trên chính mình — một cách thầm lặng để nói: con đang ở đây, với Ngài.',
        ),
      },
      reflection: u('What stayed with you today?', 'Điều gì còn đọng lại trong bạn hôm nay?'),
      deeper: {
        ccc: [205, 218, 221, 239],
        note: u('On the name of God, and God as love and as Father.', 'Về danh Thiên Chúa, và Thiên Chúa là tình yêu và là Cha.'),
      },
    },

    // ── Lesson 2: In the Beginning ───────────────────────────────────────
    {
      id: 'sinai-2',
      title: u('In the Beginning', 'Lúc khởi đầu'),
      minutes: 5,
      door: {
        art: 'creation-light',
        line: u(
          'Before the city, before the sea, before light itself. The very first story.',
          'Trước thành phố, trước biển khơi, trước cả ánh sáng. Câu chuyện đầu tiên của muôn loài.',
        ),
      },
      cards: [
        {
          id: 'c1',
          art: 'creation-light',
          text: u(
            'The Bible opens with darkness. No stars, no sky, no sound. And then a voice.',
            'Kinh Thánh mở đầu bằng bóng tối. Không sao trời, không bầu trời, không một âm thanh. Rồi một tiếng nói vang lên.',
          ),
          scripture: {
            ref: 'Genesis 1:1–3',
            verse: u(
              'In the beginning, God made the heavens and the earth. God said, “Let there be light” — and there was light.',
              'Lúc khởi đầu, Thiên Chúa dựng nên trời và đất. Thiên Chúa phán: “Phải có ánh sáng” — và liền có ánh sáng.',
            ),
            plain: u(
              'Everything that exists began as a gift. God did not need the world. He wanted it.',
              'Mọi sự hiện hữu đều khởi đầu như một món quà. Thiên Chúa không cần thế giới này. Ngài muốn nó.',
            ),
            original: 'In the beginning God created heaven, and earth. … And God said: Be light made. And light was made. (Douay–Rheims)',
          },
        },
        {
          id: 'c2',
          art: 'creation-world',
          text: u(
            'Day by day, the story unfolds like a song. Sky and sea. Land and green things growing. Sun, moon, and a sky full of stars.',
            'Ngày qua ngày, câu chuyện mở ra như một bài ca. Bầu trời và biển cả. Đất liền và cây cỏ xanh tươi. Mặt trời, mặt trăng, và một bầu trời đầy sao.',
          ),
        },
        {
          id: 'c3',
          art: 'creation-world',
          text: u(
            'Then fish for the seas, birds for the air, animals for the land. And after each day, God looks at what he has made and says the same thing: it is good.',
            'Rồi cá cho biển, chim cho trời, muông thú cho mặt đất. Sau mỗi ngày, Thiên Chúa nhìn những gì Ngài đã dựng nên và nói cùng một điều: thật là tốt đẹp.',
          ),
        },
        {
          id: 'c4',
          art: 'sky-flight',
          text: u(
            'You have seen the earth the way few people ever see it — from above, with the clouds below you like a white sea. The story says all of it was spoken into being, with care.',
            'Bạn đã thấy trái đất theo cách ít ai từng thấy — từ trên cao, với mây trắng trải dưới chân như một biển bông. Câu chuyện kể rằng tất cả được tạo thành bằng lời phán, với tình thương.',
          ),
        },
        {
          id: 'c5',
          art: 'creation-people',
          text: u(
            'And last of all, God makes people. Not as servants. As his own image in the world. We will open that part of the story tomorrow.',
            'Và sau cùng, Thiên Chúa dựng nên con người. Không phải làm tôi tớ. Mà là hình ảnh của chính Ngài giữa trần gian. Ngày mai chúng ta sẽ mở phần ấy của câu chuyện.',
          ),
        },
      ],
      questions: [
        {
          id: 'q1',
          kind: 'order',
          afterCard: 2,
          prompt: u('Put the days of creation in order.', 'Sắp xếp các ngày tạo dựng theo thứ tự.'),
          items: [
            u('Light', 'Ánh sáng'),
            u('Sky and sea', 'Bầu trời và biển'),
            u('Land and plants', 'Đất liền và cây cỏ'),
            u('Sun, moon, and stars', 'Mặt trời, mặt trăng và các vì sao'),
            u('Fish, birds, and animals', 'Cá, chim và muông thú'),
          ],
          why: u(
            'The story builds like a home being prepared — light first, then rooms, then the ones who will live in it.',
            'Câu chuyện được dựng như một ngôi nhà đang được chuẩn bị — ánh sáng trước, rồi các gian phòng, rồi những ai sẽ sống trong đó.',
          ),
        },
        {
          id: 'q2',
          kind: 'choice',
          prompt: u('After each day of creating, what does God say?', 'Sau mỗi ngày tạo dựng, Thiên Chúa nói gì?'),
          options: [
            { text: u('“It is good.”', '“Thật là tốt đẹp.”') },
            { text: u('“It is finished.”', '“Thế là xong.”') },
            { text: u('“It needs more work.”', '“Vẫn còn dang dở.”') },
          ],
          answer: 0,
          why: u(
            'Goodness is the world’s first review. The world is not an accident — it is a gift, and gifts are given with love.',
            'Lời khen đầu tiên của thế giới là “tốt đẹp”. Thế giới không phải ngẫu nhiên — mà là một món quà, và quà thì được trao bằng tình thương.',
          ),
        },
      ],
      treasure: {
        kind: 'art',
        art: 'creation-light',
        title: u('Let there be light', 'Phải có ánh sáng'),
        note: u(
          'For centuries, artists have painted this moment as gold breaking into deep blue — the same colors of a cathedral at evening when the candles are lit.',
          'Suốt nhiều thế kỷ, các nghệ sĩ vẽ khoảnh khắc này như ánh vàng bừng lên giữa nền xanh thẳm — cũng là màu của một nhà thờ lúc chiều tối khi nến được thắp lên.',
        ),
      },
      reflection: u('Where have you seen the world look like a gift?', 'Bạn đã thấy thế giới giống một món quà ở nơi nào?'),
      deeper: {
        ccc: [290, 299],
        note: u('On creation as good and as gift.', 'Về việc tạo dựng là tốt đẹp và là quà tặng.'),
      },
    },

    // ── Lesson 3: Made for Love ──────────────────────────────────────────
    {
      id: 'sinai-3',
      title: u('Made for Love', 'Được dựng nên cho tình yêu'),
      minutes: 4,
      door: {
        art: 'creation-people',
        line: u(
          'The last thing made, and the most loved.',
          'Điều được dựng nên sau cùng, và được yêu thương nhất.',
        ),
      },
      cards: [
        {
          id: 'c1',
          art: 'creation-people',
          text: u(
            'On the last day of the story, God makes something different. Not spoken from far away — shaped close, with care.',
            'Vào ngày cuối của câu chuyện, Thiên Chúa làm nên một điều khác biệt. Không phán từ xa — mà nắn nót thật gần, với tất cả ân cần.',
          ),
          scripture: {
            ref: 'Genesis 1:27',
            verse: u(
              'God created humanity in his own image. In the image of God he created them.',
              'Thiên Chúa dựng nên con người theo hình ảnh Ngài. Theo hình ảnh Thiên Chúa, Ngài đã dựng nên họ.',
            ),
            plain: u(
              'Every person carries a family resemblance to God. That is why every person matters — including you, exactly as you are.',
              'Mỗi con người đều mang nét giống với Thiên Chúa, như con giống cha mẹ. Vì thế mỗi người đều quý giá — kể cả bạn, đúng như bạn là.',
            ),
            bridge: u(
              'Almost every language has a saying about children carrying the family likeness. The Bible says the whole human family carries God’s.',
              'Hầu như ngôn ngữ nào cũng có câu nói về con cái mang nét giống gia đình — như câu “con nhà tông không giống lông cũng giống cánh”. Kinh Thánh nói cả gia đình nhân loại mang nét giống của Thiên Chúa.',
            ),
          },
        },
        {
          id: 'c2',
          art: 'creation-people',
          text: u(
            'Made in his image means: able to love, able to choose, able to know truth and make beauty. A mirror, small but real, of the one who is love.',
            'Mang hình ảnh Ngài nghĩa là: biết yêu thương, biết tự do chọn lựa, biết nhận ra sự thật và tạo nên cái đẹp. Một tấm gương nhỏ bé nhưng có thật, phản chiếu Đấng là tình yêu.',
          ),
        },
        {
          id: 'c3',
          art: 'candle-single',
          text: u(
            'This is why no person is ever worthless to God. Not the stranger in the crowd. Not the difficult neighbor. Not you on your worst day.',
            'Vì thế không một ai là vô giá trị trước mặt Thiên Chúa. Không phải người xa lạ giữa đám đông. Không phải người hàng xóm khó tính. Không phải bạn trong ngày tồi tệ nhất của mình.',
          ),
        },
        {
          id: 'c4',
          art: 'candle-single',
          text: u(
            'Perhaps you have seen someone cry quietly in a church. They were not crying because they were worthless. Perhaps they had just remembered that they were not.',
            'Có lẽ bạn từng thấy ai đó lặng lẽ khóc trong một nhà thờ. Họ không khóc vì thấy mình vô giá trị. Có lẽ họ vừa chợt nhớ ra điều ngược lại.',
          ),
        },
      ],
      questions: [
        {
          id: 'q1',
          kind: 'choice',
          afterCard: 1,
          prompt: u('What does “made in God’s image” mean?', '“Được dựng nên theo hình ảnh Thiên Chúa” nghĩa là gì?'),
          options: [
            { text: u('People look like God physically', 'Con người trông giống Thiên Chúa về ngoại hình') },
            { text: u('People can love, choose, and know truth, like him', 'Con người biết yêu thương, chọn lựa và nhận ra sự thật, giống như Ngài') },
            { text: u('Only very good people are God’s image', 'Chỉ người thật tốt mới là hình ảnh của Chúa') },
          ],
          answer: 1,
          why: u(
            'The likeness is in the heart, not the face — and every person carries it, always.',
            'Nét giống ấy ở trong tâm hồn, không phải gương mặt — và mỗi người đều mang nó, mãi mãi.',
          ),
        },
        {
          id: 'q2',
          kind: 'fill',
          prompt: u('Complete your first prayer.', 'Hoàn thành lời kinh đầu tiên của bạn.'),
          before: u('In the name of the Father, and of the Son,', 'Nhân danh Cha, và Con,'),
          after: u('Amen.', 'Amen.'),
          options: [
            u('and of the Holy Spirit.', 'và Thánh Thần.'),
            u('and of the angels.', 'và các thiên thần.'),
            u('and of the Church.', 'và Giáo hội.'),
          ],
          answer: 0,
          why: u(
            'Father, Son, and Holy Spirit — one God, a family of love. The little prayer holds the whole mystery.',
            'Cha, Con và Thánh Thần — một Thiên Chúa, một gia đình tình yêu. Lời kinh nhỏ bé chứa cả mầu nhiệm lớn lao.',
          ),
        },
      ],
      treasure: {
        kind: 'practice',
        title: u('A practice for this week', 'Một bài thực hành cho tuần này'),
        note: u(
          'Once this week, look at one stranger — on a train, on a flight, in a queue — and silently think: you are made in the image of God. Watch what it changes in you.',
          'Một lần trong tuần này, hãy nhìn một người xa lạ — trên tàu, trên chuyến bay, trong hàng chờ — và thầm nghĩ: bạn được dựng nên theo hình ảnh Thiên Chúa. Hãy xem điều đó thay đổi gì trong chính bạn.',
        ),
      },
      reflection: u('Who came to mind today?', 'Hôm nay bạn chợt nghĩ đến ai?'),
      deeper: {
        ccc: [355, 357],
        note: u('On the dignity of being made in God’s image.', 'Về phẩm giá của con người mang hình ảnh Thiên Chúa.'),
      },
    },

    // ── Lesson 4: You Already Pray ───────────────────────────────────────
    {
      id: 'sinai-4',
      title: u('You Already Pray', 'Bạn vẫn luôn cầu nguyện'),
      minutes: 4,
      door: {
        art: 'prayer-night',
        line: u(
          'A quiet room, late at night. A thought rises for the people you love.',
          'Một căn phòng yên tĩnh, đêm khuya. Một ý nghĩ dâng lên, hướng về những người bạn thương.',
        ),
      },
      cards: [
        {
          id: 'c1',
          art: 'prayer-night',
          text: u(
            'Perhaps someone taught you this — a mother, a grandmother: pray for the health and safety of the people you love. Never for money. Just for them.',
            'Có lẽ ai đó đã dạy bạn điều này — một người mẹ, một người bà: hãy cầu cho những người mình thương được mạnh khỏe, bình an. Đừng cầu tiền bạc. Chỉ cầu cho họ.',
          ),
        },
        {
          id: 'c2',
          art: 'prayer-night',
          text: u(
            'Here is something you should know: that is real {{prayer}}. Not practice for prayer. Not almost-prayer. The real thing.',
            'Đây là điều bạn nên biết: đó chính là {{prayer}} thật. Không phải tập dượt. Không phải gần giống. Mà là cầu nguyện thật sự.',
          ),
          terms: ['prayer'],
        },
        {
          id: 'c3',
          art: 'teacher-hill',
          text: u(
            'The Church says prayer is simply lifting the heart to God. A long ceremony can be prayer. So can three words whispered in the dark at 3 a.m.',
            'Giáo hội nói cầu nguyện đơn giản là nâng tâm hồn lên cùng Thiên Chúa. Một nghi lễ dài có thể là cầu nguyện. Ba lời thì thầm trong bóng đêm lúc 3 giờ sáng cũng vậy.',
          ),
        },
        {
          id: 'c4',
          art: 'teacher-hill',
          text: u('Jesus promised that this kind of asking is never wasted.', 'Chúa Giêsu hứa rằng lời cầu xin như thế không bao giờ vô ích.'),
          scripture: {
            ref: 'Matthew 7:7',
            verse: u(
              'Ask, and it will be given to you. Seek, and you will find. Knock, and the door will be opened.',
              'Hãy xin thì sẽ được. Hãy tìm thì sẽ thấy. Hãy gõ cửa thì cửa sẽ mở cho.',
            ),
            plain: u(
              'God is not annoyed by your asking. He is a Father — he wants to be asked, the way parents want to hear from their children.',
              'Thiên Chúa không phiền lòng khi bạn cầu xin. Ngài là Cha — Ngài muốn được nghe con cái xin, như cha mẹ mong nghe tiếng con mình.',
            ),
            bridge: u(
              'You knock on a door that is already being held open from the inside.',
              'Bạn gõ một cánh cửa vốn đã được giữ mở sẵn từ bên trong.',
            ),
          },
        },
        {
          id: 'c5',
          art: 'candle-single',
          text: u(
            'So nothing you have done needs to be thrown away. From here, the road only adds: new words, new friends to pray with, and a clearer face for the one listening.',
            'Vậy nên không điều gì bạn từng làm phải bỏ đi cả. Từ đây, con đường chỉ thêm vào: những lời kinh mới, những người bạn cùng cầu nguyện, và một gương mặt rõ hơn của Đấng đang lắng nghe.',
          ),
        },
      ],
      questions: [
        {
          id: 'q1',
          kind: 'choice',
          afterCard: 2,
          prompt: u('What is prayer, at its heart?', 'Cốt lõi của cầu nguyện là gì?'),
          options: [
            { text: u('Saying perfect words in church', 'Đọc những lời thật chuẩn trong nhà thờ') },
            { text: u('Lifting your heart to God', 'Nâng tâm hồn lên cùng Thiên Chúa') },
            { text: u('Asking for wealth and success', 'Cầu xin giàu sang và thành công') },
          ],
          answer: 1,
          why: u(
            'Words help, but the heart is the prayer. Yours has been praying for years.',
            'Lời kinh giúp ích, nhưng tấm lòng mới là lời cầu nguyện. Lòng bạn đã cầu nguyện từ nhiều năm rồi.',
          ),
        },
        {
          id: 'q2',
          kind: 'predict',
          prompt: u(
            'A friend says: “I only ever pray for my family’s safety. Is that allowed?” What would the Church say?',
            'Một người bạn nói: “Tôi chỉ biết cầu cho gia đình được bình an. Vậy có được không?” Giáo hội sẽ trả lời thế nào?',
          ),
          options: [
            { text: u('“That is real prayer. Begin there.”', '“Đó là cầu nguyện thật. Hãy bắt đầu từ đó.”') },
            { text: u('“No — only official prayers count.”', '“Không — chỉ kinh chính thức mới được tính.”') },
          ],
          answer: 0,
          why: u(
            'Love for others is where prayer most often begins. The official prayers are gifts added on top, not gates in front.',
            'Tình thương dành cho người khác thường là nơi cầu nguyện bắt đầu. Các kinh nguyện là quà tặng thêm vào, không phải cánh cổng chắn trước.',
          ),
        },
      ],
      treasure: {
        kind: 'practice',
        title: u('Tonight', 'Tối nay'),
        note: u(
          'Pray for your loved ones exactly the way you always have. Then add one small thing at the end: the Sign of the Cross. Your old prayer and your first Catholic prayer, together.',
          'Hãy cầu cho những người bạn thương đúng như bạn vẫn làm. Rồi thêm một điều nhỏ ở cuối: Dấu Thánh Giá. Lời cầu quen thuộc của bạn và lời kinh Công giáo đầu tiên, cùng nhau.',
        ),
      },
      reflection: u('Who do you always pray for?', 'Bạn vẫn luôn cầu nguyện cho ai?'),
      deeper: {
        ccc: [2559, 2560],
        note: u('On what prayer is.', 'Về cầu nguyện là gì.'),
      },
    },

    // ── Lesson 5: The Prayer Jesus Taught ────────────────────────────────
    {
      id: 'sinai-5',
      title: u('The Prayer Jesus Taught', 'Lời kinh Chúa Giêsu dạy'),
      minutes: 5,
      door: {
        art: 'teacher-hill',
        line: u(
          'One day his friends watched Jesus praying. When he finished, they asked him for something.',
          'Một ngày kia, các bạn hữu thấy Chúa Giêsu cầu nguyện. Khi Ngài xong, họ xin Ngài một điều.',
        ),
      },
      cards: [
        {
          id: 'c1',
          art: 'teacher-hill',
          text: u(
            '“Lord, teach us to pray.” They had watched him slip away to quiet places, and come back changed. They wanted what he had.',
            '“Thưa Thầy, xin dạy chúng con cầu nguyện.” Họ từng thấy Ngài lánh vào nơi thanh vắng, rồi trở lại như được đổi mới. Họ muốn điều Ngài đang có.',
          ),
        },
        {
          id: 'c2',
          art: 'teacher-hill',
          text: u(
            'He did not give them a long ceremony. He gave them a few lines, short enough to carry anywhere. It begins: Our Father.',
            'Ngài không trao cho họ một nghi lễ dài. Ngài trao vài dòng ngắn, đủ gọn để mang theo bất cứ đâu. Kinh ấy mở đầu: Lạy Cha chúng con.',
          ),
        },
        {
          id: 'c3',
          art: 'creation-light',
          text: u(
            '“Our Father, who art in heaven, hallowed be thy name.” In plain words: Father of us all, your name is holy — may the whole world come to treasure it.',
            '“Lạy Cha chúng con ở trên trời, chúng con nguyện danh Cha cả sáng.” Nói đơn giản: Cha của tất cả chúng con, danh Cha là thánh — xin cho cả thế giới biết quý trọng danh ấy.',
          ),
        },
        {
          id: 'c4',
          art: 'creation-world',
          text: u(
            '“Give us this day our daily bread.” Not riches. Just what we need for today — food, strength, enough. Whoever taught you to pray for people, not money, would recognize this prayer.',
            '“Xin Cha cho chúng con hôm nay lương thực hằng ngày.” Không phải giàu sang. Chỉ là điều cần cho hôm nay — cơm ăn, sức khỏe, vừa đủ. Người từng dạy bạn cầu cho con người chứ đừng cầu tiền bạc hẳn sẽ nhận ra lời cầu này.',
          ),
        },
        {
          id: 'c5',
          art: 'cross-dawn',
          text: u(
            '“Forgive us, as we forgive others.” The hardest line, and the most freeing. We ask for mercy and pass mercy on, like a light handed from candle to candle.',
            '“Xin tha nợ chúng con, như chúng con cũng tha kẻ có nợ chúng con.” Dòng khó nhất, và cũng giải thoát nhất. Ta xin lòng thương xót và trao tiếp lòng thương xót, như ngọn lửa chuyền từ nến này sang nến khác.',
          ),
        },
        {
          id: 'c6',
          art: 'prayer-night',
          text: u(
            'Catholics have prayed these lines every day for two thousand years, in every language on earth — somewhere, someone is praying them this very evening.',
            'Người Công giáo đã đọc những dòng này mỗi ngày suốt hai ngàn năm, bằng mọi ngôn ngữ trên trái đất — ngay buổi chiều hôm nay, ở đâu đó, vẫn đang có người đọc lên những lời ấy.',
          ),
        },
      ],
      questions: [
        {
          id: 'q1',
          kind: 'fill',
          afterCard: 3,
          prompt: u('Complete the line.', 'Hoàn thành câu kinh.'),
          before: u('Give us this day our daily', 'Xin Cha cho chúng con hôm nay'),
          after: u('…', '…'),
          options: [
            u('bread.', 'lương thực hằng ngày.'),
            u('gold.', 'vàng bạc.'),
            u('plans.', 'kế hoạch.'),
          ],
          answer: 0,
          why: u(
            'Daily bread — just enough for today. The prayer trusts tomorrow to the Father.',
            'Lương thực hằng ngày — vừa đủ cho hôm nay. Lời kinh phó thác ngày mai cho Cha.',
          ),
        },
        {
          id: 'q2',
          kind: 'choice',
          prompt: u('In the Our Father, what do we ask God to forgive?', 'Trong Kinh Lạy Cha, chúng ta xin Chúa tha điều gì?'),
          options: [
            { text: u('Our trespasses — the wrongs we have done', 'Nợ của chúng ta — những lỗi lầm ta đã phạm') },
            { text: u('Our questions', 'Những câu hỏi của chúng ta') },
            { text: u('Our slowness', 'Sự chậm chạp của chúng ta') },
          ],
          answer: 0,
          why: u(
            'And in the same breath we promise to forgive others. Mercy received becomes mercy given.',
            'Và trong cùng một hơi thở, ta hứa tha thứ cho người khác. Lòng thương xót nhận được trở thành lòng thương xót trao đi.',
          ),
        },
        {
          id: 'q3',
          kind: 'order',
          prompt: u('Put the opening of the Our Father in order.', 'Sắp xếp phần mở đầu Kinh Lạy Cha theo thứ tự.'),
          items: [
            u('Our Father, who art in heaven,', 'Lạy Cha chúng con ở trên trời,'),
            u('hallowed be thy name.', 'chúng con nguyện danh Cha cả sáng,'),
            u('Thy kingdom come,', 'nước Cha trị đến,'),
            u('thy will be done on earth as it is in heaven.', 'ý Cha thể hiện dưới đất cũng như trên trời.'),
          ],
          why: u(
            'First we look at the Father; only then do we ask. The order itself is a small lesson.',
            'Trước hết ta hướng nhìn lên Cha; rồi mới cầu xin. Chính thứ tự ấy cũng là một bài học nhỏ.',
          ),
        },
      ],
      treasure: {
        kind: 'prayer',
        prayerId: 'our-father',
        note: u(
          'The whole prayer now rests in your chapel. One line a day is enough — it has been memorized that way for twenty centuries.',
          'Trọn lời kinh giờ đây được giữ trong nhà nguyện của bạn. Mỗi ngày một câu là đủ — hai mươi thế kỷ qua người ta vẫn thuộc kinh theo cách ấy.',
        ),
      },
      reflection: u('Which line of the Our Father feels most like yours?', 'Câu nào trong Kinh Lạy Cha nghe giống lời của chính bạn nhất?'),
      deeper: {
        ccc: [2759, 2761],
        note: u('The Our Father as the summary of the whole Gospel.', 'Kinh Lạy Cha là bản tóm lược của cả Tin Mừng.'),
      },
    },

    // ── Lesson 6: The Family Altar ───────────────────────────────────────
    {
      id: 'sinai-6',
      title: u('The Family Altar', 'Bàn thờ gia đình'),
      minutes: 5,
      door: {
        art: 'incense-altar',
        line: u(
          'A small shrine at home. Photographs, fruit, and the smell of incense. Many of us know this room.',
          'Một bàn thờ nhỏ trong nhà. Di ảnh, hoa quả, và mùi hương trầm. Nhiều người trong chúng ta biết rõ căn phòng này.',
        ),
      },
      cards: [
        {
          id: 'c1',
          art: 'incense-altar',
          text: u(
            'In millions of homes — in Việt Nam, in China, in Korea, in Mexico — there is a family altar. Incense is lit. The dead are remembered with love and respect. Perhaps you grew up with one; perhaps you have stood before one.',
            'Trong hàng triệu mái nhà — ở Việt Nam, Trung Quốc, Hàn Quốc, Mexico — có một bàn thờ gia đình. Hương được thắp lên. Người đã khuất được tưởng nhớ bằng tình thương và lòng kính trọng. Có lẽ bạn đã lớn lên bên một bàn thờ như thế; có lẽ bạn từng đứng trước một bàn thờ như thế.',
          ),
        },
        {
          id: 'c2',
          art: 'incense-altar',
          text: u(
            'Here is something that may surprise you: this instinct has a home in the Catholic Church too.',
            'Có một điều có thể khiến bạn ngạc nhiên: tấm lòng ấy cũng có một mái nhà trong Giáo hội Công giáo.',
          ),
        },
        {
          id: 'c3',
          art: 'candle-single',
          text: u(
            'Catholics also remember and honor their beloved dead. We pray for them. We light candles for them. We believe death does not cut the thread of the family.',
            'Người Công giáo cũng tưởng nhớ và tôn kính người thân đã khuất. Chúng ta cầu nguyện cho họ. Thắp nến cho họ. Chúng ta tin sự chết không cắt đứt sợi dây gia đình.',
          ),
        },
        {
          id: 'c4',
          art: 'incense-altar',
          text: u(
            'The Church calls this the {{communion-of-saints}}: one family — the living on earth, and those who live with God — still connected, still caring for one another.',
            'Giáo hội gọi điều này là {{communion-of-saints}}: một gia đình — người đang sống ở trần gian, và những người đang sống với Thiên Chúa — vẫn liên kết, vẫn yêu thương nhau.',
          ),
          terms: ['communion-of-saints'],
        },
        {
          id: 'c5',
          art: 'incense-altar',
          text: u(
            'Even the incense is at home in church. The Bible pictures prayers rising to God exactly like its smoke.',
            'Ngay cả hương trầm cũng quen thuộc trong nhà thờ. Kinh Thánh hình dung lời cầu nguyện bay lên tới Thiên Chúa đúng như làn khói hương.',
          ),
          scripture: {
            ref: 'Revelation 8:4',
            verse: u(
              'The smoke of the incense rose up before God, together with the prayers of his people.',
              'Khói hương quyện theo lời cầu nguyện của dân Chúa, bay lên trước nhan Thiên Chúa.',
            ),
            plain: u(
              'If you have ever watched incense curl upward at a family altar, you were looking at the Bible’s own picture of prayer.',
              'Nếu bạn từng nhìn khói hương uốn mình bay lên nơi một bàn thờ gia đình, bạn đã nhìn thấy chính hình ảnh mà Kinh Thánh dùng để nói về cầu nguyện.',
            ),
          },
        },
        {
          id: 'c6',
          art: 'cross-dawn',
          text: u(
            'One distinction matters, and it is a kind one. Catholics {{venerate}} the saints and the dead — deep honor, like bowing to your elders. Worship belongs to God alone. Honor for the family; worship for the Father.',
            'Có một phân biệt quan trọng, và rất nhân hậu. Người Công giáo {{venerate}} các thánh và người đã khuất — lòng tôn kính sâu xa, như cúi mình trước bậc trưởng thượng. Còn thờ phượng thì chỉ dành cho một mình Thiên Chúa. Tôn kính dành cho gia đình; thờ phượng dành cho Cha.',
          ),
          terms: ['venerate'],
        },
      ],
      questions: [
        {
          id: 'q1',
          kind: 'choice',
          afterCard: 3,
          prompt: u('Do Catholics worship the saints and the dead?', 'Người Công giáo có thờ phượng các thánh và người đã khuất không?'),
          options: [
            { text: u('Yes — saints are small gods', 'Có — các thánh là những vị thần nhỏ') },
            { text: u('No — they honor them and ask them to pray; worship is for God alone', 'Không — họ tôn kính và xin các ngài cầu nguyện; thờ phượng chỉ dành cho Thiên Chúa') },
          ],
          answer: 1,
          why: u(
            'Honor and worship are different rooms. Saints are family, asked to pray for us — the way you might ask your mother to pray for you.',
            'Tôn kính và thờ phượng là hai điều khác nhau. Các thánh là người nhà, được xin cầu nguyện cho ta — như bạn có thể xin mẹ cầu nguyện cho mình.',
          ),
        },
        {
          id: 'q2',
          kind: 'match',
          prompt: u('Match each symbol to its meaning.', 'Ghép mỗi biểu tượng với ý nghĩa của nó.'),
          pairs: [
            {
              symbol: 'symbol-incense',
              label: u('Incense', 'Hương'),
              meaning: u('Prayers rising to God', 'Lời cầu nguyện bay lên tới Thiên Chúa'),
            },
            {
              symbol: 'symbol-light',
              label: u('Light', 'Ánh sáng'),
              meaning: u('Christ present in the dark', 'Chúa Kitô hiện diện giữa bóng tối'),
            },
            {
              symbol: 'symbol-water',
              label: u('Water', 'Nước'),
              meaning: u('Washing clean; new life', 'Rửa sạch; sự sống mới'),
            },
            {
              symbol: 'symbol-cross',
              label: u('The Cross', 'Thánh giá'),
              meaning: u('Love that gives everything', 'Tình yêu trao hiến tất cả'),
            },
          ],
        },
      ],
      treasure: {
        kind: 'word',
        termId: 'communion-of-saints',
        note: u(
          'A word for something many hearts have always known: the family does not end at death. A family altar at home and the candles in a cathedral are nearer to each other than they look.',
          'Một từ cho điều mà bao trái tim vốn đã luôn biết: gia đình không kết thúc nơi sự chết. Bàn thờ gia đình ở nhà và những ngọn nến trong nhà thờ gần nhau hơn vẻ ngoài của chúng.',
        ),
      },
      reflection: u('Who would you light a candle for?', 'Bạn muốn thắp một ngọn nến cho ai?'),
      deeper: {
        ccc: [946, 957, 958],
        note: u('On the communion of saints and prayer for the dead.', 'Về Các Thánh thông công và việc cầu nguyện cho người đã khuất.'),
      },
    },

    // ── Vigil: Night on the Mountain ─────────────────────────────────────
    {
      id: 'sinai-vigil',
      vigil: true,
      title: u('Vigil: Night on the Mountain', 'Canh thức: Đêm trên núi thánh'),
      minutes: 6,
      door: {
        art: 'sinai-mountain',
        line: u(
          'No questions tonight. Only the desert, the stars, and everything you have learned.',
          'Tối nay không có câu hỏi. Chỉ có sa mạc, những vì sao, và tất cả những gì bạn đã học.',
        ),
      },
      cards: [
        {
          id: 'c1',
          art: 'sinai-mountain',
          text: u(
            'Night falls on the desert. At the foot of the mountain, the ancient monastery lights one window, like a candle. Pilgrims have climbed this path for seventeen centuries.',
            'Đêm buông trên sa mạc. Dưới chân núi, tu viện cổ thắp sáng một ô cửa sổ, như một ngọn nến. Mười bảy thế kỷ qua, khách hành hương vẫn leo lên con đường này.',
          ),
        },
        {
          id: 'c2',
          art: 'sinai-bush',
          text: u(
            'You began at a fire that did not consume, and a voice that knew a shepherd’s name. It knows yours too.',
            'Bạn đã khởi đầu bên một ngọn lửa không thiêu rụi, và một tiếng nói biết tên người chăn chiên. Tiếng nói ấy cũng biết tên bạn.',
          ),
        },
        {
          id: 'c3',
          art: 'creation-light',
          text: u(
            'You have learned the beginning of everything: a God who is love, who spoke light into darkness, and called the world good.',
            'Bạn đã học về khởi đầu của muôn loài: một Thiên Chúa là tình yêu, Đấng phán ánh sáng vào bóng tối, và gọi thế giới là tốt đẹp.',
          ),
        },
        {
          id: 'c4',
          art: 'creation-people',
          text: u(
            'You have learned what you are: his image. Not a servant, not an accident. A child of the family.',
            'Bạn đã học mình là gì: hình ảnh của Ngài. Không phải tôi tớ, không phải tình cờ. Mà là một người con trong gia đình.',
          ),
        },
        {
          id: 'c5',
          art: 'prayer-night',
          text: u(
            'You have learned that your prayers were always real, and you have been given the prayer Jesus taught, and the small cross traced over your heart.',
            'Bạn đã biết những lời cầu của mình vẫn luôn là thật, và bạn đã được trao lời kinh Chúa Giêsu dạy, cùng dấu Thánh giá nhỏ vẽ trên trái tim mình.',
          ),
        },
        {
          id: 'c6',
          art: 'incense-altar',
          text: u(
            'You have learned that incense rising for the beloved dead rises in churches too, and that the family — living and dead — is held in one communion.',
            'Bạn đã biết làn hương dâng lên cho người thân đã khuất cũng bay lên trong các nhà thờ, và rằng gia đình — người sống lẫn người đã khuất — được giữ trong cùng một mối hiệp thông.',
          ),
        },
        {
          id: 'c7',
          art: 'sinai-mountain',
          text: u(
            'The first page of your passport is ready for its stamp. The road now leaves the desert — toward Jerusalem, and the story of a man named Jesus.',
            'Trang đầu tiên trong hộ chiếu của bạn đã sẵn sàng để đóng dấu. Con đường giờ rời sa mạc — hướng về Giêrusalem, và câu chuyện về một người tên là Giêsu.',
          ),
        },
      ],
      questions: [],
      treasure: {
        kind: 'art',
        art: 'sinai-mountain',
        title: u('The mountain of the name', 'Ngọn núi của Danh Thánh'),
        note: u(
          'St. Catherine’s Monastery at the foot of Sinai has kept a chapel of the Burning Bush since the year 330 — one of the oldest continuously used churches on earth. The fire, so to speak, has never gone out.',
          'Tu viện Thánh Catarina dưới chân núi Sinai gìn giữ nhà nguyện Bụi Gai Cháy từ năm 330 — một trong những nhà thờ được sử dụng liên tục lâu đời nhất trái đất. Có thể nói: ngọn lửa ấy chưa bao giờ tắt.',
        ),
      },
      reflection: u('Looking back on this first stretch of road — what surprised you?', 'Nhìn lại đoạn đường đầu tiên này — điều gì khiến bạn ngạc nhiên?'),
    },
  ],
};
