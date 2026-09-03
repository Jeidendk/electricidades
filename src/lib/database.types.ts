export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: number
          nombre: string
          descripcion: string | null
          permisos: Json | null
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: number
          nombre: string
          descripcion?: string | null
          permisos?: Json | null
          activo?: boolean
          created_at?: string
        }
        Update: {
          nombre?: string
          descripcion?: string | null
          permisos?: Json | null
          activo?: boolean
        }
      }
      usuarios: {
        Row: {
          id: string
          nombre: string
          titulo: string | null
          apellidos: string | null
          nombres: string | null
          email: string | null
          id_rol: number
          estado: string
          departamento: string
          especialidad: string | null
          avatar_url: string | null
          ultima_conexion: string | null
          codigo_institucional: string | null
          facultad_nombre: string | null
          carrera_nombre: string | null
          pao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          titulo?: string | null
          apellidos?: string | null
          nombres?: string | null
          email: string | null
          id_rol: number
          estado?: string
          departamento?: string
          especialidad?: string | null
          avatar_url?: string | null
          ultima_conexion?: string | null
          codigo_institucional?: string | null
          facultad_nombre?: string | null
          carrera_nombre?: string | null
          pao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          nombre?: string
          titulo?: string | null
          apellidos?: string | null
          nombres?: string | null
          email?: string | null
          id_rol?: number
          estado?: string
          departamento?: string
          especialidad?: string | null
          avatar_url?: string | null
          ultima_conexion?: string | null
          codigo_institucional?: string | null
          facultad_nombre?: string | null
          carrera_nombre?: string | null
          pao?: string | null
          updated_at?: string
        }
      }
      facultades: {
        Row: {
          id: string
          siglas: string
          nombre: string
          color_hex: string
          icono: string
          custom_svg: string | null
          decano: string
          estado: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          siglas: string
          nombre: string
          color_hex?: string
          icono?: string
          custom_svg?: string | null
          decano?: string
          estado?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          siglas?: string
          nombre?: string
          color_hex?: string
          icono?: string
          custom_svg?: string | null
          decano?: string
          estado?: string
          updated_at?: string
        }
      }
      carreras: {
        Row: {
          id: string
          id_facultad: string
          nombre: string
          color_hex: string
          icono: string
          custom_svg: string | null
          semestres: number
          director: string
          estado: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          id_facultad: string
          nombre: string
          color_hex?: string
          icono?: string
          custom_svg?: string | null
          semestres?: number
          director?: string
          estado?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_facultad?: string
          nombre?: string
          color_hex?: string
          icono?: string
          custom_svg?: string | null
          semestres?: number
          director?: string
          estado?: string
          updated_at?: string
        }
      }
      edificios: {
        Row: {
          id: string
          nombre: string
          pisos: number
          aulas_academicas: number
          laboratorios: number
          estado: string
          ocupacion_pct: number
          imagen_url: string | null
          direccion: string | null
          ultimo_mantenimiento: string | null
          icono: string
          area_m2: number | null
          rating: number | null
          lat: number | null
          lng: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          pisos?: number
          aulas_academicas?: number
          laboratorios?: number
          estado?: string
          ocupacion_pct?: number
          imagen_url?: string | null
          direccion?: string | null
          ultimo_mantenimiento?: string | null
          icono?: string
          area_m2?: number | null
          rating?: number | null
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          nombre?: string
          pisos?: number
          aulas_academicas?: number
          laboratorios?: number
          estado?: string
          ocupacion_pct?: number
          imagen_url?: string | null
          direccion?: string | null
          ultimo_mantenimiento?: string | null
          icono?: string
          area_m2?: number | null
          rating?: number | null
          lat?: number | null
          lng?: number | null
          updated_at?: string
        }
      }
      espacios: {
        Row: {
          id: string
          nombre: string
          id_edificio: string
          piso: number
          tipo: string
          capacidad: number
          m2: number
          equipamiento: string | null
          estado: string
          fotos_json: Json | null
          lat: number | null
          lng: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          id_edificio: string
          piso?: number
          tipo?: string
          capacidad?: number
          m2?: number
          equipamiento?: string | null
          estado?: string
          fotos_json?: Json | null
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          nombre?: string
          id_edificio?: string
          piso?: number
          tipo?: string
          capacidad?: number
          m2?: number
          equipamiento?: string | null
          estado?: string
          fotos_json?: Json | null
          lat?: number | null
          lng?: number | null
          updated_at?: string
        }
      }
      materias: {
        Row: {
          id: string
          id_carrera: string
          semestre: number
          nombre: string
          codigo: string
          creditos: number
          silabo_url: string | null
          programa_url: string | null
          creado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          id_carrera: string
          semestre: number
          nombre: string
          codigo: string
          creditos?: number
          silabo_url?: string | null
          programa_url?: string | null
          creado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_carrera?: string
          semestre?: number
          nombre?: string
          codigo?: string
          creditos?: number
          silabo_url?: string | null
          programa_url?: string | null
          creado_por?: string | null
          updated_at?: string
        }
      }
      recursos: {
        Row: {
          id: number
          tipo: string
          titulo: string
          portada_url: string | null
          formato: string
          size_desc: string | null
          autor: string | null
          descripcion: string | null
          created_at: string
        }
        Insert: {
          id?: number
          tipo?: string
          titulo: string
          portada_url?: string | null
          formato?: string
          size_desc?: string | null
          autor?: string | null
          descripcion?: string | null
          created_at?: string
        }
        Update: {
          tipo?: string
          titulo?: string
          portada_url?: string | null
          formato?: string
          size_desc?: string | null
          autor?: string | null
          descripcion?: string | null
        }
      }
      materia_recursos: {
        Row: {
          id_materia: string
          id_recurso: number
          tipo: string
        }
        Insert: {
          id_materia: string
          id_recurso: number
          tipo?: string
        }
        Update: {
          tipo?: string
        }
      }
      inventario: {
        Row: {
          id: string
          serie: string
          nombre: string
          categoria: string
          id_espacio: string | null
          estado: string
          danio_desc: string | null
          fotos_json: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          serie: string
          nombre: string
          categoria?: string
          id_espacio?: string | null
          estado?: string
          danio_desc?: string | null
          fotos_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          serie?: string
          nombre?: string
          categoria?: string
          id_espacio?: string | null
          estado?: string
          danio_desc?: string | null
          fotos_json?: Json | null
          updated_at?: string
        }
      }
      catalogo_equipos: {
        Row: {
          id: string
          serie: string
          nombre: string
          categoria: string
          stock: number
          stock_total: number
          estado: string
          fotos_json: Json | null
          ubicacion: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          serie: string
          nombre: string
          categoria?: string
          stock?: number
          stock_total?: number
          estado?: string
          fotos_json?: Json | null
          ubicacion: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          serie?: string
          nombre?: string
          categoria?: string
          stock?: number
          stock_total?: number
          estado?: string
          fotos_json?: Json | null
          ubicacion?: string
          updated_at?: string
        }
      }
      clases: {
        Row: {
          id: string
          id_materia: string
          id_docente: string
          id_espacio: string | null
          paralelo: number | null
          dia: string
          hora_inicio: string
          hora_fin: string
          semana_desde: string | null
          semana_hasta: string | null
          creado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          id_materia: string
          id_docente: string
          id_espacio?: string | null
          paralelo?: number | null
          dia: string
          hora_inicio: string
          hora_fin: string
          semana_desde?: string | null
          semana_hasta?: string | null
          creado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_materia?: string
          id_docente?: string
          id_espacio?: string | null
          paralelo?: number | null
          dia?: string
          hora_inicio?: string
          hora_fin?: string
          semana_desde?: string | null
          semana_hasta?: string | null
          creado_por?: string | null
          updated_at?: string
        }
      }
      horario_estudiante: {
        Row: {
          id: string
          id_usuario: string
          id_clase: string
          periodo: string
          estado_inscripcion: string
          created_at: string
        }
        Insert: {
          id?: string
          id_usuario: string
          id_clase: string
          periodo?: string
          estado_inscripcion?: string
          created_at?: string
        }
        Update: {
          id_usuario?: string
          id_clase?: string
          periodo?: string
          estado_inscripcion?: string
        }
      }
      prestamos: {
        Row: {
          id: string
          id_usuario_estudiante: string | null
          estudiante_nombre: string
          equipo_id: string
          equipo_nombre: string
          cantidad: number
          fecha_prestamo: string
          fecha_devolucion_esperada: string
          fecha_devolucion_real: string | null
          estado: string
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          id_usuario_estudiante?: string | null
          estudiante_nombre: string
          equipo_id: string
          equipo_nombre: string
          cantidad?: number
          fecha_prestamo: string
          fecha_devolucion_esperada: string
          fecha_devolucion_real?: string | null
          estado?: string
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_usuario_estudiante?: string | null
          estudiante_nombre?: string
          equipo_id?: string
          equipo_nombre?: string
          cantidad?: number
          fecha_prestamo?: string
          fecha_devolucion_esperada?: string
          fecha_devolucion_real?: string | null
          estado?: string
          observaciones?: string | null
          updated_at?: string
        }
      }
      ordenes_mantenimiento: {
        Row: {
          id: string
          id_inventario: string
          recurso_nombre: string
          categoria: string
          ubicacion: string
          descripcion: string
          prioridad: string
          estado: string
          id_tecnico: string | null
          fecha_reporte: string
          fecha_cierre: string | null
          creado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          id_inventario: string
          recurso_nombre: string
          categoria: string
          ubicacion: string
          descripcion: string
          prioridad?: string
          estado?: string
          id_tecnico?: string | null
          fecha_reporte: string
          fecha_cierre?: string | null
          creado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id_inventario?: string
          recurso_nombre?: string
          categoria?: string
          ubicacion?: string
          descripcion?: string
          prioridad?: string
          estado?: string
          id_tecnico?: string | null
          fecha_reporte?: string
          fecha_cierre?: string | null
          creado_por?: string | null
          updated_at?: string
        }
      }
      solicitudes_equipo: {
        Row: {
          id: number
          numero: string
          id_usuario: string | null
          id_materia: string
          fecha: string
          hora: string
          estado: string
          items: Json
          observacion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          numero: string
          id_usuario?: string | null
          id_materia: string
          fecha: string
          hora: string
          estado?: string
          items?: Json
          observacion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          numero?: string
          id_usuario?: string | null
          id_materia?: string
          fecha?: string
          hora?: string
          estado?: string
          items?: Json
          observacion?: string | null
          updated_at?: string
        }
      }
      solicitudes_admin: {
        Row: {
          id: number
          numero: string
          asunto: string
          tipo: string
          id_usuario: string | null
          fecha: string
          estado: string
          descripcion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          numero: string
          asunto: string
          tipo?: string
          id_usuario?: string | null
          fecha: string
          estado?: string
          descripcion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          numero?: string
          asunto?: string
          tipo?: string
          id_usuario?: string | null
          fecha?: string
          estado?: string
          descripcion?: string | null
          updated_at?: string
        }
      }
      asignaciones: {
        Row: {
          id: string
          id_espacio: string
          id_tecnico: string
          tipo_especialidad: string | null
          descripcion: string | null
          fecha_desde: string
          fecha_hasta: string | null
          activa: boolean
          created_at: string
        }
        Insert: {
          id?: string
          id_espacio: string
          id_tecnico: string
          tipo_especialidad?: string | null
          descripcion?: string | null
          fecha_desde: string
          fecha_hasta?: string | null
          activa?: boolean
          created_at?: string
        }
        Update: {
          id_espacio?: string
          id_tecnico?: string
          tipo_especialidad?: string | null
          descripcion?: string | null
          fecha_desde?: string
          fecha_hasta?: string | null
          activa?: boolean
        }
      }
      formatos: {
        Row: {
          id: string
          nombre: string
          tipo: string
          estado: string
          descripcion: string | null
          datos: Json
          creado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          tipo?: string
          estado?: string
          descripcion?: string | null
          datos?: Json
          creado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          nombre?: string
          tipo?: string
          estado?: string
          descripcion?: string | null
          datos?: Json
          creado_por?: string | null
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
