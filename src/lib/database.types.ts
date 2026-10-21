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
          apellido: string
          titulo: string | null
          cedula: string | null
          email: string | null
          id_rol: number
          estado: string
          avatar_url: string | null
          /** Ruta de la imagen de firma en el bucket privado `firmas` (migración 0045). */
          firma_path: string | null
          ultima_conexion: string | null
          codigo_institucional: string | null
          facultad_nombre: string | null
          carrera_nombre: string | null
          pao: string | null
          paralelo: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          apellido: string
          titulo?: string | null
          cedula?: string | null
          email?: string | null
          id_rol: number
          estado?: string
          avatar_url?: string | null
          firma_path?: string | null
          ultima_conexion?: string | null
          codigo_institucional?: string | null
          facultad_nombre?: string | null
          carrera_nombre?: string | null
          pao?: string | null
          paralelo?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          nombre?: string
          apellido?: string
          titulo?: string | null
          cedula?: string | null
          email?: string | null
          id_rol?: number
          estado?: string
          avatar_url?: string | null
          firma_path?: string | null
          ultima_conexion?: string | null
          codigo_institucional?: string | null
          facultad_nombre?: string | null
          carrera_nombre?: string | null
          pao?: string | null
          paralelo?: number | null
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
          /** Cuenta del decano (migración 0045). */
          id_decano: string | null
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
          id_decano?: string | null
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
          id_decano?: string | null
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
          /** Cuenta del coordinador de carrera (migración 0045). `director` sigue siendo el nombre impreso. */
          id_director: string | null
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
          id_director?: string | null
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
          id_director?: string | null
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
          /** Solicitud que originó el préstamo (migración 0043). Null en los préstamos de mostrador. */
          id_solicitud: number | null
          /** Unidad física prestada. Una fila = una unidad. Null en los préstamos anteriores a la 0043. */
          id_inventario: string | null
          item_indice: number | null
          fecha_entrega: string | null
          aprobado_por: string | null
          entregado_por: string | null
          recibido_por: string | null
          condicion_devolucion: string | null
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
          id_solicitud?: number | null
          id_inventario?: string | null
          item_indice?: number | null
          fecha_entrega?: string | null
          aprobado_por?: string | null
          entregado_por?: string | null
          recibido_por?: string | null
          condicion_devolucion?: string | null
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
          id_solicitud?: number | null
          id_inventario?: string | null
          item_indice?: number | null
          fecha_entrega?: string | null
          aprobado_por?: string | null
          entregado_por?: string | null
          recibido_por?: string | null
          condicion_devolucion?: string | null
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
          id_materia: string | null
          fecha: string
          hora: string
          estado: string
          items: Json
          observacion: string | null
          /** Asignatura escrita a mano cuando el estudiante no tiene materias cargadas (0043). */
          asignatura_libre: string | null
          decidido_por: string | null
          decidido_en: string | null
          motivo_rechazo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          numero: string
          id_usuario?: string | null
          id_materia: string | null
          fecha: string
          hora: string
          estado?: string
          items?: Json
          observacion?: string | null
          asignatura_libre?: string | null
          decidido_por?: string | null
          decidido_en?: string | null
          motivo_rechazo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          numero?: string
          id_usuario?: string | null
          id_materia?: string | null
          fecha?: string
          hora?: string
          estado?: string
          items?: Json
          observacion?: string | null
          asignatura_libre?: string | null
          decidido_por?: string | null
          decidido_en?: string | null
          motivo_rechazo?: string | null
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
          /** Cuenta que debe revisar el trámite (migración 0045). */
          id_destinatario: string | null
          id_formato: string | null
          /** Veces presentado. 0 = borrador; 2 o más = hubo reenvío. */
          version: number
          borrador: Json | null
          enviada_en: string | null
          decidida_en: string | null
          decidido_por: string | null
          observaciones: string | null
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
          id_destinatario?: string | null
          id_formato?: string | null
          version?: number
          borrador?: Json | null
          enviada_en?: string | null
          decidida_en?: string | null
          decidido_por?: string | null
          observaciones?: string | null
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
          id_destinatario?: string | null
          id_formato?: string | null
          version?: number
          borrador?: Json | null
          enviada_en?: string | null
          decidida_en?: string | null
          decidido_por?: string | null
          observaciones?: string | null
          updated_at?: string
        }
      }
      solicitudes_admin_versiones: {
        Row: {
          id: number
          id_solicitud: number
          version: number
          /** Instantánea completa del documento presentado. No se reescribe nunca. */
          documento: Json
          creada_por: string | null
          creada_en: string
        }
        Insert: {
          id?: number
          id_solicitud: number
          version: number
          documento: Json
          creada_por?: string | null
          creada_en?: string
        }
        Update: Record<string, never>
      }
      solicitudes_admin_eventos: {
        Row: {
          id: number
          id_solicitud: number
          id_version: number | null
          accion: string
          actor: string | null
          observaciones: string | null
          creado_en: string
        }
        Insert: {
          id?: number
          id_solicitud: number
          id_version?: number | null
          accion: string
          actor?: string | null
          observaciones?: string | null
          creado_en?: string
        }
        Update: Record<string, never>
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
      series_formatos: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          id_padre: string | null
          orden: number
          publico: 'estudiantes' | 'docentes' | 'gestion' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          id_padre?: string | null
          orden?: number
          publico?: 'estudiantes' | 'docentes' | 'gestion' | null
        }
        Update: {
          nombre?: string
          descripcion?: string | null
          id_padre?: string | null
          orden?: number
          publico?: 'estudiantes' | 'docentes' | 'gestion' | null
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
          id_serie: string | null
          archivo_path: string | null
          enlace: string | null
          archivo_nombre: string | null
          tamano_bytes: number | null
          tipo_mime: string | null
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
          id_serie?: string | null
          archivo_path?: string | null
          enlace?: string | null
          archivo_nombre?: string | null
          tamano_bytes?: number | null
          tipo_mime?: string | null
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
          id_serie?: string | null
          archivo_path?: string | null
          enlace?: string | null
          archivo_nombre?: string | null
          tamano_bytes?: number | null
          tipo_mime?: string | null
          creado_por?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      /**
       * Unidades del inventario con un préstamo vivo. Solo ids: el estudiante necesita saber
       * qué NO está disponible sin poder leer `prestamos`, donde hay nombres de otras personas.
       */
      unidades_ocupadas: {
        Row: {
          id: string
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
