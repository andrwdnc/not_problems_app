import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth';
import { obtenerHistoricoIndividual } from '@/server-actions/individual-queries';
import { Card } from '@/components/ui/Card';
import { historico as literalesHistorico, individual, resumen } from '@/literals';
import { HistoricoSectionSkeleton } from '@/components/features/skeletons';
import { TarjetaMesHistorico } from '@/components/features/TarjetaMesHistorico';
import type { TarjetaMesHistoricoVista } from '@/components/features/vista-historico';

export const dynamic = 'force-dynamic';

/**
 * Histórico individual: solo meses con datos propios del usuario, con el MISMO
 * componente de tarjeta que la cuenta conjunta y las MISMAS reglas de ventana.
 *
 * Lo que cambia es el vocabulario (primera persona: "Mi sueldo", "Mi
 * presupuesto") y de dónde salen las cifras: el propietario se deriva de la
 * sesión y los repositorios filtran en SQL (D8).
 */
export default function HistoricoIndividualPage() {
  // El título es estático: pinta al instante; las tarjetas del histórico se
  // rellenan por streaming cuando obtenerHistoricoIndividual resuelve.
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{literalesHistorico.titulo}</h1>

      <Suspense fallback={<HistoricoSectionSkeleton />}>
        <HistoricoIndividualSection />
      </Suspense>
    </div>
  );
}

async function HistoricoIndividualSection() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const historico = await obtenerHistoricoIndividual(user.id);

  if (historico.length === 0) {
    return (
      <Card>
        <p className="text-sm text-brand-muted">{literalesHistorico.sinMeses}</p>
      </Card>
    );
  }

  // Solo construye modelos de vista; el markup es el de `TarjetaMesHistorico`,
  // compartido con la cuenta conjunta.
  return (
    <div className="space-y-3">
      {historico.map((h): TarjetaMesHistoricoVista => ({
        mesId: h.mes.id,
        anio: h.mes.anio,
        mes: h.mes.mes,
        href: `/individual/historico/${h.mes.id}`,
        estado: h.permisos.estado,
        esDeficit: h.resumen.disponible != null && h.resumen.disponible < 0,
        columnas: [
          {
            etiqueta: individual.miSueldo,
            valor: h.resumen.sueldo,
            variante: 'aportado',
          },
          {
            etiqueta: resumen.gastado,
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
            // Mismo criterio que la cuenta conjunta: un saldo negativo se
            // rotula "Déficit", no "Disponible". Pintar en coral una cifra
            // llamada "Disponible" se contradecía a sí misma.
            etiqueta:
              h.resumen.disponible != null && h.resumen.disponible < 0
                ? resumen.deficit
                : resumen.disponible,
            valor: h.resumen.disponible,
            variante: 'saldo',
          },
        ],
      })).map((vista) => (
        <TarjetaMesHistorico key={vista.mesId} vista={vista} />
      ))}
    </div>
  );
}