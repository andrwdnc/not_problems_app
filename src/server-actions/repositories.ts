import {
  AportacionDrizzleRepository,
  MesDrizzleRepository,
  GastoDrizzleRepository,
  HistoricoDrizzleRepository,
  UsuarioDrizzleRepository,
} from '@/infrastructure/repositories';

export const mesRepository = new MesDrizzleRepository();
export const aportacionRepository = new AportacionDrizzleRepository();
export const gastoRepository = new GastoDrizzleRepository();
export const historicoRepository = new HistoricoDrizzleRepository();
export const usuarioRepository = new UsuarioDrizzleRepository();