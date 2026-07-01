/**
 * database.js
 * -----------------------------------------------------------------------------
 * Capa de acceso a datos con SQLite local (100% offline).
 *
 * Usa react-native-sqlite-storage. Toda la información se guarda en el
 * dispositivo, por lo que la app funciona sin conexión a internet y los
 * datos persisten aunque se cierre la aplicación.
 *
 * Tabla PRODUCTOS:
 *   - id            INTEGER PRIMARY KEY AUTOINCREMENT
 *   - codigo_barras TEXT UNIQUE (con índice)
 *   - nombre        TEXT
 *   - precio        REAL
 *   - stock         INTEGER
 * -----------------------------------------------------------------------------
 */
import SQLite from 'react-native-sqlite-storage';

// Habilita el uso de Promesas para escribir código asíncrono limpio.
SQLite.enablePromise(true);
// Desactiva el debug ruidoso en producción.
SQLite.DEBUG(false);

const DATABASE_NAME = 'mitienda.db';

// Referencia única a la conexión de la base de datos (patrón singleton).
let dbInstance = null;

/**
 * Productos de ejemplo que se insertan la primera vez que se crea la BD.
 * Después el usuario puede editar precios y los cambios persisten.
 */
const PRODUCTOS_EJEMPLO = [
  {codigo: '7501234567890', nombre: 'Aceite', precio: 12.5, stock: 100},
  {codigo: '7501234567891', nombre: 'Azúcar', precio: 8.99, stock: 150},
  {codigo: '7501234567892', nombre: 'Café', precio: 18.0, stock: 75},
];

/**
 * Abre (o crea) la base de datos y garantiza que exista la tabla PRODUCTOS.
 * Devuelve la instancia de la base de datos.
 */
export async function getDBConnection() {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabase({
    name: DATABASE_NAME,
    location: 'default',
  });
  return dbInstance;
}

/**
 * Inicializa la base de datos:
 *   1. Crea la tabla PRODUCTOS si no existe.
 *   2. Crea el índice sobre codigo_barras.
 *   3. Inserta los productos de ejemplo solo si la tabla está vacía.
 *
 * Debe llamarse una vez al arrancar la app (ver App.js).
 */
export async function initDatabase() {
  const db = await getDBConnection();

  // Tabla principal de productos.
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS PRODUCTOS (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_barras TEXT NOT NULL UNIQUE,
      nombre        TEXT NOT NULL,
      precio        REAL NOT NULL DEFAULT 0,
      stock         INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Índice para búsquedas rápidas por código de barras.
  await db.executeSql(`
    CREATE INDEX IF NOT EXISTS idx_codigo_barras
    ON PRODUCTOS (codigo_barras);
  `);

  // Inserta datos de ejemplo únicamente si la tabla está vacía.
  const [countResult] = await db.executeSql(
    'SELECT COUNT(*) AS total FROM PRODUCTOS;',
  );
  const total = countResult.rows.item(0).total;

  if (total === 0) {
    for (const p of PRODUCTOS_EJEMPLO) {
      await db.executeSql(
        `INSERT INTO PRODUCTOS (codigo_barras, nombre, precio, stock)
         VALUES (?, ?, ?, ?);`,
        [p.codigo, p.nombre, p.precio, p.stock],
      );
    }
  }
}

/**
 * Busca un producto por su código de barras exacto.
 * @param {string} codigo - Código de barras a buscar.
 * @returns {Promise<Object|null>} Producto encontrado o null.
 */
export async function getProductoPorCodigo(codigo) {
  const db = await getDBConnection();
  const [result] = await db.executeSql(
    'SELECT * FROM PRODUCTOS WHERE codigo_barras = ? LIMIT 1;',
    [String(codigo).trim()],
  );
  if (result.rows.length > 0) {
    return result.rows.item(0);
  }
  return null;
}

/**
 * Búsqueda manual flexible: por código de barras o por nombre (parcial).
 * Útil para el campo de búsqueda manual de la pantalla de inicio.
 * @param {string} texto - Texto a buscar.
 * @returns {Promise<Object|null>} Primer producto coincidente o null.
 */
export async function buscarProducto(texto) {
  const db = await getDBConnection();
  const termino = String(texto).trim();
  const [result] = await db.executeSql(
    `SELECT * FROM PRODUCTOS
     WHERE codigo_barras = ? OR nombre LIKE ?
     LIMIT 1;`,
    [termino, `%${termino}%`],
  );
  if (result.rows.length > 0) {
    return result.rows.item(0);
  }
  return null;
}

/**
 * Actualiza el precio de un producto por su id.
 * @param {number} id - Identificador del producto.
 * @param {number} nuevoPrecio - Nuevo precio a guardar.
 * @returns {Promise<boolean>} true si se actualizó una fila.
 */
export async function actualizarPrecio(id, nuevoPrecio) {
  const db = await getDBConnection();
  const [result] = await db.executeSql(
    'UPDATE PRODUCTOS SET precio = ? WHERE id = ?;',
    [Number(nuevoPrecio), id],
  );
  return result.rowsAffected > 0;
}

/**
 * (Extra) Inserta o actualiza un producto por código de barras.
 * Permite dar de alta productos nuevos manteniendo el catálogo offline.
 */
export async function upsertProducto({codigo, nombre, precio, stock}) {
  const db = await getDBConnection();
  await db.executeSql(
    `INSERT INTO PRODUCTOS (codigo_barras, nombre, precio, stock)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(codigo_barras) DO UPDATE SET
       nombre = excluded.nombre,
       precio = excluded.precio,
       stock  = excluded.stock;`,
    [String(codigo).trim(), nombre, Number(precio), Number(stock)],
  );
}
