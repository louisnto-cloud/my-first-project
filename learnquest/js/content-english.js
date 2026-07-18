/* LearnQuest — English language content banks (hand-authored, BC ELA aligned) */
'use strict';

const EN = {
  letters: 'abcdefghijklmnopqrstuvwxyz'.split(''),

  letterSounds: {
    a: 'ah, like apple', b: 'buh, like ball', c: 'kuh, like cat', d: 'duh, like dog',
    e: 'eh, like egg', f: 'fff, like fish', g: 'guh, like goat', h: 'hhh, like hat',
    i: 'ih, like igloo', j: 'juh, like jam', k: 'kuh, like kite', l: 'lll, like lion',
    m: 'mmm, like moon', n: 'nnn, like nest', o: 'oh, like octopus', p: 'puh, like pig',
    q: 'kwuh, like queen', r: 'rrr, like rock', s: 'sss, like sun', t: 'tuh, like tiger',
    u: 'uh, like umbrella', v: 'vvv, like van', w: 'wuh, like wave', x: 'ks, like box',
    y: 'yuh, like yo-yo', z: 'zzz, like zebra'
  },

  letterEmoji: {
    a: '🍎', b: '⚽', c: '🐱', d: '🐶', e: '🥚', f: '🐟', g: '🐐', h: '🎩', i: '🧊',
    j: '🍓', k: '🪁', l: '🦁', m: '🌙', n: '🪺', o: '🐙', p: '🐷', q: '👑', r: '🪨',
    s: '☀️', t: '🐯', u: '☂️', v: '🚐', w: '🌊', x: '📦', y: '🪀', z: '🦓'
  },

  cvc: [
    { w: 'cat', e: '🐱' }, { w: 'dog', e: '🐶' }, { w: 'sun', e: '☀️' }, { w: 'hat', e: '🎩' },
    { w: 'bed', e: '🛏️' }, { w: 'pig', e: '🐷' }, { w: 'cup', e: '☕' }, { w: 'bug', e: '🐞' },
    { w: 'map', e: '🗺️' }, { w: 'pen', e: '🖊️' }, { w: 'bat', e: '🦇' }, { w: 'fox', e: '🦊' },
    { w: 'web', e: '🕸️' }, { w: 'jam', e: '🍓' }, { w: 'log', e: '🪵' }, { w: 'bus', e: '🚌' },
    { w: 'net', e: '🥅' }, { w: 'pot', e: '🍲' }, { w: 'rat', e: '🐀' }, { w: 'van', e: '🚐' },
    { w: 'six', e: '6️⃣' }, { w: 'box', e: '📦' }, { w: 'leg', e: '🦵' }, { w: 'nut', e: '🥜' }
  ],

  rhymes: [
    ['cat', 'hat', 'bat', 'mat', 'rat'],
    ['dog', 'log', 'frog', 'fog'],
    ['sun', 'fun', 'run', 'bun'],
    ['cake', 'lake', 'snake', 'rake'],
    ['star', 'car', 'far', 'jar'],
    ['king', 'ring', 'sing', 'wing'],
    ['light', 'night', 'kite', 'bright'],
    ['bear', 'chair', 'hair', 'pear'],
    ['tree', 'bee', 'sea', 'key'],
    ['moon', 'spoon', 'balloon', 'noon']
  ],
  nonRhymes: ['fish', 'lamp', 'desk', 'milk', 'sock', 'hand', 'book', 'wolf', 'gold', 'drum'],

  sight1: ['the', 'a', 'I', 'to', 'and', 'is', 'you', 'it', 'in', 'we', 'my', 'me', 'go', 'see', 'like', 'can', 'said', 'she', 'he', 'was'],
  sight2: ['they', 'have', 'this', 'what', 'when', 'your', 'come', 'were', 'there', 'want', 'because', 'from', 'here', 'little', 'some', 'would', 'could', 'again', 'about', 'people'],

  digraphWords: [
    { w: 'ship', d: 'sh', e: '🚢' }, { w: 'shell', d: 'sh', e: '🐚' }, { w: 'fish', d: 'sh', e: '🐟' }, { w: 'brush', d: 'sh', e: '🖌️' },
    { w: 'chair', d: 'ch', e: '🪑' }, { w: 'cheese', d: 'ch', e: '🧀' }, { w: 'chick', d: 'ch', e: '🐤' }, { w: 'lunch', d: 'ch', e: '🥪' },
    { w: 'thumb', d: 'th', e: '👍' }, { w: 'three', d: 'th', e: '3️⃣' }, { w: 'bath', d: 'th', e: '🛁' }, { w: 'moth', d: 'th', e: '🦋' },
    { w: 'whale', d: 'wh', e: '🐋' }, { w: 'wheel', d: 'wh', e: '🛞' }, { w: 'whisk', d: 'wh', e: '🥣' },
    { w: 'ring', d: 'ng', e: '💍' }, { w: 'king', d: 'ng', e: '🤴' }, { w: 'wing', d: 'ng', e: '🪽' }
  ],
  blendWords: [
    { w: 'frog', b: 'fr', e: '🐸' }, { w: 'crab', b: 'cr', e: '🦀' }, { w: 'drum', b: 'dr', e: '🥁' },
    { w: 'star', b: 'st', e: '⭐' }, { w: 'snail', b: 'sn', e: '🐌' }, { w: 'plant', b: 'pl', e: '🪴' },
    { w: 'flag', b: 'fl', e: '🚩' }, { w: 'glove', b: 'gl', e: '🧤' }, { w: 'truck', b: 'tr', e: '🚚' },
    { w: 'sled', b: 'sl', e: '🛷' }, { w: 'broom', b: 'br', e: '🧹' }, { w: 'clock', b: 'cl', e: '🕐' }
  ],

  simpleSentences: [
    { s: 'The cat sat on the mat.', e: '🐱', q: 'Who sat on the mat?', a: 'the cat', wrong: ['the dog', 'a bird'] },
    { s: 'I see a big red bus.', e: '🚌', q: 'What colour is the bus?', a: 'red', wrong: ['blue', 'green'] },
    { s: 'The dog can run fast.', e: '🐶', q: 'What can the dog do?', a: 'run fast', wrong: ['fly high', 'swim deep'] },
    { s: 'We like to eat jam.', e: '🍓', q: 'What do we like to eat?', a: 'jam', wrong: ['soup', 'corn'] },
    { s: 'The sun is up in the sky.', e: '☀️', q: 'Where is the sun?', a: 'in the sky', wrong: ['in the sea', 'in a box'] },
    { s: 'My hat is on my head.', e: '🎩', q: 'Where is the hat?', a: 'on my head', wrong: ['on the bed', 'in the bag'] },
    { s: 'The pig is in the mud.', e: '🐷', q: 'Where is the pig?', a: 'in the mud', wrong: ['in the tree', 'on the roof'] },
    { s: 'She can hop like a frog.', e: '🐸', q: 'How does she hop?', a: 'like a frog', wrong: ['like a fish', 'like a snake'] }
  ],

  passages2: [
    {
      title: 'The Lost Kite', emoji: '🪁',
      text: 'Maya took her kite to the hill. The wind was strong. The kite flew up and up. Then the string broke! The kite landed in a tall tree. A friendly crow pushed it out with its beak. Maya said thank you to the crow.',
      qs: [
        { q: 'Where did Maya take her kite?', a: 'to the hill', wrong: ['to the beach', 'to school'] },
        { q: 'What happened to the string?', a: 'it broke', wrong: ['it grew longer', 'it turned blue'] },
        { q: 'Who helped get the kite back?', a: 'a crow', wrong: ['a dog', 'her dad'] }
      ]
    },
    {
      title: 'Soup Day', emoji: '🍲',
      text: 'On cold days, Ben makes soup with his grandpa. They chop carrots and potatoes. Grandpa adds a secret spice. The soup bubbles in the big pot. It smells wonderful. Ben always has two bowls.',
      qs: [
        { q: 'Who makes soup with Ben?', a: 'his grandpa', wrong: ['his teacher', 'his sister'] },
        { q: 'What does Grandpa add?', a: 'a secret spice', wrong: ['ice cubes', 'candy'] },
        { q: 'How many bowls does Ben have?', a: 'two', wrong: ['one', 'five'] }
      ]
    },
    {
      title: 'The Night Train', emoji: '🚆',
      text: 'A little train travels at night. It carries mail from town to town. The driver drinks warm tea. Owls watch the train pass. By morning, every letter is delivered, and the train sleeps all day.',
      qs: [
        { q: 'What does the train carry?', a: 'mail', wrong: ['animals', 'toys'] },
        { q: 'When does the train travel?', a: 'at night', wrong: ['at noon', 'in the morning'] },
        { q: 'What does the driver drink?', a: 'warm tea', wrong: ['cold juice', 'hot soup'] }
      ]
    },
    {
      title: 'Tide Pool Treasure', emoji: '🦀',
      text: 'At low tide, Lena looks in the tide pools. She finds a purple sea star and a tiny crab. The crab hides under a rock. Lena does not touch the animals. She draws them in her notebook instead.',
      qs: [
        { q: 'What does Lena find?', a: 'a sea star and a crab', wrong: ['a shark and a whale', 'a boot and a can'] },
        { q: 'Where does the crab hide?', a: 'under a rock', wrong: ['in a shell', 'in the sand'] },
        { q: 'What does Lena do instead of touching?', a: 'draws them', wrong: ['takes them home', 'throws rocks'] }
      ]
    }
  ],

  passages3: [
    {
      title: 'The Bicycle Shop', emoji: '🚲',
      text: 'Rosa\'s aunt owns a bicycle shop on Main Street. Every Saturday, Rosa helps out. She pumps up tires, oils squeaky chains, and rings up customers at the till. Her favourite job is testing the repaired bikes in the alley behind the shop. Last week, a racer brought in a bike with a bent wheel. Rosa watched her aunt straighten it with a special tool. One day, Rosa wants to fix bikes all by herself.',
      qs: [
        { q: 'What is this story mostly about?', a: 'Rosa helping at a bicycle shop', wrong: ['how to buy a bicycle', 'a race on Main Street'] },
        { q: 'What is Rosa\'s favourite job?', a: 'testing repaired bikes', wrong: ['pumping tires', 'sweeping the floor'] },
        { q: 'What does Rosa want to do one day?', a: 'fix bikes by herself', wrong: ['own a candy store', 'become a racer'] }
      ]
    },
    {
      title: 'How Bees Make Honey', emoji: '🐝',
      text: 'Honey starts as nectar, a sweet juice inside flowers. Bees sip the nectar and store it in a special stomach. Back at the hive, they pass the nectar to other bees, who chew it and spread it into wax cells. Then the bees fan the nectar with their wings until the water dries out. What is left is thick, golden honey. One bee makes only a tiny drop of honey in its whole life.',
      qs: [
        { q: 'What is nectar?', a: 'a sweet juice inside flowers', wrong: ['a kind of wax', 'a bee\'s wing'] },
        { q: 'Why do bees fan the nectar?', a: 'to dry the water out', wrong: ['to keep it cold', 'to make it smell nice'] },
        { q: 'How much honey does one bee make in its life?', a: 'a tiny drop', wrong: ['a full jar', 'a whole hive'] }
      ]
    },
    {
      title: 'The Silent Library', emoji: '📚',
      text: 'Marcus thought the library was boring until the day he found the map. It was tucked inside an old book about volcanoes. The map showed the library itself, with a red X in the storytelling corner. Marcus dug through the cushion pile and found a small brass key. The librarian smiled. "You found it! That key opens the treasure box. The winner picks any book in the library to keep." Marcus chose the volcano book, of course.',
      qs: [
        { q: 'Where was the map hidden?', a: 'inside a book about volcanoes', wrong: ['under the front desk', 'in a cushion'] },
        { q: 'What did the key open?', a: 'the treasure box', wrong: ['the front door', 'a diary'] },
        { q: 'Which book did Marcus choose?', a: 'the volcano book', wrong: ['a joke book', 'a map book'] }
      ]
    }
  ],

  passages4: [
    {
      title: 'The Great Ice Storm', emoji: '🧊',
      text: 'When the ice storm hit, the power went out across the whole valley. Priya\'s family lit candles and pulled mattresses close to the wood stove. Outside, every branch was wrapped in glass-like ice that clicked and sparkled. For three days there was no school, no television, and no lights. They toasted bread on the stove, played endless card games, and told stories. When the power finally hummed back on, Priya was almost sorry. The house felt ordinary again.',
      qs: [
        { q: 'What is the main idea of this passage?', a: 'A family finds a cozy way through a power outage', wrong: ['Ice storms are dangerous to trees', 'Card games are fun to play'] },
        { q: 'Why was Priya almost sorry when the power returned?', a: 'The special cozy time was over', wrong: ['She hated television', 'She wanted more homework'] },
        { q: 'Which detail shows the storm was icy?', a: 'Branches were wrapped in glass-like ice', wrong: ['They played card games', 'They toasted bread'] }
      ]
    },
    {
      title: 'Octopus: The Ocean\'s Escape Artist', emoji: '🐙',
      text: 'An octopus has no bones at all, which means it can squeeze its whole body through a gap the size of a coin. Aquarium keepers tell stories of octopuses sliding out of their tanks at night, crossing the floor, and raiding the crab tank next door. Octopuses can also change colour in less than a second to match rocks, sand, or coral. Some scientists call them the smartest animals without a backbone. They can open jars, solve mazes, and even recognize the faces of the people who feed them.',
      qs: [
        { q: 'What is the main idea?', a: 'Octopuses are clever escape artists', wrong: ['Crabs live in tanks', 'Aquariums are fun to visit'] },
        { q: 'Why can an octopus fit through tiny gaps?', a: 'It has no bones', wrong: ['It is very small', 'It has eight arms'] },
        { q: 'Which is the best summary?', a: 'Octopuses are boneless, colour-changing problem solvers', wrong: ['Octopuses eat crabs at night', 'Scientists study mazes'] }
      ]
    },
    {
      title: 'The Tryout', emoji: '⚽',
      text: 'Jae had practised all summer for the soccer tryout, but when the whistle blew, his legs felt like wet noodles. He fumbled his first pass. He missed an easy shot. At the water break, Coach Ali crouched beside him. "Forget the last play," she said. "The next one is the only one that matters." Jae took a slow breath. In the final scrimmage he threaded a pass between two defenders that made the whole field go quiet. He made the team — not because he was perfect, but because he kept going.',
      qs: [
        { q: 'What lesson does this story teach?', a: 'Keep going after mistakes', wrong: ['Always practise in summer', 'Water breaks are important'] },
        { q: 'How did Jae feel at the start?', a: 'nervous', wrong: ['bored', 'angry'] },
        { q: 'What did Coach Ali tell him?', a: 'The next play is the only one that matters', wrong: ['Try a different sport', 'Watch the other players'] }
      ]
    },
    {
      title: 'The Rooftop Garden', emoji: '🌱',
      text: 'The apartment building had a flat grey roof that nobody used. Then Mrs. Okonkwo carried up one tomato plant in a bucket. By June, six neighbours had added planters of beans, mint, and marigolds. Kids raced up after school to water rows with names taped to them. The roof stayed grey, but nobody called it empty anymore. In August the whole building shared a salad that had grown four floors above the street.',
      qs: [
        { q: 'What is the main idea of this passage?', a: 'One small action grew into a shared garden', wrong: ['Roofs should always be grey', 'Tomatoes need buckets to grow'] },
        { q: 'Who started the garden?', a: 'Mrs. Okonkwo', wrong: ['the building manager', 'the kids'] },
        { q: 'Which detail shows the garden brought people together?', a: 'The whole building shared a salad', wrong: ['The roof was flat', 'The plant was in a bucket'] }
      ]
    },
    {
      title: 'Lighthouse Keepers', emoji: '🗼',
      text: 'Before machines took over, lighthouse keepers lived beside their lights all year. Every evening they climbed hundreds of stairs to light the great lamp, and every few hours all night they wound the clockwork that kept it turning. Storms were the busiest times: the worse the weather, the more the ships below needed the beam. Keepers kept logbooks of every passing vessel, every repair, and every rescue. It was lonely work, but a single lit lamp could save a hundred lives in one night.',
      qs: [
        { q: 'What is the main idea?', a: 'Lighthouse keeping was hard, important work', wrong: ['Storms happen mostly at night', 'Logbooks are fun to read'] },
        { q: 'Why were storms the busiest times?', a: 'Ships needed the light most in bad weather', wrong: ['The stairs were slippery', 'More visitors came'] },
        { q: 'What did keepers write in logbooks?', a: 'Ships, repairs, and rescues', wrong: ['Recipes and songs', 'Letters to family'] }
      ]
    }
  ],

  passages5: [
    {
      title: 'The New Kid\'s Lunch', emoji: '🥟',
      text: 'Nobody sat with Tomas at lunch on his first day. He unpacked his grandmother\'s pierogies slowly, feeling eyes on him. "What are those?" asked a boy across the table, wrinkling his nose. Tomas almost closed the lid. Instead, he slid one across. The boy chewed, paused, and pushed his own bag of chips toward Tomas without a word. By Friday, three kids were trading half their lunches for pierogies, and Tomas\'s grandmother was cooking double batches.',
      qs: [
        { q: 'What can you infer about the boy after he tasted the pierogi?', a: 'He liked it', wrong: ['He felt sick', 'He was still suspicious'] },
        { q: 'Why did Tomas almost close the lid?', a: 'He felt embarrassed', wrong: ['He was full', 'The food was cold'] },
        { q: 'What does the ending suggest?', a: 'Sharing food helped Tomas make friends', wrong: ['The cafeteria banned trading', 'Tomas stopped bringing lunch'] }
      ]
    },
    {
      title: 'Two Views of Rain', emoji: '🌧️',
      text: 'TEXT ONE: Rain hammered the tin roof like a thousand tiny drummers. Amira pressed her nose to the window and grinned. Puddle-jumping weather. TEXT TWO: The forecast calls for 40 millimetres of rain by evening. Drivers should slow down, and residents near the creek should move belongings to higher ground.',
      qs: [
        { q: 'How are the two texts different?', a: 'One is a story, one gives information', wrong: ['Both are poems', 'Both are warnings'] },
        { q: 'How does Amira feel about the rain?', a: 'excited', wrong: ['worried', 'angry'] },
        { q: 'Who is the second text written for?', a: 'people who need safety information', wrong: ['children who like puddles', 'tiny drummers'] }
      ]
    },
    {
      title: 'Letter to the Principal', emoji: '✉️',
      text: 'Dear Principal Okafor: Our school should start a tool-lending library. First, many families cannot afford hammers, saws, and drills for projects. Second, sharing tools teaches responsibility, because borrowers must return them in good shape. Finally, the woodworking room already has shelves standing empty. Some people say tools are too dangerous to lend, but bike helmets are lent out every day and no one complains. Please consider this idea. Sincerely, Division 5.',
      qs: [
        { q: 'What is the writer trying to do?', a: 'persuade the principal to start a tool library', wrong: ['tell a story about tools', 'explain how drills work'] },
        { q: 'Which is one of the writer\'s reasons?', a: 'Sharing tools teaches responsibility', wrong: ['Tools are expensive to buy for the school', 'Woodworking is a required class'] },
        { q: 'How does the writer answer people who say tools are dangerous?', a: 'By comparing them to lending helmets', wrong: ['By promising adult supervision', 'By ignoring them'] }
      ]
    },
    {
      title: 'The Substitute', emoji: '🧑‍🏫',
      text: 'The class had planned to swap seats and use fake names, the classic substitute-teacher trick. But Mr. Duval walked in, wrote nothing on the board, and instead asked, "Who can teach me something I don\'t know?" By lunch he had learned three karate stances, the rules of cricket, and how to say hello in Tagalog — and somehow, without anyone noticing, the whole math lesson had happened too.',
      qs: [
        { q: 'What can you infer about Mr. Duval?', a: 'He is clever at winning students over', wrong: ['He forgot to plan a lesson', 'He dislikes teaching math'] },
        { q: 'Why did the seat-swap trick never happen?', a: 'The students got interested in his question', wrong: ['The principal stopped it', 'The bell rang early'] },
        { q: 'What does "somehow the math lesson had happened" suggest?', a: 'He taught it without them realizing', wrong: ['Math was cancelled', 'The students taught it wrong'] }
      ]
    },
    {
      title: 'Two Reports on the Game', emoji: '🥅',
      text: 'TEXT ONE: Rovers 3, Wanderers 2. Kim scored twice; the winner came in the final minute on a penalty kick. Attendance was 412. TEXT TWO: With the rain driving sideways and one minute left, Kim placed the ball on the penalty spot, wiped her gloves on her shorts, and silenced four hundred umbrellas with a single strike into the top corner.',
      qs: [
        { q: 'How are the two texts different?', a: 'One reports facts, one tells it like a story', wrong: ['They describe different games', 'Both are interviews'] },
        { q: 'Which detail appears in BOTH texts?', a: 'Kim and the final-minute penalty', wrong: ['The rain and the gloves', 'The umbrellas'] },
        { q: 'Why might a writer choose the second style?', a: 'To make readers feel the moment', wrong: ['To list statistics quickly', 'To hide the final score'] }
      ]
    }
  ],

  passages6: [
    {
      title: 'The Clockmaker\'s Apprentice', emoji: '🕰️',
      text: 'Every clock in the shop told a different time, and old Mr. Voss refused to fix them. "A clock is honest about one thing only," he told his apprentice, Dina. "It tells you that time passes. The rest is decoration." Dina thought this was nonsense until the winter Mr. Voss fell ill. She kept the shop alone, winding each clock, and noticed she had stopped rushing. Customers lingered. Conversations stretched. When Mr. Voss returned, Dina had set every clock to a different time — on purpose.',
      qs: [
        { q: 'What is the theme of this story?', a: 'Time matters less than how you spend it', wrong: ['Clocks are difficult to repair', 'Apprentices should obey their masters'] },
        { q: 'Why did Dina set the clocks to different times at the end?', a: 'She came to understand Mr. Voss\'s view', wrong: ['She forgot how to set them', 'She wanted to trick customers'] },
        { q: 'What was the author\'s purpose?', a: 'to share an idea about time through a story', wrong: ['to teach clock repair', 'to advertise a shop'] }
      ]
    },
    {
      title: 'Wolves Change Rivers', emoji: '🐺',
      text: 'In 1995, scientists returned wolves to Yellowstone Park after seventy years. The results surprised everyone. With wolves hunting them, elk stopped grazing lazily along the riverbanks. Willows and aspens grew back. Songbirds returned to the new trees. Beavers used the branches to build dams, which created ponds for otters, ducks, and fish. The riverbanks, held firm by roots, stopped crumbling — the rivers themselves changed shape. Scientists call this ripple effect a trophic cascade: one species at the top reshaping an entire landscape.',
      qs: [
        { q: 'What is a trophic cascade, based on the text?', a: 'One species causing changes through a whole ecosystem', wrong: ['A waterfall in Yellowstone', 'A way wolves hunt elk'] },
        { q: 'Why did the willows grow back?', a: 'Elk stopped grazing at the riverbanks', wrong: ['Beavers planted them', 'Scientists watered them'] },
        { q: 'Which came directly from the beaver dams?', a: 'Ponds for otters, ducks, and fish', wrong: ['More wolves', 'Crumbling riverbanks'] }
      ]
    },
    {
      title: 'The Paper Crane Contest', emoji: '🪶',
      text: 'The rules said the winning crane would be the most beautiful, so Amir spent three weeks folding one from gold foil, each crease sharp as a blade. Sana entered a crumpled white crane folded on the bus that morning — but she had taught the whole grade to fold cranes at lunch all month, and behind her entry stood two hundred lopsided birds made by kids who had never folded anything before. The judges gave Sana the prize. Amir stared at the wall of crooked cranes for a long time, then asked her to teach him too.',
      qs: [
        { q: 'What is the theme of this story?', a: 'Sharing a craft matters more than perfecting it', wrong: ['Gold foil is hard to fold', 'Contests always have unfair judges'] },
        { q: 'Why did the judges choose Sana?', a: 'Her crane represented two hundred new folders', wrong: ['Her crane was the most beautiful', 'Amir broke the rules'] },
        { q: 'What does Amir\'s final request show?', a: 'He understood what made her entry win', wrong: ['He wanted to win her prize', 'He gave up on origami'] }
      ]
    }
  ],

  passages7: [
    {
      title: 'The Fence', emoji: '🪵',
      text: 'Grandfather built the fence the summer the neighbours moved in, hammering each post as if he had a grudge against the earth itself. He never said why. For years the two families passed each other in silence. It was the flood that ended it — water rising in both yards at midnight, and Mr. Okafor wading across, without being asked, to help carry Grandfather\'s tools to high ground. In the morning the fence leaned like a tired old man between the puddles. They tore it down together and split the boards for firewood, and neither of them ever explained a thing.',
      qs: [
        { q: 'From whose point of view is the story told?', a: 'a grandchild watching events', wrong: ['Mr. Okafor', 'Grandfather'] },
        { q: 'What does the fence most likely symbolize?', a: 'the coldness between the families', wrong: ['good carpentry', 'protection from floods'] },
        { q: 'What is the mood at the end of the story?', a: 'quiet reconciliation', wrong: ['rising suspense', 'bitter anger'] }
      ]
    },
    {
      title: 'Should Schools Ban Homework?', emoji: '🎒',
      text: 'Supporters of a homework ban point to studies showing that, before high school, homework adds little to test scores while cutting into sleep, play, and family time. Critics respond that homework builds habits of independent work that pay off later. Both sides, however, tend to argue about quantity when the real issue is quality. A worksheet of forty identical equations teaches persistence at best and resentment at worst. An assignment to interview a grandparent, measure a kitchen, or read a chosen book builds skill and curiosity. The question worth debating is not how much homework children get, but what kind.',
      qs: [
        { q: 'What is the author\'s central claim?', a: 'The kind of homework matters more than the amount', wrong: ['Homework should be banned everywhere', 'Students need more worksheets'] },
        { q: 'What evidence do ban supporters use?', a: 'Studies showing little gain before high school', wrong: ['Interviews with grandparents', 'Teacher salaries'] },
        { q: 'What is the author\'s tone?', a: 'reasoned and balanced', wrong: ['furious', 'mocking'] }
      ]
    },
    {
      title: 'The Last Ferry', emoji: '⛴️',
      text: 'The government report called the ferry "economically unviable": forty-one passengers a day, an aging hull, a route a bridge had made optional. What the report did not measure was Mrs. Achebe, who had sold tea on the top deck for thirty years and knew every commuter\'s order by heart; or the island students who did their homework together at the long back table every afternoon; or the way the whole harbour still paused, just slightly, when the horn sounded at six. Numbers can tell you what a thing costs. They are much worse at telling you what it is worth.',
      qs: [
        { q: 'What is the author\'s central point?', a: 'Some value cannot be captured by numbers', wrong: ['Bridges are better than ferries', 'Reports are always wrong'] },
        { q: 'Why does the author describe Mrs. Achebe and the students?', a: 'As evidence of the ferry\'s unmeasured worth', wrong: ['To show the ferry is crowded', 'To argue tea sales fund the route'] },
        { q: 'What is the tone of the final two sentences?', a: 'quietly pointed', wrong: ['cheerful', 'panicked'] }
      ]
    }
  ],

  vocab3: [
    { w: 'enormous', d: 'very, very big', wrong: ['very sleepy', 'very quiet'] },
    { w: 'rapid', d: 'very fast', wrong: ['very cold', 'very heavy'] },
    { w: 'fragile', d: 'easy to break', wrong: ['easy to eat', 'hard to see'] },
    { w: 'ancient', d: 'very old', wrong: ['very new', 'very loud'] },
    { w: 'brave', d: 'not afraid of danger', wrong: ['not very tall', 'not hungry'] },
    { w: 'gather', d: 'to collect together', wrong: ['to throw away', 'to fall asleep'] },
    { w: 'furious', d: 'very angry', wrong: ['very funny', 'very tiny'] },
    { w: 'damp', d: 'a little bit wet', wrong: ['a little bit loud', 'shiny and new'] },
    { w: 'vanish', d: 'to disappear', wrong: ['to grow bigger', 'to sing loudly'] },
    { w: 'observe', d: 'to watch carefully', wrong: ['to run quickly', 'to eat slowly'] }
  ],

  prefixes: [
    { affix: 'un-', word: 'unhappy', meaning: 'not happy', wrong: ['very happy', 'happy again'] },
    { affix: 're-', word: 'rebuild', meaning: 'build again', wrong: ['never build', 'build badly'] },
    { affix: 'pre-', word: 'preheat', meaning: 'heat before', wrong: ['heat after', 'never heat'] },
    { affix: 'dis-', word: 'disagree', meaning: 'not agree', wrong: ['agree strongly', 'agree again'] },
    { affix: '-ful', word: 'hopeful', meaning: 'full of hope', wrong: ['without hope', 'afraid of hope'] },
    { affix: '-less', word: 'fearless', meaning: 'without fear', wrong: ['full of fear', 'a little afraid'] },
    { affix: 'mis-', word: 'misplace', meaning: 'place wrongly', wrong: ['place carefully', 'place twice'] },
    { affix: '-er', word: 'painter', meaning: 'a person who paints', wrong: ['a kind of paint', 'to paint again'] }
  ],

  partsOfSpeech: [
    { w: 'river', t: 'noun' }, { w: 'mountain', t: 'noun' }, { w: 'teacher', t: 'noun' }, { w: 'bicycle', t: 'noun' },
    { w: 'library', t: 'noun' }, { w: 'thunder', t: 'noun' }, { w: 'garden', t: 'noun' }, { w: 'dragon', t: 'noun' },
    { w: 'jump', t: 'verb' }, { w: 'whisper', t: 'verb' }, { w: 'build', t: 'verb' }, { w: 'explore', t: 'verb' },
    { w: 'laugh', t: 'verb' }, { w: 'climb', t: 'verb' }, { w: 'paint', t: 'verb' }, { w: 'listen', t: 'verb' },
    { w: 'shiny', t: 'adjective' }, { w: 'gentle', t: 'adjective' }, { w: 'crooked', t: 'adjective' }, { w: 'silent', t: 'adjective' },
    { w: 'golden', t: 'adjective' }, { w: 'slippery', t: 'adjective' }, { w: 'curious', t: 'adjective' }, { w: 'stormy', t: 'adjective' }
  ],

  syllableWords: [
    { w: 'butterfly', n: 3 }, { w: 'elephant', n: 3 }, { w: 'window', n: 2 }, { w: 'crocodile', n: 3 },
    { w: 'rainbow', n: 2 }, { w: 'calculator', n: 4 }, { w: 'pumpkin', n: 2 }, { w: 'dinosaur', n: 3 },
    { w: 'watermelon', n: 4 }, { w: 'blanket', n: 2 }, { w: 'volcano', n: 3 }, { w: 'helicopter', n: 4 },
    { w: 'spider', n: 2 }, { w: 'tornado', n: 3 }, { w: 'caterpillar', n: 4 }, { w: 'basket', n: 2 }
  ],

  scrambleSentences: [
    ['The', 'dog', 'dug', 'a', 'deep', 'hole'],
    ['My', 'sister', 'paints', 'tiny', 'blue', 'birds'],
    ['We', 'rode', 'our', 'bikes', 'to', 'the', 'park'],
    ['The', 'moon', 'rose', 'over', 'the', 'hill'],
    ['A', 'spider', 'spun', 'a', 'silver', 'web'],
    ['Grandma', 'bakes', 'bread', 'every', 'Sunday'],
    ['The', 'boat', 'sailed', 'across', 'the', 'lake'],
    ['Rain', 'tapped', 'on', 'the', 'window']
  ],

  storyOrder: [
    { title: 'Making a sandwich', steps: ['Get two slices of bread', 'Spread the peanut butter', 'Put the slices together', 'Take a big bite'] },
    { title: 'Planting a seed', steps: ['Dig a small hole', 'Drop in the seed', 'Cover it with soil', 'Water it every day'] },
    { title: 'A trip to the pool', steps: ['Pack your swimsuit', 'Walk to the pool', 'Jump into the water', 'Dry off with a towel'] },
    { title: 'A birthday morning', steps: ['Wake up excited', 'Open the presents', 'Eat cake with friends', 'Say thank you to everyone'] },
    { title: 'Building a snowman', steps: ['Roll three big snowballs', 'Stack them up tall', 'Add a carrot nose', 'Put on a warm scarf'] }
  ],

  fixSentences: [
    { broken: 'the cat is soft', fixed: 'The cat is soft.', issue: 'It needs a capital letter and a period.' },
    { broken: 'my name is maya', fixed: 'My name is Maya.', issue: 'Names and the first word need capital letters, and it needs a period.' },
    { broken: 'we go to the park', fixed: 'We go to the park.', issue: 'It needs a capital letter and a period.' },
    { broken: 'the sun is hot', fixed: 'The sun is hot.', issue: 'It needs a capital letter and a period.' },
    { broken: 'i like red apples', fixed: 'I like red apples.', issue: 'The word I is always a capital, and it needs a period.' }
  ],

  endPunctuation: [
    { s: 'What time is it', mark: '?', why: 'It asks a question.' },
    { s: 'The frog jumped into the pond', mark: '.', why: 'It tells something.' },
    { s: 'Where did you put my boots', mark: '?', why: 'It asks a question.' },
    { s: 'Watch out for that wave', mark: '!', why: 'It shows strong feeling.' },
    { s: 'My brother collects rocks', mark: '.', why: 'It tells something.' },
    { s: 'Who ate the last cookie', mark: '?', why: 'It asks a question.' },
    { s: 'We won the game', mark: '!', why: 'It shows excitement.' },
    { s: 'The library opens at nine', mark: '.', why: 'It tells something.' },
    { s: 'How do birds find their way home', mark: '?', why: 'It asks a question.' }
  ],

  dialoguePunct: [
    { correct: '"Let\'s build a fort," said Emma.', wrong: ['Let\'s build a fort, said Emma.', '"Let\'s build a fort said Emma."'] },
    { correct: 'Sam shouted, "The bus is here!"', wrong: ['Sam shouted, the bus is here!', 'Sam shouted "The bus is here!'] },
    { correct: '"Where is my helmet?" asked Theo.', wrong: ['"Where is my helmet? asked Theo."', 'Where is my helmet? "asked Theo."'] },
    { correct: '"This soup is too hot," warned Dad.', wrong: ['"This soup is too hot warned Dad."', 'This soup is too hot, "warned Dad".'] },
    { correct: '"Race you to the corner!" yelled Priya.', wrong: ['"Race you to the corner yelled Priya!"', 'Race you to the corner! "yelled Priya."'] },
    { correct: 'Grandpa whispered, "The fish can hear you."', wrong: ['Grandpa whispered, the fish can hear you.', 'Grandpa "whispered, The fish can hear you."'] }
  ],

  figurative: [
    { s: 'Her smile was as bright as the sun.', type: 'simile', why: 'It compares using the word "as".' },
    { s: 'The classroom was a zoo.', type: 'metaphor', why: 'It says one thing IS another.' },
    { s: 'He ran like the wind.', type: 'simile', why: 'It compares using the word "like".' },
    { s: 'The moon was a silver coin in the sky.', type: 'metaphor', why: 'It says the moon IS a coin.' },
    { s: 'Her hands were as cold as ice.', type: 'simile', why: 'It compares using "as".' },
    { s: 'Time is a thief.', type: 'metaphor', why: 'It says time IS a thief.' },
    { s: 'The lake was a mirror.', type: 'metaphor', why: 'It says the lake IS a mirror.' },
    { s: 'She swims like a dolphin.', type: 'simile', why: 'It compares using "like".' }
  ],

  editErrors: [
    { s: 'The dogs is barking loudly.', fix: 'The dogs are barking loudly.', spot: 'is', why: '"Dogs" is plural, so it needs "are".' },
    { s: 'me and Sam went fishing.', fix: 'Sam and I went fishing.', spot: 'me and Sam', why: 'Use "Sam and I" as the subject.' },
    { s: 'She dont like spinach.', fix: 'She doesn\'t like spinach.', spot: 'dont', why: '"Doesn\'t" needs an apostrophe and matches "she".' },
    { s: 'We seen a moose yesterday.', fix: 'We saw a moose yesterday.', spot: 'seen', why: 'The past tense of "see" is "saw".' },
    { s: 'Their going to the beach.', fix: 'They\'re going to the beach.', spot: 'Their', why: '"They\'re" means "they are".' },
    { s: 'The childs lost there mittens.', fix: 'The children lost their mittens.', spot: 'childs / there', why: '"Children" is the plural, and "their" shows belonging.' },
    { s: 'Him and I builded a fort.', fix: 'He and I built a fort.', spot: 'Him / builded', why: 'Use "He" as a subject, and the past tense of "build" is "built".' },
    { s: 'Theres to many rules at this pool.', fix: 'There are too many rules at this pool.', spot: 'Theres / to', why: '"There are" fits the plural "rules", and "too" means more than enough.' }
  ],

  homophones: [
    { pair: ['their', 'there', 'they\'re'], s: 'The players grabbed ___ water bottles.', a: 'their', why: '"Their" shows the bottles belong to the players.' },
    { pair: ['their', 'there', 'they\'re'], s: 'Put the boxes over ___.', a: 'there', why: '"There" tells a place.' },
    { pair: ['their', 'there', 'they\'re'], s: '___ coming to the party at six.', a: 'They\'re', why: '"They\'re" means "they are".' },
    { pair: ['to', 'two', 'too'], s: 'Can I come ___?', a: 'too', why: '"Too" means "also".' },
    { pair: ['to', 'two', 'too'], s: 'She has ___ pet turtles.', a: 'two', why: '"Two" is the number 2.' },
    { pair: ['your', 'you\'re'], s: '___ bike is in the shed.', a: 'Your', why: '"Your" shows the bike belongs to you.' },
    { pair: ['your', 'you\'re'], s: '___ my best friend.', a: 'You\'re', why: '"You\'re" means "you are".' },
    { pair: ['its', 'it\'s'], s: 'The bird flapped ___ wings.', a: 'its', why: '"Its" shows the wings belong to the bird.' },
    { pair: ['its', 'it\'s'], s: '___ starting to snow!', a: 'It\'s', why: '"It\'s" means "it is".' },
    { pair: ['hear', 'here'], s: 'Did you ___ that owl?', a: 'hear', why: 'You hear with your ear.' }
  ],

  toneMood: [
    { s: 'The floorboards creaked. Somewhere below, a door clicked shut — but Nadia lived alone.', a: 'suspenseful', wrong: ['cheerful', 'silly'] },
    { s: 'Confetti rained down as the whole town cheered and the band played louder and louder.', a: 'joyful', wrong: ['gloomy', 'tense'] },
    { s: 'The old dog watched the empty road every afternoon, ears lifting at every distant car.', a: 'wistful and sad', wrong: ['funny', 'furious'] },
    { s: 'One sock. Every single dryer load, exactly one sock vanished. Devon suspected the cat was building something.', a: 'humorous', wrong: ['terrifying', 'sorrowful'] },
    { s: 'The mountain had taken three climbers this season, and the wind was rising again.', a: 'ominous', wrong: ['playful', 'cozy'] },
    { s: 'The kettle whistled, the cat claimed the warmest blanket, and snow drew slow curtains across the window.', a: 'cozy and calm', wrong: ['terrifying', 'furious'] },
    { s: 'Ninety-nine steps down, one candle left, and the map ended at a door no one had drawn.', a: 'mysterious', wrong: ['cheerful', 'bored'] },
    { s: 'She read the acceptance letter four times, then once more out loud, then screamed into a pillow with joy.', a: 'excited', wrong: ['gloomy', 'ominous'] }
  ],

  pointOfView: [
    { s: 'I tightened my helmet and stared down the ramp. My heart was a drum.', a: 'first person', wrong: ['third person', 'second person'] },
    { s: 'Kira tightened her helmet and stared down the ramp. Her heart pounded.', a: 'third person', wrong: ['first person', 'second person'] },
    { s: 'You tighten your helmet and stare down the ramp. Your move.', a: 'second person', wrong: ['first person', 'third person'] },
    { s: 'We packed our tents before sunrise and none of us said a word.', a: 'first person', wrong: ['third person', 'second person'] },
    { s: 'The twins argued all morning, though neither could remember why.', a: 'third person', wrong: ['first person', 'second person'] },
    { s: 'My brother says I snore, but I have never once heard it.', a: 'first person', wrong: ['third person', 'second person'] },
    { s: 'Nadia counted her savings twice, and both times it was not enough.', a: 'third person', wrong: ['first person', 'second person'] },
    { s: 'You open the old book, and the smell of dust and secrets rises to meet you.', a: 'second person', wrong: ['first person', 'third person'] }
  ],

  argumentEvidence: [
    { claim: 'Our school should plant a vegetable garden.', good: 'Schools with gardens report students eat 26% more vegetables.', bad: 'Vegetables are green and gardens are outside.' },
    { claim: 'Kids should learn to code.', good: 'Coding jobs are growing three times faster than other jobs.', bad: 'Computers have keyboards and screens.' },
    { claim: 'The city needs more bike lanes.', good: 'Streets with bike lanes have 40% fewer accidents.', bad: 'Bikes come in many colours.' },
    { claim: 'Recess should be longer.', good: 'Studies show students focus better after outdoor play.', bad: 'Some students like the slide.' },
    { claim: 'Our town should build a library branch.', good: 'The nearest library is an hour away by bus.', bad: 'Libraries contain books on shelves.' },
    { claim: 'School should start later in the morning.', good: 'Teens who start school later average 45 more minutes of sleep and better grades.', bad: 'Mornings come before afternoons.' },
    { claim: 'Our cafeteria should compost food waste.', good: 'The cafeteria throws away 40 kilograms of food scraps every day.', bad: 'Compost is brown and dirt is also brown.' }
  ],

  themeStories: [
    { s: 'The tortoise plodded on while the hare napped under a tree. The tortoise crossed the finish line first.', a: 'Slow and steady wins the race', wrong: ['Naps are important', 'Tortoises are faster than hares'] },
    { s: 'The tiny mouse freed the mighty lion by chewing through the hunter\'s net.', a: 'Even the small can help the strong', wrong: ['Lions should avoid nets', 'Mice have sharp teeth'] },
    { s: 'The boy cried wolf as a joke twice. When the real wolf came, no one believed him.', a: 'Liars are not believed even when truthful', wrong: ['Wolves are dangerous', 'Shepherds need helpers'] },
    { s: 'Each stick snapped easily alone, but the bundle of sticks could not be broken.', a: 'There is strength in working together', wrong: ['Sticks are weak', 'Bundles are heavy'] },
    { s: 'The crow dropped pebbles into the tall jug, one by one, until the water rose high enough to drink.', a: 'Patience and cleverness solve hard problems', wrong: ['Crows prefer pebbles to food', 'Jugs should be kept full'] },
    { s: 'The ant stored food all summer while the grasshopper played. When winter came, only one of them was ready.', a: 'Prepare today for what tomorrow brings', wrong: ['Summer is better than winter', 'Grasshoppers cannot store food'] }
  ],

  authorsPurpose: [
    { s: 'Mix two cups of flour with one egg. Stir until smooth. Cook on a hot pan for two minutes per side.', a: 'to instruct', wrong: ['to entertain', 'to persuade'] },
    { s: 'Vote for Lin for class president — she listens, she works hard, and she gets things done!', a: 'to persuade', wrong: ['to instruct', 'to inform'] },
    { s: 'The three-toed sloth moves so slowly that algae grows in its fur, turning it slightly green.', a: 'to inform', wrong: ['to persuade', 'to entertain'] },
    { s: 'The dragon sneezed, and the knight\'s marshmallow was toasted perfectly. "Again!" laughed the knight.', a: 'to entertain', wrong: ['to inform', 'to instruct'] },
    { s: 'Hold the racket loosely, step toward the net, and swing low to high in one smooth motion.', a: 'to instruct', wrong: ['to entertain', 'to persuade'] },
    { s: 'A single reusable bottle keeps hundreds of plastic ones out of the landfill — bring yours tomorrow.', a: 'to persuade', wrong: ['to instruct', 'to inform'] },
    { s: 'The narwhal\'s tusk is actually a tooth that can grow three metres long and sense changes in the water.', a: 'to inform', wrong: ['to persuade', 'to entertain'] }
  ],

  complexSentences: [
    { parts: ['The game was cancelled', 'it rained all morning'], joined: 'The game was cancelled because it rained all morning.', conj: 'because' },
    { parts: ['We packed umbrellas', 'the sky looked dark'], joined: 'We packed umbrellas since the sky looked dark.', conj: 'since' },
    { parts: ['She kept practising', 'the piece was difficult'], joined: 'She kept practising although the piece was difficult.', conj: 'although' },
    { parts: ['Finish your project', 'the bell rings'], joined: 'Finish your project before the bell rings.', conj: 'before' },
    { parts: ['The crowd cheered', 'the runners crossed the line'], joined: 'The crowd cheered when the runners crossed the line.', conj: 'when' }
  ],

  revision7: [
    {
      draft: 'The beach was nice. We did stuff. It was fun.',
      best: 'Waves hissed over our toes as we hunted for sand dollars along the glittering beach.',
      wrong: ['The beach was very nice. We did fun stuff there.', 'Nice was the beach. Stuff we did. Fun it was.']
    },
    {
      draft: 'The storm was big. It was loud. Things got wet.',
      best: 'Thunder rattled the windows while rain flooded the gutters and drummed against the roof.',
      wrong: ['The storm was really big and really loud and wet.', 'Big storm. Loud. Wet things everywhere.']
    },
    {
      draft: 'My dog is good. He does tricks. People like him.',
      best: 'My dog Biscuit bows, rolls over, and high-fives strangers until the whole park adores him.',
      wrong: ['My dog is very good and does some tricks people like.', 'Good is my dog. Tricks he does.']
    },
    {
      draft: 'Lunch was bad. The line was long. I was mad.',
      best: 'After twenty minutes in the snaking cafeteria line, my reward was a sandwich frozen solid in the middle.',
      wrong: ['Lunch was really bad and the line was really long.', 'Bad lunch. Long line. Mad me.']
    },
    {
      draft: 'The hike was hard. We got tired. The view was good.',
      best: 'Our legs burned on the last switchback, but the whole silver lake opening below us made every step worth it.',
      wrong: ['The hike was very hard and we got very tired.', 'Hard hike. Tired us. Good view though.']
    },
    {
      draft: 'My grandma is nice. She cooks food. I like visiting.',
      best: 'My grandma hums while her dumplings steam up the kitchen windows, and I never want to leave.',
      wrong: ['My grandma is really nice and cooks really good food.', 'Nice grandma. Food cooked. Visits liked.']
    }
  ],

  listenStories: [
    { text: 'A little boat sailed on the big blue sea. It carried three oranges and one sleepy cat.', q: 'What was on the boat?', choices: [{ e: '🍊🐱', label: 'oranges and a cat', correct: true }, { e: '🍌🐶', label: 'bananas and a dog', correct: false }, { e: '📚🐸', label: 'books and a frog', correct: false }] },
    { text: 'The red bird built a nest on the tall lamp post. Every morning it sang to the bakery below.', q: 'Where did the bird build its nest?', choices: [{ e: '🏮', label: 'on a lamp post', correct: true }, { e: '🌳', label: 'in a tree', correct: false }, { e: '🏠', label: 'on a house', correct: false }] },
    { text: 'Milo found a green umbrella in the park. He used it as a boat for his toy ducks.', q: 'What did Milo find?', choices: [{ e: '☂️', label: 'an umbrella', correct: true }, { e: '⚽', label: 'a ball', correct: false }, { e: '🥾', label: 'a boot', correct: false }] },
    { text: 'Grandma\'s soup had seven carrots, two potatoes, and one very surprising banana.', q: 'What was surprising in the soup?', choices: [{ e: '🍌', label: 'a banana', correct: true }, { e: '🥕', label: 'a carrot', correct: false }, { e: '🥔', label: 'a potato', correct: false }] },
    { text: 'The turtle raced the snail. It was the slowest race ever. They both won a golden leaf.', q: 'What prize did they win?', choices: [{ e: '🍂', label: 'a golden leaf', correct: true }, { e: '🏆', label: 'a big trophy', correct: false }, { e: '🍰', label: 'a cake', correct: false }] }
  ],

  inference5: [
    { s: 'Maya\'s boots were soaked, her umbrella was inside-out, and her hair dripped on the doormat.', q: 'What can you infer?', a: 'She was caught in a rainstorm', wrong: ['She went swimming at the pool', 'She just woke up'] },
    { s: 'The crowd went silent. Aiden stared at the last puzzle piece — it did not fit anywhere.', q: 'What can you infer?', a: 'Something is wrong with the puzzle', wrong: ['Aiden finished the puzzle', 'The crowd went home'] },
    { s: 'Crumbs led from the kitchen to Theo\'s door, and chocolate smudged the doorknob.', q: 'What can you infer?', a: 'Theo took a snack to his room', wrong: ['Theo cleaned the kitchen', 'Someone baked bread'] },
    { s: 'The vet smiled and said, "You can put away the cone of shame tonight."', q: 'What can you infer?', a: 'The pet has healed', wrong: ['The pet is getting sicker', 'The vet is closing'] },
    { s: 'Every seat was packed, and people stood in the aisles holding signs with her name.', q: 'What can you infer?', a: 'She is popular and supported', wrong: ['The room was empty', 'People forgot her name'] },
    { s: 'Dad kept checking his watch, then the driveway, then his watch again, and dinner sat untouched.', q: 'What can you infer?', a: 'He is worried someone is late', wrong: ['He is not hungry today', 'His watch is broken'] },
    { s: 'The librarian pointed at the tower of returned books, sighed, and reached for a third cup of coffee.', q: 'What can you infer?', a: 'She has a long, tiring day of work ahead', wrong: ['She dislikes reading', 'The library is closing forever'] },
    { s: 'Zoe hid the muddy soccer cleats behind the door and walked to her room in her socks, very slowly and very quietly.', q: 'What can you infer?', a: 'She does not want anyone to see the mess', wrong: ['Her feet are cold', 'She lost the soccer game'] }
  ],

  persuadeVsInform: [
    { s: 'The maple is Canada\'s most common street tree.', a: 'informing', wrong: ['persuading'] },
    { s: 'You simply must try Rosie\'s pizza — you will never eat anywhere else again!', a: 'persuading', wrong: ['informing'] },
    { s: 'Frogs absorb water through their skin instead of drinking.', a: 'informing', wrong: ['persuading'] },
    { s: 'Everyone who cares about our park should come to the Saturday cleanup.', a: 'persuading', wrong: ['informing'] },
    { s: 'The ferry crosses the strait six times a day.', a: 'informing', wrong: ['persuading'] },
    { s: 'Don\'t waste another weekend — join the swim club today!', a: 'persuading', wrong: ['informing'] }
  ],

  nonfictionFacts: [
    { topic: 'Glaciers', text: 'A glacier is a river of ice that moves a few centimetres a day. As glaciers slide, they carve valleys and drop boulders far from home. Most of the world\'s fresh water is frozen inside them.', q: 'What do glaciers do as they move?', a: 'carve valleys and drop boulders', wrong: ['melt instantly', 'flow uphill'] },
    { topic: 'The Octopus Heart', text: 'An octopus has three hearts. Two pump blood to the gills, and one pumps blood to the rest of the body. When an octopus swims, the main heart stops — which is why octopuses prefer crawling.', q: 'Why do octopuses prefer crawling?', a: 'Their main heart stops when they swim', wrong: ['They cannot see while swimming', 'Crawling is faster'] },
    { topic: 'Desert Nights', text: 'Deserts are famous for heat, but at night they can drop below freezing. Sand does not hold warmth, so the day\'s heat escapes quickly once the sun sets.', q: 'Why do deserts get cold at night?', a: 'Sand does not hold warmth', wrong: ['The sun never shines there', 'Deserts are near the poles'] },
    { topic: 'Honeybee Dance', text: 'When a honeybee finds flowers, it returns to the hive and does a waggle dance. The angle of the dance points toward the flowers, and the length of the waggle tells the distance.', q: 'What does the waggle dance share?', a: 'the direction and distance of flowers', wrong: ['the taste of the honey', 'the age of the bee'] }
  ],

  essayStructure: [
    {
      thesis: 'Dogs make excellent helpers for people.',
      parts: ['Guide dogs lead people who cannot see.', 'Rescue dogs find people lost in the snow.', 'Therapy dogs calm patients in hospitals.'],
      off: 'Cats sleep sixteen hours a day.'
    },
    {
      thesis: 'Rivers shaped where cities were built.',
      parts: ['Rivers gave settlers drinking water.', 'Boats carried goods along rivers for trade.', 'River mud made rich soil for farms.'],
      off: 'Some rivers contain trout and salmon.'
    },
    {
      thesis: 'Learning an instrument builds more than musical skill.',
      parts: ['Daily practice teaches patience.', 'Reading music strengthens memory.', 'Playing in a band builds teamwork.'],
      off: 'Guitars usually have six strings.'
    }
  ],

  avatarNames: ['Pip', 'Nova', 'Ember', 'Juniper', 'Koda', 'Luna', 'Sage', 'Wren']
};
