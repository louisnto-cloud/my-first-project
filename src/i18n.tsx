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
  'a11y.skipToContent': { en: 'Skip to content', vi: 'Bỏ qua tới nội dung' },
  'a11y.primaryNav': { en: 'Primary navigation', vi: 'Điều hướng chính' },
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
