import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {RNCamera} from 'react-native-camera';
import {getProductoPorCodigo, insertarProducto} from '../db/database';
import {useCarrito} from '../context/CarritoContext';
import EditPriceModal from '../screens/EditPriceModal';

const COOLDOWN_MS = 1500;

export default function BarcodeScanner({navigation}) {
  const {agregarProducto, cantidadTotal, total} = useCarrito();
  const bloqueado = useRef(false);
  const [mensaje, setMensaje] = useState('Apunta la cámara al código de barras');
  const [aviso, setAviso] = useState(null);
  const [codigoNuevo, setCodigoNuevo] = useState(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [precioNuevo, setPrecioNuevo] = useState('');
  const [editandoPrecio, setEditandoPrecio] = useState(false);

  // El aviso es solo confirmación del último escaneo, no información
  // permanente: si el carrito se vacía (Nueva Venta / Finalizar Venta),
  // desaparece y la pantalla queda lista para el siguiente escaneo.
  useEffect(() => {
    if (cantidadTotal === 0) {
      setAviso(null);
    }
  }, [cantidadTotal]);

  const liberarTrasCooldown = () => {
    setTimeout(() => {
      bloqueado.current = false;
      setMensaje('Apunta la cámara al código de barras');
    }, COOLDOWN_MS);
  };

  const onBarCodeRead = async ({data}) => {
    if (bloqueado.current) return;
    bloqueado.current = true;
    setMensaje('Buscando...');

    try {
      const producto = await getProductoPorCodigo(data);
      if (producto) {
        if (producto.tipo === 'peso' || producto.tipo === 'importe') {
          navigation.navigate('Carrito', {productoParaVenta: producto});
        } else {
          agregarProducto(producto);
        }
        setAviso(producto);
        setMensaje(
          producto.tipo === 'peso' || producto.tipo === 'importe'
            ? 'Selecciona la cantidad en el carrito'
            : '✓ Agregado al carrito',
        );
        liberarTrasCooldown();
      } else {
        // Pausa el escaneo y pide datos, sin perder lo ya escaneado.
        setCodigoNuevo(data);
        setNombreNuevo('');
        setPrecioNuevo('');
      }
    } catch (e) {
      bloqueado.current = false;
      Alert.alert('Error', 'No se pudo leer el producto: ' + e.message);
    }
  };

  const cancelarNuevoProducto = () => {
    setCodigoNuevo(null);
    bloqueado.current = false;
    setMensaje('Apunta la cámara al código de barras');
  };

  const guardarNuevoProducto = async () => {
    if (!nombreNuevo.trim() || !precioNuevo) {
      Alert.alert('Falta información', 'Escribe el nombre y el precio.');
      return;
    }
    const precio = parseFloat(precioNuevo.replace(',', '.'));
    if (isNaN(precio) || precio < 0) {
      Alert.alert('Precio inválido', 'Ingresa un número válido.');
      return;
    }
    try {
      const producto = await insertarProducto({
        codigo: codigoNuevo,
        nombre: nombreNuevo.trim(),
        precio,
      });
      agregarProducto(producto);
      setAviso(producto);
      setCodigoNuevo(null);
      setMensaje('✓ Agregado al carrito');
      liberarTrasCooldown();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el producto: ' + e.message);
    }
  };

  const abrirEditarPrecio = () => {
    bloqueado.current = true;
    setEditandoPrecio(true);
  };

  const cerrarEditarPrecio = () => {
    setEditandoPrecio(false);
    bloqueado.current = false;
  };

  const onPrecioEditado = nuevoPrecio => {
    setAviso(prev => (prev ? {...prev, precio: nuevoPrecio} : prev));
    setEditandoPrecio(false);
    bloqueado.current = false;
  };

  return (
    <View style={styles.container}>
      <RNCamera
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        captureAudio={false}
        androidCameraPermissionOptions={{
          title: 'Permiso de cámara',
          message: 'La app necesita la cámara para escanear códigos de barras.',
          buttonPositive: 'Aceptar',
          buttonNegative: 'Cancelar',
        }}
        onBarCodeRead={onBarCodeRead}
        barCodeTypes={[
          RNCamera.Constants.BarCodeType.ean13,
          RNCamera.Constants.BarCodeType.ean8,
          RNCamera.Constants.BarCodeType.upc_a,
          RNCamera.Constants.BarCodeType.upc_e,
          RNCamera.Constants.BarCodeType.code128,
          RNCamera.Constants.BarCodeType.code39,
        ]}>
        <View style={styles.overlay}>
          <View style={styles.marco} />
          <Text style={styles.mensaje}>{mensaje}</Text>
          {aviso && (
            <View style={styles.avisoBox}>
              <Text style={styles.avisoNombre} numberOfLines={1}>
                {aviso.nombre || '(sin nombre)'}
              </Text>
              <Text style={styles.avisoPrecio}>${Number(aviso.precio).toFixed(2)}</Text>
              <TouchableOpacity style={styles.botonEditarPrecio} onPress={abrirEditarPrecio}>
                <Text style={styles.botonEditarPrecioTexto}>EDITAR PRECIO</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </RNCamera>

      <View style={styles.barraCarrito}>
        <Text style={styles.barraTexto}>
          {cantidadTotal} {cantidadTotal === 1 ? 'producto' : 'productos'} · ${total.toFixed(2)}
        </Text>
        <TouchableOpacity style={styles.botonVerCarrito} onPress={() => navigation.navigate('Carrito')}>
          <Text style={styles.botonVerCarritoTexto}>VER CARRITO</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.botonVolver} onPress={() => navigation.goBack()}>
        <Text style={styles.botonTexto}>VOLVER</Text>
      </TouchableOpacity>

      <Modal
        visible={codigoNuevo !== null}
        transparent
        animationType="slide"
        onRequestClose={cancelarNuevoProducto}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Producto nuevo</Text>
            <Text style={styles.modalCodigo}>Código: {codigoNuevo}</Text>

            <Text style={styles.modalEtiqueta}>Nombre:</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del producto"
              placeholderTextColor="#9E9E9E"
              value={nombreNuevo}
              onChangeText={setNombreNuevo}
              autoFocus
            />

            <Text style={styles.modalEtiqueta}>Precio:</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#9E9E9E"
              value={precioNuevo}
              onChangeText={setPrecioNuevo}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.modalBoton, styles.modalCancelar]}
                onPress={cancelarNuevoProducto}>
                <Text style={styles.botonTexto}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBoton, styles.modalGuardar]}
                onPress={guardarNuevoProducto}>
                <Text style={styles.botonTexto}>AGREGAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EditPriceModal
        visible={editandoPrecio}
        producto={aviso}
        onClose={cerrarEditarPrecio}
        onGuardado={onPrecioEditado}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000000'},
  camera: {flex: 1},
  overlay: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent'},
  marco: {width: 260, height: 160, borderWidth: 3, borderColor: '#2196F3', borderRadius: 12, backgroundColor: 'transparent'},
  mensaje: {marginTop: 20, color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20},
  avisoBox: {marginTop: 16, backgroundColor: '#4CAF50', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center'},
  avisoNombre: {color: '#FFFFFF', fontSize: 16, fontWeight: '600', maxWidth: 260},
  avisoPrecio: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 2},
  botonEditarPrecio: {backgroundColor: '#FFFFFF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginTop: 10},
  botonEditarPrecioTexto: {color: '#2E7D32', fontSize: 15, fontWeight: 'bold'},
  barraCarrito: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1565C0', paddingHorizontal: 16, paddingVertical: 12},
  barraTexto: {color: '#FFFFFF', fontSize: 16, fontWeight: '600', flexShrink: 1},
  botonVerCarrito: {backgroundColor: '#FFFFFF', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, marginLeft: 10},
  botonVerCarritoTexto: {color: '#1565C0', fontSize: 14, fontWeight: 'bold'},
  botonVolver: {backgroundColor: '#9E9E9E', paddingVertical: 16, alignItems: 'center'},
  botonTexto: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24},
  modalCard: {backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24},
  modalTitulo: {fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 4, textAlign: 'center'},
  modalCodigo: {fontSize: 15, color: '#666', marginBottom: 16, textAlign: 'center'},
  modalEtiqueta: {fontSize: 16, color: '#333', marginBottom: 6, marginTop: 8},
  input: {fontSize: 20, borderWidth: 2, borderColor: '#2196F3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#000'},
  modalBotones: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 22},
  modalBoton: {flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center'},
  modalCancelar: {backgroundColor: '#FF5252', marginRight: 8},
  modalGuardar: {backgroundColor: '#4CAF50', marginLeft: 8},
});
