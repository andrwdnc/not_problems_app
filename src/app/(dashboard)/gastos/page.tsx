import { obtenerMesActual } from '@/server-actions/queries';

export const dynamic = 'force-dynamic';
import { gastoRepository, usuarioRepository } from '@/server-actions/repositories';
import { GastosList } from '@/components/features/GastosList';

export default async function GastosPage() {
  const mes = await obtenerMesActual();
  const gastos = mes ? await gastoRepository.findByMes(mes.id) : [];
  const usuarios = await usuarioRepository.findAll();
  const usuarioPorId = new Map(usuarios.map((u) => [u.id, u.nombre]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-navy">Gastos</h1>
      <GastosList
        gastos={gastos}
        usuarios={usuarioPorId}
        mesId={mes?.id ?? ''}
      />
    </div>
  );
}