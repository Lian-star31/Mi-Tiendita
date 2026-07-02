/**
 * App.js
 * -----------------------------------------------------------------------------
 * Componente raíz. Configura la navegación entre pantallas e inicializa la
 * base de datos SQLite al arrancar.
 *
 * Navegación (stack):
 *   - Home    -> Pantalla de inicio (logo + botón escanear + búsqueda)
 *   - Scanner -> Cámara con detección automática de códigos de barras
 *   - Result  -> Resultado del escaneo (precio, stock, editar)
 * -----------------------------------------------------------------------------
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {initDatabase} from './db/database';
import HomeScreen from './screens/HomeScreen';
import ResultScreen from './screens/ResultScreen';
import BarcodeScanner from './components/BarcodeScanner';
import AgregarProductoScreen from './screens/AgregarProductoScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  // Controla la pantalla de carga mientras se prepara la base de datos.
  const [dbLista, setDbLista] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Inicializa la BD una sola vez al montar la app.
    (async () => {
      try {
        await initDatabase();
        setDbLista(true);
      } catch (e) {
        setError('No se pudo iniciar la base de datos: ' + e.message);
      }
    })();
  }, []);

  // Pantalla de carga / error mientras se prepara SQLite.
  if (!dbLista) {
    return (
      <View style={styles.loading}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Cargando catálogo de productos...</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {backgroundColor: '#2196F3'},
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {fontWeight: 'bold'},
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{title: 'Mi Tienda'}}
        />
        <Stack.Screen
          name="Scanner"
          component={BarcodeScanner}
          options={{title: 'Escanear código'}}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{title: 'Producto'}}
        />
        <Stack.Screen
          name="AgregarProducto"
          component={AgregarProductoScreen}
          options={{title: 'Agregar producto'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#000000',
  },
  error: {
    fontSize: 16,
    color: '#FF5252',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
