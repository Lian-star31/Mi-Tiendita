import SQLite from 'react-native-sqlite-storage';
import {PRODUCTOS_SEED} from './seedData';
import {normalizarNombreProducto} from '../utils/normalizarNombre';

SQLite.enablePromise(true);
SQLite.DEBUG(false);

const DATABASE_NAME = 'mitienda.db';
let dbInstance = null;

export async function getDBConnection() {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabase({name: DATABASE_NAME, location: 'default'});
  return dbInstance;
}

export async function initDatabase() {
  const db = await getDBConnection();

  // codigo_barras es nullable para productos cargados del catálogo sin escanear
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS PRODUCTOS (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_barras TEXT UNIQUE,
      nombre        TEXT NOT NULL,
      precio        REAL NOT NULL DEFAULT 0,
      stock         INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.executeSql(`
    CREATE INDEX IF NOT EXISTS idx_codigo_barras
    ON PRODUCTOS (codigo_barras);
  `);

  const [countResult] = await db.executeSql('SELECT COUNT(*) AS total FROM PRODUCTOS;');
  const total = countResult.rows.item(0).total;

  if (total === 0) {
    for (const p of PRODUCTOS_SEED) {
      const codigo = p.codigo && p.codigo.length > 0 ? p.codigo : null;
      await db.executeSql(
        `INSERT OR IGNORE INTO PRODUCTOS (codigo_barras, nombre, precio) VALUES (?, ?, ?);`,
        [codigo, p.nombre, p.precio],
      );
    }
  }

  // Corrige códigos de 11 dígitos que perdieron el cero inicial al leer el
  // Excel original (UPC-A real son 12 dígitos). Afecta instalaciones que ya
  // tenían datos guardados antes de este arreglo; es seguro repetirla en cada
  // arranque porque una vez corregido el código deja de tener 11 dígitos.
  await db.executeSql(
    `UPDATE PRODUCTOS SET codigo_barras = '0' || codigo_barras
     WHERE LENGTH(codigo_barras) = 11;`,
  );

  // Tipo de venta del producto: 'unidad' (precio fijo, como hasta ahora),
  // 'peso' (precio por kg) o 'importe' (sin precio fijo, se cobra el monto
  // que pida el cliente). Migración aditiva seguro para instalaciones que ya
  // tenían datos: todo lo existente queda como 'unidad' (su comportamiento
  // de siempre) y no se pierde ni modifica ningún dato. Si la columna ya
  // existe (arranques posteriores al primero) SQLite lanza un error que se
  // ignora a propósito.
  try {
    await db.executeSql(
      `ALTER TABLE PRODUCTOS ADD COLUMN tipo TEXT NOT NULL DEFAULT 'unidad';`,
    );
  } catch (e) {
    // La columna ya existe; no hay nada que hacer.
  }

  // Corrección de tipos conocidos: productos que la tienda vende por importe
  // o por peso, pero que quedaron como 'unidad' por la migración inicial.
  // Solo actualiza los que siguen en 'unidad' para no pisar cambios manuales.
  const tiposLegado = {
    Jamón: 'importe',
    Huevo: 'importe',
    Queso: 'importe',
    Azúcar: 'peso',
  };
  const [productosLegado] = await db.executeSql(
    `SELECT id, nombre, tipo FROM PRODUCTOS WHERE tipo = 'unidad' OR tipo IS NULL;`,
  );
  for (let i = 0; i < productosLegado.rows.length; i++) {
    const producto = productosLegado.rows.item(i);
    const nombreCanonico = normalizarNombreProducto(producto.nombre);
    const tipo = tiposLegado[nombreCanonico];
    if (tipo) {
      await db.executeSql('UPDATE PRODUCTOS SET tipo = ? WHERE id = ?;', [tipo, producto.id]);
    }
  }
}

export async function getProductoPorCodigo(codigo) {
  const db = await getDBConnection();
  const [result] = await db.executeSql(
    'SELECT * FROM PRODUCTOS WHERE codigo_barras = ? LIMIT 1;',
    [String(codigo).trim()],
  );
  if (result.rows.length > 0) return result.rows.item(0);
  return null;
}

// Busca un producto por código o nombre para la búsqueda manual.
// Prioriza siempre una coincidencia exacta (código o nombre) sobre
// coincidencias parciales. Si el texto es ambiguo (varias coincidencias
// parciales y ninguna exacta), devuelve la lista para que el usuario elija
// en vez de adivinar cuál quiso decir.
// Devuelve: {tipo: 'unico', producto} | {tipo: 'varios', opciones} | {tipo: 'ninguno'}
export async function buscarProducto(texto) {
  const db = await getDBConnection();
  const termino = String(texto).trim();

  const [porCodigo] = await db.executeSql(
    'SELECT * FROM PRODUCTOS WHERE codigo_barras = ? LIMIT 1;',
    [termino],
  );
  if (porCodigo.rows.length > 0) {
    return {tipo: 'unico', producto: porCodigo.rows.item(0)};
  }

  const [porNombreExacto] = await db.executeSql(
    'SELECT * FROM PRODUCTOS WHERE nombre = ? COLLATE NOCASE LIMIT 1;',
    [termino],
  );
  if (porNombreExacto.rows.length > 0) {
    return {tipo: 'unico', producto: porNombreExacto.rows.item(0)};
  }

  const [parciales] = await db.executeSql(
    'SELECT * FROM PRODUCTOS WHERE nombre LIKE ? ORDER BY nombre LIMIT 15;',
    [`%${termino}%`],
  );
  const opciones = [];
  for (let i = 0; i < parciales.rows.length; i++) {
    opciones.push(parciales.rows.item(i));
  }

  if (opciones.length === 1) return {tipo: 'unico', producto: opciones[0]};
  if (opciones.length > 1) return {tipo: 'varios', opciones};
  return {tipo: 'ninguno'};
}

// Busca un producto por nombre exacto (sin importar mayúsculas/minúsculas).
// Se usa para evitar crear duplicados al dar de alta un producto sin código.
export async function buscarProductoPorNombreExacto(nombre) {
  const db = await getDBConnection();
  const termino = normalizarNombreProducto(nombre);
  const [result] = await db.executeSql(
    'SELECT * FROM PRODUCTOS ORDER BY id;',
  );
  for (let i = 0; i < result.rows.length; i++) {
    const producto = result.rows.item(i);
    if (normalizarNombreProducto(producto.nombre) === termino) return producto;
  }
  return null;
}

// Busca productos por nombre (varias coincidencias) para autocompletar
// mientras se escribe, por ejemplo al agregar un producto sin código
// directamente al carrito.
export async function buscarProductosPorNombre(texto) {
  const db = await getDBConnection();
  const [result] = await db.executeSql(
    'SELECT * FROM PRODUCTOS WHERE nombre LIKE ? ORDER BY nombre LIMIT 20;',
    [`%${String(texto).trim()}%`],
  );
  const items = [];
  for (let i = 0; i < result.rows.length; i++) {
    items.push(result.rows.item(i));
  }
  return items;
}

export async function actualizarPrecio(id, nuevoPrecio) {
  const db = await getDBConnection();
  const [result] = await db.executeSql(
    'UPDATE PRODUCTOS SET precio = ? WHERE id = ?;',
    [Number(nuevoPrecio), id],
  );
  return result.rowsAffected > 0;
}

// Inserta un producto nuevo con barcode, nombre y precio.
// Devuelve el producto ya guardado (con id) para poder agregarlo al carrito
// o editarlo después.
export async function insertarProducto({codigo, nombre, precio}) {
  const db = await getDBConnection();
  await db.executeSql(
    `INSERT INTO PRODUCTOS (codigo_barras, nombre, precio, stock, tipo) VALUES (?, ?, ?, 0, 'unidad')
     ON CONFLICT(codigo_barras) DO UPDATE SET nombre = excluded.nombre, precio = excluded.precio;`,
    [String(codigo).trim(), nombre, Number(precio)],
  );
  return getProductoPorCodigo(codigo);
}

// Crea un producto sin código de barras (ej. producto a granel).
// Se puede buscar luego por nombre y agregar al carrito sin escanear.
// tipo: 'unidad' (precio fijo, comportamiento de siempre), 'peso' (precio
// por kg, se vende capturando los kg) o 'importe' (precio por kg es solo
// de referencia; se vende capturando directamente el monto que pide el
// cliente, sin mostrar ni calcular el peso equivalente).
export async function crearProductoSinCodigo({nombre, precio, tipo = 'unidad'}) {
  const db = await getDBConnection();
  const [result] = await db.executeSql(
    `INSERT INTO PRODUCTOS (codigo_barras, nombre, precio, stock, tipo) VALUES (NULL, ?, ?, 0, ?);`,
    [nombre, Number(precio) || 0, tipo],
  );
  return {id: result.insertId, codigo_barras: null, nombre, precio: Number(precio) || 0, stock: 0, tipo};
}

// Cambia el tipo de venta y precio de referencia de un producto que ya
// existe (ej. uno guardado antes como 'unidad' y ahora se quiere vender
// por peso o por importe). No toca el código de barras ni el nombre.
export async function actualizarTipoProducto(id, {precio, tipo}) {
  const db = await getDBConnection();
  await db.executeSql(
    'UPDATE PRODUCTOS SET precio = ?, tipo = ? WHERE id = ?;',
    [Number(precio) || 0, tipo, id],
  );
  return {id, precio: Number(precio) || 0, tipo};
}
