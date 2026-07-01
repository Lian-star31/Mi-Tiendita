/**
 * EditPriceModal.js
 * -----------------------------------------------------------------------------
 * Modal para editar el precio de un producto.
 *
 * Contiene:
 *   - Nombre del producto (solo lectura)
 *   - Campo: Nuevo precio
 *   - Botón GUARDAR (verde)  -> guarda en SQLite
 *   - Botón CANCELAR (rojo)  -> cierra sin guardar
 * -----------------------------------------------------------------------------
 */
import React, {useEffect, useState} from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {actualizarPrecio} from '../db/database';

export default function EditPriceModal({
  visible,
  producto,
  onClose,
  onGuardado,
}) {
  const [nuevoPrecio, setNuevoPrecio] = useState('');

  // Cada vez que se abre el modal, precarga el precio actual del producto.
  useEffect(() => {
    if (visible && producto) {
      setNuevoPrecio(String(producto.precio));
    }
  }, [visible, producto]);

  /**
   * Valida el precio, lo guarda en SQLite y notifica al padre.
   */
  const onGuardar = async () => {
    const precioNum = parseFloat(String(nuevoPrecio).replace(',', '.'));
    if (isNaN(precioNum) || precioNum < 0) {
      Alert.alert('Precio inválido', 'Ingresa un número mayor o igual a 0.');
      return;
    }
    try {
      await actualizarPrecio(producto.id, precioNum);
      onGuardado(precioNum);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el precio: ' + e.message);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      {/* Fondo semitransparente */}
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.titulo}>Editar precio</Text>

          {/* Nombre del producto (solo lectura) */}
          <Text style={styles.etiqueta}>Producto:</Text>
          <Text style={styles.nombre}>{producto?.nombre}</Text>

          {/* Campo de nuevo precio */}
          <Text style={styles.etiqueta}>Nuevo precio:</Text>
          <TextInput
            style={styles.input}
            value={nuevoPrecio}
            onChangeText={setNuevoPrecio}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#9E9E9E"
            autoFocus
          />

          {/* Botones */}
          <View style={styles.botones}>
            <TouchableOpacity
              style={[styles.boton, styles.botonCancelar]}
              onPress={onClose}>
              <Text style={styles.botonTexto}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.boton, styles.botonGuardar]}
              onPress={onGuardar}>
              <Text style={styles.botonTexto}>GUARDAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    elevation: 6,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  etiqueta: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
    marginTop: 10,
  },
  nombre: {
    fontSize: 20,
    color: '#000000',
    marginBottom: 6,
  },
  input: {
    fontSize: 24,
    color: '#000000',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  botones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  boton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonCancelar: {
    backgroundColor: '#FF5252',
    marginRight: 8,
  },
  botonGuardar: {
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
