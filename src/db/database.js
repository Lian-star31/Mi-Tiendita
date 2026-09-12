import SQLite from 'react-native-sqlite-storage';
import {PRODUCTOS_SEED} from './seedData';
import {
  normalizarClaveProducto,
  normalizarNombreProducto,
} from '../utils/normalizarNombre';

SQLite.enablePromise(true);
SQLite.DEBUG(false);

const DATABASE_NAME = 'mitienda.db';
const TIPOS_PRODUCTO = new Set(['unidad', 'peso', 'importe']);
let dbInstance = null;

function validarTipoProducto(tipo) {
  if (!TIPOS_PRODUCTO.has(tipo)) {
    throw new Error(`Tipo de producto inválido: ${tipo}`);
  }
  return tipo;
}

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
      stock         INTEGER NOT NULL DEFAULT 0,
      tipo          TEXT NOT NULL DEFAULT 'unidad' CHECK (tipo IN ('unidad', 'peso', 'importe')),
      nombre_clave  TEXT
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

  // Migraciones aditivas para instalaciones existentes.
  try {
    await db.executeSql(`ALTER TABLE PRODUCTOS ADD COLUMN tipo TEXT NOT NULL DEFAULT 'unidad';`);
  } catch (e) {
    // La columna ya existe.
  }
  try {
    await db.executeSql(`ALTER TABLE PRODUCTOS ADD COLUMN nombre_clave TEXT;`);
  } catch (e) {
    // La columna ya existe.
  }

  // Corrige productos legado únicamente cuando su nombre canónico es uno de
  // los tipos conocidos. Nunca cambia un tipo que el usuario ya seleccionó.
  const tiposLegado = {
    jamon: 'importe',
    huevo: 'importe',
    queso: 'importe',
    azucar: 'peso',
  };
  const [productos] = await db.executeSql('SELECT * FROM PRODUCTOS ORDER BY id;');
  const filas = [];
  for (let i = 0; i < productos.rows.length; i++) filas.push(productos.rows.item(i));

  for (const producto of filas) {
    const clave = normalizarClaveProducto(producto.nombre);
    const tipo = tiposLegado[clave];
    const tipoActual = TIPOS_PRODUCTO.has(producto.tipo) ? producto.tipo : 'unidad';
    const tipoFinal = tipoActual === 'unidad' && tipo ? tipo : tipoActual;
    if (producto.tipo !== tipoFinal) {
      await db.executeSql('UPDATE PRODUCTOS SET tipo = ? WHERE id = ?;', [tipoFinal, producto.id]);
    }
    if (producto.nombre_clave !== clave) {
      await db.executeSql('UPDATE PRODUCTOS SET nombre_clave = ? WHERE id = ?;', [clave, producto.id]);
    }
  }

  await consolidarDuplicadosSinCodigo(db);
  await db.executeSql(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_nombre_sin_codigo
     ON PRODUCTOS (nombre_clave) WHERE codigo_barras IS NULL;`,
  );
}

function tipoConservado(productos) {
  const variable = productos.find(producto => producto.tipo === 'peso' || producto.tipo === 'importe');
  return variable?.tipo || 'unidad';
}

function productoPrincipal(productos) {
  return [...productos].sort((a, b) => {
    const tipoA = a.tipo === 'peso' || a.tipo === 'importe' ? 1 : 0;
    const tipoB = b.tipo === 'peso' || b.tipo === 'importe' ? 1 : 0;
    return tipoB - tipoA || a.id - b.id;
  })[0];
}

async function consolidarDuplicadosSinCodigo(db) {
  const [result] = await db.executeSql(
    `SELECT * FROM PRODUCTOS WHERE codigo_barras IS NULL ORDER BY id;`,
  );
  const grupos = new Map();
  for (let i = 0; i < result.rows.length; i++) {
    const producto = result.rows.item(i);
    const clave = normalizarClaveProducto(producto.nombre);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(producto);
  }

  await db.executeSql('BEGIN TRANSACTION;');
  try {
    for (const [clave, productos] of grupos) {
      if (productos.length === 1) {
        await db.executeSql('UPDATE PRODUCTOS SET nombre_clave = ? WHERE id = ?;', [clave, productos[0].id]);
        continue;
      }

      const principal = productoPrincipal(productos);
      const nombre = clave === 'huevo' ? 'Huevo' : normalizarNombreProducto(principal.nombre);
      const tipo = tipoConservado(productos);
      const referencia = productos.find(producto => producto.tipo === tipo)?.precio ?? principal.precio;
      await db.executeSql(
        `UPDATE PRODUCTOS SET nombre = ?, precio = ?, tipo = ?, nombre_clave = ? WHERE id = ?;`,
        [nombre, Number(referencia) || 0, tipo, clave, principal.id],
      );

      for (const producto of productos) {
        if (producto.id !== principal.id) {
          await db.executeSql('DELETE FROM PRODUCTOS WHERE id = ?;', [producto.id]);
        }
      }
    }
    await db.executeSql('COMMIT;');
  } catch (e) {
    await db.executeSql('ROLLBACK;');
    throw e;
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

  const productos = await listarProductos(db);
  const claveBusqueda = normalizarClaveProducto(termino);
  const exactos = productos.filter(producto => normalizarClaveProducto(producto.nombre) === claveBusqueda);
  if (exactos.length === 1) return {tipo: 'unico', producto: exactos[0]};
  if (exactos.length > 1) return {tipo: 'varios', opciones: exactos.slice(0, 15)};

  const opciones = productos
    .filter(producto => normalizarClaveProducto(producto.nombre).includes(claveBusqueda))
    .slice(0, 15);

  if (opciones.length === 1) return {tipo: 'unico', producto: opciones[0]};
  if (opciones.length > 1) return {tipo: 'varios', opciones};
  return {tipo: 'ninguno'};
}

// Busca un producto por nombre exacto (sin importar mayúsculas/minúsculas).
// Se usa para evitar crear duplicados al dar de alta un producto sin código.
export async function buscarProductoPorNombreExacto(nombre) {
  const db = await getDBConnection();
  const termino = normalizarClaveProducto(nombre);
  const [result] = await db.executeSql(
    'SELECT * FROM PRODUCTOS WHERE codigo_barras IS NULL AND nombre_clave = ? LIMIT 1;',
    [termino],
  );
  if (result.rows.length > 0) return result.rows.item(0);
  return null;
}

// Busca productos por nombre (varias coincidencias) para autocompletar
// mientras se escribe, por ejemplo al agregar un producto sin código
// directamente al carrito.
export async function buscarProductosPorNombre(texto) {
  const db = await getDBConnection();
  const claveBusqueda = normalizarClaveProducto(texto);
  const productos = await listarProductos(db);
  return productos
    .filter(producto => normalizarClaveProducto(producto.nombre).includes(claveBusqueda))
    .slice(0, 20);
}

async function listarProductos(db) {
  const [result] = await db.executeSql('SELECT * FROM PRODUCTOS ORDER BY nombre, id;');
  const productos = [];
  for (let i = 0; i < result.rows.length; i++) productos.push(result.rows.item(i));
  return productos;
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
  const nombreGuardado = normalizarNombreProducto(nombre);
  const clave = normalizarClaveProducto(nombreGuardado);
  await db.executeSql(
    `INSERT INTO PRODUCTOS (codigo_barras, nombre, precio, stock, tipo, nombre_clave) VALUES (?, ?, ?, 0, 'unidad', ?)
     ON CONFLICT(codigo_barras) DO UPDATE SET nombre = excluded.nombre, precio = excluded.precio, nombre_clave = excluded.nombre_clave;`,
    [String(codigo).trim(), nombreGuardado, Number(precio), clave],
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
  validarTipoProducto(tipo);
  const nombreGuardado = normalizarNombreProducto(nombre);
  const clave = normalizarClaveProducto(nombreGuardado);
  const existente = await buscarProductoPorNombreExacto(nombreGuardado);
  if (existente) {
    await actualizarTipoProducto(existente.id, {precio, tipo});
    return getProductoPorId(existente.id);
  }
  const [result] = await db.executeSql(
    `INSERT INTO PRODUCTOS (codigo_barras, nombre, precio, stock, tipo, nombre_clave) VALUES (NULL, ?, ?, 0, ?, ?);`,
    [nombreGuardado, Number(precio) || 0, tipo, clave],
  );
  return getProductoPorId(result.insertId);
}

// Cambia el tipo de venta y precio de referencia de un producto que ya
// existe (ej. uno guardado antes como 'unidad' y ahora se quiere vender
// por peso o por importe). No toca el código de barras ni el nombre.
export async function actualizarTipoProducto(id, {precio, tipo}) {
  const db = await getDBConnection();
  validarTipoProducto(tipo);
  await db.executeSql(
    'UPDATE PRODUCTOS SET precio = ?, tipo = ? WHERE id = ?;',
    [Number(precio) || 0, tipo, id],
  );
  return getProductoPorId(id);
}

async function getProductoPorId(id) {
  const db = await getDBConnection();
  const [result] = await db.executeSql('SELECT * FROM PRODUCTOS WHERE id = ? LIMIT 1;', [id]);
  return result.rows.length > 0 ? result.rows.item(0) : null;
}
