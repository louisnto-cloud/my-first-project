import type { L, Lesson } from '../types';

// ─── World 5 · Her Parish · "Living It" ─────────────────────────────────────
// The final world of the main road: the moral life as a way of love, the
// liturgical year, the saints, hope — and her own OCIA milestones, leading
// to the font.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export const PARISH_LESSONS: Lesson[] = [
  // ── 1: The Greatest Commandment ────────────────────────────────────────
  {
    id: 'parish-1',
    title: u('The Greatest Commandment', 'Điều răn lớn nhất'),
    minutes: 4,
    door: {
      art: 'parish-home',
      line: u(
        'The last world is the nearest one: your parish, and the question of how to live.',
        'Chặng đường cuối là chặng gần nhất: giáo xứ của bạn, và câu hỏi phải sống thế nào.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'parish-home',
        text: u(
          'A scholar once asked Jesus to name the greatest commandment of the hundreds in the law. He answered with two that are really one.',
          'Một nhà thông luật từng xin Chúa Giêsu nêu điều răn lớn nhất giữa hàng trăm điều trong lề luật. Ngài trả lời bằng hai điều mà thật ra là một.',
        ),
        scripture: {
          ref: 'Matthew 22:37–39',
          verse: u(
            'Love the Lord your God with all your heart, soul, and mind. And love your neighbor as yourself.',
            'Hãy yêu mến Chúa là Thiên Chúa ngươi hết lòng, hết linh hồn và hết trí khôn. Và hãy yêu người thân cận như chính mình.',
          ),
          plain: u(
            'Everything the Church asks of anyone hangs on these two lines. The rest is commentary, guard rails, and help.',
            'Mọi điều Giáo hội mời gọi nơi bất cứ ai đều treo trên hai dòng này. Phần còn lại là chú giải, lan can bảo vệ, và sự trợ giúp.',
          ),
        },
      },
      {
        id: 'c2',
        art: 'commandments-tablets',
        text: u(
          'Your mother taught you a version of this before you ever opened this app: pray for people, be good to people, never pray for money. She was closer to the heart of it than many lifelong believers.',
          'Mẹ bạn đã dạy bạn một phiên bản của điều này từ trước khi bạn mở ứng dụng: cầu nguyện cho người khác, sống tốt với người khác, đừng bao giờ cầu tiền bạc. Bà gần với cốt lõi hơn nhiều người giữ đạo cả đời.',
        ),
      },
      {
        id: 'c3',
        art: 'samaritan-road',
        text: u(
          'Notice the order, though: God first, neighbor second — not because people matter less, but because love needs a source. A lamp must be plugged in before it can light a room.',
          'Nhưng hãy để ý thứ tự: Thiên Chúa trước, người thân cận sau — không phải vì con người kém quan trọng, mà vì tình yêu cần một nguồn mạch. Ngọn đèn phải được cắm điện trước khi soi sáng căn phòng.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 0,
        prompt: u('What does everything else in Christian living hang on?', 'Mọi điều khác trong đời sống Kitô hữu treo trên điều gì?'),
        options: [
          { text: u('Love God; love your neighbor', 'Yêu mến Thiên Chúa; yêu người thân cận') },
          { text: u('Memorizing all the rules', 'Thuộc lòng mọi luật lệ') },
        ],
        answer: 0,
        why: u(
          'Two lines. If a rule ever seems to contradict love, you have misunderstood either the rule or love.',
          'Hai dòng. Nếu một luật lệ nào đó có vẻ nghịch với tình yêu, thì bạn đã hiểu sai hoặc luật ấy, hoặc tình yêu.',
        ),
      },
      {
        id: 'q2',
        kind: 'predict',
        prompt: u('Jesus is asked for ONE commandment. Why answer with two?', 'Người ta xin MỘT điều răn. Vì sao Chúa Giêsu trả lời bằng hai?'),
        options: [
          { text: u('Because they cannot be separated', 'Vì hai điều ấy không thể tách rời') },
          { text: u('Because he misheard the question', 'Vì Ngài nghe nhầm câu hỏi') },
        ],
        answer: 0,
        why: u(
          'Love of God that ignores people is fantasy; love of people that ignores God runs out of fuel. They are one movement.',
          'Yêu Chúa mà bỏ quên con người là ảo tưởng; yêu con người mà bỏ quên Thiên Chúa thì cạn nhiên liệu. Đó là một chuyển động duy nhất.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('The two-line examination', 'Xét mình bằng hai dòng'),
      note: u(
        'Tonight, instead of counting faults, ask two questions: where did I love today? Where did I hold love back? That is the oldest Christian evening practice, in its simplest form.',
        'Tối nay, thay vì đếm lỗi, hãy hỏi hai câu: hôm nay tôi đã yêu thương ở đâu? Tôi đã giữ tình yêu lại ở đâu? Đó là việc xét mình buổi tối cổ xưa nhất của Kitô giáo, trong hình thức đơn sơ nhất.',
      ),
    },
    reflection: u('Where did you love today?', 'Hôm nay bạn đã yêu thương ở đâu?'),
    deeper: {
      ccc: [2055, 1822],
      note: u('On the great commandment and charity.', 'Về điều răn lớn nhất và đức ái.'),
    },
  },

  // ── 2: Ten Words of Freedom ────────────────────────────────────────────
  {
    id: 'parish-2',
    title: u('Ten Words of Freedom', 'Mười lời của tự do'),
    minutes: 5,
    door: {
      art: 'commandments-tablets',
      line: u(
        'The Ten Commandments — not a cage, but the fence at the cliff edge.',
        'Mười Điều Răn — không phải chiếc lồng, mà là hàng rào nơi mép vực.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'commandments-tablets',
        text: u(
          'They were given to people who had just been freed from slavery — that matters. The Ten Commandments are not how to earn God’s love. They are how freed people stay free.',
          'Mười Điều Răn được trao cho một dân vừa thoát kiếp nô lệ — điều đó rất quan trọng. Mười Điều Răn không phải cách kiếm tình yêu của Thiên Chúa. Mà là cách những người đã được tự do giữ lấy tự do.',
        ),
      },
      {
        id: 'c2',
        art: 'commandments-tablets',
        text: u(
          'The first three guard love of God: no other gods, no contempt for his name, keep his day holy. The other seven guard love of people: honor your parents; do not kill, betray, steal, lie, or let envy eat you.',
          'Ba điều đầu gìn giữ tình yêu với Thiên Chúa: không thờ thần nào khác, không xúc phạm danh Ngài, giữ ngày của Ngài nên thánh. Bảy điều sau gìn giữ tình yêu với con người: thảo kính cha mẹ; chớ giết người, chớ phản bội, chớ trộm cắp, chớ làm chứng dối, chớ để lòng ghen tị gặm nhấm mình.',
        ),
      },
      {
        id: 'c3',
        art: 'incense-altar',
        text: u(
          '“Honor your father and your mother” — the fourth word — will sound familiar. Your whole culture is built on it. Vietnam has been keeping the fourth commandment beautifully for a very long time.',
          '“Thảo kính cha mẹ” — lời thứ tư — nghe thật quen thuộc. Cả nền văn hóa của bạn được xây trên đó. Việt Nam đã giữ điều răn thứ tư một cách tuyệt đẹp từ rất lâu rồi.',
        ),
      },
      {
        id: 'c4',
        art: 'teacher-hill',
        text: u(
          'Jesus did not cancel the ten — he deepened them. Not only do not kill, but do not nurse contempt. Not only do not lie, but let your yes mean yes. The fence became a compass.',
          'Chúa Giêsu không hủy bỏ mười điều — Ngài đào sâu chúng. Không chỉ chớ giết người, mà đừng nuôi lòng khinh ghét. Không chỉ chớ nói dối, mà hãy để tiếng “có” của con thật là có. Hàng rào trở thành la bàn.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 0,
        prompt: u('Who first received the Ten Commandments?', 'Ai là những người đầu tiên nhận Mười Điều Răn?'),
        options: [
          { text: u('People just freed from slavery', 'Một dân vừa được giải thoát khỏi kiếp nô lệ') },
          { text: u('Kings who needed laws for others', 'Các vị vua cần luật cho người khác') },
        ],
        answer: 0,
        why: u(
          'Freedom came first; the commandments came to protect it. The order tells you what kind of God this is.',
          'Tự do đến trước; các điều răn đến để gìn giữ nó. Thứ tự ấy cho bạn biết Thiên Chúa là Đấng thế nào.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('Which commandment has your culture been keeping all along?', 'Điều răn nào nền văn hóa của bạn vẫn luôn gìn giữ?'),
        options: [
          { text: u('Honor your father and your mother', 'Thảo kính cha mẹ') },
          { text: u('Keep holy the Sabbath', 'Giữ ngày Chúa nhật') },
        ],
        answer: 0,
        why: u(
          'The family shrine, the anniversaries of the dead, the deep bow to elders — the fourth word, lived for centuries.',
          'Bàn thờ gia đình, ngày giỗ, cái cúi đầu sâu trước bậc trưởng thượng — lời thứ tư, được sống suốt bao thế kỷ.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'commandments-tablets',
      title: u('The ten words', 'Mười lời'),
      note: u(
        'In Hebrew they are simply called “the ten words.” Artists draw them as two tablets: three lines and seven, with one heart over both.',
        'Trong tiếng Híp-ri, chúng được gọi đơn giản là “mười lời.” Các nghệ sĩ vẽ hai bia đá: ba dòng và bảy dòng, với một trái tim phủ trên cả hai.',
      ),
    },
    reflection: u('Which of the ten is hardest for you, honestly?', 'Thật lòng, điều nào trong mười điều là khó nhất với bạn?'),
    deeper: {
      ccc: [2057, 2196],
      note: u('On the commandments as the way of freedom and love.', 'Về các điều răn là con đường của tự do và tình yêu.'),
    },
  },

  // ── 3: The Beatitudes ──────────────────────────────────────────────────
  {
    id: 'parish-3',
    title: u('Blessed Are…', 'Phúc cho ai…'),
    minutes: 4,
    door: {
      art: 'teacher-hill',
      line: u(
        'On a hillside, Jesus described the kind of person heaven recognizes. None of it is what anyone expected.',
        'Trên một sườn đồi, Chúa Giêsu mô tả mẫu người mà Thiên đàng nhận ra. Không điều nào như người ta mong đợi.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'teacher-hill',
        text: u(
          'Blessed are the poor in spirit. Blessed are those who mourn. The merciful. The pure of heart. The peacemakers. Those who hunger for justice. Those persecuted for doing right.',
          'Phúc cho ai có tâm hồn nghèo khó. Phúc cho ai sầu khổ. Người có lòng thương xót. Người có tâm hồn trong sạch. Người xây dựng hòa bình. Người đói khát sự công chính. Người bị bách hại vì lẽ phải.',
        ),
      },
      {
        id: 'c2',
        art: 'teacher-hill',
        text: u(
          'Notice who is missing: the rich, the powerful, the winners, the loud. The Beatitudes are heaven’s upside-down guest list — and the self-portrait of Jesus himself.',
          'Hãy để ý ai vắng mặt: người giàu, kẻ quyền thế, người chiến thắng, kẻ ồn ào. Các Mối Phúc là danh sách khách mời lộn ngược của Thiên đàng — và là bức chân dung tự họa của chính Chúa Giêsu.',
        ),
      },
      {
        id: 'c3',
        art: 'martyrs-palm',
        text: u(
          'The Ten Commandments are the floor — the minimum that keeps love safe. The Beatitudes are the ceiling opened to the sky: what a life can become. The martyrs of your homeland lived the last beatitude to the end.',
          'Mười Điều Răn là sàn nhà — mức tối thiểu giữ cho tình yêu an toàn. Các Mối Phúc là trần nhà mở ra bầu trời: một đời người có thể trở thành gì. Các thánh tử đạo của quê hương bạn đã sống mối phúc cuối cùng cho đến tận cùng.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('Whose portrait are the Beatitudes, most of all?', 'Các Mối Phúc là chân dung của ai, trước hết?'),
        options: [
          { text: u('Jesus himself', 'Chính Chúa Giêsu') },
          { text: u('Successful religious leaders', 'Các lãnh đạo tôn giáo thành đạt') },
        ],
        answer: 0,
        why: u(
          'Poor, mourning, merciful, pure, peacemaking, persecuted — he was describing the life he was about to live.',
          'Nghèo khó, sầu khổ, thương xót, trong sạch, xây dựng hòa bình, bị bách hại — Ngài đang mô tả chính cuộc đời Ngài sắp sống.',
        ),
      },
      {
        id: 'q2',
        kind: 'fill',
        prompt: u('Complete the beatitude.', 'Hoàn thành mối phúc.'),
        before: u('Blessed are the merciful,', 'Phúc cho ai có lòng thương xót,'),
        after: u('…', '…'),
        options: [
          u('for they will be shown mercy.', 'vì họ sẽ được xót thương.'),
          u('for they will be famous.', 'vì họ sẽ nổi danh.'),
          u('for they will be safe.', 'vì họ sẽ được an toàn.'),
        ],
        answer: 0,
        why: u(
          'What you give is what you receive back, pressed down and overflowing. Mercy is the only investment with that guarantee.',
          'Điều bạn trao đi là điều bạn nhận lại, được đong đầy và tràn trề. Lòng thương xót là khoản đầu tư duy nhất có bảo đảm ấy.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('One beatitude, one week', 'Một mối phúc, một tuần'),
      note: u(
        'Pick the beatitude that names something you already long for — peace, mercy, justice — and let it be your compass for one week. The Beatitudes are not assignments; they are invitations.',
        'Hãy chọn mối phúc gọi đúng tên điều bạn vốn khao khát — bình an, lòng thương xót, sự công chính — và để nó làm la bàn cho bạn trong một tuần. Các Mối Phúc không phải bài tập; chúng là những lời mời.',
      ),
    },
    reflection: u('Which beatitude already sounds like you?', 'Mối phúc nào nghe đã giống bạn rồi?'),
    deeper: {
      ccc: [1716, 1717],
      note: u('On the Beatitudes as the heart of Jesus’ preaching.', 'Về các Mối Phúc là trái tim lời rao giảng của Chúa Giêsu.'),
    },
  },

  // ── 4: The Family Rhythm ───────────────────────────────────────────────
  {
    id: 'parish-4',
    title: u('The Family Rhythm', 'Nhịp sống của gia đình'),
    minutes: 4,
    door: {
      art: 'parish-home',
      line: u(
        'Five small habits that keep a Catholic connected — the minimum heartbeat, explained plainly.',
        'Năm thói quen nhỏ giữ người Công giáo gắn kết — nhịp tim tối thiểu, được giải thích đơn sơ.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'parish-home',
        text: u(
          'Every family has rhythms that hold it together: Sunday dinners, Tết visits, calls home. The Church has five, called the precepts. They are floors, not ceilings.',
          'Mỗi gia đình đều có những nhịp sống giữ mình gắn bó: bữa cơm Chúa nhật, thăm nhau ngày Tết, những cuộc gọi về nhà. Giáo hội có năm nhịp như thế, gọi là các điều luật Hội Thánh. Chúng là sàn nhà, không phải trần nhà.',
        ),
      },
      {
        id: 'c2',
        art: 'mass-altar',
        text: u(
          'One: Mass on Sundays and the great feasts. Two: confession at least once a year. Three: communion at least each Easter season. Four: the Church’s days of fasting. Five: help support the Church’s needs, each as they are able.',
          'Một: dự Thánh lễ Chúa nhật và các lễ buộc. Hai: xưng tội ít là mỗi năm một lần. Ba: rước lễ ít là trong mùa Phục Sinh. Bốn: giữ các ngày ăn chay kiêng thịt của Giáo hội. Năm: góp phần nâng đỡ các nhu cầu của Giáo hội, tùy khả năng mỗi người.',
        ),
      },
      {
        id: 'c3',
        art: 'sky-flight',
        text: u(
          'A note written for you: travelers are not graded down. When work puts you over an ocean on a Sunday, the obligation yields — and any Mass in any city in any language counts. The family table is everywhere.',
          'Một ghi chú dành riêng cho bạn: người lữ hành không bị trừ điểm. Khi công việc đặt bạn trên đại dương vào một ngày Chúa nhật, luật buộc được nhường bước — và bất cứ Thánh lễ nào, ở bất cứ thành phố nào, bằng bất cứ ngôn ngữ nào, đều được kể. Bàn ăn của gia đình này có mặt khắp nơi.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 1,
        prompt: u('What are the precepts of the Church for?', 'Các điều luật Hội Thánh để làm gì?'),
        options: [
          { text: u('The minimum rhythm that keeps the connection alive', 'Nhịp tối thiểu giữ cho sự gắn kết sống động') },
          { text: u('Tests to qualify for heaven', 'Các bài kiểm tra để đủ điều kiện vào Thiên đàng') },
        ],
        answer: 0,
        why: u(
          'Like calling your mother: the point is not the rule, the point is not drifting apart.',
          'Như việc gọi điện cho mẹ: vấn đề không phải là luật, mà là để không dần xa nhau.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('You land in Brussels on a Sunday. Which Mass counts?', 'Bạn hạ cánh ở Brussels vào Chúa nhật. Thánh lễ nào được kể?'),
        options: [
          { text: u('Any Catholic Mass, in any language', 'Bất cứ Thánh lễ Công giáo nào, bằng bất cứ ngôn ngữ nào') },
          { text: u('Only one in Vietnamese', 'Chỉ Thánh lễ tiếng Việt') },
        ],
        answer: 0,
        why: u(
          'You have already attended Mass in a language you did not speak — it counted, and it moved you. Now you know why it could.',
          'Bạn đã từng dự Thánh lễ bằng một ngôn ngữ mình không biết — lễ ấy được kể, và đã làm bạn xúc động. Giờ bạn hiểu vì sao điều đó có thể xảy ra.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('The traveler’s habit', 'Thói quen của người lữ hành'),
      note: u(
        'Before your next trip, look up one church near your layover hotel. Even ten minutes inside, on a weekday, with no Mass at all — the red lamp will be burning. You know what it means now.',
        'Trước chuyến bay tới, hãy tìm một nhà thờ gần khách sạn nơi bạn nghỉ chặng. Dù chỉ mười phút ghé vào, ngày thường, không có Thánh lễ — ngọn đèn đỏ vẫn đang cháy. Giờ thì bạn đã biết nó nghĩa là gì.',
      ),
    },
    reflection: u('What rhythm already holds your life together?', 'Nhịp sống nào đang giữ đời bạn gắn kết?'),
    deeper: {
      ccc: [2041, 2042, 2043],
      note: u('On the precepts of the Church.', 'Về các điều luật Hội Thánh.'),
    },
  },

  // ── 5: The Living Calendar ─────────────────────────────────────────────
  {
    id: 'parish-5',
    title: u('The Living Calendar', 'Cuốn lịch sống'),
    minutes: 5,
    door: {
      art: 'liturgical-wheel',
      line: u(
        'The Church keeps time differently. Once you see the wheel, every Mass makes more sense.',
        'Giáo hội đếm thời gian theo cách khác. Một khi thấy được bánh xe ấy, mỗi Thánh lễ sẽ dễ hiểu hơn nhiều.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'liturgical-wheel',
        text: u(
          'The Church’s year is a wheel that retells the whole story annually. It begins not in January but with Advent — four weeks of waiting, the prophets’ longing compressed into a month.',
          'Năm của Giáo hội là một bánh xe kể lại trọn câu chuyện mỗi năm. Nó không bắt đầu vào tháng Giêng mà bằng Mùa Vọng — bốn tuần chờ đợi, nỗi khát mong của các ngôn sứ nén lại trong một tháng.',
        ),
      },
      {
        id: 'c2',
        art: 'nativity',
        text: u(
          'Then Christmas — not one day, but a whole season of light. Then a stretch of Ordinary Time: green, steady, the long middle where most of life happens.',
          'Rồi Giáng Sinh — không phải một ngày, mà cả một mùa ánh sáng. Rồi một quãng Mùa Thường Niên: màu xanh lá, đều đặn, khúc giữa dài nơi phần lớn cuộc sống diễn ra.',
        ),
      },
      {
        id: 'c3',
        art: 'cross-passion',
        text: u(
          'Then Lent: forty days of honesty and simplicity, walking with Jesus toward Jerusalem. Then the Triduum — the three days you know. Then Easter, fifty days of it, ending in the fire of Pentecost.',
          'Rồi Mùa Chay: bốn mươi ngày thành thật và giản dị, cùng Chúa Giêsu tiến về Giêrusalem. Rồi Tam Nhật Thánh — ba ngày bạn đã biết. Rồi mùa Phục Sinh, năm mươi ngày, kết thúc trong ngọn lửa lễ Ngũ Tuần.',
        ),
      },
      {
        id: 'c4',
        art: 'liturgical-wheel',
        text: u(
          'The colors of the vestments tell you where you are: purple for waiting and turning back, white and gold for feasts, red for the Spirit and the martyrs, green for the growing season. Today’s banner on your app’s home screen now follows this wheel.',
          'Màu phẩm phục cho bạn biết mình đang ở đâu: tím cho mùa đợi chờ và hoán cải, trắng và vàng cho lễ trọng, đỏ cho Chúa Thánh Thần và các thánh tử đạo, xanh lá cho mùa tăng trưởng. Dòng chữ trên màn hình Hôm nay của ứng dụng giờ cũng đi theo bánh xe này.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'order',
        afterCard: 2,
        prompt: u('Put the Church’s year in order, starting from Advent.', 'Sắp xếp năm phụng vụ theo thứ tự, bắt đầu từ Mùa Vọng.'),
        items: [
          u('Advent: the waiting', 'Mùa Vọng: chờ đợi'),
          u('Christmas: the light arrives', 'Giáng Sinh: ánh sáng đến'),
          u('Lent: forty days toward Jerusalem', 'Mùa Chay: bốn mươi ngày về Giêrusalem'),
          u('Easter: fifty days of morning', 'Phục Sinh: năm mươi ngày của buổi sáng'),
          u('Pentecost: the fire', 'Hiện Xuống: ngọn lửa'),
        ],
        why: u(
          'Waiting, light, desert, morning, fire. You have walked this exact arc on the road — the calendar walks it every year.',
          'Chờ đợi, ánh sáng, hoang mạc, buổi sáng, ngọn lửa. Bạn đã đi đúng vòng cung này trên con đường — cuốn lịch đi lại nó mỗi năm.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What does purple mean when you see it at Mass?', 'Màu tím trong Thánh lễ có nghĩa gì?'),
        options: [
          { text: u('A season of waiting or turning back: Advent or Lent', 'Mùa của đợi chờ hoặc hoán cải: Mùa Vọng hay Mùa Chay') },
          { text: u('A royal visitor is expected', 'Sắp có khách hoàng gia đến thăm') },
        ],
        answer: 0,
        why: u(
          'One glance at the priest’s vestments and you will know what month of the story you are standing in.',
          'Chỉ một cái nhìn vào phẩm phục của linh mục, bạn sẽ biết mình đang đứng ở tháng nào của câu chuyện.',
        ),
      },
    ],
    treasure: {
      kind: 'art',
      art: 'liturgical-wheel',
      title: u('The wheel of the year', 'Bánh xe năm phụng vụ'),
      note: u(
        'A year-shaped catechism. Live inside it for a few cycles, and the story of Jesus stops being something you know and becomes something you keep.',
        'Một cuốn giáo lý mang hình một năm. Sống trong đó vài vòng, câu chuyện Chúa Giêsu sẽ thôi là điều bạn biết, và trở thành điều bạn gìn giữ.',
      ),
    },
    reflection: u('Which season is your life in right now?', 'Cuộc đời bạn đang ở mùa nào?'),
    deeper: {
      ccc: [1163, 1168, 1171],
      note: u('On the liturgical year.', 'Về năm phụng vụ.'),
    },
  },

  // ── 6: The Cloud of Witnesses ──────────────────────────────────────────
  {
    id: 'parish-6',
    title: u('The Cloud of Witnesses', 'Đám mây nhân chứng'),
    minutes: 4,
    door: {
      art: 'martyrs-palm',
      line: u(
        'Mary, the saints, your rosary, and the family that prays for you by name.',
        'Mẹ Maria, các thánh, chuỗi Mân Côi của bạn, và gia đình đang cầu nguyện cho bạn bằng chính tên bạn.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'annunciation',
        text: u(
          'Mary is not a goddess and was never meant to be. She is the first and best disciple — the first to say yes, the last at the cross, praying at Pentecost. Catholics ask her to pray for us, exactly as you would ask your own mother.',
          'Đức Mẹ Maria không phải nữ thần và chưa bao giờ là thế. Mẹ là người môn đệ đầu tiên và tuyệt hảo nhất — người đầu tiên thưa xin vâng, người cuối cùng dưới chân thập giá, người cầu nguyện trong ngày Ngũ Tuần. Người Công giáo xin Mẹ cầu nguyện cho mình, đúng như bạn xin mẹ ruột của bạn.',
        ),
      },
      {
        id: 'c2',
        art: 'asia-lanterns',
        text: u(
          'Around her, the saints: the family album of the Church, faces from every century and continent — including 117 from Việt Nam. They are not dead heroes. They are living relatives, and the rosary in your bag is a phone line.',
          'Quanh Mẹ là Các Thánh: cuốn album gia đình của Giáo hội, những gương mặt từ mọi thế kỷ và châu lục — trong đó có 117 vị từ Việt Nam. Họ không phải anh hùng đã khuất. Họ là người thân đang sống, và chuỗi Mân Côi trong túi bạn là một đường dây liên lạc.',
        ),
      },
      {
        id: 'c3',
        art: 'incense-altar',
        text: u(
          'Your family shrine taught you the truth of this years ago: the dead are not gone, love still flows both ways, and remembering is a form of presence. The Church simply adds: and in Christ, the line is never busy.',
          'Bàn thờ gia đình đã dạy bạn sự thật này từ nhiều năm trước: người khuất không hề mất, tình thương vẫn chảy hai chiều, và tưởng nhớ là một hình thức hiện diện. Giáo hội chỉ thêm rằng: trong Chúa Kitô, đường dây ấy không bao giờ bận.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 0,
        prompt: u('What do Catholics ask of Mary?', 'Người Công giáo xin gì nơi Đức Mẹ Maria?'),
        options: [
          { text: u('To pray for us, as a mother would', 'Xin Mẹ cầu nguyện cho chúng ta, như một người mẹ') },
          { text: u('To be worshiped as a goddess', 'Tôn thờ Mẹ như một nữ thần') },
        ],
        answer: 0,
        why: u(
          '“Pray for us sinners” — the Hail Mary you know says it exactly. Worship belongs to God alone; mothers get asked for prayers.',
          '“Cầu cho chúng con là kẻ có tội” — Kinh Kính Mừng bạn thuộc đã nói thật chính xác. Thờ phượng chỉ dành cho Thiên Chúa; còn các bà mẹ thì được xin lời cầu nguyện.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('What is the rosary, now that you can pray it?', 'Chuỗi Mân Côi là gì, giờ đây khi bạn đã biết nguyện?'),
        options: [
          { text: u('Walking the Gospel stories, with Mary, bead by bead', 'Đi qua các câu chuyện Tin Mừng, cùng Mẹ Maria, từng hạt một') },
          { text: u('A counting exercise', 'Một bài tập đếm số') },
        ],
        answer: 0,
        why: u(
          'Every decade holds a scene you have walked: the angel, the hill country, the stable, the temple. The beads are a pilgrimage you can hold.',
          'Mỗi chục kinh giữ một khung cảnh bạn đã đi qua: thiên thần, miền đồi núi, máng cỏ, Đền Thánh. Chuỗi hạt là một cuộc hành hương bạn cầm được trên tay.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('One decade tonight', 'Một chục kinh tối nay'),
      note: u(
        'Take the rosary he gave you, open the trainer in My Chapel, and pray just one decade — the Annunciation. Ten Hail Marys, one small room, and you.',
        'Hãy cầm chuỗi Mân Côi anh ấy tặng, mở phần hướng dẫn trong Nhà nguyện, và nguyện một chục kinh thôi — mầu nhiệm Truyền Tin. Mười Kinh Kính Mừng, một căn phòng nhỏ, và bạn.',
      ),
    },
    reflection: u('Which saint feels closest to you so far?', 'Đến giờ, vị thánh nào gần gũi với bạn nhất?'),
    deeper: {
      ccc: [971, 2030],
      note: u('On Mary and the witness of the saints.', 'Về Đức Mẹ Maria và chứng tá Các Thánh.'),
    },
  },

  // ── 7: The Hope ────────────────────────────────────────────────────────
  {
    id: 'parish-7',
    title: u('The Hope', 'Niềm Hy Vọng'),
    minutes: 5,
    door: {
      art: 'heaven-light',
      line: u(
        'Death, heaven, purgatory — the last things, held in the warmest light the Church has.',
        'Sự chết, Thiên đàng, luyện ngục — những điều sau hết, được nâng niu trong thứ ánh sáng ấm áp nhất Giáo hội có.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'heaven-light',
        text: u(
          'You pray for the health and safety of the people you love. Underneath that prayer has always been a harder question: and then what? What happens to the people we cannot keep safe forever?',
          'Bạn vẫn cầu cho những người mình thương được mạnh khỏe, bình an. Bên dưới lời cầu ấy luôn là một câu hỏi khó hơn: rồi sao nữa? Điều gì xảy ra với những người ta không thể gìn giữ mãi mãi?',
        ),
      },
      {
        id: 'c2',
        art: 'tomb-morning',
        text: u(
          'The Church’s answer begins at the empty tomb: death is real, and death does not win. Heaven is not clouds and boredom — it is seeing God face to face, with everyone who let themselves be loved by him. Home, with no flight back.',
          'Câu trả lời của Giáo hội bắt đầu nơi ngôi mộ trống: cái chết là thật, và cái chết không thắng. Thiên đàng không phải mây trắng và sự buồn tẻ — mà là được thấy Thiên Chúa mặt đối mặt, cùng tất cả những ai đã để Ngài yêu thương mình. Là nhà, không còn chuyến bay trở ra.',
        ),
      },
      {
        id: 'c3',
        art: 'candle-single',
        text: u(
          'And {{purgatory}}? Not a small hell. A final kindness: whoever dies in God’s friendship but still carrying dust gets washed clean before the feast. This is why Catholics pray for their dead — our prayers keep helping them, the way incense keeps rising.',
          'Còn {{purgatory}}? Không phải một hỏa ngục thu nhỏ. Mà là lòng nhân hậu sau cùng: ai qua đời trong tình nghĩa với Chúa nhưng còn vương bụi đường thì được rửa sạch trước khi vào bàn tiệc. Vì thế người Công giáo cầu nguyện cho người đã khuất — lời cầu của chúng ta vẫn tiếp tục nâng đỡ họ, như làn hương vẫn tiếp tục bay lên.',
        ),
        terms: ['purgatory'],
      },
      {
        id: 'c4',
        art: 'incense-altar',
        text: u(
          'So your family shrine was never far from the truth. Your incense, your remembering, your care for the dead — the Church receives all of it, and adds one word your heart has been waiting for: reunion.',
          'Vậy nên bàn thờ gia đình của bạn chưa bao giờ xa sự thật. Nén hương, sự tưởng nhớ, tấm lòng với người đã khuất — Giáo hội đón nhận tất cả, và thêm một từ mà trái tim bạn vẫn chờ: đoàn tụ.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'choice',
        afterCard: 2,
        prompt: u('What is purgatory?', 'Luyện ngục là gì?'),
        options: [
          { text: u('A final, loving purification before heaven', 'Sự thanh luyện cuối cùng, đầy yêu thương, trước Thiên đàng') },
          { text: u('A smaller version of hell', 'Một phiên bản thu nhỏ của hỏa ngục') },
        ],
        answer: 0,
        why: u(
          'Like washing your hands before a wedding banquet — not punishment, preparation. And our prayers help.',
          'Như rửa tay trước khi vào tiệc cưới — không phải hình phạt, mà là sự chuẩn bị. Và lời cầu nguyện của chúng ta giúp được.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('Why do Catholics pray for the dead?', 'Vì sao người Công giáo cầu nguyện cho người đã khuất?'),
        options: [
          { text: u('Because love still reaches them, and helps', 'Vì tình thương vẫn chạm tới họ, và nâng đỡ họ') },
          { text: u('Because it is a polite custom only', 'Chỉ vì đó là một phong tục lịch sự') },
        ],
        answer: 0,
        why: u(
          'The communion of saints, one last time: the family is not broken by death, so neither is the helping.',
          'Các Thánh thông công, một lần cuối: gia đình không bị cái chết cắt đứt, nên sự nâng đỡ cũng không.',
        ),
      },
    ],
    treasure: {
      kind: 'word',
      termId: 'purgatory',
      note: u(
        'A word that turns grief into a task love can still do. Tonight, name your beloved dead before God — your incense already taught you how.',
        'Một từ biến nỗi tiếc thương thành việc mà tình yêu vẫn còn làm được. Tối nay, hãy dâng tên những người thân đã khuất lên trước Thiên Chúa — nén hương của bạn đã dạy bạn cách làm từ lâu.',
      ),
    },
    reflection: u('Who do you most hope to see again?', 'Bạn mong gặp lại ai nhất?'),
    deeper: {
      ccc: [1023, 1030, 1032],
      note: u('On heaven, purgatory, and prayer for the dead.', 'Về Thiên đàng, luyện ngục, và cầu nguyện cho người đã khuất.'),
    },
  },

  // ── 8: The Road to the Font ────────────────────────────────────────────
  {
    id: 'parish-8',
    title: u('The Road to the Font', 'Con đường đến giếng Rửa tội'),
    minutes: 4,
    door: {
      art: 'font-water',
      line: u(
        'Your own OCIA path, step by step — so nothing ahead of you is unknown.',
        'Hành trình OCIA của chính bạn, từng bước một — để không còn điều gì phía trước là ẩn số.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'parish-home',
        text: u(
          'OCIA — the Order of Christian Initiation of Adults — is simply the ancient road into the Church, walked at your parish, at your pace, with Father Matthew. It has a few marked gates.',
          'OCIA — nghi thức khai tâm Kitô giáo cho người trưởng thành — đơn giản là con đường cổ xưa dẫn vào Giáo hội, được đi tại giáo xứ của bạn, theo nhịp của bạn, cùng cha Matthew. Con đường ấy có vài cánh cổng được đánh dấu.',
        ),
      },
      {
        id: 'c2',
        art: 'cathedral-door',
        text: u(
          'First, the Rite of Acceptance: you stand at the church door, are signed with the cross, and the community welcomes you in. From then on you are a catechumen — an official traveler, already belonging to the household.',
          'Trước hết là Nghi thức Tiếp nhận: bạn đứng nơi cửa nhà thờ, được ghi dấu thánh giá, và cộng đoàn đón bạn vào. Từ đó bạn là dự tòng — một lữ khách chính thức, đã thuộc về gia đình này.',
        ),
      },
      {
        id: 'c3',
        art: 'bible-open',
        text: u(
          'Then the catechumenate: weeks of stories, questions, and Sundays — much of what this app has walked beside you. Near Lent comes the Rite of Election: the bishop writes your name in the Book of the Elect.',
          'Rồi đến thời kỳ dự tòng: những tuần lễ của câu chuyện, câu hỏi, và những ngày Chúa nhật — phần lớn những gì ứng dụng này đã cùng bạn đi qua. Gần Mùa Chay là Nghi thức Tuyển chọn: giám mục ghi tên bạn vào Sách Tuyển Chọn.',
        ),
      },
      {
        id: 'c4',
        art: 'font-water',
        text: u(
          'In Lent, three quiet Sundays called the scrutinies — prayers of strengthening, nothing to fear. And then the night you have already rehearsed: the fire, the water, the white garment. In My Chapel you can now enter the real dates as Father Matthew gives them.',
          'Trong Mùa Chay là ba Chúa nhật lặng lẽ gọi là các nghi thức khảo hạch — những lời nguyện thêm sức mạnh, không có gì phải sợ. Và rồi đến đêm bạn đã được tập dượt: ngọn lửa, dòng nước, tấm áo trắng. Trong Nhà nguyện, giờ đây bạn có thể ghi các ngày thật khi cha Matthew thông báo.',
        ),
      },
    ],
    questions: [
      {
        id: 'q1',
        kind: 'order',
        afterCard: 3,
        prompt: u('Put the OCIA road in order.', 'Sắp xếp hành trình OCIA theo thứ tự.'),
        items: [
          u('Rite of Acceptance: the door', 'Nghi thức Tiếp nhận: cánh cửa'),
          u('Catechumenate: the learning seasons', 'Thời kỳ dự tòng: những mùa học hỏi'),
          u('Rite of Election: your name in the book', 'Nghi thức Tuyển chọn: tên bạn trong sách'),
          u('The scrutinies: three Sundays of prayer', 'Các nghi thức khảo hạch: ba Chúa nhật cầu nguyện'),
          u('The Easter Vigil: the font', 'Đêm Vọng Phục Sinh: giếng Rửa tội'),
        ],
        why: u(
          'Door, road, book, prayers, water. Every gate on this path is an embrace, not an exam.',
          'Cánh cửa, con đường, cuốn sách, những lời nguyện, dòng nước. Mỗi cánh cổng trên hành trình này là một vòng tay, không phải một kỳ thi.',
        ),
      },
      {
        id: 'q2',
        kind: 'choice',
        prompt: u('Who leads this journey?', 'Ai dẫn dắt hành trình này?'),
        options: [
          { text: u('Your parish and Father Matthew; this app just walks beside you', 'Giáo xứ và cha Matthew; ứng dụng này chỉ đồng hành bên bạn') },
          { text: u('This app', 'Ứng dụng này') },
        ],
        answer: 0,
        why: u(
          'Exactly as it has said from the beginning. The real road is made of people.',
          'Đúng như đã nói từ thuở đầu. Con đường thật được làm nên từ những con người.',
        ),
      },
    ],
    treasure: {
      kind: 'practice',
      title: u('Enter your milestones', 'Ghi các cột mốc của bạn'),
      note: u(
        'Open My Chapel → Your OCIA road, and add the dates Father Matthew has given you — even if it is only the next one. The app will keep gentle count beside you.',
        'Mở Nhà nguyện → Hành trình OCIA của bạn, và ghi những ngày cha Matthew đã cho biết — dù chỉ là ngày kế tiếp. Ứng dụng sẽ lặng lẽ đếm ngày cùng bạn.',
      ),
    },
    reflection: u('Which gate are you standing before right now?', 'Bạn đang đứng trước cánh cổng nào?'),
    deeper: {
      ccc: [1247, 1248],
      note: u('On the catechumenate.', 'Về thời kỳ dự tòng.'),
    },
  },

  // ── Vigil: The Font Is Near ────────────────────────────────────────────
  {
    id: 'parish-vigil',
    vigil: true,
    title: u('Vigil: The Font Is Near', 'Canh thức: Giếng nước đã gần'),
    minutes: 6,
    door: {
      art: 'parish-home',
      line: u(
        'The last vigil of the main road. No questions — only everything you have become.',
        'Đêm canh thức cuối của con đường chính. Không câu hỏi — chỉ có tất cả những gì bạn đã trở thành.',
      ),
    },
    cards: [
      {
        id: 'c1',
        art: 'cathedral-hanoi',
        text: u(
          'Look back once. Hà Nội: a God who is love, a voice that called the world good, prayers that were always real, saints grown from your own soil.',
          'Hãy nhìn lại một lần. Hà Nội: một Thiên Chúa là tình yêu, một tiếng phán gọi thế giới là tốt đẹp, những lời cầu vốn luôn là thật, những vị thánh mọc lên từ chính đất quê bạn.',
        ),
      },
      {
        id: 'c2',
        art: 'basilica-bruges',
        text: u(
          'Bruges: the whole story of Jesus — the yes, the manger, the running father, the cross, the silence, and a morning that says your name.',
          'Bruges: trọn câu chuyện Chúa Giêsu — tiếng xin vâng, máng cỏ, người cha chạy ra đón, thập giá, sự thinh lặng, và một buổi sáng gọi đúng tên bạn.',
        ),
      },
      {
        id: 'c3',
        art: 'notre-dame',
        text: u(
          'Paris: the wind and fire, the family with four marks, the Book, the shape of the Mass, and the truth that beauty was a front door all along.',
          'Paris: gió và lửa, gia đình với bốn dấu chỉ, cuốn Sách, hình dáng Thánh lễ, và sự thật rằng cái đẹp vốn luôn là cửa chính.',
        ),
      },
      {
        id: 'c4',
        art: 'brussels-cathedral',
        text: u(
          'Brussels: seven doors of grace — and behind the first one, a font with your name already whispered over it.',
          'Brussels: bảy cánh cửa ân sủng — và sau cánh cửa đầu tiên, một giếng nước mà tên bạn đã được thì thầm bên trên.',
        ),
      },
      {
        id: 'c5',
        art: 'parish-home',
        text: u(
          'And now: home. Not a cathedral. A parish — your parish — where Father Matthew waits, where the community knows your face, where the ordinary Sundays will carry you the rest of the way.',
          'Và giờ đây: nhà. Không phải một nhà thờ chính tòa. Một giáo xứ — giáo xứ của bạn — nơi cha Matthew đang đợi, nơi cộng đoàn biết gương mặt bạn, nơi những Chúa nhật bình thường sẽ đưa bạn đi nốt quãng đường còn lại.',
        ),
      },
      {
        id: 'c6',
        art: 'wedding-rings',
        text: u(
          'October is coming, with its rings. And before it, God willing, a night of fire and water. Two sacraments, one autumn, one completely free yes — yours.',
          'Tháng Mười đang đến, cùng những chiếc nhẫn. Và trước đó, nếu Chúa muốn, một đêm của lửa và nước. Hai Bí tích, một mùa thu, một tiếng xin vâng hoàn toàn tự do — của bạn.',
        ),
      },
      {
        id: 'c7',
        art: 'font-water',
        text: u(
          'The fifth stamp is ready. The last page of your passport stays faintly embossed, reserved — for the day of your baptism. This app will be walking beside you until that page is stamped, and after.',
          'Con dấu thứ năm đã sẵn sàng. Trang cuối của cuốn hộ chiếu vẫn in chìm mờ nhạt, được dành riêng — cho ngày bạn lãnh nhận Bí tích Rửa tội. Ứng dụng này sẽ đồng hành bên bạn đến khi trang ấy được đóng dấu, và cả sau đó nữa.',
        ),
      },
    ],
    questions: [],
    treasure: {
      kind: 'art',
      art: 'heaven-light',
      title: u('The road ahead', 'Con đường phía trước'),
      note: u(
        'Bonus roads are now open on the map: the saints of Asia, and further pilgrimages being prepared. A pilgrim never really finishes — she just learns to walk in light.',
        'Những con đường thêm đã mở trên bản đồ: các thánh Á châu, và những cuộc hành hương xa hơn đang được chuẩn bị. Người hành hương không bao giờ thật sự kết thúc — chỉ học cách bước đi trong ánh sáng.',
      ),
    },
    reflection: u('Write a few lines to the person who will be baptized — to yourself, a little further down the road.', 'Hãy viết vài dòng cho người sẽ được rửa tội — cho chính bạn, ở một quãng xa hơn trên con đường.'),
  },
];
