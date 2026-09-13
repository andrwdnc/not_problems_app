export { AportacionDrizzleRepository } from './AportacionRepository';
export { MesDrizzleRepository } from './MesRepository';
export { GastoDrizzleRepository } from './GastoRepository';
export { HistoricoDrizzleRepository } from './HistoricoRepository';
export { UsuarioDrizzleRepository } from './UsuarioRepository';
export { ProvisionDrizzleRepository } from './ProvisionRepository';

// Puertos (interfaces) declarados en la capa de dominio (DIP): la
// infraestructura implementa estos contratos, no los define.
export type {
  AportacionRepository,
  CrearMesInput,
  GastoRepository,
  HistoricoRepository,
  MesRepository,
  NuevoUsuario,
  ResultadoFindOrCreate,
  UsuarioConCredenciales,
  UsuarioRepository,
  CrearProvisionInput,
  ProvisionRepository,
} from '@/domain/ports/repositories';

// Entidades canónicas del dominio: re-exportadas aquí para que los
// consumidores de la capa de infraestructura no dependan de duplicados.
export type {
  Aportacion,
  Gasto,
  Mes,
  MovimientoAuditoria,
  Usuario,
  Provision,
  Accion,
} from '@/domain/entities';