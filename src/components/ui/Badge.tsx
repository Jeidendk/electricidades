import { cn } from '../../lib/utils';

export type BadgeColor = 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'slate' | 'indigo';

const COLORS: Record<BadgeColor, { bg: string; text: string; border: string; solid: string }> = {
  green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200/50', solid: 'bg-green-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200/50', solid: 'bg-blue-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200/50', solid: 'bg-amber-500' },
  red: { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200/50', solid: 'bg-red-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200/50', solid: 'bg-purple-500' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200/50', solid: 'bg-slate-400' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200/50', solid: 'bg-indigo-500' },
};

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  icon?: React.ElementType;
  dot?: boolean;
  pulse?: boolean;
  pill?: boolean; // rounded-full en vez de rounded-md
}

export const Badge = ({ color = 'slate', children, icon: Icon, dot, pulse, pill }: BadgeProps) => {
  const c = COLORS[color];
  return (
    <span className={cn(
      'text-[9px] font-extrabold px-2 py-0.5 border flex items-center gap-1 w-max',
      pill ? 'rounded-full' : 'rounded-md',
      c.bg, c.text, c.border,
      pulse && 'animate-pulse'
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', c.solid)}></span>}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
};
