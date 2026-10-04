/**
 * Política de límite de intentos de autenticación (regla de dominio pura).
 *
 * El objetivo es frenar dos ataques que no necesitan estar autenticados:
 *
 * - **Fuerza bruta**: enumerar contraseñas de una cuenta conocida.
 * - **Abuso de recursos**: `bcrypt` con coste 12 es deliberadamente caro, así
 *   que un endpoint de login sin límite es también un vector de denegación de
 *   servicio por CPU.
 *
 * Se cuentan DOS cubos de forma independiente, porque un límite solo deja
 * escapar al otro: el cubo por usuario frena la fuerza bruta contra una cuenta
 * y el cubo por IP frena el barrido de muchas cuentas desde una misma máquina.
 *
 * La política vive aquí, como tabla, y no dentro de la Server Action: así es
 * testeable sin base de datos, y añadir una acción protegida es añadir una fila.
 */

/** Acciones sujetas a límite. */
export type AccionSujetaALimite = 'login' | 'signup';

export interface ReglaLimite {
  /** Acción a la que aplica la regla. */
  accion: AccionSujetaALimite;
  /** Duración de la ventana en milisegundos. */
  ventanaMs: number;
  /** Intentos máximos por nombre de usuario dentro de la ventana. */
  porUsuario: number;
  /** Intentos máximos por dirección IP dentro de la ventana. */
  porIp: number;
}

/** Minutos en milisegundos. */
const MIN = 60_000;

/**
 * Tabla de reglas (OCP): el comportamiento está declarado como datos. Cambiar un
 * umbral o añadir una acción protegida es añadir o editar una fila, sin tocar
 * la estructura de las funciones.
 */
const REGLAS: ReglaLimite[] = [
  {
    // 5 intentos por cuenta: suficiente para teclear mal una contraseña un par
    // de veces sin castigarse, demasiado pocos para un ataque
    // automatizado. 20 por IP permite a las dos personas legítimas del espacio
    // trabajar desde la misma conexión (móvil, casa, oficina).
    accion: 'login',
    ventanaMs: 15 * MIN,
    porUsuario: 5,
    porIp: 20,
  },
  {
    // El registro es la única operación que crea filas en `usuarios` y el
    // espacio está limitado a 2 cuentas, así que un límite aquí también es un
    // límite de negocio. Ventana más ancha porque crear una cuenta es una
    // decisión, no un reintento.
    accion: 'signup',
    ventanaMs: 60 * MIN,
    porUsuario: 3,
    porIp: 10,
  },
];

/**
 * Devuelve la regla de la acción. Lanza si la acción no tiene regla declarada,
 * para que añadir una acción sin umbral sea un fallo explícito y no un
 * passthrough que permitiría un intento ilimitado.
 */
export function reglaDe(accion: AccionSujetaALimite): ReglaLimite {
  const regla = REGLAS.find((r) => r.accion === accion);
  if (!regla) {
    throw new Error(`No hay regla de límite de intentos para "${accion}"`);
  }
  return regla;
}

/** Qué cubo superó el umbral, o `null` si el intento está permitido. */
export type MotivoBloqueo = 'usuario' | 'ip';

/**
 * Decide si un intento debe rechazarse por haber superado un umbral.
 *
 * Se evalúa el cubo de usuario ANTES que el de IP: si ambos superan, el
 * mensaje va contra la cuenta, que es lapalanca que el atacante controla.
 *
 * El intento que IGUALA el umbral se permite y el que lo supera se rechaza, de
 * modo que con `porUsuario: 5` hay exactamente 5 intentos disponibles en la
 * ventana.
 */
export function estaBloqueado(
  intentosUsuario: number,
  intentosIp: number,
  regla: ReglaLimite,
): MotivoBloqueo | null {
  if (intentosUsuario > regla.porUsuario) return 'usuario';
  if (intentosIp > regla.porIp) return 'ip';
  return null;
}