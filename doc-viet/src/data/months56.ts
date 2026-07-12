import type { Month } from './types';

// ─── Month 5: Viết nâng cao / Advanced Literacy ──────────────────────────────
export const month5: Month = {
  index: 4,
  title: 'Viết nâng cao',
  subtitle: 'Advanced Literacy — Imagery, Register & Complex Sentences',
  color: 'rose',
  emoji: '✍️',
  level: 'Upper-Intermediate',
  weeks: [
    {
      index: 0,
      title: 'Ngôn ngữ hình ảnh — Figurative Language',
      lessons: [
        {
          id: 'm5w1l1',
          monthIndex: 4, weekIndex: 0, lessonIndex: 0,
          title: 'Simile & Metaphor (so sánh, ẩn dụ)',
          kind: 'writing',
          objective: 'Read and write comparisons the Vietnamese way',
          audioText: 'Vietnamese writing sparkles with comparisons. A simile, so sánh, uses như — like. Đẹp như tiên: beautiful like a fairy. Nhanh như chớp: fast as lightning. A metaphor, ẩn dụ, drops the "like" and says the thing IS the image. Thời gian là vàng: time IS gold. Learn to spot these and Vietnamese poetry, songs, and even everyday chat open up.',
          content: `## So sánh — simile, with **như** (like/as)
| Vietnamese | Literally | English feel |
|-----------|-----------|--------------|
| đẹp **như** tiên | beautiful like a fairy | drop-dead gorgeous |
| nhanh **như** chớp | fast like lightning | lightning-fast |
| hiền **như** bụt | gentle like a Buddha | good as gold |
| khỏe **như** trâu | strong like a buffalo | strong as an ox |

Notice the pattern: **[quality] + như + [image]**. The images are Vietnamese: fairies, buffalo, Buddha — not oxen and daisies.

## Ẩn dụ — metaphor, no như
| Vietnamese | Meaning |
|-----------|---------|
| Thời gian **là** vàng. | Time is gold. |
| Sách **là** người bạn tốt. | Books are good friends. |
| Con **là** mặt trời của mẹ. | You (child) are your mother's sun. |

## Try the swap test
Simile → metaphor: "Cô ấy đẹp **như** hoa" → "Cô ấy **là** một bông hoa."
Same image, stronger claim. Writers choose the strength they want.`,
          keyWords: [
            { word: 'so sánh', meaning: 'simile; to compare' },
            { word: 'ẩn dụ', meaning: 'metaphor' },
            { word: 'như', meaning: 'like; as' },
            { word: 'vàng', meaning: 'gold; yellow' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'A so sánh (simile) always contains:', options: ['là', 'như', 'không', 'nhất'], answer: 'như' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Nhanh như chớp" means:', options: ['slow as a snail', 'fast as lightning', 'bright as day', 'quiet as night'], answer: 'fast as lightning' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Thời gian là vàng" is:', options: ['a simile', 'a metaphor', 'a fact', 'a question'], answer: 'a metaphor' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"Khỏe như trâu" compares strength to a:', options: ['tiger', 'buffalo', 'elephant', 'dragon'], answer: 'buffalo' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete the simile: đẹp ___ tiên (beautiful like a fairy)', answer: 'như' },
          ],
          writingPrompt: 'Write two similes with như and one metaphor with là about someone you admire. Use Vietnamese images (trăng — the moon, hoa — flowers, núi — mountains…).',
        },
        {
          id: 'm5w1l2',
          monthIndex: 4, weekIndex: 0, lessonIndex: 1,
          title: 'Personification & Proverbs (nhân hoá, tục ngữ)',
          kind: 'writing',
          objective: 'Give life to things — and meet the proverbs every Vietnamese knows',
          audioText: 'Nhân hoá means making things human. Ông mặt trời thức dậy — Mister Sun wakes up. Gió hát — the wind sings. Vietnamese even gives the sun and moon family titles: ông mặt trời, grandfather sun; chị Hằng, sister Moon. And then there are tục ngữ — proverbs. Ăn quả nhớ kẻ trồng cây: when you eat fruit, remember who planted the tree. Gratitude, in eight syllables.',
          content: `## Nhân hoá — personification
| Vietnamese | English |
|-----------|---------|
| **Ông mặt trời** thức dậy. | *Mister/Grandpa Sun* wakes up. |
| Gió **hát** qua hàng cây. | The wind *sings* through the trees. |
| Dòng sông **ôm** lấy ngôi làng. | The river *hugs* the village. |

Vietnamese personification loves **family titles**: ông mặt trời (Grandpa Sun), **chị Hằng** (Sister Moon — from the moon-lady legend), **chú Cuội** (Uncle Cuội, the man in the moon).

## Tục ngữ — proverbs everyone knows
| Proverb | Literal | Wisdom |
|---------|---------|--------|
| **Ăn quả nhớ kẻ trồng cây.** | Eating fruit, remember the tree-planter. | Be grateful to those before you. |
| **Có công mài sắt, có ngày nên kim.** | Grind iron long enough, one day you have a needle. | Persistence pays off. |
| **Đi một ngày đàng, học một sàng khôn.** | Travel a day, learn a basketful of wisdom. | Travel educates. |
| **Uống nước nhớ nguồn.** | Drinking water, remember the source. | Honour your roots. |

> Proverbs are eight-or-so syllables of pure rhythm — read them aloud and feel the tones bounce. Drop one into your writing and it instantly sounds native.`,
          keyWords: [
            { word: 'nhân hoá', meaning: 'personification' },
            { word: 'tục ngữ', meaning: 'proverb' },
            { word: 'mặt trời', meaning: 'the sun' },
            { word: 'nguồn', meaning: 'source; origin' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Gió hát" (the wind sings) is an example of:', options: ['so sánh', 'ẩn dụ', 'nhân hoá', 'tục ngữ'], answer: 'nhân hoá' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Ăn quả nhớ kẻ trồng cây" teaches:', options: ['eat more fruit', 'gratitude to those before you', 'plant trees', 'save money'], answer: 'gratitude to those before you' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'The moon is personified as:', options: ['ông mặt trời', 'chị Hằng', 'con trâu', 'bà gió'], answer: 'chị Hằng' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"Có công mài sắt, có ngày nên kim" is about:', options: ['cooking', 'persistence', 'honesty', 'speed'], answer: 'persistence' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete the proverb: Uống nước nhớ ___ (source).', answer: 'nguồn' },
          ],
          writingPrompt: 'Write a 4-sentence nature scene where at least two things act like people (the sun, wind, river…). Close it with one tục ngữ from this lesson.',
        },
      ],
    },
    {
      index: 1,
      title: 'Trang trọng & phức tạp — Formal & Complex',
      lessons: [
        {
          id: 'm5w2l1',
          monthIndex: 4, weekIndex: 1, lessonIndex: 0,
          title: 'Formal & Informal Vietnamese',
          kind: 'writing',
          objective: 'Switch registers: chatting with friends vs addressing elders and officials',
          audioText: 'Every language dresses up and dresses down; Vietnamese changes clothes with particles and pronouns. To a friend: ăn chưa? — eaten yet? To your teacher: em mời cô ăn cơm ạ. The little word ạ at the end is a bow in sound form. Dạ before an answer shows respect. Formal writing prefers Sino-Vietnamese words: instead of giúp, help, you will read hỗ trợ.',
          content: `## The same idea, two outfits
| Informal (bạn bè — friends) | Formal (trang trọng) |
|------------------------------|----------------------|
| Ăn chưa? | Anh/chị đã dùng bữa chưa **ạ**? |
| Cảm ơn nha! | Xin chân thành cảm ơn. |
| OK, được! | Vâng, được **ạ**. |
| giúp (help) | **hỗ trợ** (assist) |
| nói (say) | **phát biểu** (state) |

## The politeness toolkit
✓ **ạ** at sentence end — a spoken bow: "Chào cô **ạ**!"
✓ **dạ** to open a reply to an elder: "**Dạ**, em hiểu."
✓ **xin** before requests: "**Xin** lỗi" (sorry), "**xin** mời" (please, go ahead)
✓ **vâng** (North) / **dạ** (South) — the polite yes
✓ Sino-Vietnamese vocabulary instantly formalises (Month 4 pays off!)

## When to wear which
| Situation | Register |
|-----------|----------|
| texting a classmate | informal — nha, nhé, đi! |
| emailing a teacher | formal — ạ, xin, kính |
| news, contracts, speeches | very formal — Hán Việt everywhere |

> Vietnamese children are drilled on this from birth: **"Dạ thưa"** before, **"ạ"** after. Use them and doors open.`,
          keyWords: [
            { word: 'trang trọng', meaning: 'formal, solemn' },
            { word: 'thân mật', meaning: 'informal, intimate' },
            { word: 'ạ', meaning: 'sentence-final politeness particle' },
            { word: 'xin lỗi', meaning: 'sorry; excuse me' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'The particle "ạ" at the end of a sentence:', options: ['asks a question', 'adds politeness to elders', 'marks the past', 'makes it negative'], answer: 'adds politeness to elders' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'The formal counterpart of "giúp" (help) is:', options: ['nói', 'hỗ trợ', 'ăn', 'nha'], answer: 'hỗ trợ' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which reply to a teacher is properly polite?', options: [''  + 'Ừ!', 'OK!', 'Dạ, em hiểu ạ.', 'Hiểu rồi nha!'], answer: 'Dạ, em hiểu ạ.' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Formal Vietnamese leans heavily on:', options: ['từ láy', 'Sino-Vietnamese words', 'slang', 'English loanwords'], answer: 'Sino-Vietnamese words' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Add the polite particle: Em chào cô ___!', answer: 'ạ' },
          ],
          writingPrompt: 'Write the same request twice — borrowing a book from (1) your best friend, (2) an elderly librarian. Show the register shift with pronouns, ạ/dạ/xin, and word choice.',
        },
        {
          id: 'm5w2l2',
          monthIndex: 4, weekIndex: 1, lessonIndex: 1,
          title: 'Letters & Emails: Kính gửi…',
          kind: 'writing',
          objective: 'Open, build and close a Vietnamese letter or email correctly',
          audioText: 'Vietnamese letters follow a fixed choreography. A formal letter opens with Kính gửi — respectfully sent to. A warm letter to family opens with thân mến — dearly. You ask about health before business: Dạo này cô có khỏe không ạ? Then the body. Then a closing: Trân trọng — respectfully — for formal, or Thân — warmly — for friends. Learn the skeleton once, reuse it forever.',
          content: `## The skeleton
| Part | Formal | Warm/informal |
|------|--------|----------------|
| Opening | **Kính gửi** cô Lan, | **Lan thân mến,** |
| Health check | Dạo này cô có khỏe không ạ? | Dạo này cậu thế nào? |
| Body | …your business… | …your news… |
| Pre-close | Em mong sớm nhận được thư cô. | Viết cho mình sớm nhé! |
| Closing | **Trân trọng,** / **Kính thư,** | **Thân,** / **Thân mến,** |
| Signature | Nguyễn Văn An | An |

## A complete mini-letter
> **Kính gửi cô Lan,**
>
> Dạo này cô có khỏe không ạ? Em viết thư này để cảm ơn cô đã dạy em tiếng Việt. Nhờ cô, bây giờ em đọc được truyện ngắn rồi ạ.
>
> Em mong sớm được gặp lại cô.
>
> **Kính thư,**
> David

## Email notes
✓ Subject line (Tiêu đề) short and clear: "Xin phép nghỉ học ngày 12/7"
✓ Same Kính gửi… opening; **em/tôi** consistent throughout
✓ Sign-off + full name; formal emails add **Trân trọng**`,
          keyWords: [
            { word: 'kính gửi', meaning: 'Dear… (formal letter opening)' },
            { word: 'thân mến', meaning: 'dear; warmly (to friends)' },
            { word: 'trân trọng', meaning: 'respectfully (formal closing)' },
            { word: 'lá thư', meaning: 'a letter (mail)' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'A formal Vietnamese letter opens with:', options: ['Xin chào', 'Kính gửi', 'Này!', 'Trân trọng'], answer: 'Kính gửi' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Trân trọng" belongs:', options: ['in the subject line', 'at the opening', 'at the closing', 'nowhere in letters'], answer: 'at the closing' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Before business, a polite letter asks about:', options: ['the weather', 'the reader\'s health', 'money', 'food'], answer: 'the reader\'s health' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Writing to your best friend, you would open with:', options: ['Kính gửi ngài,', 'Lan thân mến,', 'Trân trọng,', 'Kính thư,'], answer: 'Lan thân mến,' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete the formal opening: ___ gửi cô Lan,', answer: 'kính' },
          ],
          writingPrompt: 'Write a short letter (5–7 sentences) to a Vietnamese teacher: Kính gửi opening, health question with ạ, one paragraph of news about your studies, Kính thư closing.',
        },
        {
          id: 'm5w2l3',
          monthIndex: 4, weekIndex: 1, lessonIndex: 2,
          title: 'Complex Sentences: tuy…nhưng, nếu…thì',
          kind: 'grammar',
          objective: 'Build two-part sentences with paired conjunctions',
          audioText: 'Vietnamese loves conjunctions that come in pairs, like dance partners. Tuy trời mưa nhưng tôi vẫn đi — although it rained, I still went. Nếu bạn học thì bạn sẽ giỏi — if you study, then you will be good. And for "not only, but also": không những đẹp mà còn thông minh — not only beautiful but also smart. Both halves appear, always.',
          content: `## The pairs
| Pair | Meaning | Example |
|------|---------|---------|
| **tuy … nhưng …** | although … (but) … | **Tuy** trời mưa **nhưng** tôi vẫn đi. |
| **nếu … thì …** | if … then … | **Nếu** bạn học **thì** bạn sẽ giỏi. |
| **không những … mà còn …** | not only … but also … | Cô ấy **không những** đẹp **mà còn** thông minh. |
| **vì … nên …** | because … so … | (Month 3's old friend!) |

## The golden habit: keep BOTH halves
English drops one ("Although it rained, I went"). Vietnamese keeps the pair — dropping **nhưng** after **tuy** sounds broken.

## Upgrade a paragraph
Flat: Trời mưa. Tôi đi học. Tôi thích tiếng Việt. Tôi học mỗi ngày.
With pairs: **Tuy** trời mưa **nhưng** tôi vẫn đi học. **Vì** thích tiếng Việt **nên** tôi học mỗi ngày.

Same facts — suddenly it reads like a writer, not a phrasebook.

> **vẫn** (still) loves living inside tuy…nhưng: "tuy X nhưng **vẫn** Y" = despite X, still Y. Native-speaker glue.`,
          keyWords: [
            { word: 'nếu', meaning: 'if' },
            { word: 'thì', meaning: 'then' },
            { word: 'tuy', meaning: 'although' },
            { word: 'vẫn', meaning: 'still; nevertheless' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Tuy" is paired with:', options: ['thì', 'nhưng', 'nên', 'mà còn'], answer: 'nhưng' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Nếu bạn học thì bạn sẽ giỏi" means:', options: ['Because you study, you are good', 'If you study, you will be good', 'Although you study, you are good', 'You must study to be good'], answer: 'If you study, you will be good' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Không những đẹp mà còn thông minh" means:', options: ['neither pretty nor smart', 'not only pretty but also smart', 'pretty but not smart', 'smart but not pretty'], answer: 'not only pretty but also smart' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Complete: Tuy trời mưa ___ tôi vẫn đi.', answer: 'nhưng' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'In Vietnamese paired conjunctions, you should:', options: ['always drop the second half', 'always keep both halves', 'swap their order freely', 'add "và" between them'], answer: 'always keep both halves' },
          ],
          writingPrompt: 'Write three sentences about learning Vietnamese: one with tuy…nhưng (+vẫn if you dare), one with nếu…thì, one with không những…mà còn.',
        },
      ],
    },
  ],
};

// ─── Month 6: Chuyên gia / Expert ────────────────────────────────────────────
export const month6: Month = {
  index: 5,
  title: 'Chuyên gia',
  subtitle: 'Expert — Real Texts, Essays & Your Capstone',
  color: 'violet',
  emoji: '🎓',
  level: 'Advanced',
  weeks: [
    {
      index: 0,
      title: 'Đọc văn bản thật — Reading Real Texts',
      lessons: [
        {
          id: 'm6w1l1',
          monthIndex: 5, weekIndex: 0, lessonIndex: 0,
          title: 'Reading the News (tin tức)',
          kind: 'reading',
          objective: 'Crack the compressed style of Vietnamese headlines and news',
          audioText: 'News Vietnamese is a dialect of its own: compressed, formal, and packed with Sino-Vietnamese words. Headlines drop small words. Hà Nội đón khách du lịch quốc tế — Hanoi welcomes international tourists. Notice: no "the", no "is", straight to the point. Learn ten news words and the fog lifts fast.',
          content: `## Headline style — small words vanish
> **Hà Nội đón 2 triệu khách du lịch quốc tế**
> (Hanoi welcomes 2 million international tourists)

No articles, no "đã/sẽ" — time comes from context or a date. Verbs are strong and formal.

## The news top-ten
| Word | Meaning |
|------|---------|
| **tin tức** | news |
| **báo** | newspaper |
| **tiêu đề** | headline; title |
| **theo** | according to |
| **cho biết** | said / announced |
| **quốc tế** | international |
| **chính phủ** | government |
| **kinh tế** | economy |
| **thời tiết** | weather |
| **du lịch** | tourism; to travel |

## The reporter's skeleton
> **Theo** báo Tuổi Trẻ, chính phủ **cho biết** kinh tế sẽ tăng 6%.
> (*According to* Tuổi Trẻ newspaper, the government *announced* the economy will grow 6%.)

**Theo X, Y cho biết Z** — you'll meet this sentence a thousand times.

✓ Strategy: read the headline, guess the story, then check yourself. Prediction is a reading superpower.`,
          keyWords: [
            { word: 'tin tức', meaning: 'news' },
            { word: 'báo', meaning: 'newspaper' },
            { word: 'tiêu đề', meaning: 'headline; title' },
            { word: 'theo', meaning: 'according to; to follow' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Vietnamese headlines typically:', options: ['add extra particles', 'drop small words like articles and tense markers', 'use only informal words', 'avoid verbs'], answer: 'drop small words like articles and tense markers' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Theo báo Tuổi Trẻ" means:', options: ['inside Tuổi Trẻ', 'according to Tuổi Trẻ newspaper', 'after young people', 'buying the newspaper'], answer: 'according to Tuổi Trẻ newspaper' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Cho biết" in news language means:', options: ['to give away', 'to know', 'said/announced', 'to ask'], answer: 'said/announced' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"Khách du lịch quốc tế" means:', options: ['local guests', 'international tourists', 'business travellers', 'flight attendants'], answer: 'international tourists' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete the news word for economy: kinh ___', answer: 'tế' },
          ],
          writingPrompt: 'Write two headlines (no small words!) about your own week, then expand one into a two-sentence news item using "Theo…" and "cho biết".',
        },
        {
          id: 'm6w1l2',
          monthIndex: 5, weekIndex: 0, lessonIndex: 1,
          title: 'SQ3R & Reading Real Stories',
          kind: 'reading',
          objective: 'Apply the five-step SQ3R method to longer Vietnamese texts',
          audioText: 'For long texts, read like a detective, not a tourist. SQ3R: Survey — skim the title and first lines. Question — turn the title into questions. Read — now read, hunting your answers. Recite — close the text, say what you learned, in Vietnamese if you can. Review — glance back tomorrow. Five steps, and long stories stop being walls of words.',
          content: `## SQ3R — năm bước đọc sâu (five steps of deep reading)
| Step | Vietnamese | You do |
|------|-----------|--------|
| **S**urvey | khảo sát | skim title, pictures, first & last lines |
| **Q**uestion | đặt câu hỏi | turn the title into questions: ai? gì? ở đâu? tại sao? |
| **R**ead | đọc | read, hunting answers to YOUR questions |
| **R**ecite | kể lại | close the text; retell the ý chính out loud |
| **R**eview | xem lại | revisit tomorrow — spaced repetition for texts |

## Apply it to a story title
Title: **"Sự tích Hồ Gươm"** (The Legend of Sword Lake)
Questions before reading: Ai trả gươm? (Who returns the sword?) Gươm từ đâu? (Where is it from?) Tại sao gọi là Hồ Gươm? (Why the name?)

Now the story reads itself — you're checking predictions, not decoding.

## Story words you'll keep meeting
**ngày xưa** (long ago) · **sự tích** (legend of origin) · **vua** (king) · **thần** (deity/spirit) · **cuối cùng** (finally)

> Long texts feel long because you enter them empty-handed. SQ3R hands you a map first.`,
          keyWords: [
            { word: 'khảo sát', meaning: 'to survey; skim' },
            { word: 'câu hỏi', meaning: 'question' },
            { word: 'ngày xưa', meaning: 'long ago; once upon a time' },
            { word: 'sự tích', meaning: 'origin legend' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'The FIRST step of SQ3R is:', options: ['Read', 'Recite', 'Survey', 'Review'], answer: 'Survey' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'In the Question step, you:', options: ['answer the quiz', 'turn the title into your own questions', 'skip to the end', 'translate every word'], answer: 'turn the title into your own questions' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Ngày xưa" opens a story like the English:', options: ['The End', 'Once upon a time', 'Meanwhile', 'Suddenly'], answer: 'Once upon a time' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Recite (kể lại) means:', options: ['copy the text', 'retell it with the text closed', 'read it aloud twice', 'memorise it word for word'], answer: 'retell it with the text closed' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Sự tích" is:', options: ['a news report', 'an origin legend', 'a recipe', 'a poem'], answer: 'an origin legend' },
          ],
          writingPrompt: 'Choose any story from the Library. BEFORE re-reading it, write three questions from its title (ai? gì? tại sao?). Read it, then write a two-sentence retell (kể lại) in Vietnamese.',
        },
      ],
    },
    {
      index: 1,
      title: 'Viết như chuyên gia — Writing Like an Expert',
      lessons: [
        {
          id: 'm6w2l1',
          monthIndex: 5, weekIndex: 1, lessonIndex: 0,
          title: 'Essay Structure: mở bài, thân bài, kết bài',
          kind: 'writing',
          objective: 'Plan a three-part Vietnamese essay',
          audioText: 'Every Vietnamese schoolchild learns the same three-part essay. Mở bài — open the topic: one short paragraph that says what you will discuss. Thân bài — the body: two or three paragraphs, one idea each, with examples. Kết bài — close: restate your point and leave a thought. Mở, thân, kết. Open, body, close. The shape of every essay you will ever write.',
          content: `## The three parts
| Part | Job | Length |
|------|-----|--------|
| **Mở bài** (opening) | introduce the topic + your point | 2–3 sentences |
| **Thân bài** (body) | develop 2–3 ideas, one per paragraph, each with an example | the bulk |
| **Kết bài** (closing) | restate + a final thought or wish | 2–3 sentences |

## A skeleton you can steal — "Tại sao tôi học tiếng Việt"
> **Mở bài:** Nhiều người hỏi tại sao tôi học tiếng Việt. Có ba lý do chính. *(Many ask why I study Vietnamese. There are three main reasons.)*
>
> **Thân bài 1:** Thứ nhất, gia đình… *(First, family…)*
> **Thân bài 2:** Thứ hai, văn hoá… *(Second, culture…)*
> **Thân bài 3:** Cuối cùng, du lịch… *(Finally, travel…)*
>
> **Kết bài:** Vì những lý do đó, tôi sẽ tiếp tục học mỗi ngày. *(For those reasons, I will keep studying daily.)*

## Signposts that hold it together
**thứ nhất / thứ hai** (first/second) · **cuối cùng** (finally) · **ví dụ** (for example) · **tóm lại** (in summary) · **vì vậy** (therefore)

> One paragraph = one ý chính. If a paragraph has two main ideas, it wants to be two paragraphs.`,
          keyWords: [
            { word: 'mở bài', meaning: 'essay opening / introduction' },
            { word: 'thân bài', meaning: 'essay body' },
            { word: 'kết bài', meaning: 'essay conclusion' },
            { word: 'ví dụ', meaning: 'example; for example' },
            { word: 'tóm lại', meaning: 'in summary' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'The three parts of a Vietnamese essay are:', options: ['title, body, picture', 'mở bài, thân bài, kết bài', 'question, answer, quiz', 'intro, joke, ending'], answer: 'mở bài, thân bài, kết bài' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Where do your ideas get developed with examples?', options: ['mở bài', 'thân bài', 'kết bài', 'tiêu đề'], answer: 'thân bài' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Tóm lại" signals:', options: ['a new example', 'a summary is coming', 'a question', 'dialogue'], answer: 'a summary is coming' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'How many main ideas should one paragraph carry?', options: ['as many as possible', 'exactly one', 'at least three', 'none'], answer: 'exactly one' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete the signpost for "for example": ví ___', answer: 'dụ' },
          ],
          writingPrompt: 'Outline (don\'t write!) an essay "Tại sao tôi học tiếng Việt": one mở bài sentence, three thân bài bullet ideas with a ví dụ each, one kết bài sentence.',
        },
        {
          id: 'm6w2l2',
          monthIndex: 5, weekIndex: 1, lessonIndex: 1,
          title: 'Editing & the Diacritic Checklist',
          kind: 'writing',
          objective: 'Proofread Vietnamese like a pro — tones first',
          audioText: 'Writers write; experts rewrite. Vietnamese proofreading has one special weapon: the diacritic sweep. Read your draft once looking ONLY at tone marks and letter hats. Is every ơ horned? Every đ barred? Is it hỏi or ngã? One wrong mark makes a different word: bán, to sell, becomes bàn, a table. Sweep tones first, then spelling, then everything else.',
          content: `## The three sweeps (in order!)
### 1. Dấu — the diacritic sweep 🎵
Read once looking ONLY at marks:
✓ every **đ** barred? every **ơ/ư** horned? every **â/ê/ô** hatted?
✓ **hỏi ( ̉ ) or ngã (~)**? — the classic mix-up: nghỉ (rest) vs nghĩ (think)!
✓ tone on the right vowel? (ch**à**o not ch**a**ò)
✓ one wrong mark = a different word: **bán** (sell) / **bàn** (table) / **bạn** (friend)

### 2. Chính tả — spelling sweep
✓ c/k, g/gh, ng/ngh before i, e, ê (Month 2's golden rule)
✓ d or gi? tr or ch? s or x? — the homophone traps

### 3. Câu — sentence sweep
✓ capitals at sentence starts, punctuation at ends
✓ paired conjunctions BOTH present (tuy…nhưng)
✓ pronouns consistent (don't drift from em to tôi mid-letter)

## Spot-the-error drill
| Written | Should be | Why |
|---------|-----------|-----|
| Tôi *nghỉ* rằng… | Tôi **nghĩ** rằng… | think = ngã, not hỏi |
| *ngi* ngờ | **nghi** ngờ | ngh before i |
| Tôi *ban* sách. | Tôi **bán** sách. | sell needs sắc |`,
          keyWords: [
            { word: 'sửa', meaning: 'to edit; to fix' },
            { word: 'dấu', meaning: 'mark; diacritic' },
            { word: 'lỗi', meaning: 'mistake; error' },
            { word: 'nghĩ', meaning: 'to think (ngã tone!)' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'The FIRST proofreading sweep checks:', options: ['paragraph order', 'diacritics and tone marks', 'handwriting', 'word count'], answer: 'diacritics and tone marks' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Nghỉ" vs "nghĩ" — which means "to think"?', options: ['nghỉ (hỏi)', 'nghĩ (ngã)', 'both', 'neither'], answer: 'nghĩ (ngã)' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Tôi ban sách" should be "Tôi bán sách" because:', options: ['ban is not a word', '"sell" needs the sắc tone', 'sách needs a hat', 'tôi is wrong'], answer: '"sell" needs the sắc tone' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Which is spelled correctly?', options: ['ngi ngờ', 'nghi ngờ', 'ngí ngờ', 'nqhi ngờ'], answer: 'nghi ngờ' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Lỗi" means:', options: ['tone', 'mistake', 'sentence', 'draft'], answer: 'mistake' },
          ],
          writingPrompt: 'Take any earlier writing response of yours and rewrite it here, improved. Then list two lỗi you found and fixed — at least one involving a diacritic.',
        },
        {
          id: 'm6w2l3',
          monthIndex: 5, weekIndex: 1, lessonIndex: 2,
          title: 'Capstone: Your 300-Word Piece',
          kind: 'writing',
          objective: 'Write a complete 300–400 word Vietnamese piece — story, letter, or essay',
          audioText: 'This is it — the final lesson. Six months ago, ă and ơ were mysterious squiggles. Today you will write three hundred words of real Vietnamese. Choose your form: a story with ngày xưa, a letter with kính gửi, or an essay with mở bài, thân bài, kết bài. Plan, write, then run your three sweeps. Your certificate is waiting. Chúc bạn may mắn — good luck!',
          content: `## Choose ONE form
| Form | Skeleton | Steal from |
|------|----------|-----------|
| 📖 **Câu chuyện** (story) | Ngày xưa… → conflict → cuối cùng… | Month 6 story lessons, the Library |
| ✉️ **Lá thư** (letter) | Kính gửi / thân mến → health → news → closing | Month 5 letters |
| 📝 **Bài luận** (essay) | mở bài → thân bài ×3 → kết bài | Month 6 essay lesson |

## The bar to clear (300–400 words)
✓ every tone mark and hat in place — run the **diacritic sweep**
✓ at least one **vì…nên / tuy…nhưng / nếu…thì** pair
✓ at least one **từ láy** (lấp lánh, vui vẻ…) or **so sánh** (như…)
✓ connectors: và, nhưng, vì, nên — no bare sentence piles
✓ consistent pronouns (tôi/em… pick and hold)

## Plan (5 minutes, in Vietnamese!)
1. Form + topic — one line
2. Three bullet ideas
3. First sentence drafted in your head before you type

## After writing
Run the three sweeps from the editing lesson: dấu → chính tả → câu.
Then breathe. You just wrote hundreds of words in a language you couldn't read six months ago. **Chúc mừng — congratulations, chuyên gia!** 🎓`,
          keyWords: [
            { word: 'bài luận', meaning: 'essay' },
            { word: 'câu chuyện', meaning: 'story' },
            { word: 'chúc mừng', meaning: 'congratulations' },
            { word: 'may mắn', meaning: 'lucky; good luck' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'The capstone piece should be:', options: ['50–100 words', '100–200 words', '300–400 words', '1000+ words'], answer: '300–400 words' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which is NOT one of the three offered forms?', options: ['câu chuyện (story)', 'lá thư (letter)', 'bài luận (essay)', 'bài hát (song)'], answer: 'bài hát (song)' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'After drafting, your FIRST sweep checks:', options: ['word count', 'diacritics (dấu)', 'the title', 'paragraph count'], answer: 'diacritics (dấu)' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"Chúc mừng" means:', options: ['goodbye', 'congratulations', 'please', 'welcome'], answer: 'congratulations' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'A story form would open with:', options: ['Kính gửi', 'Ngày xưa', 'Tóm lại', 'Theo báo'], answer: 'Ngày xưa' },
          ],
          writingPrompt: 'Write your capstone: 300–400 words in Vietnamese — a story (ngày xưa…), a letter (kính gửi…), or an essay (mở bài/thân bài/kết bài). Include one paired conjunction, one từ láy or so sánh, and run your three sweeps before finishing. Chúc bạn may mắn! 🎓',
          },
      ],
    },
  ],
};
