import { Cpu, FlaskConical, Briefcase, Zap, Laptop, Wifi, Stethoscope, Globe, Palette, Microscope, PenTool, Database, Activity, Calculator, Compass, Leaf, Network, BookOpen, Building } from 'lucide-react';

export const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
export const diasFormales = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const horas = [
  '07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00',
  '11:00 - 12:00', '12:00 - 13:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'
];

export const availableIcons: Record<string, any> = {
  Cpu, FlaskConical, Briefcase, Stethoscope, Globe, Palette, 
  Microscope, PenTool, Laptop, Zap, Database, Activity, Calculator,
  Compass, Leaf, Network, Wifi, BookOpen, Building
};

export const facultadesMock: { id: string; siglas: string; nombre: string; colorHex: string; icono: string; customSvg: string | null }[] = [
  { id: 'FAC001', siglas: 'FIE', nombre: 'Facultad de Informática y Electrónica', colorHex: '#9333ea', icono: 'Cpu', customSvg: null },
  { id: 'FAC002', siglas: 'FADE', nombre: 'Facultad de Administración de Empresas', colorHex: '#10b981', icono: 'Briefcase', customSvg: null },
  { id: 'FAC003', siglas: 'FM', nombre: 'Facultad de Mecánica', colorHex: '#2563eb', icono: 'Zap', customSvg: null },
];

export const carrerasMock: { id: string; idFacultad: string; nombre: string; colorHex: string; icono: string; customSvg: string | null }[] = [
  { id: 'CAR001', idFacultad: 'FAC001', nombre: 'Ingeniería de Software', colorHex: '#2563eb', icono: 'Laptop', customSvg: null },
  { id: 'CAR002', idFacultad: 'FAC001', nombre: 'Telecomunicaciones', colorHex: '#0891b2', icono: 'Wifi', customSvg: null },
  { id: 'CAR003', idFacultad: 'FAC001', nombre: 'Electrónica y Automatización', colorHex: '#e11d48', icono: 'Cpu', customSvg: null },
  { id: 'CAR004', idFacultad: 'FAC002', nombre: 'Administración de Empresas', colorHex: '#d97706', icono: 'Briefcase', customSvg: null },
  { id: 'CAR005', idFacultad: 'FAC003', nombre: 'Ingeniería Automotriz', colorHex: '#10b981', icono: 'Zap', customSvg: null },
];

export const initialClases = [
  { id: 'C001', materia: 'Sistemas Eléctricos', docente: 'Ing. Roberto Sanchez', aula: 'FIE-201', edificio: 'Edificio FIE-A', tipoEspacio: 'Aula', idFacultad: 'FAC001', idCarrera: 'CAR003', dia: 'Lunes', hora: '07:00 - 08:00', creadoPor: 'USR001' },
  { id: 'C002', materia: 'Sistemas Eléctricos', docente: 'Ing. Roberto Sanchez', aula: 'FIE-201', edificio: 'Edificio FIE-A', tipoEspacio: 'Aula', idFacultad: 'FAC001', idCarrera: 'CAR003', dia: 'Lunes', hora: '08:00 - 09:00', creadoPor: 'USR001' },
  { id: 'C003', materia: 'Programación Web', docente: 'Ing. María López', aula: 'Lab. Cómputo 1', edificio: 'Centro de Cómputo', tipoEspacio: 'Lab Informático', idFacultad: 'FAC001', idCarrera: 'CAR001', dia: 'Martes', hora: '09:00 - 10:00', creadoPor: 'TEC001' },
  { id: 'C004', materia: 'Programación Web', docente: 'Ing. María López', aula: 'Lab. Cómputo 1', edificio: 'Centro de Cómputo', tipoEspacio: 'Lab Informático', idFacultad: 'FAC001', idCarrera: 'CAR001', dia: 'Martes', hora: '10:00 - 11:00', creadoPor: 'TEC001' },
  { id: 'C005', materia: 'Redes II', docente: 'Ing. Carlos Mendoza', aula: 'Lab. Telecomunicaciones', edificio: 'Bloque de Laboratorios', tipoEspacio: 'Lab Técnico', idFacultad: 'FAC001', idCarrera: 'CAR002', dia: 'Miércoles', hora: '14:00 - 15:00', creadoPor: 'TEC002' },
  { id: 'C006', materia: 'Redes II', docente: 'Ing. Carlos Mendoza', aula: 'Lab. Telecomunicaciones', edificio: 'Bloque de Laboratorios', tipoEspacio: 'Lab Técnico', idFacultad: 'FAC001', idCarrera: 'CAR002', dia: 'Miércoles', hora: '15:00 - 16:00', creadoPor: 'TEC002' },
  { id: 'C007', materia: 'Gestión Financiera', docente: 'Ing. Ana Gómez', aula: 'Aula 301', edificio: 'Edificio FIE-B', tipoEspacio: 'Aula', idFacultad: 'FAC002', idCarrera: 'CAR004', dia: 'Jueves', hora: '11:00 - 12:00', creadoPor: 'USR001' },
];

