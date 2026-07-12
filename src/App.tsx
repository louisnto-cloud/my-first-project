import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useApp } from './store';
import type { Role } from './types';
import Login from './pages/Login';
import { Dashboard, FeedbackPage, Grades, Homework, Practice, Schedule, StudentLayout } from './pages/student/StudentApp';
import ReadingWritingApp from './pages/student/ReadingWritingApp';
import ParentPage from './pages/parent/ParentPage';
import { TeachHome, TeachLayout } from './pages/teach/TeachHome';
import ClassDetail from './pages/teach/ClassDetail';

function homeFor(role: Role): string {
  if (role === 'student') return '/app';
  if (role === 'parent') return '/parent';
  return '/teach';
}

// The Read & Write programme is the app: it opens directly, no account needed.
// The school app remains reachable via /login for anyone who uses it.
function Root() {
  return (
    <div className="min-h-screen bg-violet-50 pb-8">
      <header className="border-b-4 border-violet-600 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-xl">📖</span>
          <div>
            <div className="text-lg font-black leading-tight text-violet-800">Read &amp; Write</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-600">Zero to Expert</div>
          </div>
        </div>
      </header>
      <ReadingWritingApp />
    </div>
  );
}

function SchoolRoot() {
  const { user } = useApp();
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Root />} />
        <Route path="/school" element={<SchoolRoot />} />
        <Route
          path="/app"
          element={
            <RequireRole roles={['student']}>
              <StudentLayout />
            </RequireRole>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="grades" element={<Grades />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="homework" element={<Homework />} />
          <Route path="practice" element={<Practice />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="read-write" element={<ReadingWritingApp />} />
        </Route>
        <Route
          path="/parent"
          element={
            <RequireRole roles={['parent']}>
              <ParentPage />
            </RequireRole>
          }
        />
        <Route
          path="/teach"
          element={
            <RequireRole roles={['teacher', 'admin']}>
              <TeachLayout />
            </RequireRole>
          }
        >
          <Route index element={<TeachHome />} />
          <Route path="class/:id" element={<ClassDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
