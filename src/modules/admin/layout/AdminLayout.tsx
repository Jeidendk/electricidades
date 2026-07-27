import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { useAuthStore } from '../../../store/authStore';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { usePrestamosStore } from '../../../store/prestamosStore';
import { useMantenimientoStore } from '../../../store/mantenimientoStore';
import { useAsignacionesStore } from '../../../store/asignacionesStore';
import { useRecursosStore } from '../../../store/recursosStore';
import { useEffect } from 'react';

export const AdminLayout = () => {
  const [customTitle, setCustomTitle] = useState<React.ReactNode | null>(null);
  
  const currentUser = useAuthStore(s => s.user);

  useEffect(() => {
    useInventarioStore.getState().fetchItems();
    useEspaciosStore.getState().fetchEspacios();
    usePrestamosStore.getState().fetchPrestamos();
    useMantenimientoStore.getState().fetchOrdenes();
    useAsignacionesStore.getState().fetchAsignaciones();
    useRecursosStore.getState().fetchRecursos();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden text-gray-800 relative bg-[url('https://images.unsplash.com/photo-1577415124269-dd114076e614?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center font-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md -z-10"></div>
      
      {/* SIDEBAR */}
      <AdminSidebar />
      
      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f4f7fb]/90 backdrop-blur-xl relative">
        
        {/* TOPBAR */}
        <AdminTopbar customTitle={customTitle} currentUser={currentUser} setCurrentUser={() => {}} />

        {/* ÁREA DE TRABAJO */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          <Outlet context={{ setCustomTitle, currentUser }} />
        </div>
      </main>
    </div>
  );
};
