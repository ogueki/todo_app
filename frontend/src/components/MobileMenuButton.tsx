import { useNotifications } from "../NotificationContext.tsx";

interface Props {
  onClick: () => void;
  className?: string;
}

export default function MobileMenuButton({ onClick, className = "" }: Props) {
  const { unreadCount } = useNotifications();
  return (
    <button
      onClick={onClick}
      className={`md:hidden relative text-gray-500 hover:text-gray-700 p-1 -ml-1 ${className}`}
      title="メニューを開く"
      aria-label="メニューを開く"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] leading-none min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
