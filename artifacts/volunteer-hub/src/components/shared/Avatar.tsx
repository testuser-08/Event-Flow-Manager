/**
 * Avatar — shows photo if set, otherwise a deterministic coloured initials circle.
 */

const PALETTE = [
  ['#1e3a8a', '#bfdbfe'], // blue
  ['#5b21b6', '#ddd6fe'], // violet
  ['#065f46', '#a7f3d0'], // emerald
  ['#92400e', '#fde68a'], // amber
  ['#881337', '#fecdd3'], // rose
  ['#0e7490', '#a5f3fc'], // cyan
  ['#3730a3', '#c7d2fe'], // indigo
  ['#4d7c0f', '#d9f99d'], // lime
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number; // px, default 36
  className?: string;
}

export default function Avatar({ name, avatarUrl, size = 36, className = '' }: AvatarProps) {
  const [bg, fg] = colorFor(name);
  const style = { width: size, height: size, minWidth: size, fontSize: size * 0.38 };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={style}
        className={`rounded-full object-cover border-2 border-border ${className}`}
      />
    );
  }

  return (
    <div
      style={{ ...style, background: bg, color: fg }}
      className={`rounded-full flex items-center justify-center font-bold border-2 border-border select-none ${className}`}
    >
      {initials(name)}
    </div>
  );
}
