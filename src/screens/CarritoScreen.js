import React, {useCallback, useEffect, useState} from 'react';
import {Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useCarrito} from '../context/CarritoContext';
import {
  buscarProductoPorNombreExacto,
  buscarProductosPorNombre,
  crearProductoSinCodigo,
} from '../db/database';
import {normalizarNombreProducto} from '../utils/normalizarNombre';
import {obtenerTipoProducto} from '../domain/venta';

export default function CarritoScreen({navigation, route}) {
  const {items, agregarProducto, cambiarCantidad, vaciarCarrito, total, cantidadTotal} = useCarrito();
  const [cobrando, setCobrando] = useState(false);
  const [efectivo, setEfectivo] = useState('');

  // Flujo de "+": 'buscar' -> (si no existe) 'crear' -> (si es peso/importe) 'vender'
  const [modalAgregar, setModalAgregar] = useState(false);
  const [paso, setPaso] = useState('buscar');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [resultadosProducto, setResultadosProducto] = useState([]);
  const [tipoNuevo, setTipoNuevo] = useState(null);
  const [nombreCrear, setNombreCrear] = useState('');
  const [precioKgCrear, setPrecioKgCrear] = useState('');
  const [productoVenta, setProductoVenta] = useState(null);
  const [kgVenta, setKgVenta] = useState('');
  const [montoVenta, setMontoVenta] = useState('');

  useEffect(() => {
    if (busquedaProducto.trim().length >= 2) {
      buscarProductosPorNombre(busquedaProducto).then(setResultadosProducto);
    } else {
      setResultadosProducto([]);
    }
  }, [busquedaProducto]);

  const abrirAgregarProducto = () => {
    setPaso('buscar');
    setBusquedaProducto('');
    setResultadosProducto([]);
    setModalAgregar(true);
  };

  const cerrarAgregarProducto = () => setModalAgregar(false);

  const irACrear = () => {
    setTipoNuevo(null);
    setNombreCrear(busquedaProducto.trim());
    setPrecioKgCrear('');
    setPaso('crear');
  };

  const procesarProductoSeleccionado = useCallback(producto => {
    const tipo = obtenerTipoProducto(producto);
    if (tipo === 'unidad') {
      agregarProducto(producto, 1);
      setModalAgregar(false);
      return;
    }
    setProductoVenta(producto);
    setKgVenta('');
    setMontoVenta('');
    setPaso('vender');
    setModalAgregar(true);
  }, [agregarProducto]);

  // Las entradas de venta desde escáner o búsqueda manual también deben
  // respetar el tipo guardado; solo los productos por pieza se agregan solos.
  useEffect(() => {
    const producto = route?.params?.productoParaVenta;
    if (producto) {
      procesarProductoSeleccionado(producto);
      navigation.setParams({productoParaVenta: null});
    }
  }, [navigation, procesarProductoSeleccionado, route?.params?.productoParaVenta]);

  const guardarNuevoManual = async () => {
    if (!nombreCrear.trim()) {
      Alert.alert('Falta información', 'Escribe el nombre del producto.');
      return;
    }
    const precioKg = parseFloat(precioKgCrear.replace(',', '.'));
    if (isNaN(precioKg) || precioKg <= 0) {
      Alert.alert('Precio inválido', 'Ingresa el precio por kg de referencia.');
      return;
    }
    try {
      const nombre = normalizarNombreProducto(nombreCrear);
      const existente = await buscarProductoPorNombreExacto(nombre);
      if (existente) {
        // Ya existe: vender el registro guardado, sin pedir nombre o precio.
        procesarProductoSeleccionado(existente);
        return;
      }
      const producto = await crearProductoSinCodigo({nombre, precio: precioKg, tipo: tipoNuevo});
      procesarProductoSeleccionado(producto);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el producto: ' + e.message);
    }
  };

  const agregarPorPeso = () => {
    const kg = parseFloat(kgVenta.replace(',', '.'));
    if (isNaN(kg) || kg <= 0) {
      Alert.alert('Cantidad inválida', 'Ingresa los kg.');
      return;
    }
    agregarProducto(productoVenta, kg);
    cerrarAgregarProducto();
  };

  const agregarPorImporte = () => {
    const monto = parseFloat(montoVenta.replace(',', '.'));
    if (isNaN(monto) || monto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa el importe.');
      return;
    }
    // Cada venta por importe es su propia línea (aunque sea el mismo
    // producto), porque el monto puede ser distinto cada vez.
    agregarProducto(productoVenta, monto);
    cerrarAgregarProducto();
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
  const kgVentaNum = parseFloat(String(kgVenta).replace(',', '.')) || 0;

  return (
    <View style={styles.container}>
      <View style={styles.filaSuperior}>
        <TouchableOpacity style={styles.botonMas} onPress={abrirAgregarProducto}>
          <Text style={styles.botonMasTexto}>+</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.vacioBox}>
          <Text style={styles.vacioTexto}>El carrito está vacío</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.lista}
          renderItem={({item}) =>
            item.tipo === 'peso' || item.tipo === 'importe' ? (
              <View style={styles.fila}>
                <Text style={styles.filaLineaUnica} numberOfLines={1}>
                  {item.tipo === 'peso'
                    ? `${item.nombre || '(sin nombre)'} — ${item.cantidadKg.toFixed(3)} kg — $${item.subtotal.toFixed(2)}`
                    : `${item.nombre || '(sin nombre)'} — $${item.importe.toFixed(2)}`}
                </Text>
                <TouchableOpacity
                  style={styles.botonQuitar}
                  onPress={() => cambiarCantidad(item.id, 0)}>
                  <Text style={styles.botonQuitarTexto}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.fila}>
                <View style={styles.info}>
                  <Text style={styles.nombre} numberOfLines={2}>
                    {item.nombre || '(sin nombre)'}
                  </Text>
                  <Text style={styles.precioUnit}>${item.precioUnitario.toFixed(2)} c/u</Text>
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
                <Text style={styles.subtotal}>${item.subtotal.toFixed(2)}</Text>
              </View>
            )
          }
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
        onRequestClose={cerrarAgregarProducto}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {paso === 'buscar' && (
              <>
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
                    <TouchableOpacity style={styles.opcionFila} onPress={() => procesarProductoSeleccionado(item)}>
                      <View style={styles.opcionInfo}>
                        <Text style={styles.opcionNombre} numberOfLines={2}>
                          {item.nombre || '(sin nombre)'}
                        </Text>
                        <Text style={styles.opcionTipo}>
                          {item.tipo === 'peso' ? 'por peso' : item.tipo === 'importe' ? 'por importe' : 'precio fijo'}
                        </Text>
                      </View>
                      <Text style={styles.opcionPrecio}>
                        {item.tipo === 'peso'
                          ? `$${Number(item.precio).toFixed(2)}/kg`
                          : item.tipo === 'importe'
                          ? `$${Number(item.precio).toFixed(2)} referencia`
                          : `$${Number(item.precio).toFixed(2)}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                {busquedaProducto.trim().length >= 2 && resultadosProducto.length === 0 && (
                  <TouchableOpacity style={styles.botonCrearNuevo} onPress={irACrear}>
                    <Text style={styles.botonTexto}>CREAR PRODUCTO NUEVO</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.botonCancelarOpciones} onPress={cerrarAgregarProducto}>
                  <Text style={styles.botonTexto}>CANCELAR</Text>
                </TouchableOpacity>
              </>
            )}

            {paso === 'crear' && (
              <>
                <Text style={styles.modalTitulo}>Producto nuevo</Text>

                {tipoNuevo === null ? (
                  <>
                    <Text style={styles.modalSubtitulo}>¿Cómo se vende?</Text>
                    <TouchableOpacity style={styles.botonTipo} onPress={() => setTipoNuevo('peso')}>
                      <Text style={styles.botonTexto}>POR PESO</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.botonTipo} onPress={() => setTipoNuevo('importe')}>
                      <Text style={styles.botonTexto}>POR IMPORTE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.botonCancelarOpciones} onPress={cerrarAgregarProducto}>
                      <Text style={styles.botonTexto}>CANCELAR</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalSubtitulo}>Nombre y precio por kg</Text>

                    <TextInput
                      style={styles.input}
                      placeholder="Ej. Jamón"
                      placeholderTextColor="#9E9E9E"
                      value={nombreCrear}
                      onChangeText={setNombreCrear}
                      autoFocus
                    />

                    <TextInput
                      style={[styles.input, styles.inputConMargen]}
                      placeholder="Precio por kg, ej. 150.00"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="decimal-pad"
                      value={precioKgCrear}
                      onChangeText={setPrecioKgCrear}
                    />
                    {tipoNuevo === 'importe' && (
                      <Text style={styles.notaImporte}>
                        Es solo de referencia: al vender se pedirá el importe directo (ej. $30).
                      </Text>
                    )}

                    <View style={styles.modalBotones}>
                      <TouchableOpacity
                        style={[styles.modalBoton, styles.modalCancelar]}
                        onPress={cerrarAgregarProducto}>
                        <Text style={styles.modalBotonTexto} numberOfLines={1} adjustsFontSizeToFit>
                          CANCELAR
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBoton, styles.modalGuardar]}
                        onPress={guardarNuevoManual}>
                        <Text style={styles.modalBotonTexto} numberOfLines={1} adjustsFontSizeToFit>
                          GUARDAR
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}

            {paso === 'vender' && productoVenta && (
              <>
                <Text style={styles.modalTitulo}>{productoVenta.nombre}</Text>

                {productoVenta.tipo === 'peso' ? (
                  <>
                    <Text style={styles.modalSubtitulo}>
                      ${Number(productoVenta.precio).toFixed(2)} por kg — ¿cuántos kg?
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Kg, ej. 0.500"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="decimal-pad"
                      value={kgVenta}
                      onChangeText={setKgVenta}
                      autoFocus
                    />
                    {kgVentaNum > 0 && (
                      <View style={styles.previewBox}>
                        <Text style={styles.previewTexto}>
                          Importe: ${(kgVentaNum * Number(productoVenta.precio)).toFixed(2)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.modalBotones}>
                      <TouchableOpacity
                        style={[styles.modalBoton, styles.modalCancelar]}
                        onPress={cerrarAgregarProducto}>
                        <Text style={styles.modalBotonTexto} numberOfLines={1} adjustsFontSizeToFit>
                          CANCELAR
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBoton, styles.modalGuardar]}
                        onPress={agregarPorPeso}>
                        <Text style={styles.modalBotonTexto} numberOfLines={1} adjustsFontSizeToFit>
                          AGREGAR
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalSubtitulo}>¿Cuánto quiere comprar?</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Importe, ej. 20.00"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="decimal-pad"
                      value={montoVenta}
                      onChangeText={setMontoVenta}
                      autoFocus
                    />
                    <View style={styles.modalBotones}>
                      <TouchableOpacity
                        style={[styles.modalBoton, styles.modalCancelar]}
                        onPress={cerrarAgregarProducto}>
                        <Text style={styles.modalBotonTexto} numberOfLines={1} adjustsFontSizeToFit>
                          CANCELAR
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBoton, styles.modalGuardar]}
                        onPress={agregarPorImporte}>
                        <Text style={styles.modalBotonTexto} numberOfLines={1} adjustsFontSizeToFit>
                          AGREGAR
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  filaSuperior: {flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12},
  botonMas: {width: 44, height: 44, borderRadius: 22, backgroundColor: '#009688', alignItems: 'center', justifyContent: 'center', elevation: 3},
  botonMasTexto: {color: '#fff', fontSize: 26, fontWeight: 'bold', lineHeight: 28},
  vacioBox: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  vacioTexto: {fontSize: 22, color: '#9E9E9E'},
  lista: {padding: 16, paddingBottom: 8},
  fila: {flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#EEEEEE'},
  filaLineaUnica: {flex: 1, fontSize: 17, color: '#000000', fontWeight: '600', marginRight: 10},
  botonQuitar: {width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEBEE', alignItems: 'center', justifyContent: 'center'},
  botonQuitarTexto: {color: '#C62828', fontSize: 18, fontWeight: 'bold'},
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
  inputConMargen: {marginTop: 10},
  notaImporte: {fontSize: 13, color: '#666', textAlign: 'center', marginTop: 8},
  sinResultados: {fontSize: 16, color: '#9E9E9E', textAlign: 'center', marginTop: 16},
  botonCrearNuevo: {backgroundColor: '#009688', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12},
  listaOpciones: {maxHeight: 280, marginTop: 8},
  opcionFila: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: '#EEEEEE'},
  opcionInfo: {flex: 1, marginRight: 10},
  opcionNombre: {fontSize: 18, color: '#000'},
  opcionTipo: {fontSize: 13, color: '#888', marginTop: 2},
  opcionPrecio: {fontSize: 18, color: '#2196F3', fontWeight: 'bold'},
  botonCancelarOpciones: {backgroundColor: '#9E9E9E', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16},
  botonTipo: {backgroundColor: '#2196F3', borderRadius: 10, paddingVertical: 18, alignItems: 'center', marginBottom: 12},
  modalBotones: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 20},
  modalBoton: {flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', paddingHorizontal: 4},
  modalCancelar: {backgroundColor: '#FF5252', marginRight: 8},
  modalGuardar: {backgroundColor: '#4CAF50', marginLeft: 8},
  modalBotonTexto: {color: '#fff', fontSize: 19, fontWeight: 'bold'},
  previewBox: {backgroundColor: '#E8F5E9', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 12},
  previewTexto: {fontSize: 20, color: '#2E7D32', fontWeight: 'bold'},
});
