/**
 * HomeScreen.js
 * -----------------------------------------------------------------------------
 * Pantalla de inicio.
 *
 * Contiene:
 *   - Logo de la tienda (200x200px, centrado)
 *   - Nombre de la tienda (texto grande, 28px)
 *   - Botón grande "ESCANEAR CÓDIGO" (~15cm x 15cm, azul)
 *   - Campo de búsqueda manual (texto 24px)
 * -----------------------------------------------------------------------------
 */
import React, {useState} from 'react';
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

import {buscarProducto} from '../db/database';

// Nombre de la tienda (dato temporal solicitado).
const NOMBRE_TIENDA = 'Mi Tienda';

// Aproximación de 15 cm en píxeles independientes de densidad.
// 1 cm ≈ 38 dp. Se limita al ancho de pantalla para que quepa.
const CM = 38;
const LADO_BOTON = Math.min(15 * CM, Dimensions.get('window').width - 40);

export default function HomeScreen({navigation}) {
  const [busqueda, setBusqueda] = useState('');

  /**
   * Búsqueda manual: consulta SQLite por código o nombre y navega al
   * resultado. Si no hay coincidencias, avisa al usuario.
   */
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
      {/* Logo de la tienda */}
      <Image
        source={require('../assets/logo_tienda.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Nombre de la tienda */}
      <Text style={styles.nombreTienda}>{NOMBRE_TIENDA}</Text>

      {/* Botón grande para abrir la cámara y escanear */}
      <TouchableOpacity
        style={styles.botonEscanear}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Scanner')}>
        <Text style={styles.botonEscanearTexto}>ESCANEAR{'\n'}CÓDIGO</Text>
      </TouchableOpacity>

      {/* Campo de búsqueda manual */}
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 12,
  },
  nombreTienda: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 24,
    textAlign: 'center',
  },
  botonEscanear: {
    width: LADO_BOTON,
    height: LADO_BOTON,
    backgroundColor: '#2196F3',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    elevation: 4,
  },
  botonEscanearTexto: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  etiquetaBusqueda: {
    alignSelf: 'flex-start',
    fontSize: 18,
    color: '#000000',
    marginBottom: 8,
  },
  inputBusqueda: {
    width: '100%',
    fontSize: 24,
    color: '#000000',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  botonBuscar: {
    width: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonBuscarTexto: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
