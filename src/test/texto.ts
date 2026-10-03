/**
 * Matcher para tests de componentes (`.test.tsx`).
 *
 * Existe por una razón concreta: `formatCurrency` usa `Intl` en es-ES, que
 * separa la cifra del símbolo con un espacio duro (U+00A0). Testing Library
 * normaliza con `/\s+/g` el texto que extrae del DOM, pero **no** la cadena
 * que se le pasa como expectativa, de modo que `getByText(formatCurrency(n))`
 * nunca encuentra el elemento: `1234,56\u00A0€` normalizado es
 * `1234,56 €`, que no es igual a la expectativa original.
 *
 * Comparar `textContent` en crudo evita esa asimetría y, de paso, hace que el
 * test afirme exactamente lo que el usuario ve en pantalla.
 */
export function textoExacto(esperado: string) {
  return (_contenido: string, elemento: Element | null): boolean =>
    elemento?.textContent === esperado;
}