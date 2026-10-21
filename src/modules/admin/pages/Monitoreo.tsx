import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, Plus, Pencil, Trash2, Search, RotateCcw, X, User, Clock, Database, FileSearch,
  Undo2, CheckCircle2,
} from 'lucide-react';
import { confirmarAccion, avisoExito } from '../../../lib/aviso';
import { PageHero } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';
import {
  useAuditoriaStore, LIMITE_AUDITORIA,
  type MovimientoAuditoria, type OperacionAuditoria,
} from '../../../store/auditoriaStore';
import { normalizarTexto, componerNombreCompleto } from '../../../lib/texto';

/** Nombre técnico de la tabla → cómo se lo nombra en pantalla. */
const TABLA_ETIQUETA: Record<string, string> = {
  espacios: 'Aulas y laboratorios',
  edificios: 'Edificios',
  clases: 'Horarios',
  materias: 'Materias',
  carreras: 'Carreras',
  facultades: 'Facultades',
  inventario: 'Inventario',
  usuarios: 'Usuarios y docentes',
  asignaciones: 'Asignaciones',
  ordenes_mantenimiento: 'Mantenimiento',
  prestamos: 'Préstamos',
  solicitudes_equipo: 'Solicitudes de equipos',
  solicitudes_admin: 'Trámites',
  formatos: 'Formatos',
  recursos: 'Recursos',
};

/**
 * Si aparece una tabla sin traducir, se muestra algo legible en vez del nombre técnico:
 * «ordenes_mantenimiento» no le dice nada a quien revisa, y delata cómo se llama por dentro.
 */
const nombreTabla = (t: string) =>
  TABLA_ETIQUETA[t] ?? t.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

/** Nombre técnico de la columna → cómo se lo nombra en pantalla. */
const CAMPO_ETIQUETA: Record<string, string> = {
  nombre: 'Nombre', apellido: 'Apellido', titulo: 'Título', codigo: 'Código', serie: 'Serie',
  email: 'Correo', estado: 'Estado', tipo: 'Tipo', piso: 'Piso', capacidad: 'Capacidad',
  m2: 'Área (m²)', equipamiento: 'Equipamiento', descripcion: 'Descripción',
  observaciones: 'Observaciones', direccion: 'Dirección', departamento: 'Departamento',
  dia: 'Día', hora_inicio: 'Hora de inicio', hora_fin: 'Hora de fin', paralelo: 'Paralelo',
  semestre: 'PAO', creditos: 'Créditos', pao: 'PAO', categoria: 'Categoría',
  danio_desc: 'Descripción del daño', prioridad: 'Prioridad', cantidad: 'Cantidad',
  fecha_devolucion: 'Fecha de devolución', ultima_conexion: 'Última conexión',
  codigo_institucional: 'Código institucional', facultad_nombre: 'Facultad',
  carrera_nombre: 'Carrera', avatar_url: 'Avatar', lat: 'Latitud', lng: 'Longitud',
};

const nombreCampo = (c: string) =>
  CAMPO_ETIQUETA[c] ?? c.replace(/_/g, ' ').replace(/^./, l => l.toUpperCase());

/**
 * Columnas que no se muestran: identificadores y marcas internas. No aportan a quien revisa
 * —un uuid no dice de qué registro habla— y son ruido que tapa el dato que sí importa.
 */
const esCampoInterno = (c: string) =>
  c === 'id' || /^id_|_id$/.test(c) || /_json$/.test(c) ||
  ['created_at', 'updated_at', 'creado_por', 'password', 'fotos'].includes(c);

/** Las tres operaciones, con el color y el verbo con que se leen. */
const OPERACIONES: { valor: OperacionAuditoria; etiqueta: string; Icon: React.ElementType; clases: string }[] = [
  { valor: 'INSERT', etiqueta: 'Creó', Icon: Plus, clases: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { valor: 'UPDATE', etiqueta: 'Editó', Icon: Pencil, clases: 'bg-amber-50 text-amber-700 border-amber-200' },
  { valor: 'DELETE', etiqueta: 'Eliminó', Icon: Trash2, clases: 'bg-red-50 text-red-700 border-red-200' },
];

const infoOperacion = (op: OperacionAuditoria) =>
  OPERACIONES.find(o => o.valor === op) ?? OPERACIONES[1];

/**
 * La frase que resume el movimiento: "Editó el aula Aula 103 · cambió Nombre y Capacidad".
 * El dato ya estaba repartido entre cuatro columnas —acción, módulo, registro, cambios— y
 * había que recomponerlo mentalmente; dicho en una línea se lee de corrido.
 */
const resumenMovimiento = (m: MovimientoAuditoria): string => {
  const verbo = infoOperacion(m.operacion).etiqueta;
  const nombre = etiquetaRegistro(m);
  const objeto = `${entidadDe(m.tabla)}${nombre ? ` ${nombre}` : ''}`.trim();

  if (m.operacion !== 'UPDATE') return `${verbo} ${objeto}`;

  const campos = m.camposCambiados.filter(c => !esCampoInterno(c)).map(nombreCampo);
  if (campos.length === 0) return `${verbo} ${objeto} · solo datos internos`;
  const lista = campos.length === 1
    ? campos[0]
    : `${campos.slice(0, -1).join(', ')} y ${campos[campos.length - 1]}`;
  return `${verbo} ${objeto} · cambió ${lista}`;
};

const fechaLegible = (iso: string) => {
  const d = new Date(iso);
  return {
    fecha: d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }),
    hora: d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
  };
};

