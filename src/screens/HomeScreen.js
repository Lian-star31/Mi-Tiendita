import React, {useState, useEffect} from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {buscarProducto} from '../db/database';

const CM = 38;
const LADO_BOTON = Math.min(15 * CM, Dimensions.get('window').width - 40);

export default function HomeScreen({navigation}) {
  const [busqueda, setBusqueda] = useState('');
  const [nombreTienda, setNombreTienda] = useState('Mi Tienda');
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreTemp, setNombreTemp] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('nombre_tienda').then(v => {
      if (v) setNombreTienda(v);
    });
  }, []);

  const guardarNombre = async () => {
    if (!nombreTemp.trim()) return;
    await AsyncStorage.setItem('nombre_tienda', nombreTemp.trim());
    setNombreTienda(nombreTemp.trim());
    setEditandoNombre(false);
  };

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

      {editandoNombre ? (
        <View style={styles.editarNombreRow}>
          <TextInput
            style={styles.inputNombre}
            value={nombreTemp}
            onChangeText={setNombreTemp}
            placeholder="Nombre de tu tienda"
            autoFocus
          />
          <TouchableOpacity style={styles.btnGuardar} onPress={guardarNombre}>
            <Text style={styles.btnGuardarTexto}>✓</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={() => { setNombreTemp(nombreTienda); setEditandoNombre(true); }}>
          <Text style={styles.nombreTienda}>{nombreTienda} ✏️</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.botonEscanear}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Scanner')}>
        <Text style={styles.botonEscanearTexto}>ESCANEAR{'\n'}CÓDIGO</Text>
      </TouchableOpacity>

      <Text style={styles.etiquetaBusqueda}>Búsqueda manual:</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  logo: { width: 200, height: 200, marginBottom: 8 },
  nombreTienda: { fontSize: 28, fontWeight: 'bold', color: '#000', marginBottom: 20, textAlign: 'center' },
  editarNombreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  inputNombre: { flex: 1, fontSize: 22, borderBottomWidth: 2, borderColor: '#2196F3', paddingHorizontal: 8, color: '#000' },
  btnGuardar: { backgroundColor: '#2196F3', borderRadius: 8, padding: 10, marginLeft: 8 },
  btnGuardarTexto: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  botonEscanear: { width: LADO_BOTON, height: LADO_BOTON, backgroundColor: '#2196F3', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 28, elevation: 4 },
  botonEscanearTexto: { color: '#fff', fontSize: 34, fontWeight: 'bold', textAlign: 'center' },
  etiquetaBusqueda: { alignSelf: 'flex-start', fontSize: 18, color: '#000', marginBottom: 8 },
  inputBusqueda: { width: '100%', fontSize: 24, color: '#000', borderWidth: 2, borderColor: '#2196F3', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  botonBuscar: { width: '100%', backgroundColor: '#2196F3', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  botonBuscarTexto: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
});
