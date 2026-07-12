// Graded Vietnamese reading library: 2 stories per level, matched to the 6 curriculum months.
// Levels 1–2: 40–80 words. Levels 3–4: 120–250 with dialogue. Levels 5–6: 300–400 folk tales & narratives.
export interface StoryQuizQ {
  id: string;
  prompt: string; // asked in English
  options: string[];
  answer: string;
}

export interface Story {
  id: string;
  level: number; // 1-6, unlocks with the matching month
  title: string;
  emoji: string;
  minutes: number;
  text: string; // Vietnamese, paragraphs separated by blank lines
  vocab: { word: string; meaning: string }[];
  quiz: StoryQuizQ[];
}

export const LIBRARY: Story[] = [
  // ── Level 1 ────────────────────────────────────────────────────────────────
  {
    id: 's1a',
    level: 1,
    title: 'Con Mèo Của Nam',
    emoji: '🐱',
    minutes: 1,
    text: `Nam có con mèo. Mèo tên là Mi.

Mi nhỏ và xinh. Mi có lông đen và trắng.

Mi ăn cá. Mi uống nước. Mi ngủ trên ghế.

Nam yêu Mi. Mi yêu Nam.`,
    vocab: [
      { word: 'con mèo', meaning: 'cat' },
      { word: 'lông', meaning: 'fur' },
      { word: 'ngủ', meaning: 'to sleep' },
      { word: 'yêu', meaning: 'to love' },
    ],
    quiz: [
      { id: 'q1', prompt: 'What is the cat\'s name?', options: ['Nam', 'Mi', 'Lan', 'Bé'], answer: 'Mi' },
      { id: 'q2', prompt: 'What colours is Mi\'s fur?', options: ['black and white', 'brown', 'orange', 'grey'], answer: 'black and white' },
      { id: 'q3', prompt: 'What does Mi eat?', options: ['rice', 'fish', 'bread', 'fruit'], answer: 'fish' },
      { id: 'q4', prompt: 'Where does Mi sleep?', options: ['on the bed', 'on the chair', 'on the table', 'outside'], answer: 'on the chair' },
    ],
  },
  {
    id: 's1b',
    level: 1,
    title: 'Gà Con Của Bà',
    emoji: '🐤',
    minutes: 1,
    text: `Bà có ba con gà con. Gà con màu vàng.

Gà con ăn ngô. Gà con uống nước mưa.

Một con gà con đi xa. Bà đi tìm. Gà con ở trong vườn!

Bà cười. Gà con chạy về nhà.`,
    vocab: [
      { word: 'gà con', meaning: 'chick (baby chicken)' },
      { word: 'ngô', meaning: 'corn' },
      { word: 'vườn', meaning: 'garden' },
      { word: 'cười', meaning: 'to smile; to laugh' },
    ],
    quiz: [
      { id: 'q1', prompt: 'How many chicks does grandma have?', options: ['one', 'two', 'three', 'four'], answer: 'three' },
      { id: 'q2', prompt: 'What colour are the chicks?', options: ['yellow', 'red', 'black', 'white'], answer: 'yellow' },
      { id: 'q3', prompt: 'What do the chicks eat?', options: ['rice', 'corn', 'fish', 'bread'], answer: 'corn' },
      { id: 'q4', prompt: 'Where was the lost chick found?', options: ['in the house', 'in the garden', 'by the river', 'on the road'], answer: 'in the garden' },
    ],
  },

  // ── Level 2 ────────────────────────────────────────────────────────────────
  {
    id: 's2a',
    level: 2,
    title: 'Ngày Mưa',
    emoji: '🌧️',
    minutes: 2,
    text: `Hôm nay trời mưa to. Bé Hà không đi chơi. Bé ở nhà với mẹ.

Mẹ nấu cơm. Bé Hà giúp mẹ rửa rau. Cơm nóng và ngon.

Sau đó, mẹ và bé đọc sách. Sách có tranh con voi và con khỉ.

Chiều, trời hết mưa. Trời có cầu vồng! Bé Hà rất vui.`,
    vocab: [
      { word: 'mưa', meaning: 'rain; to rain' },
      { word: 'nấu cơm', meaning: 'to cook (a meal)' },
      { word: 'rửa', meaning: 'to wash' },
      { word: 'cầu vồng', meaning: 'rainbow' },
    ],
    quiz: [
      { id: 'q1', prompt: 'Why does Hà stay home?', options: ['she is sick', 'it is raining hard', 'it is too hot', 'she is tired'], answer: 'it is raining hard' },
      { id: 'q2', prompt: 'How does Hà help her mother?', options: ['washing vegetables', 'cooking rice', 'cleaning the floor', 'feeding the cat'], answer: 'washing vegetables' },
      { id: 'q3', prompt: 'What animals are in the book?', options: ['cat and dog', 'elephant and monkey', 'chicken and duck', 'fish and bird'], answer: 'elephant and monkey' },
      { id: 'q4', prompt: 'What appears in the sky in the afternoon?', options: ['the moon', 'a rainbow', 'more clouds', 'a plane'], answer: 'a rainbow' },
    ],
  },
  {
    id: 's2b',
    level: 2,
    title: 'Bữa Cơm Gia Đình',
    emoji: '🍚',
    minutes: 2,
    text: `Tối nay cả nhà ăn cơm. Bố, mẹ, anh Minh và bé Lan ngồi quanh bàn.

Mẹ nấu canh cá. Bố có rau xanh. Có cả trứng và thịt.

Bé Lan nói: "Cơm mẹ nấu ngon nhất!" Mẹ cười vui.

Anh Minh ăn ba bát cơm. Anh nói: "Cảm ơn mẹ ạ."

Cả nhà vui vẻ. Bữa cơm gia đình ấm áp.`,
    vocab: [
      { word: 'bữa cơm', meaning: 'a meal' },
      { word: 'canh', meaning: 'soup' },
      { word: 'trứng', meaning: 'egg' },
      { word: 'ấm áp', meaning: 'warm, cosy' },
    ],
    quiz: [
      { id: 'q1', prompt: 'How many people are at the table?', options: ['two', 'three', 'four', 'five'], answer: 'four' },
      { id: 'q2', prompt: 'What soup did the mother cook?', options: ['fish soup', 'chicken soup', 'vegetable soup', 'noodle soup'], answer: 'fish soup' },
      { id: 'q3', prompt: 'How many bowls of rice does Minh eat?', options: ['one', 'two', 'three', 'four'], answer: 'three' },
      { id: 'q4', prompt: 'What does Minh say to his mother?', options: ['goodbye', 'thank you (politely)', 'good night', 'sorry'], answer: 'thank you (politely)' },
    ],
  },

  // ── Level 3 ────────────────────────────────────────────────────────────────
  {
    id: 's3a',
    level: 3,
    title: 'Sinh Nhật Của Lan',
    emoji: '🎂',
    minutes: 3,
    text: `Hôm nay là sinh nhật của Lan. Lan tám tuổi. Nhưng sáng nay, mọi người đều rất lạ.

Mẹ chỉ nói: "Chào con." Bố đọc báo, không nói gì. Anh Minh xem ti vi.

Lan buồn. Lan nghĩ: "Mọi người quên sinh nhật của mình rồi."

Chiều, Lan đi học về. Nhà tối om. Lan mở cửa.

"Chúc mừng sinh nhật!" Mọi người hét to. Đèn bật sáng. Có bánh kem, có hoa, có quà!

Mẹ ôm Lan và nói: "Cả nhà không quên đâu. Cả nhà muốn làm con bất ngờ!"

Lan cười thật tươi. Đây là sinh nhật vui nhất của Lan.`,
    vocab: [
      { word: 'sinh nhật', meaning: 'birthday' },
      { word: 'quên', meaning: 'to forget' },
      { word: 'bất ngờ', meaning: 'surprise; surprised' },
      { word: 'bánh kem', meaning: 'cream cake' },
    ],
    quiz: [
      { id: 'q1', prompt: 'How old is Lan turning?', options: ['seven', 'eight', 'nine', 'ten'], answer: 'eight' },
      { id: 'q2', prompt: 'Why is Lan sad in the morning?', options: ['she is sick', 'she thinks everyone forgot her birthday', 'she lost her toy', 'it is raining'], answer: 'she thinks everyone forgot her birthday' },
      { id: 'q3', prompt: 'What happens when Lan opens the door?', options: ['nobody is home', 'the family shouts "Happy birthday!"', 'the cat runs out', 'the lights go off'], answer: 'the family shouts "Happy birthday!"' },
      { id: 'q4', prompt: 'Why did the family act strangely?', options: ['they were angry', 'they wanted to surprise her', 'they really forgot', 'they were busy'], answer: 'they wanted to surprise her' },
      { id: 'q5', prompt: 'We can infer the story\'s lesson is:', options: ['birthdays are boring', 'quiet mornings mean bad days', 'things are not always what they seem', 'cakes are expensive'], answer: 'things are not always what they seem' },
    ],
  },
  {
    id: 's3b',
    level: 3,
    title: 'Đi Chợ Với Mẹ',
    emoji: '🧺',
    minutes: 3,
    text: `Sáng chủ nhật, Nam đi chợ với mẹ. Chợ rất đông người và nhiều màu sắc.

Mẹ mua rau muống và cà chua. Cô bán rau cười: "Rau hôm nay tươi lắm!"

Nam thấy hàng cá. Cá bơi trong chậu nước. "Mẹ ơi, mua cá nhé?" Nam hỏi.

"Được. Con chọn đi," mẹ nói. Nam chọn một con cá to.

Sau đó, mẹ mua cho Nam một cái bánh rán. Bánh nóng, ngọt và thơm.

Về nhà, Nam kể cho bố: "Chợ vui lắm bố ạ! Tuần sau con muốn đi nữa."`,
    vocab: [
      { word: 'chợ', meaning: 'market' },
      { word: 'đông', meaning: 'crowded' },
      { word: 'tươi', meaning: 'fresh' },
      { word: 'bánh rán', meaning: 'fried doughnut' },
    ],
    quiz: [
      { id: 'q1', prompt: 'When do Nam and his mother go to the market?', options: ['Monday morning', 'Sunday morning', 'Saturday evening', 'Friday noon'], answer: 'Sunday morning' },
      { id: 'q2', prompt: 'What vegetables does the mother buy?', options: ['carrots and potatoes', 'water spinach and tomatoes', 'cabbage and onions', 'corn and beans'], answer: 'water spinach and tomatoes' },
      { id: 'q3', prompt: 'What does Nam choose at the fish stall?', options: ['a small fish', 'a big fish', 'two fish', 'a crab'], answer: 'a big fish' },
      { id: 'q4', prompt: 'What treat does Nam get?', options: ['ice cream', 'a fried doughnut', 'candy', 'fruit'], answer: 'a fried doughnut' },
      { id: 'q5', prompt: 'How does Nam feel about the market?', options: ['bored — he never wants to return', 'happy — he wants to go again', 'scared of the crowd', 'tired and hungry'], answer: 'happy — he wants to go again' },
    ],
  },

  // ── Level 4 ────────────────────────────────────────────────────────────────
  {
    id: 's4a',
    level: 4,
    title: 'Chuyến Xe Buýt',
    emoji: '🚌',
    minutes: 4,
    text: `Mỗi sáng, Hoa đi học bằng xe buýt số 32. Hôm nay, xe rất đông. Hoa may mắn có một chỗ ngồi gần cửa sổ.

Ở bến tiếp theo, một bà cụ lên xe. Tóc bà bạc trắng, tay bà xách một túi nặng. Không còn chỗ trống nào.

Hoa đứng dậy ngay. "Bà ơi, bà ngồi chỗ của cháu ạ," Hoa nói.

Bà cụ cười hiền: "Cảm ơn cháu. Cháu ngoan quá."

Một chú đứng gần đó nhìn thấy. Chú cũng đứng dậy nhường chỗ cho một cô đang bế em bé. Rồi một anh học sinh nhường chỗ cho một ông cụ.

Cả xe buýt bỗng nhiên ấm áp lạ thường, tuy ngoài trời đang lạnh.

Khi xuống xe, bà cụ nói với Hoa: "Lòng tốt giống như hạt giống, cháu ạ. Gieo một hạt, mọc cả vườn."

Hoa nghĩ về câu nói ấy suốt cả ngày.`,
    vocab: [
      { word: 'xe buýt', meaning: 'bus' },
      { word: 'bà cụ', meaning: 'elderly lady' },
      { word: 'nhường chỗ', meaning: 'to give up one\'s seat' },
      { word: 'hạt giống', meaning: 'seed' },
    ],
    quiz: [
      { id: 'q1', prompt: 'How does Hoa get to school?', options: ['by bicycle', 'by bus number 32', 'on foot', 'by motorbike'], answer: 'by bus number 32' },
      { id: 'q2', prompt: 'What does Hoa do when the old lady boards?', options: ['looks out the window', 'gives up her seat', 'helps carry the bag', 'moves to the back'], answer: 'gives up her seat' },
      { id: 'q3', prompt: 'What happens after Hoa\'s kind act?', options: ['nothing changes', 'other passengers also give up their seats', 'the bus stops', 'everyone applauds'], answer: 'other passengers also give up their seats' },
      { id: 'q4', prompt: 'The old lady compares kindness to:', options: ['a warm coat', 'a seed that grows a garden', 'a bus ticket', 'sunshine'], answer: 'a seed that grows a garden' },
      { id: 'q5', prompt: 'The main idea (ý chính) of this story is:', options: ['buses are crowded', 'one kind act inspires many more', 'old people ride buses', 'winter is cold'], answer: 'one kind act inspires many more' },
    ],
  },
  {
    id: 's4b',
    level: 4,
    title: 'Bức Thư Của Ông',
    emoji: '✉️',
    minutes: 4,
    text: `Chiều thứ bảy, Minh nhận được một bức thư. Thư của ông nội gửi từ quê.

Minh mở thư và đọc:

"Cháu Minh thân mến,

Dạo này cháu có khỏe không? Ông và bà vẫn khỏe. Vườn nhà mình đang mùa ổi chín. Cây ổi cháu trồng năm ngoái đã cao hơn đầu ông rồi!

Con trâu nhà bác Ba mới có nghé con. Nghé nhỏ xíu, chân còn run run mà đã đòi chạy khắp sân.

Hè này cháu về quê chơi nhé. Ông sẽ dạy cháu thả diều ngoài đê. Bà bảo sẽ nấu chè đỗ đen cho cháu ăn.

Ông nhớ cháu lắm.

Ông nội."

Minh đọc thư hai lần. Tự nhiên, Minh nhớ quê quá: nhớ vườn ổi, nhớ tiếng gà gáy, nhớ cả mùi khói bếp của bà.

Tối đó, Minh lấy giấy bút và bắt đầu viết: "Ông nội kính mến của cháu..."`,
    vocab: [
      { word: 'bức thư', meaning: 'a letter (with its classifier)' },
      { word: 'quê', meaning: 'hometown; countryside' },
      { word: 'ổi', meaning: 'guava' },
      { word: 'thả diều', meaning: 'to fly a kite' },
    ],
    quiz: [
      { id: 'q1', prompt: 'Who sent Minh the letter?', options: ['his teacher', 'his grandfather', 'his friend', 'his aunt'], answer: 'his grandfather' },
      { id: 'q2', prompt: 'What is ripening in the garden?', options: ['mangoes', 'guavas', 'bananas', 'oranges'], answer: 'guavas' },
      { id: 'q3', prompt: 'What does grandfather promise to teach Minh this summer?', options: ['fishing', 'kite flying', 'swimming', 'gardening'], answer: 'kite flying' },
      { id: 'q4', prompt: 'How does the letter make Minh feel?', options: ['bored', 'homesick for the countryside', 'angry', 'confused'], answer: 'homesick for the countryside' },
      { id: 'q5', prompt: 'What does Minh do that evening?', options: ['calls his grandfather', 'starts writing a reply', 'packs his bag', 'goes to sleep'], answer: 'starts writing a reply' },
    ],
  },

  // ── Level 5 ────────────────────────────────────────────────────────────────
  {
    id: 's5a',
    level: 5,
    title: 'Sự Tích Bánh Chưng, Bánh Giầy',
    emoji: '🎍',
    minutes: 5,
    text: `Ngày xưa, vua Hùng thứ sáu tuổi đã cao. Vua muốn chọn một người con để nối ngôi. Vua gọi các hoàng tử đến và nói: "Ai tìm được món ăn ngon nhất, ý nghĩa nhất để dâng lên tổ tiên, ta sẽ truyền ngôi cho người đó."

Các hoàng tử tỏa đi khắp nơi. Người lên rừng săn thú quý. Người xuống biển tìm cá lạ. Ai cũng muốn tìm của ngon vật lạ nhất trên đời.

Riêng hoàng tử thứ mười tám, tên là Lang Liêu, rất lo lắng. Chàng nghèo, nhà chỉ có lúa gạo. Một đêm, chàng nằm mơ thấy một vị thần. Thần bảo: "Trong trời đất, không gì quý bằng hạt gạo. Hãy lấy gạo mà làm bánh."

Lang Liêu tỉnh dậy, mừng lắm. Chàng lấy gạo nếp thơm, đỗ xanh và thịt lợn, gói bằng lá dong thành bánh hình vuông, tượng trưng cho đất. Rồi chàng giã xôi thật mịn, nặn thành bánh hình tròn, tượng trưng cho trời.

Đến ngày hẹn, các hoàng tử dâng sơn hào hải vị. Vua nếm qua từng món nhưng không hài lòng. Đến lượt Lang Liêu, chàng dâng hai thứ bánh giản dị và kể lại giấc mơ.

Vua nếm bánh, khen ngon, rồi nói: "Bánh hình vuông là đất, bánh hình tròn là trời. Món ăn này làm từ hạt gạo do chính tay con người làm ra — quý nhất chính là ở đó."

Vua truyền ngôi cho Lang Liêu. Từ đó, mỗi dịp Tết, người Việt lại gói bánh chưng, bánh giầy để nhớ ơn tổ tiên.`,
    vocab: [
      { word: 'vua', meaning: 'king' },
      { word: 'nối ngôi', meaning: 'to inherit the throne' },
      { word: 'tổ tiên', meaning: 'ancestors' },
      { word: 'tượng trưng', meaning: 'to symbolise' },
    ],
    quiz: [
      { id: 'q1', prompt: 'What contest does King Hùng set for his sons?', options: ['a battle', 'finding the most meaningful dish', 'a horse race', 'writing a poem'], answer: 'finding the most meaningful dish' },
      { id: 'q2', prompt: 'Who helps Lang Liêu find his idea?', options: ['his mother', 'a deity in a dream', 'a fisherman', 'the king'], answer: 'a deity in a dream' },
      { id: 'q3', prompt: 'What do the two cakes symbolise?', options: ['sun and moon', 'earth (square) and sky (round)', 'rich and poor', 'north and south'], answer: 'earth (square) and sky (round)' },
      { id: 'q4', prompt: 'Why does the king value Lang Liêu\'s cakes most?', options: ['they are expensive', 'they are made from rice grown by human hands', 'they are beautiful', 'they are rare'], answer: 'they are made from rice grown by human hands' },
      { id: 'q5', prompt: 'When do Vietnamese people make these cakes today?', options: ['at weddings', 'at Tết (Lunar New Year)', 'at birthdays', 'every full moon'], answer: 'at Tết (Lunar New Year)' },
    ],
  },
  {
    id: 's5b',
    level: 5,
    title: 'Chú Cuội Và Cây Đa',
    emoji: '🌕',
    minutes: 5,
    text: `Ngày xưa có một chàng tiều phu tên là Cuội. Một hôm vào rừng, Cuội thấy hổ mẹ hái lá một cây lạ để cứu sống hổ con. Cuội hiểu ra: đó là cây thuốc quý có thể cứu người chết sống lại.

Cuội đào cây về trồng ở góc vườn. Chàng dặn vợ: "Cây này quý lắm. Nhớ đừng tưới nước bẩn vào gốc, cây sẽ bay lên trời đó!"

Từ ngày có cây thuốc, Cuội cứu được rất nhiều người. Tiếng lành đồn xa, ai ai cũng biết ơn chàng.

Nhưng một hôm, vợ Cuội quên mất lời dặn. Nàng đổ nước bẩn ngay gốc cây. Bỗng nhiên, mặt đất rung lên. Cây đa bật gốc, từ từ bay lên trời.

Vừa lúc đó, Cuội về đến nhà. Chàng hốt hoảng chạy tới, níu lấy rễ cây. Nhưng cây khỏe quá, kéo cả Cuội bay lên cao, lên cao mãi — bay thẳng lên cung trăng.

Từ đó, Cuội ở lại trên mặt trăng cùng cây đa của mình. Người Việt nói rằng: vào đêm rằm, nếu nhìn kỹ mặt trăng, bạn sẽ thấy bóng chú Cuội ngồi dưới gốc cây đa, nhớ về quê nhà.

Vì thế, mỗi dịp Trung thu, trẻ em rước đèn, ngẩng nhìn trăng và hát về chú Cuội.`,
    vocab: [
      { word: 'tiều phu', meaning: 'woodcutter' },
      { word: 'cây thuốc', meaning: 'medicine tree/plant' },
      { word: 'cung trăng', meaning: 'the moon palace' },
      { word: 'Trung thu', meaning: 'Mid-Autumn Festival' },
    ],
    quiz: [
      { id: 'q1', prompt: 'How does Cuội discover the magic tree?', options: ['a deity tells him', 'he sees a tiger heal her cub with its leaves', 'he reads about it', 'his wife finds it'], answer: 'he sees a tiger heal her cub with its leaves' },
      { id: 'q2', prompt: 'What is Cuội\'s warning about the tree?', options: ['never cut its branches', 'never pour dirty water on its roots', 'never sleep under it', 'never sell its leaves'], answer: 'never pour dirty water on its roots' },
      { id: 'q3', prompt: 'What happens when the warning is forgotten?', options: ['the tree dies', 'the tree flies up to the sky', 'the tree stops healing', 'a storm comes'], answer: 'the tree flies up to the sky' },
      { id: 'q4', prompt: 'Where does Cuội end up?', options: ['in the forest', 'on the moon', 'under the sea', 'in the king\'s palace'], answer: 'on the moon' },
      { id: 'q5', prompt: 'At which festival do children sing about Cuội?', options: ['Tết', 'Mid-Autumn Festival', 'harvest festival', 'New Year\'s Eve'], answer: 'Mid-Autumn Festival' },
    ],
  },

  // ── Level 6 ────────────────────────────────────────────────────────────────
  {
    id: 's6a',
    level: 6,
    title: 'Sự Tích Hồ Gươm',
    emoji: '🗡️',
    minutes: 5,
    text: `Vào thế kỷ mười lăm, giặc Minh sang xâm chiếm nước ta. Chúng tàn ác vô cùng, khiến lòng dân oán hận. Bấy giờ, ở đất Lam Sơn, có người anh hùng tên là Lê Lợi đứng lên khởi nghĩa. Nhưng buổi đầu, nghĩa quân còn yếu, nhiều lần bị thua.

Thấy vậy, Đức Long Quân — vị thần cai quản biển cả — quyết định cho nghĩa quân mượn thanh gươm thần.

Chuyện xảy ra thật kỳ lạ. Một người đánh cá tên là Lê Thận ba lần kéo lưới đều vớt được một lưỡi gươm cũ. Về sau, Lê Thận gia nhập nghĩa quân. Một hôm, chính Lê Lợi tìm thấy chuôi gươm nạm ngọc trên ngọn cây đa. Lưỡi gươm và chuôi gươm khớp với nhau như in. Trên gươm hiện hai chữ "Thuận Thiên" — nghĩa là theo ý trời.

Từ ngày có gươm thần, nghĩa quân đánh đâu thắng đó. Sau mười năm, quân Minh bị đánh đuổi khỏi bờ cõi. Lê Lợi lên ngôi vua, đóng đô ở Thăng Long.

Một năm sau, vua Lê dạo thuyền trên hồ Tả Vọng. Bỗng một con rùa vàng rất lớn nổi lên mặt nước, cất tiếng nói: "Xin bệ hạ hoàn gươm lại cho Long Quân!"

Vua Lê hiểu ra. Ngài rút gươm, hai tay dâng về phía rùa vàng. Rùa há miệng đớp lấy thanh gươm rồi lặn xuống nước sâu.

Từ đó, hồ Tả Vọng mang tên mới: Hồ Gươm, hay Hồ Hoàn Kiếm — hồ trả gươm. Ngày nay, hồ nằm giữa lòng Hà Nội, và tháp Rùa vẫn đứng đó, kể mãi câu chuyện xưa.`,
    vocab: [
      { word: 'gươm', meaning: 'sword' },
      { word: 'khởi nghĩa', meaning: 'to rise up (in revolt)' },
      { word: 'rùa vàng', meaning: 'golden turtle' },
      { word: 'hoàn', meaning: 'to return, give back (formal)' },
    ],
    quiz: [
      { id: 'q1', prompt: 'Who leads the uprising against the Minh invaders?', options: ['Lê Thận', 'Lê Lợi', 'Long Quân', 'the golden turtle'], answer: 'Lê Lợi' },
      { id: 'q2', prompt: 'How is the sword found?', options: ['bought at a market', 'blade in a fishing net, hilt in a tree', 'dug from the ground', 'given by the Minh'], answer: 'blade in a fishing net, hilt in a tree' },
      { id: 'q3', prompt: 'What do the words "Thuận Thiên" on the sword mean?', options: ['victory forever', 'according to heaven\'s will', 'return the sword', 'golden turtle'], answer: 'according to heaven\'s will' },
      { id: 'q4', prompt: 'What does the golden turtle ask the king?', options: ['to build a tower', 'to return the sword to Long Quân', 'to free the fish', 'to leave the lake'], answer: 'to return the sword to Long Quân' },
      { id: 'q5', prompt: '"Hồ Hoàn Kiếm" means:', options: ['Lake of the Golden Turtle', 'Lake of the Returned Sword', 'Lake of the King', 'Lake of Heaven'], answer: 'Lake of the Returned Sword' },
    ],
  },
  {
    id: 's6b',
    level: 6,
    title: 'Lá Thư Từ Đà Nẵng',
    emoji: '🏖️',
    minutes: 5,
    text: `Huy thân mến,

Mình viết thư này từ Đà Nẵng, nơi gia đình mình vừa chuyển đến sống được ba tháng. Cậu hỏi cuộc sống ở đây thế nào — để mình kể cho cậu nghe nhé.

Buổi sáng ở đây bắt đầu rất sớm. Từ năm giờ, người ta đã ra biển: người bơi, người chạy bộ, các cụ già tập thể dục trên cát. Mình và bố cũng hay ra biển Mỹ Khê trước giờ đi học. Nước biển buổi sớm mát lạnh, còn mặt trời thì mọc lên từ từ như một quả cam khổng lồ.

Trường mới của mình ở gần sông Hàn. Chiều thứ sáu nào cả lớp cũng tan học muộn hơn một chút, vì ai cũng đứng lại xem cầu Rồng — cây cầu hình con rồng khổng lồ. Cậu biết không, cuối tuần rồng còn phun lửa và phun nước thật!

Món ăn ở đây thì tuyệt vời. Mì Quảng là món mình mê nhất: sợi mì vàng, tôm, thịt, đậu phộng rang, ăn kèm bánh tráng nướng giòn tan. Bà bán mì đầu ngõ đã nhớ mặt mình rồi, lần nào cũng cho thêm rau.

Tuy vậy, nhiều lúc mình vẫn nhớ Hà Nội — nhớ mùa thu, nhớ phố cổ, và nhớ nhất là những buổi chiều đá bóng với cậu. Nếu hè này cậu vào chơi thì tuyệt biết mấy! Mình sẽ dẫn cậu đi khắp nơi: lên Bà Nà, ra Cù Lao Chàm, và tất nhiên là ăn mì Quảng đến no thì thôi.

Viết thư cho mình sớm nhé. Cho mình gửi lời chào bố mẹ cậu.

Bạn thân của cậu,
Tuấn`,
    vocab: [
      { word: 'chuyển đến', meaning: 'to move to (a new place)' },
      { word: 'chạy bộ', meaning: 'to jog' },
      { word: 'cầu Rồng', meaning: 'the Dragon Bridge (in Đà Nẵng)' },
      { word: 'đậu phộng', meaning: 'peanuts (southern word)' },
    ],
    quiz: [
      { id: 'q1', prompt: 'How long has Tuấn lived in Đà Nẵng?', options: ['three weeks', 'three months', 'three years', 'his whole life'], answer: 'three months' },
      { id: 'q2', prompt: 'What do people do at the beach from 5 a.m.?', options: ['sell food', 'swim, jog and exercise', 'fish from boats', 'build sandcastles'], answer: 'swim, jog and exercise' },
      { id: 'q3', prompt: 'What is special about the Dragon Bridge on weekends?', options: ['it opens for ships', 'it breathes fire and water', 'it lights up blue', 'it plays music'], answer: 'it breathes fire and water' },
      { id: 'q4', prompt: 'Which dish is Tuấn\'s favourite?', options: ['phở', 'bánh mì', 'mì Quảng', 'bún chả'], answer: 'mì Quảng' },
      { id: 'q5', prompt: 'What does Tuấn miss most about Hanoi?', options: ['the food', 'autumn and the old quarter', 'playing football with Huy', 'his school'], answer: 'playing football with Huy' },
    ],
  },
];
