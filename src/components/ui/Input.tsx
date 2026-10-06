import { useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, type, ...props }: InputProps) {
  // El <label> envuelve al <input>, así que la asociación es implícita y no
  // depende del id. Aun así se genera uno con useId: hay varias instancias del
  // mismo campo en una pantalla (un input de sueldo por usuario) y un id
  // duplicado rompería tanto las pruebas como las herramientas de accesibilidad.
  const generatedId = useId();

  return (
    <label className="block min-w-0 max-w-full">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-brand-muted">
          {label}
        </span>
      ) : null}
      <input
        id={id ?? generatedId}
        type={type}
        className={cn(
          // `min-w-0` + `max-w-full`: el input no puede ensancharse por su ancho
          // intrínseco (los nativos —fechas, números— traen un `size` propio) ni
          // empujar a su contenedor fuera de la pantalla.
          'w-full max-w-full min-w-0 rounded-xl border border-brand-border bg-brand-surface px-4 py-3 text-base text-brand-ink outline-none transition-colors placeholder:text-brand-muted/60 focus:border-brand-primary',
          // `type="date"`: sin `appearance-none`, WebKit pinta el campo nativo
          // con su estructura interna (día/mes/año + botón) y eso desborda el
          // ancho disponible, sacando la etiqueta de la pantalla.
          type === 'date' && 'appearance-none',
          className,
        )}
        {...props}
      />
    </label>
  );
}
