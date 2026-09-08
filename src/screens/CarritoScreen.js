import React from 'react';
import {Alert, FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useCarrito} from '../context/CarritoContext';

export default function CarritoScreen({navigation}) {
  const {items, cambiarCantidad, vaciarCarrito, total, cantidadTotal} = useCarrito();

  const confirmarNuevaVenta = () => {
    if (items.length === 0) return;
    Alert.alert('Nueva venta', '¿Vaciar el carrito y empezar una venta nueva?', [
      {text: 'Cancelar', style: 'cancel'},
      {text: 'Sí, vaciar', style: 'destructive', onPress: vaciarCarrito},
    ]);
  };

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.vacioBox}>
          <Text style={styles.vacioTexto}>El carrito está vacío</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.lista}
          renderItem={({item}) => (
            <View style={styles.fila}>
              <View style={styles.info}>
                <Text style={styles.nombre} numberOfLines={2}>
                  {item.nombre}
                </Text>
                <Text style={styles.precioUnit}>${item.precio.toFixed(2)} c/u</Text>
              </View>
              <View style={styles.controles}>
                <TouchableOpacity
                  style={styles.botonCantidad}
                  onPress={() => cambiarCantidad(item.id, item.cantidad - 1)}>
                  <Text style={styles.botonCantidadTexto}>−</Text>
                </TouchableOpacity>
                <Text style={styles.cantidad}>{item.cantidad}</Text>
                <TouchableOpacity
                  style={styles.botonCantidad}
                  onPress={() => cambiarCantidad(item.id, item.cantidad + 1)}>
                  <Text style={styles.botonCantidadTexto}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.subtotal}>${(item.precio * item.cantidad).toFixed(2)}</Text>
            </View>
          )}
        />
      )}

      <View style={styles.resumen}>
        <Text style={styles.totalEtiqueta}>
          TOTAL ({cantidadTotal} {cantidadTotal === 1 ? 'producto' : 'productos'})
        </Text>
        <Text style={styles.total}>${total.toFixed(2)}</Text>
      </View>

      <TouchableOpacity style={styles.botonSeguir} onPress={() => navigation.navigate('Scanner')}>
        <Text style={styles.botonTexto}>SEGUIR ESCANEANDO</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonNuevaVenta} onPress={confirmarNuevaVenta}>
        <Text style={styles.botonTexto}>NUEVA VENTA</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  vacioBox: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  vacioTexto: {fontSize: 22, color: '#9E9E9E'},
  lista: {padding: 16, paddingBottom: 8},
  fila: {flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#EEEEEE'},
  info: {flex: 1, marginRight: 8},
  nombre: {fontSize: 18, color: '#000000', fontWeight: '600'},
  precioUnit: {fontSize: 15, color: '#666666', marginTop: 2},
  controles: {flexDirection: 'row', alignItems: 'center', marginRight: 12},
  botonCantidad: {width: 40, height: 40, borderRadius: 8, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center'},
  botonCantidadTexto: {color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', lineHeight: 26},
  cantidad: {fontSize: 20, fontWeight: 'bold', color: '#000000', marginHorizontal: 12, minWidth: 24, textAlign: 'center'},
  subtotal: {fontSize: 18, fontWeight: 'bold', color: '#000000', minWidth: 80, textAlign: 'right'},
  resumen: {backgroundColor: '#F5F5F5', paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', borderTopWidth: 1, borderColor: '#E0E0E0'},
  totalEtiqueta: {fontSize: 16, color: '#333333', fontWeight: '600'},
  total: {fontSize: 34, fontWeight: 'bold', color: '#2E7D32', marginTop: 2},
  botonSeguir: {backgroundColor: '#2196F3', paddingVertical: 18, alignItems: 'center'},
  botonNuevaVenta: {backgroundColor: '#FF5252', paddingVertical: 18, alignItems: 'center'},
  botonTexto: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
});
