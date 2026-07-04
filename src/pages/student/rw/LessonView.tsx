import { useMemo, useState } from 'react';
import { CURRICULUM, MONTH_COLORS } from '../../../data/curriculum';
import type { Exercise, Lesson } from '../../../data/curriculum';
import { analyzeWriting, awardOnce, XP, type RWProgress } from './engine';
import { useTTS } from './useTTS';
import { AudioSettings, Confetti, MarkdownContent, NavButton, PlayButton, StepCard, TappableText, XpChip } from './shared';

type LessonStep = 'intro' | 'content' | 'keywords' | 'dictation' | 'exercises' | 'writing' | 'complete';

export default function LessonView({ lesson, progress, apply, onBack }: {
  lesson: Lesson;
  progress: RWProgress;
  apply: (fn: (p: RWProgress) => RWProgress) => void;
  onBack: () => void;
}) {
  const tts = useTTS();
  const month = CURRICULUM[lesson.monthIndex];
  const c = MONTH_COLORS[month.color];
  const isDone = progress.completedLessons.includes(lesson.id);

  const [answers, setAnswers] = useState<Record<string, string>>(progress.exerciseAnswers[lesson.id] ?? {});
  const [submitted, setSubmitted] = useState(false);
  const [writingText, setWritingText] = useState(progress.writingResponses[lesson.id] ?? '');
  const [showFeedback, setShowFeedback] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [lastGain, setLastGain] = useState(0);

  const dictationWords = useMemo(() => lesson.keyWords.slice(0, 3).map((k) => k.word), [lesson]);
  const hasDictation = dictationWords.length >= 2;

  const steps: LessonStep[] = [
    'intro', 'content', 'keywords',
    ...(hasDictation ? (['dictation'] as LessonStep[]) : []),
    'exercises',
    ...(lesson.writingPrompt ? (['writing'] as LessonStep[]) : []),
    'complete',
  ];
  const [step, setStep] = useState<LessonStep>('intro');
  const stepIndex = steps.indexOf(step);
  const nextStep = () => { const n = steps[stepIndex + 1]; if (n) setStep(n); };

  const score = lesson.exercises.reduce((acc, ex) => acc + ((answers[ex.id] ?? '').trim().toLowerCase() === ex.answer.toLowerCase() ? 1 : 0), 0);
  const perfect = score === lesson.exercises.length;

  const handleSubmit = () => {
    setSubmitted(true);
    const entries = lesson.exercises
      .filter((ex) => (answers[ex.id] ?? '').trim().toLowerCase() === ex.answer.toLowerCase())
      .map((ex) => ({ key: `ex:${lesson.id}:${ex.id}`, xp: XP.exerciseCorrect }));
    if (perfect) entries.push({ key: `perfect:${lesson.id}`, xp: XP.perfectBonus });
    const gained = entries.filter((e) => !progress.xpKeys.includes(e.key)).reduce((a, e) => a + e.xp, 0);
    setLastGain(gained);
    if (gained > 0) setXpEarned((x) => x + gained);
    apply((p) => {
      const { progress: p2 } = awardOnce(p, entries);
      return {
        ...p2,
        exerciseAnswers: { ...p2.exerciseAnswers, [lesson.id]: answers },
        perfectLessons: perfect && !p2.perfectLessons.includes(lesson.id) ? [...p2.perfectLessons, lesson.id] : p2.perfectLessons,
      };
    });
  };

  const handleRetry = () => {
    setSubmitted(false);
    setAnswers((prev) => {
      const next: Record<string, string> = {};
      for (const ex of lesson.exercises) {
        if ((prev[ex.id] ?? '').trim().toLowerCase() === ex.answer.toLowerCase()) next[ex.id] = prev[ex.id];
      }
      return next;
    });
  };

  const handleComplete = () => {
    apply((p) => ({
      ...p,
      xp: p.xp + (isDone ? 0 : XP.lessonComplete),
      completedLessons: p.completedLessons.includes(lesson.id) ? p.completedLessons : [...p.completedLessons, lesson.id],
      writingResponses: writingText.trim() ? { ...p.writingResponses, [lesson.id]: writingText } : p.writingResponses,
    }));
    onBack();
  };

  const writingChecks = analyzeWriting(writingText);
  const speakWord = (w: string) => w && tts.speak(w);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <div className="flex items-center gap-3">
        <button onClick={() => { tts.stop(); onBack(); }} className="text-sm font-semibold text-gray-500 hover:text-gray-800">←</button>
        <div className="flex-1">
          <div className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{month.emoji} Month {lesson.monthIndex + 1}</div>
          <h2 className="font-black leading-tight text-gray-800">{lesson.title}</h2>
        </div>
        <AudioSettings tts={tts} />
        {isDone && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-600">Done ✓</span>}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-2 rounded-full ${c.bg} transition-all duration-500`} style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </div>
      <div className="text-center text-xs text-gray-400">Step {stepIndex + 1} of {steps.length}</div>

      {step === 'intro' && (
        <StepCard>
          <div className="text-center">
            <div className="mb-3 text-5xl">🎯</div>
            <h3 className="text-xl font-black text-gray-800">Lesson Goal</h3>
            <p className="mt-2 text-gray-600">{lesson.objective}</p>
          </div>
          <div className={`mt-4 rounded-xl ${c.light} border ${c.border} p-4`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">🎧 Listen — words light up as they are read</span>
              <PlayButton tts={tts} text={lesson.audioText} color={c.bg} highlight />
            </div>
            <p className="text-sm leading-relaxed text-gray-700">
              <TappableText text={lesson.audioText} onWord={speakWord} activeIndex={tts.wordIndex} />
            </p>
            <p className="mt-2 text-[11px] text-gray-400">💡 Tap any word to hear it on its own.</p>
          </div>
          <NavButton label="Start Lesson →" onClick={nextStep} color={c.bg} />
        </StepCard>
      )}

      {step === 'content' && (
        <StepCard>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-black text-gray-800">📖 Lesson Content</h3>
            <PlayButton tts={tts} text={lesson.content.replace(/[#*|_`]/g, ' ').replace(/\s+/g, ' ')} color={c.bg} label="Listen" />
          </div>
          <MarkdownContent content={lesson.content} onWord={speakWord} />
          <p className="text-[11px] text-gray-400">💡 Tap any word to hear it.</p>
          <NavButton label="Next: Key Words →" onClick={nextStep} color={c.bg} />
        </StepCard>
      )}

      {step === 'keywords' && (
        <StepCard>
          <h3 className="mb-3 font-black text-gray-800">📝 Key Words</h3>
          <div className="space-y-2">
            {lesson.keyWords.map((kw) => (
              <div key={kw.word} className={`flex items-start gap-3 rounded-xl border ${c.border} ${c.light} p-3`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-black ${c.text}`}>{kw.word}</span>
                    <button onClick={() => tts.speak(`${kw.word}. ${kw.meaning}`)} className="text-xs text-gray-400 hover:text-gray-700" title="Hear this word">🔊</button>
                  </div>
                  <div className="mt-0.5 text-sm text-gray-600">{kw.meaning}</div>
                </div>
              </div>
            ))}
          </div>
          <NavButton label={hasDictation ? 'Next: Listening Dictation →' : 'Next: Practice Exercises →'} onClick={nextStep} color={c.bg} />
        </StepCard>
      )}

      {step === 'dictation' && (
        <DictationStep words={dictationWords} tts={tts} color={c} onDone={(correctWords) => {
          const entries = correctWords.map((w) => ({ key: `dict:${lesson.id}:${w}`, xp: XP.dictationWord }));
          const gained = entries.filter((e) => !progress.xpKeys.includes(e.key)).reduce((a, e) => a + e.xp, 0);
          if (gained > 0) setXpEarned((x) => x + gained);
          if (entries.length > 0) apply((p) => awardOnce(p, entries).progress);
          nextStep();
        }} />
      )}

      {step === 'exercises' && (
        <StepCard>
          <h3 className="mb-1 font-black text-gray-800">✏️ Exercises</h3>
          <p className="mb-4 text-xs text-gray-500">Answer all {lesson.exercises.length} questions, then check your score. Each correct answer = {XP.exerciseCorrect} XP, perfect score = +{XP.perfectBonus} bonus!</p>
          <div className="space-y-4">
            {lesson.exercises.map((ex, i) => (
              <ExerciseItem key={ex.id} exercise={ex} index={i} answer={answers[ex.id] ?? ''} submitted={submitted}
                onAnswer={(val) => setAnswers((prev) => ({ ...prev, [ex.id]: val }))} speak={(t) => tts.speak(t)} color={c} />
            ))}
          </div>

          {!submitted ? (
            <button onClick={handleSubmit} disabled={lesson.exercises.some((ex) => !answers[ex.id]?.trim())}
              className={`mt-4 w-full rounded-xl py-3 font-black text-white transition-all disabled:opacity-40 ${c.bg}`}>
              Check My Answers
            </button>
          ) : (
            <div className={`mt-4 rounded-xl border p-4 text-center ${perfect ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="mb-1 text-3xl">{perfect ? '🏆' : score >= lesson.exercises.length * 0.6 ? '👍' : '📚'}</div>
              <div className="text-lg font-black text-gray-800">{score} / {lesson.exercises.length} correct {lastGain > 0 && <XpChip amount={lastGain} />}</div>
              {lastGain === 0 && score > 0 && <div className="text-[11px] text-gray-400">XP for these answers was already earned earlier</div>}
              <div className="text-sm text-gray-600">
                {perfect ? 'Perfect score! Amazing work!' : score >= lesson.exercises.length * 0.6 ? 'Great job! Review the ones you missed.' : 'Good effort! Re-read the lesson and try again.'}
              </div>
              {!perfect && (
                <button onClick={handleRetry} className="mt-3 rounded-full border-2 border-amber-300 bg-white px-4 py-1.5 text-sm font-bold text-amber-700 hover:bg-amber-100">
                  🔄 Try the wrong ones again
                </button>
              )}
              <NavButton label={lesson.writingPrompt ? 'Next: Writing Practice →' : 'Next: Complete! →'} onClick={nextStep} color={c.bg} />
            </div>
          )}
        </StepCard>
      )}

      {step === 'writing' && lesson.writingPrompt && (
        <StepCard>
          <h3 className="mb-1 font-black text-gray-800">✍️ Writing Practice</h3>
          <div className={`mb-3 rounded-xl border ${c.border} ${c.light} p-3`}>
            <div className="flex items-start gap-2">
              <button onClick={() => tts.speak(lesson.writingPrompt!)} className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${c.bg} text-white`}>🔊</button>
              <p className="text-sm font-semibold text-gray-700">{lesson.writingPrompt}</p>
            </div>
          </div>
          <textarea value={writingText} onChange={(e) => { setWritingText(e.target.value); setShowFeedback(false); }}
            placeholder="Write your response here... Take your time." rows={8}
            className="w-full resize-none rounded-xl border-2 border-gray-200 p-3 text-sm leading-relaxed text-gray-800 focus:border-violet-400 focus:outline-none" />
          <div className="flex items-center justify-between text-xs">
            <button onClick={() => setShowFeedback(true)} disabled={!writingText.trim()}
              className="rounded-full bg-violet-100 px-3 py-1 font-bold text-violet-700 hover:bg-violet-200 disabled:opacity-40">
              🧐 Check my writing
            </button>
            <span className="text-gray-400">{writingText.split(/\s+/).filter(Boolean).length} words</span>
          </div>
          {showFeedback && (
            <div className="space-y-1 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {writingChecks.map((ch, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs font-semibold ${ch.ok ? 'text-green-700' : 'text-amber-700'}`}>
                  <span>{ch.ok ? '✅' : '💡'}</span><span>{ch.label}</span>
                </div>
              ))}
            </div>
          )}
          <NavButton label="Next: Complete Lesson →" onClick={nextStep} color={c.bg} />
        </StepCard>
      )}

      {step === 'complete' && (
        <StepCard>
          <Confetti />
          <div className="py-4 text-center">
            <div className="mb-3 text-6xl">🎉</div>
            <h3 className="text-2xl font-black text-gray-800">Lesson Complete!</h3>
            <p className="mt-2 text-gray-600">You finished: <strong>{lesson.title}</strong></p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {!isDone && <XpChip amount={XP.lessonComplete} />}
              {xpEarned > 0 && <span className="text-xs font-bold text-gray-500">+ {xpEarned} XP already earned inside the lesson</span>}
            </div>
            <div className="mt-6 space-y-2 text-sm text-gray-600">
              <p>🔁 Your key words are now in the Review deck</p>
              <p>📖 Try a story from the Library at your level</p>
            </div>
          </div>
          <button onClick={handleComplete} className={`w-full rounded-xl py-3 font-black text-white ${c.bg}`}>Save & Continue →</button>
        </StepCard>
      )}
    </div>
  );
}

// ─── Dictation ("listen and type") ───────────────────────────────────────────
function DictationStep({ words, tts, color, onDone }: {
  words: string[];
  tts: ReturnType<typeof useTTS>;
  color: { bg: string; text: string; border: string; light: string };
  onDone: (correctWords: string[]) => void;
}) {
  const [typed, setTyped] = useState<string[]>(words.map(() => ''));
  const [checked, setChecked] = useState(false);
  const correctWords = words.filter((w, i) => typed[i].trim().toLowerCase() === w.toLowerCase());
  const correct = correctWords.length;

  return (
    <StepCard>
      <h3 className="mb-1 font-black text-gray-800">👂 Listening Dictation</h3>
      <p className="mb-3 text-xs text-gray-500">Press 🔊, listen carefully, and type the word you hear. Spelling counts!</p>
      <div className="space-y-3">
        {words.map((w, i) => {
          const isRight = checked && typed[i].trim().toLowerCase() === w.toLowerCase();
          const isWrong = checked && !isRight;
          return (
            <div key={w} className={`flex items-center gap-2 rounded-xl border-2 p-3 ${checked ? (isRight ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50') : 'border-gray-200'}`}>
              <button onClick={() => tts.speak(w)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold text-white ${color.bg}`}>🔊 Word {i + 1}</button>
              <input type="text" value={typed[i]} disabled={checked}
                onChange={(e) => setTyped((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                placeholder="Type what you hear..." autoCapitalize="none" autoCorrect="off" spellCheck={false}
                className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none disabled:bg-transparent" />
              {isWrong && <span className="shrink-0 text-xs font-bold text-red-600">{w}</span>}
              {isRight && <span className="shrink-0">✅</span>}
            </div>
          );
        })}
      </div>
      {!checked ? (
        <NavButton label="Check Dictation" onClick={() => setChecked(true)} color={color.bg} disabled={typed.some((t) => !t.trim())} />
      ) : (
        <div className="mt-3 text-center">
          <div className="font-black text-gray-800">{correct} / {words.length} correct {correct > 0 && <XpChip amount={correct * XP.dictationWord} />}</div>
          <NavButton label="Next: Practice Exercises →" onClick={() => onDone(correctWords)} color={color.bg} />
        </div>
      )}
    </StepCard>
  );
}

// ─── Exercise item ────────────────────────────────────────────────────────────
function ExerciseItem({ exercise, index, answer, submitted, onAnswer, speak, color }: {
  exercise: Exercise;
  index: number;
  answer: string;
  submitted: boolean;
  onAnswer: (v: string) => void;
  speak: (t: string) => void;
  color: { bg: string; text: string; border: string; light: string };
}) {
  const isCorrect = submitted && answer.trim().toLowerCase() === exercise.answer.toLowerCase();
  const isWrong = submitted && !isCorrect;

  return (
    <div className={`rounded-xl border-2 p-3 transition-all ${submitted ? (isCorrect ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50') : 'border-gray-200 bg-white'}`}>
      <div className="mb-2 flex items-start gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${color.bg}`}>{index + 1}</span>
        <div className="flex-1">
          <button onClick={() => speak(exercise.prompt)} className="float-right text-xs text-gray-400 hover:text-gray-600">🔊</button>
          <p className="text-sm font-semibold text-gray-800">{exercise.prompt}</p>
        </div>
      </div>

      {exercise.kind === 'multiple-choice' && (
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {exercise.options!.map((opt) => {
            const isSelected = answer === opt;
            const isCorrectOpt = submitted && opt === exercise.answer;
            return (
              <button key={opt} onClick={() => !submitted && onAnswer(opt)} disabled={submitted}
                className={`rounded-lg border-2 px-2 py-1.5 text-left text-xs font-semibold transition-all ${
                  isCorrectOpt ? 'border-green-400 bg-green-100 text-green-800'
                    : isSelected && isWrong ? 'border-red-400 bg-red-100 text-red-800'
                    : isSelected ? `${color.border} ${color.light} ${color.text}`
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {(exercise.kind === 'fill-blank' || exercise.kind === 'arrange-words' || exercise.kind === 'write-sentence') && (
        <input type="text" value={answer} onChange={(e) => !submitted && onAnswer(e.target.value)} disabled={submitted}
          placeholder={exercise.hint ?? 'Your answer...'}
          className={`mt-1 w-full rounded-lg border-2 px-3 py-2 text-sm focus:outline-none ${
            submitted ? (isCorrect ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50') : 'border-gray-200 focus:border-violet-400'}`} />
      )}

      {submitted && (
        <div className={`mt-2 text-xs font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
          {isCorrect ? '✓ Correct!' : `✗ Answer: ${exercise.answer}`}
          {!isCorrect && exercise.hint && <span className="ml-2 font-normal text-gray-500">Hint: {exercise.hint}</span>}
        </div>
      )}
    </div>
  );
}
