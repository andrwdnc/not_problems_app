import { obtenerMesActual } from '@/server-actions/queries';

export const dynamic = 'force-dynamic';
import { gastoRepository, usuarioRepository } from '@/server-actions/repositories';
import { GastosList } from '@/components/features/GastosList';
import { nav } from '@/literals';

export default async function GastosPage() {
  const [mes, usuarios] = await Promise.all([
    obtenerMesActual(),
    usuarioRepository.findAll(),
  ]);
  const gastos = mes ? await gastoRepository.findByMes(mes.id) : [];
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.username]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">{nav.gastos}</h1>
      <GastosList
        gastos={gastos}
        usuarios={usuarioPorId}
        mesId={mes?.id ?? ''}
      />
    </div>
  );
}