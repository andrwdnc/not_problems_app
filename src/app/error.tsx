'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { errores } from '@/literals';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg p-6">
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-brand-navy">
          {errores.errorTitulo}
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          {errores.errorDescripcion}
        </p>
        <Button onClick={reset} fullWidth className="mt-6">
          {errores.reintentar}
        </Button>
      </Card>
    </div>
  );
}