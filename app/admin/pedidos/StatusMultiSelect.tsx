'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface StatusMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export default function StatusMultiSelect({ options, selected, onChange, className }: StatusMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);
  }

  const label =
    selected.length === 0 ? 'Todos los estatus' : selected.length === 1 ? selected[0] : `${selected.length} estatus`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${className} inline-flex items-center justify-between gap-2 w-full cursor-pointer`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-1 min-w-full w-56 bg-white border border-zinc-200 rounded-xl shadow-lg p-1.5"
        >
          {options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(option)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-800 hover:bg-zinc-50 text-left cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-primary border-primary text-white' : 'border-zinc-300'
                  }`}
                >
                  {checked && <Check className="w-3 h-3" />}
                </span>
                {option}
              </button>
            );
          })}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full mt-1 px-2.5 py-2 border-t border-zinc-100 text-xs font-bold text-primary hover:text-primary-dark text-left cursor-pointer"
            >
              Quitar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
}
