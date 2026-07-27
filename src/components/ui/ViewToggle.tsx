import { LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  value: 'grid' | 'list';
  onChange: (value: 'grid' | 'list') => void;
  gridTitle?: string;
  listTitle?: string;
}

// Conmutador estándar tarjetas/lista de las páginas admin.
export const ViewToggle = ({ value, onChange, gridTitle = 'Vista de tarjetas', listTitle = 'Vista de lista' }: ViewToggleProps) => (
  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden p-0.5 bg-gray-50">
    <button onClick={() => onChange('grid')} className={`p-1.5 rounded-md transition-colors ${value === 'grid' ? 'bg-[#0f172a] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title={gridTitle}>
      <LayoutGrid className="w-4 h-4" />
    </button>
    <button onClick={() => onChange('list')} className={`p-1.5 rounded-md transition-colors ${value === 'list' ? 'bg-[#0f172a] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title={listTitle}>
      <List className="w-4 h-4" />
    </button>
  </div>
);
