import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import {
  obtenerMesActual,
} from '@/server-actions/queries';
import {
  obtenerResumenIndividual,
  obtenerHistoricoIndividual,
  derivarResumenIndividual,
} from '@/server-actions/individual-queries';
import {
  aportacionRepository,
  gastoIndividualRepository,
  gastoAnualIndividualRepository,
  mesRepository,
  presupuestoIndividualRepository,
} from '@/server-actions/repositories';
import { mapearGastosAnualesAVista } from '@/server-actions/vista-gastos-anuales';
import { cifrasDeResumenIndividual } from '@/server-actions/vistas/cifras-mes';
import { derivarDetalleMesVista } from '@/server-actions/vistas/detalle-mes';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import { formatShortDate, nombreMes } from '@/lib/formatters/date';
import { formatCurrency } from '@/lib/formatters/currency';
import { rutaHistorico, rutaHistoricoDetalle } from '@/lib/cuenta';
import {
  gastosAnuales as gastosAnualesLiterales,
  gastos as gastosLiterales,
  historico as literalesHistorico,
  historicoDetalle,
  inicio,
  individual,
  resumen as literalesResumen,
} from '@/literals';
import type { ContextoCuenta } from './contrato';
import { avisoCongeladoDe, devengoPrevioDe } from './auxiliares';
import type { InicioResumenVista } from '@/components/features/vista-inicio';
import type { DetalleMesVista } from '@/components/features/vista-detalle-mes';
import type {
  DatosUltimosGastos,
  VistaPantallaAportar,
  VistaPantallaFormGasto,
  VistaPantallaFormGastoAnual,
  VistaPantallaGastos,
  VistaPantallaHistorico,
} from '@/components/features/vista-pantallas';

/**
 * Dueño de TODOS los datos de este adaptador: el usuario de la sesión
 * (owner-first, D8/IA-1). Ningún método individual consulta datos de otra
 * persona: los repositorios filtran en SQL a partir de este id.
 */
async function usuarioDeSesion() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * ADAPTADOR del área INDIVIDUAL: mismas vistas que la cuenta conjunta (mismo
 * contrato), pero con los datos del usuario de la sesión y el vocabulario en
 * primera persona ("Mi presupuesto", "Mi aportación").
 */
