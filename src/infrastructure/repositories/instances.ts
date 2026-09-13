import {
  AportacionDrizzleRepository,
  GastoDrizzleRepository,
  HistoricoDrizzleRepository,
  MesDrizzleRepository,
  ProvisionDrizzleRepository,
  UsuarioDrizzleRepository,
} from '.';

/**
 * Composición de raíz (Dependency Injection container): instancias singleton de
 * los repositorios para toda la aplicación. Vive en infraestructura para que
 * ninguna capa superior (server-actions, server/auth) dependa de otra a la hora
 * de construirlos (DIP). La conexión se abre lazy con el primer uso (getDb()).
 */
export const mesRepository = new MesDrizzleRepository();
export const aportacionRepository = new AportacionDrizzleRepository();
export const gastoRepository = new GastoDrizzleRepository();
export const historicoRepository = new HistoricoDrizzleRepository();
export const usuarioRepository = new UsuarioDrizzleRepository();
export const provisionRepository = new ProvisionDrizzleRepository();