export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Centrado robusto en el viewport real: grid + place-items-center sobre
  // min-h-[100dvh] evita el desfase que daba `min-h-svh` + `py-8` en algunos
  // navegadores móviles, donde el bloque quedaba por debajo del centro visible.
  // `px-4` reserva los laterales; `max-w-md` limita el ancho de la columna.
  return (
    <div className="mx-auto grid min-h-[100dvh] w-full max-w-md place-items-center px-4">
      <main className="w-full">{children}</main>
    </div>
  );
}
