/** Etiquetas de los días de la semana, comenzando el lunes (orden de las grillas de calendario). */
export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Normaliza una fecha a medianoche local (evita desfaces al comparar por día). */
export function atMidnight(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = atMidnight(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Lunes de la semana a la que pertenece la fecha indicada. */
export function startOfWeek(date: Date): Date {
  const offset = (date.getDay() + 6) % 7; // semana comienza el lunes
  return addDays(date, -offset);
}

/** Clave estable 'yyyy-mm-dd' en horario local, usada para agrupar/indexar por día. */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
