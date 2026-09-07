import { obtenerMesActual } from '@/server-actions/queries';

export const dynamic = 'force-dynamic';
import { aportacionRepository, usuarioRepository } from '@/server-actions/repositories';
import { AportarForm } from '@/components/features/AportarForm';
import { Card } from '@/components/ui/Card';
import { aportar } from '@/literals';

export default async function AportarPage() {
  const [mes, usuarios] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
  ]);
  const aportaciones = mes
    ? await aportacionRepository.findByMes(mes.id)
    : [];

  if (!mes) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-brand-navy">{aportar.titulo}</h1>
        <Card>
          <p className="text-sm text-brand-muted">
            {aportar.sinMesAbierto}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-brand-navy">{aportar.titulo}</h1>
      <AportarForm mes={mes} usuarios={usuarios} aportaciones={aportaciones} />
    </div>
  );
}