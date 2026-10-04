import { obtenerMesActual } from './queries';
import {
  mesRepository,
  aportacionRepository,
  gastoIndividualRepository,
  presupuestoIndividualRepository,
  gastoAnualIndividualRepository,
} from './repositories';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import type { PermisosEdicion } from '@/domain/rules/VentanaEdicionGastos';
import { calcularDisponibleIndividual } from '@/domain/rules/CalculadoraIndividual';
import {
  calcularGastadoComprometido,
  calcularImporte,
  calcularPorcentajePresupuestoConsumido,
  calcularRestantePresupuesto,
} from '@/domain/rules/CalculadoraAportacion';
import { calcularPorcentajeIndividual } from '@/domain/value-objects/Porcentaje';
import { calcularApartadoTotal } from '@/domain/rules/CalculadoraGastoAnual';
import type { Aportacion, GastoIndividual, Mes, PresupuestoIndividual } from '@/domain/entities';

/**
 * Datos de un gasto anual tal y como los necesita la regla del apartado: solo
 * los campos de cálculo. Tanto `GastoAnual` (cuenta conjunta) como
 * `GastoAnualIndividual` (área individual) satisfacen esta forma sin
 * conversiones, así que las dos áreas entran por la misma función pura.
 */
export interface AportacionAnualParaApartado {
  importeTotal: number;
  fechaCreacion: Date;
  fechaUltimoPago: Date | null;
  anioCiclo: number;
  mesPago: number;
}

/**
 * Resumen mensual del área individual (IA-2). Todos los importes en céntimos
 * enteros.
 *
 * Hay UN porcentaje almacenado, el compartido (`meses.porcentaje`), pero dos
 * porcentajes reales: el compartido y el individual, que es su complemento
 * (`100 − compartido`). Se exponen con nombres distintos a propósito, porque
 * llamarlos igual a los dos es lo que permitió que la cuota se calculara con el
 * número equivocado sin que nada lo delatara.
 *
 * El reparto sale de `calcularPorcentajeIndividual` y la cuota de
 * `calcularImporteAportado`; aquí no hay ninguna resta `100 - p` escrita a mano.
 */
export interface ResumenIndividual {
  mesId: string;
  anio: number;
  mes: number;
  /**
   * El porcentaje ÚNICO y compartido del mes (`meses.porcentaje`): la parte del
   * sueldo que va a la cuenta común.
   */
  porcentajeCompartido: number | null;
  /**
   * MI parte del sueldo = `100 − porcentajeCompartido`, la que queda para el
   * gasto individual de este usuario. Se deriva en la lectura, no se guarda.
   */
  porcentajeIndividual: number | null;
  /** Sueldo bruto del usuario. No es una aportación: es la base sobre la que se reparte. */
  sueldo: number | null;
  /** MI cuota mensual = sueldo * porcentajeIndividual / 100. */
  cuota: number | null;
  /** Suma de gastos individuales del mes (siempre visible aunque falte sueldo). */
  gastado: number;
  /**
   * Importe apartado devengado este mes (cuotas de gastos anuales del usuario).
   * Es el mismo término que usa la cuenta conjunta en `calcularResumen`.
   */
  apartado: number;
  /** Gasto comprometido = gastado + apartado (alimenta anillo, %, disponible). */
  gastadoComprometido: number;
  /** cuota - gastadoComprometido; puede ser negativo (déficit). */
  disponible: number | null;
  /**
   * Presupuesto de gastos individual del mes en céntimos; `null` hasta que se
   * fija. Es un tope POR PERSONA (tabla `presupuestos_individuales`), a diferencia
   * del `meses.presupuesto` de la cuenta conjunta, que es único para los dos.
   */
  presupuesto: number | null;
  /** presupuesto - gastado; `null` si no hay tope. */
  restantePresupuesto: number | null;
  /** % del presupuesto consumido; `null` si no hay tope. Puede superar 100. */
  porcentajePresupuesto: number | null;
  /** Nº de gastos individuales del mes (el contador "· N gastos" del Inicio). */
  numeroGastos: number;
}

export interface MesHistoricoIndividual {
  mes: Mes;
  resumen: ResumenIndividual;
  permisos: PermisosEdicion;
}

export type HistoricoIndividual = MesHistoricoIndividual[];

/**
 * Derivación PURA del resumen individual de un mes a partir de los datos
 * brutos. Se testea colocado junto a esta hoja (individual-queries.test.ts).
 */
