import { redirect } from 'next/navigation';
import { adaptadorDeCuenta } from '@/server-actions/contexto-cuenta';
import { rutaInicio } from '@/lib/cuenta';

/**
 * `/conjunta` y `/individual` a secas no son pantallas: llevan al inicio del
 * área correspondiente.
 */
export default function CuentaIndexPage({
  params,
}: {
  params: { cuenta: string };
}) {
  const contexto = adaptadorDeCuenta(params.cuenta);
  redirect(rutaInicio(contexto.variante));
}
