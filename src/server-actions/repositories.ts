// Compatibilidad: las server actions consumen los repositorios a través de este
// barrel, que simplemente re-exporta las instancias de la composición de raíz.
export {
  mesRepository,
  aportacionRepository,
  gastoRepository,
  gastoIndividualRepository,
  historicoRepository,
  usuarioRepository,
  gastoAnualRepository,
  gastoAnualIndividualRepository,
} from '@/infrastructure/repositories/instances';