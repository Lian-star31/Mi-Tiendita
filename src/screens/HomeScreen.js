import React, {useState} from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {buscarProducto, crearProductoSinCodigo} from '../db/database';
import {useCarrito} from '../context/CarritoContext';

const CM = 38;
const LADO_BOTON = Math.min(15 * CM, Dimensions.get('window').width - 40);

export default function HomeScreen({navigation}) {
  const {cantidadTotal, total} = useCarrito();
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [precioNuevo, setPrecioNuevo] = useState('');

  const onBuscarManual = async () => {
    const termino = busqueda.trim();
    if (!termino) {
      Alert.alert('Búsqueda', 'Escribe un código o nombre de producto.');
      return;
    }
    const producto = await buscarProducto(termino);
    if (producto) {
      navigation.navigate('Result', {producto});
    } else {
      Alert.alert('Sin resultados', `No se encontró: "${termino}"`);
    }
  };

  const abrirNuevoProducto = () => {
    setNombreNuevo('');
    setPrecioNuevo('');
    setModalNuevo(true);
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
      await crearProductoSinCodigo({nombre: nombreNuevo.trim(), precio});
      setModalNuevo(false);
      Alert.alert('Guardado', `${nombreNuevo.trim()} - $${precio.toFixed(2)}`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el producto: ' + e.message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      <Image
        source={require('../assets/logo_tienda.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {cantidadTotal > 0 && (
        <TouchableOpacity style={styles.bannerCarrito} onPress={() => navigation.navigate('Carrito')}>
          <Text style={styles.bannerCarritoTexto}>
            🛒 {cantidadTotal} {cantidadTotal === 1 ? 'producto' : 'productos'} · ${total.toFixed(2)}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.botonEscanear}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Scanner')}>
        <Text style={styles.botonEscanearTexto}>ESCANEAR{'\n'}CÓDIGO</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonNuevoProducto} onPress={abrirNuevoProducto}>
        <Text style={styles.botonNuevoProductoTexto}>+ NUEVO PRODUCTO</Text>
      </TouchableOpacity>

      <Text style={styles.etiquetaBusqueda}>Buscar producto (ver precio o editar):</Text>
      <TextInput
        style={styles.inputBusqueda}
        placeholder="Código o nombre"
        placeholderTextColor="#9E9E9E"
        value={busqueda}
        onChangeText={setBusqueda}
        onSubmitEditing={onBuscarManual}
        returnKeyType="search"
      />
      <TouchableOpacity style={styles.botonBuscar} onPress={onBuscarManual}>
        <Text style={styles.botonBuscarTexto}>BUSCAR</Text>
      </TouchableOpacity>

      <Modal
        visible={modalNuevo}
        transparent
        animationType="slide"
        onRequestClose={() => setModalNuevo(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Nuevo producto</Text>

            <Text style={styles.modalEtiqueta}>Nombre:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Azúcar"
              placeholderTextColor="#9E9E9E"
              value={nombreNuevo}
              onChangeText={setNombreNuevo}
              autoFocus
            />

            <Text style={styles.modalEtiqueta}>Precio:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 28.00"
              placeholderTextColor="#9E9E9E"
              value={precioNuevo}
              onChangeText={setPrecioNuevo}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.modalBoton, styles.modalCancelar]}
                onPress={() => setModalNuevo(false)}>
                <Text style={styles.botonBuscarTexto}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBoton, styles.modalGuardar]}
                onPress={guardarNuevoProducto}>
                <Text style={styles.botonBuscarTexto}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  logo: { width: 200, height: 200, marginBottom: 20 },
  bannerCarrito: { backgroundColor: '#4CAF50', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 20, width: '100%', alignItems: 'center' },
  bannerCarritoTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  botonEscanear: { width: LADO_BOTON, height: LADO_BOTON, backgroundColor: '#2196F3', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 28, elevation: 4 },
  botonEscanearTexto: { color: '#fff', fontSize: 34, fontWeight: 'bold', textAlign: 'center' },
  botonNuevoProducto: { width: '100%', backgroundColor: '#009688', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  botonNuevoProductoTexto: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  etiquetaBusqueda: { alignSelf: 'flex-start', fontSize: 18, color: '#000', marginBottom: 8 },
  inputBusqueda: { width: '100%', fontSize: 24, color: '#000', borderWidth: 2, borderColor: '#2196F3', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  botonBuscar: { width: '100%', backgroundColor: '#2196F3', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  botonBuscarTexto: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, elevation: 6 },
  modalTitulo: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 8, textAlign: 'center' },
  modalEtiqueta: { fontSize: 16, color: '#333', marginBottom: 6, marginTop: 10 },
  input: { fontSize: 20, borderWidth: 2, borderColor: '#2196F3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#000' },
  modalBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  modalBoton: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalCancelar: { backgroundColor: '#FF5252', marginRight: 8 },
  modalGuardar: { backgroundColor: '#4CAF50', marginLeft: 8 },
});
