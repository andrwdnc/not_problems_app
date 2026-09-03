import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/features/LoginForm';
import { auth } from '@/literals';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-navy">{auth.tituloLogin}</h1>
        <p className="mt-1 text-sm text-brand-muted">
          {auth.subtituloLogin}
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-brand-muted">
        {auth.noTienesCuenta}{' '}
        <Link href="/signup" className="font-medium text-brand-primary">
          {auth.registrate}
        </Link>
      </p>
    </div>
  );
}
