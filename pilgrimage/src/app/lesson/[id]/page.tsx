import { notFound } from 'next/navigation';
import { WORLDS, lessonById } from '@/content/worlds';
import { LessonPlayer } from '@/components/LessonPlayer';

export function generateStaticParams() {
  return WORLDS.flatMap((w) => w.lessons.map((l) => ({ id: l.id })));
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = lessonById(id);
  if (!found) notFound();
  return <LessonPlayer world={found.world} lesson={found.lesson} />;
}
