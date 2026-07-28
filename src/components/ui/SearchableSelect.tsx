import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string;
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();

export const SearchableSelect = ({
  id,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder = 'Escriba para buscar...',
  emptyMessage = 'No se encontraron resultados',
  disabled = false,
  required = false,
}: SearchableSelectProps) => {
  const generatedId = useId();
  const inputId = id ?? `searchable-select-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery || normalizedQuery === normalize(selectedOption?.label ?? '')) {
      return options;
    }

    return options.filter((option) =>
      normalize(`${option.label} ${option.searchText ?? ''}`).includes(normalizedQuery),
    );
  }, [options, query, selectedOption]);

  useEffect(() => {
    if (!isOpen) setQuery(selectedOption?.label ?? '');
  }, [isOpen, selectedOption]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(
      required && !value ? 'Seleccione una opción de la lista.' : '',
    );
  }, [required, value]);

  useEffect(() => {
    setHighlightedIndex((current) =>
      Math.min(current, Math.max(filteredOptions.length - 1, 0)),
    );
  }, [filteredOptions.length]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const selectOption = (option: SearchableSelectOption) => {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const openList = () => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(Math.max(options.findIndex((option) => option.value === value), 0));
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        className={`relative flex items-center rounded-xl border transition-all ${
          isOpen
            ? 'border-red-500 bg-white ring-2 ring-red-100'
            : 'border-gray-200 bg-gray-50/50'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && filteredOptions[highlightedIndex]
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          autoComplete="off"
          required={required}
          disabled={disabled}
          value={query}
          placeholder={isOpen ? searchPlaceholder : placeholder}
          onFocus={(event) => {
            openList();
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
            if (value) onChange('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (!isOpen) openList();
              else {
                setHighlightedIndex((current) =>
                  Math.min(current + 1, filteredOptions.length - 1),
                );
              }
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlightedIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter' && isOpen) {
              event.preventDefault();
              const option = filteredOptions[highlightedIndex];
              if (option) selectOption(option);
            } else if (event.key === 'Escape') {
              setIsOpen(false);
              setQuery(selectedOption?.label ?? '');
            }
          }}
          className="w-full rounded-xl bg-transparent py-2.5 pl-10 pr-10 text-[13px] font-medium text-gray-900 outline-none placeholder:text-gray-500 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={isOpen ? 'Cerrar opciones' : 'Mostrar opciones'}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              openList();
              requestAnimationFrame(() => inputRef.current?.focus());
            }
          }}
          className="absolute right-2.5 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
        >
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;
              return (
                <button
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${
                    isHighlighted ? 'bg-red-50 text-red-800' : 'text-gray-700 hover:bg-gray-50'
                  } ${isSelected ? 'font-bold' : 'font-medium'}`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-red-700" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-center text-[12px] font-medium text-gray-500">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
