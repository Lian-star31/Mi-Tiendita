import SQLite from 'react-native-sqlite-storage';
import {PRODUCTOS_SEED} from './seedData';

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
    // Insertar los 1,805 productos del catálogo en lotes de 100
    const batchSize = 100;
    for (let i = 0; i < PRODUCTOS_SEED.length; i += batchSize) {
      const batch = PRODUCTOS_SEED.slice(i, i + batchSize);
      for (const p of batch) {
        await db.executeSql(
          `INSERT OR IGNORE INTO PRODUCTOS (nombre, precio) VALUES (?, ?);`,
          [p.nombre, p.precio],
        );
      }
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

export async function buscarProducto(texto) {
  const db = await getDBConnection();
  const termino = String(texto).trim();
  const [result] = await db.executeSql(
    `SELECT * FROM PRODUCTOS WHERE codigo_barras = ? OR nombre LIKE ? LIMIT 1;`,
    [termino, `%${termino}%`],
  );
  if (result.rows.length > 0) return result.rows.item(0);
  return null;
}

// Busca productos por nombre (para autocompletar al agregar uno nuevo)
export async function buscarProductosPorNombre(texto) {
  const db = await getDBConnection();
  const [result] = await db.executeSql(
    `SELECT * FROM PRODUCTOS WHERE nombre LIKE ? ORDER BY nombre LIMIT 20;`,
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

// Vincula un código de barras a un producto existente (por id)
export async function vincularBarcode(id, codigoBarras) {
  const db = await getDBConnection();
  const [result] = await db.executeSql(
    'UPDATE PRODUCTOS SET codigo_barras = ? WHERE id = ?;',
    [String(codigoBarras).trim(), id],
  );
  return result.rowsAffected > 0;
}

// Inserta un producto nuevo con barcode, nombre y precio
export async function insertarProducto({codigo, nombre, precio}) {
  const db = await getDBConnection();
  await db.executeSql(
    `INSERT INTO PRODUCTOS (codigo_barras, nombre, precio, stock) VALUES (?, ?, ?, 0)
     ON CONFLICT(codigo_barras) DO UPDATE SET nombre = excluded.nombre, precio = excluded.precio;`,
    [String(codigo).trim(), nombre, Number(precio)],
  );
}

export async function upsertProducto({codigo, nombre, precio, stock}) {
  const db = await getDBConnection();
  await db.executeSql(
    `INSERT INTO PRODUCTOS (codigo_barras, nombre, precio, stock) VALUES (?, ?, ?, ?)
     ON CONFLICT(codigo_barras) DO UPDATE SET nombre = excluded.nombre, precio = excluded.precio, stock = excluded.stock;`,
    [String(codigo).trim(), nombre, Number(precio), Number(stock)],
  );
}
