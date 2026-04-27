interface Props {
  typeId: number;
  className?: string;
}

export default function TypeIcon({ typeId, className = "w-4 h-4" }: Props) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (typeId) {
    case 1: // タスク: チェック付き四角
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 2: // バグ: 楕円のボディに触角と脚
      return (
        <svg {...common}>
          <rect x="8" y="6" width="8" height="14" rx="4" />
          <path d="M9 4l1 2" />
          <path d="M15 4l-1 2" />
          <path d="M3 13h5" />
          <path d="M16 13h5" />
          <path d="M3 19l4-2" />
          <path d="M21 19l-4-2" />
        </svg>
      );
    case 3: // 要望: 電球
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12c.9.7 1.5 1.5 2 3h4c.5-1.5 1.1-2.3 2-3a7 7 0 0 0-4-12z" />
        </svg>
      );
    case 4: // その他: タグ
    default:
      return (
        <svg {...common}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <circle cx="7" cy="7" r="1.2" fill="currentColor" />
        </svg>
      );
  }
}
