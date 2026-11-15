export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Centrado en el viewport real, ligeramente por encima del centro exacto
  // (más padding inferior que superior) porque el bloque centrado al milímetro
  // se percibe bajo en pantallas altas.
  return (
    <div className="mx-auto grid min-h-[100dvh] w-full max-w-md place-items-center px-4 pt-8 pb-32">
      <main className="w-full">{children}</main>
    </div>
  );
}
