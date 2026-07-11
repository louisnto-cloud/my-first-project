import { useMemo, useState } from 'react';
import { LIBRARY, type Story } from '../../../data/library';
import { CURRICULUM, MONTH_COLORS } from '../../../data/curriculum';
import { awardOnce, isMonthUnlocked, XP, type RWProgress } from './engine';
import { useTTS } from './useTTS';
import { AudioNotice, AudioSettings, Confetti, NavButton, PlayButton, StepCard, TappableText, TextSizeToggle, useTextSize, XpChip } from './shared';

export default function Library({ progress, apply }: {
  progress: RWProgress;
  apply: (fn: (p: RWProgress) => RWProgress) => void;
}) {
  const [openStory, setOpenStory] = useState<Story | null>(null);

  if (openStory) {
    return <StoryReader story={openStory} progress={progress} apply={apply} onBack={() => setOpenStory(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
        <div className="text-3xl">📖</div>
        <h2 className="text-xl font-black">Story Library</h2>
        <p className="text-sm opacity-90">12 graded stories — read along with the audio, tap words you don't know, then take the quiz.</p>
      </div>

      {[1, 2, 3, 4, 5, 6].map((level) => {
        const month = CURRICULUM[level - 1];
        const c = MONTH_COLORS[month.color];
        const unlocked = isMonthUnlocked(progress, level - 1);
        const stories = LIBRARY.filter((s) => s.level === level);
        return (
          <div key={level}>
            <h3 className={`mb-2 text-sm font-black uppercase tracking-wide ${unlocked ? c.text : 'text-gray-300'}`}>
              Level {level} · {month.level} {!unlocked && '🔒'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {stories.map((s) => {
                const done = progress.completedStories.includes(s.id);
                return (
                  <button key={s.id} onClick={() => unlocked && setOpenStory(s)} disabled={!unlocked}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      unlocked ? `${done ? `${c.border} ${c.light}` : 'border-gray-200 bg-white'} hover:shadow-md` : 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className="text-2xl">{unlocked ? s.emoji : '🔒'}</div>
                    <div className="mt-1 font-black leading-tight text-gray-800">{s.title}</div>
                    <div className="mt-1 text-xs text-gray-400">~{s.minutes} min read {done && '· ✅ finished'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Story reader with karaoke read-along ────────────────────────────────────
function StoryReader({ story, progress, apply, onBack }: {
  story: Story;
  progress: RWProgress;
  apply: (fn: (p: RWProgress) => RWProgress) => void;
  onBack: () => void;
}) {
  const tts = useTTS();
  const [phase, setPhase] = useState<'read' | 'quiz' | 'done'>('read');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [textSize, toggleTextSize] = useTextSize();

  const month = CURRICULUM[story.level - 1];
  const c = MONTH_COLORS[month.color];
  const paragraphs = useMemo(() => story.text.split(/\n\s*\n/), [story.text]);
  // word offsets per paragraph so the global karaoke index maps onto paragraphs
  const paraBase = useMemo(() => {
    const bases: number[] = [];
    let count = 0;
    for (const p of paragraphs) { bases.push(count); count += p.split(/\s+/).filter(Boolean).length; }
    return bases;
  }, [paragraphs]);

  const fullText = useMemo(() => paragraphs.join(' '), [paragraphs]);
  const score = story.quiz.reduce((acc, q) => acc + ((answers[q.id] ?? '') === q.answer ? 1 : 0), 0);

  // One-time XP keys: each quiz question and the story-completion bonus pay only once ever
  const xpEntries = [
    ...story.quiz.filter((q) => (answers[q.id] ?? '') === q.answer).map((q) => ({ key: `story:${story.id}:${q.id}`, xp: XP.storyQuizCorrect })),
    { key: `storydone:${story.id}`, xp: XP.storyComplete },
  ];
  const pendingGain = xpEntries.filter((e) => !progress.xpKeys.includes(e.key)).reduce((a, e) => a + e.xp, 0);

  const finish = () => {
    apply((p) => {
      const { progress: p2 } = awardOnce(p, xpEntries);
      return {
        ...p2,
        completedStories: p2.completedStories.includes(story.id) ? p2.completedStories : [...p2.completedStories, story.id],
      };
    });
    setPhase('done');
  };

  return (
    <div className={`space-y-4 ${textSize === 'large' ? 'rw-lg' : ''}`}>
      <div className="flex items-center gap-3">
        <button onClick={() => { tts.stop(); onBack(); }} className="text-sm font-semibold text-gray-500 hover:text-gray-800">←</button>
        <div className="flex-1">
          <div className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{story.emoji} Level {story.level} story</div>
          <h2 className="font-black leading-tight text-gray-800">{story.title}</h2>
        </div>
        <TextSizeToggle size={textSize} onToggle={toggleTextSize} />
        <AudioSettings tts={tts} />
      </div>

      {phase === 'read' && (
        <StepCard>
          <AudioNotice tts={tts} />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">🎧 Read along — words light up</span>
            <PlayButton tts={tts} text={fullText} color={c.bg} highlight label="Read to me" />
          </div>
          <div className="space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-gray-800">
                <TappableText text={p.replace(/\s+/g, ' ')} onWord={(w) => w && tts.speak(w)} activeIndex={tts.wordIndex} baseIndex={paraBase[i]} />
              </p>
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="mb-1 text-xs font-black text-gray-600">📝 New words in this story</div>
            <div className="space-y-1">
              {story.vocab.map((v) => (
                <div key={v.word} className="flex items-baseline gap-2 text-sm">
                  <button onClick={() => tts.speak(v.word)} className={`font-black ${c.text}`}>{v.word} 🔊</button>
                  <span className="text-gray-600">{v.meaning}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-400">💡 Tap any word in the story to hear it.</p>
          <NavButton label="I've finished reading — Quiz me! →" onClick={() => { tts.stop(); setPhase('quiz'); }} color={c.bg} />
        </StepCard>
      )}

      {phase === 'quiz' && (
        <StepCard>
          <h3 className="font-black text-gray-800">🔍 Comprehension Quiz</h3>
          <div className="space-y-3">
            {story.quiz.map((q, i) => {
              const chosen = answers[q.id];
              return (
                <div key={q.id} className={`rounded-xl border-2 p-3 ${submitted ? (chosen === q.answer ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50') : 'border-gray-200'}`}>
                  <p className="mb-2 text-sm font-semibold text-gray-800">{i + 1}. {q.prompt}</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {q.options.map((opt) => (
                      <button key={opt} onClick={() => !submitted && setAnswers((prev) => ({ ...prev, [q.id]: opt }))} disabled={submitted}
                        className={`rounded-lg border-2 px-2 py-1.5 text-left text-xs font-semibold ${
                          submitted && opt === q.answer ? 'border-green-400 bg-green-100 text-green-800'
                            : submitted && chosen === opt ? 'border-red-400 bg-red-100 text-red-800'
                            : chosen === opt ? `${c.border} ${c.light} ${c.text}`
                            : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {!submitted ? (
            <NavButton label="Check Answers" onClick={() => setSubmitted(true)} color={c.bg} disabled={story.quiz.some((q) => !answers[q.id])} />
          ) : (
            <div className="text-center">
              <div className="font-black text-gray-800">{score} / {story.quiz.length} correct {pendingGain > 0 && <XpChip amount={pendingGain} />}</div>
              <NavButton label="Finish Story →" onClick={finish} color={c.bg} />
            </div>
          )}
        </StepCard>
      )}

      {phase === 'done' && (
        <StepCard>
          <Confetti />
          <div className="py-6 text-center">
            <div className="mb-3 text-6xl">{story.emoji}</div>
            <h3 className="text-2xl font-black text-gray-800">Story Complete!</h3>
            <p className="mt-2 text-gray-600">You read <strong>{story.title}</strong> and scored {score}/{story.quiz.length}.</p>
            <p className="mt-1 text-xs text-gray-400">🔁 This story's new words just joined your Review deck.</p>
            <NavButton label="Back to Library →" onClick={onBack} color={c.bg} />
          </div>
        </StepCard>
      )}
    </div>
  );
}
