import { obtenerMesActual } from '@/server-actions/queries';

export const dynamic = 'force-dynamic';
import { aportacionRepository, usuarioRepository } from '@/server-actions/repositories';
import { AportarForm } from '@/components/features/AportarForm';
import { Card } from '@/components/ui/Card';

export default async function AportarPage() {
  const mes = await obtenerMesActual();
  const usuarios = await usuarioRepository.findAll();
  const aportaciones = mes
    ? await aportacionRepository.findByMes(mes.id)
    : [];

  if (!mes) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-brand-navy">Aportar</h1>
        <Card>
          <p className="text-sm text-brand-muted">
            No hay un mes abierto todavía.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-brand-navy">Aportar</h1>
      <AportarForm mes={mes} usuarios={usuarios} aportaciones={aportaciones} />
    </div>
  );
}