import { useState, useRef, useEffect } from "react";
import type { UserSummary } from "../types.ts";

interface Props {
  value: string;
  onChange: (value: string) => void;
  users: UserSummary[];
  placeholder?: string;
  rows?: number;
  className?: string;
}

// @ 入力時にユーザー候補をサジェスト表示するtextarea
export default function MentionTextarea({ value, onChange, users, placeholder, rows = 3, className = "" }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<UserSummary[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1); // @ の位置（-1なら非表示）

  // テキスト変更時に @ の検出を行う
  const updateSuggestions = (text: string, caret: number) => {
    // カーソルの直前から @ を探す（スペース/改行/先頭まで遡る）
    let i = caret - 1;
    while (i >= 0 && !/[\s\n]/.test(text[i])) {
      if (text[i] === "@") {
        const query = text.slice(i + 1, caret);
        const matched = users.filter((u) => u.name.includes(query));
        if (matched.length > 0) {
          setSuggestions(matched);
          setActiveIndex(0);
          setMentionStart(i);
          return;
        }
      }
      i--;
    }
    setSuggestions([]);
    setMentionStart(-1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    updateSuggestions(newValue, e.target.selectionStart);
  };

  const insertMention = (user: UserSummary) => {
    if (mentionStart < 0 || !textareaRef.current) return;
    const ta = textareaRef.current;
    const before = value.slice(0, mentionStart);
    const after = value.slice(ta.selectionStart);
    const newValue = `${before}@${user.name} ${after}`;
    const newCaret = (before + `@${user.name} `).length;
    onChange(newValue);
    setSuggestions([]);
    setMentionStart(-1);
    // 次のレンダリング後にカーソル位置を復元
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCaret, newCaret);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setMentionStart(-1);
    }
  };

  // value が外から空にされた場合のリセット
  useEffect(() => {
    if (value === "") {
      setSuggestions([]);
      setMentionStart(-1);
    }
  }, [value]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {suggestions.length > 0 && (
        <div className="absolute left-2 bottom-full mb-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                // onClickだとtextareaのblur→再フォーカスで競合するのでmousedownで先に処理
                e.preventDefault();
                insertMention(u);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                i === activeIndex ? "bg-brand-100 text-brand-900" : "text-gray-700 hover:bg-brand-50"
              }`}
            >
              <span className="text-brand-500">@</span>{u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
