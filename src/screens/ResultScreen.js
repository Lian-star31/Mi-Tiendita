/**
 * ResultScreen.js
 * -----------------------------------------------------------------------------
 * Pantalla de resultado que se muestra después de escanear o buscar.
 *
 * Muestra:
 *   - Código: [número]
 *   - Nombre: [producto]
 *   - PRECIO: [monto] (texto rojo, 36px, grande)
 *   - STOCK: [cantidad] unidades
 *   - Botón "EDITAR PRECIO" (verde) -> abre el modal
 *   - Botón "VOLVER A ESCANEAR" (gris)
 * -----------------------------------------------------------------------------
 */
import React, {useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import EditPriceModal from './EditPriceModal';

export default function ResultScreen({route, navigation}) {
  // El producto llega por parámetros de navegación (desde Home o Scanner).
  const [producto, setProducto] = useState(route.params?.producto);
  const [modalVisible, setModalVisible] = useState(false);

  // Salvaguarda por si se llega sin producto.
  if (!producto) {
    return (
      <View style={styles.container}>
        <Text style={styles.dato}>No hay producto para mostrar.</Text>
        <TouchableOpacity
          style={styles.botonVolver}
          onPress={() => navigation.navigate('Scanner')}>
          <Text style={styles.botonTexto}>VOLVER A ESCANEAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Callback cuando el modal guarda un nuevo precio.
   * Actualiza el estado local para reflejar el cambio de inmediato.
   */
  const onPrecioActualizado = nuevoPrecio => {
    setProducto({...producto, precio: nuevoPrecio});
    setModalVisible(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}>
      {/* Código de barras */}
      <View style={styles.fila}>
        <Text style={styles.etiqueta}>Código:</Text>
        <Text style={styles.dato}>{producto.codigo_barras}</Text>
      </View>

      {/* Nombre del producto */}
      <View style={styles.fila}>
        <Text style={styles.etiqueta}>Nombre:</Text>
        <Text style={styles.dato}>{producto.nombre}</Text>
      </View>

      {/* Precio destacado en rojo y grande */}
      <View style={styles.bloquePrecio}>
        <Text style={styles.etiquetaPrecio}>PRECIO:</Text>
        <Text style={styles.precio}>${Number(producto.precio).toFixed(2)}</Text>
      </View>

      {/* Stock disponible */}
      <View style={styles.fila}>
        <Text style={styles.etiqueta}>STOCK:</Text>
        <Text style={styles.dato}>{producto.stock} unidades</Text>
      </View>

      {/* Botón para abrir el modal de edición de precio (verde) */}
      <TouchableOpacity
        style={styles.botonEditar}
        onPress={() => setModalVisible(true)}>
        <Text style={styles.botonTexto}>EDITAR PRECIO</Text>
      </TouchableOpacity>

      {/* Botón para volver a escanear (gris) */}
      <TouchableOpacity
        style={styles.botonVolver}
        onPress={() => navigation.navigate('Scanner')}>
        <Text style={styles.botonTexto}>VOLVER A ESCANEAR</Text>
      </TouchableOpacity>

      {/* Modal de edición de precio */}
      <EditPriceModal
        visible={modalVisible}
        producto={producto}
        onClose={() => setModalVisible(false)}
        onGuardado={onPrecioActualizado}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  etiqueta: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '600',
    marginRight: 8,
  },
  dato: {
    fontSize: 20,
    color: '#000000',
  },
  bloquePrecio: {
    alignItems: 'center',
    marginVertical: 24,
  },
  etiquetaPrecio: {
    fontSize: 22,
    color: '#000000',
    fontWeight: '600',
  },
  precio: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF5252',
  },
  botonEditar: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  botonVolver: {
    backgroundColor: '#9E9E9E',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
