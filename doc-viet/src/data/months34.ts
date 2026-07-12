import type { Month } from './types';

// ─── Month 3: Câu và đoạn / Sentences & Paragraphs ───────────────────────────
export const month3: Month = {
  index: 2,
  title: 'Câu và đoạn',
  subtitle: 'Sentences & Paragraphs — Questions, Time & Politeness',
  color: 'emerald',
  emoji: '🌿',
  level: 'Pre-Intermediate',
  weeks: [
    {
      index: 0,
      title: 'Hỏi và trả lời — Asking & Answering',
      lessons: [
        {
          id: 'm3w1l1',
          monthIndex: 2, weekIndex: 0, lessonIndex: 0,
          title: 'Asking Questions: …không? …gì? …ở đâu?',
          kind: 'grammar',
          objective: 'Turn statements into questions three different ways',
          audioText: 'Asking questions in Vietnamese is beautifully simple. For yes-no questions, add không at the end. Bạn ăn phở — you eat phở. Bạn ăn phở không? — do you eat phở? For "what", use gì after the verb: Bạn ăn gì? — what do you eat? For "where", use ở đâu: Bạn ở đâu? — where are you? No word-order gymnastics like English!',
          content: `English flips words around to ask questions. Vietnamese just adds a question word — usually at the **end**.

## Yes/no: add …không?
| Statement | Question |
|-----------|----------|
| Bạn ăn phở. (You eat phở.) | **Bạn ăn phở không?** (Do you eat phở?) |
| Chị uống cà phê. | **Chị uống cà phê không?** |

Answer: **Có** (yes, I do) or **Không** (no).

## Question words stay where the answer goes
| Word | Meaning | Example |
|------|---------|---------|
| **gì** | what | Bạn ăn **gì**? (You eat *what*?) |
| **ở đâu** | where | Bạn sống **ở đâu**? (You live *where*?) |
| **ai** | who | **Ai** ăn phở? (*Who* eats phở?) |
| **khi nào** | when | **Khi nào** bạn đi? (*When* do you go?) |
| **tại sao** | why | **Tại sao** bạn học tiếng Việt? |

> Notice: "Bạn ăn **gì**?" keeps normal word order — the question word simply sits in the answer's seat. English does the gymnastics; Vietnamese doesn't.`,
          keyWords: [
            { word: 'không', meaning: 'no; not; yes-no question particle' },
            { word: 'gì', meaning: 'what' },
            { word: 'ở đâu', meaning: 'where' },
            { word: 'ai', meaning: 'who' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'To make "Bạn ăn phở" a yes/no question, you:', options: ['flip the words', 'add "không?" at the end', 'add "do" at the start', 'raise your voice only'], answer: 'add "không?" at the end' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Bạn ăn gì?" means:', options: ['Do you eat?', 'What do you eat?', 'Where do you eat?', 'Who eats?'], answer: 'What do you eat?' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Where do you live?" is:', options: ['Bạn sống gì?', 'Bạn sống ở đâu?', 'Ai sống?', 'Bạn sống không?'], answer: 'Bạn sống ở đâu?' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Complete: Bạn uống trà _____? (Do you drink tea?)', answer: 'không' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'The positive answer to a …không? question is:', options: ['Có', 'Không', 'Là', 'Gì'], answer: 'Có' },
          ],
          writingPrompt: 'Write three questions to a new friend: one yes/no question with không, one with gì, one with ở đâu. Then write your own answers.',
        },
        {
          id: 'm3w1l2',
          monthIndex: 2, weekIndex: 0, lessonIndex: 1,
          title: 'Yesterday, Now, Tomorrow: đã, đang, sẽ',
          kind: 'grammar',
          objective: 'Mark past, present and future — and make negatives with không',
          audioText: 'Vietnamese verbs never change form. Instead, three little words do all the time-travel. Đã marks the past: tôi đã ăn — I ate. Đang marks right now: tôi đang ăn — I am eating. Sẽ marks the future: tôi sẽ ăn — I will eat. And to say not, put không before the verb: tôi không ăn — I don\'t eat. Four little words, the whole tense system.',
          content: `## The time machine — three markers before the verb
| Marker | Time | Example | English |
|--------|------|---------|---------|
| **đã** | past | Tôi **đã** ăn. | I ate / have eaten. |
| **đang** | happening now | Tôi **đang** ăn. | I am eating. |
| **sẽ** | future | Tôi **sẽ** ăn. | I will eat. |

The verb **ăn** never changes. No "ate", no "eaten", no "-ing".

## Time words often do the job alone
**Hôm qua tôi ăn phở.** (Yesterday I eat phở) — *hôm qua* already says it's the past, so đã is optional.
| Word | Meaning |
|------|---------|
| **hôm qua** | yesterday |
| **hôm nay** | today |
| **ngày mai** | tomorrow |

## Negation: không before the verb
- Tôi **không** ăn thịt. (I don't eat meat.)
- Tôi **sẽ không** đi. (I will not go.)
- Trời **không** mưa. (It isn't raining.)

> **không** is doing double duty in Vietnamese: "not" before a verb, question particle at the end. "Bạn không ăn không?" = "You don't eat, right?"`,
          keyWords: [
            { word: 'đã', meaning: 'past marker (already happened)' },
            { word: 'đang', meaning: 'present marker (happening now)' },
            { word: 'sẽ', meaning: 'future marker (will happen)' },
            { word: 'hôm qua', meaning: 'yesterday' },
            { word: 'ngày mai', meaning: 'tomorrow' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Tôi đang học" means:', options: ['I studied', 'I am studying', 'I will study', 'I don\'t study'], answer: 'I am studying' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which marker points to the future?', options: ['đã', 'đang', 'sẽ', 'không'], answer: 'sẽ' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"I don\'t drink coffee" is:', options: ['Tôi uống không cà phê', 'Tôi không uống cà phê', 'Không tôi uống cà phê', 'Tôi uống cà phê không'], answer: 'Tôi không uống cà phê' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Complete: Ngày mai tôi ___ đi Hà Nội. (Tomorrow I will go to Hanoi.)', answer: 'sẽ' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'In "Hôm qua tôi ăn phở", đã is not needed because:', options: ['ăn is already past tense', '"hôm qua" already marks the past', 'questions don\'t use đã', 'phở is a classifier'], answer: '"hôm qua" already marks the past' },
          ],
          writingPrompt: 'Write three sentences about your meals: what you ate yesterday (hôm qua/đã), what you are doing now (đang), and what you will eat tomorrow (ngày mai/sẽ).',
        },
        {
          id: 'm3w1l3',
          monthIndex: 2, weekIndex: 0, lessonIndex: 2,
          title: 'Who Are You to Me? Pronouns & Politeness',
          kind: 'grammar',
          objective: 'Choose the right pronoun by age and relationship — the heart of Vietnamese politeness',
          audioText: 'Here is the most Vietnamese thing about Vietnamese. There is no single word for "you". Instead, you call people by their family role. A man slightly older than you is anh, older brother. A woman slightly older is chị, older sister. Someone younger is em. A man your grandfather\'s age is ông. A woman your grandmother\'s age is bà. And you call yourself differently too! Get this right and every Vietnamese person will smile at you.',
          content: `Vietnamese has no plain "you" — everyone is family. You pick the word by **age and relationship**:

| Word | Literally | Use for |
|------|-----------|---------|
| **em** | younger sibling | anyone younger than you |
| **anh** | older brother | a man a bit older |
| **chị** | older sister | a woman a bit older |
| **cô** | aunt | a woman your parents' age; a female teacher |
| **chú** | uncle | a man your parents' age |
| **ông** | grandfather | an elderly man; also "Mr" |
| **bà** | grandmother | an elderly woman; also "Mrs" |

## The pair dance — "I" changes too!
Talking to an older man (he = anh), *you* become **em**:
> **Em chào anh!** (Hello, older brother — said by the younger person)
> **Anh khỏe không?** (Are you well? — asked TO the anh)

Talking to a child, *you* become anh/chị/cô/chú.

## Survival strategy
✓ When unsure between anh/chị and em, flatter upward — treat them as slightly older.
✓ **Bạn** (friend) is a safe neutral "you" between same-age strangers.
✓ Add **ạ** at the end when speaking to elders: "Cảm ơn **ạ**!" — instant politeness.`,
          keyWords: [
            { word: 'anh', meaning: 'older brother; "you" to a slightly older man' },
            { word: 'chị', meaning: 'older sister; "you" to a slightly older woman' },
            { word: 'em', meaning: 'younger sibling; "you"/"I" for the younger person' },
            { word: 'ông', meaning: 'grandfather; Mr; elderly man' },
            { word: 'bà', meaning: 'grandmother; Mrs; elderly woman' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'A woman slightly older than you is called:', options: ['em', 'chị', 'bà', 'chú'], answer: 'chị' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'If you speak to an "anh", what do you call yourself?', options: ['anh', 'ông', 'em', 'bà'], answer: 'em' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'An elderly woman is addressed as:', options: ['chị', 'cô', 'em', 'bà'], answer: 'bà' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'The particle that adds politeness to elders is:', options: ['ạ', 'gì', 'là', 'và'], answer: 'ạ' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete the greeting a student says to a female teacher: Em chào ___ ạ!', answer: 'cô' },
          ],
          writingPrompt: 'Write how you would greet: (1) a man a little older than you, (2) a child, (3) an elderly woman. One line each, using the right pronoun pair and ạ where needed.',
        },
      ],
    },
    {
      index: 1,
      title: 'Viết đoạn văn — Building Paragraphs',
      lessons: [
        {
          id: 'm3w2l1',
          monthIndex: 2, weekIndex: 1, lessonIndex: 0,
          title: 'Joining Ideas: và, nhưng, vì, nên',
          kind: 'writing',
          objective: 'Connect sentences into a flowing paragraph',
          audioText: 'Single sentences are lonely. Four little words join them into stories. Và means and: tôi ăn phở và uống trà. Nhưng means but: phở ngon nhưng đắt — phở is delicious but expensive. Vì means because, nên means so — and Vietnamese loves using them together: vì trời mưa nên tôi ở nhà. Because it rained, so I stayed home. Yes — both at once!',
          content: `## The four connectors
| Word | Meaning | Example |
|------|---------|---------|
| **và** | and | Tôi ăn phở **và** uống trà. |
| **nhưng** | but | Phở ngon **nhưng** đắt. (tasty but expensive) |
| **vì** | because | Tôi ở nhà **vì** trời mưa. |
| **nên** | so / therefore | Trời mưa **nên** tôi ở nhà. |

## The double act: vì … nên …
Vietnamese happily uses *because* and *so* in the SAME sentence:
> **Vì** trời mưa **nên** tôi ở nhà.
> (Because it rained, [so] I stayed home.)

English drops one; Vietnamese keeps both. It sounds extra logical!

## From sentences to a đoạn văn (paragraph)
> Hôm nay trời đẹp. Tôi và mẹ đi chợ. Chợ rất đông **nhưng** vui. **Vì** đói **nên** chúng tôi ăn bánh mì. Bánh mì ngon **và** rẻ.

Notice: short sentences, connectors doing the joining, one idea flowing to the next.`,
          keyWords: [
            { word: 'và', meaning: 'and' },
            { word: 'nhưng', meaning: 'but' },
            { word: 'vì', meaning: 'because' },
            { word: 'nên', meaning: 'so; therefore' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Nhưng" means:', options: ['and', 'but', 'because', 'so'], answer: 'but' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Vì trời mưa nên tôi ở nhà" uses:', options: ['only "because"', 'only "so"', 'both "because" and "so" together', 'neither'], answer: 'both "because" and "so" together' },
            { id: 'e3', kind: 'fill-blank', prompt: 'Complete: Tôi ăn phở ___ uống trà. (and)', answer: 'và' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"Phở ngon nhưng đắt" means phở is:', options: ['tasty and cheap', 'tasty but expensive', 'bad but cheap', 'expensive and rare'], answer: 'tasty but expensive' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete: Vì đói ___ chúng tôi ăn bánh mì. (so)', answer: 'nên' },
          ],
          writingPrompt: 'Write a 4–5 sentence đoạn văn about your day using all four connectors: và, nhưng, vì, nên. Try the vì…nên… double act at least once.',
        },
        {
          id: 'm3w2l2',
          monthIndex: 2, weekIndex: 1, lessonIndex: 1,
          title: 'Finding the Main Idea (ý chính)',
          kind: 'comprehension',
          objective: 'Read a short passage and pull out its main idea',
          audioText: 'When you read a paragraph, ask one question: what is this REALLY about? That is the ý chính, the main idea. Details are the small facts that support it. Read this: Hà Nội có bốn mùa. Mùa xuân ấm. Mùa hè nóng. Mùa thu mát. Mùa đông lạnh. The main idea? Hanoi has four seasons. Everything else is detail.',
          content: `**Ý chính** = the main idea. **Chi tiết** = the details that support it.

## Worked example
> Hà Nội có bốn mùa. Mùa xuân ấm áp. Mùa hè rất nóng. Mùa thu mát mẻ. Mùa đông lạnh.
> *(Hanoi has four seasons. Spring is warm. Summer is very hot. Autumn is cool. Winter is cold.)*

**Ý chính:** Hà Nội có bốn mùa — Hanoi has four seasons.
**Chi tiết:** what each season feels like.

## Where to look
✓ Very often the **first sentence** (câu chủ đề — topic sentence)
✓ Sometimes the **last sentence** sums it up
✓ Test yourself: cover the passage and say it in ONE sentence — that's the ý chính

## Season & weather words met above
| Vietnamese | English |
|-----------|---------|
| **mùa xuân / hè / thu / đông** | spring / summer / autumn / winter |
| **nóng / lạnh** | hot / cold |
| **ấm / mát** | warm / cool |
| **mưa / nắng** | rain / sunshine |`,
          keyWords: [
            { word: 'ý chính', meaning: 'main idea' },
            { word: 'đoạn văn', meaning: 'paragraph' },
            { word: 'mùa', meaning: 'season' },
            { word: 'nóng', meaning: 'hot' },
            { word: 'lạnh', meaning: 'cold' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Ý chính" means:', options: ['detail', 'main idea', 'question', 'title'], answer: 'main idea' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'The main idea of the Hanoi passage is:', options: ['Summer is hot', 'Hanoi has four seasons', 'Winter is cold', 'Hanoi is big'], answer: 'Hanoi has four seasons' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Mùa hè rất nóng" is a:', options: ['main idea', 'supporting detail', 'question', 'greeting'], answer: 'supporting detail' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'The topic sentence (câu chủ đề) is most often found:', options: ['in the middle', 'at the very first sentence', 'outside the paragraph', 'in the title only'], answer: 'at the very first sentence' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Mùa đông" means:', options: ['spring', 'summer', 'autumn', 'winter'], answer: 'winter' },
          ],
          writingPrompt: 'Write a short đoạn văn (4–5 sentences) whose first sentence is the ý chính: "Tôi thích mùa …" (I like season …). Support it with details: weather, food, activities.',
        },
      ],
    },
  ],
};

// ─── Month 4: Đọc hiểu / Fluency ─────────────────────────────────────────────
export const month4: Month = {
  index: 3,
  title: 'Đọc hiểu',
  subtitle: 'Fluency — Word Building & Reading Between the Lines',
  color: 'orange',
  emoji: '📖',
  level: 'Intermediate',
  weeks: [
    {
      index: 0,
      title: 'Từ vựng nâng cao — How Words Are Built',
      lessons: [
        {
          id: 'm4w1l1',
          monthIndex: 3, weekIndex: 0, lessonIndex: 0,
          title: 'Compound Words (từ ghép)',
          kind: 'vocabulary',
          objective: 'Decode new words by their parts',
          audioText: 'Vietnamese builds big words out of small ones, like Lego. Quần means trousers, áo means shirt — quần áo together means clothes in general. Bàn is table, ghế is chair — bàn ghế means furniture. Ông bà, grandfather grandmother, means grandparents. Once you see the pattern, you can often guess a new word from its pieces.',
          content: `**Từ ghép** = compound words. Two small words snap together into a bigger idea.

## Pair-compounds (the pieces are equals)
| Compound | Pieces | Meaning |
|----------|--------|---------|
| **quần áo** | trousers + shirt | clothes |
| **bàn ghế** | table + chair | furniture |
| **ông bà** | grandpa + grandma | grandparents |
| **nhà cửa** | house + door | housing, home |
| **ăn uống** | eat + drink | eating & drinking, diet |

## Head-compounds (first word is the family, second narrows it)
| Compound | Pieces | Meaning |
|----------|--------|---------|
| **xe đạp** | vehicle + pedal | bicycle |
| **xe máy** | vehicle + machine | motorbike |
| **nhà hàng** | house + goods | restaurant |
| **người Việt** | person + Viet | Vietnamese person |

## Reading superpower
Meet **xe lửa** (vehicle + fire)? A fire-vehicle… a **train**! 🚂
Guessing from parts works surprisingly often — always try before reaching for a dictionary.`,
          keyWords: [
            { word: 'quần áo', meaning: 'clothes (trousers + shirt)' },
            { word: 'xe đạp', meaning: 'bicycle (vehicle + pedal)' },
            { word: 'nhà hàng', meaning: 'restaurant' },
            { word: 'ông bà', meaning: 'grandparents' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Quần áo" (trousers + shirt) means:', options: ['uniform', 'clothes in general', 'laundry', 'fashion'], answer: 'clothes in general' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Xe đạp" is literally vehicle + pedal =', options: ['car', 'bus', 'bicycle', 'train'], answer: 'bicycle' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Guess: "xe lửa" (vehicle + fire) means:', options: ['ambulance', 'train', 'rocket', 'fire truck'], answer: 'train' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"Ông bà" means:', options: ['parents', 'siblings', 'grandparents', 'neighbours'], answer: 'grandparents' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete the compound for "restaurant": nhà ___', answer: 'hàng' },
          ],
          writingPrompt: 'Pick three compounds from this lesson and use each in a full sentence. Then invent a guess for what "máy bay" (machine + fly) means and write it down.',
        },
        {
          id: 'm4w1l2',
          monthIndex: 3, weekIndex: 0, lessonIndex: 1,
          title: 'Reduplication (từ láy)',
          kind: 'vocabulary',
          objective: 'Recognise and enjoy Vietnamese echo-words',
          audioText: 'Vietnamese loves words that echo themselves. Nhỏ means small — nho nhỏ means smallish, cutely small. Xinh means pretty — xinh xắn means charmingly pretty. Lấp lánh means sparkling. Vui vẻ means cheerful. These are từ láy, reduplicated words. They add feeling, softness, and music to the language — poetry does not work without them.',
          content: `**Từ láy** = echo-words. A syllable is doubled or half-doubled, and the meaning turns softer, cuter, or more vivid.

## Full echoes
| Từ láy | From | Meaning |
|--------|------|---------|
| **nho nhỏ** | nhỏ (small) | smallish, cutely small |
| **xa xa** | xa (far) | far in the distance |
| **luôn luôn** | luôn (often) | always |

## Half echoes (sound rhymes or alliterates)
| Từ láy | Meaning |
|--------|---------|
| **xinh xắn** | pretty, charming |
| **vui vẻ** | cheerful |
| **lấp lánh** | sparkling, twinkling |
| **nhẹ nhàng** | gentle, soft |
| **chậm chạp** | sluggish, slow-ish |

## What the echo does
✓ Softens: nhỏ (small) → **nho nhỏ** (rather small, sweetly small)
✓ Paints pictures: sao **lấp lánh** — twinkling stars
✓ Adds rhythm — Vietnamese poetry and song lyrics overflow with từ láy

> Notice the tone can change in the echo: nh**ỏ** → nh**o** nhỏ. The echo obeys tone-harmony rules — your ear will learn them before your brain does.`,
          keyWords: [
            { word: 'nho nhỏ', meaning: 'smallish, cutely small' },
            { word: 'xinh xắn', meaning: 'pretty, charming' },
            { word: 'vui vẻ', meaning: 'cheerful' },
            { word: 'lấp lánh', meaning: 'sparkling, twinkling' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Từ láy" are words that:', options: ['borrow from Chinese', 'echo/repeat their sounds', 'have no tone', 'are always negative'], answer: 'echo/repeat their sounds' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Nho nhỏ" compared to "nhỏ" feels:', options: ['bigger', 'softer/cuter', 'angrier', 'more formal'], answer: 'softer/cuter' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which từ láy means "sparkling"?', options: ['vui vẻ', 'nhẹ nhàng', 'lấp lánh', 'chậm chạp'], answer: 'lấp lánh' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"Luôn luôn" means:', options: ['sometimes', 'never', 'always', 'quickly'], answer: 'always' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete the echo: xinh ___ (pretty, charming)', answer: 'xắn' },
          ],
          writingPrompt: 'Describe a night sky or a small pet in 3–4 sentences using at least three từ láy from this lesson (lấp lánh, nho nhỏ, xinh xắn, nhẹ nhàng…).',
        },
        {
          id: 'm4w1l3',
          monthIndex: 3, weekIndex: 0, lessonIndex: 2,
          title: 'Sino-Vietnamese Words (từ Hán Việt)',
          kind: 'vocabulary',
          objective: 'Spot the Chinese-rooted vocabulary that powers formal Vietnamese',
          audioText: 'About two thirds of Vietnamese dictionary words came from Chinese long ago, the way English borrowed from Latin. Học means study: học sinh is a student, đại học is university. Điện means electric: điện thoại is a telephone — electric speech! Giáo viên is a teacher. Learn one Sino-Vietnamese root and whole families of words unlock at once.',
          content: `**Từ Hán Việt** — Chinese-rooted words. They are to Vietnamese what Latin words are to English: the formal, academic layer.

## One root, many words
| Root | Meaning | Family |
|------|---------|--------|
| **học** | study | **học sinh** (student) · **đại học** (university) · **toán học** (mathematics) · **khoa học** (science) |
| **điện** | electric | **điện thoại** (telephone — "electric speech") · **điện ảnh** (cinema) · **máy tính điện tử** (computer) |
| **giáo** | teach | **giáo viên** (teacher) · **giáo dục** (education) |
| **quốc** | nation | **quốc gia** (country) · **quốc ngữ** (national script) · **Mỹ quốc** (America) |
| **đại** | great/big | **đại học** (university) · **đại dương** (ocean) |

## Native vs Sino-Vietnamese — two registers
| Everyday (native) | Formal (Hán Việt) | Meaning |
|-------------------|-------------------|---------|
| **nước** | **quốc gia** | country |
| **người** | **nhân** (in compounds) | person |
| **dạy** | **giáo dục** | teach / education |

> Reading tip: long, formal, two-syllable words in news and textbooks are usually Hán Việt. Learn the common roots and you can often decode them — just like "tele-phone" or "bio-logy" in English.`,
          keyWords: [
            { word: 'học sinh', meaning: 'student, pupil' },
            { word: 'giáo viên', meaning: 'teacher' },
            { word: 'điện thoại', meaning: 'telephone ("electric speech")' },
            { word: 'đại học', meaning: 'university' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Sino-Vietnamese words are like which layer of English?', options: ['slang', 'Latin-rooted vocabulary', 'baby talk', 'onomatopoeia'], answer: 'Latin-rooted vocabulary' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Điện thoại" literally means:', options: ['far sound', 'electric speech', 'hand machine', 'call box'], answer: 'electric speech' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'With học = study and đại = great, "đại học" is:', options: ['library', 'homework', 'university', 'professor'], answer: 'university' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"Giáo viên" means:', options: ['student', 'teacher', 'classroom', 'lesson'], answer: 'teacher' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete: ___ sinh means student (root meaning "study").', answer: 'học' },
          ],
          writingPrompt: 'Using the roots học, điện and giáo, list five Sino-Vietnamese words with their meanings, then write two sentences using any of them.',
        },
      ],
    },
    {
      index: 1,
      title: 'Đọc sâu hơn — Reading Deeper',
      lessons: [
        {
          id: 'm4w2l1',
          monthIndex: 3, weekIndex: 1, lessonIndex: 0,
          title: 'Fact, Opinion & Reading Between the Lines',
          kind: 'comprehension',
          objective: 'Tell sự thật from ý kiến and make inferences',
          audioText: 'Strong readers ask two questions. First: is this a fact or an opinion? Hà Nội là thủ đô của Việt Nam — Hanoi is the capital of Vietnam. That is a fact, sự thật. Phở Hà Nội ngon nhất — Hanoi phở is the tastiest. That is an opinion, ý kiến. Second: what is the writer NOT saying directly? If a story says someone slams a door and refuses to eat, you can infer they are angry — no one had to write the word.',
          content: `## Sự thật (fact) vs Ý kiến (opinion)
| Sentence | Type | Why |
|----------|------|-----|
| Hà Nội là thủ đô của Việt Nam. | **sự thật** | checkable — true or false |
| Phở Hà Nội ngon **nhất**. | **ý kiến** | "tastiest" is a judgement |
| Việt Nam có hơn 90 triệu dân. | **sự thật** | a number you can verify |
| Mùa thu là mùa đẹp nhất. | **ý kiến** | beauty is personal |

**Opinion flags:** nhất (the most), đẹp/ngon/hay (beauty words), nên (should), theo tôi (in my view).

## Suy luận — inference (reading between the lines)
> Lan đóng sầm cửa. Em không ăn cơm. Em không nói gì cả.
> *(Lan slammed the door. She didn't eat. She said nothing at all.)*

The word "angry" never appears — but you **know**. That's **suy luận**: clues + your knowledge → conclusion.

## Reader's checklist
✓ Is this checkable (fact) or a judgement (opinion)?
✓ What do the character's *actions* tell me that the words don't?
✓ Which little words (nhất, nên, theo tôi) reveal the writer's stance?`,
          keyWords: [
            { word: 'sự thật', meaning: 'fact; the truth' },
            { word: 'ý kiến', meaning: 'opinion' },
            { word: 'suy luận', meaning: 'to infer; inference' },
            { word: 'nhất', meaning: 'the most; number one (opinion flag!)' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Hà Nội là thủ đô của Việt Nam" is:', options: ['sự thật (fact)', 'ý kiến (opinion)', 'suy luận (inference)', 'a question'], answer: 'sự thật (fact)' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Mùa thu là mùa đẹp nhất" is an opinion because:', options: ['it mentions autumn', '"đẹp nhất" is a personal judgement', 'it is short', 'it has a tone mark'], answer: '"đẹp nhất" is a personal judgement' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Lan slams the door, skips dinner, says nothing. You infer she is:', options: ['sleepy', 'angry or upset', 'hungry', 'excited'], answer: 'angry or upset' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Which word is an opinion flag?', options: ['là', 'và', 'nhất', 'hai'], answer: 'nhất' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Suy luận" means:', options: ['summarising', 'inferring from clues', 'translating', 'memorising'], answer: 'inferring from clues' },
          ],
          writingPrompt: 'Write one sự thật and one ý kiến about your hometown (in Vietnamese). Then write two clue-sentences about a person\'s feelings WITHOUT naming the feeling — let the reader infer it.',
        },
        {
          id: 'm4w2l2',
          monthIndex: 3, weekIndex: 1, lessonIndex: 1,
          title: 'North & South: Regional Sounds',
          kind: 'comprehension',
          objective: 'Recognise the two main accents when listening — the writing stays the same',
          audioText: 'Vietnam is a long country, and the language sounds different at each end. In Hanoi, in the north, d and gi sound like z, and all six tones are distinct. In Ho Chi Minh City, in the south, d sounds like y, r is a strong r, and the hỏi and ngã tones melt together. Some words differ too: a bowl is bát in the north, chén in the south. Here is the good news: the WRITING is identical everywhere. What you learn to read works for the whole country.',
          content: `One written language, two big accent families. **Listening only** — the spelling never changes!

## Sound differences
| Letters | North (Hà Nội) | South (Sài Gòn / TP.HCM) |
|---------|----------------|---------------------------|
| d, gi | /z/ — "za" | /y/ — "ya" |
| r | /z/ | strong /r/ |
| s / x | both ≈ /s/ | s = /sh/, x = /s/ |
| tr / ch | both ≈ /ch/ | tr keeps its /tr/ colour |
| hỏi & ngã tones | two distinct tones | merge into one |

## Word swaps
| Meaning | North | South |
|---------|-------|-------|
| mother | **mẹ** | **má** |
| bowl | **bát** | **chén** |
| spoon | **thìa** | **muỗng** |
| pineapple | **dứa** | **thơm** |
| this | **này** | **nầy/nè** |

## What should YOU do?
✓ Pick one accent to imitate (most courses teach Hanoi), but train your **ears** on both.
✓ Reading and writing are 100% shared — chữ Quốc ngữ unites the country.
✓ Don't panic when "dạ" sounds like "ya" — that's just the south saying yes politely.`,
          keyWords: [
            { word: 'miền Bắc', meaning: 'the North (of Vietnam)' },
            { word: 'miền Nam', meaning: 'the South (of Vietnam)' },
            { word: 'giọng', meaning: 'accent; voice' },
            { word: 'bát', meaning: 'bowl (northern word)' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'In the South, the letter d sounds like:', options: ['/d/', '/z/', '/y/', '/t/'], answer: '/y/' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which two tones merge in southern speech?', options: ['ngang & sắc', 'hỏi & ngã', 'huyền & nặng', 'sắc & nặng'], answer: 'hỏi & ngã' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'The southern word for mother is:', options: ['mẹ', 'má', 'bà', 'chị'], answer: 'má' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'How does regional variation affect WRITTEN Vietnamese?', options: ['different alphabets', 'different tone marks', 'not at all — writing is shared', 'the south drops diacritics'], answer: 'not at all — writing is shared' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Giọng" means:', options: ['region', 'accent/voice', 'dialect word for rice', 'grammar'], answer: 'accent/voice' },
          ],
          writingPrompt: 'Make a two-column list from memory: three ways northern and southern pronunciation differ, and two word pairs (North/South). Which accent will you imitate, and why? One sentence.',
        },
      ],
    },
  ],
};
