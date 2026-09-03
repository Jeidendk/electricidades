import { Fragment } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { BreadcrumbRuta } from './BreadcrumbRuta';

export interface HeroStat {
  Icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  /** Variación respecto al periodo anterior. Se dibuja bajo el valor; opcional. */
  trend?: { label: string; direction: 'up' | 'down' };
}

interface PageHeroProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  stats?: HeroStat[];
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** Imagen temática de fondo (ver HERO_BG en heroBackgrounds.ts). Opcional. */
  backgroundImage?: string;
  /** Niveles intermedios que la página abre por dentro; se suman al rastro de navegación. */
  breadcrumbNiveles?: string[];
}

// Header estándar de las páginas admin: banner oscuro + título + KPI strip.
export const PageHero = ({ icon: Icon, title, subtitle, stats, children, actions, backgroundImage, breadcrumbNiveles }: PageHeroProps) => (
  <div className="w-full min-h-[92px] bg-espoch-hero relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-4 border-b border-gray-800">
    {backgroundImage && (
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.25]"
        style={{ backgroundImage: `url('${backgroundImage}')` }}
      ></div>
    )}
    <div className="absolute inset-0 bg-gradient-to-r from-espoch-hero via-espoch-hero/95 to-espoch-hero/80"></div>

    <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 shrink-0 rounded-[14px] bg-espoch-red flex items-center justify-center text-white shadow-lg">
          <Icon className="w-7 h-7" strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-1">
          {/* Rastro y título comparten fila: apilarlos sumaba una línea entera de alto al
              banner, y el rastro es texto de 10px que cabe de sobra al costado. */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <BreadcrumbRuta tituloPagina={title} niveles={breadcrumbNiveles} className="shrink-0" separadorFinal />
            <h2 className="text-[12px] font-extrabold text-espoch-yellow tracking-tight leading-none">{title}</h2>
          </div>
          <p className="text-[11px] text-gray-400 font-medium">{subtitle}</p>
        </div>
      </div>

      {children && (
        <div className="flex-1 flex justify-center order-3 w-full mt-4 lg:order-none lg:w-auto lg:mt-0 min-w-0">
          {children}
        </div>
      )}

      <div className="flex items-center gap-4">
        {stats && stats.length > 0 && (
          <div className="items-center gap-6 bg-espoch-herocard rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
            {stats.map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && <div className="w-px h-8 bg-white/10 mx-1"></div>}
                <div className="flex items-center gap-3">
                  <s.Icon className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                  <div className="flex flex-col">
                    <span className="text-[15px] font-bold text-white leading-tight">{s.value}</span>
                    <span className="text-[10px] font-medium text-gray-400 leading-none">{s.label}</span>
                    {s.trend && (
                      <span className={`mt-1 flex items-center gap-1 text-[10px] font-bold leading-none ${s.trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {s.trend.direction === 'up'
                          ? <ArrowUp className="w-2.5 h-2.5" />
                          : <ArrowDown className="w-2.5 h-2.5" />}
                        {s.trend.label}
                      </span>
                    )}
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        )}
        {actions}
      </div>
    </div>
  </div>
);
