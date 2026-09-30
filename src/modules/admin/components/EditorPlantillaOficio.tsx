import type { PlantillaOficio } from '../../../lib/plantillaOficio';

interface Props {
  plantilla: PlantillaOficio;
  onChange: (plantilla: PlantillaOficio) => void;
  nombre: string;
  onNombre: (nombre: string) => void;
  categoria: string;
  onCategoria: (id: string) => void;
  categorias: { id: string; nombre: string }[];
}

/** Edita el texto y los marcadores del modelo, sin rellenarlos con datos de un estudiante. */
export function EditorPlantillaOficio({ plantilla, onChange, nombre, onNombre, categoria, onCategoria, categorias }: Props) {
  const campo = 'mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 text-sm font-normal text-gray-800 outline-none focus:border-blue-400';
  return <div className="space-y-5 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
    <h3 className="font-bold text-gray-900">Contenido de la plantilla</h3>
    <p className="text-xs text-gray-500">Conserva los campos entre corchetes, como [NOMBRES Y APELLIDOS], para que el estudiante los complete al utilizar el modelo.</p>
    <label className="block text-xs font-bold text-gray-600">Nombre del modelo
      <input className={campo} value={nombre} onChange={e => onNombre(e.target.value)} />
    </label>
    <label className="block text-xs font-bold text-gray-600">Categoría documental
      <select className={campo} value={categoria} onChange={e => onCategoria(e.target.value)}>
        <option value="">Seleccione una categoría</option>
        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
    </label>
    <label className="block text-xs font-bold text-gray-600">Destinatario · una línea por tratamiento, nombre o cargo
      <textarea className={campo} rows={3} value={plantilla.destinatario.join('\n')} onChange={e => onChange({ ...plantilla, destinatario: e.target.value.split('\n') })} />
    </label>
    <label className="block text-xs font-bold text-gray-600">Asunto
      <input className={campo} value={plantilla.asunto} onChange={e => onChange({ ...plantilla, asunto: e.target.value })} />
    </label>
    <label className="block text-xs font-bold text-gray-600">Cuerpo del oficio · separa los párrafos con una línea en blanco
      <textarea className={campo} rows={12} value={plantilla.parrafos.join('\n\n')} onChange={e => onChange({ ...plantilla, parrafos: e.target.value.split('\n\n') })} />
    </label>
    <label className="block text-xs font-bold text-gray-600">Documentos adjuntos · uno por línea
      <textarea className={campo} rows={4} value={plantilla.adjuntos.join('\n')} onChange={e => onChange({ ...plantilla, adjuntos: e.target.value.split('\n') })} />
    </label>
    <label className="block text-xs font-bold text-gray-600">Referencia y orientaciones
      <textarea className={campo} rows={3} value={plantilla.referencia} onChange={e => onChange({ ...plantilla, referencia: e.target.value })} />
    </label>
    {plantilla.tieneTabla && <p className="text-xs text-amber-800">El documento original incluye una tabla que el generador aún no reproduce.</p>}
  </div>;
}
