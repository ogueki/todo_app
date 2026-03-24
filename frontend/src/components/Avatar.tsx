import { avatarUrl } from "../api.ts";

const COLORS = [
  "#4CAF50", "#2196F3", "#FF9800", "#9C27B0",
  "#F44336", "#00BCD4", "#795548", "#607D8B",
];

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

const SIZES = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
} as const;

interface Props {
  name: string;
  avatarFilename?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export default function Avatar({ name, avatarFilename, size = "sm", className = "" }: Props) {
  const src = avatarUrl(avatarFilename);
  const sizeClass = SIZES[size];
  const initial = name.charAt(0);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} rounded-full shrink-0 inline-flex items-center justify-center text-white font-bold ${className}`}
      style={{ backgroundColor: colorFor(name) }}
      title={name}
    >
      {initial}
    </span>
  );
}
