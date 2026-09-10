import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

const CarritoContext = createContext(null);

export function CarritoProvider({children}) {
  const [items, setItems] = useState([]);

  // cantidadInicial permite agregar una cantidad específica de una sola vez
  // (ej. 0.750 kg de un producto por peso) en vez de solo sumar 1 unidad.
  // Si no se pasa, se comporta exactamente igual que antes (+1).
  const agregarProducto = useCallback((producto, cantidadInicial = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(it => it.id === producto.id);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = {...copia[idx], cantidad: copia[idx].cantidad + cantidadInicial};
        return copia;
      }
      return [
        ...prev,
        {
          id: producto.id,
          codigo_barras: producto.codigo_barras,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          cantidad: cantidadInicial,
          tipo: producto.tipo || 'unidad',
        },
      ];
    });
  }, []);

  const cambiarCantidad = useCallback((id, cantidad) => {
    setItems(prev => {
      if (cantidad <= 0) {
        return prev.filter(it => it.id !== id);
      }
      return prev.map(it => (it.id === id ? {...it, cantidad} : it));
    });
  }, []);

  const vaciarCarrito = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => items.reduce((suma, it) => suma + it.precio * it.cantidad, 0),
    [items],
  );
  const cantidadTotal = useMemo(
    () => items.reduce((suma, it) => suma + it.cantidad, 0),
    [items],
  );

  const value = useMemo(
    () => ({items, agregarProducto, cambiarCantidad, vaciarCarrito, total, cantidadTotal}),
    [items, agregarProducto, cambiarCantidad, vaciarCarrito, total, cantidadTotal],
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