export function derivarResumenIndividual(
  mes: Mes | null,
  aportacion: Aportacion | null,
  gastos: GastoIndividual[],
  presupuesto: number | null = null,
  gastosAnuales: ReadonlyArray<AportacionAnualParaApartado> = [],
): ResumenIndividual {
  if (!mes) {
    return {
      mesId: '',
      anio: 0,
      mes: 0,
      porcentajeCompartido: null,
      porcentajeIndividual: null,
      sueldo: null,
      cuota: null,
      gastado: 0,
      apartado: 0,
      gastadoComprometido: 0,
      disponible: null,
      presupuesto: null,
      restantePresupuesto: null,
      porcentajePresupuesto: null,
      numeroGastos: 0,
    };
  }

  const porcentajeCompartido = mes.porcentaje;
  const porcentajeIndividual = calcularPorcentajeIndividual(porcentajeCompartido);
  const sueldo = aportacion?.sueldo ?? null;
  const gastado = gastos.reduce((acc, g) => acc + g.importe, 0);

  // Apartado con la MISMA regla pura que la cuenta conjunta
  // (`calcularApartadoTotal`): las cuotas del mes de los gastos anuales del
  // usuario. Antes esta cuenta devolvía 0 sin consultar los gastos anuales, que
  // es exactamente por lo que un seguro no bajaba el disponible en el Inicio
  // individual mientras sí lo bajaba en el conjunto.
  const apartado = calcularApartadoTotal(gastosAnuales, mes.anio, mes.mes);
  const gastadoComprometido = calcularGastadoComprometido(gastado, apartado);

  // La cuota se calcula con MI porcentaje (el complemento del compartido) y la
  // regla pura de importe compartida con la cuenta conjunta. Antes se usaba el
  // porcentaje compartido, con lo que el disponible se medía contra una cifra que
  // ya incluía el dinero que se había ido a lo común.
  const disponible =
    sueldo != null && porcentajeCompartido != null
      ? calcularDisponibleIndividual(
          sueldo,
          porcentajeCompartido,
          gastos,
          apartado,
        )
      : null;

  // Se calcula la cuota por su cuenta en vez de deducirla del disponible
  // (`disponible + gastado` daba el mismo número pero obligaba a calcular el
  // disponible para deshacerlo después). Ambas salen de la misma regla pura, así
  // que `cuota - disponible === gastadoComprometido` se cumple siempre.
  const cuota =
    sueldo != null && porcentajeIndividual != null
      ? calcularImporte(sueldo, porcentajeIndividual)
      : null;

  // Las dos métricas de presupuesto se delegan en las MISMAS reglas puras que usa
  // la cuenta conjunta (`CalculadoraAportacion`). Es lo que impide que el "restante"
  // o el "% consumido" signifiquen una cosa en el Inicio y otra en el histórico:
  // si mañana cambia la regla, cambia en las dos áreas por la misma función.
  const restantePresupuesto = calcularRestantePresupuesto(presupuesto, gastado);
  const porcentajePresupuesto = calcularPorcentajePresupuestoConsumido(
    gastado,
    presupuesto,
  );

  return {
    mesId: mes.id,
    anio: mes.anio,
    mes: mes.mes,
    porcentajeCompartido,
    porcentajeIndividual,
    sueldo,
    cuota,
    gastado,
    apartado,
    gastadoComprometido,
    disponible,
    presupuesto,
    restantePresupuesto,
    porcentajePresupuesto,
    numeroGastos: gastos.length,
  };
}

/**
 * Derivación PURA del histórico individual: agrupa por mes los datos del
 * usuario (aportaciones y gastos ya filtrados por propietario en SQL), calcula
 * el resumen y los permisos de edición. Excluye los meses sin ningún dato
 * (sin sueldo ni gastos). Orden descendente.
 */
export function derivarHistoricoIndividual(
  hoy: Date,
  meses: Mes[],
  aportaciones: Aportacion[],
  gastos: GastoIndividual[],
  presupuestos: PresupuestoIndividual[] = [],
  gastosAnuales: ReadonlyArray<AportacionAnualParaApartado> = [],
): HistoricoIndividual {
  return meses
    .map((mes) => {
      const aportacion = aportaciones.find((a) => a.mesId === mes.id) ?? null;
      const gastosDelMes = gastos.filter((g) => g.mesId === mes.id);
      const presupuesto = presupuestos.find((p) => p.mesId === mes.id) ?? null;

      return {
        mes,
        resumen: derivarResumenIndividual(
          mes,
          aportacion,
          gastosDelMes,
          presupuesto?.presupuesto ?? null,
          gastosAnuales,
        ),
        permisos: ventanaDeMes(hoy, mes.anio, mes.mes),
      };
    })
    .filter((e) => e.resumen.sueldo != null || e.resumen.gastado > 0)
    .sort((a, b) => b.mes.anio - a.mes.anio || b.mes.mes - a.mes.mes);
}

/**
 * Resumen individual del mes actual. El mes se obtiene (o materializa) con la
 * misma lógica que la cuenta conjunta para que ambas áreas compartan mes.
 */
export async function obtenerResumenIndividual(
  usuarioId: string,
): Promise<ResumenIndividual> {
  const mes = await obtenerMesActual();
  if (!mes) {
    return derivarResumenIndividual(null, null, []);
  }

  // El presupuesto y los gastos anuales se consultan en la misma pasada:
  // owner-first, así que solo devuelven los del usuario de la sesión (D8).
  const [aportacion, gastos, presupuesto, gastosAnuales] = await Promise.all([
    aportacionRepository.findByMesAndUsuario(mes.id, usuarioId),
    gastoIndividualRepository.findByMes(usuarioId, mes.id),
    presupuestoIndividualRepository.findByMes(usuarioId, mes.id),
    gastoAnualIndividualRepository.findAll(usuarioId),
  ]);

  return derivarResumenIndividual(
    mes,
    aportacion,
    gastos,
    presupuesto?.presupuesto ?? null,
    gastosAnuales,
  );
}

/**
 * Histórico individual del usuario. El propietario se pasa desde la capa de
 * presentación (sesión) y los repositorios aplican el filtro en SQL (D8):
 * la consulta nunca ve datos de terceros.
 */
export async function obtenerHistoricoIndividual(
  usuarioId: string,
): Promise<HistoricoIndividual> {
  const hoy = new Date();
  const meses = await mesRepository.getMesesAnteriores(24);
  if (meses.length === 0) return [];

  const mesIds = meses.map((m) => m.id);

  const [aportaciones, gastos, presupuestos, gastosAnuales] = await Promise.all([
    aportacionRepository.findByMesIdsYUsuario(mesIds, usuarioId),
    gastoIndividualRepository.findByMesIds(usuarioId, mesIds),
    presupuestoIndividualRepository.findByMesIds(usuarioId, mesIds),
    gastoAnualIndividualRepository.findAll(usuarioId),
  ]);

  return derivarHistoricoIndividual(
    hoy,
    meses,
    aportaciones,
    gastos,
    presupuestos,
    gastosAnuales,
  );
}