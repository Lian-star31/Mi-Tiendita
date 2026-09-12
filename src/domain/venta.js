const TIPOS_VALIDOS = new Set(['unidad', 'peso', 'importe']);

export function obtenerTipoProducto(producto) {
  return TIPOS_VALIDOS.has(producto?.tipo) ? producto.tipo : 'unidad';
}

export function esProductoVariable(producto) {
  const tipo = obtenerTipoProducto(producto);
  return tipo === 'peso' || tipo === 'importe';
}

export function crearLineaCarrito(producto, valorVenta, idLinea) {
  const tipo = obtenerTipoProducto(producto);
  const precioReferencia = Number(producto.precio) || 0;
  const valor = Number(valorVenta);

  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error('El valor de venta debe ser mayor que cero.');
  }

  if (tipo === 'unidad') {
    const cantidad = Math.max(1, Math.floor(valor));
    return {
      id: idLinea,
      productoId: producto.id,
      codigo_barras: producto.codigo_barras,
      nombre: producto.nombre,
      tipo,
      cantidad,
      precioUnitario: precioReferencia,
      subtotal: precioReferencia * cantidad,
    };
  }

  if (tipo === 'peso') {
    return {
      id: idLinea,
      productoId: producto.id,
      codigo_barras: producto.codigo_barras,
      nombre: producto.nombre,
      tipo,
      cantidadKg: valor,
      precioPorKg: precioReferencia,
      subtotal: precioReferencia * valor,
    };
  }

  return {
    id: idLinea,
    productoId: producto.id,
    codigo_barras: producto.codigo_barras,
    nombre: producto.nombre,
    tipo,
    importe: valor,
    subtotal: valor,
  };
}

export function agregarLineaCarrito(lineas, producto, valorVenta, idLinea) {
  const tipo = obtenerTipoProducto(producto);

  // Dos capturas del mismo producto por pieza o por peso representan una
  // sola línea acumulada. Cada importe conserva su propio monto.
  if (tipo === 'importe') {
    return [...lineas, crearLineaCarrito(producto, valorVenta, idLinea)];
  }

  const productoId = producto.id;
  const indice = lineas.findIndex(linea => linea.productoId === productoId && linea.tipo === tipo);
  if (indice < 0) return [...lineas, crearLineaCarrito(producto, valorVenta, idLinea)];

  const copia = [...lineas];
  const actual = copia[indice];
  if (tipo === 'unidad') {
    const cantidad = actual.cantidad + Math.max(1, Math.floor(Number(valorVenta) || 1));
    copia[indice] = {...actual, cantidad, subtotal: actual.precioUnitario * cantidad};
  } else {
    const cantidadKg = actual.cantidadKg + Number(valorVenta);
    copia[indice] = {...actual, cantidadKg, subtotal: actual.precioPorKg * cantidadKg};
  }
  return copia;
}

export function calcularTotal(lineas) {
  return lineas.reduce((total, linea) => total + linea.subtotal, 0);
}
