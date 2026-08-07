import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface ClearableSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  /** Search icon on the left (default) or right. */
  iconPosition?: 'left' | 'right';
}

/** Text input with an in-field × that clears the value and restores focus. */
export const ClearableSearchInput: React.FC<ClearableSearchInputProps> = ({
  value,
  onChange,
  className = '',
  inputClassName = '',
  iconPosition = 'left',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasText = value.length > 0;

  const clear = () => {
    onChange('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const padding =
    iconPosition === 'left'
      ? `pl-8 ${hasText ? 'pr-8' : 'pr-2.5'}`
      : `pl-2.5 ${hasText ? 'pr-14' : 'pr-8'}`;

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClassName} ${padding}`}
      />
      {iconPosition === 'left' ? (
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      ) : (
        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      )}
      {hasText && (
        <button
          type="button"
          onClick={clear}
          className={`absolute top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer border-0 bg-transparent p-0 ${
            iconPosition === 'left' ? 'right-1.5' : 'right-7'
          }`}
          title="Vymazať hľadanie"
          aria-label="Vymazať hľadanie"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};
