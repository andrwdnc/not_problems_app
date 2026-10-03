import { obtenerMesActual, calcularResumen } from '@/server-actions/queries';
import { calcularApartadoTotal } from '@/domain/rules/CalculadoraGastoAnual';
import {
  aportacionRepository,
  gastoRepository,
  usuarioRepository,
  gastoAnualRepository,
} from '@/server-actions/repositories';
import { PantallaInicio } from '@/components/features/pantallas/PantallaInicio';
import type { DatosUltimosGastos } from '@/components/features/pantallas/PantallaInicio';
import { nombreMes } from '@/lib/formatters/date';
import { formatCurrency } from '@/lib/formatters/currency';
import { inicio, resumen as literalesResumen, formatos } from '@/literals';
import type { InicioResumenVista } from '@/components/features/vista-inicio';

export const dynamic = 'force-dynamic';

/**
 * Ruta del INICIO en la cuenta CONJUNTA.
 *
 * No contiene markup: trae los datos de las dos áreas de la pantalla (resumen y
 * últimos gastos), resuelve la aritmética con las reglas puras compartidas y se
 * lo pasa a `PantallaInicio`, el mismo componente que usa el área individual. Aquí
 * no hay una etiqueta, ni una clase, ni una condición visual propias.
 */
export default function InicioPage() {
  return (
    <PantallaInicio resumen={resolverResumen()} gastos={resolverUltimosGastos()} />
  );
}

async function resolverResumen(): Promise<InicioResumenVista | null> {
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
}

async function resolverUltimosGastos(): Promise<DatosUltimosGastos> {
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
}