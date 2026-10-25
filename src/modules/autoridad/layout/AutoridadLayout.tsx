import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AutoridadSidebar } from './AutoridadSidebar';
import { AdminTopbar } from '../../admin/layout/AdminTopbar';
import { useAuthStore } from '../../../store/authStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';

/**
 * Panel de Decano, Subdecano y Coordinador: solo consulta.
 *
 * Se precargan únicamente edificios y espacios, que son los catálogos que las cuatro pantallas
 * necesitan para resolver nombres. El resto lo pide cada página: aquí no hay inventario,
 * préstamos ni mantenimiento que traer.
 */
export const AutoridadLayout = () => {
  const currentUser = useAuthStore(s => s.user);

  useEffect(() => {
    useEdificiosStore.getState().fetchEdificios();
    useEspaciosStore.getState().fetchEspacios();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden text-gray-800 relative bg-[#f4f7fb] font-sans">
      <AutoridadSidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-[#f4f7fb] relative">
        <AdminTopbar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          {/* `soloLectura` viaja por el contexto del Outlet, que es como las páginas ya reciben
              `currentUser`. Así Horarios, Infraestructura, Estructura Académica y Reportes
              saben que no deben ofrecer acciones de escritura, sin consultar el rol cada una. */}
          <Outlet context={{ currentUser, soloLectura: true }} />
        </div>
      </main>
    </div>
  );
};
