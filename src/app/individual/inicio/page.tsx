import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerResumenIndividual } from '@/server-actions/individual-queries';
import { obtenerMesActual } from '@/server-actions/queries';
import { gastoIndividualRepository } from '@/server-actions/repositories';
import { PantallaInicio } from '@/components/features/pantallas/PantallaInicio';
import type { DatosUltimosGastos } from '@/components/features/pantallas/PantallaInicio';
import { nombreMes } from '@/lib/formatters/date';
import { formatCurrency } from '@/lib/formatters/currency';
import { inicio, individual, resumen as literalesResumen } from '@/literals';
import type { InicioResumenVista } from '@/components/features/vista-inicio';

export const dynamic = 'force-dynamic';

/**
 * Ruta del INICIO en el ÁREA INDIVIDUAL.
 *
 * Misma pantalla que la cuenta conjunta, mismo componente (`PantallaInicio`) y
 * mismas reglas puras. Solo cambian dos cosas, y las dos son legítimas: los datos
 * son los del usuario de la sesión (owner-first) y los rótulos van en primera
 * persona porque aquí el número es de una sola persona.
 *
 * PARIDAD: las mismas dos secciones que la conjunta —resumen con contador de
 * gastos y últimos gastos—, no un subconjunto.
 */
export default function InicioIndividualPage() {
  return (
    <PantallaInicio resumen={resolverResumen()} gastos={resolverUltimosGastos()} />
  );
}

async function resolverResumen(): Promise<InicioResumenVista | null> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

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
}

async function resolverUltimosGastos(): Promise<DatosUltimosGastos> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

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
}