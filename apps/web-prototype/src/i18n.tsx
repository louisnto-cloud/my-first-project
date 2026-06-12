import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'vi' | 'en';

const STRINGS: Record<string, { en: string; vi: string }> = {
  'app.name': { en: 'E’TOP English', vi: 'Anh Ngữ E’TOP' },
  'app.tagline': { en: 'Learn – Achieve – Lead', vi: 'Learn – Achieve – Lead' },
  'app.footer': {
    en: 'E’TOP English Center · 166 Nguyễn Hội, Phú Trinh, Phan Thiết · ☎ 089 949 0222',
    vi: 'Trung tâm Anh Ngữ E’TOP · 166 Nguyễn Hội, P. Phú Trinh, TP. Phan Thiết · ☎ 089 949 0222',
  },

  'login.welcome': { en: 'Welcome back!', vi: 'Chào mừng trở lại!' },
  'login.email': { en: 'Email', vi: 'Email' },
  'login.password': { en: 'Password', vi: 'Mật khẩu' },
  'login.signin': { en: 'Sign in', vi: 'Đăng nhập' },
  'login.error': { en: 'Wrong email or password.', vi: 'Sai email hoặc mật khẩu.' },
  'login.demo': { en: 'Demo accounts (password: etop123)', vi: 'Tài khoản dùng thử (mật khẩu: etop123)' },
  'login.demo.student': { en: 'Student', vi: 'Học viên' },
  'login.demo.parent': { en: 'Parent', vi: 'Phụ huynh' },
  'login.demo.teacher': { en: 'Teacher', vi: 'Giáo viên' },
  'login.demo.owner': { en: 'Owner', vi: 'Chủ trung tâm' },

  'nav.home': { en: 'Home', vi: 'Trang chủ' },
  'nav.grades': { en: 'Grades', vi: 'Điểm số' },
  'nav.schedule': { en: 'Schedule', vi: 'Lịch học' },
  'nav.homework': { en: 'Homework', vi: 'Bài tập' },
  'nav.practice': { en: 'Practice', vi: 'Luyện tập' },

  'common.logout': { en: 'Log out', vi: 'Đăng xuất' },
  'common.points': { en: 'points', vi: 'điểm thưởng' },
  'common.dayStreak': { en: 'day streak', vi: 'ngày liên tiếp' },
  'common.save': { en: 'Save', vi: 'Lưu' },
  'common.cancel': { en: 'Cancel', vi: 'Hủy' },
  'common.add': { en: 'Add', vi: 'Thêm' },
  'common.back': { en: 'Back', vi: 'Quay lại' },
  'common.class': { en: 'Class', vi: 'Lớp' },
  'common.teacher': { en: 'Teacher', vi: 'Giáo viên' },
  'common.room': { en: 'Room', vi: 'Phòng' },
  'common.students': { en: 'students', vi: 'học viên' },
  'common.today': { en: 'Today', vi: 'Hôm nay' },
  'common.average': { en: 'Average', vi: 'Trung bình' },
  'common.resetDemo': { en: 'Reset demo data', vi: 'Khôi phục dữ liệu mẫu' },

  'dash.hello': { en: 'Hello', vi: 'Chào' },
  'dash.nextClass': { en: 'Next class', vi: 'Buổi học tiếp theo' },
  'dash.noClass': { en: 'No upcoming class this week', vi: 'Tuần này không còn buổi học nào' },
  'dash.latestScore': { en: 'Latest score', vi: 'Điểm mới nhất' },
  'dash.noScores': { en: 'No scores yet', vi: 'Chưa có điểm' },
  'dash.homeworkDue': { en: 'Homework due soon', vi: 'Bài tập sắp đến hạn' },
  'dash.allDone': { en: 'All homework done. Amazing! 🎉', vi: 'Đã làm hết bài tập. Tuyệt vời! 🎉' },
  'dash.practiceNow': { en: 'Practice now', vi: 'Luyện tập ngay' },
  'dash.keepStreak': { en: 'Practice today to keep your streak!', vi: 'Luyện tập hôm nay để giữ chuỗi nhé!' },
  'dash.streakSafe': { en: 'Streak safe for today. See you tomorrow!', vi: 'Hôm nay đã luyện tập rồi. Hẹn mai nhé!' },
  'dash.myBadges': { en: 'My badges', vi: 'Huy hiệu của tôi' },
  'dash.leaderboard': { en: 'Class leaderboard', vi: 'Bảng xếp hạng lớp' },

  'grades.title': { en: 'My grades', vi: 'Điểm của tôi' },
  'grades.progress': { en: 'Progress over time', vi: 'Tiến bộ theo thời gian' },
  'grades.skills': { en: 'Skills (latest test)', vi: 'Kỹ năng (bài test gần nhất)' },
  'grades.teacherComment': { en: 'Teacher comment', vi: 'Nhận xét của giáo viên' },
  'grades.history': { en: 'All results', vi: 'Tất cả kết quả' },
  'grades.empty': { en: 'No results yet — your teacher will add them soon!', vi: 'Chưa có kết quả — giáo viên sẽ sớm cập nhật nhé!' },

  'skills.listening': { en: 'Listening', vi: 'Nghe' },
  'skills.speaking': { en: 'Speaking', vi: 'Nói' },
  'skills.reading': { en: 'Reading', vi: 'Đọc' },
  'skills.writing': { en: 'Writing', vi: 'Viết' },

  'schedule.title': { en: 'My schedule', vi: 'Lịch học của tôi' },
  'schedule.thisWeek': { en: 'Weekly timetable', vi: 'Thời khóa biểu tuần' },

  'hw.title': { en: 'My homework', vi: 'Bài tập của tôi' },
  'hw.due': { en: 'Due', vi: 'Hạn nộp' },
  'hw.overdue': { en: 'Overdue', vi: 'Quá hạn' },
  'hw.markDone': { en: 'Mark as done', vi: 'Đánh dấu đã làm' },
  'hw.done': { en: 'Done', vi: 'Đã làm' },
  'hw.todo': { en: 'To do', vi: 'Cần làm' },
  'hw.empty': { en: 'No homework right now. Enjoy! 🎈', vi: 'Hiện không có bài tập. Tận hưởng nhé! 🎈' },
  'hw.points': { en: '+5 points', vi: '+5 điểm thưởng' },
  'hw.all': { en: 'All', vi: 'Tất cả' },
  'hw.dueToday': { en: 'Due today!', vi: 'Hạn hôm nay!' },
  'hw.dueTomorrow': { en: 'Due tomorrow', vi: 'Hạn ngày mai' },
  'hw.daysLeft': { en: 'days left', vi: 'ngày nữa' },

  'events.title': { en: 'Upcoming events', vi: 'Sự kiện sắp tới' },
  'events.manage': { en: 'Events & meetings', vi: 'Sự kiện & lịch hẹn' },
  'events.add': { en: 'Add event', vi: 'Thêm sự kiện' },
  'events.titlePh': { en: 'Event title', vi: 'Tên sự kiện' },
  'events.kind.meeting': { en: 'Meeting', vi: 'Cuộc họp' },
  'events.kind.test': { en: 'Test', vi: 'Kiểm tra' },
  'events.kind.holiday': { en: 'Holiday', vi: 'Nghỉ lễ' },
  'events.kind.activity': { en: 'Activity', vi: 'Hoạt động' },
  'events.allCenter': { en: 'Whole center', vi: 'Toàn trung tâm' },
  'events.none': { en: 'No upcoming events.', vi: 'Chưa có sự kiện nào sắp tới.' },

  'practice.title': { en: 'Practice', vi: 'Luyện tập' },
  'practice.subtitle': { en: 'Practice every day to grow your streak 🔥', vi: 'Luyện tập mỗi ngày để tăng chuỗi 🔥' },
  'practice.flashcards': { en: 'Flashcards', vi: 'Thẻ từ vựng' },
  'practice.quiz': { en: 'Quiz', vi: 'Trắc nghiệm' },
  'practice.words': { en: 'words', vi: 'từ' },
  'practice.tapToFlip': { en: 'Tap the card to flip', vi: 'Chạm vào thẻ để lật' },
  'practice.know': { en: 'I knew it ✅', vi: 'Mình nhớ ✅' },
  'practice.dontKnow': { en: 'Still learning 🔁', vi: 'Chưa nhớ 🔁' },
  'practice.complete': { en: 'Session complete!', vi: 'Hoàn thành!' },
  'practice.youKnew': { en: 'You knew', vi: 'Bạn nhớ' },
  'practice.correct': { en: 'Correct', vi: 'Đúng' },
  'practice.earned': { en: 'points earned', vi: 'điểm thưởng nhận được' },
  'practice.again': { en: 'Practice again', vi: 'Luyện tập tiếp' },
  'practice.whichMeaning': { en: 'What does this word mean?', vi: 'Từ này có nghĩa là gì?' },

  'nav.learn': { en: 'Learn', vi: 'Học tập' },
  'learn.title': { en: 'Learn', vi: 'Học tập' },
  'learn.programs': { en: 'My programs', vi: 'Chương trình học' },
  'learn.forYourClass': { en: 'For your class', vi: 'Dành cho lớp của bạn' },
  'learn.lessons': { en: 'lessons', vi: 'bài học' },
  'learn.completed': { en: 'completed', vi: 'đã hoàn thành' },
  'learn.locked': { en: 'Complete the previous lesson to unlock', vi: 'Hoàn thành bài trước để mở khóa' },
  'learn.start': { en: 'Start', vi: 'Bắt đầu' },
  'learn.review': { en: 'Review', vi: 'Ôn lại' },
  'learn.newWords': { en: 'New words', vi: 'Từ mới' },
  'learn.grammar': { en: 'Grammar', vi: 'Ngữ pháp' },
  'learn.examples': { en: 'Examples', vi: 'Ví dụ' },
  'learn.exercises': { en: 'Exercises', vi: 'Bài tập' },
  'learn.continue': { en: 'Continue', vi: 'Tiếp tục' },
  'learn.check': { en: 'Check', vi: 'Kiểm tra' },
  'learn.correct': { en: 'Correct! 🎉', vi: 'Chính xác! 🎉' },
  'learn.incorrect': { en: 'Not quite…', vi: 'Chưa đúng rồi…' },
  'learn.correctIs': { en: 'Correct answer:', vi: 'Đáp án đúng:' },
  'learn.listenTap': { en: 'Tap to listen, then choose what you heard', vi: 'Chạm để nghe, rồi chọn câu bạn nghe được' },
  'learn.orderTap': { en: 'Tap the words in the right order', vi: 'Chạm các từ theo đúng thứ tự' },
  'learn.chooseFill': { en: 'Choose the missing word', vi: 'Chọn từ còn thiếu' },
  'learn.chooseAnswer': { en: 'Choose the correct answer', vi: 'Chọn đáp án đúng' },
  'learn.lessonDone': { en: 'Lesson complete!', vi: 'Hoàn thành bài học!' },
  'learn.lessonFailed': { en: 'Almost! Try once more 💪', vi: 'Gần được rồi! Thử lại nhé 💪' },
  'learn.tryAgain': { en: 'Try again', vi: 'Làm lại' },
  'learn.backToCourse': { en: 'Back to lessons', vi: 'Về danh sách bài học' },
  'learn.vocabPractice': { en: 'Vocabulary practice', vi: 'Luyện tập từ vựng' },
  'learn.dailyGoal': { en: 'Daily goal', vi: 'Mục tiêu hôm nay' },
  'learn.goalDone': { en: 'Daily goal reached — amazing! 🎉', vi: 'Đã đạt mục tiêu hôm nay — tuyệt vời! 🎉' },

  'badges.title': { en: 'Badges', vi: 'Huy hiệu' },
  'badges.locked': { en: 'Locked', vi: 'Chưa mở' },

  'parent.title': { en: 'Parent view', vi: 'Góc phụ huynh' },
  'parent.childProgress': { en: "'s progress", vi: ' — tiến bộ học tập' },
  'parent.readonly': { en: 'Read-only view. Contact the center for any questions.', vi: 'Chế độ chỉ xem. Mọi thắc mắc xin liên hệ trung tâm.' },
  'parent.homework': { en: 'Homework status', vi: 'Tình hình bài tập' },

  'feedback.title': { en: 'Feedback', vi: 'Đóng góp ý kiến' },
  'feedback.subtitle': { en: 'Your ideas help E’TOP get better 💜', vi: 'Ý kiến của bạn giúp E’TOP tốt hơn 💜' },
  'feedback.rating': { en: 'How happy are you with E’TOP?', vi: 'Bạn hài lòng với E’TOP thế nào?' },
  'feedback.placeholder': { en: 'Share your thoughts, suggestions, or concerns with the center…', vi: 'Chia sẻ ý kiến, góp ý hoặc điều bạn băn khoăn với trung tâm…' },
  'feedback.send': { en: 'Send feedback', vi: 'Gửi ý kiến' },
  'feedback.thanks': { en: 'Thank you for your feedback! 💜', vi: 'Cảm ơn bạn đã góp ý! 💜' },
  'feedback.mine': { en: 'Your feedback', vi: 'Ý kiến bạn đã gửi' },
  'feedback.inbox': { en: 'Feedback inbox', vi: 'Hộp thư góp ý' },
  'feedback.empty': { en: 'No feedback yet.', vi: 'Chưa có góp ý nào.' },
  'feedback.cta': { en: 'Have an idea or suggestion?', vi: 'Bạn có ý kiến hoặc đề xuất?' },

  'teach.overview': { en: 'Overview', vi: 'Tổng quan' },
  'teach.myClasses': { en: 'My classes', vi: 'Lớp của tôi' },
  'teach.allClasses': { en: 'All classes', vi: 'Tất cả lớp' },
  'teach.totalStudents': { en: 'Students', vi: 'Học viên' },
  'teach.classes': { en: 'Classes', vi: 'Lớp học' },
  'teach.centerAvg': { en: 'Center average', vi: 'Điểm TB trung tâm' },
  'teach.hwRate': { en: 'Homework completion', vi: 'Tỷ lệ làm bài tập' },
  'teach.students': { en: 'Students', vi: 'Học viên' },
  'teach.gradebook': { en: 'Gradebook', vi: 'Sổ điểm' },
  'teach.homework': { en: 'Homework', vi: 'Bài tập' },
  'teach.vocab': { en: 'Vocabulary', vi: 'Từ vựng' },
  'teach.newAssessment': { en: 'New assessment', vi: 'Bài kiểm tra mới' },
  'teach.assessmentTitle': { en: 'Title', vi: 'Tên bài' },
  'teach.kind.test': { en: 'Test', vi: 'Bài test' },
  'teach.kind.quiz': { en: 'Quiz', vi: 'Quiz' },
  'teach.date': { en: 'Date', vi: 'Ngày' },
  'teach.enterScores': { en: 'Enter scores', vi: 'Nhập điểm' },
  'teach.score': { en: 'Score', vi: 'Điểm' },
  'teach.comment': { en: 'Comment', vi: 'Nhận xét' },
  'teach.saved': { en: 'Saved ✓', vi: 'Đã lưu ✓' },
  'teach.newHomework': { en: 'New homework', vi: 'Giao bài tập mới' },
  'teach.hwTitle': { en: 'Title', vi: 'Tiêu đề' },
  'teach.hwDesc': { en: 'Instructions', vi: 'Hướng dẫn' },
  'teach.dueDate': { en: 'Due date', vi: 'Hạn nộp' },
  'teach.doneBy': { en: 'done', vi: 'đã làm' },
  'teach.newVocabList': { en: 'New vocabulary list', vi: 'Tạo danh sách từ mới' },
  'teach.vocabHint': { en: 'One word per line: word = meaning = example sentence', vi: 'Mỗi dòng một từ: từ = nghĩa = câu ví dụ' },
  'teach.listTitle': { en: 'List title', vi: 'Tên danh sách' },
  'teach.avgScore': { en: 'Avg score', vi: 'Điểm TB' },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);
const LANG_KEY = 'etop-lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'vi'));

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = STRINGS[key];
      if (!entry) return key;
      return entry[lang] ?? entry.en;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

export const WEEKDAYS: Record<Lang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  vi: ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
};

export function fmtDate(isoDate: string, lang: Lang): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return lang === 'vi' ? `${d}/${m}/${y}` : new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
