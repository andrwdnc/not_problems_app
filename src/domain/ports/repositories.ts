import type {
  Accion,
  Aportacion,
  Gasto,
  Mes,
  MovimientoAuditoria,
  Usuario,
} from '../entities';

/**
 * Puertos de la capa de dominio (DIP): contratos de persistencia que la capa de
 * infraestructura debe implementar. Las Server Actions, queries y páginas
 * dependen de estas abstracciones, nunca de los repositorios concretos.
 */

export interface CrearMesInput {
  anio: number;
  mes: number;
  porcentaje?: number | null;
}

export interface ResultadoFindOrCreate {
  mes: Mes;
  /** true si este llamador creó el mes; false si ya existía. */
  creado: boolean;
}

export interface MesRepository {
  findById(id: string): Promise<Mes | null>;
  findByAnioAndMes(anio: number, mes: number): Promise<Mes | null>;
  getMesesAnteriores(limit: number): Promise<Mes[]>;
  create(data: CrearMesInput): Promise<Mes>;
  findOrCreate(data: CrearMesInput): Promise<ResultadoFindOrCreate>;
  update(id: string, data: Partial<Mes>): Promise<Mes>;
  /**
   * Fija el porcentaje del mes solo si aún no estaba definido (evita que una
   * carrera concurrente lo sobrescriba). Devuelve null si ya estaba fijado.
   */
  fijarPorcentajeSiNulo(
    id: string,
    porcentaje: number,
    fijadoPor: string,
  ): Promise<Mes | null>;
  /**
   * Fija el presupuesto de gastos del mes solo si aún no estaba definido.
   * Mismo contrato atómico que `fijarPorcentajeSiNulo`.
   */
  fijarPresupuestoSiNulo(
    id: string,
    presupuesto: number,
    fijadoPor: string,
  ): Promise<Mes | null>;
}

export interface AportacionRepository {
  findById(id: string): Promise<Aportacion | null>;
  findByMesAndUsuario(mesId: string, usuarioId: string): Promise<Aportacion | null>;
  findByMes(mesId: string): Promise<Aportacion[]>;
  findByMesIds(mesIds: string[]): Promise<Aportacion[]>;
  create(data: Omit<Aportacion, 'id' | 'fechaRegistro'>): Promise<Aportacion>;
  /**
   * Crea la aportación solo si aún no existe el par (mes, usuario). Ante una
   * carrera concurrente reaprovecha la fila ganadora en lugar de lanzar una
   * violación del índice único. Devuelve siempre la fila vigente.
   */
  createSiNoExiste(data: Omit<Aportacion, 'id' | 'fechaRegistro'>): Promise<Aportacion>;
  update(id: string, data: Partial<Aportacion>): Promise<Aportacion>;
  delete(id: string): Promise<void>;
  /**
   * Fija el importe aportado solo si aún no estaba calculado (evita que una
   * carrera concurrente sobrescriba un valor ya fijado). Devuelve null si ya
   * existía un valor (inaplicable).
   */
  fijarImporteAportadoSiNulo(id: string, importeAportado: number): Promise<Aportacion | null>;
}

export interface GastoRepository {
  findById(id: string): Promise<Gasto | null>;
  findByMes(mesId: string): Promise<Gasto[]>;
  findByMesIds(mesIds: string[]): Promise<Gasto[]>;
  create(data: Omit<Gasto, 'id' | 'fechaCreacion'>): Promise<Gasto>;
  update(id: string, data: Partial<Gasto>): Promise<Gasto>;
  delete(id: string): Promise<void>;
  findRecurrentesDeMes(mesId: string): Promise<Gasto[]>;
}

export interface HistoricoRepository {
  registrar(data: Omit<MovimientoAuditoria, 'id' | 'fecha'>): Promise<MovimientoAuditoria>;
}

/** Credenciales internas de autenticación; nunca deben salir del servidor. */
export interface UsuarioConCredenciales extends Usuario {
  passwordHash: string;
}

/** Datos necesarios para dar de alta un usuario. */
export interface NuevoUsuario {
  username: string;
  passwordHash: string;
}

export interface UsuarioRepository {
  /** Devuelve el usuario público (sin credenciales). */
  findById(id: string): Promise<Usuario | null>;
  /** Solo para autenticación: incluye el hash de la contraseña. */
  findByUsername(username: string): Promise<UsuarioConCredenciales | null>;
  findAll(): Promise<Usuario[]>;
  count(): Promise<number>;
  create(data: NuevoUsuario): Promise<Usuario>;
}

export type { Accion };