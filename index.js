/**
 * Punto de entrada de la aplicación.
 * Registra el componente raíz App con el nombre definido en app.json.
 */
import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
