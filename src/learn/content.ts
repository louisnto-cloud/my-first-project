import type { Course } from '../types';

// The built-in self-study curriculum. Three programs matched to E’TOP's
// class levels; each lesson = new words + a grammar point + exercises.

export const COURSES: Course[] = [
  {
    id: 'kids',
    emoji: '🐣',
    color: 'bg-rose-400',
    titleEn: 'English Start',
    titleVi: 'Khởi động tiếng Anh',
    descEn: 'First words and sentences for young learners',
    descVi: 'Những từ và câu đầu tiên cho các bạn nhỏ',
    levelKeywords: ['Starters', 'Movers'],
    units: [
      {
        id: 'kids_u1',
        titleEn: 'Me & My World',
        titleVi: 'Em và thế giới quanh em',
        lessons: [
          {
            id: 'kids_u1_l1',
            emoji: '👋',
            titleEn: 'Hello!',
            titleVi: 'Xin chào!',
            vocab: [
              { term: 'hello', meaningVi: 'xin chào', example: 'Hello! My name is Mai.' },
              { term: 'goodbye', meaningVi: 'tạm biệt', example: 'Goodbye! See you tomorrow.' },
              { term: 'good morning', meaningVi: 'chào buổi sáng', example: 'Good morning, teacher!' },
              { term: 'friend', meaningVi: 'bạn bè', example: 'Lan is my best friend.' },
              { term: 'name', meaningVi: 'tên', example: 'My name is Nam.' },
              { term: 'teacher', meaningVi: 'thầy / cô giáo', example: 'My teacher is very kind.' },
            ],
            grammar: {
              titleEn: 'I am… / My name is…',
              titleVi: 'I am… / My name is…',
              bodyEn: "Use 'I am…' to introduce yourself and 'My name is…' to say your name.",
              bodyVi: "Dùng 'I am…' (mình là…) để giới thiệu bản thân và 'My name is…' (tên mình là…) để nói tên của em.",
              examples: [
                { en: 'I am Nam.', vi: 'Mình là Nam.' },
                { en: 'My name is Hoa.', vi: 'Tên mình là Hoa.' },
                { en: 'I am seven years old.', vi: 'Mình bảy tuổi.' },
              ],
            },
            exercises: [
              { kind: 'mc', question: 'Chọn câu chào buổi sáng:', options: ['Good morning!', 'Goodbye!', 'Thank you!', 'Sorry!'], answer: 'Good morning!' },
              { kind: 'mc', question: "'Tạm biệt' trong tiếng Anh là gì?", options: ['Hello', 'Goodbye', 'Please', 'Yes'], answer: 'Goodbye' },
              { kind: 'fill', sentence: 'My ___ is Minh.', choices: ['name', 'hello', 'friend'], answer: 'name' },
              { kind: 'fill', sentence: 'I ___ seven years old.', choices: ['am', 'is', 'are'], answer: 'am' },
              { kind: 'order', words: ['My', 'name', 'is', 'Lan'], answer: 'My name is Lan' },
              { kind: 'listen', text: 'Hello! Nice to meet you.', options: ['Hello! Nice to meet you.', 'Goodbye! See you later.', 'Good night!'], answer: 'Hello! Nice to meet you.' },
            ],
          },
          {
            id: 'kids_u1_l2',
            emoji: '👨‍👩‍👧‍👦',
            titleEn: 'My Family',
            titleVi: 'Gia đình em',
            vocab: [
              { term: 'mother', meaningVi: 'mẹ', example: 'My mother cooks yummy food.' },
              { term: 'father', meaningVi: 'bố', example: 'My father is tall.' },
              { term: 'sister', meaningVi: 'chị / em gái', example: 'My sister likes to sing.' },
              { term: 'brother', meaningVi: 'anh / em trai', example: 'My brother plays football.' },
              { term: 'grandmother', meaningVi: 'bà', example: 'My grandmother tells fun stories.' },
              { term: 'family', meaningVi: 'gia đình', example: 'I love my family.' },
            ],
            grammar: {
              titleEn: 'This is my…',
              titleVi: 'This is my…',
              bodyEn: "Use 'This is my…' to introduce people in your family.",
              bodyVi: "Dùng 'This is my…' (đây là… của mình) để giới thiệu người trong gia đình em.",
              examples: [
                { en: 'This is my mother.', vi: 'Đây là mẹ của mình.' },
                { en: 'This is my brother, Nam.', vi: 'Đây là anh trai mình, Nam.' },
                { en: 'I love my family.', vi: 'Mình yêu gia đình mình.' },
              ],
            },
            exercises: [
              { kind: 'mc', question: "'Mẹ' trong tiếng Anh là gì?", options: ['mother', 'father', 'sister', 'teacher'], answer: 'mother' },
              { kind: 'mc', question: 'Chọn câu đúng để giới thiệu bố:', options: ['This is my father.', 'This is my mother.', 'I am father.'], answer: 'This is my father.' },
              { kind: 'fill', sentence: 'This is my ___. She is very kind.', choices: ['grandmother', 'brother', 'father'], answer: 'grandmother' },
              { kind: 'fill', sentence: 'I ___ my family.', choices: ['love', 'am', 'name'], answer: 'love' },
              { kind: 'order', words: ['This', 'is', 'my', 'sister'], answer: 'This is my sister' },
              { kind: 'listen', text: 'My brother plays football.', options: ['My brother plays football.', 'My sister plays football.', 'My father watches TV.'], answer: 'My brother plays football.' },
            ],
          },
          {
            id: 'kids_u1_l3',
            emoji: '🌈',
            titleEn: 'Colours & Numbers',
            titleVi: 'Màu sắc & Con số',
            vocab: [
              { term: 'red', meaningVi: 'màu đỏ', example: 'The apple is red.' },
              { term: 'blue', meaningVi: 'màu xanh dương', example: 'The sky is blue.' },
              { term: 'yellow', meaningVi: 'màu vàng', example: "The E'TOP logo is yellow!" },
              { term: 'green', meaningVi: 'màu xanh lá', example: 'The frog is green.' },
              { term: 'seven', meaningVi: 'số bảy', example: 'I am seven years old.' },
              { term: 'ten', meaningVi: 'số mười', example: 'I have ten fingers.' },
            ],
            grammar: {
              titleEn: 'It is + colour',
              titleVi: 'It is + màu sắc',
              bodyEn: "Use 'It is' + a colour to say what colour something is.",
              bodyVi: "Dùng 'It is' + màu sắc để nói một đồ vật có màu gì.",
              examples: [
                { en: 'It is red.', vi: 'Nó màu đỏ.' },
                { en: 'The sun is yellow.', vi: 'Mặt trời màu vàng.' },
                { en: 'I have two blue pens.', vi: 'Mình có hai cây bút xanh dương.' },
              ],
            },
            exercises: [
              { kind: 'mc', question: 'Quả chuối (banana) thường có màu gì?', options: ['yellow', 'red', 'blue', 'green'], answer: 'yellow' },
              { kind: 'mc', question: "'Số bảy' trong tiếng Anh là gì?", options: ['seven', 'ten', 'six', 'three'], answer: 'seven' },
              { kind: 'fill', sentence: 'The sky is ___.', choices: ['blue', 'yellow', 'red'], answer: 'blue' },
              { kind: 'fill', sentence: 'I have ___ fingers.', choices: ['ten', 'blue', 'red'], answer: 'ten' },
              { kind: 'order', words: ['The', 'apple', 'is', 'red'], answer: 'The apple is red' },
              { kind: 'listen', text: 'The frog is green.', options: ['The frog is green.', 'The dog is brown.', 'The sky is blue.'], answer: 'The frog is green.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'teens',
    emoji: '🔥',
    color: 'bg-sky-400',
    titleEn: 'Teens Power English',
    titleVi: 'Tiếng Anh Teens năng động',
    descEn: 'Real English for school, friends, and exams',
    descVi: 'Tiếng Anh thực tế cho trường học, bạn bè và thi cử',
    levelKeywords: ['Teens'],
    units: [
      {
        id: 'teens_u1',
        titleEn: 'My Life',
        titleVi: 'Cuộc sống của tôi',
        lessons: [
          {
            id: 'teens_u1_l1',
            emoji: '⏰',
            titleEn: 'My Day',
            titleVi: 'Một ngày của tôi',
            vocab: [
              { term: 'wake up', meaningVi: 'thức dậy', example: "I wake up at six o'clock." },
              { term: 'breakfast', meaningVi: 'bữa sáng', example: 'I eat breakfast with my family.' },
              { term: 'homework', meaningVi: 'bài tập về nhà', example: 'I do my homework after dinner.' },
              { term: 'usually', meaningVi: 'thường', example: 'I usually ride my bike to school.' },
              { term: 'busy', meaningVi: 'bận rộn', example: 'Monday is my busiest day.' },
              { term: 'routine', meaningVi: 'thói quen hằng ngày', example: 'My morning routine is simple.' },
            ],
            grammar: {
              titleEn: 'Present simple',
              titleVi: 'Thì hiện tại đơn',
              bodyEn: "Use the present simple for daily habits. With he/she/it, add 's' to the verb: I wake up → She wakes up.",
              bodyVi: "Dùng thì hiện tại đơn cho thói quen hằng ngày. Với he/she/it, thêm 's' vào động từ: I wake up → She wakes up.",
              examples: [
                { en: 'I wake up at 6 a.m.', vi: 'Tôi thức dậy lúc 6 giờ sáng.' },
                { en: 'She goes to school by bus.', vi: 'Cô ấy đi học bằng xe buýt.' },
                { en: "We don't study on Sundays.", vi: 'Chúng tôi không học vào Chủ nhật.' },
              ],
            },
            exercises: [
              { kind: 'mc', question: 'She ___ to school at 7 a.m.', options: ['goes', 'go', 'going', 'gone'], answer: 'goes' },
              { kind: 'mc', question: "Từ nào nghĩa là 'bận rộn'?", options: ['busy', 'lazy', 'easy', 'early'], answer: 'busy' },
              { kind: 'fill', sentence: 'I do my ___ after dinner.', choices: ['homework', 'breakfast', 'routine'], answer: 'homework' },
              { kind: 'fill', sentence: "He ___ up at six o'clock.", choices: ['wakes', 'wake', 'waking'], answer: 'wakes' },
              { kind: 'order', words: ['I', 'usually', 'eat', 'breakfast', 'at', 'home'], answer: 'I usually eat breakfast at home' },
              { kind: 'listen', text: "I wake up at six o'clock.", options: ["I wake up at six o'clock.", "I wake up at seven o'clock.", "I go to bed at six o'clock."], answer: "I wake up at six o'clock." },
            ],
          },
          {
            id: 'teens_u1_l2',
            emoji: '🏫',
            titleEn: 'School Life',
            titleVi: 'Đời sống học đường',
            vocab: [
              { term: 'subject', meaningVi: 'môn học', example: 'English is my favourite subject.' },
              { term: 'exam', meaningVi: 'kỳ thi', example: 'We have an exam next week.' },
              { term: 'classmate', meaningVi: 'bạn cùng lớp', example: 'My classmates are friendly.' },
              { term: 'library', meaningVi: 'thư viện', example: 'I read books in the library.' },
              { term: 'never', meaningVi: 'không bao giờ', example: 'I never skip class.' },
              { term: 'favourite', meaningVi: 'yêu thích', example: 'What is your favourite subject?' },
            ],
            grammar: {
              titleEn: 'Adverbs of frequency',
              titleVi: 'Trạng từ tần suất',
              bodyEn: 'always → usually → sometimes → never. They go before the main verb: I always do my homework.',
              bodyVi: 'always (luôn luôn) → usually (thường) → sometimes (thỉnh thoảng) → never (không bao giờ). Đứng trước động từ chính: I always do my homework.',
              examples: [
                { en: 'I always do my homework.', vi: 'Tôi luôn luôn làm bài tập.' },
                { en: 'She sometimes studies in the library.', vi: 'Cô ấy thỉnh thoảng học ở thư viện.' },
                { en: 'We are never late for class.', vi: 'Chúng tôi không bao giờ đi học muộn.' },
              ],
            },
            exercises: [
              { kind: 'mc', question: 'Chọn thứ tự tần suất giảm dần đúng:', options: ['always → sometimes → never', 'never → always → sometimes', 'sometimes → never → always'], answer: 'always → sometimes → never' },
              { kind: 'mc', question: "'Thư viện' trong tiếng Anh là gì?", options: ['library', 'laboratory', 'lobby', 'gallery'], answer: 'library' },
              { kind: 'fill', sentence: 'English is my favourite ___.', choices: ['subject', 'exam', 'classmate'], answer: 'subject' },
              { kind: 'fill', sentence: 'I ___ skip class. (không bao giờ)', choices: ['never', 'always', 'sometimes'], answer: 'never' },
              { kind: 'order', words: ['She', 'always', 'studies', 'before', 'an', 'exam'], answer: 'She always studies before an exam' },
              { kind: 'listen', text: 'We have an exam next week.', options: ['We have an exam next week.', 'We had an exam last week.', 'We have a party next week.'], answer: 'We have an exam next week.' },
            ],
          },
          {
            id: 'teens_u1_l3',
            emoji: '🎮',
            titleEn: 'Free Time & Hobbies',
            titleVi: 'Thời gian rảnh & Sở thích',
            vocab: [
              { term: 'hobby', meaningVi: 'sở thích', example: 'Drawing is my favourite hobby.' },
              { term: 'chess', meaningVi: 'cờ vua', example: 'I play chess with my dad.' },
              { term: 'draw', meaningVi: 'vẽ', example: 'She draws very well.' },
              { term: 'collect', meaningVi: 'sưu tầm', example: 'He collects football cards.' },
              { term: 'relax', meaningVi: 'thư giãn', example: 'Music helps me relax.' },
              { term: 'outdoor', meaningVi: 'ngoài trời', example: 'I love outdoor activities.' },
            ],
            grammar: {
              titleEn: 'like / love / enjoy + V-ing',
              titleVi: 'like / love / enjoy + V-ing',
              bodyEn: 'After like, love, enjoy, and hate, use the -ing form of the verb: I like drawing.',
              bodyVi: 'Sau like, love, enjoy, hate, động từ phía sau thêm -ing: I like drawing (tôi thích vẽ).',
              examples: [
                { en: 'I like drawing.', vi: 'Tôi thích vẽ.' },
                { en: 'She enjoys playing chess.', vi: 'Cô ấy thích chơi cờ vua.' },
                { en: 'They love swimming in summer.', vi: 'Họ thích bơi vào mùa hè.' },
              ],
            },
            exercises: [
              { kind: 'mc', question: 'I enjoy ___ football.', options: ['playing', 'play', 'plays', 'played'], answer: 'playing' },
              { kind: 'mc', question: "'Sưu tầm' trong tiếng Anh là gì?", options: ['collect', 'connect', 'correct', 'collapse'], answer: 'collect' },
              { kind: 'fill', sentence: 'Music helps me ___.', choices: ['relax', 'draw', 'collect'], answer: 'relax' },
              { kind: 'fill', sentence: 'She loves ___ pictures. (vẽ)', choices: ['drawing', 'draw', 'drew'], answer: 'drawing' },
              { kind: 'order', words: ['I', 'like', 'playing', 'chess', 'with', 'friends'], answer: 'I like playing chess with friends' },
              { kind: 'listen', text: 'Drawing is my favourite hobby.', options: ['Drawing is my favourite hobby.', 'Dancing is my favourite hobby.', 'Drawing is my favourite subject.'], answer: 'Drawing is my favourite hobby.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'adults',
    emoji: '☕',
    color: 'bg-orange-400',
    titleEn: 'Everyday Conversation',
    titleVi: 'Giao tiếp hằng ngày',
    descEn: 'Practical English for daily life and work',
    descVi: 'Tiếng Anh thực dụng cho cuộc sống và công việc',
    levelKeywords: ['Adults', 'IELTS'],
    units: [
      {
        id: 'adults_u1',
        titleEn: 'Out & About',
        titleVi: 'Ra ngoài giao tiếp',
        lessons: [
          {
            id: 'adults_u1_l1',
            emoji: '🥤',
            titleEn: 'At the Café',
            titleVi: 'Tại quán cà phê',
            vocab: [
              { term: 'order', meaningVi: 'gọi món', example: 'Are you ready to order?' },
              { term: 'menu', meaningVi: 'thực đơn', example: 'Can I see the menu, please?' },
              { term: 'bill', meaningVi: 'hóa đơn', example: 'Could we have the bill, please?' },
              { term: 'iced coffee', meaningVi: 'cà phê đá', example: 'One iced coffee, please.' },
              { term: 'takeaway', meaningVi: 'mang đi', example: 'Two sandwiches to take away, please.' },
              { term: 'delicious', meaningVi: 'ngon', example: 'The cake is delicious!' },
            ],
            grammar: {
              titleEn: "I'd like… / Could I have…?",
              titleVi: "I'd like… / Could I have…?",
              bodyEn: "Order politely with \"I'd like…\" and ask politely with \"Could I have…?\"",
              bodyVi: "Gọi món lịch sự với \"I'd like…\" (tôi muốn…) và hỏi lịch sự với \"Could I have…?\" (cho tôi… được không?)",
              examples: [
                { en: "I'd like an iced coffee, please.", vi: 'Cho tôi một cà phê đá.' },
                { en: 'Could I have the menu?', vi: 'Cho tôi xem thực đơn được không?' },
                { en: "Anything else? — No, that's all, thank you.", vi: 'Còn gì nữa không? — Không, đủ rồi, cảm ơn.' },
              ],
            },
            exercises: [
              { kind: 'mc', question: 'Cách gọi món lịch sự nhất:', options: ["I'd like a coffee, please.", 'Give me coffee.', 'Coffee!', 'I want coffee now.'], answer: "I'd like a coffee, please." },
              { kind: 'mc', question: "'Hóa đơn' trong tiếng Anh là gì?", options: ['bill', 'menu', 'order', 'tip'], answer: 'bill' },
              { kind: 'fill', sentence: 'Could I have the ___, please?', choices: ['menu', 'delicious', 'takeaway'], answer: 'menu' },
              { kind: 'fill', sentence: "I'd ___ an iced tea, please.", choices: ['like', 'want', 'take'], answer: 'like' },
              { kind: 'order', words: ['Could', 'we', 'have', 'the', 'bill', 'please'], answer: 'Could we have the bill please' },
              { kind: 'listen', text: 'One iced coffee, please.', options: ['One iced coffee, please.', 'One iced tea, please.', 'Two iced coffees, please.'], answer: 'One iced coffee, please.' },
            ],
          },
          {
            id: 'adults_u1_l2',
            emoji: '🗺️',
            titleEn: 'Asking for Directions',
            titleVi: 'Hỏi đường',
            vocab: [
              { term: 'turn left', meaningVi: 'rẽ trái', example: 'Turn left at the bank.' },
              { term: 'straight', meaningVi: 'thẳng', example: 'Go straight for two blocks.' },
              { term: 'opposite', meaningVi: 'đối diện', example: 'The café is opposite the school.' },
              { term: 'corner', meaningVi: 'góc đường', example: 'The pharmacy is on the corner.' },
              { term: 'far', meaningVi: 'xa', example: 'Is it far from here?' },
              { term: 'between', meaningVi: 'ở giữa', example: 'The bakery is between the bank and the market.' },
            ],
            grammar: {
              titleEn: 'Giving directions',
              titleVi: 'Chỉ đường',
              bodyEn: 'Use imperatives: Turn left, Go straight. Describe position with opposite, between, on the corner.',
              bodyVi: 'Chỉ đường dùng câu mệnh lệnh: Turn left (rẽ trái), Go straight (đi thẳng). Mô tả vị trí: opposite (đối diện), between (ở giữa), on the corner (ở góc đường).',
              examples: [
                { en: 'Turn right at the traffic lights.', vi: 'Rẽ phải ở đèn giao thông.' },
                { en: "Go straight and it's on your left.", vi: 'Đi thẳng, nó nằm bên trái bạn.' },
                { en: 'Excuse me, where is the bank?', vi: 'Xin lỗi, ngân hàng ở đâu ạ?' },
              ],
            },
            exercises: [
              { kind: 'mc', question: "'Rẽ trái' trong tiếng Anh là gì?", options: ['Turn left', 'Turn right', 'Go straight', 'Stop'], answer: 'Turn left' },
              { kind: 'mc', question: 'The café is ___ the school. (đối diện)', options: ['opposite', 'between', 'far', 'corner'], answer: 'opposite' },
              { kind: 'fill', sentence: 'Go ___ for two blocks.', choices: ['straight', 'left', 'far'], answer: 'straight' },
              { kind: 'fill', sentence: 'Excuse me, ___ is the bank?', choices: ['where', 'what', 'who'], answer: 'where' },
              { kind: 'order', words: ['Turn', 'left', 'at', 'the', 'traffic', 'lights'], answer: 'Turn left at the traffic lights' },
              { kind: 'listen', text: 'The pharmacy is on the corner.', options: ['The pharmacy is on the corner.', 'The pharmacy is opposite the corner.', 'The bakery is on the corner.'], answer: 'The pharmacy is on the corner.' },
            ],
          },
          {
            id: 'adults_u1_l3',
            emoji: '💼',
            titleEn: 'Small Talk at Work',
            titleVi: 'Trò chuyện nơi công sở',
            vocab: [
              { term: 'weekend', meaningVi: 'cuối tuần', example: 'How was your weekend?' },
              { term: 'weather', meaningVi: 'thời tiết', example: "Lovely weather today, isn't it?" },
              { term: 'meeting', meaningVi: 'cuộc họp', example: 'I have a meeting at ten.' },
              { term: 'project', meaningVi: 'dự án', example: 'The new project starts on Monday.' },
              { term: 'traffic', meaningVi: 'giao thông', example: 'The traffic was terrible this morning.' },
              { term: 'plan', meaningVi: 'kế hoạch', example: 'Do you have any plans for the holiday?' },
            ],
            grammar: {
              titleEn: 'Small-talk questions',
              titleVi: 'Câu hỏi xã giao',
              bodyEn: 'Friendly questions: How was…? What do you think of…? Did you…?',
              bodyVi: 'Câu hỏi xã giao thân thiện: How was…? (…thế nào?), What do you think of…? (Bạn thấy… sao?), Did you…? (Bạn đã… chưa?)',
              examples: [
                { en: 'How was your weekend?', vi: 'Cuối tuần của bạn thế nào?' },
                { en: 'Did you watch the match last night?', vi: 'Tối qua bạn có xem trận đấu không?' },
                { en: 'What do you think of the new project?', vi: 'Bạn thấy dự án mới thế nào?' },
              ],
            },
            exercises: [
              { kind: 'mc', question: 'Câu mở đầu xã giao phù hợp nơi công sở:', options: ['How was your weekend?', 'How old are you?', 'How much money do you make?', 'Why are you late?'], answer: 'How was your weekend?' },
              { kind: 'mc', question: "'Cuộc họp' trong tiếng Anh là gì?", options: ['meeting', 'greeting', 'eating', 'seating'], answer: 'meeting' },
              { kind: 'fill', sentence: 'The ___ was terrible this morning.', choices: ['traffic', 'weather', 'weekend'], answer: 'traffic' },
              { kind: 'fill', sentence: '___ you watch the match last night?', choices: ['Did', 'Do', 'Does'], answer: 'Did' },
              { kind: 'order', words: ['How', 'was', 'your', 'weekend'], answer: 'How was your weekend' },
              { kind: 'listen', text: 'I have a meeting at ten.', options: ['I have a meeting at ten.', 'I have a meeting at two.', 'I had a meeting at ten.'], answer: 'I have a meeting at ten.' },
            ],
          },
        ],
      },
    ],
  },
];

export function allLessons(course: Course) {
  return course.units.flatMap((u) => u.lessons);
}

export function recommendedCourse(classLevels: string[]): Course {
  for (const course of COURSES) {
    if (classLevels.some((lv) => course.levelKeywords.some((k) => lv.includes(k)))) return course;
  }
  return COURSES[1]; // teens as a sensible default
}
