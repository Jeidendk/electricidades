import { Outlet } from 'react-router-dom';
import { DocenteSidebar } from './DocenteSidebar';
import { AdminTopbar } from '../../admin/layout/AdminTopbar';
import { useAuthStore } from '../../../store/authStore';
import { useClasesStore } from '../../../store/clasesStore';
import { useMateriasStore } from '../../../store/materiasStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useEffect } from 'react';

export const DocenteLayout = () => {
  const currentUser = useAuthStore(s => s.user);

  useEffect(() => {
    useClasesStore.getState().fetchClases();
    useMateriasStore.getState().fetchMaterias();
    useEspaciosStore.getState().fetchEspacios();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden text-gray-800 relative bg-[url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center font-sans">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md -z-10"></div>

      <DocenteSidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-[#f4f7fb]/90 backdrop-blur-xl relative">
        <AdminTopbar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          <Outlet context={{ currentUser }} />
        </div>
      </main>
    </div>
  );
};
