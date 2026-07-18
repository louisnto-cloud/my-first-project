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
    { w:'ship', emoji:'🚢' }, { w:'fish', emoji:'🐟' }, { w:'moon', emoji:'🌙' },
    { w:'star', emoji:'⭐' }, { w:'frog', emoji:'🐸' }, { w:'crab', emoji:'🦀' },
    { w:'drum', emoji:'🥁' }, { w:'flag', emoji:'🚩' }, { w:'swim', emoji:'🏊' },
    { w:'ring', emoji:'💍' }, { w:'king', emoji:'🤴' }, { w:'bath', emoji:'🛁' },
  ],

  // ---- K-2: rhyming — hear a word, find the one that rhymes ----
  rhymes: [
    { w:'cat', emoji:'🐱', match:{w:'hat', e:'🎩'}, wrong:[{w:'sun', e:'☀️'},{w:'fish', e:'🐟'}] },
    { w:'dog', emoji:'🐶', match:{w:'frog', e:'🐸'}, wrong:[{w:'car', e:'🚗'},{w:'bee', e:'🐝'}] },
    { w:'star', emoji:'⭐', match:{w:'car', e:'🚗'}, wrong:[{w:'cup', e:'☕'},{w:'pig', e:'🐷'}] },
    { w:'bee', emoji:'🐝', match:{w:'tree', e:'🌳'}, wrong:[{w:'hat', e:'🎩'},{w:'dog', e:'🐶'}] },
    { w:'cake', emoji:'🎂', match:{w:'snake', e:'🐍'}, wrong:[{w:'ball', e:'⚽'},{w:'moon', e:'🌙'}] },
    { w:'goat', emoji:'🐐', match:{w:'boat', e:'⛵'}, wrong:[{w:'sock', e:'🧦'},{w:'bed', e:'🛏️'}] },
    { w:'mouse', emoji:'🐭', match:{w:'house', e:'🏠'}, wrong:[{w:'fish', e:'🐟'},{w:'sun', e:'☀️'}] },
    { w:'bear', emoji:'🐻', match:{w:'chair', e:'🪑'}, wrong:[{w:'cake', e:'🎂'},{w:'bus', e:'🚌'}] },
    { w:'moon', emoji:'🌙', match:{w:'spoon', e:'🥄'}, wrong:[{w:'tree', e:'🌳'},{w:'crab', e:'🦀'}] },
    { w:'fox', emoji:'🦊', match:{w:'box', e:'📦'}, wrong:[{w:'star', e:'⭐'},{w:'pen', e:'🖊️'}] },
    { w:'whale', emoji:'🐳', match:{w:'snail', e:'🐌'}, wrong:[{w:'drum', e:'🥁'},{w:'egg', e:'🥚'}] },
    { w:'ring', emoji:'💍', match:{w:'king', e:'🤴'}, wrong:[{w:'boat', e:'⛵'},{w:'hat', e:'🎩'}] },
  ],

  // ---- Grades 2-5: build a sentence word by word ----
  sentences: [
    { level:2, words:['The','dog','can','run'] },
    { level:2, words:['I','see','a','big','cat'] },
    { level:2, words:['The','sun','is','hot'] },
    { level:3, words:['My','frog','jumps','very','high'] },
    { level:3, words:['She','reads','books','every','night'] },
    { level:3, words:['The','little','bird','sings','a','song'] },
    { level:4, words:['We','planted','flowers','in','the','garden'] },
    { level:4, words:['The','hungry','bear','looked','for','honey'] },
    { level:4, words:['My','best','friend','lives','next','door'] },
    { level:5, words:['The','curious','fox','explored','the','dark','forest'] },
    { level:5, words:['A','gentle','rain','fell','on','the','quiet','town'] },
    { level:5, words:['The','brave','knight','crossed','the','old','bridge'] },
  ],

  // ---- Grades 4-7: grammar, synonyms, antonyms, word parts ----
  grammar: {
    4: [
      { q:'Which word is a noun — a person, place, or thing?', opts:['apple','jump','happy'], a:'apple' },
      { q:'Which word is a verb — an action word?', opts:['swim','chair','blue'], a:'swim' },
      { q:'Which word is an adjective — a describing word?', opts:['fluffy','run','table'], a:'fluffy' },
      { q:'Which word is a noun — a person, place, or thing?', opts:['school','sing','loud'], a:'school' },
      { q:'Which word is a verb — an action word?', opts:['dance','pencil','green'], a:'dance' },
      { q:'Which word is an adjective — a describing word?', opts:['sparkly','book','shout'], a:'sparkly' },
    ],
    5: [
      { q:'Which word means the same as happy?', opts:['glad','angry','tiny'], a:'glad' },
      { q:'Which word means the same as big?', opts:['huge','fast','cold'], a:'huge' },
      { q:'Which word means the same as scared?', opts:['afraid','brave','sleepy'], a:'afraid' },
      { q:'Which word means the same as smart?', opts:['clever','messy','loud'], a:'clever' },
      { q:'Which word means the same as quick?', opts:['rapid','heavy','soft'], a:'rapid' },
      { q:'Which word means the same as quiet?', opts:['silent','bright','wet'], a:'silent' },
    ],
    6: [
      { q:'Which word is the opposite of ancient?', opts:['modern','old','broken'], a:'modern' },
      { q:'Which word is the opposite of expand?', opts:['shrink','grow','stretch'], a:'shrink' },
      { q:'Which word is the opposite of generous?', opts:['selfish','kind','giving'], a:'selfish' },
      { q:'Which word is the opposite of visible?', opts:['hidden','clear','shiny'], a:'hidden' },
      { q:'Which word is the opposite of victory?', opts:['defeat','winning','trophy'], a:'defeat' },
      { q:'Which word is the opposite of rough?', opts:['smooth','bumpy','hard'], a:'smooth' },
    ],
    7: [
      { q:'The prefix "un" means not. Which word means not able?', opts:['unable','united','under'], a:'unable' },
      { q:'The prefix "re" means again. Which word means to build again?', opts:['rebuild','remove','really'], a:'rebuild' },
      { q:'The prefix "pre" means before. Which word means to see before it happens?', opts:['predict','present','pretend'], a:'predict' },
      { q:'The suffix "less" means without. Which word means without fear?', opts:['fearless','fearful','feared'], a:'fearless' },
      { q:'The suffix "ful" means full of. Which word means full of joy?', opts:['joyful','joyless','enjoy'], a:'joyful' },
      { q:'The prefix "mis" means wrongly. Which word means to spell wrongly?', opts:['misspell','missile','mister'], a:'misspell' },
    ],
  },

  // ---- Grades 1-2: sight words (most common words, learned by sight) ----
  sightWords: {
    1: ['the','and','a','to','in','is','you','it','he','was','for','on','are','as','with','his','they','I','at','be'],
    2: ['this','have','from','or','one','had','by','word','but','not','what','all','were','we','when','your','can','said','there','use'],
    3: ['each','which','she','do','how','their','if','will','up','other','about','out','many','then','them','these','so','some','her','would'],
    4: ['make','like','him','into','time','has','look','two','more','write','go','see','number','no','way','could','people','my','than','first'],
    5: ['water','been','call','who','oil','now','find','long','down','day','did','get','come','made','may','part','over','new','sound','take'],
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
    2: ['jump','play','stop','fast','hand','ship','fish','ring','duck','frog','swim','clap','wish','lunch','sock','tent','wind','milk'],
    3: ['plant','smile','black','train','sleep','bring','shout','cloud','story','happy','light','water','night','round','small','paint','sweet','grass'],
    4: ['because','friend','school','people','animal','family','picture','together','morning','different','enough','thought','carry','early','heard','world'],
    5: ['beautiful','important','question','sentence','remember','probably','surprise','favorite','vacation','decision','knowledge','language','strength','measure','breathe','weight'],
    6: ['necessary','environment','experience','government','temperature','immediately','curious','ancient','courage','achieve','argument','athletic','calendar','definite','disappear','fascinate'],
    7: ['restaurant','definitely','embarrass','conscience','rhythm','privilege','occasionally','recommend','separate','tomorrow','acquaintance','bureaucracy','conscientious','maintenance','pronunciation','questionnaire'],
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
      { word:'soggy',     def:'all wet and squishy',                     wrong:['dry','crispy'] },
      { word:'grumpy',    def:'in a bad mood',                           wrong:['cheerful','calm'] },
      { word:'speedy',    def:'super fast',                              wrong:['slow','still'] },
      { word:'sparkle',   def:'to shine with little flashes of light',   wrong:['hide','melt'] },
    ],
    4: [
      { word:'curious',   def:'wanting to learn about everything',       wrong:['bored','angry'] },
      { word:'exhausted', def:'so tired you can barely move',            wrong:['excited','strong'] },
      { word:'fragile',   def:'easy to break, like glass',               wrong:['strong','heavy'] },
      { word:'ancient',   def:'very, very old — from long, long ago',    wrong:['new','shiny'] },
      { word:'rapid',     def:'very fast',                               wrong:['slow','quiet'] },
      { word:'generous',  def:'happy to share and give to others',       wrong:['selfish','sleepy'] },
      { word:'gleaming',  def:'shining bright, like polished gold',      wrong:['rusty','dusty'] },
      { word:'timid',     def:'shy and a little bit scared',             wrong:['bold','loud'] },
      { word:'clever',    def:'quick at figuring things out',            wrong:['confused','slow'] },
      { word:'drowsy',    def:'sleepy and about to nod off',             wrong:['awake','jumpy'] },
    ],
    5: [
      { word:'reluctant', def:'not really wanting to do something',      wrong:['eager','joyful'] },
      { word:'abundant',  def:'having lots and lots of something',       wrong:['empty','rare'] },
      { word:'observe',   def:'to watch something very carefully',       wrong:['ignore','forget'] },
      { word:'predict',   def:'to guess what will happen next',          wrong:['remember','erase'] },
      { word:'anxious',   def:'feeling worried or nervous',              wrong:['calm','proud'] },
      { word:'persuade',  def:'to talk someone into doing something',    wrong:['forbid','follow'] },
      { word:'hilarious', def:'so funny you cannot stop laughing',       wrong:['boring','sad'] },
      { word:'demolish',  def:'to knock something down completely',      wrong:['build','repair'] },
      { word:'genuine',   def:'real — not fake at all',                  wrong:['phony','copied'] },
      { word:'summit',    def:'the very top of a mountain',              wrong:['bottom','valley'] },
    ],
    6: [
      { word:'meticulous',def:'extremely careful about every tiny detail', wrong:['sloppy','careless'] },
      { word:'diligent',  def:'working hard and not giving up',            wrong:['lazy','messy'] },
      { word:'skeptical', def:'not sure you believe something',            wrong:['certain','gullible'] },
      { word:'versatile', def:'good at many different things',             wrong:['limited','stubborn'] },
      { word:'hostile',   def:'unfriendly and ready to fight',             wrong:['friendly','gentle'] },
      { word:'innovative',def:'full of brand new ideas',                   wrong:['ordinary','outdated'] },
      { word:'abundant',  def:'more than enough — plenty',                 wrong:['scarce','missing'] },
      { word:'treacherous',def:'full of hidden danger',                    wrong:['safe','cozy'] },
      { word:'flourish',  def:'to grow strong and healthy',                wrong:['wither','shrink'] },
      { word:'colossal',  def:'unbelievably gigantic',                     wrong:['minuscule','average'] },
    ],
    7: [
      { word:'ambiguous', def:'unclear — it could mean more than one thing', wrong:['obvious','definite'] },
      { word:'benevolent',def:'kind and wanting to help others',             wrong:['cruel','greedy'] },
      { word:'candid',    def:'totally honest and direct',                   wrong:['secretive','shy'] },
      { word:'diminish',  def:'to get smaller or weaker',                    wrong:['grow','expand'] },
      { word:'eloquent',  def:'amazingly good with words',                   wrong:['clumsy','silent'] },
      { word:'resilient', def:'able to bounce back after hard times',        wrong:['fragile','defeated'] },
      { word:'meticulous',def:'paying attention to every single detail',     wrong:['careless','hasty'] },
      { word:'reluctant', def:'hesitant — not really wanting to',            wrong:['eager','thrilled'] },
      { word:'skeptic',   def:'a person who doubts what they are told',      wrong:['believer','follower'] },
      { word:'tenacious', def:'holding on and never giving up',              wrong:['quitting','feeble'] },
      { word:'vivid',     def:'so bright and clear it feels real',           wrong:['dull','faded'] },
      { word:'novice',    def:'someone brand new at something',              wrong:['expert','veteran'] },
      { word:'inevitable',def:'certain to happen — cannot be stopped',       wrong:['avoidable','unlikely'] },
      { word:'scrutinize',def:'to examine something very closely',           wrong:['ignore','glance'] },
      { word:'perplexed', def:'completely confused and puzzled',             wrong:['certain','clear'] },
      { word:'audacious', def:'boldly daring, almost reckless',              wrong:['timid','cautious'] },
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
    {
      level:5, text:['Deep','in','the','rainforest,','a','tiny','tree','frog','clung','to','a','dripping','leaf.','Its','bright','red','eyes','were','not','just','for','show','—','when','a','hungry','snake','slid','close,','the','frog','flashed','them','open,','startling','the','snake','just','long','enough','to','leap','to','safety.'],
      q:'How did the frog escape the snake?', answer:'👀', answerWord:'it startled the snake with its bright eyes',
      options:[ {e:'👀', label:'startled it with its eyes'}, {e:'🏊', label:'swam away'}, {e:'🫥', label:'turned invisible'} ],
    },
    {
      level:5, text:['Maya','wanted','to','win','the','science','fair,','but','her','volcano','model','kept','collapsing.','Instead','of','quitting,','she','studied','why','it','fell,','changed','the','base,','and','rebuilt','it','stronger.','At','the','fair,','the','judges','gave','her','a','ribbon','—','not','for','the','volcano,','but','for','not','giving','up.'],
      q:'Why did the judges give Maya a ribbon?', answer:'💪', answerWord:'because she never gave up',
      options:[ {e:'🌋', label:'her volcano was the biggest'}, {e:'💪', label:'she never gave up'}, {e:'🎨', label:'it was the prettiest'} ],
    },
    {
      level:6, text:['The','lighthouse','keeper','had','one','job:','keep','the','lamp','burning.','One','stormy','night','the','power','failed,','and','a','ship','was','heading','for','the','rocks.','With','minutes','to','spare,','she','hauled','the','old','oil','lantern','up','two','hundred','stairs','and','lit','it','by','hand.','The','ship','turned','away','just','in','time.'],
      q:'How did the keeper save the ship?', answer:'🏮', answerWord:'she lit the old oil lantern by hand',
      options:[ {e:'📞', label:'she called the captain'}, {e:'🏮', label:'she lit the old lantern'}, {e:'🚤', label:'she sailed out to warn them'} ],
    },
    {
      level:7, text:['Historians','once','believed','the','ancient','library','burned','in','a','single','fire.','But','new','evidence','tells','a','quieter,','sadder','story:','over','many','years,','funding','dried','up,','scholars','drifted','away,','and','the','scrolls','were','slowly','scattered','and','lost.','The','library','did','not','die','in','flames','—','it','faded','from','neglect.'],
      q:'What really destroyed the library?', answer:'🕰️', answerWord:'slow neglect over many years',
      options:[ {e:'🔥', label:'one huge fire'}, {e:'🕰️', label:'slow neglect over years'}, {e:'🌊', label:'a flood'} ],
    },
    {
      level:6, text:['Every','autumn,','the','monarch','butterflies','fly','thousands','of','miles','south','to','the','very','same','forest.','The','strange','part','is','that','no','single','butterfly','makes','the','trip','twice','—','it','takes','several','generations.','The','ones','that','arrive','have','never','been','there,','yet','somehow','they','know','the','way.'],
      q:'Why is the butterflies’ journey so surprising?', answer:'🧭', answerWord:'they find the way without ever having been there',
      options:[ {e:'🧭', label:'they find a place they have never seen'}, {e:'🏎️', label:'they fly faster than cars'}, {e:'🌙', label:'they only travel at night'} ],
    },
    {
      level:7, text:['The','young','inventor','was','sure','her','machine','had','failed.','It','never','did','the','one','thing','she','built','it','for.','But','a','curious','side','effect','—','a','faint','hum','that','calmed','crying','babies','—','turned','out','to','matter','far','more','than','her','original','plan.','Sometimes','the','accident','is','the','discovery.'],
      q:'What is the main lesson of this story?', answer:'💡', answerWord:'an accident can be more valuable than the plan',
      options:[ {e:'💡', label:'a mistake can become the real discovery'}, {e:'🔧', label:'machines always break'}, {e:'😴', label:'babies like quiet rooms'} ],
    },
  ],
};
