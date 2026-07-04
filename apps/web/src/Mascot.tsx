// "Nắng" — a cheerful little sun buddy that ties into the E'TOP yellow
// circle. Kids respond to a friendly character; it greets on the home
// screen and cheers on completion.

type Mood = 'happy' | 'cheer' | 'wave' | 'think';

export function Mascot({ size = 96, mood = 'happy', className = '' }: { size?: number; mood?: Mood; className?: string }) {
  const cheering = mood === 'cheer';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      {/* rays */}
      <g fill="#FFD21A">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect
            key={i}
            x="57.5" y="4" width="5" height="14" rx="2.5"
            transform={`rotate(${i * 30} 60 60)`}
          />
        ))}
      </g>
      {/* face */}
      <circle cx="60" cy="60" r="38" fill="#FFC500" />
      <circle cx="60" cy="60" r="38" fill="url(#g)" opacity="0.35" />
      <defs>
        <radialGradient id="g" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#FFE680" />
          <stop offset="1" stopColor="#FFC500" />
        </radialGradient>
      </defs>
      {/* cheeks */}
      <circle cx="42" cy="66" r="6.5" fill="#FF8FA3" opacity="0.75" />
      <circle cx="78" cy="66" r="6.5" fill="#FF8FA3" opacity="0.75" />
      {/* eyes */}
      {mood === 'think' ? (
        <>
          <path d="M44 54 q5 -4 10 0" stroke="#2b2340" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M66 54 q5 -4 10 0" stroke="#2b2340" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="49" cy="55" r="5.5" fill="#2b2340" />
          <circle cx="71" cy="55" r="5.5" fill="#2b2340" />
          <circle cx="51" cy="53" r="1.8" fill="#fff" />
          <circle cx="73" cy="53" r="1.8" fill="#fff" />
        </>
      )}
      {/* mouth */}
      {cheering ? (
        <path d="M48 68 q12 16 24 0 q-12 6 -24 0z" fill="#2b2340" />
      ) : (
        <path d="M50 68 q10 10 20 0" stroke="#2b2340" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
      {/* arm for wave/cheer */}
      {(mood === 'wave' || cheering) && (
        <g stroke="#FFC500" strokeWidth="7" strokeLinecap="round">
          <path d="M92 44 q10 -8 6 -18" />
          {cheering && <path d="M28 44 q-10 -8 -6 -18" />}
        </g>
      )}
    </svg>
  );
}