/** Cómo se nombra UN registro de cada tabla. Se lee "Editó el Aula 103". */
const ENTIDAD_SINGULAR: Record<string, string> = {
  espacios: 'el aula o laboratorio', edificios: 'el edificio', clases: 'la clase',
  materias: 'la materia', carreras: 'la carrera', facultades: 'la facultad',
  inventario: 'el equipo', usuarios: 'la ficha de', asignaciones: 'la asignación',
  ordenes_mantenimiento: 'la orden de mantenimiento', prestamos: 'el préstamo',
  solicitudes_equipo: 'la solicitud de equipos', solicitudes_admin: 'el trámite',
  formatos: 'el formato', recursos: 'el recurso',
};

const entidadDe = (t: string) => ENTIDAD_SINGULAR[t] ?? 'el registro en';

/**
 * Nombre del registro afectado. El trigger guarda `registro_etiqueta` tomando la columna
 * `nombre`, pero desde la migración 0030 `usuarios.nombre` es SOLO el nombre de pila: así
 * salía "ENRIQUE" en vez de "ENRIQUE GUAMBO". Se recompone leyendo la instantánea guardada,
 * lo que además arregla los movimientos ya registrados sin tocar la base.
 */
const etiquetaRegistro = (m: MovimientoAuditoria): string => {
  const datos = (m.datosDespues ?? m.datosAntes ?? {}) as Record<string, unknown>;
  if (m.tabla === 'usuarios') {
    const completo = componerNombreCompleto(datos.nombre as string, datos.apellido as string);
    if (completo) return completo;
  }
  return m.registroEtiqueta || '';
};

/** True si el texto parece una marca de tiempo ISO: `2026-10-21T23:10:56.834+00:00`. */
const esFechaIso = (v: string) => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v);

/**
 * Valor de una celda del detalle. Las fechas crudas no se leen, y «true/false» tampoco dice
 * mucho: se traducen. Los objetos se imprimen como JSON y lo vacío se marca.
 */
