const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Configuración de Metro (empaquetador de React Native).
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
