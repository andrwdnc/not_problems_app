export type { Usuario, Mes, Aportacion, Gasto, MovimientoAuditoria, Categoria, Accion } from './entities';
export { CATEGORIAS, esCategoriaValida } from './value-objects/Categoria';
export type { Categoria as CategoriaValue } from './value-objects/Categoria';
export {
  formatearImporteMoneda,
  importeDesdeCadena,
  esImporteValido,
} from './value-objects/ImporteMoneda';
export { validarPorcentaje } from './value-objects/Porcentaje';
export {
  calcularImporteAportado,
  calcularTotalCuentaConjunta,
} from './rules/CalculadoraAportacion';
export {
  ventanaEdicionGastos,
  ventanaDeMes,
} from './rules/VentanaEdicionGastos';
export type { EstadoEdicion, PermisosEdicion } from './rules/VentanaEdicionGastos';