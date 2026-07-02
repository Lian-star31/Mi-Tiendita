import React, {useRef, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {RNCamera} from 'react-native-camera';
import {getProductoPorCodigo} from '../db/database';

export default function BarcodeScanner({navigation}) {
  const procesando = useRef(false);
  const [mensaje, setMensaje] = useState('Apunta la cámara al código de barras');

  const onBarCodeRead = async ({data}) => {
    if (procesando.current) return;
    procesando.current = true;
    setMensaje('Buscando producto...');

    try {
      const producto = await getProductoPorCodigo(data);
      if (producto) {
        navigation.replace('Result', {producto});
      } else {
        Alert.alert(
          'Producto nuevo',
          `Código: ${data}\n\n¿Qué producto es este?`,
          [
            {
              text: 'Buscar en catálogo',
              onPress: () => {
                navigation.replace('AgregarProducto', {codigoBarras: data});
              },
            },
            {
              text: 'Reintentar',
              onPress: () => {
                procesando.current = false;
                setMensaje('Apunta la cámara al código de barras');
              },
            },
            {
              text: 'Volver',
              onPress: () => navigation.goBack(),
              style: 'cancel',
            },
          ],
        );
      }
    } catch (e) {
      procesando.current = false;
      Alert.alert('Error', 'No se pudo leer el producto: ' + e.message);
    }
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
        </View>
      </RNCamera>

      <TouchableOpacity style={styles.botonVolver} onPress={() => navigation.goBack()}>
        <Text style={styles.botonTexto}>VOLVER</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000000'},
  camera: {flex: 1},
  overlay: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent'},
  marco: {width: 260, height: 160, borderWidth: 3, borderColor: '#2196F3', borderRadius: 12, backgroundColor: 'transparent'},
  mensaje: {marginTop: 20, color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20},
  botonVolver: {backgroundColor: '#9E9E9E', paddingVertical: 16, alignItems: 'center'},
  botonTexto: {color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'},
});
