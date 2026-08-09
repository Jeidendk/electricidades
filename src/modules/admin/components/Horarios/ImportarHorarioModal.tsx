import React, { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useExclusiveModal } from '../../../../hooks/useExclusiveModal';
import {
  COLUMNAS_PLANTILLA,
  construirPlantillaCsv,
  leerArchivoDeHorario,
  validarFilas,
  type CatalogosImportacion,
  type ClaseImportable,
  type ResultadoValidacion,
} from './importarHorario';

interface ImportarHorarioModalProps {
  onClose: () => void;
  catalogos: CatalogosImportacion;
  /** Nombre del aula que se asigna a las filas sin columna "aula". */
  nombreAulaPorDefecto: string;
  /** Inserta las clases confirmadas. Devuelve cuántas quedaron registradas. */
  onImportar: (clases: ClaseImportable[]) => Promise<number>;
}

type Estado = 'esperando-archivo' | 'leyendo' | 'revision' | 'importando';

export const ImportarHorarioModal: React.FC<ImportarHorarioModalProps> = ({
  onClose,
  catalogos,
  nombreAulaPorDefecto,
  onImportar,
}) => {
  useExclusiveModal('horarios:importar', true, onClose);

  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>('esperando-archivo');
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null);
  const [errorLectura, setErrorLectura] = useState('');

  const procesarArchivo = async (archivo: File) => {
    setEstado('leyendo');
    setErrorLectura('');
    setNombreArchivo(archivo.name);

    try {
      const filas = await leerArchivoDeHorario(archivo);
      if (filas.length === 0) {
        setErrorLectura('El archivo no tiene filas con datos.');
        setEstado('esperando-archivo');
        return;
      }
      setResultado(validarFilas(filas, catalogos));
      setEstado('revision');
    } catch (err: any) {
      setErrorLectura(err?.message || 'No se pudo leer el archivo.');
      setEstado('esperando-archivo');
    }
  };

  const handleSeleccionArchivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = ''; // permite volver a elegir el mismo archivo tras corregirlo
    if (archivo) procesarArchivo(archivo);
  };

  const descargarPlantilla = () => {
    const blob = new Blob([construirPlantillaCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'plantilla-horarios.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const confirmarImportacion = async () => {
    if (!resultado || resultado.importables.length === 0) return;
    setEstado('importando');
    try {
      await onImportar(resultado.importables);
      onClose();
    } catch {
      setEstado('revision'); // el error ya se le mostró al usuario desde la página
    }
  };

  const importables = resultado?.importables ?? [];
  const rechazadas = resultado?.rechazadas ?? [];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in no-print">
      <div className="bg-white rounded-3xl w-full max-w-[720px] relative animate-scale-in flex flex-col p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full hover:bg-gray-100 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-5 shrink-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-red-50 text-red-700">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Importar horario</h3>
            <p className="text-[12px] font-medium text-gray-500">
              Sube un archivo .xlsx o .csv. Nada se guarda hasta que revises y confirmes.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 -mr-2">
          {estado === 'esperando-archivo' && (
            <>
              <button
                type="button"
                onClick={() => inputArchivoRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-10 flex flex-col items-center gap-3 hover:border-red-300 hover:bg-red-50/30 transition-colors"
              >
                <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                <span className="text-[13px] font-bold text-gray-700">Seleccionar archivo</span>
                <span className="text-[11px] text-gray-400 font-medium">Formatos aceptados: .xlsx, .csv</span>
              </button>

              {errorLectura && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-[12px] font-semibold text-red-700">
                  {errorLectura}
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Columnas esperadas</p>
                <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
                  {COLUMNAS_PLANTILLA.join(' · ')}
                </p>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                  <b>aula</b> y <b>edificio</b> son opcionales: si no vienen, la clase se asigna a{' '}
                  <b>{nombreAulaPorDefecto || 'el aula seleccionada'}</b>. La materia, el docente y el aula deben existir
                  ya en el sistema; se buscan por nombre (sin distinguir tildes ni mayúsculas).
                </p>
                <button
                  type="button"
                  onClick={descargarPlantilla}
                  className="mt-3 inline-flex items-center gap-2 text-[12px] font-bold text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-full hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar plantilla CSV
                </button>
              </div>
            </>
          )}

          {estado === 'leyendo' && (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-[12px] font-bold">Leyendo y validando {nombreArchivo}…</span>
            </div>
          )}

          {(estado === 'revision' || estado === 'importando') && resultado && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[20px] font-extrabold leading-none">{importables.length}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700/80">Listas para importar</span>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-[20px] font-extrabold leading-none">{rechazadas.length}</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700/80">Se omitirán</span>
                </div>
              </div>

              {importables.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Se van a registrar</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="text-left font-extrabold px-3 py-2">Fila</th>
                          <th className="text-left font-extrabold px-3 py-2">Materia</th>
                          <th className="text-left font-extrabold px-3 py-2">Docente</th>
                          <th className="text-left font-extrabold px-3 py-2">Día y hora</th>
                          <th className="text-left font-extrabold px-3 py-2">Aula</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importables.map(clase => (
                          <tr key={clase.numeroFila} className="border-t border-gray-100 text-gray-700">
                            <td className="px-3 py-2 text-gray-400 font-bold">{clase.numeroFila}</td>
                            <td className="px-3 py-2 font-semibold">{clase.materia}</td>
                            <td className="px-3 py-2">{clase.docente}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{clase.dia} {clase.horaInicio}–{clase.horaFin}</td>
                            <td className="px-3 py-2">{clase.aula}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {rechazadas.length > 0 && (
                <div>
                  <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Filas omitidas y por qué</p>
                  <ul className="flex flex-col gap-2">
                    {rechazadas.map(fila => (
                      <li key={fila.numeroFila} className="rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2">
                        <span className="text-[11px] font-extrabold text-amber-700">Fila {fila.numeroFila}</span>
                        <span className="text-[11px] text-gray-500"> · {fila.resumen}</span>
                        <p className="text-[11px] text-gray-700 font-medium mt-0.5">{fila.motivo}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>

          {estado === 'revision' || estado === 'importando' ? (
            <button
              type="button"
              onClick={confirmarImportacion}
              disabled={importables.length === 0 || estado === 'importando'}
              className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-800 text-white text-[13px] font-bold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-700"
            >
              {estado === 'importando'
                ? 'Importando…'
                : importables.length === 0
                  ? 'Nada que importar'
                  : `Importar ${importables.length} ${importables.length === 1 ? 'clase' : 'clases'}`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => inputArchivoRef.current?.click()}
              className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-800 text-white text-[13px] font-bold shadow-md transition-all"
            >
              Elegir archivo
            </button>
          )}
        </div>

        <input
          ref={inputArchivoRef}
          type="file"
          accept=".xlsx,.xlsm,.csv"
          onChange={handleSeleccionArchivo}
          className="hidden"
        />
      </div>
    </div>
  );
};
