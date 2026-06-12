import type { Assessment, ClassInfo, DB, Homework, Score, User, VocabList } from './types';
import { SKILLS } from './types';
import { clamp, daysAgo, rng } from './lib';

const STUDENT_NAMES = [
  'Trần Đức Minh', 'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Châu', 'Phạm Quốc Đạt',
  'Hoàng Thảo My', 'Vũ Gia Hân', 'Đặng Hoài Nam', 'Bùi Khánh Linh', 'Đỗ Mạnh Hùng',
  'Ngô Thanh Mai', 'Dương Minh Quân', 'Lý Thu Ngân', 'Trịnh Văn Phúc', 'Mai Xuân Quỳnh',
  'Cao Bảo Sơn', 'Đinh Thúy Trang', 'Lâm Tuấn Tú', 'Phan Hải Uyên', 'Võ Đình Vinh',
  'Tạ Yến Vy', 'Nguyễn Hữu Khoa', 'Trần Bảo Ngọc', 'Lê Thành Long', 'Phạm Diễm My',
  'Hoàng Anh Tuấn', 'Vũ Ngọc Ánh', 'Đặng Quang Huy', 'Bùi Thị Hoa', 'Đỗ Tiến Dũng',
  'Ngô Gia Bảo', 'Dương Thùy Dung', 'Lý Văn Thái', 'Trịnh Kim Oanh', 'Mai Đức Thịnh',
  'Cao Mỹ Lệ', 'Đinh Công Minh', 'Lâm Như Ý', 'Phan Văn Lộc', 'Võ Thị Thu',
];

const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🐰', '🦁', '🐨', '🐵', '🦄', '🐢', '🐳', '🦉', '🐝', '🦋', '🐙', '🦜'];

const COMMENTS = [
  'Great improvement in speaking this unit — keep it up!',
  'Excellent vocabulary use. Work a little more on listening.',
  'Very focused in class. Reading is getting much stronger.',
  'Good effort! Practice writing full sentences at home.',
  'Wonderful participation. Pronunciation is improving fast.',
  'Solid result. Review the grammar from Unit 3 before next test.',
];

interface ClassSeed {
  id: string;
  name: string;
  level: string;
  emoji: string;
  color: string;
  teacher: number; // index into teacher list
  schedule: ClassInfo['schedule'];
  vocabTheme: 'kids' | 'teens' | 'ielts' | 'adults';
}

const CLASS_SEEDS: ClassSeed[] = [
  { id: 'c1', name: 'Starters A', level: 'Starters (6–8)', emoji: '🐣', color: 'bg-rose-400', teacher: 1, vocabTheme: 'kids', schedule: [{ weekday: 1, start: '17:30', end: '19:00', room: 'P.101' }, { weekday: 4, start: '17:30', end: '19:00', room: 'P.101' }] },
  { id: 'c2', name: 'Movers B', level: 'Movers (9–11)', emoji: '🚀', color: 'bg-amber-400', teacher: 1, vocabTheme: 'kids', schedule: [{ weekday: 2, start: '17:30', end: '19:00', room: 'P.102' }, { weekday: 5, start: '17:30', end: '19:00', room: 'P.102' }] },
  { id: 'c3', name: 'Teens A2', level: 'Teens A2', emoji: '⭐', color: 'bg-emerald-400', teacher: 2, vocabTheme: 'teens', schedule: [{ weekday: 1, start: '19:15', end: '20:45', room: 'P.103' }, { weekday: 4, start: '19:15', end: '20:45', room: 'P.103' }] },
  { id: 'c4', name: 'Teens B1', level: 'Teens B1', emoji: '🔥', color: 'bg-sky-400', teacher: 2, vocabTheme: 'teens', schedule: [{ weekday: 2, start: '19:15', end: '20:45', room: 'P.201' }, { weekday: 5, start: '19:15', end: '20:45', room: 'P.201' }] },
  { id: 'c5', name: 'IELTS Prep', level: 'IELTS 5.5+', emoji: '🎯', color: 'bg-violet-400', teacher: 0, vocabTheme: 'ielts', schedule: [{ weekday: 3, start: '19:15', end: '21:00', room: 'P.202' }, { weekday: 6, start: '9:00', end: '10:45', room: 'P.202' }] },
  { id: 'c6', name: 'Adults Conversation', level: 'Adults B1+', emoji: '☕', color: 'bg-orange-400', teacher: 0, vocabTheme: 'adults', schedule: [{ weekday: 3, start: '18:00', end: '19:30', room: 'P.203' }, { weekday: 0, start: '9:00', end: '10:30', room: 'P.203' }] },
];

