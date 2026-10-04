import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerHistoricoIndividual } from '@/server-actions/individual-queries';
import { PantallaHistorico } from '@/components/features/pantallas/PantallaHistorico';
import { historico as literalesHistorico, individual, resumen } from '@/literals';
import type { VistaPantallaHistorico } from '@/components/features/vista-pantallas';

export const dynamic = 'force-dynamic';

/**
 * Ruta del HISTÓRICO en el ÁREA INDIVIDUAL.
 *
 * La misma pantalla que la cuenta conjunta y el mismo componente. Solo cambian el
 * vocabulario (primera persona: "Mi sueldo", "Mi presupuesto") y el origen de las
 * cifras: el propietario sale de la sesión y los repositorios filtran en SQL (D8).
 */
export default function HistoricoIndividualPage() {
  return (
    <PantallaHistorico
      titulo={literalesHistorico.titulo}
      nota={literalesHistorico.nota}
      vista={resolverVista()}
    />
  );
}

async function resolverVista(): Promise<VistaPantallaHistorico> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const historico = await obtenerHistoricoIndividual(user.id);

  return {
    vacio: historico.length === 0,
    sinMeses: literalesHistorico.sinMeses,
    tarjetas: historico.map((h) => ({
      mesId: h.mes.id,
      anio: h.mes.anio,
      mes: h.mes.mes,
      href: `/individual/historico/${h.mes.id}`,
      estado: h.permisos.estado,
      esDeficit: h.resumen.disponible != null && h.resumen.disponible < 0,
      columnas: [
        // MI cuota (sueldo x porcentaje), igual que la carta "aportado" de la
        // cuenta conjunta. Va en la misma columna para que las dos áreas se
        // puedan leer en vertical sin tener que saber qué área estás mirando.
        { etiqueta: individual.miAportacion, valor: h.resumen.cuota, variante: 'aportado' },
        { etiqueta: resumen.gastado, valor: h.resumen.gastado, variante: 'gastado' },
        {
          // PARIDAD: el presupuesto es una de las cuatro columnas del resumen
          // conjunto y aquí es un tope por persona. Que la tarjeta sea la misma no
          // basta para que la cifra esté: tiene que entrar en el modelo.
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
              ? resumen.deficit
              : resumen.disponible,
          valor: h.resumen.disponible,
          variante: 'saldo',
        },
      ],
    })),
  };
}