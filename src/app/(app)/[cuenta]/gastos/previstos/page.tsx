import { adaptadorDeCuenta } from '@/presenters';
import { GestionPagosPrevistos } from '@/components/features/GestionPagosPrevistos';
import { pagosPrevistos } from '@/literals';

export const dynamic = 'force-dynamic';

export default async function PagosPrevistosPage({
  params,
}: {
  params: { cuenta: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  const vista = await contexto.vistaGestionPagosPrevistos();
  return (
    <GestionPagosPrevistos variante={vista.variante} pagos={vista.pagos} />
  );
}
