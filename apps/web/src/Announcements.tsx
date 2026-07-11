import { useEffect, useState } from 'react';
import { api } from './api';
import { Icon } from './Icon';

// Bảng tin: center-wide posts from managers, class posts from teachers.
// One component serves everyone — `canPost` adds the composer.

interface Ann {
  id: string;
  classId: string | null;
  className: string | null;
  authorName: string;
  title: string;
  body: string;
  createdAt: string;
}

function timeAgo(iso: string, vi: boolean): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return vi ? `${mins || 1} phút trước` : `${mins || 1}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return vi ? `${hours} giờ trước` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return vi ? `${days} ngày trước` : `${days}d ago`;
}

export function Announcements({ lang, canPost = false }: { lang: 'vi' | 'en'; canPost?: boolean }) {
  const vi = lang === 'vi';
  const [items, setItems] = useState<Ann[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setItems(await api<Ann[]>('GET', '/announcements').catch(() => []));
  };
  useEffect(() => {
    void load();
    if (canPost) void api<typeof classes>('GET', '/classes').then(setClasses).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const post = async () => {
    if (title.trim().length < 2) return;
    try {
      await api('POST', '/announcements', { title: title.trim(), body: body.trim(), ...(classId ? { classId } : {}) });
      setTitle('');
      setBody('');
      setComposing(false);
      setMsg(vi ? '✅ Đã đăng — học viên & phụ huynh trong phạm vi sẽ thấy ngay.' : '✅ Posted.');
      setTimeout(() => setMsg(''), 4000);
      void load();
    } catch {
      setMsg(vi ? '❌ Chỉ quản lý đăng được tin toàn trung tâm — hãy chọn một lớp.' : '❌ Center-wide posts are managers-only — pick a class.');
      setTimeout(() => setMsg(''), 5000);
    }
  };

  if (items.length === 0 && !canPost) return null;

  return (
    <div className="card space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-extrabold text-ink"><Icon name="bell" size={18} className="text-violet-500" /> {vi ? 'Bảng tin' : 'News'}</h2>
        {canPost && !composing && (
          <button onClick={() => setComposing(true)} className="chip bg-violet-100 text-violet-700 transition active:scale-95"><Icon name="plus" size={13} /> {vi ? 'Đăng tin' : 'Post'}</button>
        )}
      </div>

      {msg && <div className="animate-rise rounded-2xl bg-emerald-50 p-2 text-center text-sm font-bold text-emerald-700">{msg}</div>}

      {composing && (
        <div className="animate-rise space-y-2 rounded-2xl border-2 border-dashed border-violet-200 p-3">
          <input className="input text-sm" placeholder={vi ? 'Tiêu đề (vd: Nghỉ lễ 2/9)' : 'Title'} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input text-sm" rows={3} placeholder={vi ? 'Nội dung thông báo…' : 'Message…'} value={body} onChange={(e) => setBody(e.target.value)} />
          <select className="input text-sm" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{vi ? '📣 Toàn trung tâm (chỉ quản lý)' : '📣 Whole center (managers)'}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{vi ? `Lớp ${c.name}` : `Class ${c.name}`}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setComposing(false)} className="btn-soft text-sm">{vi ? 'Hủy' : 'Cancel'}</button>
            <button onClick={post} disabled={title.trim().length < 2} className="btn-primary flex-1 text-sm">{vi ? 'Đăng' : 'Post'}</button>
          </div>
        </div>
      )}

      {items.length === 0 && <div className="rounded-2xl bg-slate-50 p-3 text-center text-sm font-bold text-slate-400">{vi ? 'Chưa có tin nào' : 'No posts yet'}</div>}

      {items.slice(0, expanded ? 20 : 3).map((a) => (
        <button key={a.id} onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="block w-full rounded-2xl bg-violet-50/70 p-3 text-left transition active:scale-[0.99]">
          <div className="flex items-center gap-2">
            <span className={`chip shrink-0 ${a.classId ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'}`}>
              {a.classId ? (vi ? `Lớp ${a.className}` : a.className) : vi ? 'Trung tâm' : 'Center'}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">{a.title}</span>
          </div>
          <div className={`mt-1 text-sm font-semibold text-slate-600 ${expanded === a.id ? '' : 'line-clamp-2'}`}>{a.body}</div>
          <div className="mt-1 text-[10px] font-bold text-slate-400">{a.authorName} · {timeAgo(a.createdAt, vi)}</div>
        </button>
      ))}
    </div>
  );
}
