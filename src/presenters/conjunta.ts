import { notFound } from 'next/navigation';
import { obtenerMesActual, calcularResumen } from '@/server-actions/queries';
import { obtenerHistorico } from '@/server-actions/historico-queries';
import {
  aportacionRepository,
  gastoRepository,
  mesRepository,
  pagoPrevistoRepository,
  usuarioRepository,
} from '@/server-actions/repositories';
import { mapearPagosPrevistosMes, mapearGestionPagosPrevistos } from '@/vistas/pagos-previstos';
import {
  cifrasDeResumenMes,
} from '@/vistas/cifras-mes';
import { derivarDetalleMesVista } from '@/vistas/detalle-mes';
import {
  calcularTotalesMes,
  calcularAhorro,
} from '@/domain/rules/CalculadoraAportacion';
import { fechaPrevista } from '@/domain/rules/PagosPrevistosAnuales';
import { ventanaDeMes } from '@/domain/rules/VentanaEdicionGastos';
import { formatShortDate, nombreMes } from '@/lib/formatters/date';
import { formatCurrency } from '@/lib/formatters/currency';
import { rutaHistorico, rutaHistoricoDetalle } from '@/lib/cuenta';
import {
  formatos,
  gastos as gastosLiterales,
  historico as literalesHistorico,
  historicoDetalle,
  inicio,
  aportar,
  gastoForm,
  resumen as literalesResumen,
} from '@/literals';
import type { ContextoCuenta } from './contrato';
import { avisoCongeladoDe } from './auxiliares';
import type { InicioResumenVista } from '@/vistas/inicio';
import type { DetalleMesVista } from '@/vistas/detalle-mes';
import type {
  DatosUltimosGastos,
  VistaPantallaAportar,
  VistaPantallaFormGasto,
  VistaGestionPagosPrevistos,
  VistaPantallaGastos,
  VistaPantallaHistorico,
} from '@/vistas/pantallas';

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

    // 2º pasada en paralelo: aportaciones + gastos del mes.
    const [aportaciones, gastos] = mes
      ? await Promise.all([
          aportacionRepository.findByMes(mes.id),
          gastoRepository.findByMes(mes.id),
        ])
      : [[], []];

    const resumen = mes
      ? calcularResumen(aportaciones, gastos, mes.presupuesto)
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
    const [mes, usuarios, pagosPrevistos] = await Promise.all([
      obtenerMesActual(),
      usuarioRepository.findAll(),
      pagoPrevistoRepository.findAll(),
    ]);

    if (!mes) {
      return {
        variante: 'conjunta',
        gastos: [],
        usuarios: new Map(usuarios.map((u) => [u.id, u.username])),
        pagosPrevistosMes: [],
        sinMes: inicio.sinMesAbierto,
      };
    }

    const gastos = await gastoRepository.findByMes(mes.id);

    return {
      variante: 'conjunta',
      gastos,
      usuarios: new Map(usuarios.map((u) => [u.id, u.username])),
      pagosPrevistosMes: mapearPagosPrevistosMes(
        pagosPrevistos,
        mes,
        new Date(),
      ),
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

  async vistaNuevoGasto(pagoPrevistoId?: string | null): Promise<VistaPantallaFormGasto> {
    const mes = await obtenerMesActual();

    let prefill: VistaPantallaFormGasto['prefill'] = null;
    if (pagoPrevistoId) {
      const previsto = await pagoPrevistoRepository.findById(pagoPrevistoId);
      if (previsto) {
        const anio = mes?.anio ?? new Date().getFullYear();
        prefill = {
          detalle: previsto.detalle,
          categoria: previsto.categoria,
          importe:
            previsto.importeReferencia != null
              ? (previsto.importeReferencia / 100).toString().replace('.', ',')
              : '',
          fechaGasto: fechaPrevista(previsto, anio),
          pagoPrevistoId: previsto.id,
        };
      }
    }

    return {
      variante: 'conjunta',
      sinMes: mes ? null : gastoForm.sinMesAbierto,
      avisoCongelado: null,
      gasto: null,
      mesId: mes?.id ?? null,
      prefill,
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
      prefill: null,
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

    const [aportaciones, gastos] = await Promise.all([
      aportacionRepository.findByMes(mes.id),
      gastoRepository.findByMes(mes.id),
    ]);

    const permisos = ventanaDeMes(new Date(), mes.anio, mes.mes);
    const { aportado, gastado } = calcularTotalesMes(aportaciones, gastos);

    return derivarDetalleMesVista({
      cifras: cifrasDeResumenMes({
        aportado,
        presupuesto: mes.presupuesto,
        ahorro: calcularAhorro(aportado, gastado),
        gastado,
        numeroGastos: gastos.length,
      }),
      rotulos: {
        aportacion: literalesResumen.aportado,
        gastado: literalesResumen.gastado,
        presupuesto: literalesResumen.presupuesto,
        saldo: literalesResumen.ahorro,
        deficit: literalesResumen.deficit,
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

  async vistaGestionPagosPrevistos(): Promise<VistaGestionPagosPrevistos> {
    const pagos = await pagoPrevistoRepository.findAll();
    return {
      variante: 'conjunta',
      pagos: mapearGestionPagosPrevistos(pagos, new Date()),
    };
  },
};
