export { AportacionDrizzleRepository } from './AportacionRepository';
export { MesDrizzleRepository } from './MesRepository';
export { GastoDrizzleRepository } from './GastoRepository';
export { GastoIndividualDrizzleRepository } from './GastoIndividualRepository';
export { PagoPrevistoDrizzleRepository } from './PagoPrevistoRepository';
export { PagoPrevistoIndividualDrizzleRepository } from './PagoPrevistoIndividualRepository';
export { HistoricoDrizzleRepository } from './HistoricoRepository';
export { UsuarioDrizzleRepository } from './UsuarioRepository';
export { AuthIntentosDrizzleRepository } from './AuthIntentosRepository';
export { PresupuestoIndividualDrizzleRepository } from './PresupuestoIndividualRepository';

// Puertos (interfaces) declarados en la capa de dominio (DIP): la
// infraestructura implementa estos contratos, no los define.
export type {
  AportacionRepository,
  AuthIntentosRepository,
  ContadorIntentos,
  CrearMesInput,
  GastoRepository,
  GastoIndividualRepository,
  HistoricoRepository,
  MesRepository,
  NuevoUsuario,
  ResultadoFindOrCreate,
  UsuarioConCredenciales,
  UsuarioRepository,
  PresupuestoIndividualRepository,
  CrearPagoPrevistoInput,
  PagoPrevistoRepository,
  PagoPrevistoIndividualRepository,
} from '@/domain/ports/repositories';

// Entidades canónicas del dominio: re-exportadas aquí para que los
// consumidores de la capa de infraestructura no dependan de duplicados.
export type {
  Aportacion,
  Gasto,
  GastoIndividual,
  Mes,
  MovimientoAuditoria,
  Usuario,
  PagoPrevisto,
  PresupuestoIndividual,
  Accion,
} from '@/domain/entities';