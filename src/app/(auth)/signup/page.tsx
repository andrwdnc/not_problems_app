import Link from 'next/link';
import { SignupForm } from '@/components/features/SignupForm';
import { auth } from '@/literals';

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-navy">{auth.tituloSignup}</h1>
        <p className="mt-1 text-sm text-brand-muted">
          {auth.subtituloSignup}
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-brand-muted">
        {auth.yaTienesCuenta}{' '}
        <Link href="/login" className="font-medium text-brand-primary">
          {auth.iniciaSesion}
        </Link>
      </p>
    </div>
  );
}