export const initialMapLocations = [
  { id: '1', nombre: 'Edificio Principal FIE', tipo: 'Edificio', lat: -1.6582, lng: -78.6781, estado: 'operativo', imagen: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=250&fit=crop', capacidad: 500, detalle: 'Facultad de Informática y Electrónica' },
  { id: '2', nombre: 'Aula 101', tipo: 'Aula', lat: -1.6584, lng: -78.6778, estado: 'disponible', imagen: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=250&fit=crop', capacidad: 40, detalle: 'Edificio FIE-A - Piso 1' },
  { id: '3', nombre: 'Lab. Circuitos', tipo: 'Laboratorio', lat: -1.6586, lng: -78.6785, estado: 'ocupada', imagen: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&h=250&fit=crop', capacidad: 20, detalle: 'Edificio FIE-A - Piso 3' },
  { id: '4', nombre: 'Auditorio', tipo: 'Edificio', lat: -1.6575, lng: -78.6770, estado: 'operativo', imagen: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=250&fit=crop', capacidad: 200, detalle: 'Campus Central' },
  { id: '5', nombre: 'Aula C-1', tipo: 'Aula', lat: -1.6580, lng: -78.6790, estado: 'disponible', imagen: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=250&fit=crop', capacidad: 35, detalle: 'Bloque de Aulas C - Piso 1' },
];

export const espaciosPorEdificio: Record<string, { nombre: string, tipo: 'Aula' | 'Lab Técnico' | 'Lab Informático' }[]> = {
  'Edificio FIE-A': [
    { nombre: 'FIE-105', tipo: 'Aula' },
    { nombre: 'FIE-201', tipo: 'Aula' },
    { nombre: 'Aula 101', tipo: 'Aula' },
    { nombre: 'Aula 102', tipo: 'Aula' },
    { nombre: 'Lab. Circuitos', tipo: 'Lab Técnico' },
    { nombre: 'Lab. Electrónica', tipo: 'Lab Técnico' },
    { nombre: 'Lab. Redes Eléctricas', tipo: 'Lab Técnico' }
  ],
  'Edificio FIE-B': [
    { nombre: 'FIE-302', tipo: 'Aula' },
    { nombre: 'Aula 301', tipo: 'Aula' },
    { nombre: 'Aula 302', tipo: 'Aula' },
    { nombre: 'Lab. Potencia', tipo: 'Lab Técnico' }
  ],
  'Bloque de Aulas C': [
    { nombre: 'Aula C-1', tipo: 'Aula' },
    { nombre: 'Aula C-2', tipo: 'Aula' },
    { nombre: 'Aula C-3', tipo: 'Aula' }
  ],
  'Bloque de Laboratorios': [
    { nombre: 'Lab. Control', tipo: 'Lab Técnico' },
    { nombre: 'Lab. Telecomunicaciones', tipo: 'Lab Técnico' },
    { nombre: 'Lab. Energías Renovables', tipo: 'Lab Técnico' },
    { nombre: 'Lab. Robótica', tipo: 'Lab Técnico' },
    { nombre: 'Lab. Electromagnetismo', tipo: 'Lab Técnico' }
  ],
  'Centro de Cómputo': [
    { nombre: 'Lab. Cómputo 1', tipo: 'Lab Informático' },
    { nombre: 'Lab. Cómputo 2', tipo: 'Lab Informático' },
    { nombre: 'Lab. Cómputo 3', tipo: 'Lab Informático' }
  ],
};
