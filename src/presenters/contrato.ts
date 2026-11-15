import type { InicioResumenVista } from '@/vistas/inicio';
import type { DetalleMesVista } from '@/vistas/detalle-mes';
import type { VarianteCuenta } from '@/lib/cuenta';
import type {
  DatosUltimosGastos,
  VistaPantallaAportar,
  VistaPantallaFormGasto,
  VistaPantallaFormGastoAnual,
  VistaPantallaGastos,
  VistaPantallaHistorico,
} from '@/vistas/pantallas';

/**
 * CONTRATO de contexto de cuenta: el conjunto de vistas que necesitan las
 * pantallas de la app, resuelto por UNA de las dos áreas (conjunta o
 * individual).
 *
 * Antes, cada pantalla existía DOS veces en el árbol de rutas
 * (`app/(dashboard)/...` y `app/individual/...`) y el duplicado era el lugar
 * donde la paridad se rompía en silencio: con este contrato, las 9 rutas son
 * únicas y las dos áreas solo difieren en qué adaptador de esta tabla resuelve
 * cada vista. TypeScript fija la FORMA de cada vista (los tipos `Vista*`), así
 * que una variante no puede quedarse sin un dato que la otra sí enseña sin que
 * deje de compilar.
 *
 * Los métodos son async y devuelven las promesas directamente consumibles por
 * los componentes `Pantalla*` (que aceptan promesas para conservar streaming).
 * La única excepción es `vistaDetalleMes`: `PantallaDetalleMes` espera el
 * objeto ya construido, así que la página hace el `await`.
 */
export interface ContextoCuenta {
  /** Variante que este adaptador resuelve; alimenta `Pantalla*` y formularios. */
  readonly variante: VarianteCuenta;

  /* --- Pantalla de Inicio (dos secciones en streaming) --- */
  resumenInicio(): Promise<InicioResumenVista | null>;
  ultimosGastosInicio(): Promise<DatosUltimosGastos>;

  /* --- Listado de gastos --- */
  vistaGastos(): Promise<VistaPantallaGastos>;

  /* --- Aportar --- */
  vistaAportar(): Promise<VistaPantallaAportar>;

  /* --- Alta y edición de gasto mensual --- */
  vistaNuevoGasto(): Promise<VistaPantallaFormGasto>;
  vistaEditarGasto(gastoId: string): Promise<VistaPantallaFormGasto>;

  /* --- Alta y edición de gasto anual --- */
  vistaNuevoGastoAnual(): Promise<VistaPantallaFormGastoAnual>;
  vistaEditarGastoAnual(gastoAnualId: string): Promise<VistaPantallaFormGastoAnual>;

  /* --- Histórico y detalle de mes --- */
  vistaHistorico(): Promise<VistaPantallaHistorico>;
  vistaDetalleMes(mesId: string): Promise<DetalleMesVista>;
}
