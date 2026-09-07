import { describe, it, expect } from 'vitest';
import { ventanaEdicionGastos, ventanaDeMes } from './VentanaEdicionGastos';

describe('ventanaEdicionGastos', () => {
  describe('mes actual', () => {
    it('permite editar y eliminar cualquier día del mes', () => {
      const hoy = new Date(2026, 7, 28); // 28 agosto 2026
      const permisos = ventanaEdicionGastos({
        hoy,
        anioGasto: 2026,
        mesGasto: 8,
      });
      expect(permisos.estado).toBe('editable');
      expect(permisos.puedeCrear).toBe(true);
      expect(permisos.puedeEditar).toBe(true);
      expect(permisos.puedeEliminar).toBe(true);
    });
  });

  describe('mes anterior', () => {
    it('permite editar y eliminar hasta el día 5 inclusive', () => {
      const hoy = new Date(2026, 7, 5); // 5 agosto 2026
      const permisos = ventanaEdicionGastos({
        hoy,
        anioGasto: 2026,
        mesGasto: 7,
      });
      expect(permisos.estado).toBe('gracia');
      expect(permisos.puedeEditar).toBe(true);
      expect(permisos.puedeEliminar).toBe(true);
    });

    it('a partir del día 6 solo permite altas nuevas', () => {
      const hoy = new Date(2026, 7, 6); // 6 agosto 2026
      const permisos = ventanaEdicionGastos({
        hoy,
        anioGasto: 2026,
        mesGasto: 7,
      });
      expect(permisos.estado).toBe('solo_altas');
      expect(permisos.puedeCrear).toBe(true);
      expect(permisos.puedeEditar).toBe(false);
      expect(permisos.puedeEliminar).toBe(false);
    });
  });

  describe('hace 2 meses o más', () => {
    it('queda completamente congelado', () => {
      const hoy = new Date(2026, 7, 15); // 15 agosto 2026
      const permisos = ventanaEdicionGastos({
        hoy,
        anioGasto: 2026,
        mesGasto: 6,
      });
      expect(permisos.estado).toBe('congelado');
      expect(permisos.puedeCrear).toBe(false);
      expect(permisos.puedeEditar).toBe(false);
      expect(permisos.puedeEliminar).toBe(false);
    });

    it('maneja el cambio de año correctamente', () => {
      const hoy = new Date(2026, 0, 15); // 15 enero 2026
      const permisos = ventanaEdicionGastos({
        hoy,
        anioGasto: 2025,
        mesGasto: 11,
      });
      expect(permisos.estado).toBe('congelado');
    });
  });

  describe('cambio de año: mes anterior en enero', () => {
    it('diciembre es el mes anterior cuando estamos en enero', () => {
      const hoy = new Date(2026, 0, 3); // 3 enero 2026
      const permisos = ventanaEdicionGastos({
        hoy,
        anioGasto: 2025,
        mesGasto: 12,
      });
      expect(permisos.estado).toBe('gracia');
      expect(permisos.puedeEditar).toBe(true);
    });
  });

  describe('gasto a futuro', () => {
    it('queda congelado (no es un mes pasado válido para la ventana)', () => {
      const hoy = new Date(2026, 7, 15); // 15 agosto 2026
      const permisos = ventanaEdicionGastos({
        hoy,
        anioGasto: 2026,
        mesGasto: 9,
      });
      expect(permisos.estado).toBe('congelado');
      expect(permisos.puedeCrear).toBe(false);
      expect(permisos.puedeEditar).toBe(false);
      expect(permisos.puedeEliminar).toBe(false);
    });

    it('el día 5 del mes actual sigue siendo editable aunque sea el "día tope"', () => {
      const hoy = new Date(2026, 7, 5); // 5 agosto 2026
      const permisos = ventanaEdicionGastos({
        hoy,
        anioGasto: 2026,
        mesGasto: 8,
      });
      expect(permisos.estado).toBe('editable');
    });
  });
});

describe('ventanaDeMes', () => {
  it('marca mes actual como editable', () => {
    const hoy = new Date(2026, 7, 20);
    const permisos = ventanaDeMes(hoy, 2026, 8);
    expect(permisos.estado).toBe('editable');
  });

  it('marca mes cerrado anterior como solo_altas pasada la gracia', () => {
    const hoy = new Date(2026, 7, 10);
    const permisos = ventanaDeMes(hoy, 2026, 7);
    expect(permisos.estado).toBe('solo_altas');
  });
});