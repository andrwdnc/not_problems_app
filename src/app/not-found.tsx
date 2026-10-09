import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { errores } from '@/literals';

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-brand-bg p-6">
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-brand-navy">
          {errores.noEncontradoTitulo}
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          {errores.noEncontradoDescripcion}
        </p>
        <Link href="/inicio" className="mt-6 block w-full">
          <Button fullWidth>{errores.volverInicio}</Button>
        </Link>
      </Card>
    </div>
  );
}