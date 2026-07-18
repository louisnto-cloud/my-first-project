export type LessonKind = 'phonics' | 'vocabulary' | 'reading' | 'writing' | 'grammar' | 'comprehension';

export interface Exercise {
  id: string;
  kind: 'multiple-choice' | 'fill-blank' | 'write-sentence' | 'arrange-words' | 'read-aloud';
  prompt: string;
  options?: string[];
  answer: string;
  hint?: string;
}

export interface Lesson {
  id: string;
  monthIndex: number; // 0-5
  weekIndex: number;  // 0-3
  lessonIndex: number;
  title: string;
  kind: LessonKind;
  objective: string;
  audioText: string;   // text for TTS intro
  content: string;     // main lesson body (markdown-like)
  keyWords: { word: string; meaning: string }[];
  exercises: Exercise[];
  writingPrompt?: string;
}

export interface Month {
  index: number;
  title: string;
  subtitle: string;
  color: string;
  emoji: string;
  level: string;
  weeks: Week[];
}

export interface Week {
  index: number;
  title: string;
  lessons: Lesson[];
}

// ─── Month 1: Foundations ────────────────────────────────────────────────────
const month1: Month = {
  index: 0,
  title: 'Foundations',
  subtitle: 'Letters, Sounds & First Words',
  color: 'rose',
  emoji: '🌱',
  level: 'Beginner',
  weeks: [
    {
      index: 0,
      title: 'The Alphabet & Sounds',
      lessons: [
        {
          id: 'm1w1l1',
          monthIndex: 0, weekIndex: 0, lessonIndex: 0,
          title: 'Meet the Alphabet',
          kind: 'phonics',
          objective: 'Learn all 26 letters and their names',
          audioText: 'Welcome to your very first lesson! Today we are going to meet the alphabet. The English alphabet has 26 letters. There are 5 vowels: A, E, I, O, U. The rest are consonants. Let\'s go through them together.',
          content: `The English alphabet has **26 letters**.

**Vowels (5):** A · E · I · O · U
**Consonants (21):** B C D F G H J K L M N P Q R S T V W X Y Z

Every word is built from these letters. Learning them is your first big step!

**Uppercase & Lowercase:**
A a · B b · C c · D d · E e · F f · G g · H h · I i · J j · K k · L l · M m
N n · O o · P p · Q q · R r · S s · T t · U u · V v · W w · X x · Y y · Z z`,
          keyWords: [
            { word: 'alphabet', meaning: 'the set of all letters in a language' },
            { word: 'vowel', meaning: 'a letter that makes an open sound: A, E, I, O, U' },
            { word: 'consonant', meaning: 'any letter that is not a vowel' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'How many letters are in the English alphabet?', options: ['24', '25', '26', '28'], answer: '26' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which of these is a vowel?', options: ['B', 'C', 'E', 'G'], answer: 'E' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'How many vowels are there?', options: ['3', '4', '5', '6'], answer: '5' },
            { id: 'e4', kind: 'fill-blank', prompt: 'The vowels are A, ___, I, O, U.', answer: 'E', hint: 'It comes after A' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Which letter comes after M in the alphabet?', options: ['L', 'N', 'O', 'K'], answer: 'N' },
          ],
          writingPrompt: 'Write the alphabet from A to Z on a piece of paper. Say each letter aloud as you write it.',
        },
        {
          id: 'm1w1l2',
          monthIndex: 0, weekIndex: 0, lessonIndex: 1,
          title: 'Letter Sounds – Vowels',
          kind: 'phonics',
          objective: 'Learn the short vowel sounds: a, e, i, o, u',
          audioText: 'Now we learn what sounds the vowels make. Short A sounds like the A in cat. Short E sounds like the E in bed. Short I sounds like the I in sit. Short O sounds like the O in hot. Short U sounds like the U in cup.',
          content: `Vowels have **short sounds** and long sounds. Start with the short sounds.

| Letter | Short Sound | Example Word |
|--------|------------|-------------|
| A | /æ/ | **c-a-t** |
| E | /ɛ/ | **b-e-d** |
| I | /ɪ/ | **s-i-t** |
| O | /ɒ/ | **h-o-t** |
| U | /ʌ/ | **c-u-p** |

**How to practice:** Say the sound, then say the example word. Do this 5 times for each vowel.`,
          keyWords: [
            { word: 'sound', meaning: 'the noise a letter makes when you say it' },
            { word: 'short vowel', meaning: 'a quick, short vowel sound like the "a" in cat' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What short vowel sound does "bed" contain?', options: ['A', 'E', 'I', 'O'], answer: 'E' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which word has the short "U" sound?', options: ['use', 'cup', 'blue', 'cute'], answer: 'cup' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'What short vowel is in "sit"?', options: ['A', 'E', 'I', 'O'], answer: 'I' },
            { id: 'e4', kind: 'fill-blank', prompt: 'C _ T has the short A sound (like in cat).', answer: 'A', hint: 'short vowel, rhymes with bat' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Which word has the short O sound?', options: ['hot', 'home', 'hope', 'hole'], answer: 'hot' },
          ],
          writingPrompt: 'Write one word for each vowel sound: one word with short A, one with short E, one with short I, one with short O, one with short U.',
        },
        {
          id: 'm1w1l3',
          monthIndex: 0, weekIndex: 0, lessonIndex: 2,
          title: 'Consonant Sounds – Part 1',
          kind: 'phonics',
          objective: 'Learn the sounds of B, C, D, F, G, H, J, K, L, M',
          audioText: 'Let us learn the sounds that consonants make. B says buh, like in ball. C says kuh, like in cat. D says duh, like in dog. F says fuh, like in fish. G says guh, like in go. H says huh, like in hat. J says juh, like in jump. K says kuh, like in kite. L says luh, like in lion. M says muh, like in man.',
          content: `| Letter | Sound | Example |
|--------|-------|---------|
| B | /b/ | **ball** |
| C | /k/ | **cat** |
| D | /d/ | **dog** |
| F | /f/ | **fish** |
| G | /g/ | **go** |
| H | /h/ | **hat** |
| J | /dʒ/ | **jump** |
| K | /k/ | **kite** |
| L | /l/ | **lion** |
| M | /m/ | **man** |

**Tip:** C and K make the same sound /k/ most of the time.`,
          keyWords: [
            { word: 'consonant', meaning: 'any letter that is not a vowel' },
            { word: 'beginning sound', meaning: 'the first sound you hear in a word' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What sound does B make?', options: ['/p/', '/b/', '/d/', '/g/'], answer: '/b/' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which letter starts the word "fish"?', options: ['B', 'D', 'F', 'G'], answer: 'F' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Jump" starts with which letter?', options: ['G', 'H', 'J', 'K'], answer: 'J' },
            { id: 'e4', kind: 'fill-blank', prompt: '___og is a word for a common pet animal. Fill in the first letter.', answer: 'D', hint: 'It barks!' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'C and K make the same sound. What is it?', options: ['/s/', '/k/', '/ch/', '/g/'], answer: '/k/' },
          ],
        },
        {
          id: 'm1w1l4',
          monthIndex: 0, weekIndex: 0, lessonIndex: 3,
          title: 'Consonant Sounds – Part 2',
          kind: 'phonics',
          objective: 'Learn the sounds of N, P, Q, R, S, T, V, W, X, Y, Z',
          audioText: 'Let us finish the consonants. N says nnn, like in net. P says puh, like in pig. Q says kwuh, like in queen. R says rrr, like in run. S says sss, like in sun. T says tuh, like in top. V says vvv, like in van. W says wuh, like in win. X says ks, like at the end of box. Y says yuh, like in yes. And Z says zzz, like in zip.',
          content: `| Letter | Sound | Example |
|--------|-------|---------|
| N | /n/ | **net** |
| P | /p/ | **pig** |
| Q | /kw/ | **queen** |
| R | /r/ | **run** |
| S | /s/ | **sun** |
| T | /t/ | **top** |
| V | /v/ | **van** |
| W | /w/ | **win** |
| X | /ks/ | **box** |
| Y | /y/ | **yes** |
| Z | /z/ | **zip** |

**Tips:**
- **Q** is almost always followed by **u**: queen, quick, quiet
- **X** usually comes at the END of words: box, fox, six
- **S** can sometimes sound like /z/: is, his, does`,
          keyWords: [
            { word: 'net', meaning: 'a material with holes, used to catch things' },
            { word: 'queen', meaning: 'a female ruler of a country' },
            { word: 'zip', meaning: 'to close something with a zipper; a fast movement' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What sound does S make in "sun"?', options: ['/z/', '/s/', '/sh/', '/t/'], answer: '/s/' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which letter almost always comes after Q?', options: ['a', 'e', 'u', 'o'], answer: 'u' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Where does X usually appear in a word?', options: ['at the start', 'in the middle', 'at the end', 'X is never used'], answer: 'at the end' },
            { id: 'e4', kind: 'fill-blank', prompt: '___an is a vehicle for carrying things. Fill in the first letter.', answer: 'V', hint: 'It makes the /v/ sound' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Which word starts with the /w/ sound?', options: ['van', 'win', 'yes', 'zip'], answer: 'win' },
          ],
          writingPrompt: 'Write one word that starts with each of these letters: N, P, R, S, T, W. Say each word aloud as you write it.',
        },
      ],
    },
    {
      index: 1,
      title: 'My First Words',
      lessons: [
        {
          id: 'm1w2l1',
          monthIndex: 0, weekIndex: 1, lessonIndex: 0,
          title: 'CVC Words – Short Vowels',
          kind: 'phonics',
          objective: 'Blend consonant-vowel-consonant words',
          audioText: 'Now we are going to blend letters together to make words. CVC means Consonant, Vowel, Consonant. Words like cat, dog, and sit follow this pattern. Let us practice blending the sounds together.',
          content: `**CVC** = Consonant + Vowel + Consonant

These are the simplest English words. Blend the sounds together:

**-at words:** c-at → **cat** · h-at → **hat** · s-at → **sat** · b-at → **bat** · m-at → **mat**

**-en words:** h-en → **hen** · t-en → **ten** · p-en → **pen** · b-en → **Ben** · d-en → **den**

**-it words:** s-it → **sit** · h-it → **hit** · b-it → **bit** · f-it → **fit** · k-it → **kit**

**-og words:** d-og → **dog** · l-og → **log** · f-og → **fog** · j-og → **jog** · h-og → **hog**

**-up words:** c-up → **cup** · p-up → **pup** · b-us → **bus** · r-un → **run** · f-un → **fun**

**How to blend:** Say each sound slowly, then speed up. c…a…t → cat ✓`,
          keyWords: [
            { word: 'blend', meaning: 'to join sounds together to make a word' },
            { word: 'CVC', meaning: 'Consonant-Vowel-Consonant — the pattern of simple words' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Blend the sounds: /h/ /a/ /t/ = ?', options: ['hat', 'hot', 'hit', 'hut'], answer: 'hat' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which word follows the CVC pattern?', options: ['tree', 'dog', 'play', 'each'], answer: 'dog' },
            { id: 'e3', kind: 'arrange-words', prompt: 'Arrange these sounds to make a word: /p/ /e/ /n/', answer: 'pen', hint: 'You write with it' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'What word do these sounds make? /s/ /i/ /t/', options: ['set', 'sat', 'sit', 'sot'], answer: 'sit' },
            { id: 'e5', kind: 'fill-blank', prompt: 'c_p is a thing you drink from. Fill in the vowel.', answer: 'u', hint: 'short U sound' },
          ],
          writingPrompt: 'Write 5 CVC words and draw a small picture next to each one.',
        },
        {
          id: 'm1w2l2',
          monthIndex: 0, weekIndex: 1, lessonIndex: 1,
          title: 'Sight Words – Set 1',
          kind: 'vocabulary',
          objective: 'Memorise the 20 most common English words by sight',
          audioText: 'Some words appear so often in English that we learn to recognise them instantly without sounding them out. These are called sight words. Today we learn the first 20: the, a, is, in, it, of, to, and, he, she, we, my, you, are, was, on, at, do, go, if.',
          content: `**Sight words** are words you see so often you should recognise them instantly.

**The Dolch Pre-Primer List (first 20):**

| | | | |
|--|--|--|--|
| **the** | **a** | **is** | **in** |
| **it** | **of** | **to** | **and** |
| **he** | **she** | **we** | **my** |
| **you** | **are** | **was** | **on** |
| **at** | **do** | **go** | **if** |

**Practice tip:** Make flashcards. Look at each word. Say it. Spell it. Write it. Say it again.`,
          keyWords: [
            { word: 'sight word', meaning: 'a word you recognise by sight without sounding it out' },
            { word: 'memorise', meaning: 'to learn something so you remember it perfectly' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which of these is a sight word?', options: ['xylophone', 'the', 'elephant', 'umbrella'], answer: 'the' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Complete: "__ am happy." (Use a sight word)', options: ['the', 'I', 'go', 'on'], answer: 'I' },
            { id: 'e3', kind: 'fill-blank', prompt: '"She ___ my friend." Fill in the sight word.', answer: 'is', hint: 'It means "equals" in a sentence' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Which sight word means "belonging to me"?', options: ['we', 'you', 'my', 'she'], answer: 'my' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"He ___ to school." Which sight word fits?', options: ['do', 'go', 'goes', 'are'], answer: 'go' },
          ],
          writingPrompt: 'Write 5 short sentences using only sight words and simple CVC words. Example: "He is at my mat."',
        },
        {
          id: 'm1w2l3',
          monthIndex: 0, weekIndex: 1, lessonIndex: 2,
          title: 'Digraphs – Two Letters, One Sound',
          kind: 'phonics',
          objective: 'Read words with sh, ch, th, wh, and ck',
          audioText: 'Sometimes two letters work together to make one new sound. These are called digraphs. S and H together say shhh, like in ship. C and H together say ch, like in chip. T and H together say th, like in this or thin. W and H together say wh, like in when. And C and K together say k, like at the end of duck.',
          content: `A **digraph** is two letters that make ONE sound together.

| Digraph | Sound | Examples |
|---------|-------|----------|
| **sh** | /ʃ/ | **ship** · fish · shop · wish |
| **ch** | /tʃ/ | **chip** · chat · much · lunch |
| **th** | /θ/ or /ð/ | **thin** · this · bath · that |
| **wh** | /w/ | **when** · what · white · why |
| **ck** | /k/ | **duck** · back · sock · kick |

**Practice blending:**
- sh-i-p → **ship** ✓ (3 sounds, 4 letters!)
- ch-a-t → **chat** ✓
- th-i-n → **thin** ✓
- d-u-ck → **duck** ✓

**Remember:** count the SOUNDS, not the letters. "Ship" has 4 letters but only 3 sounds, because **sh** is one sound.`,
          keyWords: [
            { word: 'digraph', meaning: 'two letters that together make one sound, like sh or ch' },
            { word: 'ship', meaning: 'a large boat that travels on the sea' },
            { word: 'wish', meaning: 'to want something to happen' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What is a digraph?', options: ['two words joined together', 'two letters that make one sound', 'a long vowel', 'a silent letter'], answer: 'two letters that make one sound' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which digraph starts the word "ship"?', options: ['ch', 'th', 'sh', 'wh'], answer: 'sh' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'How many SOUNDS are in the word "chat"?', options: ['2', '3', '4', '5'], answer: '3' },
            { id: 'e4', kind: 'fill-blank', prompt: 'du___ is a bird that swims. Fill in the missing digraph.', answer: 'ck', hint: 'Two letters that say /k/' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Which word contains the "th" digraph?', options: ['ship', 'chip', 'bath', 'when'], answer: 'bath' },
          ],
          writingPrompt: 'Write 2 words for each digraph: sh, ch, th. Then choose your 3 favourites and use each in a short sentence.',
        },
      ],
    },
    {
      index: 2,
      title: 'Simple Sentences',
      lessons: [
        {
          id: 'm1w3l1',
          monthIndex: 0, weekIndex: 2, lessonIndex: 0,
          title: 'What is a Sentence?',
          kind: 'writing',
          objective: 'Understand what makes a complete sentence',
          audioText: 'A sentence is a group of words that makes a complete thought. Every sentence needs two things: a subject and a verb. The subject is who or what the sentence is about. The verb tells what they do or are. A sentence starts with a capital letter and ends with a full stop, a question mark, or an exclamation mark.',
          content: `A **sentence** is a complete thought.

**Every sentence needs:**
1. A **subject** (who or what it's about)
2. A **verb** (what they do or are)
3. A **capital letter** at the start
4. **Punctuation** at the end (. ? !)

**Examples:**
✅ "The cat sits." → Subject: The cat · Verb: sits
✅ "She runs fast." → Subject: She · Verb: runs
❌ "The big dog." → Not a sentence! No verb.
❌ "runs fast." → Not a sentence! No subject.

**Three types of sentences:**
- Statement: "The dog barks." → ends with **.**
- Question: "Does the dog bark?" → ends with **?**
- Exclamation: "The dog is huge!" → ends with **!**`,
          keyWords: [
            { word: 'sentence', meaning: 'a group of words that expresses a complete thought' },
            { word: 'subject', meaning: 'the person or thing the sentence is about' },
            { word: 'verb', meaning: 'a word that shows action or a state of being' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which of these is a complete sentence?', options: ['The big red.', 'She runs.', 'Very fast and.', 'Dog the'], answer: 'She runs.' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'What punctuation ends a question?', options: ['.', '!', '?', ','], answer: '?' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'In "The cat sits.", what is the subject?', options: ['sits', 'The cat', '.', 'The'], answer: 'The cat' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Every sentence must start with a ___ letter.', answer: 'capital', hint: 'The opposite of lowercase' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"She is happy!" — what type of sentence is this?', options: ['Statement', 'Question', 'Exclamation', 'Command'], answer: 'Exclamation' },
          ],
          writingPrompt: 'Write 3 sentences about yourself: one statement, one question, one exclamation.',
        },
        {
          id: 'm1w3l2',
          monthIndex: 0, weekIndex: 2, lessonIndex: 1,
          title: 'Magic E – Long Vowels',
          kind: 'phonics',
          objective: 'Read words where a silent final E makes the vowel say its name',
          audioText: 'Here is a magic trick in English spelling. When a word ends in E, that E is usually silent — but it changes the vowel before it. The vowel stops making its short sound and says its own NAME instead. Cap becomes cape. Kit becomes kite. Hop becomes hope. Cub becomes cube. We call this the magic E, or the silent E.',
          content: `**Magic E** (silent E) makes the vowel before it say its NAME.

| Short vowel | + Magic E | Long vowel |
|-------------|-----------|------------|
| c**a**p /æ/ | → | c**a**p**e** /eɪ/ |
| k**i**t /ɪ/ | → | k**i**t**e** /aɪ/ |
| h**o**p /ɒ/ | → | h**o**p**e** /oʊ/ |
| c**u**b /ʌ/ | → | c**u**b**e** /juː/ |
| p**e**t /ɛ/ | → | P**e**t**e** /iː/ |

**More magic E pairs:**
- man → **mane** · can → **cane** · tap → **tape** · mad → **made**
- pin → **pine** · rip → **ripe** · fin → **fine** · bit → **bite**
- not → **note** · rod → **rode** · ton → **tone**
- tub → **tube** · cut → **cute** · us → **use**

**The rule:** the E itself is SILENT — you never say it. Its only job is to change the vowel.

**How to read a magic E word:**
1. See the E at the end? It's silent.
2. Make the vowel say its NAME (A says "ay", I says "eye", O says "oh"...)
3. Blend: k … i(eye) … t → **kite** ✓`,
          keyWords: [
            { word: 'silent', meaning: 'making no sound' },
            { word: 'long vowel', meaning: 'a vowel that says its own name, like the A in cape' },
            { word: 'kite', meaning: 'a toy that flies on a string in the wind' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What does the magic E do?', options: ['makes the word plural', 'makes the vowel say its name', 'adds an extra sound', 'makes the word past tense'], answer: 'makes the vowel say its name' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Add a magic E to "hop". What word do you get?', options: ['hops', 'hoppe', 'hope', 'hooped'], answer: 'hope' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Do you pronounce the E at the end of "kite"?', options: ['yes, loudly', 'yes, quietly', 'no, it is silent', 'only in questions'], answer: 'no, it is silent' },
            { id: 'e4', kind: 'fill-blank', prompt: 'cub + magic E = ___', answer: 'cube', hint: 'A shape with 6 square sides' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Which word has a LONG vowel sound?', options: ['cap', 'kit', 'tape', 'hop'], answer: 'tape' },
          ],
          writingPrompt: 'Write 5 magic E word pairs (like hop → hope). Then write one sentence that uses BOTH words of one pair. Example: "I hop with hope."',
        },
      ],
    },
    {
      index: 3,
      title: 'Reading My First Story',
      lessons: [
        {
          id: 'm1w4l1',
          monthIndex: 0, weekIndex: 3, lessonIndex: 0,
          title: 'The Big Red Dog',
          kind: 'reading',
          objective: 'Read a short story and answer basic comprehension questions',
          audioText: 'We are going to read your very first story. It is called The Big Red Dog. Listen carefully, and then answer the questions.',
          content: `# The Big Red Dog

Dan has a big red dog.
The dog is called Rex.
Rex can run fast.
Rex can sit and stay.
Dan and Rex go to the park.
Rex digs in the mud.
"No, Rex!" says Dan.
Rex wags his tail.
Dan laughs.
He loves his big red dog.

---
**After reading, think about:**
- Who is the story about?
- What does Rex do in the park?
- How does Dan feel at the end?`,
          keyWords: [
            { word: 'wag', meaning: 'to move the tail back and forth (dogs do this when happy)' },
            { word: 'mud', meaning: 'soft, wet earth' },
            { word: 'park', meaning: 'a public area of land for recreation' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What colour is Rex?', options: ['blue', 'brown', 'red', 'black'], answer: 'red' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Where do Dan and Rex go?', options: ['to school', 'to the park', 'to a shop', 'to bed'], answer: 'to the park' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'What does Rex do in the mud?', options: ['sits', 'runs', 'digs', 'sleeps'], answer: 'digs' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'How does Dan feel at the end?', options: ['sad', 'angry', 'scared', 'happy/laughing'], answer: 'happy/laughing' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Rex wags his ___.', answer: 'tail', hint: 'The back end of a dog' },
          ],
          writingPrompt: 'Write 3 sentences about your favourite animal. Describe what it looks like and what it does.',
        },
      ],
    },
  ],
};

// ─── Month 2: Building Blocks ────────────────────────────────────────────────
const month2: Month = {
  index: 1,
  title: 'Building Blocks',
  subtitle: 'Words, Phrases & Simple Stories',
  color: 'orange',
  emoji: '🧱',
  level: 'Elementary',
  weeks: [
    {
      index: 0,
      title: 'Nouns & Verbs',
      lessons: [
        {
          id: 'm2w1l1',
          monthIndex: 1, weekIndex: 0, lessonIndex: 0,
          title: 'Nouns – People, Places & Things',
          kind: 'grammar',
          objective: 'Identify and use nouns in sentences',
          audioText: 'A noun is a word that names a person, a place, a thing, or an idea. In the sentence "The girl reads a book in the library", the nouns are girl, book, and library. Nouns are the building blocks of sentences.',
          content: `A **noun** is a word that names a **person, place, thing, or idea**.

**People:** teacher · student · doctor · friend · child
**Places:** school · park · city · home · market
**Things:** book · car · apple · phone · chair
**Ideas:** love · freedom · happiness · time · truth

**How to spot a noun:**
Ask "Is this a person, place, or thing?" If yes → it's a noun!

**Singular & Plural:**
Most nouns add **-s** or **-es** to become plural:
- book → **books**
- cat → **cats**
- bus → **buses**
- box → **boxes**

**Irregular plurals** (don't follow the rule!):
- man → **men** · woman → **women** · child → **children** · mouse → **mice**`,
          keyWords: [
            { word: 'noun', meaning: 'a word that names a person, place, thing, or idea' },
            { word: 'singular', meaning: 'one of something' },
            { word: 'plural', meaning: 'more than one of something' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which word is a noun?', options: ['run', 'happy', 'table', 'quickly'], answer: 'table' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'What is the plural of "child"?', options: ['childs', 'childes', 'children', 'childer'], answer: 'children' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'In "The dog runs in the park", which words are nouns?', options: ['The, runs', 'dog, park', 'runs, in', 'The, in'], answer: 'dog, park' },
            { id: 'e4', kind: 'fill-blank', prompt: 'The plural of "box" is ___.', answer: 'boxes', hint: 'Add -es when a word ends in x, s, sh, ch' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Love" is what type of noun?', options: ['person', 'place', 'thing', 'idea'], answer: 'idea' },
          ],
          writingPrompt: 'Write 5 nouns from your house. Then write a sentence using each one.',
        },
        {
          id: 'm2w1l2',
          monthIndex: 1, weekIndex: 0, lessonIndex: 1,
          title: 'Action Verbs',
          kind: 'grammar',
          objective: 'Use action verbs correctly in sentences',
          audioText: 'A verb is a doing word. It tells us what someone or something does. Run, jump, eat, sleep, read, write, laugh, and think are all verbs. Without a verb, you cannot have a sentence.',
          content: `An **action verb** tells what someone or something does.

**Common action verbs:**
run · jump · eat · sleep · read · write · laugh · think · play · walk · swim · sing · draw · help · speak

**Verb forms – Present tense:**
| Subject | Verb form | Example |
|---------|-----------|---------|
| I / You / We / They | base form | I **run** every day |
| He / She / It | add -s or -es | She **runs** every day |

**Special cases:**
- go → he **goes** · do → she **does** · have → he **has**

**Tense changes:**
- Present: "She **walks** to school."
- Past: "She **walked** to school."  ← add -ed
- Future: "She **will walk** to school." ← add "will"`,
          keyWords: [
            { word: 'verb', meaning: 'a word that shows an action or state of being' },
            { word: 'tense', meaning: 'whether the action happens now, in the past, or in the future' },
            { word: 'present', meaning: 'happening now or regularly' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which word is a verb?', options: ['book', 'blue', 'run', 'big'], answer: 'run' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"She ___ to school every day." Which verb form is correct?', options: ['walk', 'walks', 'walking', 'walked'], answer: 'walks' },
            { id: 'e3', kind: 'fill-blank', prompt: '"They ___ football on Saturdays." (play — use the correct form)', answer: 'play', hint: 'They → use the base form' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'What is the past tense of "walk"?', options: ['walking', 'walks', 'walked', 'will walk'], answer: 'walked' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"He ___ to the market." Which is correct?', options: ['go', 'goes', 'going', 'gone'], answer: 'goes' },
          ],
          writingPrompt: 'Write 5 sentences about what you do every day. Use a different verb in each sentence.',
        },
      ],
    },
    {
      index: 1,
      title: 'Adjectives & Descriptions',
      lessons: [
        {
          id: 'm2w2l1',
          monthIndex: 1, weekIndex: 1, lessonIndex: 0,
          title: 'Describing with Adjectives',
          kind: 'grammar',
          objective: 'Use adjectives to describe nouns',
          audioText: 'An adjective is a word that describes a noun. It tells us more about a person, place, or thing. Big, small, red, happy, and loud are all adjectives. Adjectives make our writing more interesting and detailed.',
          content: `An **adjective** describes a noun. It answers: What kind? How many? Which one?

**Describing size:** big · small · tall · short · huge · tiny
**Describing colour:** red · blue · green · yellow · white · black
**Describing feeling:** happy · sad · angry · scared · excited · tired
**Describing quality:** good · bad · fast · slow · hot · cold · soft · hard

**Where adjectives go:**
1. Before the noun: "a **red** car" · "a **tall** building"
2. After "be": "The car is **red**." · "She is **happy**."

**Comparing adjectives:**
- big → **bigger** (than) → **biggest** (of all)
- fast → **faster** → **fastest**
- beautiful → **more beautiful** → **most beautiful**
  *(long adjectives use "more" and "most")*`,
          keyWords: [
            { word: 'adjective', meaning: 'a word that describes or modifies a noun' },
            { word: 'describe', meaning: 'to give details about what something is like' },
            { word: 'compare', meaning: 'to show how things are similar or different' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which word is an adjective?', options: ['run', 'quickly', 'beautiful', 'she'], answer: 'beautiful' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"The ___ dog barked loudly." Which adjective fits?', options: ['run', 'big', 'and', 'to'], answer: 'big' },
            { id: 'e3', kind: 'fill-blank', prompt: 'The comparative of "fast" is ___.', answer: 'faster', hint: 'Add -er to short adjectives' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Which sentence uses an adjective correctly?', options: ['"She happy is."', '"Happy she is."', '"She is happy."', '"Is she happy the."'], answer: '"She is happy."' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'The superlative of "beautiful" is?', options: ['beautifuler', 'more beautiful', 'most beautiful', 'beautifullest'], answer: 'most beautiful' },
          ],
          writingPrompt: 'Describe your bedroom using at least 5 adjectives. Write at least 4 sentences.',
        },
        {
          id: 'm2w2l2',
          monthIndex: 1, weekIndex: 1, lessonIndex: 1,
          title: 'Adverbs – How, When, Where',
          kind: 'grammar',
          objective: 'Use adverbs to describe how, when, and where actions happen',
          audioText: 'Adjectives describe nouns — but adverbs describe verbs. They tell us HOW, WHEN, or WHERE something happens. She runs quickly. He arrived yesterday. The dog sleeps outside. Many adverbs end in L-Y: quickly, slowly, happily, loudly.',
          content: `An **adverb** describes a verb. It answers: **How? When? Where?**

**HOW adverbs (manner)** — often end in **-ly**:
quickly · slowly · happily · loudly · quietly · carefully · badly · well

**WHEN adverbs (time):**
now · today · yesterday · soon · later · always · never · often · sometimes

**WHERE adverbs (place):**
here · there · outside · inside · everywhere · upstairs · nearby

**Examples:**
- "She sings **beautifully**." ← HOW does she sing?
- "We will leave **soon**." ← WHEN will we leave?
- "The children play **outside**." ← WHERE do they play?

**Making adverbs from adjectives — add -ly:**
| Adjective | Adverb |
|-----------|--------|
| quick | quick**ly** |
| slow | slow**ly** |
| happy | happ**ily** (y → i) |
| gentle | gent**ly** (drop e) |

**Watch out — irregulars:**
- good → **well** ("She sings well", NOT "goodly")
- fast → **fast** ("He runs fast", no change)
- hard → **hard** ("They work hard")`,
          keyWords: [
            { word: 'adverb', meaning: 'a word that describes a verb — how, when, or where' },
            { word: 'quickly', meaning: 'in a fast way' },
            { word: 'often', meaning: 'many times; frequently' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which word is an adverb?', options: ['quick', 'quickly', 'quickness', 'quicker'], answer: 'quickly' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"She sings ___." Which is correct?', options: ['beautiful', 'beautifully', 'beauty', 'more beautiful'], answer: 'beautifully' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"We play outside." What does "outside" tell us?', options: ['how', 'when', 'where', 'why'], answer: 'where' },
            { id: 'e4', kind: 'fill-blank', prompt: 'The adverb form of "good" is ___.', answer: 'well', hint: 'It is irregular!' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"He arrived yesterday." What does "yesterday" tell us?', options: ['how', 'when', 'where', 'what'], answer: 'when' },
          ],
          writingPrompt: 'Write 6 sentences about your morning routine. Use at least one HOW adverb, one WHEN adverb, and one WHERE adverb. Underline each adverb.',
        },
      ],
    },
    {
      index: 2,
      title: 'Punctuation & Capitals',
      lessons: [
        {
          id: 'm2w3l1',
          monthIndex: 1, weekIndex: 2, lessonIndex: 0,
          title: 'Punctuation Marks',
          kind: 'writing',
          objective: "Use basic punctuation correctly: . , ? ! ' \"",
          audioText: 'Punctuation marks are symbols that help readers understand your writing. A full stop ends a sentence. A comma makes a pause. A question mark ends a question. An exclamation mark shows strong feeling. Apostrophes show ownership or missing letters. Quotation marks show someone is speaking.',
          content: `**Punctuation marks and their jobs:**

| Mark | Name | Use | Example |
|------|------|-----|---------|
| **.** | Full stop / Period | Ends a statement | "She reads books." |
| **,** | Comma | Makes a pause / joins ideas | "I like cats, dogs, and fish." |
| **?** | Question mark | Ends a question | "Do you like cats?" |
| **!** | Exclamation mark | Shows strong emotion | "Watch out!" |
| **'** | Apostrophe | Possession or contraction | "Tom's book" / "don't" |
| **" "** | Quotation marks | Shows someone speaking | "Hello," she said. |

**Commas in lists:**
Use commas to separate items in a list:
"I bought apples, oranges, and bananas."

**Apostrophes for possession:**
"the girl's bag" = the bag belonging to the girl
"the dogs' bowls" = the bowls belonging to the dogs (plural)`,
          keyWords: [
            { word: 'punctuation', meaning: 'symbols used in writing to separate ideas and make meaning clear' },
            { word: 'apostrophe', meaning: "a punctuation mark (') used for possession or contractions" },
            { word: 'contraction', meaning: 'two words joined and shortened, e.g. do not → don\'t' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which mark ends a question?', options: ['.', ',', '?', '!'], answer: '?' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"I like tea, coffee___ and juice." Which punctuation goes in the blank?', options: ['.', ',', '?', '!'], answer: ',' },
            { id: 'e3', kind: 'fill-blank', prompt: '"Don___t" — what punctuation is missing? (contraction of do not)', answer: "'", hint: 'An apostrophe replaces the missing letter' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"The ___ book is red." (belonging to the boy) Which is correct?', options: ["boy's", 'boys', 'boys\'s', 'boy'], answer: "boy's" },
            { id: 'e5', kind: 'multiple-choice', prompt: 'What do quotation marks show?', options: ['a pause', 'someone speaking', 'the end of a sentence', 'possession'], answer: 'someone speaking' },
          ],
          writingPrompt: 'Write a short conversation between two people (4–6 lines). Use quotation marks, commas, and the correct end punctuation.',
        },
        {
          id: 'm2w3l2',
          monthIndex: 1, weekIndex: 2, lessonIndex: 1,
          title: 'Capital Letters – The Rules',
          kind: 'writing',
          objective: 'Apply the capital letter rules: sentence starts, names, places, days, months, and "I"',
          audioText: 'Capital letters are not random — there are clear rules for when to use them. Always capitalise the first word of a sentence. Always capitalise names of people, places, days of the week, months, and languages. And the word I — meaning yourself — is always a capital, wherever it appears.',
          content: `**ALWAYS use a capital letter for:**

**1. The first word of every sentence**
> "**T**he dog barked."

**2. The word "I"**
> "My friend and **I** went home." (never "my friend and i")

**3. Names of people (and their titles)**
> **L**inh · **M**r **S**mith · **D**octor **T**ran · **Q**ueen **E**lizabeth

**4. Places — cities, countries, streets, buildings**
> **V**ietnam · **P**aris · **M**ain **S**treet · **E**iffel **T**ower

**5. Days, months, and holidays**
> **M**onday · **J**uly · **N**ew **Y**ear
> ⚠️ But NOT seasons: spring, summer, autumn, winter stay lowercase!

**6. Languages and nationalities**
> **E**nglish · **V**ietnamese · **F**rench

**7. Titles of books, films, and songs (the important words)**
> *The Lion King* · *Harry Potter and the Philosopher's Stone*

**Common mistakes:**
❌ "i like english." → ✅ "**I** like **E**nglish."
❌ "We met on monday in hanoi." → ✅ "We met on **M**onday in **H**anoi."
❌ "I love Summer." → ✅ "I love summer." (seasons are lowercase!)`,
          keyWords: [
            { word: 'capitalise', meaning: 'to write a letter in its large (uppercase) form' },
            { word: 'title', meaning: 'the name of a book, film, or song; or a word like Mr or Doctor before a name' },
            { word: 'nationality', meaning: 'belonging to a particular country, like Vietnamese or French' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which sentence is correct?', options: ['i live in vietnam.', 'I live in vietnam.', 'I live in Vietnam.', 'i live in Vietnam.'], answer: 'I live in Vietnam.' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which word should NOT be capitalised?', options: ['monday', 'summer', 'english', 'paris'], answer: 'summer' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"my teacher mr tran speaks french." How many words need capitals?', options: ['2', '3', '4', '5'], answer: '4' },
            { id: 'e4', kind: 'fill-blank', prompt: 'The word "___" (meaning yourself) is always a capital letter.', answer: 'I', hint: 'One letter, means you!' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Days and months are capitalised. Seasons are:', options: ['also capitalised', 'lowercase', 'capitalised in summer only', 'never written'], answer: 'lowercase' },
          ],
          writingPrompt: 'Write 5 sentences about your week: include a day, a month, a place, a person\'s name, and the word "I". Check every capital letter.',
        },
      ],
    },
    {
      index: 3,
      title: 'Reading Short Texts',
      lessons: [
        {
          id: 'm2w4l1',
          monthIndex: 1, weekIndex: 3, lessonIndex: 0,
          title: 'Finding the Main Idea',
          kind: 'comprehension',
          objective: 'Identify the main idea and key details in a paragraph',
          audioText: 'When you read a paragraph, ask yourself: what is this mainly about? That is the main idea. All the other sentences give more details about the main idea. Finding the main idea helps you understand what you read much faster.',
          content: `**Read this paragraph:**

> Dogs make excellent pets for many reasons. They are loyal and friendly companions. Dogs can be trained to follow commands, which makes them safe around children. They also encourage their owners to exercise by going for walks and playing outside. A well-cared-for dog will give its owner unconditional love for many years.

**The Main Idea:** Dogs make excellent pets.
*(The first sentence often contains the main idea.)*

**Supporting Details:**
- Loyal and friendly companions
- Can be trained, safe around children
- Encourage exercise
- Give unconditional love

**Finding the Main Idea — 3 Questions:**
1. What is this paragraph mostly about?
2. What idea do all the sentences support?
3. Which sentence could be removed if we wanted only one sentence?`,
          keyWords: [
            { word: 'main idea', meaning: 'the most important point of a text' },
            { word: 'supporting detail', meaning: 'a fact or example that backs up the main idea' },
            { word: 'paragraph', meaning: 'a group of sentences about one topic' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What is the main idea of the paragraph about dogs?', options: ['Dogs need exercise.', 'Dogs make excellent pets.', 'Dogs can follow commands.', 'Dogs are loyal.'], answer: 'Dogs make excellent pets.' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Where is the main idea often found?', options: ['The last sentence', 'A random sentence', 'Often the first sentence', 'It is never stated'], answer: 'Often the first sentence' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which detail supports the main idea about dogs?', options: ['Some people are allergic to dogs.', 'Dogs encourage their owners to exercise.', 'Dogs are expensive to keep.', 'Not all dogs are friendly.'], answer: 'Dogs encourage their owners to exercise.' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Sentences that give more information about the main idea are called ___ details.', answer: 'supporting', hint: 'They support the main point' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'The main idea is:', options: ['every single detail in the text', 'the most important point the author is making', 'always in the last paragraph', 'always a question'], answer: 'the most important point the author is making' },
          ],
          writingPrompt: 'Write a paragraph of 4–5 sentences about your favourite food. Make your first sentence the main idea.',
        },
        {
          id: 'm2w4l2',
          monthIndex: 1, weekIndex: 3, lessonIndex: 1,
          title: 'Sequencing – First, Next, Finally',
          kind: 'comprehension',
          objective: 'Follow and retell the order of events in a text using sequence words',
          audioText: 'Good readers keep track of the ORDER in which things happen. Sequence words are signposts: first, next, then, after that, and finally. When you can retell a story in the right order, you have truly understood it.',
          content: `**Sequence words** tell you the ORDER of events:

**Beginning:** first · to start · at the beginning
**Middle:** next · then · after that · later · meanwhile
**End:** finally · at last · in the end

**Read this short text:**

> **First**, Mai filled the kettle and switched it on. **While** the water heated, she put a tea bag in her favourite cup. **Next**, she poured the hot water carefully. **After** three minutes, she removed the tea bag. **Finally**, she added a little milk and carried the cup to the balcony.

**Retell check — put these in order:**
1. Fill the kettle ✓ (first)
2. Add the tea bag to the cup
3. Pour the hot water
4. Remove the tea bag
5. Add milk ✓ (finally)

**Why sequencing matters:**
- Instructions and recipes fail if steps are out of order
- Stories only make sense in sequence
- Retelling in order proves you understood, not just recognised, the text

**Retelling formula:** "First… then… next… finally…" — use it to summarise anything you read!`,
          keyWords: [
            { word: 'sequence', meaning: 'the order in which things happen' },
            { word: 'retell', meaning: 'to tell a story again in your own words' },
            { word: 'finally', meaning: 'at the end; as the last thing' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'In the text, what does Mai do FIRST?', options: ['adds milk', 'fills the kettle', 'removes the tea bag', 'pours the water'], answer: 'fills the kettle' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'What does Mai do right AFTER pouring the hot water?', options: ['fills the kettle', 'adds milk', 'waits three minutes then removes the tea bag', 'goes to the balcony'], answer: 'waits three minutes then removes the tea bag' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which word signals the END of a sequence?', options: ['first', 'next', 'then', 'finally'], answer: 'finally' },
            { id: 'e4', kind: 'fill-blank', prompt: '"___, next, then, finally" — fill in the first sequence word.', answer: 'First', hint: 'It starts everything' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Why is sequencing important when reading instructions?', options: ['it makes them longer', 'steps out of order can fail', 'it adds description', 'it is not important'], answer: 'steps out of order can fail' },
          ],
          writingPrompt: 'Write instructions for something you know how to do (making coffee, tying shoes, sending a message). Use First, Next, Then, and Finally — one step per sentence.',
        },
      ],
    },
  ],
};

// ─── Month 3: Growing Skills ──────────────────────────────────────────────────
const month3: Month = {
  index: 2,
  title: 'Growing Skills',
  subtitle: 'Paragraphs, Descriptions & Stories',
  color: 'amber',
  emoji: '🌿',
  level: 'Pre-Intermediate',
  weeks: [
    {
      index: 0,
      title: 'Writing Paragraphs',
      lessons: [
        {
          id: 'm3w1l1',
          monthIndex: 2, weekIndex: 0, lessonIndex: 0,
          title: 'The Perfect Paragraph',
          kind: 'writing',
          objective: 'Write a structured paragraph with a topic sentence, body, and concluding sentence',
          audioText: 'A well-written paragraph has three parts. It begins with a topic sentence that tells the reader what the paragraph is about. Then come the body sentences that give details and examples. Finally, a concluding sentence wraps up the main idea.',
          content: `A **strong paragraph** has three parts:

**1. Topic Sentence**
- States the main idea
- Usually the first sentence
- Example: *"The beach is my favourite place to relax."*

**2. Body Sentences (2–5 sentences)**
- Give details, examples, reasons
- Each sentence supports the topic sentence
- Example: *"The sound of the waves is peaceful and calming. I love the feeling of warm sand between my toes. The fresh sea air always makes me feel better."*

**3. Concluding Sentence**
- Wraps up the paragraph
- Restates the main idea in different words
- Example: *"Whenever I need to clear my mind, the beach is where I go."*

**Transitions to use:**
First · Next · Then · Also · In addition · For example · Finally · In conclusion`,
          keyWords: [
            { word: 'topic sentence', meaning: 'the sentence that states the main idea of a paragraph' },
            { word: 'concluding sentence', meaning: 'the sentence that wraps up a paragraph' },
            { word: 'transition', meaning: 'a word or phrase that connects ideas smoothly' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What is the job of a topic sentence?', options: ['Give a detail', 'State the main idea', 'Conclude the paragraph', 'Start a new topic'], answer: 'State the main idea' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which is a good topic sentence?', options: ['Also, it is fun.', 'My dog is brown.', 'Learning to cook is a valuable life skill.', 'For example, pasta.'], answer: 'Learning to cook is a valuable life skill.' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Transition words like "First", "Next", and "Finally" help with:', options: ['spelling', 'connecting ideas smoothly', 'adding punctuation', 'making the text longer'], answer: 'connecting ideas smoothly' },
            { id: 'e4', kind: 'fill-blank', prompt: 'A ___ sentence wraps up the paragraph by restating the main idea.', answer: 'concluding', hint: 'It comes at the end' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'How many parts does a perfect paragraph have?', options: ['2', '3', '4', '5'], answer: '3' },
          ],
          writingPrompt: 'Write a full paragraph (5–6 sentences) about your favourite season. Include a topic sentence, 3 body sentences with details, and a concluding sentence.',
        },
        {
          id: 'm3w1l2',
          monthIndex: 2, weekIndex: 0, lessonIndex: 1,
          title: 'Linking Words – Connecting Ideas',
          kind: 'grammar',
          objective: 'Join ideas smoothly with because, so, but, however, and for example',
          audioText: 'Good writing flows because ideas are connected. Linking words are the glue. Because gives a reason. So gives a result. But and however show contrast. For example introduces evidence. Learn these five and your writing will immediately sound more mature.',
          content: `**Linking words** connect ideas so writing flows.

**1. because — gives a REASON**
> "I stayed home **because** it was raining."

**2. so — gives a RESULT**
> "It was raining, **so** I stayed home."
> ⚠️ *because* introduces the cause; *so* introduces the effect — the same fact, linked two ways!

**3. but — shows CONTRAST (inside a sentence)**
> "I like tea, **but** my brother likes coffee."

**4. However, — shows CONTRAST (starting a new sentence)**
> "The film was long. **However,** nobody was bored."
> (Always follow "However" with a comma.)

**5. For example, — introduces EVIDENCE**
> "Dogs can learn many tricks. **For example,** my dog can open doors."

**Upgrade your writing:**
❌ "I like summer. It is warm. We swim."
✅ "I like summer **because** it is warm, **so** we can swim every day."`,
          keyWords: [
            { word: 'linking word', meaning: 'a word that connects ideas, like because, so, or but' },
            { word: 'reason', meaning: 'why something happens' },
            { word: 'result', meaning: 'what happens because of something else' },
            { word: 'contrast', meaning: 'a clear difference between two things' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"I wore a coat ___ it was cold." Which word fits?', options: ['so', 'but', 'because', 'however'], answer: 'because' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"It was cold, ___ I wore a coat." Which word fits?', options: ['so', 'because', 'but', 'for example'], answer: 'so' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which word shows contrast?', options: ['because', 'so', 'but', 'for example'], answer: 'but' },
            { id: 'e4', kind: 'fill-blank', prompt: '"___, nobody was bored." (a contrast word that starts a sentence, followed by a comma)', answer: 'However', hint: 'Starts with H' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Cities are noisy. ___ , traffic never stops." Which fits best to give evidence?', options: ['Because', 'But', 'So', 'For example'], answer: 'For example' },
          ],
          writingPrompt: 'Write 5 sentences about your favourite hobby — one using because, one using so, one using but, one starting with However, and one with For example.',
        },
      ],
    },
    {
      index: 1,
      title: 'Descriptive Writing',
      lessons: [
        {
          id: 'm3w2l1',
          monthIndex: 2, weekIndex: 1, lessonIndex: 0,
          title: 'Show, Don\'t Tell',
          kind: 'writing',
          objective: 'Use sensory details and vivid language to bring writing to life',
          audioText: 'One of the most powerful tools in writing is showing the reader what you mean, rather than just telling them. Instead of writing "She was scared", you could write "Her hands trembled and her heart pounded in her chest." This helps the reader experience the feeling.',
          content: `**"Show, Don't Tell"** means using specific details so readers experience your writing.

**Telling:** "The food was delicious."
**Showing:** "The warm pasta melted on my tongue, rich with garlic and herbs."

**Use the 5 senses:**
- 👁️ **Sight:** What does it look like? Colour, shape, size, movement
- 👂 **Sound:** What do you hear? Loud, soft, sharp, smooth
- 👃 **Smell:** What do you smell? Sweet, sour, musty, fresh
- 👅 **Taste:** What do you taste? Bitter, salty, sweet, tangy
- ✋ **Touch:** What does it feel like? Rough, smooth, warm, cold

**Telling → Showing:**
❌ "He was angry." → ✅ "His face turned red and his fists clenched at his sides."
❌ "It was cold." → ✅ "Her breath formed clouds in the frozen air."
❌ "The music was loud." → ✅ "The bass thumped in her chest and the melody rang in her ears."`,
          keyWords: [
            { word: 'sensory detail', meaning: 'a detail relating to the five senses: sight, sound, smell, taste, touch' },
            { word: 'vivid', meaning: 'producing powerful, clear images in the reader\'s mind' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which sentence "shows" rather than "tells"?', options: ['"She was tired."', '"Her eyelids drooped and she stumbled to bed."', '"He is sad."', '"The cake was good."'], answer: '"Her eyelids drooped and she stumbled to bed."' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which sense is used in: "The burnt coffee smell drifted through the office"?', options: ['Sight', 'Sound', 'Smell', 'Touch'], answer: 'Smell' },
            { id: 'e3', kind: 'write-sentence', prompt: 'Rewrite this sentence using "show, don\'t tell": "The dog was happy."', answer: 'The dog bounded over, tail wagging furiously, and licked my face.', hint: 'Describe what the dog does when happy' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"The icy water bit at his fingers" — which sense does this appeal to?', options: ['Sight', 'Sound', 'Smell', 'Touch'], answer: 'Touch' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Why do writers use "show, don\'t tell"?', options: ['To use more words', 'To make readers experience the writing', 'To avoid punctuation', 'To write faster'], answer: 'To make readers experience the writing' },
          ],
          writingPrompt: 'Describe a place you love using all 5 senses. Write at least one sentence for each sense. Do NOT use the word "nice" or "good".',
        },
      ],
    },
    {
      index: 2,
      title: 'Story Structure',
      lessons: [
        {
          id: 'm3w3l1',
          monthIndex: 2, weekIndex: 2, lessonIndex: 0,
          title: 'Beginning, Middle & End',
          kind: 'writing',
          objective: 'Plan and write a short story with a clear structure',
          audioText: 'Every great story has three parts. The beginning introduces the characters and the setting. The middle is where the problem or adventure happens. The end is where the problem is solved and things come to a conclusion. This structure is sometimes called the narrative arc.',
          content: `**Story Structure — The Narrative Arc:**

**BEGINNING (Introduction)**
- Introduce characters (who?)
- Set the scene (where? when?)
- Give readers a reason to keep reading

**MIDDLE (Rising Action → Climax)**
- The problem or challenge appears
- Tension builds
- The most exciting moment is the **climax**

**END (Resolution)**
- The problem is solved (or not!)
- Characters change or learn something
- The story feels complete

**Planning your story — use a story map:**
| Section | Questions to answer |
|---------|-------------------|
| Beginning | Who? Where? When? What is normal? |
| Problem | What goes wrong? What challenge appears? |
| Middle | What happens? How does the character try to solve it? |
| Climax | The most exciting moment! |
| End | How is it solved? How does the character feel? |`,
          keyWords: [
            { word: 'narrative', meaning: 'a story or account of events' },
            { word: 'climax', meaning: 'the most exciting or important moment in a story' },
            { word: 'resolution', meaning: 'how the problem in a story is solved' },
            { word: 'character', meaning: 'a person or animal in a story' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What happens in the BEGINNING of a story?', options: ['The problem is solved', 'Characters and setting are introduced', 'The climax occurs', 'The story ends'], answer: 'Characters and setting are introduced' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'The most exciting moment in a story is called the:', options: ['beginning', 'setting', 'climax', 'resolution'], answer: 'climax' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Where is the problem or challenge introduced?', options: ['Beginning', 'Middle', 'End', 'Anywhere'], answer: 'Middle' },
            { id: 'e4', kind: 'fill-blank', prompt: 'The ___ is where the problem in a story is solved.', answer: 'resolution', hint: 'It comes at the end' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'A story with NO resolution feels:', options: ['complete', 'exciting', 'unfinished', 'long'], answer: 'unfinished' },
          ],
          writingPrompt: 'Plan and write a short story (10–15 sentences) about someone who loses something important. Use the beginning-middle-end structure.',
        },
      ],
    },
    {
      index: 3,
      title: 'Reading Strategies',
      lessons: [
        {
          id: 'm3w4l1',
          monthIndex: 2, weekIndex: 3, lessonIndex: 0,
          title: 'Reading for Meaning – Inference',
          kind: 'comprehension',
          objective: 'Make inferences by reading between the lines',
          audioText: 'Good readers do not just read the words. They think about what the words mean. When a writer does not say something directly, readers must use clues in the text to work it out. This is called making an inference. You use the evidence plus your own knowledge to figure out what the writer means.',
          content: `**Inference** = reading between the lines.

Authors don't always state things directly. You must **use clues** + **your knowledge** to infer meaning.

**Read this passage:**
> Anna walked into the classroom and sat at the back. She kept glancing at the clock. Her notes were spread across the desk, covered in yellow highlighter. She read each page twice.

**What can we infer?**
- There is probably a test or exam soon
- Anna is nervous or anxious
- She has been studying hard
- She wants to be prepared

*The author never said "Anna was worried about a test" — but the clues tell us!*

**How to make inferences:**
1. Find **clues** in the text (words, actions, descriptions)
2. Think about what you **already know**
3. Put them together to make a reasonable **conclusion**

**Signal words for inferences:** "This suggests...", "The evidence shows...", "We can conclude..."`,
          keyWords: [
            { word: 'inference', meaning: 'a conclusion you reach using evidence and reasoning, not stated facts' },
            { word: 'clue', meaning: 'a piece of information that helps you understand something' },
            { word: 'imply', meaning: 'to suggest something without saying it directly' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Based on the passage, what can we infer about Anna?', options: ['She is late for class.', 'She is preparing for a test.', 'She hates school.', 'She forgot her notes.'], answer: 'She is preparing for a test.' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Making an inference means:', options: ['copying what the text says', 'guessing without any evidence', 'using clues to reach a conclusion', 'ignoring the text'], answer: 'using clues to reach a conclusion' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"He slammed the door and refused to eat." What can we infer?', options: ['He is happy.', 'He is tired.', 'He is angry or upset.', 'He is hungry.'], answer: 'He is angry or upset.' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Authors ___ information rather than always stating it directly.', answer: 'imply', hint: 'To suggest without saying directly' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'What two things do you combine to make an inference?', options: ['spelling and grammar', 'text clues and your own knowledge', 'big words and small words', 'facts and opinions'], answer: 'text clues and your own knowledge' },
          ],
          writingPrompt: 'Write a short paragraph (4–5 sentences) that IMPLIES a character is nervous without ever using the word "nervous". Use actions and descriptions as clues.',
        },
        {
          id: 'm3w4l2',
          monthIndex: 2, weekIndex: 3, lessonIndex: 1,
          title: 'Writing a Friendly Letter',
          kind: 'writing',
          objective: 'Write a friendly letter with the correct five parts',
          audioText: 'A friendly letter is one of the most useful things you will ever write — to a friend, a relative, or a pen pal. Every friendly letter has five parts: the date, the greeting, the body, the closing, and your signature. Let us learn each one.',
          content: `**The 5 parts of a friendly letter:**

**1. Date** (top right)
> 14 July 2026

**2. Greeting** — who it's for, ends with a comma
> Dear Mai, · Dear Grandpa, · Hi Alex,

**3. Body** — your message (1–3 paragraphs)
- Start with a friendly opening: "How are you? I hope you are well."
- Share your news or answer their questions
- Ask them something — letters are conversations!

**4. Closing** — a warm sign-off, ends with a comma
> Your friend, · Love, · Best wishes, · See you soon,

**5. Signature** — your name

---

**A complete example:**

> 14 July 2026
>
> Dear Ben,
>
> How are you? I hope your summer is going well. Last week my family visited the coast. We swam every morning, and I finally learned to dive! The water was freezing, but after a minute it felt wonderful.
>
> Have you finished the book you told me about? Write back and tell me everything.
>
> Your friend,
> Sam

**Tip:** friendly letters use informal language — contractions and casual phrases are perfectly fine here.`,
          keyWords: [
            { word: 'greeting', meaning: 'the opening of a letter, like "Dear Mai,"' },
            { word: 'closing', meaning: 'the sign-off before your name, like "Your friend,"' },
            { word: 'signature', meaning: 'your name written at the end of a letter' },
            { word: 'pen pal', meaning: 'a friend you write letters to, often far away' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'How many parts does a friendly letter have?', options: ['3', '4', '5', '6'], answer: '5' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which is a correct greeting?', options: ['Dear Mai,', 'dear mai', 'DEAR MAI!', 'Mai dear,'], answer: 'Dear Mai,' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'What punctuation follows the greeting AND the closing?', options: ['a full stop', 'a comma', 'a question mark', 'nothing'], answer: 'a comma' },
            { id: 'e4', kind: 'fill-blank', prompt: 'The part where you write your name at the end is the ___.', answer: 'signature', hint: 'You "sign" the letter' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Friendly letters should use:', options: ['very formal language', 'informal, warm language', 'no questions', 'only short words'], answer: 'informal, warm language' },
          ],
          writingPrompt: 'Write a complete friendly letter (all 5 parts) to a friend or family member about something you did this week. At least 6 sentences in the body, and ask them at least one question.',
        },
      ],
    },
  ],
};

// ─── Month 4: Developing Fluency ──────────────────────────────────────────────
const month4: Month = {
  index: 3,
  title: 'Developing Fluency',
  subtitle: 'Essays, Arguments & Complex Texts',
  color: 'green',
  emoji: '📖',
  level: 'Intermediate',
  weeks: [
    {
      index: 0,
      title: 'Essay Writing',
      lessons: [
        {
          id: 'm4w1l1',
          monthIndex: 3, weekIndex: 0, lessonIndex: 0,
          title: 'The 5-Paragraph Essay',
          kind: 'writing',
          objective: 'Plan and write a structured 5-paragraph essay',
          audioText: 'The five-paragraph essay is the foundation of academic writing. It has an introduction, three body paragraphs, and a conclusion. The introduction tells the reader what you will argue. Each body paragraph covers one main point. The conclusion summarises your argument and leaves the reader with a final thought.',
          content: `**5-Paragraph Essay Structure:**

**Paragraph 1 — Introduction**
- Hook: grab the reader's attention (question, quote, surprising fact)
- Background: give context
- **Thesis statement**: your main argument in one sentence

**Paragraphs 2, 3, 4 — Body Paragraphs**
Each paragraph:
- Topic sentence (one main point that supports your thesis)
- Evidence / examples (2–3 pieces)
- Analysis (explain WHY the evidence matters)
- Transition to next paragraph

**Paragraph 5 — Conclusion**
- Restate your thesis (in different words)
- Summarise your 3 main points
- Closing thought: why it matters / call to action

**Thesis statement formula:**
*"Although [acknowledge opposing view], [your topic] [your argument] because [reason 1], [reason 2], and [reason 3]."*

**Example:** *"Although technology has risks, social media benefits teenagers because it builds community, develops communication skills, and provides educational resources."*`,
          keyWords: [
            { word: 'thesis statement', meaning: 'one sentence that states the main argument of your essay' },
            { word: 'introduction', meaning: 'the opening paragraph of an essay' },
            { word: 'conclusion', meaning: 'the closing paragraph that summarises the essay' },
            { word: 'body paragraph', meaning: 'a paragraph in the middle of the essay that develops one main point' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'How many paragraphs are in a 5-paragraph essay?', options: ['3', '4', '5', '6'], answer: '5' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'The thesis statement goes in:', options: ['each body paragraph', 'the introduction', 'the conclusion', 'every paragraph'], answer: 'the introduction' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'How many main points does a 5-paragraph essay develop?', options: ['1', '2', '3', '5'], answer: '3' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'The "hook" is designed to:', options: ['state your thesis', 'grab the reader\'s attention', 'summarise the essay', 'list your evidence'], answer: 'grab the reader\'s attention' },
            { id: 'e5', kind: 'fill-blank', prompt: 'The conclusion should ___ the thesis in different words.', answer: 'restate', hint: 'Say the same thing again but differently' },
          ],
          writingPrompt: 'Write a 5-paragraph essay on this topic: "Reading is more important than watching TV." Include a hook, thesis, three body paragraphs with evidence, and a conclusion.',
        },
      ],
    },
    {
      index: 1,
      title: 'Argument & Persuasion',
      lessons: [
        {
          id: 'm4w2l1',
          monthIndex: 3, weekIndex: 1, lessonIndex: 0,
          title: 'Persuasive Writing Techniques',
          kind: 'writing',
          objective: 'Use rhetorical techniques to write persuasively',
          audioText: 'Persuasive writing is writing that tries to convince the reader to agree with your point of view. Great persuasive writers use three types of appeal: logos, which is logic and evidence; ethos, which is credibility and trust; and pathos, which is emotion. They also use rhetorical techniques like repetition, rhetorical questions, and statistics.',
          content: `**Three Pillars of Persuasion (Aristotle's Rhetoric):**

🧠 **Logos** (Logic) — appeal to reason
- Facts, statistics, evidence
- *"Studies show that 80% of students who read daily perform better academically."*

❤️ **Pathos** (Emotion) — appeal to feelings
- Stories, emotional language, imagery
- *"Imagine a child who cannot read — a world of opportunity closed to them forever."*

🎓 **Ethos** (Credibility) — appeal to authority/trust
- Expert opinions, your own experience
- *"According to the WHO..."* / *"As a teacher of 20 years, I can tell you..."*

**Persuasive Techniques:**
- **Rule of three:** "We will fight, we will resist, we will win."
- **Rhetorical question:** "Do we really want our children to suffer?"
- **Counter-argument & rebuttal:** Acknowledge the other side, then refute it
- **Repetition:** Repeating key words for emphasis
- **Emotive language:** Words that stir strong feelings`,
          keyWords: [
            { word: 'persuasion', meaning: 'convincing someone to believe or do something' },
            { word: 'logos', meaning: 'an appeal using logic, facts, and reason' },
            { word: 'pathos', meaning: 'an appeal using emotions and feelings' },
            { word: 'ethos', meaning: 'an appeal using credibility and trust' },
            { word: 'rhetorical question', meaning: 'a question asked for effect, not expecting an answer' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"According to Harvard researchers, exercise reduces stress by 40%." This is an example of:', options: ['pathos', 'logos', 'ethos', 'repetition'], answer: 'logos' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Imagine your child going to bed hungry every night." This appeals to:', options: ['logos', 'ethos', 'pathos', 'statistics'], answer: 'pathos' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"We must act now, we must act together, we must act with courage." This technique is:', options: ['rhetorical question', 'rule of three', 'counter-argument', 'ethos'], answer: 'rule of three' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'What is a rhetorical question?', options: ['A question with no answer', 'A question asked for effect, not requiring an answer', 'A question in a story', 'A question about rhetoric'], answer: 'A question asked for effect, not requiring an answer' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Acknowledging the other side\'s view and then arguing against it is called a ___ and rebuttal.', answer: 'counter-argument', hint: 'You argue against the opposing view' },
          ],
          writingPrompt: 'Write a persuasive letter (3–4 paragraphs) to your school principal arguing for longer lunch breaks. Use at least one example of logos, pathos, and a rhetorical question.',
        },
      ],
    },
    {
      index: 2,
      title: 'Complex Reading',
      lessons: [
        {
          id: 'm4w3l1',
          monthIndex: 3, weekIndex: 2, lessonIndex: 0,
          title: 'Fact vs Opinion',
          kind: 'comprehension',
          objective: 'Distinguish between facts and opinions in texts',
          audioText: 'When you read, it is important to know the difference between a fact and an opinion. A fact is something that can be proven to be true. An opinion is what someone believes or thinks — it may or may not be true. Good readers always ask: can this be checked? Is this someone\'s view?',
          content: `**Fact:** Can be proven true or false. It does not change based on who says it.
> "The Earth orbits the Sun." ✓ Fact — verified by science

**Opinion:** What someone believes or thinks. It changes person to person.
> "Science is the most important subject." — this is an opinion!

**Signal words for OPINIONS:**
I think · I believe · In my opinion · It seems · Perhaps · Should · Best · Worst · Most · Many people feel

**Signal words for FACTS:**
Studies show · Research proves · According to · In [year] · Statistics reveal · It is recorded that

**Read critically — ask:**
1. Can this be measured or verified?
2. Does the author use opinion language ("I believe", "should")?
3. Is evidence given?

**Beware:** Opinions can sound like facts if written confidently!
> "Clearly, everyone agrees that..." ← sounds like fact, but it's an opinion!`,
          keyWords: [
            { word: 'fact', meaning: 'information that can be proven to be true' },
            { word: 'opinion', meaning: 'a personal belief or view that cannot be proven as universally true' },
            { word: 'critical reading', meaning: 'reading with a questioning, evaluating mindset' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Water boils at 100°C at sea level." This is a:', options: ['opinion', 'fact', 'belief', 'argument'], answer: 'fact' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Summer is the best season." This is a:', options: ['fact', 'statistic', 'opinion', 'proven truth'], answer: 'opinion' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which phrase signals an opinion?', options: ['According to research', 'Studies show', 'In my opinion', 'It is recorded that'], answer: 'In my opinion' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"In 2023, the global population reached 8 billion." This is a:', options: ['opinion', 'feeling', 'fact', 'belief'], answer: 'fact' },
            { id: 'e5', kind: 'fill-blank', prompt: 'A fact can be ___ or ___ but an opinion cannot.', answer: 'proven true or false', hint: 'Think of what makes facts different from opinions' },
          ],
          writingPrompt: 'Write a paragraph about your favourite sport. Include 3 facts (use real information) and 2 opinions. Underline or label which sentences are facts and which are opinions.',
        },
      ],
    },
    {
      index: 3,
      title: 'Vocabulary Building',
      lessons: [
        {
          id: 'm4w4l1',
          monthIndex: 3, weekIndex: 3, lessonIndex: 0,
          title: 'Context Clues & Word Parts',
          kind: 'vocabulary',
          objective: 'Use context clues, prefixes, suffixes, and roots to understand new words',
          audioText: 'When you meet a word you do not know, do not panic! There are two powerful strategies. First, look at the context — the words and sentences around the unknown word — for clues. Second, look at the parts of the word itself: prefixes come at the beginning, roots carry the main meaning, and suffixes come at the end.',
          content: `**Strategy 1: Context Clues**
Look at surrounding words for hints:
> "The student was *loquacious*, talking non-stop throughout the lesson."
→ Clue: "talking non-stop" → loquacious = very talkative ✓

**Strategy 2: Word Parts**

**Common Prefixes (beginning):**
| Prefix | Meaning | Example |
|--------|---------|---------|
| un- | not | unhappy |
| re- | again | rewrite |
| pre- | before | preview |
| mis- | wrong | misread |
| dis- | not / opposite | disagree |
| over- | too much | overwork |

**Common Suffixes (ending):**
| Suffix | Meaning | Example |
|--------|---------|---------|
| -ful | full of | hopeful |
| -less | without | hopeless |
| -tion/-sion | act/process | education |
| -ment | state/result | excitement |
| -er/-or | person who | teacher, actor |
| -ible/-able | can be done | readable |

**Common Roots:**
- **port** = carry (export, import, transport)
- **scrib/script** = write (describe, manuscript)
- **dict** = say (predict, dictionary)
- **vis** = see (vision, visible, revise)`,
          keyWords: [
            { word: 'prefix', meaning: 'a word part added to the beginning of a word to change its meaning' },
            { word: 'suffix', meaning: 'a word part added to the end of a word' },
            { word: 'root word', meaning: 'the core of a word that carries its basic meaning' },
            { word: 'context clue', meaning: 'information from surrounding text that helps you understand a word' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'The prefix "un-" means:', options: ['again', 'before', 'not', 'after'], answer: 'not' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'What does "rewrite" mean?', options: ['write badly', 'write before', 'write again', 'not write'], answer: 'write again' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'The suffix "-less" means:', options: ['full of', 'without', 'able to', 'person who'], answer: 'without' },
            { id: 'e4', kind: 'fill-blank', prompt: '"Mis" + "read" = ___. (to read incorrectly)', answer: 'misread', hint: 'mis- = wrong' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Visible" contains the root "vis" which means:', options: ['move', 'say', 'see', 'carry'], answer: 'see' },
          ],
          writingPrompt: 'Choose 5 words with prefixes or suffixes (e.g. unhappy, rewrite, beautiful). Write a sentence for each, and explain what the prefix or suffix means.',
        },
      ],
    },
  ],
};

// ─── Month 5: Advanced Literacy ───────────────────────────────────────────────
const month5: Month = {
  index: 4,
  title: 'Advanced Literacy',
  subtitle: 'Literary Devices, Formal Writing & Critical Analysis',
  color: 'teal',
  emoji: '✍️',
  level: 'Upper-Intermediate',
  weeks: [
    {
      index: 0,
      title: 'Literary Devices',
      lessons: [
        {
          id: 'm5w1l1',
          monthIndex: 4, weekIndex: 0, lessonIndex: 0,
          title: 'Figurative Language',
          kind: 'reading',
          objective: 'Identify and use metaphor, simile, personification, and hyperbole',
          audioText: 'Figurative language takes words beyond their literal meanings to create powerful images and effects. A simile compares two things using "like" or "as". A metaphor says one thing IS another thing. Personification gives human qualities to non-human things. Hyperbole is a wild exaggeration for effect. These tools make writing vivid and memorable.',
          content: `**Figurative Language Devices:**

**Simile** — compares using "like" or "as"
> "Her smile was *like* sunshine." · "He ran *as fast as* the wind."

**Metaphor** — says one thing IS another (no "like" or "as")
> "Life is a journey." · "The classroom was a zoo." · "Her voice is music."

**Personification** — gives human qualities to non-human things
> "The trees *whispered* in the wind." · "The stars *danced* in the sky." · "The sun *smiled* down on us."

**Hyperbole** — extreme exaggeration for effect
> "I've told you a million times!" · "I'm so hungry I could eat a horse!" · "His bag weighs a ton."

**Alliteration** — repetition of beginning consonant sounds
> "Peter *Piper* *picked* a *peck* of *pickled peppers*."

**Onomatopoeia** — words that sound like what they describe
> buzz · crash · sizzle · whisper · roar · drip

**Oxymoron** — two contradictory words together
> "deafening silence" · "bittersweet" · "living death"`,
          keyWords: [
            { word: 'figurative language', meaning: 'language that uses non-literal expressions to create effects' },
            { word: 'simile', meaning: 'a comparison using "like" or "as"' },
            { word: 'metaphor', meaning: 'a comparison that says one thing is another thing' },
            { word: 'personification', meaning: 'giving human characteristics to non-human things' },
            { word: 'hyperbole', meaning: 'extreme exaggeration for emphasis or effect' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"The moon was a ghostly galleon" — this is a:', options: ['simile', 'metaphor', 'personification', 'hyperbole'], answer: 'metaphor' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"She sang like an angel." — this is a:', options: ['metaphor', 'simile', 'hyperbole', 'alliteration'], answer: 'simile' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"The wind howled through the trees." — this is:', options: ['simile', 'metaphor', 'personification', 'hyperbole'], answer: 'personification' },
            { id: 'e4', kind: 'multiple-choice', prompt: '"I have a million things to do!" — this is:', options: ['a fact', 'a simile', 'hyperbole', 'alliteration'], answer: 'hyperbole' },
            { id: 'e5', kind: 'write-sentence', prompt: 'Write your own metaphor comparing life to something.', answer: 'Life is a roller coaster with its ups and downs.', hint: 'Use the form "Life is [something]..."' },
          ],
          writingPrompt: 'Write a descriptive paragraph (6–8 sentences) about a storm. Use at least one simile, one metaphor, one example of personification, and one hyperbole.',
        },
      ],
    },
    {
      index: 1,
      title: 'Formal & Academic Writing',
      lessons: [
        {
          id: 'm5w2l1',
          monthIndex: 4, weekIndex: 1, lessonIndex: 0,
          title: 'Formal vs Informal Writing',
          kind: 'writing',
          objective: 'Understand register and adapt writing style for audience and purpose',
          audioText: 'The way we write changes depending on who we are writing for and why. When you text a friend, you use informal language — casual, relaxed, maybe even abbreviations. But when you write to a teacher, boss, or in an exam, you need formal language: correct grammar, full sentences, sophisticated vocabulary, and a respectful tone.',
          content: `**Register** = the level of formality you use in writing.

**FORMAL writing — use when writing to:**
- Teachers, examiners, employers, officials
- Academic essays, reports, formal letters, applications

**Rules for formal writing:**
✓ No contractions: "I cannot" not "I can't" · "it is" not "it's"
✓ Full, complete sentences — no fragments
✓ Advanced vocabulary instead of simple words
✓ Third person: "One might argue..." / "It is argued that..."
✓ Avoid slang and colloquialisms
✓ Use hedging language: "It appears that...", "It is suggested that..."

**INFORMAL writing — use when writing to:**
- Friends, family, casual audiences
- Texts, social media, personal blogs, notes

**Vocabulary comparison:**
| Informal | Formal |
|----------|--------|
| get | obtain / receive |
| find out | discover / ascertain |
| look at | examine / analyse |
| think about | consider |
| bad | detrimental / adverse |
| good | beneficial / advantageous |
| show | demonstrate / illustrate |`,
          keyWords: [
            { word: 'register', meaning: 'the level of formality appropriate for a specific context' },
            { word: 'formal', meaning: 'following official rules and conventions; professional' },
            { word: 'informal', meaning: 'casual and relaxed; used with friends or family' },
            { word: 'contraction', meaning: 'shortened word form: "it\'s" = "it is"' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which phrase is formal?', options: ["I can't do it.", 'It is not possible.', "Nah, won't work.", 'No way!'], answer: 'It is not possible.' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which word is a formal equivalent of "get"?', options: ['grab', 'snag', 'obtain', 'fetch'], answer: 'obtain' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Contractions like "it\'s" and "can\'t" are appropriate in:', options: ['formal essays', 'formal letters', 'casual conversation/texts', 'academic reports'], answer: 'casual conversation/texts' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Which sentence is in formal academic style?', options: ["This is a really big deal.", "It can't be ignored.", "The issue demands significant attention.", "Everyone should look at this."], answer: 'The issue demands significant attention.' },
            { id: 'e5', kind: 'fill-blank', prompt: 'In formal writing, instead of "I think", you could write "It ___ that..."', answer: 'appears', hint: '"It appears that..." or "It is suggested that..."' },
          ],
          writingPrompt: 'Write the same message TWICE. First, text a friend asking to borrow their notes (informal). Second, write a formal email to your teacher asking for an extension on an assignment.',
        },
      ],
    },
    {
      index: 2,
      title: 'Critical Analysis',
      lessons: [
        {
          id: 'm5w3l1',
          monthIndex: 4, weekIndex: 2, lessonIndex: 0,
          title: 'Analysing an Author\'s Purpose',
          kind: 'comprehension',
          objective: "Identify and evaluate an author's purpose, tone, and perspective",
          audioText: 'Every text is written for a reason. The author\'s purpose is what they are trying to do: inform, entertain, persuade, or describe. Their tone is the feeling behind the words — serious, humorous, critical, sympathetic. And their perspective is the viewpoint or angle from which they write. Good critical readers always ask: who wrote this, why did they write it, and what are they trying to make me think or feel?',
          content: `**Author's Purpose — PIEE:**
- **P**ersuade: convince the reader of something
- **I**nform: give facts and information
- **E**ntertain: engage and amuse
- **E**xplain: make something clear or understandable

**Tone:** The author's attitude toward the subject.
*Tones include:* formal · informal · serious · humorous · critical · sympathetic · sarcastic · urgent · melancholic · celebratory

**Identifying Tone — look for:**
- Word choice (diction): Is it positive or negative?
- Sentence structure: Short, punchy = urgency. Long, flowing = reflection.
- Literary devices used

**Perspective / Point of View:**
- Who is writing? What is their background, position, or agenda?
- What might they leave out or emphasise?

**PEEL structure for analytical writing:**
- **P**oint: State your point/argument
- **E**vidence: Quote or reference from the text
- **E**xplain: Explain how the evidence proves the point
- **L**ink: Connect back to the question/thesis`,
          keyWords: [
            { word: "author's purpose", meaning: 'the reason why an author writes a text' },
            { word: 'tone', meaning: "the feeling or attitude expressed in the author's writing" },
            { word: 'perspective', meaning: 'the viewpoint from which a text is written' },
            { word: 'PEEL', meaning: 'Point, Evidence, Explain, Link — a structure for analytical writing' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'A newspaper article about climate science is primarily written to:', options: ['entertain', 'persuade', 'inform', 'describe emotions'], answer: 'inform' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'An advertisement for a new phone is primarily written to:', options: ['entertain', 'inform', 'persuade', 'explain history'], answer: 'persuade' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Short, punchy sentences often create what tone?', options: ['reflective', 'melancholic', 'urgent', 'humorous'], answer: 'urgent' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'In PEEL writing, what comes after the Point?', options: ['Link', 'Explain', 'Evidence', 'Another point'], answer: 'Evidence' },
            { id: 'e5', kind: 'fill-blank', prompt: 'The author\'s attitude toward their subject is called their ___.', answer: 'tone', hint: 'It can be serious, humorous, critical...' },
          ],
          writingPrompt: 'Find a short newspaper article or advertisement. Write a PEEL paragraph analysing the author\'s purpose and tone. Quote at least one example from the text.',
        },
      ],
    },
    {
      index: 3,
      title: 'Advanced Grammar',
      lessons: [
        {
          id: 'm5w4l1',
          monthIndex: 4, weekIndex: 3, lessonIndex: 0,
          title: 'Complex Sentences & Clauses',
          kind: 'grammar',
          objective: 'Construct complex and compound sentences using subordinating and coordinating conjunctions',
          audioText: 'Simple sentences are fine, but sophisticated writing uses complex and compound sentences. A compound sentence joins two independent clauses with a coordinating conjunction: for, and, nor, but, or, yet, so — remember them as FANBOYS. A complex sentence joins an independent clause with a dependent clause using a subordinating conjunction like because, although, while, unless, if, when, or since.',
          content: `**Three types of sentences:**

**Simple:** One independent clause.
> "She reads every night."

**Compound:** Two independent clauses joined by a FANBOYS conjunction.
> "She reads every night, **and** she always finishes her book before sleeping."
> FANBOYS: **F**or · **A**nd · **N**or · **B**ut · **O**r · **Y**et · **S**o

**Complex:** An independent clause + a dependent clause.
> "**Although** she was tired, she read for another hour."
> "She read for another hour **because** she loved the story."

**Common subordinating conjunctions:**
because · although · while · unless · if · when · since · after · before · until · even though · so that · as long as · whenever

**Punctuation rule:**
- If the dependent clause comes FIRST → use a comma: "Although it rained, we played."
- If it comes SECOND → no comma needed: "We played although it rained."

**Relative clauses** (who, which, that):
> "The book **that she was reading** was a mystery."
> "My teacher, **who is very kind**, helped me with the essay."`,
          keyWords: [
            { word: 'independent clause', meaning: 'a group of words with a subject and verb that can stand alone as a sentence' },
            { word: 'dependent clause', meaning: 'a clause that cannot stand alone — it depends on the main clause' },
            { word: 'conjunction', meaning: 'a word that joins clauses or sentences (and, but, because, although...)' },
            { word: 'FANBOYS', meaning: 'For, And, Nor, But, Or, Yet, So — the coordinating conjunctions' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"She was tired, but she kept reading." This is a:', options: ['simple sentence', 'compound sentence', 'complex sentence', 'fragment'], answer: 'compound sentence' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Although it was late, she kept reading." This is a:', options: ['simple sentence', 'compound sentence', 'complex sentence', 'run-on'], answer: 'complex sentence' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'FANBOYS stands for which type of conjunctions?', options: ['subordinating', 'correlative', 'coordinating', 'relative'], answer: 'coordinating' },
            { id: 'e4', kind: 'fill-blank', prompt: '"___ she studied hard, she passed the exam." (Use a subordinating conjunction meaning "because")', answer: 'Because', hint: 'Starts a reason clause' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'When a dependent clause comes first, you need:', options: ['a full stop', 'a comma', 'nothing', 'a colon'], answer: 'a comma' },
          ],
          writingPrompt: 'Write 6 sentences: 2 simple, 2 compound (using FANBOYS), and 2 complex (using subordinating conjunctions). Underline the conjunction in each compound and complex sentence.',
        },
      ],
    },
  ],
};

// ─── Month 6: Expert Level ────────────────────────────────────────────────────
const month6: Month = {
  index: 5,
  title: 'Expert Level',
  subtitle: 'Academic Reading, Creative Mastery & Professional Writing',
  color: 'indigo',
  emoji: '🎓',
  level: 'Advanced',
  weeks: [
    {
      index: 0,
      title: 'Academic Reading',
      lessons: [
        {
          id: 'm6w1l1',
          monthIndex: 5, weekIndex: 0, lessonIndex: 0,
          title: 'SQ3R — A Reading System',
          kind: 'reading',
          objective: 'Apply the SQ3R method for deep comprehension of complex texts',
          audioText: 'SQ3R is a powerful reading strategy used by expert readers and university students worldwide. It stands for Survey, Question, Read, Recite, and Review. Each step deepens your understanding and helps you remember what you read.',
          content: `**SQ3R — A System for Deep Reading:**

**S — Survey (2–3 minutes)**
Before reading, scan the text:
- Read the title, headings, and subheadings
- Look at images, graphs, captions
- Read the first and last paragraph
- Get the "big picture" first

**Q — Question (1–2 minutes)**
Turn headings into questions:
- "The Effects of Climate Change" → "What are the effects of climate change?"
- Write these questions down — they guide your reading

**R1 — Read (actively)**
Read to answer your questions:
- Read one section at a time
- Slow down at difficult parts
- Annotate: underline, highlight, make notes in the margin

**R2 — Recite (after each section)**
Close the text and recall:
- Answer your questions from memory
- Summarise in your own words
- If you can't recall it, re-read that section

**R3 — Review (at the end)**
- Re-read your notes
- Answer all your questions again
- Make a mind map or summary
- Identify anything still unclear`,
          keyWords: [
            { word: 'SQ3R', meaning: 'Survey, Question, Read, Recite, Review — a reading comprehension method' },
            { word: 'survey', meaning: 'to look quickly over a text before reading it in detail' },
            { word: 'annotate', meaning: 'to add notes and comments to a text' },
            { word: 'recall', meaning: 'to bring information back from memory' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What does SQ3R stand for?', options: ['Scan, Query, Read, Respond, Reflect', 'Survey, Question, Read, Recite, Review', 'Study, Question, Repeat, Recall, Revise', 'Summarise, Query, Read, Relate, Review'], answer: 'Survey, Question, Read, Recite, Review' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'What should you do in the "Survey" step?', options: ['Read every word carefully', 'Write a summary', 'Scan the text for the big picture', 'Answer comprehension questions'], answer: 'Scan the text for the big picture' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'In the "Question" step, you should:', options: ['Answer questions at the end', 'Turn headings into questions', 'Ask the teacher', 'Skip to the questions'], answer: 'Turn headings into questions' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'In the "Recite" step, you should:', options: ['Read it again immediately', 'Close the text and recall in your own words', 'Copy out passages', 'Skip to the next chapter'], answer: 'Close the text and recall in your own words' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Adding notes and comments to a text as you read is called ___.', answer: 'annotating', hint: 'underline, highlight, write in margins' },
          ],
          writingPrompt: 'Apply SQ3R to a newspaper or magazine article. Write down: 1) your survey notes, 2) your questions, 3) your answers after reading, 4) a 3-sentence summary from memory.',
        },
      ],
    },
    {
      index: 1,
      title: 'Creative Writing Mastery',
      lessons: [
        {
          id: 'm6w2l1',
          monthIndex: 5, weekIndex: 1, lessonIndex: 0,
          title: 'Voice, Style & Tone',
          kind: 'writing',
          objective: "Develop a distinctive writing voice and control style consciously",
          audioText: 'Every great writer has a unique voice — the personality that comes through their words. Voice is made up of your word choices, sentence rhythm, humour, and the way you see the world. Style is the sum of all your conscious writing decisions. When you have a strong voice, readers feel like they are hearing a real person, not just words on a page.',
          content: `**Writer's Voice** — the unique personality in your writing.

Voice is created through:
- **Diction** (word choice): Do you choose simple or complex words? Direct or poetic?
- **Sentence rhythm**: Short and punchy? Long and flowing? A mix?
- **Humour**: Do you use wit, irony, or sarcasm?
- **Perspective**: What do you notice? What do you care about?

**Compare two voices describing the same thing:**

*Voice 1 (formal, distant):*
> "The urban environment presents numerous challenges to residents' quality of life."

*Voice 2 (personal, vivid):*
> "The city chews you up. The noise, the crowds, the grey sky pressing down — it never lets you breathe."

**Developing your voice:**
1. Read widely — absorb many voices
2. Write every day — practice builds personality
3. Imitate writers you love — then make it yours
4. Be specific — vague writing has no voice
5. Take risks — safe writing is forgettable

**Style elements to control:**
- Pacing: How fast do scenes move?
- Imagery: What pictures do you create?
- Dialogue: How do characters speak?
- Point of view: 1st person (I), 2nd (you), 3rd (he/she/they)`,
          keyWords: [
            { word: "writer's voice", meaning: 'the unique personality and perspective that comes through in writing' },
            { word: 'diction', meaning: 'word choice; the specific words a writer selects' },
            { word: 'pacing', meaning: 'the speed at which a story or piece of writing moves' },
            { word: 'point of view', meaning: 'the perspective from which a story is told (1st/2nd/3rd person)' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: "Writer's voice is best described as:", options: ['correct grammar', 'the unique personality in someone\'s writing', 'formal language', 'a loud or quiet tone'], answer: "the unique personality in someone's writing" },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Short, punchy sentences create a sense of:', options: ['elegance', 'slowness', 'urgency and impact', 'academic distance'], answer: 'urgency and impact' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"I walked into the room" is written in which person?', options: ['2nd person', '3rd person', '1st person', 'no person'], answer: '1st person' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'What is diction?', options: ['punctuation choices', 'word choices', 'sentence length', 'paragraph structure'], answer: 'word choices' },
            { id: 'e5', kind: 'write-sentence', prompt: 'Rewrite this sentence in a vivid, personal voice: "It was a hot day."', answer: 'The heat pressed down like a weight, turning the air thick and slow, baking everything it touched.', hint: 'Use sensory details and metaphors' },
          ],
          writingPrompt: 'Write the same scene twice: a person waiting for important news. First in a formal, distant 3rd-person voice. Then in a vivid, personal 1st-person voice. Each version: 5–6 sentences.',
        },
      ],
    },
    {
      index: 2,
      title: 'Professional Writing',
      lessons: [
        {
          id: 'm6w3l1',
          monthIndex: 5, weekIndex: 2, lessonIndex: 0,
          title: 'Editing & Proofreading',
          kind: 'writing',
          objective: 'Apply professional editing and proofreading techniques to improve writing',
          audioText: 'Professional writers do not just write — they edit. Editing means improving the content, structure, and clarity of your writing. Proofreading means finding and fixing errors in grammar, spelling, and punctuation. Great writing is rewriting. Every expert writer goes through multiple drafts.',
          content: `**The Writing Process:**

Draft → Edit → Proofread → Final

**EDITING — Improving Content & Structure**

Ask yourself:
- **Purpose:** Does every sentence serve the purpose of the piece?
- **Clarity:** Is every idea expressed as clearly as possible?
- **Flow:** Do ideas connect smoothly? Are transitions needed?
- **Evidence:** Is every claim supported?
- **Concision:** Can any sentences be shorter without losing meaning?

**Common editing fixes:**
- Remove redundancy: "past history" → "history"
- Be specific: "a lot of people" → "millions of people"
- Use active voice: "The report was written by her" → "She wrote the report"
- Vary sentence length for rhythm

**PROOFREADING — Finding Errors**

Proofread for:
- Spelling mistakes (use spell-check AND read carefully)
- Grammar errors (subject-verb agreement, tense consistency)
- Punctuation errors
- Capitalisation errors
- Repetition of words

**Pro proofreading techniques:**
1. Read aloud — you hear errors you miss visually
2. Read backwards — from last sentence to first
3. Print it out — you see it differently on paper
4. Leave it overnight — fresh eyes catch more errors`,
          keyWords: [
            { word: 'editing', meaning: 'improving the content, structure, and clarity of a draft' },
            { word: 'proofreading', meaning: 'checking and correcting errors in grammar, spelling, and punctuation' },
            { word: 'active voice', meaning: 'when the subject performs the action: "She wrote the report"' },
            { word: 'passive voice', meaning: 'when the subject receives the action: "The report was written by her"' },
            { word: 'concision', meaning: 'expressing ideas clearly and briefly, without unnecessary words' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What is the difference between editing and proofreading?', options: ['There is no difference', 'Editing improves content/structure; proofreading fixes errors', 'Proofreading improves content; editing fixes errors', 'Editing is for spelling; proofreading is for grammar'], answer: 'Editing improves content/structure; proofreading fixes errors' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"The decision was made by the committee." Rewrite in active voice:', options: ['A decision was reached.', 'The committee decided.', 'It was the committee that made the decision.', 'The deciding was done.'], answer: 'The committee decided.' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which phrase is redundant (repetitive)?', options: ['new innovation', 'past mistake', 'future plan', 'sudden surprise'], answer: 'new innovation' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Why is reading your writing aloud helpful?', options: ['It makes it sound better', 'You hear errors you miss visually', 'It impresses people', 'It saves time'], answer: 'You hear errors you miss visually' },
            { id: 'e5', kind: 'fill-blank', prompt: '"Active voice" means the ___ performs the action.', answer: 'subject', hint: 'Who does the action?' },
          ],
          writingPrompt: 'Take any paragraph you have written earlier in this programme. Edit it for concision (cut at least 2 unnecessary words or phrases) and check for passive voice (convert to active where possible). Then proofread for all errors.',
        },
      ],
    },
    {
      index: 3,
      title: 'Your Capstone',
      lessons: [
        {
          id: 'm6w4l1',
          monthIndex: 5, weekIndex: 3, lessonIndex: 0,
          title: 'Final Project: Write Your Story',
          kind: 'writing',
          objective: 'Apply everything learned to produce a polished, complete piece of writing',
          audioText: 'Congratulations. You have reached the final lesson of this programme. Over six months, you have learned the alphabet and letter sounds, built your vocabulary, mastered sentence and paragraph structure, learned to read critically and write persuasively, and developed your own writer\'s voice. Now it is time to bring it all together in your final project: a complete, polished piece of writing that represents the best of what you can do.',
          content: `# 🎓 Your Final Project

**Congratulations on reaching Lesson 24!**

You have completed a journey from **zero to expert**. Here is everything you have mastered:

✅ The alphabet, sounds, and phonics
✅ Vocabulary — sight words, CVC words, word families, prefixes & suffixes
✅ Sentences — simple, compound, complex
✅ Paragraphs — topic, body, conclusion
✅ Grammar — nouns, verbs, adjectives, tenses, conjunctions, clauses
✅ Reading strategies — main idea, inference, SQ3R, fact vs opinion
✅ Comprehension — author's purpose, tone, figurative language
✅ Writing forms — narratives, essays, persuasion, description, formal writing
✅ Writer's craft — voice, style, show don't tell, sensory detail
✅ Editing and proofreading

---

**YOUR CAPSTONE TASK:**

Choose ONE of the following:

**Option A: Short Story (400–600 words)**
Write a short story with a clear beginning, middle, and end. Include:
- A vivid opening that grabs the reader
- At least 3 figurative language devices
- Dialogue (with correct punctuation)
- A satisfying resolution

**Option B: Persuasive Essay (400–600 words)**
Argue for or against: *"Everyone should read for 30 minutes every day."*
- A strong introduction with a hook and thesis
- 3 body paragraphs with evidence and persuasive techniques
- A powerful conclusion with a call to action

**Option C: Personal Essay (400–600 words)**
Write about a meaningful experience in your life. Use:
- Show, don't tell throughout
- A distinctive personal voice
- A reflection on what the experience taught you

---
*Take your time. Edit and proofread before you finish. This is your masterpiece.*`,
          keyWords: [
            { word: 'capstone', meaning: 'a final project that brings together everything learned' },
            { word: 'polish', meaning: 'to refine and perfect a piece of writing through editing' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'How many months did this programme last?', options: ['3', '4', '5', '6'], answer: '6' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which is NOT part of the writing process?', options: ['Drafting', 'Editing', 'Proofreading', 'Memorising'], answer: 'Memorising' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'A persuasive essay should include:', options: ['only facts', 'a thesis and supporting evidence', 'only opinions', 'no conclusion'], answer: 'a thesis and supporting evidence' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Show don\'t tell means:', options: ['using literal statements', 'using specific details so readers experience writing', 'writing more words', 'using simple language'], answer: 'using specific details so readers experience writing' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'You have now completed the programme! What level have you reached?', options: ['Beginner', 'Elementary', 'Intermediate', 'Advanced/Expert'], answer: 'Advanced/Expert' },
          ],
          writingPrompt: 'Complete your Capstone Project. Choose Option A, B, or C above. Write your best work — this is your graduation piece! Take at least 30 minutes. Edit it. Proofread it. Be proud of it.',
        },
      ],
    },
  ],
};

export const CURRICULUM: Month[] = [month1, month2, month3, month4, month5, month6];

export function getAllLessons(): Lesson[] {
  return CURRICULUM.flatMap((m) => m.weeks.flatMap((w) => w.lessons));
}

export function getLessonById(id: string): Lesson | undefined {
  return getAllLessons().find((l) => l.id === id);
}

export const MONTH_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  rose:   { bg: 'bg-rose-500',   text: 'text-rose-600',   border: 'border-rose-300',   light: 'bg-rose-50' },
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-300', light: 'bg-indigo-50' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-300', light: 'bg-orange-50' },
  amber:  { bg: 'bg-amber-500',  text: 'text-amber-600',  border: 'border-amber-300',  light: 'bg-amber-50' },
  green:  { bg: 'bg-green-500',  text: 'text-green-600',  border: 'border-green-300',  light: 'bg-green-50' },
  teal:   { bg: 'bg-teal-500',   text: 'text-teal-600',   border: 'border-teal-300',   light: 'bg-teal-50' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-600', border: 'border-violet-300', light: 'bg-violet-50' },
};
