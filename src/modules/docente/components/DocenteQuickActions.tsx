import { useNavigate } from 'react-router-dom';
import { ACCIONES_RAPIDAS_DOCENTE } from '../data/docenteMenuData';

export const DocenteQuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {ACCIONES_RAPIDAS_DOCENTE.map(({ titulo, descripcion, ruta, Icono, colorFondo, colorTexto }) => (
        <div
          key={titulo}
          onClick={() => navigate(ruta)}
          className="p-4 bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:border-gray-300 hover:shadow-md transition-all cursor-pointer flex items-center gap-3 group"
        >
          <div className={`p-3 ${colorFondo} ${colorTexto} rounded-xl group-hover:scale-110 transition-transform`}>
            <Icono className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-800">{titulo}</h4>
            <p className="text-[10px] text-gray-500">{descripcion}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
