// The brand logo everywhere in the app comes from /public/logo.svg —
// replace that one file with the center's real logo to rebrand.
export function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt="Anh Ngữ E’TOP"
      className={`rounded-2xl ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
