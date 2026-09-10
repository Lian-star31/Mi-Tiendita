import React, {useEffect, useState} from 'react';
import {Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useCarrito} from '../context/CarritoContext';
import {buscarProductosPorNombre} from '../db/database';

export default function CarritoScreen({navigation}) {
  const {items, agregarProducto, cambiarCantidad, vaciarCarrito, total, cantidadTotal} = useCarrito();
  const [cobrando, setCobrando] = useState(false);
  const [efectivo, setEfectivo] = useState('');
  const [modalAgregar, setModalAgregar] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosProducto, setResultadosProducto] = useState([]);

  useEffect(() => {
    if (busquedaProducto.trim().length >= 2) {
      buscarProductosPorNombre(busquedaProducto).then(setResultadosProducto);
    } else {
      setResultadosProducto([]);
    }
  }, [busquedaProducto]);

  const abrirAgregarProducto = () => {
    setBusquedaProducto('');
    setResultadosProducto([]);
    setModalAgregar(true);
  };

  const seleccionarProducto = producto => {
    agregarProducto(producto);
    setModalAgregar(false);
  };

  const confirmarNuevaVenta = () => {
    if (items.length === 0) return;
    Alert.alert('Nueva venta', '¿Vaciar el carrito y empezar una venta nueva?', [
      {text: 'Cancelar', style: 'cancel'},
      {
        text: 'Sí, vaciar',
        style: 'destructive',
        onPress: () => {
          vaciarCarrito();
          // Colapsa todo el stack (Scanner/Result/Carrito) y deja solo
          // Inicio, para que la venta anterior no quede accesible con Atrás.
          navigation.popToTop();
        },
      },
    ]);
  };

  const abrirCobro = () => {
    if (items.length === 0) return;
    setEfectivo('');
    setCobrando(true);
  };

  const cancelarCobro = () => {
    setCobrando(false);
    setEfectivo('');
  };

  const finalizarVenta = () => {
    vaciarCarrito();
    setCobrando(false);
    setEfectivo('');
    // Misma razón que Nueva Venta: la venta ya terminó, no debe quedar
    // ninguna pantalla de este ciclo accesible con Atrás.
    navigation.popToTop();
  };

  const efectivoNum = parseFloat(String(efectivo).replace(',', '.')) || 0;
  const cambio = efectivoNum - total;

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
                  {item.nombre || '(sin nombre)'}
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

      {cobrando ? (
        <View style={styles.cobroPanel}>
          <Text style={styles.cobroEtiqueta}>Efectivo recibido:</Text>
          <TextInput
            style={styles.cobroInput}
            placeholder="0.00"
            placeholderTextColor="#9E9E9E"
            keyboardType="decimal-pad"
            value={efectivo}
            onChangeText={setEfectivo}
            autoFocus
          />

          {efectivo !== '' &&
            (cambio >= 0 ? (
              <View style={styles.cambioBox}>
                <Text style={styles.cambioEtiqueta}>CAMBIO A ENTREGAR</Text>
                <Text style={styles.cambioMonto}>${cambio.toFixed(2)}</Text>
              </View>
            ) : (
              <View style={[styles.cambioBox, styles.faltaBox]}>
                <Text style={styles.faltaEtiqueta}>FALTA</Text>
                <Text style={styles.faltaMonto}>${Math.abs(cambio).toFixed(2)}</Text>
              </View>
            ))}

          <View style={styles.cobroBotones}>
            <TouchableOpacity style={styles.botonCancelarCobro} onPress={cancelarCobro}>
              <Text style={styles.botonTexto}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botonFinalizar, cambio < 0 && styles.botonDeshabilitado]}
              disabled={cambio < 0}
              onPress={finalizarVenta}>
              <Text style={styles.botonTexto}>FINALIZAR VENTA</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <TouchableOpacity style={styles.botonAgregarProducto} onPress={abrirAgregarProducto}>
            <Text style={styles.botonTexto}>+ AGREGAR PRODUCTO</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botonCobrar, items.length === 0 && styles.botonDeshabilitado]}
            disabled={items.length === 0}
            onPress={abrirCobro}>
            <Text style={styles.botonTexto}>COBRAR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonSeguir} onPress={() => navigation.navigate('Scanner')}>
            <Text style={styles.botonTexto}>SEGUIR ESCANEANDO</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonNuevaVenta} onPress={confirmarNuevaVenta}>
            <Text style={styles.botonTexto}>NUEVA VENTA</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal
        visible={modalAgregar}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAgregar(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Agregar producto</Text>
            <Text style={styles.modalSubtitulo}>Busca por nombre (ej. Jamón, Azúcar)</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del producto..."
              placeholderTextColor="#9E9E9E"
              value={busquedaProducto}
              onChangeText={setBusquedaProducto}
              autoFocus
            />

            {busquedaProducto.trim().length >= 2 && resultadosProducto.length === 0 && (
              <Text style={styles.sinResultados}>Sin resultados</Text>
            )}

            <FlatList
              style={styles.listaOpciones}
              data={resultadosProducto}
              keyExtractor={item => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({item}) => (
                <TouchableOpacity style={styles.opcionFila} onPress={() => seleccionarProducto(item)}>
                  <Text style={styles.opcionNombre} numberOfLines={2}>
                    {item.nombre || '(sin nombre)'}
                  </Text>
                  <Text style={styles.opcionPrecio}>${Number(item.precio).toFixed(2)}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.botonCancelarOpciones} onPress={() => setModalAgregar(false)}>
              <Text style={styles.botonTexto}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  botonAgregarProducto: {backgroundColor: '#009688', paddingVertical: 18, alignItems: 'center'},
  botonCobrar: {backgroundColor: '#2E7D32', paddingVertical: 18, alignItems: 'center'},
  botonSeguir: {backgroundColor: '#2196F3', paddingVertical: 18, alignItems: 'center'},
  botonNuevaVenta: {backgroundColor: '#FF5252', paddingVertical: 18, alignItems: 'center'},
  botonDeshabilitado: {opacity: 0.4},
  botonTexto: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  cobroPanel: {padding: 20, backgroundColor: '#FFFFFF'},
  cobroEtiqueta: {fontSize: 18, color: '#333333', marginBottom: 8},
  cobroInput: {fontSize: 28, borderWidth: 2, borderColor: '#2196F3', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, color: '#000000', marginBottom: 16},
  cambioBox: {backgroundColor: '#E8F5E9', borderRadius: 10, paddingVertical: 18, alignItems: 'center', marginBottom: 20},
  cambioEtiqueta: {fontSize: 16, color: '#2E7D32', fontWeight: '600'},
  cambioMonto: {fontSize: 40, color: '#2E7D32', fontWeight: 'bold', marginTop: 4},
  faltaBox: {backgroundColor: '#FFEBEE'},
  faltaEtiqueta: {fontSize: 16, color: '#C62828', fontWeight: '600'},
  faltaMonto: {fontSize: 40, color: '#C62828', fontWeight: 'bold', marginTop: 4},
  cobroBotones: {flexDirection: 'row', justifyContent: 'space-between'},
  botonCancelarCobro: {flex: 1, backgroundColor: '#9E9E9E', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginRight: 8},
  botonFinalizar: {flex: 1, backgroundColor: '#2E7D32', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginLeft: 8},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 16},
  modalCard: {backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, elevation: 6, maxHeight: '80%'},
  modalTitulo: {fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 4, textAlign: 'center'},
  modalSubtitulo: {fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 16},
  input: {fontSize: 20, borderWidth: 2, borderColor: '#2196F3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#000'},
  sinResultados: {fontSize: 16, color: '#9E9E9E', textAlign: 'center', marginTop: 16},
  listaOpciones: {maxHeight: 320, marginTop: 8},
  opcionFila: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: '#EEEEEE'},
  opcionNombre: {fontSize: 18, color: '#000', flex: 1, marginRight: 10},
  opcionPrecio: {fontSize: 18, color: '#2196F3', fontWeight: 'bold'},
  botonCancelarOpciones: {backgroundColor: '#9E9E9E', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16},
});
