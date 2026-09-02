import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/features/LoginForm';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-navy">Finanzas Compartidas</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Gestiona la cuenta conjunta de la pareja
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-brand-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/signup" className="font-medium text-brand-primary">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
