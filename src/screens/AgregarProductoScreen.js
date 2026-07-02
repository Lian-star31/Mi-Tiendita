import React, {useState, useEffect} from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {buscarProductosPorNombre, vincularBarcode, insertarProducto} from '../db/database';

export default function AgregarProductoScreen({route, navigation}) {
  const {codigoBarras} = route.params;
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [precioNuevo, setPrecioNuevo] = useState('');

  useEffect(() => {
    if (busqueda.length >= 2) {
      buscarProductosPorNombre(busqueda).then(setSugerencias);
    } else {
      setSugerencias([]);
    }
  }, [busqueda]);

  const seleccionarProducto = (p) => {
    setProductoSeleccionado(p);
    setBusqueda(p.nombre);
    setSugerencias([]);
  };

  const guardar = async () => {
    try {
      if (productoSeleccionado) {
        // Vincular barcode a producto existente del catálogo
        await vincularBarcode(productoSeleccionado.id, codigoBarras);
        const producto = {...productoSeleccionado, codigo_barras: codigoBarras};
        navigation.replace('Result', {producto});
      } else if (nombreNuevo.trim() && precioNuevo) {
        // Producto completamente nuevo
        const precio = parseFloat(precioNuevo.replace(',', '.'));
        if (isNaN(precio)) {
          Alert.alert('Error', 'Ingresa un precio válido');
          return;
        }
        await insertarProducto({codigo: codigoBarras, nombre: nombreNuevo.trim(), precio});
        navigation.replace('Result', {
          producto: {codigo_barras: codigoBarras, nombre: nombreNuevo.trim(), precio},
        });
      } else {
        Alert.alert('Falta información', 'Busca el producto o escribe nombre y precio.');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Nuevo producto</Text>
      <Text style={styles.codigo}>Código: {codigoBarras}</Text>

      <Text style={styles.label}>Buscar en catálogo:</Text>
      <TextInput
        style={styles.input}
        placeholder="Escribe el nombre del producto..."
        placeholderTextColor="#9E9E9E"
        value={busqueda}
        onChangeText={t => { setBusqueda(t); setProductoSeleccionado(null); }}
      />

      {sugerencias.length > 0 && (
        <FlatList
          style={styles.lista}
          data={sugerencias}
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => (
            <TouchableOpacity style={styles.sugerencia} onPress={() => seleccionarProducto(item)}>
              <Text style={styles.sugerenciaNombre}>{item.nombre}</Text>
              <Text style={styles.sugerenciaPrecio}>${item.precio.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {productoSeleccionado && (
        <View style={styles.seleccionado}>
          <Text style={styles.seleccionadoTexto}>✓ {productoSeleccionado.nombre}</Text>
          <Text style={styles.seleccionadoPrecio}>Precio: ${productoSeleccionado.precio.toFixed(2)}</Text>
        </View>
      )}

      {!productoSeleccionado && (
        <>
          <Text style={styles.label}>O escribe nombre y precio manualmente:</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del producto"
            placeholderTextColor="#9E9E9E"
            value={nombreNuevo}
            onChangeText={setNombreNuevo}
          />
          <TextInput
            style={styles.input}
            placeholder="Precio (ej: 12.50)"
            placeholderTextColor="#9E9E9E"
            value={precioNuevo}
            onChangeText={setPrecioNuevo}
            keyboardType="decimal-pad"
          />
        </>
      )}

      <TouchableOpacity style={styles.botonGuardar} onPress={guardar}>
        <Text style={styles.botonTexto}>GUARDAR</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonCancelar} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelarTexto}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', padding: 20},
  titulo: {fontSize: 28, fontWeight: 'bold', color: '#000', marginBottom: 4},
  codigo: {fontSize: 16, color: '#666', marginBottom: 20},
  label: {fontSize: 18, color: '#333', marginBottom: 8, marginTop: 12},
  input: {fontSize: 20, borderWidth: 2, borderColor: '#2196F3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#000', marginBottom: 8},
  lista: {maxHeight: 220, borderWidth: 1, borderColor: '#ccc', borderRadius: 8},
  sugerencia: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee'},
  sugerenciaNombre: {fontSize: 16, color: '#000', flex: 1},
  sugerenciaPrecio: {fontSize: 16, color: '#2196F3', fontWeight: 'bold'},
  seleccionado: {backgroundColor: '#E3F2FD', borderRadius: 10, padding: 14, marginVertical: 10},
  seleccionadoTexto: {fontSize: 18, color: '#000', fontWeight: 'bold'},
  seleccionadoPrecio: {fontSize: 20, color: '#2196F3', marginTop: 4},
  botonGuardar: {backgroundColor: '#2196F3', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 20},
  botonTexto: {color: '#fff', fontSize: 22, fontWeight: 'bold'},
  botonCancelar: {alignItems: 'center', marginTop: 14},
  cancelarTexto: {fontSize: 18, color: '#9E9E9E'},
});
