export function formatearImporteMoneda(cantidad: number): string {
  const centimos = Math.round(cantidad * 100);
  return (centimos / 100).toFixed(2);
}

export function importeDesdeCadena(cadena: string): number {
  const normalizado = cadena.replace(/\./g, '').replace(',', '.');
  const valor = Number(normalizado);
  if (Number.isNaN(valor)) {
    return 0;
  }
  return Math.round(valor * 100) / 100;
}

export function esImporteValido(cantidad: number): boolean {
  return typeof cantidad === 'number' && Number.isFinite(cantidad) && cantidad >= 0;
}