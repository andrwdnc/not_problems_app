import { headers } from 'next/headers';
import { createHmac } from 'crypto';
import { authIntentosRepository } from './repositories';
import {
  estaBloqueado,
  reglaDe,
  type AccionSujetaALimite,
} from '@/domain/rules/LimiteIntentosAuth';
import { getAuthSecret } from '@/infrastructure/config';
import { authErrores } from '@/literals';

/**
 * Limitador de intentos de autenticación (`login` y `signup`).
 *
 * Tres decisiones de diseño que conviene tener presentes:
 *
 * 1. **El estado vive en Postgres, no en memoria.** El despliegue es serverless:
 *    cada instancia de Vercel tiene su propio heap, así que un `Map` en memoria
 *    permitiría `N` intentos por instancia y el límite real sería N veces mayor
 *    (y además parpadearía con el tráfico). Una tabla es lo único que cuenta igual en
 *    todas las instancias.
 *
 * 2. **Las claves se hashean antes de tocar la base de datos.** Ni el username
 *    ni la IP se almacenan: se guarda un HMAC con `AUTH_SECRET`. La tabla no
 *    contiene datos personales y un volcado accidental no revela qué cuentas
 *    existen. El ámbito (`usuario:` / `ip:`) entra en el material hasheado para
 *    que un username no pueda colisionar con una IP.
 *
 * 3. **El fallo es deliberadamente indistinguible.** Cuando se bloquea, se
 *    responde con el mismo mensaje que una contraseña incorrecta: informar de
 *    "has superado el límite" confirma que la cuenta existe y le dice al
 *    atacante cuándo puede volver a probar.
 */

/**
 * Antigüedad a partir de la cual una ventana vencida se considera basura.
 * El doble del TTL máximo (1 h de `signup`) deja margen para que una purga
 * perdida no borre una ventana vigente.
 */
const ANTIGUEDAD_PURGA_MS = 2 * 60 * 60 * 1000;

/**
 * Deriva la clave opaca de un cubo (`usuario:` o `ip:`) combinando el ámbito y
 * el valor. El ámbito forma parte del material hasheado a propósito.
 */
function clave(ambito: 'usuario' | 'ip', valor: string): string {
  return createHmac('sha256', getAuthSecret())
    .update(`${ambito}:${valor.toLowerCase()}`)
    .digest('base64url');
}

/**
 * Dirección de origen. Detrás del proxy de Vercel, `x-forwarded-for` es una
 * lista de saltos y el primero es el cliente original. Si la cabecera no existe
 * (desarrollo local, pruebas) se usa un valor constante: en ese entorno todos
 * comparten cubo de IP, lo cual es aceptable porque no hay exposición pública.
 */
function ipDeOrigen(): string {
  const reenviada = headers().get('x-forwarded-for');
  if (!reenviada) return 'desconocida';
  const primera = reenviada.split(',')[0]?.trim();
  return primera && primera.length > 0 ? primera : 'desconocida';
}

/**
 * Contabiliza un intento y devuelve `true` si la acción está bloqueada.
 *
 * DEGRADA A PERMITIR si el contador no está disponible. Es deliberado y es la
 * decisión de diseño más discutible de este módulo:
 *
 * - **A favor de abrir:** el fallo realista es que falte la migración
 *   `npm run db:migrate:auth-seguridad` (o que la base de datos no responda).
 *   Con el límite en modo cerrado, ese fallo deja la app enteramente
 *   inaccesible: nadie puede ni entrar ni ver un error que le sirva. Un atacante
 *   no puede provocarlo, porque no tiene acceso al schema.
 * - **En contra:** si un atacante consigue inducir el fallo, el límite se
 *   desactiva y sí puede probar contraseñas sin restricción.
 *
 * Se elige abrir porque el modo cerrado convierte un problema operativo en una
 * caída total, y porque el segundo escenario exige un acceso previo que el
 * atacante no tiene. El `catch` de cada Server Action ya traduce el fallo de
 * conexión al literal correspondiente, así que el error sigue siendo visible.
 */
export async function estaBloqueadoPorIntentos(
  accion: AccionSujetaALimite,
  username: string,
): Promise<boolean> {
  const regla = reglaDe(accion);

  try {
    const porUsuario = await authIntentosRepository.contar(
      clave('usuario', username),
      regla.ventanaMs,
    );
    const porIp = await authIntentosRepository.contar(
      clave('ip', ipDeOrigen()),
      regla.ventanaMs,
    );

    return estaBloqueado(porUsuario.intentos, porIp.intentos, regla) !== null;
  } catch {
    return false;
  }
}

/**
 * Traduce un bloqueo por límite al mensaje que ve el usuario. Deliberadamente
 * indistinguible del error de credenciales: confirmar que la cuenta existe ya
 * sería filtrar información.
 */
export function mensajeIntentosAgotados(): string {
  return authErrores.credencialesIncorrectas;
}