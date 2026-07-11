// ============================================================
// Learnverse curriculum content — Kindergarten through Grade 7
// This file is data only. The app engine lives in app.js.
// ============================================================

const CONTENT = {

  // ---- Kindergarten: the alphabet, in a phonics-friendly order ----
  letters: [
    { ch:'s', word:'sun',    emoji:'☀️' },
    { ch:'a', word:'apple',  emoji:'🍎' },
    { ch:'t', word:'tiger',  emoji:'🐯' },
    { ch:'p', word:'pig',    emoji:'🐷' },
    { ch:'i', word:'igloo',  emoji:'🏠' },
    { ch:'n', word:'nest',   emoji:'🪺' },
    { ch:'m', word:'moon',   emoji:'🌙' },
    { ch:'d', word:'dog',    emoji:'🐶' },
    { ch:'g', word:'goat',   emoji:'🐐' },
    { ch:'o', word:'octopus',emoji:'🐙' },
    { ch:'c', word:'cat',    emoji:'🐱' },
    { ch:'k', word:'kite',   emoji:'🪁' },
    { ch:'e', word:'egg',    emoji:'🥚' },
    { ch:'u', word:'umbrella',emoji:'☂️' },
    { ch:'r', word:'rainbow',emoji:'🌈' },
    { ch:'h', word:'hat',    emoji:'🎩' },
    { ch:'b', word:'ball',   emoji:'⚽' },
    { ch:'f', word:'fish',   emoji:'🐟' },
    { ch:'l', word:'lion',   emoji:'🦁' },
    { ch:'j', word:'jam',    emoji:'🍓' },
    { ch:'v', word:'violin', emoji:'🎻' },
    { ch:'w', word:'whale',  emoji:'🐳' },
    { ch:'x', word:'x-ray',  emoji:'🦴' },
    { ch:'y', word:'yo-yo',  emoji:'🪀' },
    { ch:'z', word:'zebra',  emoji:'🦓' },
    { ch:'q', word:'queen',  emoji:'👑' },
  ],

  // ---- Grade 1: build simple words from letters ----
  buildWords: [
    { w:'sat', emoji:'🐕' }, { w:'cat', emoji:'🐱' }, { w:'sun', emoji:'☀️' },
    { w:'pig', emoji:'🐷' }, { w:'hat', emoji:'🎩' }, { w:'dog', emoji:'🐶' },
    { w:'pan', emoji:'🍳' }, { w:'pin', emoji:'📌' }, { w:'tap', emoji:'🚰' },
    { w:'sip', emoji:'🥤' }, { w:'nap', emoji:'😴' }, { w:'map', emoji:'🗺️' },
    { w:'bed', emoji:'🛏️' }, { w:'cup', emoji:'☕' }, { w:'bus', emoji:'🚌' },
    { w:'fox', emoji:'🦊' }, { w:'hen', emoji:'🐔' }, { w:'net', emoji:'🥅' },
    { w:'pen', emoji:'🖊️' }, { w:'six', emoji:'6️⃣' }, { w:'van', emoji:'🚐' },
    { w:'web', emoji:'🕸️' }, { w:'ten', emoji:'🔟' }, { w:'jet', emoji:'✈️' },
  ],

  // ---- Grades 1-2: sight words (most common words, learned by sight) ----
  sightWords: {
    1: ['the','and','a','to','in','is','you','it','he','was','for','on','are','as','with','his','they','I','at','be'],
    2: ['this','have','from','or','one','had','by','word','but','not','what','all','were','we','when','your','can','said','there','use'],
    3: ['each','which','she','do','how','their','if','will','up','other','about','out','many','then','them','these','so','some','her','would'],
  },

  // ---- Picture match: hear a word, pick the right picture (K-1) ----
  pictureWords: [
    { w:'cat', emoji:'🐱' }, { w:'dog', emoji:'🐶' }, { w:'sun', emoji:'☀️' },
    { w:'fish', emoji:'🐟' }, { w:'ball', emoji:'⚽' }, { w:'apple', emoji:'🍎' },
    { w:'moon', emoji:'🌙' }, { w:'star', emoji:'⭐' }, { w:'tree', emoji:'🌳' },
    { w:'car', emoji:'🚗' }, { w:'house', emoji:'🏠' }, { w:'bird', emoji:'🐦' },
    { w:'frog', emoji:'🐸' }, { w:'cake', emoji:'🎂' }, { w:'rain', emoji:'🌧️' },
    { w:'snow', emoji:'❄️' }, { w:'boat', emoji:'⛵' }, { w:'bee', emoji:'🐝' },
  ],

  // ---- Grades 2-7: spelling lists, easiest to hardest ----
  spelling: {
    2: ['jump','play','stop','fast','hand','ship','fish','ring','duck','frog','swim','clap'],
    3: ['plant','smile','black','train','sleep','bring','shout','cloud','story','happy','light','water'],
    4: ['because','friend','school','people','animal','family','picture','together','morning','different'],
    5: ['beautiful','important','question','sentence','remember','probably','surprise','favorite','vacation','decision'],
    6: ['necessary','environment','experience','government','temperature','immediately','curious','ancient','courage','achieve'],
    7: ['restaurant', 'definitely','embarrass','conscience','rhythm','privilege','occasionally','recommend','separate','tomorrow'],
  },

  // ---- Grades 3-7: vocabulary — hear the meaning, pick the word ----
  vocab: {
    3: [
      { word:'enormous',  def:'something really, really big',            wrong:['tiny','sleepy'] },
      { word:'whisper',   def:'to talk in a very quiet voice',           wrong:['shout','jump'] },
      { word:'gigantic',  def:'huge, like a dinosaur',                   wrong:['little','soft'] },
      { word:'furious',   def:'very, very angry',                        wrong:['happy','hungry'] },
      { word:'brave',     def:'not afraid, even when something is scary',wrong:['scared','tired'] },
      { word:'silent',    def:'making no sound at all',                  wrong:['loud','fast'] },
    ],
    4: [
      { word:'curious',   def:'wanting to learn about everything',       wrong:['bored','angry'] },
      { word:'exhausted', def:'so tired you can barely move',            wrong:['excited','strong'] },
      { word:'fragile',   def:'easy to break, like glass',               wrong:['strong','heavy'] },
      { word:'ancient',   def:'very, very old — from long, long ago',    wrong:['new','shiny'] },
      { word:'rapid',     def:'very fast',                               wrong:['slow','quiet'] },
      { word:'generous',  def:'happy to share and give to others',       wrong:['selfish','sleepy'] },
    ],
    5: [
      { word:'reluctant', def:'not really wanting to do something',      wrong:['eager','joyful'] },
      { word:'abundant',  def:'having lots and lots of something',       wrong:['empty','rare'] },
      { word:'observe',   def:'to watch something very carefully',       wrong:['ignore','forget'] },
      { word:'predict',   def:'to guess what will happen next',          wrong:['remember','erase'] },
      { word:'anxious',   def:'feeling worried or nervous',              wrong:['calm','proud'] },
      { word:'persuade',  def:'to talk someone into doing something',    wrong:['forbid','follow'] },
    ],
    6: [
      { word:'meticulous',def:'extremely careful about every tiny detail', wrong:['sloppy','careless'] },
      { word:'diligent',  def:'working hard and not giving up',            wrong:['lazy','messy'] },
      { word:'skeptical', def:'not sure you believe something',            wrong:['certain','gullible'] },
      { word:'versatile', def:'good at many different things',             wrong:['limited','stubborn'] },
      { word:'hostile',   def:'unfriendly and ready to fight',             wrong:['friendly','gentle'] },
      { word:'innovative',def:'full of brand new ideas',                   wrong:['ordinary','outdated'] },
    ],
    7: [
      { word:'ambiguous', def:'unclear — it could mean more than one thing', wrong:['obvious','definite'] },
      { word:'benevolent',def:'kind and wanting to help others',             wrong:['cruel','greedy'] },
      { word:'candid',    def:'totally honest and direct',                   wrong:['secretive','shy'] },
      { word:'diminish',  def:'to get smaller or weaker',                    wrong:['grow','expand'] },
      { word:'eloquent',  def:'amazingly good with words',                   wrong:['clumsy','silent'] },
      { word:'resilient', def:'able to bounce back after hard times',        wrong:['fragile','defeated'] },
    ],
  },

  // ---- Grades 1-4: little stories with a listen-then-answer question ----
  stories: [
    {
      level:1, text:['The','cat','sat','on','the','mat.'],
      q:'Where did the cat sit?', answer:'🧶', answerWord:'on the mat',
      options:[ {e:'🧶', label:'the mat'}, {e:'🛏️', label:'the bed'}, {e:'🚗', label:'the car'} ],
    },
    {
      level:1, text:['The','dog','ran','to','the','park.'],
      q:'Where did the dog run?', answer:'🌳', answerWord:'to the park',
      options:[ {e:'🏠', label:'home'}, {e:'🌳', label:'the park'}, {e:'🏫', label:'school'} ],
    },
    {
      level:2, text:['Sam','has','a','red','ball.','He','likes','to','play.'],
      q:'What color is the ball?', answer:'🔴', answerWord:'red',
      options:[ {e:'🔵', label:'blue'}, {e:'🟢', label:'green'}, {e:'🔴', label:'red'} ],
    },
    {
      level:2, text:['The','frog','jumps','into','the','pond.','Splash!'],
      q:'What did the frog jump into?', answer:'💧', answerWord:'the pond',
      options:[ {e:'💧', label:'the pond'}, {e:'📦', label:'a box'}, {e:'🛁', label:'a bathtub'} ],
    },
    {
      level:3, text:['Mia','planted','a','tiny','seed.','She','gave','it','water','every','day.','Soon','it','grew','into','a','tall','sunflower.'],
      q:'What did the seed grow into?', answer:'🌻', answerWord:'a sunflower',
      options:[ {e:'🌵', label:'a cactus'}, {e:'🌻', label:'a sunflower'}, {e:'🍄', label:'a mushroom'} ],
    },
    {
      level:3, text:['Leo','lost','his','tooth','at','school.','He','put','it','under','his','pillow','that','night.'],
      q:'Where did Leo put his tooth?', answer:'🛏️', answerWord:'under his pillow',
      options:[ {e:'🎒', label:'his backpack'}, {e:'🛏️', label:'under his pillow'}, {e:'🥛', label:'in a glass'} ],
    },
    {
      level:4, text:['The','little','boat','rocked','on','the','waves.','Dark','clouds','rolled','in,','so','the','captain','sailed','quickly','back','to','the','harbor.'],
      q:'Why did the captain sail back?', answer:'🌩️', answerWord:'because a storm was coming',
      options:[ {e:'🌩️', label:'a storm was coming'}, {e:'😴', label:'he was sleepy'}, {e:'🐟', label:'he caught a fish'} ],
    },
    {
      level:4, text:['Ava','practiced','piano','every','morning.','At','first','her','fingers','stumbled,','but','by','summer','she','could','play','her','favorite','song','perfectly.'],
      q:'How did Ava get so good at piano?', answer:'🔁', answerWord:'she practiced every day',
      options:[ {e:'🍀', label:'she got lucky'}, {e:'🔁', label:'she practiced every day'}, {e:'🎁', label:'someone gave her a gift'} ],
    },
  ],
};