export const adaptadorIndividual: ContextoCuenta = {
  variante: 'individual',

  /* ---------------------------------------------------------------------- */
  /* Inicio                                                                  */
  /* ---------------------------------------------------------------------- */

  async resumenInicio(): Promise<InicioResumenVista | null> {
    const user = await usuarioDeSesion();
    const resumen = await obtenerResumenIndividual(user.id);
    const hayMes = resumen.mesId !== '';

    // Mismo TIPO de información que la cuenta conjunta: el anillo, la cifra que
    // lleva debajo y el aviso giran siempre en torno al PRESUPUESTO del mes, no a
    // la cuota. Cada cuenta enseña sus propios números ("Mi presupuesto" aquí, el
    // compartido en la conjunta), pero lo que se informa es lo mismo. Antes, sin
    // presupuesto propio, la individual saltaba a "Mi cuota" y rompía la paridad.
    const sobrePresupuesto =
      resumen.restantePresupuesto != null && resumen.restantePresupuesto < 0;
    const hayPresupuesto = resumen.presupuesto != null;

    // Sin presupuesto (aún sin fijar) el anillo mide lo COMPROMETIDO (gasto +
    // apartado) sobre mi cuota, igual que en la conjunta mide
    // `gastadoComprometido / aportado`: si un gasto anual no bajara la barra en una
    // de las dos cuentas, la paridad se rompería en la cifra que el usuario usa
    // para decidir.
    const porcentajeSobreCuota =
      resumen.cuota != null && resumen.cuota > 0
        ? Math.round((resumen.gastadoComprometido / resumen.cuota) * 100)
        : 0;

    return {
      titulo: hayMes
        ? `${nombreMes(resumen.mes)} ${resumen.anio}`
        : individual.sinMesAbierto,
      hayDatos: hayMes,
      mensajeSinDatos: individual.sinMesAbierto,
      anillo: {
        porcentaje: hayPresupuesto
          ? (resumen.porcentajePresupuesto ?? 0)
          : porcentajeSobreCuota,
        etiqueta: hayPresupuesto
          ? literalesResumen.presupuestoRing
          : literalesResumen.gastadoRing,
      },
      cifraAnillo: {
        etiqueta: individual.miPresupuesto,
        valor: resumen.presupuesto,
      },
      tarjetas: [
        {
          variante: 'aportado',
          // MI cuota (sueldo x porcentaje), no el bruto: es el mismo número que
          // mide el anillo del que salen `gastado` y `disponible`. Con el bruto
          // aquí, las tres tarjetas de la pantalla no cuadraban entre sí.
          etiqueta: individual.miAportacion,
          importe: resumen.cuota,
        },
        {
          variante: 'gastado',
          etiqueta: literalesResumen.gastado,
          importe: resumen.gastado,
        },
        {
          variante: 'ahorro',
          etiqueta: literalesResumen.disponible,
          importe: resumen.disponible,
        },
      ],
      avisoSuperado: sobrePresupuesto
        ? inicio.teHasPasadoPresupuesto(
            formatCurrency(-(resumen.restantePresupuesto as number)),
          )
        : undefined,
      // El contador "· N gastos" también es paridad: la conjunta lo muestra bajo la
      // cifra del anillo y el área individual no lo tenía.
      notaCifraAnillo: hayMes
        ? `· ${inicio.contadorGastos(resumen.numeroGastos)}`
        : undefined,
    };
  },

  async ultimosGastosInicio(): Promise<DatosUltimosGastos> {
    const user = await usuarioDeSesion();
    const mes = await obtenerMesActual();

    // Sin mes abierto no hay nada que listar: se mantiene el resumen como única
    // sección visible, en vez de añadir un bloque vacío sin explicación.
    if (!mes) return null;

    // Owner-first: la consulta solo puede devolver gastos de la sesión (D8).
    const gastos = await gastoIndividualRepository.findByMes(user.id, mes.id);

    return {
      variante: 'individual',
      // Sin `creador`: los gastos son del propio usuario y el pie de fila no
      // necesita repetir el nombre en cada línea.
      gastos: gastos.map((g) => ({
        id: g.id,
        detalle: g.detalle,
        categoria: g.categoria,
        importe: g.importe,
      })),
    };
  },

  /* ---------------------------------------------------------------------- */
  /* Gastos                                                                  */
  /* ---------------------------------------------------------------------- */

  async vistaGastos(): Promise<VistaPantallaGastos> {
    const user = await usuarioDeSesion();

    const mes = await obtenerMesActual();

    // Ambas consultas son owner-first: solo se ven los datos del usuario de la
    // sesión (D8). Los anuales van en paralelo porque no dependen del mes (el
    // cálculo de ventana lo recibe como parámetro).
    const [gastos, gastosAnuales] = await Promise.all([
      mes
        ? gastoIndividualRepository.findByMes(user.id, mes.id)
        : Promise.resolve([]),
      gastoAnualIndividualRepository.findAll(user.id),
    ]);

    if (!mes) {
      return {
        variante: 'individual',
        gastos: [],
        gastosAnuales: [],
        sinMes: inicio.sinMesAbierto,
      };
    }

    return {
      variante: 'individual',
      gastos,
      gastosAnuales: mapearGastosAnualesAVista(gastosAnuales, mes),
      sinMes: null,
    };
  },

  /* ---------------------------------------------------------------------- */
  /* Aportar                                                                 */
  /* ---------------------------------------------------------------------- */

  async vistaAportar(): Promise<VistaPantallaAportar> {
    const user = await usuarioDeSesion();

    const mes = await obtenerMesActual();
    if (!mes) {
      return {
        variante: 'individual',
        sinMes: individual.sinMesAbierto,
        mes: null,
        usuarios: [],
        aportaciones: [],
        presupuestoIndividual: null,
      };
    }

    // `miAportacion` y `presupuesto` se filtran al usuario de la sesión: la
    // privacidad la garantiza el `usuarioId` owner-first del repositorio, no el
    // componente. El array llega con 1 elemento, como en la conjunta llega con 2.
    const [miAportacion, presupuesto] = await Promise.all([
      aportacionRepository.findByMesAndUsuario(mes.id, user.id),
      presupuestoIndividualRepository.findByMes(user.id, mes.id),
    ]);

    return {
      variante: 'individual',
      sinMes: null,
      mes,
      usuarios: [user],
      aportaciones: miAportacion ? [miAportacion] : [],
      presupuestoIndividual: presupuesto,
    };
  },

  /* ---------------------------------------------------------------------- */
  /* Alta y edición de gasto mensual                                         */
  /* ---------------------------------------------------------------------- */

  async vistaNuevoGasto(): Promise<VistaPantallaFormGasto> {
    await usuarioDeSesion();

    const mes = await obtenerMesActual();

    return {
      variante: 'individual',
      sinMes: mes ? null : inicio.sinMesAbierto,
      avisoCongelado: null,
      gasto: null,
      mesId: mes?.id ?? null,
    };
  },

  async vistaEditarGasto(gastoId: string): Promise<VistaPantallaFormGasto> {
    const user = await usuarioDeSesion();

    // La lectura es owner-first (`findById(usuarioId, id)`): si el id es de otra
    // persona la consulta devuelve `null` y la pantalla responde 404, sin
    // distinguir entre "no existe" y "no es tuyo" para no revelar la existencia
    // de datos ajenos.
    const gasto = await gastoIndividualRepository.findById(user.id, gastoId);
    if (!gasto) {
      notFound();
    }

    return {
      variante: 'individual',
      sinMes: null,
      avisoCongelado: avisoCongeladoDe(gasto.fechaGasto),
      gasto,
      mesId: null,
    };
  },

  /* ---------------------------------------------------------------------- */
  /* Alta y edición de gasto anual                                           */
  /* ---------------------------------------------------------------------- */

  async vistaNuevoGastoAnual(): Promise<VistaPantallaFormGastoAnual> {
    await usuarioDeSesion();

    const mes = await obtenerMesActual();

    return {
      variante: 'individual',
      sinMes: mes ? null : inicio.sinMesAbierto,
      avisoDevengoPrevio: null,
      gastoAnual: null,
      devengoPrevio: false,
    };
  },

  async vistaEditarGastoAnual(
    gastoAnualId: string,
  ): Promise<VistaPantallaFormGastoAnual> {
    const user = await usuarioDeSesion();

    // Lectura owner-first: si el id pertenece a otra persona devuelve `null` y
    // la pantalla responde 404, sin revelar que el dato existe.
    const gastoAnual = await gastoAnualIndividualRepository.findById(
      user.id,
      gastoAnualId,
    );
    if (!gastoAnual) {
      notFound();
    }

    const { devengoPrevio, aviso } = devengoPrevioDe(gastoAnual);

    return {
      variante: 'individual',
      sinMes: null,
      avisoDevengoPrevio: aviso,
      gastoAnual,
      devengoPrevio,
    };
  },

  /* ---------------------------------------------------------------------- */
  /* Histórico y detalle de mes                                              */
  /* ---------------------------------------------------------------------- */

  async vistaHistorico(): Promise<VistaPantallaHistorico> {
    const user = await usuarioDeSesion();

    const historico = await obtenerHistoricoIndividual(user.id);

    return {
      vacio: historico.length === 0,
      sinMeses: literalesHistorico.sinMeses,
      tarjetas: historico.map((h) => ({
        mesId: h.mes.id,
        anio: h.mes.anio,
        mes: h.mes.mes,
        href: rutaHistoricoDetalle('individual', h.mes.id),
        estado: h.permisos.estado,
        esDeficit: h.resumen.disponible != null && h.resumen.disponible < 0,
        columnas: [
          // MI cuota (sueldo x porcentaje), igual que la carta "aportado" de la
          // cuenta conjunta. Va en la misma columna para que las dos áreas se
          // puedan leer en vertical sin tener que saber qué área estás mirando.
          {
            etiqueta: individual.miAportacion,
            valor: h.resumen.cuota,
            variante: 'aportado',
          },
          {
            etiqueta: literalesResumen.gastado,
            valor: h.resumen.gastado,
            variante: 'gastado',
          },
          {
            // PARIDAD: el presupuesto es una de las cuatro columnas del resumen
            // conjunto y aquí es un tope por persona. Que la tarjeta sea la misma
            // no basta para que la cifra esté: tiene que entrar en el modelo.
            etiqueta: individual.miPresupuesto,
            valor: h.resumen.presupuesto,
            variante: 'neutro',
          },
          {
            // Mismo criterio que la cuenta conjunta: un saldo negativo se rotula
            // "Déficit", no "Disponible". Pintar en coral una cifra llamada
            // "Disponible" se contradecía a sí misma.
            etiqueta:
              h.resumen.disponible != null && h.resumen.disponible < 0
                ? literalesResumen.deficit
                : literalesResumen.disponible,
            valor: h.resumen.disponible,
            variante: 'saldo',
          },
        ],
      })),
    };
  },

  async vistaDetalleMes(mesId: string): Promise<DetalleMesVista> {
    const user = await usuarioDeSesion();

    const mes = await mesRepository.findById(mesId);
    if (!mes) {
      notFound();
    }

    const [aportacion, gastos, presupuesto, gastosAnuales] = await Promise.all([
      aportacionRepository.findByMesAndUsuario(mes.id, user.id),
      gastoIndividualRepository.findByMes(user.id, mes.id),
      presupuestoIndividualRepository.findByMes(user.id, mes.id),
      gastoAnualIndividualRepository.findAll(user.id),
    ]);

    const permisos = ventanaDeMes(new Date(), mes.anio, mes.mes);
    const resumenMes = derivarResumenIndividual(
      mes,
      aportacion,
      gastos,
      presupuesto?.presupuesto ?? null,
      gastosAnuales,
    );

    return derivarDetalleMesVista({
      cifras: cifrasDeResumenIndividual(resumenMes),
      rotulos: {
        aportacion: individual.miAportacion,
        gastado: literalesResumen.gastado,
        presupuesto: individual.miPresupuesto,
        saldo: literalesResumen.disponible,
        deficit: literalesResumen.deficit,
        apartado: gastosAnualesLiterales.titulo,
      },
      hrefVolver: rutaHistorico('individual'),
      titulo: `${nombreMes(mes.mes)} ${mes.anio}`,
      gastos,
      formatearFecha: formatShortDate,
      sinGastos: historicoDetalle.sinGastos,
      recurrente: gastosLiterales.recurrente,
      variante: 'individual',
      puedeEditar: permisos.puedeEditar,
      puedeEliminar: permisos.puedeEliminar,
    });
  },
};
