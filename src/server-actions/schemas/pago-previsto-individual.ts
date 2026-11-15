import { z } from 'zod';
import { individualErrores } from '@/literals';
import {
  pagoPrevistoSchema as altaCompartida,
  editarPagoPrevistoSchema as editarCompartido,
  eliminarPagoPrevistoSchema as eliminarCompartido,
  marcarPagadoPagoPrevistoSchema as pagarCompartido,
} from './pago-previsto';

export const pagoPrevistoIndividualSchema = altaCompartida.strict(
  individualErrores.campoNoPermitido,
);

export const editarPagoPrevistoIndividualSchema =
  editarCompartido.strict(individualErrores.campoNoPermitido);

export const eliminarPagoPrevistoIndividualSchema =
  eliminarCompartido.strict(individualErrores.campoNoPermitido);

export const marcarPagadoPagoPrevistoIndividualSchema =
  pagarCompartido.strict(individualErrores.campoNoPermitido);
