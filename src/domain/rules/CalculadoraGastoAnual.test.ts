import { describe, it, expect } from 'vitest';
import {
  calcularAnioCicloInicial,
  calcularCuotaBase,
  calcularCuotaMes,
  calcularDevengoPrevio,
  calcularInicioApartado,
  calcularVentanaApartado,
  calcularApartadoMes,
  calcularApartadoDevengado,
} from './CalculadoraGastoAnual';

// Caso real del usuario: creado en septiembre 2026, mesPago = 7 (julio),
// anioCiclo = 2027 (regla: mesActual >= mesPago -> año siguiente).
const CREACION = new Date(2026, 8, 15); // septiembre 2026

describe('CalculadoraGastoAnual', () => {
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

  describe('calcularCuotaBase', () => {
    it('1250 céntimos / 12 meses -> 11 meses de 104 + 1 de 106', () => {
      const { cuotaBase, residuo, mesResiduo } = calcularCuotaBase(1250, 12);

      // 1250 / 12 = 104.166... -> cuotaBase = 104, residuo = 2 (1250 - 104*12 = 2)
      // El residuo se reparte en 1 céntimo extra en los primeros `residuo` meses
      expect(cuotaBase).toBe(104);
      expect(residuo).toBe(2);
      expect(mesResiduo).toBe(1); // el residuo está en el primer mes
    });

    it('10000 céntimos / 10 meses -> 1000 exacto sin residuo', () => {
      const { cuotaBase, residuo } = calcularCuotaBase(10000, 10);
      expect(cuotaBase).toBe(1000);
      expect(residuo).toBe(0);
    });

    it('reparte residuo en los primeros meses (ej: 100 céntimos / 3 = 34, 33, 33)', () => {
      const { cuotaBase, residuo } = calcularCuotaBase(100, 3);
      // 100 / 3 = 33.33... -> cuotaBase = 33, residuo = 1 (100 - 33*3 = 1)
      expect(cuotaBase).toBe(33);
      expect(residuo).toBe(1);
    });
  });

  describe('calcularCuotaMes', () => {
    it('mes 1 con residuo -> cuotaBase + 1', () => {
      // 1250 / 12 = 104 con residuo 2 -> mes 1 y 2 reciben +1
      expect(calcularCuotaMes(1250, 12, 1)).toBe(105);
    });

    it('mes 2 con residuo -> cuotaBase + 1', () => {
      expect(calcularCuotaMes(1250, 12, 2)).toBe(105);
    });

    it('mes 3 sin residuo -> cuotaBase', () => {
      expect(calcularCuotaMes(1250, 12, 3)).toBe(104);
    });

    it('mes 12 -> cuotaBase', () => {
      expect(calcularCuotaMes(1250, 12, 12)).toBe(104);
    });

    it('suma de 12 meses = importeTotal (1250)', () => {
      let suma = 0;
      for (let m = 1; m <= 12; m++) {
        suma += calcularCuotaMes(1250, 12, m);
      }
      expect(suma).toBe(1250);
    });

    it('suma de 10 meses = importeTotal (10000)', () => {
      let suma = 0;
      for (let m = 1; m <= 10; m++) {
        suma += calcularCuotaMes(10000, 10, m);
      }
      expect(suma).toBe(10000);
    });

    it('dos gastos anuales sumados en calcularCuotaMes (misma función, suma externa)', () => {
      // Gasto anual A: 6000 en 6 meses (1000/mes)
      // Gasto anual B: 3000 en 6 meses (500/mes)
      // Mes 1: 1000 + 500 = 1500
      const mes1 = calcularCuotaMes(6000, 6, 1) + calcularCuotaMes(3000, 6, 1);
      expect(mes1).toBe(1500);

      // Mes 6: 1000 + 500 = 1500
      const mes6 = calcularCuotaMes(6000, 6, 6) + calcularCuotaMes(3000, 6, 6);
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

  describe('calcularInicioApartado', () => {
    it('nunca pagado -> el mes de creación es el inicio', () => {
      expect(calcularInicioApartado(CREACION, null)).toEqual({
        anio: 2026,
        mes: 9,
      });
    });

    it('pagado a mitad de año -> el mes siguiente al último pago', () => {
      // Último pago: julio 2027 -> empieza en agosto 2027
      const ultimoPago = new Date(2027, 6, 20);
      expect(calcularInicioApartado(CREACION, ultimoPago)).toEqual({
        anio: 2027,
        mes: 8,
      });
    });

    it('pagado en diciembre -> el inicio salta al enero del año siguiente', () => {
      const ultimoPago = new Date(2026, 11, 10);
      expect(calcularInicioApartado(CREACION, ultimoPago)).toEqual({
        anio: 2027,
        mes: 1,
      });
    });
  });

  describe('calcularVentanaApartado', () => {
    it('primer ciclo: ventana del mes de creación al mesPago del ciclo, inclusiva', () => {
      // Creado septiembre 2026, mesPago julio, anioCiclo 2027
      // -> septiembre 2026 → julio 2027 INCLUSIVE = 11 meses
      const ventana = calcularVentanaApartado(CREACION, null, 2027, 7);
      expect(ventana).toEqual({
        anioInicio: 2026,
        mesInicio: 9,
        anioFin: 2027,
        mesFin: 7,
        numMeses: 11,
      });
    });

    it('ciclo posterior: ventana del mes tras el último pago al mesPago del nuevo ciclo', () => {
      // Pagado julio 2027 (fechaUltimoPago), nuevo anioCiclo 2028
      // -> agosto 2027 → julio 2028 INCLUSIVE = 12 meses
      const ultimoPago = new Date(2027, 6, 20);
      const ventana = calcularVentanaApartado(CREACION, ultimoPago, 2028, 7);
      expect(ventana).toEqual({
        anioInicio: 2027,
        mesInicio: 8,
        anioFin: 2028,
        mesFin: 7,
        numMeses: 12,
      });
    });

    it('caso extremo: creación y mesPago en el mismo mes -> ventana de 1 mes', () => {
      // Creado marzo 2027, mesPago marzo, anioCiclo 2027
      // -> marzo 2027 → marzo 2027 = 1 mes
      const ventana = calcularVentanaApartado(
        new Date(2027, 2, 5),
        null,
        2027,
        3,
      );
      expect(ventana.numMeses).toBe(1);
      expect(ventana.anioInicio).toBe(2027);
      expect(ventana.mesInicio).toBe(3);
      expect(ventana.anioFin).toBe(2027);
      expect(ventana.mesFin).toBe(3);
    });
  });

  describe('calcularApartadoMes', () => {
    // Importe 1200,00 € (120000 céntimos) sobre 11 meses:
    // cuotaBase = 10909, residuo = 1 -> mes 1 = 10910, meses 2-11 = 10909.
    const ventana11 = { anioInicio: 2026, mesInicio: 9, anioFin: 2027, mesFin: 7, numMeses: 11 };

    it('primer mes de la ventana: posición 1 y cuota con +1 de residuo', () => {
      const apartado = calcularApartadoMes(120000, ventana11, 2026, 9);
      expect(apartado.posicion).toBe(1);
      expect(apartado.numMeses).toBe(11);
      expect(apartado.cuota).toBe(10910);
    });

    it('mes intermedio: posición 2 y cuota base sin residuo', () => {
      const apartado = calcularApartadoMes(120000, ventana11, 2026, 10);
      expect(apartado.posicion).toBe(2);
      expect(apartado.cuota).toBe(10909);
    });

    it('mes de pago (fin de ventana): INCLUIDO (contando los dos extremos)', () => {
      const apartado = calcularApartadoMes(120000, ventana11, 2027, 7);
      expect(apartado.posicion).toBe(11);
      expect(apartado.cuota).toBe(10909);
    });

    it('mes anterior al inicio de la ventana -> cuota 0', () => {
      const apartado = calcularApartadoMes(120000, ventana11, 2026, 8);
      expect(apartado.posicion).toBe(0);
      expect(apartado.cuota).toBe(0);
    });

    it('mes posterior al fin de la ventana -> cuota 0', () => {
      const apartado = calcularApartadoMes(120000, ventana11, 2027, 8);
      expect(apartado.posicion).toBe(0);
      expect(apartado.cuota).toBe(0);
    });

    it('la suma de las 11 cuotas de la ventana es exactamente importeTotal', () => {
      let suma = 0;
      for (let posicion = 1; posicion <= 11; posicion++) {
        const { anio, mes } = mesDesdePosicion(2026, 9, posicion);
        suma += calcularApartadoMes(120000, ventana11, anio, mes).cuota;
      }
      expect(suma).toBe(120000);
    });

    it('ciclo posterior: agosto 2027 es la posición 1 tras pagar en julio 2027', () => {
      const ventana = { anioInicio: 2027, mesInicio: 8, anioFin: 2028, mesFin: 7, numMeses: 12 };
      const apartado = calcularApartadoMes(120000, ventana, 2027, 8);
      expect(apartado.posicion).toBe(1);
      expect(apartado.cuota).toBe(10000); // 120000 / 12 sin residuo
    });

    it('ciclo posterior: el mes de pago del ciclo anterior (julio 2027) queda fuera', () => {
      const ventana = { anioInicio: 2027, mesInicio: 8, anioFin: 2028, mesFin: 7, numMeses: 12 };
      const apartado = calcularApartadoMes(120000, ventana, 2027, 7);
      expect(apartado.posicion).toBe(0);
      expect(apartado.cuota).toBe(0);
    });

    it('ciclo posterior: julio 2028 es la posición 12 (fin de ventana, incluido)', () => {
      const ventana = { anioInicio: 2027, mesInicio: 8, anioFin: 2028, mesFin: 7, numMeses: 12 };
      const apartado = calcularApartadoMes(120000, ventana, 2028, 7);
      expect(apartado.posicion).toBe(12);
      expect(apartado.cuota).toBe(10000);
    });

    it('ventana de 1 mes: la única cuota es importeTotal', () => {
      const ventana1 = { anioInicio: 2027, mesInicio: 3, anioFin: 2027, mesFin: 3, numMeses: 1 };
      const apartado = calcularApartadoMes(50000, ventana1, 2027, 3);
      expect(apartado.posicion).toBe(1);
      expect(apartado.numMeses).toBe(1);
      expect(apartado.cuota).toBe(50000);
    });
  });

  describe('calcularApartadoDevengado', () => {
    const ventana11 = { anioInicio: 2026, mesInicio: 9, anioFin: 2027, mesFin: 7, numMeses: 11 };

    it('posición 0 (fuera de ventana) -> 0', () => {
      expect(calcularApartadoDevengado(120000, 11, 0)).toBe(0);
    });

    it('posición 1 -> la cuota del primer mes', () => {
      expect(calcularApartadoDevengado(120000, 11, 1)).toBe(10910);
    });

    it('posición 5 -> suma exacta de las 5 primeras cuotas', () => {
      // 10910 + 10909*4 = 54546
      expect(calcularApartadoDevengado(120000, 11, 5)).toBe(54546);
    });

    it('posición final -> importeTotal exacto', () => {
      expect(calcularApartadoDevengado(120000, 11, 11)).toBe(120000);
    });

    it('posición mayor que numMeses -> importeTotal exacto (ventana completa)', () => {
      expect(calcularApartadoDevengado(120000, 11, 20)).toBe(120000);
    });
  });
});

/** Convierte una posición 1-indexada de la ventana a (año, mes) reales. */
function mesDesdePosicion(
  anioInicio: number,
  mesInicio: number,
  posicion: number,
): { anio: number; mes: number } {
  const indice = anioInicio * 12 + (mesInicio - 1) + (posicion - 1);
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}