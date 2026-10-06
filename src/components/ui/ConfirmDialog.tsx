'use client';

import { useEffect, useId } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  /** Solo se pinta cuando está abierto; el padre es quien tiene el estado. */
  abierto: boolean;
  /** Pregunta de cabecera (p. ej. «¿Eliminar este gasto?»). */
  titulo: string;
  /** Detalle opcional de lo que se va a afectar (nombre, importe…). */
  descripcion?: string;
  /** Texto del botón destructivo (p. ej. «Eliminar»). */
  textoConfirmar: string;
  /** Texto del botón seguro (p. ej. «Cancelar»). */
  textoCancelar: string;
  /** Acción en curso: spinner y bloqueo del botón destructivo. */
  cargando?: boolean;
  /** Error devuelto por la acción; se muestra DENTRO del diálogo. */
  error?: string | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Diálogo de confirmación de acciones destructivas.
 *
 * Sustituye a `window.confirm`: el navegador enseña un diálogo ajeno a la app
 * que no se puede estilar, no respeta la tipografía ni los colores y en móvil
 * rompe la experiencia. Este componente repite el lenguaje visual de las
 * tarjetas (`rounded-3xl`, `bg-brand-surface`, botones `Button`) y mantiene el
 * flujo de las Server Actions: mientras `cargando`, el botón de confirmar
 * muestra el spinner, queda deshabilitado y no se puede repetir la petición.
 *
 * Conducta de cierre: Escape y el clic en el fondo cancelan, salvo mientras
 * hay una acción en curso (cancelar a mitad de un borrado dejaría al usuario
 * sin saber si se ejecutó). El foco arranca en «Cancelar», que es la opción no
 * destructiva, de modo que un Enter accidental no borra nada.
 *
 * Los textos NO viven aquí: los aporta quien lo usa desde `src/literals/`, como
 * en el resto de la app.
 */
export function ConfirmDialog({
  abierto,
  titulo,
  descripcion,
  textoConfirmar,
  textoCancelar,
  cargando = false,
  error = null,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const idTitulo = useId();

  useEffect(() => {
    if (!abierto) return;

    function alPulsarEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !cargando) onCancelar();
    }

    document.addEventListener('keydown', alPulsarEscape);
    return () => document.removeEventListener('keydown', alPulsarEscape);
  }, [abierto, cargando, onCancelar]);

  if (!abierto) return null;

  return (
    // `z-[60]` por encima de la navegación inferior (z-40) y del FAB (z-50).
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-ink/40 p-4"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget && !cargando) onCancelar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="w-full max-w-sm rounded-3xl bg-brand-surface p-5 shadow-xl"
      >
        <h2 id={idTitulo} className="text-base font-semibold text-brand-navy">
          {titulo}
        </h2>
        {descripcion && (
          <p className="mt-1 text-sm text-brand-muted">{descripcion}</p>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-financial-negativeBg p-3 text-center text-sm text-financial-negative">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            autoFocus
            disabled={cargando}
            onClick={onCancelar}
          >
            {textoCancelar}
          </Button>
          <Button
            type="button"
            variant="danger"
            fullWidth
            loading={cargando}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
