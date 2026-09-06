export { AportacionDrizzleRepository } from './AportacionRepository';
export type { AportacionRepository } from './AportacionRepository';
export { MesDrizzleRepository } from './MesRepository';
export type { CrearMesInput, MesRepository, ResultadoFindOrCreate } from './MesRepository';
export { GastoDrizzleRepository } from './GastoRepository';
export type { GastoRepository } from './GastoRepository';
export { HistoricoDrizzleRepository } from './HistoricoRepository';
export type { HistoricoRepository } from './HistoricoRepository';
export { UsuarioDrizzleRepository } from './UsuarioRepository';
export type { Usuario, UsuarioRepository } from './UsuarioRepository';
// Entidades canónicas del dominio: re-exportadas aquí para que los
// consumidores de la capa de infraestructura no dependan de duplicados.
export type {
  Mes,
  Aportacion,
  Gasto,
  MovimientoAuditoria,
  Accion,
} from '@/domain/entities';