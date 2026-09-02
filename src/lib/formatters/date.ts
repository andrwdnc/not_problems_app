const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

export function formatDate(date: Date | string | number): string {
  const d = toDate(date);
  const dia = d.getDate();
  const mes = MESES_ES[d.getMonth()];
  const anio = d.getFullYear();
  return `${dia} de ${mes}, ${anio}`;
}

export function formatShortDate(date: Date | string | number): string {
  const d = toDate(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function nombreMes(mes: number): string {
  const nombre = MESES_ES[mes - 1] ?? '';
  return nombre.charAt(0).toLocaleUpperCase('es-ES') + nombre.slice(1);
}