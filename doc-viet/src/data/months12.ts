import type { Month } from './types';

// ─── Month 1: Nền tảng / Foundations ─────────────────────────────────────────
export const month1: Month = {
  index: 0,
  title: 'Nền tảng',
  subtitle: 'Foundations — Letters, Hats & the Six Tones',
  color: 'red',
  emoji: '🌱',
  level: 'Beginner',
  weeks: [
    {
      index: 0,
      title: 'Bảng chữ cái — The Alphabet',
      lessons: [
        {
          id: 'm1w1l1',
          monthIndex: 0, weekIndex: 0, lessonIndex: 0,
          title: 'Meet the 29 Letters',
          kind: 'phonics',
          objective: 'Learn the 29-letter Vietnamese alphabet — chữ Quốc ngữ',
          audioText: 'Xin chào! Welcome to your very first Vietnamese lesson. Great news: Vietnamese is written with the Latin alphabet, just like English. It is called chữ Quốc ngữ, the national script. It has twenty-nine letters. Seven of them will be new to you: ă, â, đ, ê, ô, ơ, ư. And four English letters are missing: there is no f, no j, no w, and no z.',
          content: `Vietnamese is written in **chữ Quốc ngữ** — a Latin alphabet with **29 letters**:

a ă â b c d đ e ê g h i k l m n o ô ơ p q r s t u ư v x y

## The 7 letters English doesn't have
| Letter | What the mark means | Sounds like |
|--------|--------------------|-------------|
| ă | a with a "breve" (little cup) | short *a* in "hat", clipped |
| â | a with a "hat" | *u* in "but" |
| đ | d with a bar | English **d** in "dog" |
| ê | e with a hat | *ay* in "may" (no glide) |
| ô | o with a hat | *o* in "go" (no glide) |
| ơ | o with a "horn" | *u* in "fur" |
| ư | u with a horn | say *oo* while smiling |

## Missing letters
There is **no f, j, w, or z**. Their sounds are written differently: *ph* = /f/, *d/gi* = /z/.

**Great news:** unlike English, Vietnamese spelling is regular — once you know the letters and tones, you can read almost anything aloud correctly!`,
          keyWords: [
            { word: 'xin chào', meaning: 'hello' },
            { word: 'chữ', meaning: 'letter; writing; script' },
            { word: 'tiếng Việt', meaning: 'the Vietnamese language' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'How many letters are in the Vietnamese alphabet?', options: ['26', '28', '29', '33'], answer: '29' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which letter does NOT exist in Vietnamese?', options: ['đ', 'f', 'ơ', 'x'], answer: 'f' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which letter is in the Vietnamese alphabet but not the English one?', options: ['w', 'j', 'ư', 'z'], answer: 'ư' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'The Vietnamese writing system is called:', options: ['chữ Nôm', 'chữ Quốc ngữ', 'Hán tự', 'Kanji'], answer: 'chữ Quốc ngữ' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'The /f/ sound (as in "fish") is written in Vietnamese as:', options: ['f', 'ph', 'v', 'w'], answer: 'ph' },
          ],
          writingPrompt: 'Copy the seven new letters — ă â đ ê ô ơ ư — three times each, then write the whole 29-letter alphabet once. Say each letter aloud as you write it.',
        },
        {
          id: 'm1w1l2',
          monthIndex: 0, weekIndex: 0, lessonIndex: 1,
          title: 'Vowels & Their Hats',
          kind: 'phonics',
          objective: 'Hear and read the 12 vowel letters: a ă â, e ê, i, o ô ơ, u ư, y',
          audioText: 'Vietnamese vowels wear hats, and the hats change the sound. Listen to the a family: a, as in ba. ă, as in ăn. â, as in ân. Now the e family: e, as in xe. ê, as in đêm. The o family: o, as in to. ô, as in cô. ơ, as in mơ. And the u family: u, as in tu. ư, as in thư. Tap every word in this lesson to hear the difference.',
          content: `The marks on vowels are **not decoration** — each one is a different letter with a different sound.

| Family | Letter | Sounds like | Example |
|--------|--------|-------------|---------|
| A | a | *a* in "father" | **ba** (three; dad) |
| | ă | clipped *a* in "hat" | **ăn** (to eat) |
| | â | *u* in "but" | **ân** (favour) |
| E | e | *e* in "bet" | **xe** (vehicle) |
| | ê | *ay* in "may" | **đêm** (night) |
| O | o | *aw* in "law" | **to** (big) |
| | ô | *o* in "go" | **cô** (aunt; Ms) |
| | ơ | *u* in "fur" | **mơ** (to dream) |
| U | u | *oo* in "moon" | **tu** (to drink up) |
| | ư | *oo* with a smile | **thư** (a letter/mail) |
| I/Y | i · y | *ee* in "see" | **đi** (to go) · **ý** (idea) |

## Minimal pairs — listen closely!
- **ma** · **mă** · **mâ** — same m, three different vowels
- **to** (big) · **tô** (bowl) · **tơ** (silk)
- **tu** · **tư** (fourth) — round lips, then smile!`,
          keyWords: [
            { word: 'ăn', meaning: 'to eat' },
            { word: 'mơ', meaning: 'to dream' },
            { word: 'thư', meaning: 'a letter (mail)' },
            { word: 'đêm', meaning: 'night' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which letter sounds like the "u" in English "fur"?', options: ['o', 'ô', 'ơ', 'u'], answer: 'ơ' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Tô" (bowl) and "tơ" (silk) differ only in:', options: ['the tone', 'the vowel letter', 'the consonant', 'nothing — same word'], answer: 'the vowel letter' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which word means "to eat"?', options: ['an', 'ăn', 'ân', 'anh'], answer: 'ăn' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Add the correct letter: th_ means "a letter (mail)". (Type the whole word.)', answer: 'thư', hint: 'the u wears a horn' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'How do you make the ư sound?', options: ['round your lips hard', 'say "oo" while smiling', 'open your mouth wide', 'touch your teeth with your tongue'], answer: 'say "oo" while smiling' },
          ],
          writingPrompt: 'Write the three A-family letters (a, ă, â) and one Vietnamese word for each from this lesson. Then do the same for the O family (o, ô, ơ).',
        },
        {
          id: 'm1w1l3',
          monthIndex: 0, weekIndex: 0, lessonIndex: 2,
          title: 'D versus Đ — and the Other Consonants',
          kind: 'phonics',
          objective: 'Master the d/đ distinction and the single consonants',
          audioText: 'Here is the most surprising letter in Vietnamese. The plain letter d does NOT sound like an English d. In the north, d sounds like z: da, dạ. In the south it sounds like y. The letter with the little bar, đ, is the one that sounds like an English d: đi, đá, đêm. Remember: bar equals English d.',
          content: `## The famous pair
| Letter | North | South | Example |
|--------|-------|-------|---------|
| **d** | /z/ like "zoo" | /y/ like "yes" | **da** (skin) → "za" / "ya" |
| **đ** | /d/ like "dog" | /d/ like "dog" | **đi** (to go) → "dee" |

> **Memory trick:** the bar on đ is a little stick — a **d**rumstick. Đ = English D.

## Other single consonants
Most behave like English: b, h, l, m, n, v.
| Letter | Note | Example |
|--------|------|---------|
| c, k | /k/, never /s/ | **cá** (fish), **kem** (ice cream) |
| g | hard /g/ (soft before i) | **gà** (chicken) |
| s | /sh/-ish in the south, /s/ north | **sách** (book) |
| x | always /s/ | **xe** (vehicle) |
| r | /z/ north · /r/ south | **ra** (to go out) |
| t | unaspirated /t/ — no puff of air | **tôi** (I) |
| p | only ends syllables (borrowed words start with it) | **đẹp** (beautiful) |
| q | always with u: qu = /kw/ | **quà** (gift) |`,
          keyWords: [
            { word: 'đi', meaning: 'to go' },
            { word: 'da', meaning: 'skin' },
            { word: 'đá', meaning: 'stone; ice; to kick' },
            { word: 'cá', meaning: 'fish' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which letter sounds like the English "d" in "dog"?', options: ['d', 'đ', 'both', 'neither'], answer: 'đ' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'In northern Vietnam, "da" (skin) is pronounced like:', options: ['"da"', '"za"', '"tha"', '"ga"'], answer: '"za"' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'The letter x in "xe" sounds like:', options: ['/ks/ as in "box"', '/z/ as in "zoo"', '/s/ as in "see"', '/sh/ as in "she"'], answer: '/s/ as in "see"' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Type the word that means "to go" (one syllable, starts with the barred letter).', answer: 'đi', hint: 'use the đ button in the helper row' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'The letter q in Vietnamese:', options: ['appears alone', 'is always followed by u', 'sounds like /g/', 'only ends words'], answer: 'is always followed by u' },
          ],
          writingPrompt: 'Write two columns: three words with d (da, dạ, dê) and three with đ (đi, đá, đêm). Say each aloud — z-sound for d, d-sound for đ.',
        },
      ],
    },
    {
      index: 1,
      title: 'Âm ghép — Letter Teams',
      lessons: [
        {
          id: 'm1w2l1',
          monthIndex: 0, weekIndex: 1, lessonIndex: 0,
          title: 'Digraphs & the Trigraph: ch, nh, ng, ph, th…',
          kind: 'phonics',
          objective: 'Read the letter teams: ch, gh, gi, kh, ng, ngh, nh, ph, th, tr, qu',
          audioText: 'Some Vietnamese sounds are written with two letters, and one with three. Listen: ch, as in chào. Nh, as in nhà. Ng, as in ngon. Ph, as in phở. Th, as in thấy. Tr, as in trà. Kh, as in không. Gi, as in gì. And the only three-letter team: ngh, as in nghe. These teams count as one sound each.',
          content: `Eleven letter **teams** — read them as ONE sound:

| Team | Sounds like | Example |
|------|-------------|---------|
| ch | *ch* in "cheese" (lighter) | **chào** (hello) |
| tr | *tr*-flavoured *ch* | **trà** (tea) |
| nh | *ny* in "canyon" | **nhà** (house) |
| ng / ngh | *ng* in "si**ng**" — at the START of words! | **ngon** (delicious) · **nghe** (to listen) |
| ph | /f/ | **phở** (noodle soup) |
| th | aspirated /t/ — t plus a puff of air | **thấy** (to see) |
| kh | /kh/ like Scottish "lo**ch**" | **không** (no; not) |
| gh | hard /g/ (used before i, e, ê) | **ghế** (chair) |
| gi | /z/ north · /y/ south | **gì** (what) |
| qu | /kw/ | **quà** (gift) |

> **The hardest one for English speakers:** starting a word with **ng**. Say "si-nging", then drop the "si-": *nging → nga, ngon, người*. You already make this sound — just never at the start!`,
          keyWords: [
            { word: 'phở', meaning: 'Vietnamese noodle soup' },
            { word: 'nhà', meaning: 'house; home' },
            { word: 'người', meaning: 'person; people' },
            { word: 'nghe', meaning: 'to listen; to hear' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which team makes the /f/ sound?', options: ['th', 'ph', 'kh', 'nh'], answer: 'ph' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'The only THREE-letter team in Vietnamese is:', options: ['ngh', 'nhg', 'ghn', 'chh'], answer: 'ngh' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Nhà" (house) begins with a sound like:', options: ['"n" in "no"', '"ny" in "canyon"', '"ng" in "sing"', '"h" in "hat"'], answer: '"ny" in "canyon"' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Which English word contains the sound that starts "ngon"?', options: ['go', 'sing', 'nice', 'onion'], answer: 'sing' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Type the word for the famous noodle soup.', answer: 'phở', hint: 'ph + ơ with a hỏi tone' },
          ],
          writingPrompt: 'Write one Vietnamese word from this lesson for each team: ch, nh, ng, ph, th. Read your list aloud, then read it again faster.',
        },
      ],
    },
    {
      index: 2,
      title: 'Thanh điệu — The Six Tones',
      lessons: [
        {
          id: 'm1w3l1',
          monthIndex: 0, weekIndex: 2, lessonIndex: 0,
          title: 'The Six Tones I: ngang, huyền, sắc',
          kind: 'phonics',
          objective: 'Hear and read the first three tones with the famous "ma" family',
          audioText: 'This is the heart of Vietnamese. Every syllable carries one of six tones, and the tone changes the meaning completely. Listen to the same letters with three different tones. Ma — flat, level voice — means ghost. Mà — falling gently — means but. Má — rising — means cheek, or mother in the south. Ma. Mà. Má. Three different words! Tap each one on the tone board to hear it again and again.',
          content: `One syllable, six tones, six different words. Today: the first three.

| Tone | Mark | Voice | Word | Meaning |
|------|------|-------|------|---------|
| **ngang** | (none) | flat & level, like a robot | **ma** | ghost |
| **huyền** | \` (grave) | starts mid, falls gently, relaxed | **mà** | but; that |
| **sắc** | ´ (acute) | rises sharply, like asking "huh?" | **má** | cheek; mum (South) |

## How to practice
🎵 Hum first, words later: hum flat — hum falling — hum rising.
👂 Tap the tone board below over and over. Your ears learn before your mouth.
🗣️ Say "ma, mà, má" five times, exaggerating wildly. Subtle comes later.

> Getting a tone wrong isn't like an accent — it's a **different word**. "Tôi gặp má" = I met mum. "Tôi gặp ma" = I met a ghost!`,
          keyWords: [
            { word: 'ma', meaning: 'ghost (flat ngang tone)' },
            { word: 'mà', meaning: 'but; that (falling huyền tone)' },
            { word: 'má', meaning: 'cheek; mum in the South (rising sắc tone)' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'How many tones does Vietnamese have?', options: ['3', '4', '5', '6'], answer: '6' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'The ngang tone is written with:', options: ['a grave accent', 'an acute accent', 'no mark at all', 'a dot below'], answer: 'no mark at all' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Mà" (with huyền) means:', options: ['ghost', 'but / that', 'cheek', 'rice seedling'], answer: 'but / that' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'The sắc tone (´) makes your voice:', options: ['fall gently', 'stay flat', 'rise sharply', 'creak in the middle'], answer: 'rise sharply' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Type the word for "cheek" — m + a + rising tone.', answer: 'má', hint: 'use the sắc button in the helper row' },
          ],
          writingPrompt: 'Write ma, mà, má and their three meanings in English. Then find one more Vietnamese word you know with a sắc tone and write it down.',
        },
        {
          id: 'm1w3l2',
          monthIndex: 0, weekIndex: 2, lessonIndex: 1,
          title: 'The Six Tones II: hỏi, ngã, nặng',
          kind: 'phonics',
          objective: 'Complete the tone system and learn where the mark is written',
          audioText: 'Three tones to go — the tricky ones. Mả, with the hỏi tone, dips down and curls back up: it means grave, a tomb. Mã, with the ngã tone, rises but gets squeezed in the middle: it means horse, or code. And mạ, with the nặng tone, drops short and heavy, like a full stop: it means rice seedling. Listen: mả. Mã. Mạ. Now you know all six: ma, mà, má, mả, mã, mạ.',
          content: `The last three tones — and now the "ma" sextet is complete!

| Tone | Mark | Voice | Word | Meaning |
|------|------|-------|------|---------|
| **hỏi** | ̉ (hook above) | dips, then curls back up — like "really?" | **mả** | grave; tomb |
| **ngã** | ~ (tilde) | rises with a squeeze/break in the middle | **mã** | horse; code |
| **nặng** | ̣ (dot below) | short, low and heavy — full stop | **mạ** | rice seedling |

## The full sextet
**ma** (ghost) · **mà** (but) · **má** (cheek) · **mả** (grave) · **mã** (horse) · **mạ** (seedling)

## Where does the mark go?
✓ On the **vowel** of the syllable: b**à**, đ**ẹ**p
✓ With vowel groups, usually on the main vowel: ng**ườ**i, ch**à**o, ti**ế**ng
✓ The nặng dot goes **below**; all others go above
✓ Hats and horns stay put — the tone mark stacks on top: ổ ề ứ ậ

> **Southern note:** many southerners pronounce hỏi and ngã the same — but they are always **written** differently.`,
          keyWords: [
            { word: 'mả', meaning: 'grave; tomb (hỏi tone)' },
            { word: 'mã', meaning: 'horse; code (ngã tone)' },
            { word: 'mạ', meaning: 'rice seedling (nặng tone)' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Which tone is written as a dot BELOW the vowel?', options: ['hỏi', 'ngã', 'nặng', 'sắc'], answer: 'nặng' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Mã" (with ngã ~) means:', options: ['ghost', 'grave', 'horse / code', 'rice seedling'], answer: 'horse / code' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'The hỏi tone sounds like:', options: ['a flat robot voice', 'a dip that curls back up', 'a short heavy drop', 'a sharp rise'], answer: 'a dip that curls back up' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Type the word for "rice seedling" — m + a + heavy tone.', answer: 'mạ', hint: 'the nặng dot goes below' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'In "người", the tone mark sits on:', options: ['n', 'g', 'ư', 'ờ'], answer: 'ờ' },
          ],
          writingPrompt: 'Write the complete ma-sextet — ma, mà, má, mả, mã, mạ — with all six English meanings. This is the most famous line in Vietnamese class; know it by heart!',
        },
        {
          id: 'm1w3l3',
          monthIndex: 0, weekIndex: 2, lessonIndex: 2,
          title: 'First Words: Xin chào!',
          kind: 'vocabulary',
          objective: 'Read and write your first real Vietnamese words and greetings',
          audioText: 'Time to use everything you have learned! Xin chào — hello. Cảm ơn — thank you. Tôi — I, or me. Bạn — you, or friend. Tạm biệt — goodbye. Notice the tones as you listen: chào falls with huyền. Cảm dips with hỏi. Bạn drops with nặng. Every word you say uses the tone system — from day one.',
          content: `Your first conversation kit — read every syllable, tone and all:

| Vietnamese | Tones you can spot | English |
|-----------|--------------------|---------|
| **xin chào** | chào = huyền (falls) | hello |
| **cảm ơn** | cảm = hỏi (dips) | thank you |
| **tôi** | ngang (flat) | I / me |
| **bạn** | nặng (heavy drop) | you / friend |
| **tạm biệt** | both nặng | goodbye |
| **vâng / dạ** | — | yes (North / South, polite) |
| **không** | ngang | no; not |

## Read a whole syllable
Take **chào**: team *ch* + vowels *ao* + huyền tone = one smooth falling "chow".
Take **cảm**: *c* + *am* + hỏi dip = "kahm?" with a curl.

🗣️ Practice out loud: *Xin chào! Cảm ơn! Tạm biệt!* — you're really speaking Vietnamese now.`,
          keyWords: [
            { word: 'cảm ơn', meaning: 'thank you' },
            { word: 'tôi', meaning: 'I; me' },
            { word: 'bạn', meaning: 'you; friend' },
            { word: 'tạm biệt', meaning: 'goodbye' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Cảm ơn" means:', options: ['hello', 'thank you', 'goodbye', 'sorry'], answer: 'thank you' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which tone does "chào" carry?', options: ['ngang (flat)', 'huyền (falling)', 'sắc (rising)', 'nặng (heavy)'], answer: 'huyền (falling)' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Bạn" means:', options: ['I / me', 'you / friend', 'house', 'ghost'], answer: 'you / friend' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Complete the greeting: xin _____ (type the missing word).', answer: 'chào', hint: 'ch + ao + huyền tone' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Tạm biệt" means:', options: ['good morning', 'thank you', 'goodbye', 'excuse me'], answer: 'goodbye' },
          ],
          writingPrompt: 'Write a tiny dialogue of 4 lines between two people meeting and parting: greeting, thanks, goodbye. Use xin chào, cảm ơn and tạm biệt — with every tone mark in place.',
        },
      ],
    },
  ],
};

// ─── Month 2: Ghép vần / Building Syllables ──────────────────────────────────
export const month2: Month = {
  index: 1,
  title: 'Ghép vần',
  subtitle: 'Building Syllables — Rhymes, Rules & First Sentences',
  color: 'amber',
  emoji: '🧱',
  level: 'Elementary',
  weeks: [
    {
      index: 0,
      title: 'Vần — The Rhyme System',
      lessons: [
        {
          id: 'm2w1l1',
          monthIndex: 1, weekIndex: 0, lessonIndex: 0,
          title: 'Anatomy of a Syllable',
          kind: 'phonics',
          objective: 'Break any syllable into âm đầu + vần + thanh',
          audioText: 'Every Vietnamese syllable is a little machine with three parts. The initial sound, âm đầu. The rhyme, vần. And the tone, thanh. Take the word toán, mathematics. The initial is t. The rhyme is oan. The tone is sắc. T, oan, sắc: toán. Once you can split syllables like this, you can read and spell anything.',
          content: `Every syllable = **âm đầu + vần + thanh** (initial + rhyme + tone)

| Word | âm đầu (initial) | vần (rhyme) | thanh (tone) |
|------|------------------|-------------|--------------|
| **toán** (math) | t | oan | sắc |
| **chào** (hello) | ch | ao | huyền |
| **người** (person) | ng | ươi | huyền |
| **ăn** (eat) | — (none!) | ăn | ngang |
| **nghỉ** (to rest) | ngh | i | hỏi |

## Why this matters
✓ **Reading:** sound the initial, add the rhyme, sing the tone.
✓ **Spelling:** hear a word? Split it the same way to write it.
✓ **Dictionaries & rhymes:** Vietnamese poetry and songs rhyme on the vần.

> A syllable doesn't need an initial (ăn, uống) — but it always needs a **vần** and a **thanh** (ngang counts as a tone).`,
          keyWords: [
            { word: 'vần', meaning: 'rhyme — the vowel part of a syllable' },
            { word: 'thanh', meaning: 'tone' },
            { word: 'toán', meaning: 'mathematics' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'The three parts of a Vietnamese syllable are:', options: ['prefix + root + suffix', 'initial + rhyme + tone', 'consonant + consonant + vowel', 'subject + verb + object'], answer: 'initial + rhyme + tone' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'In "toán", the vần (rhyme) is:', options: ['t', 'oan', 'án', 'n'], answer: 'oan' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'In "chào", the âm đầu (initial) is:', options: ['c', 'ch', 'ao', 'huyền'], answer: 'ch' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Which word has NO initial consonant?', options: ['nhà', 'ăn', 'phở', 'trà'], answer: 'ăn' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'What tone does "nghỉ" carry?', options: ['ngang', 'sắc', 'hỏi', 'nặng'], answer: 'hỏi' },
          ],
          writingPrompt: 'Split these five words into initial + rhyme + tone, one per line: bàn, tiếng, quà, đẹp, mưa. (Example: toán = t + oan + sắc.)',
        },
        {
          id: 'm2w1l2',
          monthIndex: 1, weekIndex: 0, lessonIndex: 1,
          title: 'Common Rhymes I: -an, -ang, -anh & friends',
          kind: 'phonics',
          objective: 'Read the closed rhymes: -an/-ang/-anh, -on/-ong, -en/-eng',
          audioText: 'Rhyme families! Listen to the difference between n and ng endings. Bàn, a table, ends in n — your tongue touches your teeth. Bàng, ends in ng — the sound stays in your nose. And bánh, cake, ends in nh — light, like an English "ang" said quickly. Bàn. Bàng. Bánh. Three rhymes, three words.',
          content: `Rhymes ending in **-n, -ng, -nh** — tiny endings, big differences:

| Rhyme | Feels like | Examples |
|-------|-----------|----------|
| -an | "ahn" — tongue to teeth | **bàn** (table) · **ngan** (goose) |
| -ang | "ahng" — nasal | **bàng** (a tree) · **sáng** (bright; morning) |
| -anh | "ang" said lightly | **bánh** (cake) · **anh** (older brother) |
| -on | "on" | **con** (child; animal classifier) · **ngon** (delicious) |
| -ong | "ong" | **trong** (inside; clear) · **sông** (river) |
| -en | "en" | **đen** (black) · **quen** (familiar) |
| -eng | "eng" (rare) | **xẻng** (shovel) · **leng keng** (clang) |

## Drill — read across, tones and all
- s**an** · s**ang** · s**anh**
- b**àn** (table) · b**àng** (tree) · b**ánh** (cake)
- c**on** (child) · c**òng** (handcuff)

> English speakers often drop the final difference. Slow down and feel WHERE the sound ends: teeth (n), nose (ng), light front (nh).`,
          keyWords: [
            { word: 'bàn', meaning: 'table' },
            { word: 'sáng', meaning: 'morning; bright' },
            { word: 'bánh', meaning: 'cake; bread; pastry' },
            { word: 'ngon', meaning: 'delicious' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Bàn" (table) ends with which sound?', options: ['-n', '-ng', '-nh', '-m'], answer: '-n' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which word means "cake"?', options: ['bàn', 'bàng', 'bánh', 'ban'], answer: 'bánh' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'The -ng ending is made:', options: ['with the tongue on the teeth', 'in the nose', 'with the lips', 'silently'], answer: 'in the nose' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Type the word meaning "delicious" (ng + on, flat tone).', answer: 'ngon', hint: 'starts with the sing-sound' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Which pair rhymes (same vần)?', options: ['bàn & bánh', 'sáng & bàng', 'con & sông', 'đen & bàn'], answer: 'sáng & bàng' },
          ],
          writingPrompt: 'Write two words for each rhyme: -an, -ang, -anh. Use words from this lesson or any you know. Mark every tone.',
        },
        {
          id: 'm2w1l3',
          monthIndex: 1, weekIndex: 0, lessonIndex: 2,
          title: 'Common Rhymes II: Gliding Vowels',
          kind: 'phonics',
          objective: 'Read the diphthong rhymes: -ai/-ay/-ây, -ao/-au/-âu, -oi/-ôi/-ơi',
          audioText: 'Now the gliding rhymes, where two vowels blend together. Hai, the number two, glides from a to i. Mây, a cloud, glides quickly from â. Sao, a star, glides from a to o. And the ơi in trời, the sky — you will hear it every day, because Vietnamese people say "trời ơi!" all the time. It means "oh my goodness!"',
          content: `Two vowels, one smooth glide:

| Rhyme | Glide | Examples |
|-------|-------|----------|
| -ai | "eye" | **hai** (two) · **mai** (tomorrow) |
| -ay | shorter "eye" | **bay** (to fly) · **ngày** (day) |
| -ây | "uh-ee" quick | **mây** (cloud) · **đây** (here) |
| -ao | "ow" as in "cow" | **sao** (star) · **cao** (tall) |
| -au | tighter "ow" | **rau** (vegetables) · **sau** (after) |
| -âu | "oh-oo" | **đâu** (where) · **nâu** (brown) |
| -oi | "oy" | **nói** (to speak) · **đói** (hungry) |
| -ôi | "oh-ee" | **tôi** (I) · **xôi** (sticky rice) |
| -ơi | "uh-ee" open | **trời** (sky) · **chơi** (to play) |

## Hear the trio
- h**ai** (two) · h**ay** (interesting) · h**ây**
- ch**áo** (rice porridge) · ch**áu** (grandchild) · ch**âu** (continent)
- t**ôi** (I) · t**ơi** · t**oi**

> 🗣️ **Trời ơi!** ("oh my goodness!") — the most Vietnamese exclamation there is, and a perfect ơi drill.`,
          keyWords: [
            { word: 'hai', meaning: 'two' },
            { word: 'mây', meaning: 'cloud' },
            { word: 'sao', meaning: 'star' },
            { word: 'trời', meaning: 'sky; heaven' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: '"Hai" (two) sounds most like the English word:', options: ['hay', 'high', 'hoe', 'who'], answer: 'high' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which word means "cloud"?', options: ['may', 'mai', 'mây', 'mau'], answer: 'mây' },
            { id: 'e3', kind: 'multiple-choice', prompt: '"Trời ơi!" means roughly:', options: ['good morning', 'oh my goodness!', 'see you later', 'delicious!'], answer: 'oh my goodness!' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Type the word for "star" (s + ao, flat tone).', answer: 'sao' },
            { id: 'e5', kind: 'multiple-choice', prompt: 'Which pair shares the same rhyme?', options: ['hai & mai', 'sao & sau', 'tôi & trời', 'mây & mai'], answer: 'hai & mai' },
          ],
          writingPrompt: 'Write three short phrases using gliding rhymes: one with hai, one with sao, one with trời. Example: "hai ngôi sao" (two stars).',
        },
      ],
    },
    {
      index: 1,
      title: 'Chính tả & Câu đầu tiên — Spelling & First Sentences',
      lessons: [
        {
          id: 'm2w2l1',
          monthIndex: 1, weekIndex: 1, lessonIndex: 0,
          title: 'Spelling Rules: c/k/q, g/gh, ng/ngh',
          kind: 'phonics',
          objective: 'Choose the right spelling before i, e, ê',
          audioText: 'Vietnamese spelling is regular, but three sounds each have two or three spellings. The k sound is written c, k, or q. The g sound is written g or gh. The ng sound is written ng or ngh. The rule is simple and always the same: before the front vowels i, e, and ê, use the longer spelling: k, gh, ngh. Everywhere else, use c, g, ng.',
          content: `Three sounds, one golden rule.

## The golden rule: before **i, e, ê** → use **k, gh, ngh**
| Sound | Before i, e, ê | Elsewhere | Examples |
|-------|---------------|-----------|----------|
| /k/ | **k** | **c** | **kem** (ice cream) · **cá** (fish) |
| /g/ | **gh** | **g** | **ghế** (chair) · **gà** (chicken) |
| /ŋ/ | **ngh** | **ng** | **nghe** (listen) · **ngon** (delicious) |

## And q?
**q** is only ever used in the team **qu** (/kw/): **quà** (gift), **quê** (hometown), **quyển** (book classifier).

## Test yourself the fast way
"ghi" ✓ (before i) — "gi" would be the /z/ team!
"nghỉ" ✓ (before i) — *ngỉ* ✗
"kê" ✓ (before ê) — *cê* ✗
"cà phê" ✓ (a is not i/e/ê, so c)

> This rule has almost **no exceptions** — one of the joys of Vietnamese spelling.`,
          keyWords: [
            { word: 'kem', meaning: 'ice cream' },
            { word: 'ghế', meaning: 'chair' },
            { word: 'nghe', meaning: 'to listen; to hear' },
            { word: 'quê', meaning: 'hometown; countryside' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Before i, e, ê, the /k/ sound is written:', options: ['c', 'k', 'q', 'ch'], answer: 'k' },
            { id: 'e2', kind: 'multiple-choice', prompt: 'Which spelling is correct for "to listen"?', options: ['nge', 'nghe', 'ngge', 'nhe'], answer: 'nghe' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which is spelled correctly?', options: ['gế', 'ghế', 'qế', 'gé'], answer: 'ghế' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'The letter q appears in Vietnamese:', options: ['before any vowel', 'only in the team qu', 'only at word ends', 'never'], answer: 'only in the team qu' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Fix the spelling: "cem" should be written…', answer: 'kem', hint: 'e is a front vowel' },
          ],
          writingPrompt: 'Write six correctly-spelled words: two with c/k (cá, kem…), two with g/gh, two with ng/ngh. Underline the vowel that decided the spelling.',
        },
        {
          id: 'm2w2l2',
          monthIndex: 1, weekIndex: 1, lessonIndex: 1,
          title: 'Everyday Words: Numbers, Family, Food, Colours',
          kind: 'vocabulary',
          objective: 'Read and write core everyday vocabulary',
          audioText: 'Time to grow your vocabulary with the words Vietnamese life runs on. Numbers: một, hai, ba, bốn, năm — one to five. Family: mẹ is mother, bố is father, and gia đình is family. Food: cơm is rice, phở you already know. Colours: đỏ is red, vàng is yellow — also the word for gold. Listen and repeat each group.',
          content: `## Numbers 1–10
| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|----|
| **một** | **hai** | **ba** | **bốn** | **năm** | **sáu** | **bảy** | **tám** | **chín** | **mười** |

## Gia đình — Family
| Vietnamese | English |
|-----------|---------|
| **bố / ba** | father (North / South) |
| **mẹ / má** | mother (North / South) |
| **anh** | older brother |
| **chị** | older sister |
| **em** | younger sibling |
| **ông / bà** | grandfather / grandmother |

## Đồ ăn — Food
**cơm** (cooked rice) · **phở** (noodle soup) · **bánh mì** (bread/baguette) · **nước** (water) · **cà phê** (coffee) · **trà** (tea)

## Màu sắc — Colours
**đỏ** (red) · **vàng** (yellow; gold) · **xanh** (blue/green!) · **trắng** (white) · **đen** (black) · **nâu** (brown)

> Vietnamese uses ONE word, **xanh**, for blue and green — add **xanh da trời** (sky blue) or **xanh lá cây** (leaf green) to be exact.`,
          keyWords: [
            { word: 'một', meaning: 'one' },
            { word: 'mẹ', meaning: 'mother' },
            { word: 'cơm', meaning: 'cooked rice; a meal' },
            { word: 'đỏ', meaning: 'red' },
            { word: 'nước', meaning: 'water; country' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'What is "five" in Vietnamese?', options: ['ba', 'bốn', 'năm', 'sáu'], answer: 'năm' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Mẹ" means:', options: ['father', 'mother', 'older sister', 'grandmother'], answer: 'mother' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'Which colour word covers BOTH blue and green?', options: ['đỏ', 'vàng', 'xanh', 'nâu'], answer: 'xanh' },
            { id: 'e4', kind: 'fill-blank', prompt: 'Type the number that comes after hai (2): ba? bốn? Type the word for 3.', answer: 'ba' },
            { id: 'e5', kind: 'multiple-choice', prompt: '"Cơm" means:', options: ['noodle soup', 'cooked rice', 'bread', 'coffee'], answer: 'cooked rice' },
          ],
          writingPrompt: 'Write the numbers one to ten in Vietnamese from memory, then list your own family members with the right Vietnamese word for each (anh, chị, em…).',
        },
        {
          id: 'm2w2l3',
          monthIndex: 1, weekIndex: 1, lessonIndex: 2,
          title: 'First Sentences: Tôi là…',
          kind: 'grammar',
          objective: 'Build subject–verb–object sentences and meet classifiers',
          audioText: 'Your first real sentences! Vietnamese word order is the same as English: subject, verb, object. Tôi là học sinh — I am a student. Đây là mẹ tôi — this is my mother. Tôi ăn phở — I eat phở. No verb endings, no plurals, no articles to memorise. But nouns like to travel with a small classifier word: con for animals, cái for things. Con mèo — a cat. Cái bàn — a table.',
          content: `## Word order = English: Subject – Verb – Object
| Vietnamese | Word-by-word | English |
|-----------|--------------|---------|
| **Tôi là học sinh.** | I – be – student | I am a student. |
| **Đây là mẹ tôi.** | this – be – mother – my | This is my mother. |
| **Tôi ăn phở.** | I – eat – phở | I eat phở. |
| **Bạn uống trà.** | you – drink – tea | You drink tea. |

## The wonderful missing bits
✓ No verb endings: **ăn** = eat, eats, eating, ate
✓ No plural s: **hai bạn** = two friends
✓ Possession = just add the owner after: **mẹ tôi** = my mother ("mother me")

## Classifiers (just a hello for now)
Nouns usually bring a small helper word:
| Classifier | Used for | Example |
|-----------|----------|---------|
| **con** | animals | **con mèo** (the cat) · **con cá** (the fish) |
| **cái** | most things | **cái bàn** (the table) · **cái ghế** (the chair) |
| **chiếc** | vehicles, single items | **chiếc xe** (the vehicle) |

> Think of them like "a *sheet* of paper, a *head* of cattle" — English has them too, Vietnamese just uses them everywhere.`,
          keyWords: [
            { word: 'là', meaning: 'to be (am / is / are)' },
            { word: 'đây', meaning: 'this; here' },
            { word: 'con mèo', meaning: 'cat (with its classifier)' },
            { word: 'uống', meaning: 'to drink' },
          ],
          exercises: [
            { id: 'e1', kind: 'multiple-choice', prompt: 'Vietnamese basic word order is:', options: ['verb first', 'subject–verb–object, like English', 'object first', 'free order'], answer: 'subject–verb–object, like English' },
            { id: 'e2', kind: 'multiple-choice', prompt: '"Tôi là học sinh" means:', options: ['I like school', 'I am a student', 'You are a teacher', 'This is my school'], answer: 'I am a student' },
            { id: 'e3', kind: 'multiple-choice', prompt: 'How do you say "my mother"?', options: ['tôi mẹ', 'mẹ tôi', 'mẹ của', 'là mẹ'], answer: 'mẹ tôi' },
            { id: 'e4', kind: 'multiple-choice', prompt: 'Which classifier goes with animals?', options: ['cái', 'con', 'chiếc', 'quyển'], answer: 'con' },
            { id: 'e5', kind: 'fill-blank', prompt: 'Complete: Đây ___ bạn tôi. (This is my friend.)', answer: 'là' },
          ],
          writingPrompt: 'Write four sentences about yourself with Tôi là…, Tôi ăn…, Tôi uống…, and Đây là… Use at least one classifier (con/cái/chiếc) and all your tone marks.',
        },
      ],
    },
  ],
};