const VOCAB: Record<ClassSeed['vocabTheme'], { title: string; words: [string, string, string][] }[]> = {
  kids: [
    {
      title: 'Unit 3 – Animals',
      words: [
        ['elephant', 'con voi', 'The elephant is very big.'],
        ['rabbit', 'con thỏ', 'The rabbit can jump high.'],
        ['turtle', 'con rùa', 'The turtle is slow but smart.'],
        ['monkey', 'con khỉ', 'The monkey likes bananas.'],
        ['dolphin', 'cá heo', 'Dolphins live in the sea.'],
        ['butterfly', 'con bướm', 'The butterfly has beautiful wings.'],
        ['parrot', 'con vẹt', 'My parrot can say hello!'],
        ['tiger', 'con hổ', 'The tiger has orange and black stripes.'],
      ],
    },
    {
      title: 'Unit 4 – Food & Drinks',
      words: [
        ['noodles', 'mì / bún', 'I eat noodles for breakfast.'],
        ['watermelon', 'dưa hấu', 'Watermelon is sweet and juicy.'],
        ['vegetables', 'rau củ', 'Vegetables make you strong.'],
        ['chicken', 'thịt gà', 'We had chicken for dinner.'],
        ['milk', 'sữa', 'I drink milk every morning.'],
        ['mango', 'quả xoài', 'This mango is delicious.'],
        ['bread', 'bánh mì', 'Dad buys fresh bread every day.'],
        ['juice', 'nước ép', 'Orange juice is my favourite.'],
      ],
    },
  ],
  teens: [
    {
      title: 'Unit 5 – School Life',
      words: [
        ['assignment', 'bài tập được giao', 'I finished my assignment before dinner.'],
        ['schedule', 'thời khóa biểu', 'My schedule is full on Mondays.'],
        ['improve', 'cải thiện', 'I want to improve my speaking.'],
        ['confident', 'tự tin', 'She feels confident before the exam.'],
        ['classmate', 'bạn cùng lớp', 'My classmates are very friendly.'],
        ['knowledge', 'kiến thức', 'Reading gives you knowledge.'],
        ['challenge', 'thử thách', 'This exercise is a real challenge.'],
        ['achieve', 'đạt được', 'You can achieve your goals.'],
      ],
    },
    {
      title: 'Unit 6 – Environment',
      words: [
        ['pollution', 'ô nhiễm', 'Air pollution is a big problem.'],
        ['recycle', 'tái chế', 'We recycle plastic bottles at school.'],
        ['environment', 'môi trường', 'We must protect the environment.'],
        ['climate', 'khí hậu', 'The climate is changing quickly.'],
        ['plastic', 'nhựa', 'Say no to plastic bags.'],
        ['energy', 'năng lượng', 'Solar energy is clean energy.'],
        ['protect', 'bảo vệ', 'Everyone can protect nature.'],
        ['wildlife', 'động vật hoang dã', 'Vietnam has amazing wildlife.'],
      ],
    },
  ],
  ielts: [
    {
      title: 'Academic Word List 1',
      words: [
        ['significant', 'đáng kể', 'There was a significant increase in sales.'],
        ['analyze', 'phân tích', 'We need to analyze the data carefully.'],
        ['consequence', 'hậu quả', 'Pollution has serious consequences.'],
        ['demonstrate', 'chứng minh', 'The chart demonstrates a clear trend.'],
        ['furthermore', 'hơn nữa', 'Furthermore, the cost is decreasing.'],
        ['proportion', 'tỷ lệ', 'A large proportion of students agree.'],
        ['decline', 'suy giảm', 'Sales declined sharply in 2024.'],
        ['fluctuate', 'dao động', 'Prices fluctuated during the year.'],
      ],
    },
  ],
  adults: [
    {
      title: 'Travel & Work',
      words: [
        ['itinerary', 'lịch trình', 'Our itinerary includes three cities.'],
        ['colleague', 'đồng nghiệp', 'My colleagues are supportive.'],
        ['deadline', 'hạn chót', 'The deadline is on Friday.'],
        ['negotiate', 'đàm phán', 'We negotiated a better price.'],
        ['reservation', 'đặt chỗ', 'I made a reservation for two.'],
        ['experience', 'kinh nghiệm / trải nghiệm', 'It was an unforgettable experience.'],
        ['opportunity', 'cơ hội', 'This job is a great opportunity.'],
        ['recommend', 'giới thiệu / gợi ý', 'Can you recommend a good hotel?'],
      ],
    },
  ],
};

