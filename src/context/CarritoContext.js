import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {
  agregarLineaCarrito,
  calcularTotal,
  obtenerTipoProducto,
} from '../domain/venta';

const CarritoContext = createContext(null);

export function CarritoProvider({children}) {
  const [items, setItems] = useState([]);
  const siguienteLinea = useRef(0);

  // Esta es la única entrada para crear una línea de venta. `valorVenta` es
  // cantidad de piezas, kg o importe según el tipo guardado en SQLite.
  const agregarProducto = useCallback((producto, valorVenta = 1) => {
    const valor = Number(valorVenta);
    if (!Number.isFinite(valor) || valor <= 0) return;
    siguienteLinea.current += 1;
    setItems(prev => agregarLineaCarrito(prev, producto, valor, `${producto.id}-${siguienteLinea.current}`));
  }, []);

  const cambiarCantidad = useCallback((id, cantidad) => {
    setItems(prev => {
      if (cantidad <= 0) {
        return prev.filter(it => it.id !== id);
      }
      return prev.map(it => {
        if (it.id !== id || obtenerTipoProducto(it) !== 'unidad') return it;
        const cantidadEntera = Math.floor(cantidad);
        if (cantidadEntera <= 0) return null;
        return {...it, cantidad: cantidadEntera, subtotal: it.precioUnitario * cantidadEntera};
      }).filter(Boolean);
    });
  }, []);

  const quitarProducto = useCallback(id => {
    setItems(prev => prev.filter(it => it.id !== id));
  }, []);

  const vaciarCarrito = useCallback(() => setItems([]), []);

  const total = useMemo(() => calcularTotal(items), [items]);
  const cantidadTotal = items.length;

  const value = useMemo(
    () => ({items, agregarProducto, cambiarCantidad, quitarProducto, vaciarCarrito, total, cantidadTotal}),
    [items, agregarProducto, cambiarCantidad, quitarProducto, vaciarCarrito, total, cantidadTotal],
  );

  return <CarritoContext.Provider value={value}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) {
    throw new Error('useCarrito debe usarse dentro de <CarritoProvider>');
  }
  return ctx;
}
