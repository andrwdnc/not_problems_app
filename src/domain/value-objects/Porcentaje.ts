export interface PorcentajeValue {
  valor: number;
  esValido: boolean;
}

export function validarPorcentaje(valor: number): PorcentajeValue {
  const esNumero = typeof valor === 'number' && Number.isFinite(valor);
  const enRango = esNumero && valor > 0 && valor <= 100;
  return {
    valor,
    esValido: enRango,
  };
}