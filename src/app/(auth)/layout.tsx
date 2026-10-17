export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Centrado en el viewport VISIBLE, no en el del layout: en el móvil la barra
    // del navegador (dirección / barra inferior) forma parte de `100dvh` /
    // `100vh` en varios navegadores, así que el bloque centrado sobre esa medida
    // aparece por DEBAJO del centro real de la pantalla. `min-h-svh` usa el
    // viewport más pequeño, que es el que está efectivamente a la vista al
    // cargar; por eso el contenido queda centrado de verdad. `items-center`
    // centra en horizontal; `main` lleva `w-full` para que los hijos no se
    // encojan al ancho de su contenido (por defecto `align-items: center` en un
    // flex columna los ajusta a su contenido y la tarjeta dejaría de llegar a
    // los bordes).
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-4 py-8">
      <main className="w-full">{children}</main>
    </div>
  );
}
