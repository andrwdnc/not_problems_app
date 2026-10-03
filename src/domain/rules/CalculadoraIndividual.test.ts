import { describe, it, expect } from 'vitest';
import { calcularDisponibleIndividual } from './CalculadoraIndividual';
import { calcularImporteAportado } from './CalculadoraAportacion';

// Todas las cantidades se expresan en céntimos enteros (100 = 1 €).
//
// El área individual ya no deriva ni invierte un porcentaje propio: usa el mismo
// valor único y compartido del mes que la cuenta conjunta. Por eso aquí no hay
// reglas de inversión que testear, solo la regla de disponibilidad, que delega
// el cálculo de la cuota en `calcularImporteAportado`.
describe('CalculadoraIndividual', () => {
  describe('calcularDisponibleIndividual', () => {
    it('calcula disponible = cuota - sumatoria de gastos (IA-2 feliz)', () => {
      // sueldo 2000 €, 30 % -> cuota 600 €; gastos 150 € -> disponible 450 €.
      expect(
        calcularDisponibleIndividual(200000, 30, [{ importe: 15000 }]),
      ).toBe(45000);
    });

    it('permite déficit: disponible negativo cuando los gastos superan la cuota (IA-2 déficit)', () => {
      // Cuota 60000 (600 €) frente a gastos 70000 (700 €) -> -10000 (-100 €).
      expect(
        calcularDisponibleIndividual(200000, 30, [{ importe: 70000 }]),
      ).toBe(-10000);
    });

    it('devuelve null cuando falta el sueldo', () => {
      expect(calcularDisponibleIndividual(null, 30, [{ importe: 1000 }])).toBeNull();
    });

    it('devuelve null cuando falta el porcentaje', () => {
      expect(calcularDisponibleIndividual(200000, null, [{ importe: 1000 }])).toBeNull();
    });

    it('devuelve null con un porcentaje inválido', () => {
      expect(calcularDisponibleIndividual(200000, 0, [{ importe: 1000 }])).toBeNull();
      expect(calcularDisponibleIndividual(200000, 101, [{ importe: 1000 }])).toBeNull();
    });

    it('sin gastos el disponible es la cuota completa', () => {
      expect(calcularDisponibleIndividual(200000, 30, [])).toBe(60000);
    });

    it('suma varios gastos antes de restar', () => {
      expect(
        calcularDisponibleIndividual(200000, 30, [{ importe: 10000 }, { importe: 5000 }]),
      ).toBe(45000);
    });

    it('redondea al céntimo los porcentajes con decimales', () => {
      // Cuota = redondeo(200000 × 33,33 %) = 66660 céntimos; - 10000 = 56660.
      expect(
        calcularDisponibleIndividual(200000, 33.33, [{ importe: 10000 }]),
      ).toBe(56660);
    });

    it('acepta el 100 % sin dejar la fila a null', () => {
      // Antes el 100 % conjunto era un caso degenerado (el complemento daba 0 y
      // se pintaba la fila en gris). Al compartir el mismo porcentaje, el 100 %
      // es un valor legítimo: cuota íntegra.
      expect(calcularDisponibleIndividual(200000, 100, [])).toBe(200000);
      expect(calcularDisponibleIndividual(200000, 100, [{ importe: 10000 }])).toBe(190000);
    });

    it('deriva la cuota de la MISMA regla pura que la cuenta conjunta', () => {
      // Paridad de dominio: si la regla de cuota cambia, cambia en las dos áreas
      // o no cambia en ninguna. Este test falla si alguien reintroduce una
      // fórmula local para el área individual.
      const sueldo = 187500;
      const porcentaje = 42.5;
      const gastos = [{ importe: 12345 }];

      const cuotaEsperada = calcularImporteAportado(sueldo, porcentaje);
      expect(cuotaEsperada).not.toBeNull();
      expect(calcularDisponibleIndividual(sueldo, porcentaje, gastos)).toBe(
        (cuotaEsperada as number) - 12345,
      );
    });
  });
});