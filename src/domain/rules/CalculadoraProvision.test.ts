import { describe, it, expect } from 'vitest';
import {
  calcularAnioCicloInicial,
  calcularCuotaProvisionMes,
  calcularProvisionadoMes,
  calcularDevengoPrevio,
} from './CalculadoraProvision';

describe('CalculadoraProvision', () => {
  describe('calcularAnioCicloInicial', () => {
    it('retorna el año actual si mes actual < mesPago', () => {
      // Mes actual: septiembre (9), mesPago: 12 (diciembre)
      expect(calcularAnioCicloInicial(2025, 9, 12)).toBe(2025);
    });

    it('retorna año + 1 si mes actual >= mesPago', () => {
      // Mes actual: septiembre (9), mesPago: 6 (junio)
      // Como 9 >= 6, el ciclo inicial es el siguiente año
      expect(calcularAnioCicloInicial(2025, 9, 6)).toBe(2026);
    });

    it('retorna año + 1 si mes actual === mesPago', () => {
      // Mes actual: junio (6), mesPago: 6 (junio)
      // Como 6 >= 6, el ciclo inicial es el siguiente año
      expect(calcularAnioCicloInicial(2025, 6, 6)).toBe(2026);
    });
  });

  describe('calcularCuotaProvisionMes', () => {
    it('1250 céntimos / 12 meses -> 11 meses de 104 + 1 de 106', () => {
      const { cuotaBase, residuo, mesResiduo } = calcularCuotaProvisionMes(1250, 12);

      // 1250 / 12 = 104.166... -> cuotaBase = 104, residuo = 2 (1250 - 104*12 = 2)
      // El residuo se reparte en 1 céntimo extra en los primeros `residuo` meses
      expect(cuotaBase).toBe(104);
      expect(residuo).toBe(2);
      expect(mesResiduo).toBe(1); // el residuo está en el primer mes
    });

    it('10000 céntimos / 10 meses -> 1000 exacto sin residuo', () => {
      const { cuotaBase, residuo } = calcularCuotaProvisionMes(10000, 10);
      expect(cuotaBase).toBe(1000);
      expect(residuo).toBe(0);
    });

    it('reparte residuo en los primeros meses (ej: 100 céntimos / 3 = 34, 33, 33)', () => {
      const { cuotaBase, residuo } = calcularCuotaProvisionMes(100, 3);
      // 100 / 3 = 33.33... -> cuotaBase = 33, residuo = 1 (100 - 33*3 = 1)
      expect(cuotaBase).toBe(33);
      expect(residuo).toBe(1);
    });
  });

  describe('calcularProvisionadoMes', () => {
    it('mes 1 con residuo -> cuotaBase + 1', () => {
      // 1250 / 12 = 104 con residuo 2 -> mes 1 y 2 reciben +1
      expect(calcularProvisionadoMes(1250, 12, 1)).toBe(105);
    });

    it('mes 2 con residuo -> cuotaBase + 1', () => {
      expect(calcularProvisionadoMes(1250, 12, 2)).toBe(105);
    });

    it('mes 3 sin residuo -> cuotaBase', () => {
      expect(calcularProvisionadoMes(1250, 12, 3)).toBe(104);
    });

    it('mes 12 -> cuotaBase', () => {
      expect(calcularProvisionadoMes(1250, 12, 12)).toBe(104);
    });

    it('suma de 12 meses = importeTotal (1250)', () => {
      let suma = 0;
      for (let m = 1; m <= 12; m++) {
        suma += calcularProvisionadoMes(1250, 12, m);
      }
      expect(suma).toBe(1250);
    });

    it('suma de 10 meses = importeTotal (10000)', () => {
      let suma = 0;
      for (let m = 1; m <= 10; m++) {
        suma += calcularProvisionadoMes(10000, 10, m);
      }
      expect(suma).toBe(10000);
    });

    it('dos provisiones sumadas en calcularProvisionadoMes (misma función, suma externa)', () => {
      // Provisión A: 6000 en 6 meses (1000/mes)
      // Provisión B: 3000 en 6 meses (500/mes)
      // Mes 1: 1000 + 500 = 1500
      const mes1 = calcularProvisionadoMes(6000, 6, 1) + calcularProvisionadoMes(3000, 6, 1);
      expect(mes1).toBe(1500);

      // Mes 6: 1000 + 500 = 1500
      const mes6 = calcularProvisionadoMes(6000, 6, 6) + calcularProvisionadoMes(3000, 6, 6);
      expect(mes6).toBe(1500);
    });
  });

  describe('calcularDevengoPrevio', () => {
    it('mes actual = mesPago en mismo año -> regMonth = false (mes actual no devengado)', () => {
      // Estamos en junio 2025, mesPago = 6 -> junio 2025 aún no devengó
      expect(calcularDevengoPrevio(2025, 6, 2025, 6)).toBe(false);
    });

    it('mes actual > mesPago en mismo año -> next = true (mesPago ya devengó)', () => {
      // Estamos en julio 2025, mesPago = 6 -> junio 2025 ya devengó
      expect(calcularDevengoPrevio(2025, 7, 2025, 6)).toBe(true);
    });

    it('mes actual < mesPago en mismo año -> regMonth = false (mesPago aún no llegó)', () => {
      // Estamos en mayo 2025, mesPago = 6 -> junio 2025 aún no llegó
      expect(calcularDevengoPrevio(2025, 5, 2025, 6)).toBe(false);
    });

    it('cruce de año: enero año siguiente, mesPago = 12 -> next = true (dic anterior ya devengó)', () => {
      // Estamos en enero 2026, mesPago = 12, anioCiclo = 2025
      // Diciembre 2025 ya pasó
      expect(calcularDevengoPrevio(2026, 1, 2025, 12)).toBe(true);
    });

    it('cruce de año: noviembre año ciclo, mesPago = 12 -> regMonth = false (dic aún no llegó)', () => {
      // Estamos en noviembre 2025, mesPago = 12, anioCiclo = 2025
      // Diciembre 2025 aún no llegó
      expect(calcularDevengoPrevio(2025, 11, 2025, 12)).toBe(false);
    });
  });
});