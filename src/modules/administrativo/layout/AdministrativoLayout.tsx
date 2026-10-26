import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AutoridadSidebar } from '../../autoridad/layout/AutoridadSidebar';
import { AdminTopbar } from '../../admin/layout/AdminTopbar';
import { useAuthStore } from '../../../store/authStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useEspaciosStore } from '../../../store/espaciosStore';

/** Panel de consulta para Administrativo: puede ver y exportar, pero no gestionar catálogos. */
export const AdministrativoLayout = () => {
  const currentUser = useAuthStore(s => s.user);

  useEffect(() => {
    useEdificiosStore.getState().fetchEdificios();
    useEspaciosStore.getState().fetchEspacios();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden text-gray-800 relative bg-[#f4f7fb] font-sans">
      <AutoridadSidebar basePath="/administrativo" administrativo />
      <main className="flex-1 flex flex-col min-w-0 bg-[#f4f7fb] relative">
        <AdminTopbar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          <Outlet context={{ currentUser, soloLectura: true }} />
        </div>
      </main>
    </div>
  );
};