const ASSESSMENT_PLAN: { title: string; kind: 'test' | 'quiz'; ago: number }[] = [
  { title: 'Unit 1 Quiz', kind: 'quiz', ago: 56 },
  { title: 'Unit 1 Test', kind: 'test', ago: 45 },
  { title: 'Unit 2 Quiz', kind: 'quiz', ago: 32 },
  { title: 'Mid-term Test', kind: 'test', ago: 21 },
  { title: 'Unit 3 Quiz', kind: 'quiz', ago: 12 },
  { title: 'Unit 3 Test', kind: 'test', ago: 4 },
];

export function buildSeed(): DB {
  const r = rng(20260611);

  const teachers: User[] = [
    { id: 't0', role: 'admin', name: 'Ms. Zhao', email: 'zhao@etop.vn', password: 'etop123', avatar: '👩‍💼', classIds: ['c5', 'c6'], childIds: [] },
    { id: 't1', role: 'teacher', name: 'Ms. Lan', email: 'lan@etop.vn', password: 'etop123', avatar: '👩‍🏫', classIds: ['c1', 'c2'], childIds: [] },
    { id: 't2', role: 'teacher', name: 'Mr. David', email: 'david@etop.vn', password: 'etop123', avatar: '👨‍🏫', classIds: ['c3', 'c4'], childIds: [] },
  ];

  const classes: ClassInfo[] = CLASS_SEEDS.map((c) => ({
    id: c.id, name: c.name, level: c.level, emoji: c.emoji, color: c.color,
    teacherId: teachers[c.teacher].id, schedule: c.schedule,
  }));

  // Distribute the 40 students: 7,7,7,7,6,6 — Minh (index 0) goes to Teens B1
  const sizes = [7, 7, 7, 7, 6, 6];
  const students: User[] = [];
  let nameIdx = 1;
  CLASS_SEEDS.forEach((c, ci) => {
    const n = c.id === 'c4' ? sizes[ci] - 1 : sizes[ci];
    for (let i = 0; i < n; i++) {
      const idx = nameIdx++;
      students.push({
        id: `s${idx}`, role: 'student', name: STUDENT_NAMES[idx],
        email: `s${idx}@etop.vn`, password: 'etop123',
        avatar: AVATARS[idx % AVATARS.length], classIds: [c.id], childIds: [],
      });
    }
  });
  const minh: User = {
    id: 's0', role: 'student', name: STUDENT_NAMES[0], email: 'minh@etop.vn',
    password: 'etop123', avatar: '🦊', classIds: ['c4'], childIds: [],
  };
  students.unshift(minh);

  const parent: User = {
    id: 'p0', role: 'parent', name: 'Trần Văn Hùng', email: 'phuhuynh@etop.vn',
    password: 'etop123', avatar: '👨‍👦', classIds: [], childIds: ['s0'],
  };

  const users = [...teachers, ...students, parent];

  const assessments: Assessment[] = [];
  const scores: Score[] = [];
  const ability = new Map<string, number>();
  students.forEach((s) => ability.set(s.id, 5.5 + r() * 3.5));
  // Make the demo student clearly improving
  ability.set('s0', 7.2);

  classes.forEach((cls) => {
    ASSESSMENT_PLAN.forEach((plan, pi) => {
      const a: Assessment = {
        id: `${cls.id}_a${pi}`, classId: cls.id, title: plan.title,
        kind: plan.kind, date: daysAgo(plan.ago), maxScore: 10,
      };
      assessments.push(a);
      const roster = students.filter((s) => s.classIds.includes(cls.id));
      roster.forEach((st) => {
        const base = ability.get(st.id)! + pi * 0.15 + (r() - 0.5) * 1.6;
        const val = clamp(Math.round(base * 2) / 2, 3, 10);
        const sc: Score = { id: `${a.id}_${st.id}`, assessmentId: a.id, studentId: st.id, score: val };
        if (plan.kind === 'test') {
          sc.skills = {};
          SKILLS.forEach((sk) => {
            sc.skills![sk] = clamp(Math.round((val + (r() - 0.5) * 2) * 2) / 2, 2, 10);
          });
          if (pi === ASSESSMENT_PLAN.length - 1 || r() > 0.5) {
            sc.comment = COMMENTS[Math.floor(r() * COMMENTS.length)];
          }
        }
        scores.push(sc);
      });
    });
  });

  const homework: Homework[] = [];
  const homeworkStatus: DB['homeworkStatus'] = [];
  classes.forEach((cls, ci) => {
    const items: { title: string; description: string; assigned: number; due: number }[] = [
      { title: 'Workbook p.34–35', description: 'Complete exercises 1–4 in the workbook. Write full sentences.', assigned: 5, due: 2 },
      { title: 'Vocabulary review', description: 'Learn the new unit words and write one example sentence for each.', assigned: 2, due: -1 },
      { title: 'Speaking video', description: 'Record a 1-minute video introducing your favourite hobby and send it to your teacher.', assigned: 1, due: -3 },
    ];
    items.forEach((it, ii) => {
      const hw: Homework = {
        id: `${cls.id}_h${ii}`, classId: cls.id, title: it.title,
        description: it.description, assignedDate: daysAgo(it.assigned), dueDate: daysAgo(it.due),
      };
      homework.push(hw);
      const roster = students.filter((s) => s.classIds.includes(cls.id));
      roster.forEach((st) => {
        const p = ii === 0 ? 0.75 : ii === 1 ? 0.4 : 0.15;
        if (r() < p) {
          homeworkStatus.push({ homeworkId: hw.id, studentId: st.id, done: true, doneAt: daysAgo(Math.max(0, it.due + 1)) });
        }
      });
    });
    void ci;
  });
  // Demo student finished the first one
  if (!homeworkStatus.some((h) => h.homeworkId === 'c4_h0' && h.studentId === 's0')) {
    homeworkStatus.push({ homeworkId: 'c4_h0', studentId: 's0', done: true, doneAt: daysAgo(3) });
  }

  const vocabLists: VocabList[] = [];
  CLASS_SEEDS.forEach((c) => {
    VOCAB[c.vocabTheme].forEach((list, li) => {
      vocabLists.push({
        id: `${c.id}_v${li}`, classId: c.id, title: list.title,
        words: list.words.map((w, wi) => ({ id: `${c.id}_v${li}_w${wi}`, term: w[0], meaningVi: w[1], example: w[2] })),
      });
    });
  });

  const practice: DB['practice'] = [];
  students.forEach((st) => {
    const sessions = Math.floor(r() * 10);
    for (let i = 0; i < sessions; i++) {
      practice.push({
        id: `seed_${st.id}_${i}`, studentId: st.id, date: daysAgo(Math.floor(r() * 14)),
        type: r() > 0.5 ? 'vocab' : 'quiz', points: 5 + Math.floor(r() * 6),
      });
    }
  });
  // Give the demo student a live 4-day streak (yesterday back) — practicing today extends it —
  // plus enough history to have earned a few badges
  [1, 2, 3, 4, 6, 7, 9, 11, 13].forEach((d, i) => {
    practice.push({ id: `seed_s0_streak${i}`, studentId: 's0', date: daysAgo(d), type: 'vocab', points: 8 });
  });

  // …and a strong latest test so the dashboard shines
  const minhLatest = scores.find((s) => s.assessmentId === 'c4_a5' && s.studentId === 's0');
  if (minhLatest) {
    minhLatest.score = 9;
    minhLatest.skills = { listening: 8.5, speaking: 9.5, reading: 9, writing: 8.5 };
    minhLatest.comment = COMMENTS[0];
  }

  const feedback: DB['feedback'] = [
    {
      id: 'fb1', userId: 'p0', date: daysAgo(6), rating: 5,
      message: 'Cảm ơn trung tâm, cháu Minh tiến bộ rõ rệt và rất thích đi học. Mong có thêm hoạt động ngoại khóa bằng tiếng Anh.',
    },
    {
      id: 'fb2', userId: students[students.length - 1].id, date: daysAgo(2), rating: 4,
      message: 'Lớp học vui và hiệu quả. Nếu có thêm buổi luyện nói với người nước ngoài thì tuyệt vời!',
    },
  ];

  // Demo student has finished the first self-study lesson
  const lessonProgress: DB['lessonProgress'] = [
    { studentId: 's0', lessonId: 'teens_u1_l1', bestPct: 100, stars: 3, attempts: 1, completedAt: daysAgo(2) },
  ];

  return { users, classes, assessments, scores, homework, homeworkStatus, vocabLists, practice, feedback, lessonProgress };
}
