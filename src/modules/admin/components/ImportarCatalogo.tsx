import { useEffect, useRef, useState } from 'react';
import { Download, X, CheckCircle } from 'lucide-react';
import { catalogoElectricidad } from '../data/catalogoElectricidad';
import { importarCatalogoElectricidad, prepararImportacionCatalogo } from '../utils/importarCatalogoElectricidad';

export function ImportarCatalogo({ onClose, onComplete }: { onClose: () => void; onComplete: () => Promise<void> }) {
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof prepararImportacionCatalogo>> | null>(null);
  const [error, setError] = useState('');
  const [progreso, setProgreso] = useState('');
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof importarCatalogoElectricidad>> | null>(null);
  const ocupado = useRef(false);
  useEffect(() => {
    let vigente = true;
    prepararImportacionCatalogo().then(p => { if (vigente) setPlan(p); }).catch(e => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, []);

  async function importar() {
    if (ocupado.current) return;
    ocupado.current = true; setError(''); setProgreso('Preparando la carga…');
    try {
      const cargado = await importarCatalogoElectricidad(setProgreso);
      setResultado(cargado);
      await onComplete();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo importar el catálogo.'); }
    finally { ocupado.current = false; setProgreso(''); }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-importacion" className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-xl">
      <header className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
        <div><h2 id="titulo-importacion" className="text-lg font-extrabold text-gray-900">Importar catálogo de Electricidad</h2>
          <p className="mt-1 text-sm text-gray-500">109 documentos organizados por público, categoría y subcategoría.</p></div>
        <button aria-label="Cerrar importación" disabled={!!progreso} onClick={onClose} className="rounded-lg p-1 text-gray-400 disabled:opacity-30"><X size={20}/></button>
      </header>
      <div className="overflow-y-auto p-6 text-sm">
        {resultado ? <div role="status" className="rounded-xl bg-green-50 p-5 text-green-800">
          <CheckCircle className="mb-2"/>
          <p className="font-bold">Catálogo importado y verificado</p>
          <p>{resultado.documentosCreados} documentos agregados · {resultado.carpetasCreadas} categorías creadas · {resultado.existentes} documentos ya existentes.</p>
        </div> : <>
          <p className="mb-4 text-gray-600">Se guardan los enlaces originales de Google Drive. Los archivos permanecen en su ubicación actual y conservan sus permisos de acceso.</p>
          {plan && <p className="mb-4 rounded-xl bg-slate-50 p-3 font-semibold">{plan.documentos.length} documentos por agregar · {plan.carpetas.length} categorías por crear · {plan.existentes} ya existentes</p>}
          {!plan && !error && <p role="status">Comprobando el repositorio…</p>}
          {(['estudiantes', 'docentes', 'gestion'] as const).map(publico => <details key={publico} className="mb-2 rounded-xl border border-gray-200 p-3">
            <summary className="cursor-pointer font-bold text-gray-800">{({estudiantes:'Estudiantes', docentes:'Docentes', gestion:'Gestión de calidad'})[publico]} · {catalogoElectricidad.documentos.filter(d => d.publico === publico).length} documentos</summary>
            <ul className="mt-3 space-y-2 text-xs text-gray-600">
              {[...new Set(catalogoElectricidad.documentos.filter(d => d.publico === publico).map(d => d.ruta.join(' / ')))].map(ruta => <li key={ruta}>{ruta} <span className="font-bold">({catalogoElectricidad.documentos.filter(d => d.publico === publico && d.ruta.join(' / ') === ruta).length})</span></li>)}
            </ul>
          </details>)}
          <a className="mt-3 inline-block text-xs text-blue-700 underline" href={catalogoElectricidad.fuente} target="_blank" rel="noopener noreferrer">Consultar sitio de origen</a>
          <p className="mt-2 text-xs text-gray-500">Se conservarán las plantillas, los documentos y las categorías existentes. Los documentos ya registrados se omiten aunque su enlace tenga otra terminación.</p>
        </>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
        {progreso && <p role="status" className="mt-4 font-semibold text-gray-700">{progreso}</p>}
      </div>
      <footer className="flex justify-end gap-3 border-t border-gray-100 p-5">
        <button disabled={!!progreso} onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 font-bold text-gray-600 disabled:opacity-40">{resultado ? 'Cerrar' : 'Cancelar'}</button>
        {!resultado && <button disabled={!plan || !!progreso || !plan.documentos.length} onClick={importar} className="flex items-center gap-2 rounded-xl bg-[#0f172a] px-4 py-2 font-bold text-white disabled:opacity-40"><Download size={16}/>{progreso ? 'Importando…' : plan?.documentos.length === 0 ? 'Catálogo completo' : 'Importar documentos'}</button>}
      </footer>
    </section>
  </div>;
}
