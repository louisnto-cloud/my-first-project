// A small, crisp stroke-icon set (Lucide-style) so the UI uses real icons
// instead of emoji — the single biggest lift from "cheap" to "premium".

const P: Record<string, string> = {
  home: 'M3 10.8 12 3l9 7.8M5.5 9.5V20h13V9.5',
  book: 'M12 6.5v13.5M12 6.5C10.7 5 8.8 4.5 5 4.7V18c3.8-.2 5.7.3 7 1.8 1.3-1.5 3.2-2 7-1.8V4.7c-3.8-.2-5.7.3-7 1.8Z',
  users: 'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11ZM3.5 19.5a5.5 5.5 0 0 1 11 0M16 5a3.2 3.2 0 0 1 0 6M17 14.4a5.5 5.5 0 0 1 3.5 5.1',
  sparkles: 'M12 3.5l1.7 4.3L18 9.5l-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7zM18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z',
  chart: 'M4.5 20V11M9.5 20V5M14.5 20v-6M19.5 20v-9M3 20h18',
  wallet: 'M3.5 7.5A2 2 0 0 1 5.5 5.5h11a2 2 0 0 1 2 2M3.5 7.5v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H3.5M17.5 13.5h.01',
  bell: 'M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.5 2 5.8 2 5.8H4.5s2-1.3 2-5.8ZM10 19a2 2 0 0 0 4 0',
  check: 'M5 12.5l4.2 4.2L19 7',
  lock: 'M5.5 11.5h13v8.5h-13zM8.5 11.5V8a3.5 3.5 0 0 1 7 0v3.5',
  star: 'M12 3.5l2.6 5.2 5.8.9-4.2 4.1 1 5.7-5.2-2.7-5.2 2.7 1-5.7-4.2-4.1 5.8-.9z',
  flame: 'M12 3c1.2 3.2-2.2 4.4-2.2 7.3a2.2 2.2 0 0 0 4.4 0c0-.5-.1-1-.4-1.6 2.1 1 3.6 3 3.6 5.7a5.5 5.5 0 0 1-11 0c0-4.4 3.2-5.6 5.6-11.4z',
  arrowRight: 'M4.5 12h15M13 5.5l6.5 6.5L13 18.5',
  arrowLeft: 'M19.5 12h-15M11 5.5 4.5 12 11 18.5',
  play: 'M7 4.8v14.4l12-7.2z',
  volume: 'M4.5 9.5v5h3.5l4.5 3.5V6L8 9.5zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M6 9.5l6 6 6-6',
  message: 'M20.5 12a8.5 8.5 0 0 1-12.3 7.6L4 20.5l1-4.2A8.5 8.5 0 1 1 20.5 12Z',
  calendar: 'M5 6.5h14v13.5H5zM5 10h14M9 4v3M15 4v3',
  logout: 'M9 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h3M16 16.5l4.5-4.5L16 7.5M20.5 12H10',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21M12 3C9.5 5.4 8.2 8.6 8.2 12S9.5 18.6 12 21',
  cap: 'M2.5 9 12 5l9.5 4-9.5 4zM6.5 11v4.2c0 1.4 2.6 2.8 5.5 2.8s5.5-1.4 5.5-2.8V11M21.5 9.4v4.6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2',
  copy: 'M9.5 9.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM5.5 15.5h-1a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  refresh: 'M20 11.5a8 8 0 1 0-.5 4M20 5.5v6h-6',
  pencil: 'M4 20h4L19.5 8.5l-4-4L4 16zM14 6l4 4',
  heart: 'M12 20.5S3.5 15.7 3.5 9.8A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8.5 2.8c0 5.9-8.5 10.7-8.5 10.7Z',
  bolt: 'M13 3 5 13.5h6L10.5 21 19 10h-6z',
  phone: 'M6.5 4.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6.7 2 2 0 0 1 6.5 4.5Z',
  pin: 'M12 21s6.5-5.3 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.7 12 21 12 21Z M12 8.5a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z',
  shield: 'M12 3 5 5.7v5.6c0 4.3 3 7 7 9.2 4-2.2 7-4.9 7-9.2V5.7zM9 12l2 2 4-4',
};

export function Icon({ name, size = 22, className = '', strokeWidth = 1.9 }: { name: keyof typeof P; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={P[name]} />
    </svg>
  );
}

export type IconName = keyof typeof P;
