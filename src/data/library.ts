// Graded reading library: 2 stories per level, matched to the 6 curriculum months.
export interface StoryQuizQ {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
}

export interface Story {
  id: string;
  level: number; // 1-6, unlocks with the matching month
  title: string;
  emoji: string;
  minutes: number;
  text: string; // paragraphs separated by blank lines
  vocab: { word: string; meaning: string }[];
  quiz: StoryQuizQ[];
}

export const LIBRARY: Story[] = [
  // ── Level 1 ────────────────────────────────────────────────────────────────
  {
    id: 's1a',
    level: 1,
    title: 'Sam and the Cat',
    emoji: '🐱',
    minutes: 1,
    text: `Sam has a cat. The cat is Max.

Max can run. Max can hop. Max sits on the mat.

Sam has a red cup. Max taps the cup. The cup tips!

"No, Max!" says Sam. Max naps on the mat. Sam pats Max.

Sam loves his cat.`,
    vocab: [
      { word: 'hop', meaning: 'to jump a short way' },
      { word: 'tip', meaning: 'to fall over to one side' },
      { word: 'nap', meaning: 'a short sleep' },
    ],
    quiz: [
      { id: 'q1', prompt: 'What is the cat called?', options: ['Sam', 'Max', 'Rex', 'Mat'], answer: 'Max' },
      { id: 'q2', prompt: 'Where does Max sit?', options: ['on the bed', 'on the cup', 'on the mat', 'on Sam'], answer: 'on the mat' },
      { id: 'q3', prompt: 'What does Max tap?', options: ['the mat', 'the red cup', 'the door', 'a ball'], answer: 'the red cup' },
      { id: 'q4', prompt: 'What does Max do at the end?', options: ['runs away', 'naps on the mat', 'tips the cup again', 'hops on Sam'], answer: 'naps on the mat' },
    ],
  },
  {
    id: 's1b',
    level: 1,
    title: 'The Red Hen',
    emoji: '🐔',
    minutes: 1,
    text: `Jen has a red hen. The hen is Pip.

Pip can peck. Pip pecks at the pen. Peck, peck, peck!

Jen gets a big pot. She puts corn in the pot. Pip runs to the pot.

Pip pecks the corn. Yum, yum!

The sun sets. Pip naps in the pen. Jen says, "Good night, Pip!"`,
    vocab: [
      { word: 'hen', meaning: 'a female chicken' },
      { word: 'peck', meaning: 'to bite or hit with a beak' },
      { word: 'pen', meaning: 'a small space for animals' },
    ],
    quiz: [
      { id: 'q1', prompt: 'What colour is the hen?', options: ['brown', 'white', 'red', 'black'], answer: 'red' },
      { id: 'q2', prompt: 'What does Jen put in the pot?', options: ['water', 'corn', 'eggs', 'mud'], answer: 'corn' },
      { id: 'q3', prompt: 'Where does Pip nap?', options: ['in the pot', 'in the pen', 'on the mat', 'in the sun'], answer: 'in the pen' },
      { id: 'q4', prompt: 'When does Pip nap?', options: ['when the sun sets', 'in the morning', 'at lunch', 'before eating'], answer: 'when the sun sets' },
    ],
  },

  // ── Level 2 ────────────────────────────────────────────────────────────────
  {
    id: 's2a',
    level: 2,
    title: 'The Lost Ball',
    emoji: '⚽',
    minutes: 2,
    text: `Tom and Mia play football in the park. Tom kicks the ball very hard. The ball flies over the tall fence!

"Oh no," says Tom. "That was my best ball."

Mia looks at the fence. It is too tall to climb. Then she sees a small gate. The gate is open.

Behind the fence, there is a garden. An old man waters his flowers. The ball sits next to a rose bush.

"Excuse me," says Mia. "May we get our ball, please?"

The old man smiles. "Of course! And here — take some apples from my tree. You are very polite children."

Tom and Mia thank the old man. They walk home with the ball and three red apples. It was a lucky day after all.`,
    vocab: [
      { word: 'fence', meaning: 'a wall made of wood or metal around a garden' },
      { word: 'polite', meaning: 'having good manners; saying please and thank you' },
      { word: 'lucky', meaning: 'having good things happen to you' },
    ],
    quiz: [
      { id: 'q1', prompt: 'Where does the ball go?', options: ['into the lake', 'over the fence', 'up a tree', 'under a car'], answer: 'over the fence' },
      { id: 'q2', prompt: 'How do the children get into the garden?', options: ['they climb the fence', 'through a small gate', 'the old man lifts them', 'they dig a hole'], answer: 'through a small gate' },
      { id: 'q3', prompt: 'Why does the old man give them apples?', options: ['they pay him', 'they are polite', 'they water his flowers', 'it is his birthday'], answer: 'they are polite' },
      { id: 'q4', prompt: 'How many apples do they take home?', options: ['one', 'two', 'three', 'four'], answer: 'three' },
    ],
  },
  {
    id: 's2b',
    level: 2,
    title: 'Ben’s Big Day',
    emoji: '🎂',
    minutes: 2,
    text: `Today is Ben's birthday. He is eight years old. But this morning, everyone is acting strange.

Mum says, "Good morning," and nothing else. Dad reads his newspaper. His sister Amy just watches TV.

Ben feels sad. Did they forget his birthday?

At school, his best friend Leo does not say "Happy Birthday" either. Ben feels very sad now.

After school, Ben walks home slowly. He opens the front door. The house is dark.

"SURPRISE!" The lights turn on. Mum, Dad, Amy, Leo, and all his friends jump out. There are balloons, a big chocolate cake, and presents everywhere!

"We did not forget," laughs Mum. "We were only pretending!"

Ben laughs too. It is the best birthday ever.`,
    vocab: [
      { word: 'strange', meaning: 'unusual or surprising' },
      { word: 'pretend', meaning: 'to act as if something is true when it is not' },
      { word: 'surprise', meaning: 'something unexpected' },
    ],
    quiz: [
      { id: 'q1', prompt: 'How old is Ben today?', options: ['seven', 'eight', 'nine', 'ten'], answer: 'eight' },
      { id: 'q2', prompt: 'Why is Ben sad at school?', options: ['he failed a test', 'he lost his lunch', 'nobody said Happy Birthday', 'Leo was mean'], answer: 'nobody said Happy Birthday' },
      { id: 'q3', prompt: 'What happens when Ben opens the front door?', options: ['the house is empty', 'everyone shouts SURPRISE', 'his dog runs out', 'he sees a cake on fire'], answer: 'everyone shouts SURPRISE' },
      { id: 'q4', prompt: 'Why was the family acting strange?', options: ['they forgot', 'they were angry', 'they were pretending', 'they were tired'], answer: 'they were pretending' },
    ],
  },

  // ── Level 3 ────────────────────────────────────────────────────────────────
  {
    id: 's3a',
    level: 3,
    title: 'The Secret Door',
    emoji: '🚪',
    minutes: 3,
    text: `Grandma's house was old and full of mysteries. Lena loved exploring it every summer, but she had never been to the attic.

One rainy afternoon, she climbed the narrow stairs. Dust danced in the light from a small round window. Boxes were stacked everywhere like a cardboard city.

Behind the tallest stack, Lena found a little wooden door, no higher than her knee. It had a brass handle shaped like a leaf.

Her heart beat faster. She turned the handle. Inside, there was no treasure — just a small tin box. She opened it and found photographs of a young girl who looked exactly like her, standing next to a garden full of sunflowers.

That evening, she showed Grandma the photos. Grandma's eyes went soft. "That was me," she said quietly, "when I was your age. I hid that box so that one day, someone curious like you would find it."

"But how did you know someone would look?" asked Lena.

Grandma smiled. "Because curiosity runs in this family, my dear. It always has."`,
    vocab: [
      { word: 'attic', meaning: 'a room at the very top of a house, under the roof' },
      { word: 'narrow', meaning: 'not wide' },
      { word: 'curious', meaning: 'wanting to know or learn things' },
      { word: 'brass', meaning: 'a yellow-gold metal' },
    ],
    quiz: [
      { id: 'q1', prompt: 'Where does Lena find the little door?', options: ['in the garden', 'in the kitchen', 'in the attic', 'in the basement'], answer: 'in the attic' },
      { id: 'q2', prompt: 'What is inside the tin box?', options: ['treasure', 'photographs', 'sunflower seeds', 'a key'], answer: 'photographs' },
      { id: 'q3', prompt: 'Who is the girl in the photos?', options: ['Lena', 'Grandma when she was young', 'Lena’s mother', 'a stranger'], answer: 'Grandma when she was young' },
      { id: 'q4', prompt: 'Why did Grandma hide the box?', options: ['to keep it safe from thieves', 'she forgot about it', 'for a curious person to find one day', 'to trick Lena'], answer: 'for a curious person to find one day' },
      { id: 'q5', prompt: 'What can we infer about Lena and Grandma?', options: ['they do not get along', 'they are alike in personality', 'they both dislike the attic', 'they live together all year'], answer: 'they are alike in personality' },
    ],
  },
  {
    id: 's3b',
    level: 3,
    title: 'The Kite Contest',
    emoji: '🪁',
    minutes: 3,
    text: `Every spring, the town of Millbrook held a kite contest on Windy Hill. This year, Amir was finally old enough to enter.

For weeks, he worked on his kite in the garage. He chose light bamboo for the frame and bright orange paper for the sail. His little sister Nadia painted a phoenix on it with golden wings.

On the day of the contest, the sky was grey. The other kites were bigger and fancier. One boy, Marcus, had a huge dragon kite that everyone admired.

The whistle blew. Kites rose into the air like a flock of strange birds. Marcus's dragon climbed fast — but then the wind grew wild. The heavy dragon spun, dived, and crashed into a tree.

Amir's phoenix was small and light. It danced with the wild wind instead of fighting it, climbing higher and higher until it was just an orange spark against the clouds.

When the judges measured, the phoenix had flown the highest of all.

"How did you know to build it so light?" Marcus asked afterwards, shaking Amir's hand.

Amir smiled. "My grandfather always says: you cannot control the wind. You can only build something that welcomes it."`,
    vocab: [
      { word: 'bamboo', meaning: 'a tall plant with light, strong, hollow stems' },
      { word: 'phoenix', meaning: 'a magical bird from old stories that is reborn from fire' },
      { word: 'admire', meaning: 'to look at something with respect or approval' },
      { word: 'welcome', meaning: 'to accept something gladly' },
    ],
    quiz: [
      { id: 'q1', prompt: 'What does Nadia paint on the kite?', options: ['a dragon', 'a phoenix', 'the sun', 'golden clouds'], answer: 'a phoenix' },
      { id: 'q2', prompt: 'What happens to the dragon kite?', options: ['it wins the contest', 'it flies highest', 'it crashes into a tree', 'it never takes off'], answer: 'it crashes into a tree' },
      { id: 'q3', prompt: 'Why does Amir’s kite fly so well?', options: ['it is the biggest', 'it is light and works with the wind', 'Marcus helps him', 'the wind stops'], answer: 'it is light and works with the wind' },
      { id: 'q4', prompt: 'What is the lesson of the grandfather’s saying?', options: ['always build big', 'avoid windy days', 'adapt to what you cannot control', 'never enter contests'], answer: 'adapt to what you cannot control' },
    ],
  },

  // ── Level 4 ────────────────────────────────────────────────────────────────
  {
    id: 's4a',
    level: 4,
    title: 'The Lighthouse Keeper',
    emoji: '🗼',
    minutes: 4,
    text: `For forty-one years, Elias Reed had kept the light burning at Gullpoint. Every evening he climbed the one hundred and twelve spiral steps, polished the great lens, and lit the lamp that warned ships away from the black rocks below.

Now the letter on his kitchen table informed him, in cold official language, that the lighthouse would be automated next month. A machine would do his job. No keeper required.

That night, a storm rolled in from the north — the worst in a decade. Rain hammered the windows, and waves exploded against the cliffs. Elias climbed the steps as he always did. Through the curtain of rain, he glimpsed something the automatic sensors would never have noticed: a faint, irregular flash far out at sea. Not a ship's lamp. A hand torch, signalling.

Three short flashes. Three long. Three short. SOS.

Elias radioed the coastguard with the exact bearing, then swung the great lens toward the signal, sweeping the beam like a pointing finger so the rescue boat could follow it through the dark. Two hours later, three exhausted fishermen were pulled from a sinking trawler.

The story appeared in the newspaper. Letters arrived from strangers. The harbour authority quietly revised its plans: the light would be automated, yes — but Gullpoint would keep a resident keeper, "for duties no instrument can perform."

Elias framed nothing, celebrated little. But each evening after, as he climbed the spiral stairs, he took the steps a little more slowly, the way a man does when he knows the climb matters.`,
    vocab: [
      { word: 'automated', meaning: 'operated by machines instead of people' },
      { word: 'bearing', meaning: 'the direction of something, used in navigation' },
      { word: 'trawler', meaning: 'a fishing boat that pulls a large net' },
      { word: 'revise', meaning: 'to change or update something' },
    ],
    quiz: [
      { id: 'q1', prompt: 'What news does the letter bring?', options: ['Elias is promoted', 'the lighthouse will be automated', 'a storm is coming', 'the lighthouse will be demolished'], answer: 'the lighthouse will be automated' },
      { id: 'q2', prompt: 'What does Elias notice that machines would have missed?', options: ['a broken lens', 'a sinking rock', 'a hand-torch SOS signal', 'a fire on the cliffs'], answer: 'a hand-torch SOS signal' },
      { id: 'q3', prompt: 'How does Elias help the rescue boat?', options: ['he sails out himself', 'he sweeps the beam toward the signal', 'he swims to the trawler', 'he repairs their radio'], answer: 'he sweeps the beam toward the signal' },
      { id: 'q4', prompt: 'What does the harbour authority decide in the end?', options: ['to fire Elias anyway', 'to cancel automation completely', 'to keep a resident keeper alongside the automation', 'to close the lighthouse'], answer: 'to keep a resident keeper alongside the automation' },
      { id: 'q5', prompt: 'The final paragraph suggests Elias feels:', options: ['bitter about the letter', 'that his work has meaning', 'afraid of storms', 'too old to climb'], answer: 'that his work has meaning' },
    ],
  },
  {
    id: 's4b',
    level: 4,
    title: 'The New Student',
    emoji: '🎒',
    minutes: 4,
    text: `Priya noticed the new student before anyone else did — mostly because he sat in her favourite seat by the window and didn't seem to realise the whole class was staring at him.

His name was Daniyar. He had moved from Kazakhstan, spoke careful, formal English, and ate lunch alone with a chessboard open beside his sandwich, playing both sides.

For two weeks, nobody spoke to him. It wasn't cruelty exactly; it was the lazy kind of unkindness where everyone assumes someone else will make the effort.

The class had a debate tournament coming, and Priya's team was a member short. Her friends suggested Tom, who was popular but never prepared. Instead, Priya crossed the cafeteria and sat down opposite the chessboard.

"Black is winning," she said.

Daniyar looked up, surprised. "White resigned three moves ago," he said. "Black doesn't know it yet." Then he smiled, and it changed his whole face.

He joined the team. In the tournament, when the opposing side quoted a statistic that sounded invented, Daniyar dismantled it calmly, move by move, like a chess problem: "If that number were true, then the following three things would also need to be true. Shall we check them one at a time?"

They won the tournament. But what Priya remembered longest wasn't the trophy — it was how many people suddenly discovered, in the corridors afterwards, that they had always meant to talk to Daniyar. The effort everyone had been waiting for someone else to make had only ever cost her one walk across a cafeteria.`,
    vocab: [
      { word: 'formal', meaning: 'careful and correct, following rules' },
      { word: 'assume', meaning: 'to believe something is true without checking' },
      { word: 'dismantle', meaning: 'to take apart, piece by piece' },
      { word: 'statistic', meaning: 'a fact expressed as a number' },
    ],
    quiz: [
      { id: 'q1', prompt: 'Why does nobody talk to Daniyar at first?', options: ['he is rude to everyone', 'everyone assumes someone else will make the effort', 'he cannot speak English', 'the teacher forbids it'], answer: 'everyone assumes someone else will make the effort' },
      { id: 'q2', prompt: 'How does Priya start the conversation?', options: ['she asks about Kazakhstan', 'she comments on his chess game', 'she offers him food', 'she invites him to sit with her friends'], answer: 'she comments on his chess game' },
      { id: 'q3', prompt: 'How does Daniyar respond to the invented statistic?', options: ['he gets angry', 'he ignores it', 'he tests it logically, step by step', 'he quotes a different statistic'], answer: 'he tests it logically, step by step' },
      { id: 'q4', prompt: 'What does Priya remember most?', options: ['winning the trophy', 'the chess game', 'how little effort inclusion had actually cost', 'the opposing team’s speech'], answer: 'how little effort inclusion had actually cost' },
    ],
  },

  // ── Level 5 ────────────────────────────────────────────────────────────────
  {
    id: 's5a',
    level: 5,
    title: 'The Clockmaker’s Apprentice',
    emoji: '🕰️',
    minutes: 5,
    text: `The sign above the shop read "M. Aurelio — Clocks Made & Mended," though half the letters had faded, so that from across the street it appeared to promise, mysteriously, "locks ade ended."

Inside, time did not so much pass as accumulate. Hundreds of clocks ticked out of rhythm with one another, a gentle mechanical rain, and at the centre of it sat Maestro Aurelio, who was said to be able to diagnose a faulty clock by ear alone, the way a doctor listens to a heart.

Sofia had been his apprentice for a year, and in that year he had permitted her to repair exactly nothing. She swept floors. She polished brass. She sorted screws into drawers by sizes so similar she suspected he invented new categories nightly, purely to torment her.

"When do I learn the actual work?" she finally demanded.

The old man did not look up. "What did the walnut-case clock in the window say when you dusted it this morning?"

"Say? It's slow. It loses four minutes a day."

"And the carriage clock beside it?"

"It's... fast in the morning, but it evens out by evening as the shop warms —" Sofia stopped. The maestro was smiling.

"A year ago," he said, "you would have told me they were both simply broken. Now you hear that one is tired and one is sensitive to cold. You have been learning the actual work every day, apprentice. The hands and tools —" he waved dismissively at his bench, "— those are the easy part. Any fool can take a clock apart. The craft is in knowing what it is trying to tell you first."

He slid a small, silent pocket watch across the bench toward her. "Now. Tell me what this one is not saying."`,
    vocab: [
      { word: 'apprentice', meaning: 'a person learning a skilled trade from a master' },
      { word: 'accumulate', meaning: 'to build up or collect over time' },
      { word: 'diagnose', meaning: 'to identify a problem by examining its signs' },
      { word: 'dismissively', meaning: 'in a way that shows something is not important' },
    ],
    quiz: [
      { id: 'q1', prompt: 'What is Sofia’s complaint?', options: ['the shop is too loud', 'she is not allowed to repair anything', 'the maestro underpays her', 'the clocks are all broken'], answer: 'she is not allowed to repair anything' },
      { id: 'q2', prompt: 'What has Sofia actually learned during the year?', options: ['nothing at all', 'to take clocks apart', 'to hear what is wrong with a clock', 'to build clock cases'], answer: 'to hear what is wrong with a clock' },
      { id: 'q3', prompt: 'According to the maestro, what is "the easy part"?', options: ['listening', 'sweeping', 'the hands and tools', 'selling clocks'], answer: 'the hands and tools' },
      { id: 'q4', prompt: 'The final line, "tell me what this one is not saying," refers to:', options: ['a clock that is silent because it is broken', 'a clock that talks', 'Sofia refusing to speak', 'the shop sign'], answer: 'a clock that is silent because it is broken' },
      { id: 'q5', prompt: 'The faded shop sign at the start mainly adds:', options: ['a clue to the mystery', 'humour and atmosphere', 'foreshadowing of a crime', 'information about prices'], answer: 'humour and atmosphere' },
    ],
  },
  {
    id: 's5b',
    level: 5,
    title: 'The Weather Station',
    emoji: '🌪️',
    minutes: 5,
    text: `The mountain weather station had two employees, one functioning kettle, and — according to the logbook Ana inherited — a ghost.

"Entry, 14 March, 03:40," the previous observer had written, decades ago. "Instruments woke me again. Wind gauge spinning in dead calm. Third time this month."

Ana was a scientist. She did not believe in ghosts. She believed in data, and the data was strange: every few weeks, always in the small hours, the anemometer recorded a violent gust that no other station in the range detected. The window would rattle once, as if something enormous had exhaled against it. Then stillness.

Her colleague Tomás, who had worked the station for eleven years, refused to discuss it beyond a shrug. "The mountain breathes," he said. "Write it down and go back to sleep."

Ana did not go back to sleep. She cross-referenced decades of logs against geological surveys, and found her answer in a paper about glacial caves: a vast hollow ran beneath the summit, and when the temperature dropped past a precise threshold, the cave "exhaled" — pressure equalising through hidden vents in a single, sudden gust. A mountain-sized bottle, uncorking.

She wrote it up. The paper was published. A journalist called it "the ghost that turned out to be geology," and Ana was briefly, mildly famous.

On her last night before transferring down to the valley institute, the window rattled at 03:40 exactly. Ana lay in the dark, listening to the long sigh move through the rocks beneath her, and found — to her own great surprise — that she was a little sorry to have explained it.`,
    vocab: [
      { word: 'anemometer', meaning: 'an instrument that measures wind speed' },
      { word: 'threshold', meaning: 'the point at which something begins to happen' },
      { word: 'geological', meaning: 'relating to rocks and the structure of the earth' },
      { word: 'equalise', meaning: 'to become equal or balanced' },
    ],
    quiz: [
      { id: 'q1', prompt: 'What strange thing does the equipment record?', options: ['sudden gusts during calm weather', 'impossible temperatures', 'earthquakes', 'radio signals'], answer: 'sudden gusts during calm weather' },
      { id: 'q2', prompt: 'How does Ana approach the mystery?', options: ['she performs a ritual', 'she ignores it', 'she investigates data and research papers', 'she asks a journalist'], answer: 'she investigates data and research papers' },
      { id: 'q3', prompt: 'What is the real cause of the "ghost"?', options: ['a broken anemometer', 'a glacial cave releasing pressure', 'Tomás playing tricks', 'passing aircraft'], answer: 'a glacial cave releasing pressure' },
      { id: 'q4', prompt: 'The phrase "a mountain-sized bottle, uncorking" is:', options: ['a simile', 'a metaphor', 'personification', 'hyperbole'], answer: 'a metaphor' },
      { id: 'q5', prompt: 'How does Ana feel at the end about solving the mystery?', options: ['triumphant only', 'completely indifferent', 'slightly sorry the wonder is gone', 'frightened'], answer: 'slightly sorry the wonder is gone' },
    ],
  },

  // ── Level 6 ────────────────────────────────────────────────────────────────
  {
    id: 's6a',
    level: 6,
    title: 'The Last Bookshop',
    emoji: '📕',
    minutes: 6,
    text: `The eviction notice was printed on paper of remarkable quality — thick, cream-coloured, faintly watermarked — and Margaret Okafor appreciated the irony of that even as she taped it, face-out, in the window of the last bookshop on Carden Street.

Above the notice she added a sign of her own: "CLOSING IN 30 DAYS. UNTIL THEN: EVERY BOOK FREE. LIMIT ONE. CHOOSE CAREFULLY."

The first day brought bargain-hunters, who left disappointed; a free book, it turns out, is worthless to someone who only wanted a discount. The second day brought children, who understood the rules instinctively and treated the shelves with the gravity of jewellers. A boy spent four hours choosing, left with a battered atlas, and returned the next morning just to confirm he had chosen correctly. Margaret assured him that he had.

By the second week, something unplanned was happening. People returned — not to take another book, which the sign forbade, but to explain their choice to whoever was present. A retired bricklayer stood by the poetry section and recited Neruda, in Spanish, to complete strangers, and the strangers stayed. Someone brought a chair. Someone else brought two flasks of coffee, and then it was simply understood that there would always be coffee.

The story did what stories do now: someone filmed the bricklayer, and the video travelled. Donations arrived from four continents. A committee formed itself without being asked, the way committees do when something matters. On day twenty-nine, the committee's lawyer discovered that the developer's planning permission had lapsed during an administrative delay — and suddenly there was time, and money, and a petition with forty thousand names.

The shop survived, of course. You have probably read about it; it is famous now, in a small way.

But Margaret keeps the original sign framed behind the till, and when journalists ask about the campaign, the lawyer, the forty thousand names, she redirects them, gently, to what she considers the actual machinery of the rescue: "People were asked to choose one book carefully," she says, "and it reminded them what books are for. Everything after that was paperwork."`,
    vocab: [
      { word: 'eviction', meaning: 'the legal removal of someone from a property' },
      { word: 'irony', meaning: 'when something is the opposite of what you would expect, in a meaningful way' },
      { word: 'gravity', meaning: 'great seriousness' },
      { word: 'lapse', meaning: 'to expire or become invalid through the passing of time' },
    ],
    quiz: [
      { id: 'q1', prompt: 'What irony does Margaret appreciate in the opening?', options: ['the notice is full of spelling errors', 'the eviction notice is printed on beautiful paper', 'the developer loves books', 'the shop was already closed'], answer: 'the eviction notice is printed on beautiful paper' },
      { id: 'q2', prompt: 'Why do the bargain-hunters leave disappointed?', options: ['the books are expensive', 'the shop is closed', 'a free book has no value to someone who only wanted a discount', 'the queue is too long'], answer: 'a free book has no value to someone who only wanted a discount' },
      { id: 'q3', prompt: 'What legally saves the bookshop?', options: ['the viral video', 'the petition', 'the developer’s planning permission had lapsed', 'a wealthy donor bought it'], answer: 'the developer’s planning permission had lapsed' },
      { id: 'q4', prompt: 'What does Margaret consider "the actual machinery of the rescue"?', options: ['the lawyer’s discovery', 'the forty thousand signatures', 'people being reminded what books are for', 'the donations'], answer: 'people being reminded what books are for' },
      { id: 'q5', prompt: 'The author’s tone in this story is best described as:', options: ['bitter and angry', 'warmly ironic', 'coldly factual', 'frightening'], answer: 'warmly ironic' },
    ],
  },
  {
    id: 's6b',
    level: 6,
    title: 'The Cartographer of Memory',
    emoji: '🗺️',
    minutes: 6,
    text: `My grandfather drew maps of places that no longer existed.

He had been a surveyor once, a maker of official maps, precise to the centimetre. But after his retirement — and after the diagnosis that we all referred to, by unspoken agreement, as "his memory" — he began drawing a different kind of map at the kitchen table: the village where he grew up, which had been flooded in 1963 to make way for a reservoir.

He drew it street by street. Here was the baker's, which smelled of caraway; he drew tiny scent-lines rising from the chimney, a cartographic invention entirely his own. Here was the schoolhouse with its bell that rang flat. Here, marked with a small precise star, was the corner where he had first seen my grandmother, aged seventeen, carrying a basket of washing and — he insisted the map record this — laughing at somebody else's joke.

The remarkable thing was the maps' accuracy. When a local historical society compared his drawings against pre-flood photographs, the proportions were nearly perfect. The man who could no longer reliably find the bathroom in his own house could navigate, flawlessly, a village that had been underwater for sixty years.

"The doctors talk about what he's losing," my mother said once, watching him work. "Nobody measures what he's keeping."

Toward the end, the maps changed. He began adding things that had never been there: a lighthouse in the landlocked village square; my grandmother at every corner now, seventeen forever, multiplied like a figure in an icon. The historical society politely lost interest. I could not. It seemed to me he had simply moved from surveying to cartography of another kind — no longer recording where things were, but declaring where they belonged.

He died in October. Among his papers we found one final map, unfinished. It was labelled, in his old draughtsman's lettering, not with the village's name but with a single word: "Home." The streets on that last map do not match the photographs at all.

I had it framed. It hangs in my hallway, and it is the most accurate map I own.`,
    vocab: [
      { word: 'cartographer', meaning: 'a person who draws maps' },
      { word: 'surveyor', meaning: 'a person who measures land precisely' },
      { word: 'reservoir', meaning: 'an artificial lake used to store water' },
      { word: 'draughtsman', meaning: 'a person skilled in precise technical drawing' },
    ],
    quiz: [
      { id: 'q1', prompt: 'Why does the grandfather’s childhood village no longer exist?', options: ['it burned down', 'it was flooded for a reservoir', 'it was abandoned', 'it was bombed'], answer: 'it was flooded for a reservoir' },
      { id: 'q2', prompt: 'What is remarkable about his early maps of the village?', options: ['they are drawn in colour', 'they are nearly perfectly accurate', 'they are very large', 'they show the reservoir'], answer: 'they are nearly perfectly accurate' },
      { id: 'q3', prompt: 'What does the mother’s line, "Nobody measures what he’s keeping," suggest?', options: ['the doctors are careless', 'his memory loss is exaggerated', 'his preserved memories have value that medicine overlooks', 'he is hiding his condition'], answer: 'his preserved memories have value that medicine overlooks' },
      { id: 'q4', prompt: 'Why does the narrator stay interested when the maps become inaccurate?', options: ['they might still sell', 'the maps now express meaning rather than record facts', 'the historical society pays for them', 'they are easier to read'], answer: 'the maps now express meaning rather than record facts' },
      { id: 'q5', prompt: 'Why does the narrator call the final, inaccurate map "the most accurate map I own"?', options: ['it matches modern satellite images', 'accuracy is impossible to judge', 'it truthfully records what "home" meant to his grandfather', 'the photographs were wrong'], answer: 'it truthfully records what "home" meant to his grandfather' },
    ],
  },
];

export function storiesForLevel(level: number): Story[] {
  return LIBRARY.filter((s) => s.level === level);
}
