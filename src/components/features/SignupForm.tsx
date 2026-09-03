'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/server-actions/auth-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { auth } from '@/literals';

export function SignupForm() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);

    const formData = new FormData(e.currentTarget);
    const resultado = await signup({
      username: formData.get('username'),
      password: formData.get('password'),
    });

    if (!resultado.ok) {
      setMensaje(resultado.error);
      setCargando(false);
      return;
    }

    router.refresh();
    router.push('/inicio');
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="username"
          label={auth.labelUsuario}
          name="username"
          type="text"
          autoComplete="username"
          placeholder={auth.placeholderUsuarioSignup}
          required
        />
        <Input
          id="password"
          label={auth.labelContrasena}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        {mensaje && (
          <p className="rounded-xl bg-financial-negativeBg p-3 text-center text-sm text-financial-negative">
            {mensaje}
          </p>
        )}
        <Button type="submit" fullWidth disabled={cargando}>
          {cargando ? auth.creando : auth.crearCuenta}
        </Button>
      </form>
    </Card>
  );
}
