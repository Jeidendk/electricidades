import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput = ({ value, onChange, placeholder = 'Buscar...', className }: SearchInputProps) => (
  <div className={cn('relative', className)}>
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white text-[12px] text-gray-700 rounded-full py-2.5 pl-10 pr-4 outline-none border border-gray-200 hover:border-gray-300 focus:border-gray-400 shadow-sm font-medium transition-all placeholder:text-gray-400"
    />
  </div>
);
