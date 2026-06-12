// The brand logo everywhere in the app comes from /public/logo.png
// (the official Anh Ngữ E’TOP logo) — replace that file to rebrand.
export function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      width={size}
      height={size}
      alt="Anh Ngữ E’TOP"
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
