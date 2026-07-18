import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useApp } from './store';
import type { Role } from './types';
import Login from './pages/Login';
import { Dashboard, FeedbackPage, Grades, Homework, Practice, Schedule, StudentLayout } from './pages/student/StudentApp';
import ParentPage from './pages/parent/ParentPage';
import { TeachHome, TeachLayout } from './pages/teach/TeachHome';
import ClassDetail from './pages/teach/ClassDetail';

function homeFor(role: Role): string {
  if (role === 'student') return '/app';
  if (role === 'parent') return '/parent';
  return '/teach';
}

function Root() {
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

function NotFound() {
  const { user } = useApp();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-violet-50 p-6 text-center dark:bg-slate-900">
      <div aria-hidden="true" className="text-6xl">🧭</div>
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-300">Not found</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
          That page doesn't exist — let's get you back home.
        </p>
      </div>
      <a href={`#${user ? homeFor(user.role) : '/login'}`} className="btn-primary">
        Take me home
      </a>
    </div>
  );
}
