/**
 * Normaliza el nombre de un producto al registrarlo: corrige mayúsculas
 * inconsistentes y acentos faltantes evidentes en palabras comunes de
 * abarrotes, sin tocar números, códigos ni precios (esta función solo
 * recibe y devuelve texto de nombre).
 */
const DICCIONARIO = {
  jamon: 'Jamón', azucar: 'Azúcar', cafe: 'Café', platano: 'Plátano',
  platanos: 'Plátanos', limon: 'Limón', limones: 'Limones', sandia: 'Sandía',
  maiz: 'Maíz', jabon: 'Jabón', camaron: 'Camarón', camarones: 'Camarones',
  salmon: 'Salmón', melon: 'Melón', algodon: 'Algodón', champu: 'Champú',
  avena: 'Avena', frijol: 'Frijol', frijoles: 'Frijoles', arroz: 'Arroz',
  aceite: 'Aceite', harina: 'Harina', galleta: 'Galleta', galletas: 'Galletas',
  chocolate: 'Chocolate', refresco: 'Refresco', cerveza: 'Cerveza',
  huevo: 'Huevo', huevos: 'Huevos', queso: 'Queso', pollo: 'Pollo',
  carne: 'Carne', leche: 'Leche', pan: 'Pan', tortilla: 'Tortilla',
  tortillas: 'Tortillas', manzana: 'Manzana', manzanas: 'Manzanas',
  mayonesa: 'Mayonesa', mantequilla: 'Mantequilla', margarina: 'Margarina',
  detergente: 'Detergente', desodorante: 'Desodorante', papel: 'Papel',
  servilletas: 'Servilletas', cebolla: 'Cebolla', cebollas: 'Cebollas',
  jitomate: 'Jitomate', jitomates: 'Jitomates', tomate: 'Tomate',
  chile: 'Chile', chiles: 'Chiles', naranja: 'Naranja', naranjas: 'Naranjas',
  pina: 'Piña', jicama: 'Jícama', aguacate: 'Aguacate', cilantro: 'Cilantro',
  vinagre: 'Vinagre', catsup: 'Catsup', mostaza: 'Mostaza', yogurt: 'Yogurt',
  cereal: 'Cereal', pasta: 'Pasta', sopa: 'Sopa', atun: 'Atún', jugo: 'Jugo',
  agua: 'Agua', vino: 'Vino', pastel: 'Pastel', panque: 'Panqué',
  k: 'k', kg: 'kg', kilo: 'kilo', kilos: 'kilos',
  huebo: 'Huevo', huevoo: 'Huevo',
};

const RANGO_ACENTOS = new RegExp('[̀-ͯ]', 'g');

function quitarAcentos(texto) {
  return texto.normalize('NFD').replace(RANGO_ACENTOS, '');
}

export function normalizarNombreProducto(textoOriginal) {
  const texto = String(textoOriginal || '').trim().replace(/\s+/g, ' ');
  if (!texto) return '';

  return texto
    .split(' ')
    .map(palabra => {
      const clave = quitarAcentos(palabra.toLowerCase());
      if (DICCIONARIO[clave]) {
        return DICCIONARIO[clave];
      }
      return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
    })
    .join(' ');
}

// Clave estable para buscar y garantizar unicidad únicamente en productos
// sin código. No se usa para decidir que dos SKUs con códigos distintos sean
// el mismo producto.
export function normalizarClaveProducto(textoOriginal) {
  const nombre = normalizarNombreProducto(textoOriginal);
  const sinAcentos = quitarAcentos(nombre).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  // En granel, estas formas representan el mismo producto lógico. La clave
  // se usa solo cuando codigo_barras es NULL.
  if (/^huevo(?:\s+1\s*(?:k|kg|kilo))?$/.test(sinAcentos)) return 'huevo';

  return sinAcentos.replace(/\s+/g, ' ');
}
