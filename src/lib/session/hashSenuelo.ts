/**
 * Hash señuelo para igualar el coste del login cuando el usuario no existe.
 *
 * Sin esto, `login` respondía en microsegundos a un nombre de usuario
 * inexistente y en ~100 ms a uno existente, porque solo en el segundo caso se
 * llegaba a `bcrypt.compare`. Esa diferencia de tiempo basta para enumerar las
 * cuentas registradas: el mensaje de error era el mismo, pero el reloj no.
 *
 * La mitigación es ejecutar SIEMPRE la comparación, sustituyendo el hash real
 * por uno señuelo cuando el usuario no existe. El coste es idéntico en ambos
 * caminos y el atacante solo ve ruido.
 *
 * El hash es de una contraseña aleatoria descartada: no corresponde a ninguna
 * cuenta y no sirve para autenticarse. Su único papel es gastar CPU. Se fija
 * como constante (y no se genera en cada arranque) para que el tiempo de
 * respuesta sea estable también entre invocaciones.
 */
export const HASH_SENUELO = '$2b$12$t./aiOWobv7VK1urTdjDs.NNVkkdHQ5yBAJV..7.2uOCQF0vwoMjS';