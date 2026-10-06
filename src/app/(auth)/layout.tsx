export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `min-h-dvh` y no `min-h-screen`: en Safari iOS la barra superior/inferior
    // hace que `100vh` mida más que el área visible y el bloque centrado se
    // desplaza (o queda cortado) hacia abajo. `items-center` centra el bloque
    // en horizontal; `main` lleva `w-full` para que los hijos no se encogieran
    // al ancho de su contenido (por defecto `align-items: center` en un flex
    // columna los ajusta a su contenido y la tarjeta dejaría de llegar a los
    // bordes).
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-8">
      <main className="w-full">{children}</main>
    </div>
  );
}
