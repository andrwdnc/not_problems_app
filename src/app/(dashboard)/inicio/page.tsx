import { Suspense } from 'react';
import { obtenerMesActual, calcularResumen } from '@/server-actions/queries';
import {
  calcularVentanaApartado,
  calcularApartadoMes,
} from '@/domain/rules/CalculadoraGastoAnual';

export const dynamic = 'force-dynamic';
import {
  aportacionRepository,
  gastoRepository,
  usuarioRepository,
  gastoAnualRepository,
} from '@/server-actions/repositories';
import { InicioResumen } from '@/components/features/InicioResumen';
import { UltimosGastos } from '@/components/features/UltimosGastos';
import {
  ResumenInicioSkeleton,
  UltimosGastosSkeleton,
} from '@/components/features/skeletons';
import { nombreMes } from '@/lib/formatters/date';
import { formatCurrency } from '@/lib/formatters/currency';
import { inicio, resumen as literalesResumen, formatos } from '@/literals';
import type { InicioResumenVista } from '@/components/features/vista-inicio';

export default function InicioPage() {
  // Cada sección resuelve su propia query y se rellena por streaming bajo su
  // Suspense: el anillo/tarjetas aparecen cuando la DB responde, sin esperar
  // a la lista de últimos gastos (y viceversa).
  return (
    <div className="space-y-5">
      <Suspense fallback={<ResumenInicioSkeleton />}>
        <ResumenInicioSection />
      </Suspense>
      <Suspense fallback={<UltimosGastosSkeleton />}>
        <UltimosGastosSection />
      </Suspense>
    </div>
  );
}

async function ResumenInicioSection() {
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

  // Calcular apartado del mes actual con la ventana [inicio → mesPago] INCLUSIVE:
  // cada gasto anual aparta desde su mes de creación (o mes tras el último pago)
  // hasta el mes de pago del ciclo actual, contando los dos extremos.
  let apartadoMes = 0;
  if (mes) {
    for (const gastoAnual of gastosAnuales) {
      const ventana = calcularVentanaApartado(
        gastoAnual.fechaCreacion,
        gastoAnual.fechaUltimoPago,
        gastoAnual.anioCiclo,
        gastoAnual.mesPago,
      );
      apartadoMes += calcularApartadoMes(
        gastoAnual.importeTotal,
        ventana,
        mes.anio,
        mes.mes,
      ).cuota;
    }
  }

  const resumen = mes
    ? calcularResumen(aportaciones, gastos, mes.presupuesto, apartadoMes)
    : null;

  // Esta función solo CONSTRUYE el modelo de vista. El markup vive en
  // `InicioResumen`, que es el mismo componente que usa el área individual: las
  // dos pantallas de Inicio no pueden separarse porque no tienen dos copias del
  // JSX que separar.
  const vista: InicioResumenVista = {
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

  return <InicioResumen vista={vista} />;
}

async function UltimosGastosSection() {
  const [mes, usuarios] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
  ]);

  // Sin mes abierto no hay lista: se conserva el estado vacío de la sección de
  // resumen ("sin mes"), como antes de separar las secciones.
  if (!mes) return null;

  const gastos = await gastoRepository.findByMes(mes.id);
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

  return (
    <UltimosGastos
      variante="conjunta"
      gastos={gastos.map((g) => ({
        id: g.id,
        detalle: g.detalle,
        categoria: g.categoria,
        importe: g.importe,
        // Se conserva el comportamiento previo: un `creadoPor` que no esté en el
        // mapa se pintaba como marcador de formato, no como hueco vacío.
        creador: usuarioPorId.get(g.creadoPor) ?? formatos.vacio,
      }))}
    />
  );
}
