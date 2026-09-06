import { centimosAEuros } from '@/domain/value-objects/ImporteMoneda';

/**
 * Formatea una cantidad de céntimos enteros como moneda en euros (es-ES).
 * Recibe céntimos porque el dominio y la persistencia trabajan en céntimos;
 * la conversión a euros es responsabilidad exclusiva de la presentación.
 */
export function formatCurrency(centimos: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(centimosAEuros(centimos));
}
