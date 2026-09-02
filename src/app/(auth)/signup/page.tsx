import Link from 'next/link';
import { SignupForm } from '@/components/features/SignupForm';

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-navy">Crear cuenta</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Únete a la cuenta conjunta de la pareja
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-brand-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-brand-primary">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