const valorLegible = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'string') {
    if (esFechaIso(v)) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('es-EC', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return new Date(`${v}T12:00:00`).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return v;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

/** Qué significa deshacer cada operación, dicho en los términos del usuario. */
const TEXTO_RESTAURAR: Record<OperacionAuditoria, { boton: string; confirma: string }> = {
  DELETE: {
    boton: 'Restaurar registro',
    confirma: 'Se volverá a crear el registro con los datos que tenía antes de borrarse.',
  },
  UPDATE: {
    boton: 'Deshacer cambios',
    confirma: 'Los campos modificados volverán a su valor anterior. El resto del registro no se toca.',
  },
  INSERT: {
    boton: 'Deshacer creación',
    confirma: 'Se eliminará el registro que se creó en este movimiento.',
  },
};

export const Monitoreo = () => {
  const { movimientos, loading, disponible, fetchMovimientos, restaurar } = useAuditoriaStore();
  const [restaurando, setRestaurando] = useState(false);

  const [fTabla, setFTabla] = useState('');
  const [fOperacion, setFOperacion] = useState<OperacionAuditoria | ''>('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState<MovimientoAuditoria | null>(null);

  // Los filtros que acotan la CONSULTA viajan al servidor; la búsqueda por texto se aplica
  // sobre lo ya traído, porque cruza usuario y nombre del registro.
  useEffect(() => {
    fetchMovimientos({
      tabla: fTabla || undefined,
      operacion: fOperacion || undefined,
      desde: fDesde || undefined,
      hasta: fHasta || undefined,
    });
  }, [fTabla, fOperacion, fDesde, fHasta]);

  const hayFiltros = !!(fTabla || fOperacion || fDesde || fHasta || busqueda);

  const limpiar = () => {
    setFTabla(''); setFOperacion(''); setFDesde(''); setFHasta(''); setBusqueda('');
  };

  const recargar = () => fetchMovimientos({
    tabla: fTabla || undefined,
    operacion: fOperacion || undefined,
    desde: fDesde || undefined,
    hasta: fHasta || undefined,
  });

  const pedirRestaurar = async (m: MovimientoAuditoria) => {
    const { boton, confirma } = TEXTO_RESTAURAR[m.operacion];
    const ok = await confirmarAccion({
      title: `¿${boton}?`,
      // Se nombra el registro y se avisa de lo que NO hace: restaurar un aula no devuelve
      // las clases que se borraron con ella, y esa expectativa es la que más fácil falla.
      text: `${m.registroEtiqueta || 'El registro'} · ${nombreTabla(m.tabla)}. ${confirma} `
        + 'No se restauran en cascada los registros relacionados, y la restauración queda registrada.',
      confirmar: boton,
    });
    if (!ok) return;

    setRestaurando(true);
    const mensaje = await restaurar(m.id);
    setRestaurando(false);
    if (mensaje) {
      setDetalle(null);
      await recargar();
      void avisoExito('Restaurado', mensaje);
    }
  };

  const filtrados = useMemo(() => {
    const q = normalizarTexto(busqueda.trim());
    if (!q) return movimientos;
    return movimientos.filter(m =>
      normalizarTexto(m.usuarioNombre ?? '').includes(q) ||
      normalizarTexto(etiquetaRegistro(m)).includes(q) ||
      normalizarTexto(m.registroId ?? '').includes(q) ||
      normalizarTexto(nombreTabla(m.tabla)).includes(q),
    );
  }, [movimientos, busqueda]);

  const kpis = useMemo(() => ({
    total: filtrados.length,
    creados: filtrados.filter(m => m.operacion === 'INSERT').length,
    editados: filtrados.filter(m => m.operacion === 'UPDATE').length,
    eliminados: filtrados.filter(m => m.operacion === 'DELETE').length,
  }), [filtrados]);

  const columnas: DataTableColumn<MovimientoAuditoria>[] = [
    {
      key: 'fecha', header: 'Fecha', width: '0.8fr',
      sortValue: m => m.createdAt,
      render: m => {
        const { fecha, hora } = fechaLegible(m.createdAt);
        return (
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-bold text-gray-900">{fecha}</span>
            <span className="text-[10px] text-gray-400">{hora}</span>
          </div>
        );
      },
    },
    {
      key: 'usuario', header: 'Usuario', width: '1.2fr',
      sortValue: m => m.usuarioNombre ?? '',
      render: m => (
        <div className="flex flex-col min-w-0">
          {m.usuarioNombre ? (
            <span className="text-[12px] font-bold text-gray-900 truncate">{m.usuarioNombre}</span>
          ) : (
            // Sin sesión detrás: tareas del servidor o el trigger que crea la ficha al
            // registrarse. Se dice explícitamente en vez de dejar la celda vacía.
            <span className="text-[12px] font-semibold italic text-gray-400">Sistema</span>
          )}
          {m.usuarioRol && <span className="text-[10px] text-gray-400 truncate">{m.usuarioRol}</span>}
        </div>
      ),
    },
    {
      key: 'operacion', header: 'Acción', width: '0.7fr', align: 'center',
      sortValue: m => m.operacion,
      render: m => {
        const { etiqueta, Icon, clases } = infoOperacion(m.operacion);
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${clases}`}>
            <Icon className="h-3 w-3" /> {etiqueta}
          </span>
        );
      },
    },
    {
      key: 'tabla', header: 'Módulo', width: '1fr',
      sortValue: m => nombreTabla(m.tabla),
      render: m => <span className="text-[12px] font-semibold text-gray-700 truncate">{nombreTabla(m.tabla)}</span>,
    },
    {
      key: 'registro', header: 'Registro', width: '1.3fr',
      sortValue: m => etiquetaRegistro(m),
      // El id no se muestra: un uuid no identifica nada para quien revisa. Si el registro no
      // tenía nombre, se dice eso en vez de caer al identificador.
      render: m => (
        <span className="truncate text-[12px] font-bold text-gray-800">
          {etiquetaRegistro(m) || <span className="font-semibold italic text-gray-400">Sin nombre</span>}
        </span>
      ),
    },
    {
      key: 'cambios', header: 'Cambios', width: '1.1fr',
      render: m => {
        if (m.operacion !== 'UPDATE') return <span className="text-[11px] text-gray-300">—</span>;
        const visibles = m.camposCambiados.filter(c => !esCampoInterno(c)).map(nombreCampo);
        // Si solo cambiaron columnas internas, decirlo: una celda vacía haría pensar que no
        // cambió nada, cuando el movimiento sí ocurrió.
        if (visibles.length === 0) {
          return <span className="text-[11px] italic text-gray-400">Datos internos</span>;
        }
        return (
          <span className="truncate text-[11px] text-gray-500" title={visibles.join(', ')}>
            {visibles.slice(0, 3).join(', ')}
            {visibles.length > 3 && ` +${visibles.length - 3}`}
          </span>
        );
      },
    },
    {
      key: 'estado', header: '', width: '0.5fr', align: 'center',
      render: m => (
        m.restauradoEn ? (
          <span
            title={`Restaurado el ${fechaLegible(m.restauradoEn).fecha}`}
            className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9.5px] font-extrabold text-sky-700"
          >
            <Undo2 className="h-3 w-3" /> Restaurado
          </span>
        ) : null
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      <PageHero
        icon={ShieldCheck}
        title="Monitoreo"
        subtitle="Quién creó, editó o eliminó información en el sistema."
        backgroundImage={HERO_BG.dashboard}
        stats={[
          { Icon: Database, value: kpis.total, label: 'Movimientos' },
          { Icon: Plus, value: kpis.creados, label: 'Creados' },
          { Icon: Pencil, value: kpis.editados, label: 'Editados' },
          { Icon: Trash2, value: kpis.eliminados, label: 'Eliminados' },
        ]}
      />

      <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto lg:overflow-hidden p-3 sm:p-6 md:p-8">
        {/* FILTROS */}
        <div className="shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px] sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar usuario o registro..."
              className="w-full sm:w-[230px] rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-[12px] font-medium text-gray-700 outline-none transition-colors focus:border-indigo-400"
            />
          </div>

          <select
            value={fOperacion}
            onChange={e => setFOperacion(e.target.value as OperacionAuditoria | '')}
            className="rounded-lg border border-gray-200 bg-white py-2 px-3 text-[12px] font-bold text-gray-700 outline-none transition-colors focus:border-indigo-400 cursor-pointer"
          >
            <option value="">Toda acción</option>
            {OPERACIONES.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
          </select>

          <select
            value={fTabla}
            onChange={e => setFTabla(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 px-3 text-[12px] font-bold text-gray-700 outline-none transition-colors focus:border-indigo-400 cursor-pointer"
          >
            <option value="">Todo módulo</option>
            {Object.keys(TABLA_ETIQUETA).map(t => (
              <option key={t} value={t}>{TABLA_ETIQUETA[t]}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)} title="Desde"
              className="rounded-lg border border-gray-200 bg-white py-2 px-2.5 text-[11.5px] font-semibold text-gray-700 outline-none focus:border-indigo-400" />
            <span className="text-[11px] font-bold text-gray-400">a</span>
            <input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)} title="Hasta"
              className="rounded-lg border border-gray-200 bg-white py-2 px-2.5 text-[11.5px] font-semibold text-gray-700 outline-none focus:border-indigo-400" />
          </div>

          {hayFiltros && (
            <button onClick={limpiar} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 transition-colors hover:text-indigo-700">
              <RotateCcw className="h-3 w-3" /> Limpiar
            </button>
          )}

          {movimientos.length >= LIMITE_AUDITORIA && (
            <span className="text-[10.5px] font-bold text-amber-600">
              Mostrando los {LIMITE_AUDITORIA} más recientes · acota con los filtros
            </span>
          )}
        </div>

        {/* TABLA */}
        <div className="relative flex-1 lg:min-h-0 flex flex-col">
          {!disponible ? (
            <EmptyState
              icon={Database}
              variant="card"
              title="La auditoría todavía no está activa"
              description="Falta ejecutar la migración 0048 en Supabase. Hasta entonces no se registra ningún movimiento."
            />
          ) : loading && movimientos.length === 0 ? (
            <EmptyState icon={Clock} variant="card" title="Cargando movimientos..." />
          ) : (
            <DataTable
              fill
              rows={filtrados}
              rowKey={m => String(m.id)}
              columns={columnas}
              onRowClick={m => setDetalle(m)}
              minWidthClass="min-w-[1020px]"
              defaultPerPage={15}
              emptyState={
                <EmptyState
                  icon={FileSearch}
                  variant="card"
                  title={hayFiltros ? 'Sin movimientos con estos filtros' : 'Todavía no hay movimientos'}
                  description={hayFiltros ? undefined : 'Cuando alguien cree, edite o elimine algo, aparecerá aquí.'}
                  secondaryLabel={hayFiltros ? 'Limpiar filtros' : undefined}
                  onSecondary={hayFiltros ? limpiar : undefined}
                />
              }
            />
          )}
        </div>
      </div>

      {/* DETALLE */}
      {detalle && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl animate-scale-in">
            <AcentoTarjeta />
            <div className="shrink-0 border-b border-gray-100 p-5 sm:p-6">
              <button onClick={() => setDetalle(null)} className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
              {/* Qué pasó, en una frase. Antes había que recomponerlo entre la insignia, el
                  módulo y la lista de campos de más abajo. */}
              <div className="flex items-start gap-2.5 pr-8">
                {(() => {
                  const { Icon, clases } = infoOperacion(detalle.operacion);
                  return (
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${clases}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  );
                })()}
                <h3 className="text-[16px] font-bold leading-snug tracking-tight text-gray-900">
                  {resumenMovimiento(detalle)}
                </h3>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-gray-500">
                {/* "Por" explícito: en un movimiento sobre la ficha de una persona, su nombre
                    sale dos veces —como autor y como registro afectado— y sin esto no se
                    distingue quién hizo el cambio de a quién se lo hicieron. */}
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  Por {detalle.usuarioNombre ?? 'el sistema'}{detalle.usuarioRol ? ` · ${detalle.usuarioRol}` : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {fechaLegible(detalle.createdAt).fecha}, {fechaLegible(detalle.createdAt).hora}
                </span>
                <span className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-gray-400" /> {nombreTabla(detalle.tabla)}
                </span>
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6">
              {detalle.operacion === 'UPDATE' ? (
                // Solo los campos que cambiaron: volcar la fila entera obliga a buscar la
                // diferencia a ojo, que es justo lo que esta pantalla tiene que evitar.
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Campos modificados ({detalle.camposCambiados.filter(c => !esCampoInterno(c)).length})
                  </p>
                  {detalle.camposCambiados.filter(c => !esCampoInterno(c)).length === 0 && (
                    <p className="py-2 text-[11.5px] italic text-gray-400">
                      Solo cambiaron datos internos del registro.
                    </p>
                  )}
                  {detalle.camposCambiados.filter(c => !esCampoInterno(c)).map(campo => (
                    <div key={campo} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                      <p className="mb-1.5 text-[11px] font-extrabold text-gray-700">{nombreCampo(campo)}</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="min-w-0 rounded-lg border border-red-100 bg-red-50/50 p-2">
                          <span className="block text-[9px] font-extrabold uppercase tracking-widest text-red-400">Antes</span>
                          <span className="block break-words text-[11.5px] font-semibold text-gray-700">
                            {valorLegible(detalle.datosAntes?.[campo])}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2">
                          <span className="block text-[9px] font-extrabold uppercase tracking-widest text-emerald-500">Después</span>
                          <span className="block break-words text-[11.5px] font-semibold text-gray-700">
                            {valorLegible(detalle.datosDespues?.[campo])}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    {detalle.operacion === 'DELETE' ? 'Datos eliminados' : 'Datos creados'}
                  </p>
                  <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/50">
                    {Object.entries(detalle.datosDespues ?? detalle.datosAntes ?? {})
                      .filter(([campo]) => !esCampoInterno(campo))
                      .map(([campo, valor]) => (
                        <div key={campo} className="flex gap-3 px-3 py-2">
                          <span className="w-[38%] shrink-0 break-words text-[11px] font-extrabold text-gray-600">{nombreCampo(campo)}</span>
                          <span className="min-w-0 flex-1 break-words text-[11.5px] font-semibold text-gray-700">{valorLegible(valor)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* PIE: restaurar */}
            <div className="shrink-0 border-t border-gray-100 bg-gray-50/60 px-5 py-3.5 sm:px-6">
              {detalle.restauradoEn ? (
                <p className="flex items-center justify-center gap-2 text-[11.5px] font-bold text-sky-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Restaurado el {fechaLegible(detalle.restauradoEn).fecha}, {fechaLegible(detalle.restauradoEn).hora}
                </p>
              ) : (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] leading-snug text-gray-500">
                    Deshacer no borra el rastro: queda registrado como un movimiento más.
                  </p>
                  <button
                    onClick={() => pedirRestaurar(detalle)}
                    disabled={restaurando}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-gray-800 bg-espoch-ink px-5 py-2.5 text-[12px] font-bold text-white shadow-lg transition-all hover:bg-black disabled:opacity-50"
                  >
                    {restaurando
                      ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      : <Undo2 className="h-3.5 w-3.5" />}
                    {TEXTO_RESTAURAR[detalle.operacion].boton}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Monitoreo;
