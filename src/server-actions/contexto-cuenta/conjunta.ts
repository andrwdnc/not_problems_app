import { notFound } from 'next/navigation';
import { obtenerMesActual, calcularResumen } from '@/server-actions/queries';
import { obtenerHistorico } from '@/server-actions/historico-queries';
import {
  aportacionRepository,
  gastoRepository,
  mesRepository,
  usuarioRepository,
  gastoAnualRepository,
} from '@/server-actions/repositories';
import { mapearGastosAnualesAVista } from '@/server-actions/vista-gastos-anuales';
import {
  cifrasDeResumenMes,
} from '@/server-actions/vistas/cifras-mes';
import { derivarDetalleMesVista } from '@/server-actions/vistas/detalle-mes';
import {
  calcularTotalesMes,
  calcularAhorro,
} from '@/domain/rules/CalculadoraAportacion';
import { calcularApartadoTotal } from '@/domain/rules/CalculadoraGastoAnual';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import { formatShortDate, nombreMes } from '@/lib/formatters/date';
import { formatCurrency } from '@/lib/formatters/currency';
import { rutaHistorico, rutaHistoricoDetalle } from '@/lib/cuenta';
import {
  formatos,
  gastosAnuales as gastosAnualesLiterales,
  gastos as gastosLiterales,
  historico as literalesHistorico,
  historicoDetalle,
  inicio,
  aportar,
  gastoForm,
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
 * ADAPTADOR de la cuenta CONJUNTA: resuelve las vistas de las pantallas con los
 * repositorios de los datos compartidos. La lógica es la que vivía repartida en
 * las páginas de `app/(dashboard)/`; aquí está una sola vez y sirve a las dos
 * áreas a través del contrato `ContextoCuenta`.
 */
export const adaptadorConjunta: ContextoCuenta = {
  variante: 'conjunta',

  /* ---------------------------------------------------------------------- */
  /* Inicio                                                                  */
  /* ---------------------------------------------------------------------- */

  async resumenInicio(): Promise<InicioResumenVista | null> {
    // 1º pasada en paralelo: mes actual + usuarios (no dependen entre sí).
    const [mes, usuarios] = await Promise.all([
      obtenerMesActual(),
      usuarioRepository.findAll(),
    ]);

    // 2º pasada en paralelo: aportaciones + gastos + gastos anuales del mes.
    const [aportaciones, gastos, gastosAnuales] = mes
      ? await Promise.all([
          aportacionRepository.findByMes(mes.id),
          gastoRepository.findByMes(mes.id),
          gastoAnualRepository.findAll(),
        ])
      : [[], [], []];

    const apartadoMes = mes
      ? calcularApartadoTotal(gastosAnuales, mes.anio, mes.mes)
      : 0;

    const resumen = mes
      ? calcularResumen(aportaciones, gastos, mes.presupuesto, apartadoMes)
      : null;

    return {
      titulo: mes ? `${nombreMes(mes.mes)} ${mes.anio}` : inicio.sinMesAbierto,
      hayDatos: resumen != null,
      mensajeSinDatos: inicio.sinDatos,
      anillo: {
        // Con presupuesto, el anillo mide lo consumido de él; sin presupuesto, mide
        // lo aportado. Es la misma decisión en ambas ramas.
        porcentaje:
          resumen?.porcentajePresupuesto ?? resumen?.porcentajeGastado ?? 0,
        etiqueta:
          resumen?.porcentajePresupuesto != null
            ? literalesResumen.presupuestoRing
            : literalesResumen.gastadoRing,
      },
      cifraAnillo: {
        etiqueta: literalesResumen.presupuesto,
        valor: resumen?.presupuesto ?? null,
      },
      tarjetas: resumen
        ? [
            {
              variante: 'aportado',
              etiqueta: literalesResumen.aportado,
              importe: resumen.aportado,
            },
            {
              variante: 'gastado',
              etiqueta: literalesResumen.gastado,
              importe: resumen.gastado,
            },
            {
              variante: 'ahorro',
              etiqueta: literalesResumen.ahorro,
              importe: resumen.ahorro,
            },
          ]
        : [],
      avisoSuperado:
        resumen?.restantePresupuesto != null && resumen.restantePresupuesto < 0
          ? inicio.teHasPasadoPresupuesto(
              formatCurrency(-(resumen.restantePresupuesto as number)),
            )
          : undefined,
      notaCifraAnillo: resumen
        ? `· ${inicio.contadorGastos(resumen.numeroGastos)}`
        : undefined,
    };
  },

  async ultimosGastosInicio(): Promise<DatosUltimosGastos> {
    const [mes, usuarios] = await Promise.all([
      obtenerMesActual(),
      usuarioRepository.findAll(),
    ]);

    // Sin mes abierto no hay lista: se conserva el estado vacío de la sección de
    // resumen ("sin mes"), en vez de añadir un bloque vacío sin explicación.
    if (!mes) return null;

    const gastos = await gastoRepository.findByMes(mes.id);
    const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

    return {
      variante: 'conjunta',
      gastos: gastos.map((g) => ({
        id: g.id,
        detalle: g.detalle,
        categoria: g.categoria,
        importe: g.importe,
        // Se conserva el comportamiento previo: un `creadoPor` que no esté en el
        // mapa se pintaba como marcador de formato, no como hueco vacío.
        creador: usuarioPorId.get(g.creadoPor) ?? formatos.vacio,
      })),
    };
  },

  /* ---------------------------------------------------------------------- */
  /* Gastos                                                                  */
  /* ---------------------------------------------------------------------- */

  async vistaGastos(): Promise<VistaPantallaGastos> {
    const [mes, usuarios, gastosAnuales] = await Promise.all([
      obtenerMesActual(),
      usuarioRepository.findAll(),
      gastoAnualRepository.findAll(),
    ]);

    if (!mes) {
      // Sin mes abierto: se dice explícitamente. Antes esta pantalla enseñaba
      // una lista vacía sin explicación, que es indistinguible de "no has
      // registrado ningún gasto este mes".
      return {
        variante: 'conjunta',
        gastos: [],
        usuarios: new Map(usuarios.map((u) => [u.id, u.username])),
        gastosAnuales: [],
        sinMes: inicio.sinMesAbierto,
      };
    }

    const gastos = await gastoRepository.findByMes(mes.id);

    return {
      variante: 'conjunta',
      gastos,
      // Con nombre de creador: en la conjunta los gastos son de los dos y el pie
      // de fila tiene que decir de quién es cada uno.
      usuarios: new Map(usuarios.map((u) => [u.id, u.username])),
      gastosAnuales: mapearGastosAnualesAVista(gastosAnuales, mes),
      sinMes: null,
    };
  },

  /* ---------------------------------------------------------------------- */
  /* Aportar                                                                 */
  /* ---------------------------------------------------------------------- */

  async vistaAportar(): Promise<VistaPantallaAportar> {
    const [mes, usuarios] = await Promise.all([
      obtenerMesActual(),
      usuarioRepository.findAll(),
    ]);
    const aportaciones = mes ? await aportacionRepository.findByMes(mes.id) : [];

    return {
      variante: 'conjunta',
      sinMes: mes ? null : aportar.sinMesAbierto,
      mes,
      usuarios,
      aportaciones,
      // El presupuesto de la conjunta vive en `meses.presupuesto`: no hay
      // presupuesto por persona que traer aquí.
      presupuestoIndividual: null,
    };
  },

  /* ---------------------------------------------------------------------- */
  /* Alta y edición de gasto mensual                                         */
  /* ---------------------------------------------------------------------- */

  async vistaNuevoGasto(): Promise<VistaPantallaFormGasto> {
    const mes = await obtenerMesActual();

    return {
      variante: 'conjunta',
      sinMes: mes ? null : gastoForm.sinMesAbierto,
      avisoCongelado: null,
      gasto: null,
      mesId: mes?.id ?? null,
    };
  },

  async vistaEditarGasto(gastoId: string): Promise<VistaPantallaFormGasto> {
    const gasto = await gastoRepository.findById(gastoId);
    if (!gasto) {
      notFound();
    }

    return {
      variante: 'conjunta',
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
    const mes = await obtenerMesActual();

    return {
      variante: 'conjunta',
      sinMes: mes ? null : gastoForm.sinMesAbierto,
      avisoDevengoPrevio: null,
      gastoAnual: null,
      devengoPrevio: false,
    };
  },

  async vistaEditarGastoAnual(
    gastoAnualId: string,
  ): Promise<VistaPantallaFormGastoAnual> {
    const gastoAnual = await gastoAnualRepository.findById(gastoAnualId);
    if (!gastoAnual) {
      notFound();
    }

    const { devengoPrevio, aviso } = devengoPrevioDe(gastoAnual);

    return {
      variante: 'conjunta',
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
    const historico = await obtenerHistorico();

    return {
      vacio: historico.length === 0,
      sinMeses: literalesHistorico.sinMeses,
      tarjetas: historico.map((h) => ({
        mesId: h.mes.id,
        anio: h.mes.anio,
        mes: h.mes.mes,
        href: rutaHistoricoDetalle('conjunta', h.mes.id),
        estado: h.permisos.estado,
        esDeficit: h.ahorro < 0,
        columnas: [
          {
            etiqueta: literalesResumen.aportado,
            valor: h.aportado,
            variante: 'aportado',
          },
          {
            etiqueta: literalesResumen.gastado,
            valor: h.gastado,
            variante: 'gastado',
          },
          {
            etiqueta: literalesResumen.presupuesto,
            valor: h.presupuesto,
            variante: 'neutro',
          },
          {
            etiqueta:
              h.ahorro < 0 ? literalesResumen.deficit : literalesResumen.ahorro,
            valor: h.ahorro,
            variante: 'saldo',
          },
        ],
      })),
    };
  },

  async vistaDetalleMes(mesId: string): Promise<DetalleMesVista> {
    const mes = await mesRepository.findById(mesId);
    if (!mes) {
      notFound();
    }

    const [aportaciones, gastos, gastosAnuales] = await Promise.all([
      aportacionRepository.findByMes(mes.id),
      gastoRepository.findByMes(mes.id),
      gastoAnualRepository.findAll(),
    ]);

    const permisos = ventanaDeMes(new Date(), mes.anio, mes.mes);
    const { aportado, gastado } = calcularTotalesMes(aportaciones, gastos);
    const apartado = calcularApartadoTotal(gastosAnuales, mes.anio, mes.mes);

    return derivarDetalleMesVista({
      cifras: cifrasDeResumenMes({
        aportado,
        presupuesto: mes.presupuesto,
        apartado,
        ahorro: calcularAhorro(aportado, gastado, apartado),
        gastado,
        numeroGastos: gastos.length,
      }),
      rotulos: {
        aportacion: literalesResumen.aportado,
        gastado: literalesResumen.gastado,
        presupuesto: literalesResumen.presupuesto,
        saldo: literalesResumen.ahorro,
        deficit: literalesResumen.deficit,
        apartado: gastosAnualesLiterales.titulo,
      },
      hrefVolver: rutaHistorico('conjunta'),
      titulo: `${nombreMes(mes.mes)} ${mes.anio}`,
      gastos,
      formatearFecha: formatShortDate,
      sinGastos: historicoDetalle.sinGastos,
      recurrente: gastosLiterales.recurrente,
      variante: 'conjunta',
      puedeEditar: permisos.puedeEditar,
      puedeEliminar: permisos.puedeEliminar,
    });
  },
};
