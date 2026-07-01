# Mi Tienda — App de gestión de abarrotes (100% offline)

Aplicación **Android** hecha con **React Native CLI** (sin Expo) para consultar
productos de una tienda de abarrotes escaneando su código de barras. Funciona
**completamente sin internet**: todos los datos se guardan en **SQLite local** y
persisten aunque se cierre la app.

---

## ✨ Características

- 📷 **Escáner de código de barras** nativo (`react-native-camera`) con detección automática.
- 🗄️ **Base de datos SQLite local** (`react-native-sqlite-storage`) — 100% offline.
- 🔍 Búsqueda manual por código o nombre.
- 💲 Edición de precios que se guardan de forma permanente.
- 📦 APK compilable y listo para Google Play Store.

---

## 🧱 Estructura del proyecto

```
MiTiendaApp/
├── index.js                 # Punto de entrada
├── app.json                 # Nombre de la app ("Mi Tienda")
├── package.json             # Dependencias exactas
├── babel.config.js
├── metro.config.js
├── src/
│   ├── App.js               # Navegación + inicialización de BD
│   ├── db/
│   │   └── database.js       # Crear/inicializar BD + funciones CRUD
│   ├── screens/
│   │   ├── HomeScreen.js      # Inicio (logo + botón escanear + búsqueda)
│   │   ├── ResultScreen.js    # Resultado del escaneo (precio, stock)
│   │   └── EditPriceModal.js  # Modal para editar precio
│   ├── components/
│   │   └── BarcodeScanner.js  # Cámara con detección de códigos
│   └── assets/
│       └── logo_tienda.png    # Logo placeholder (200x200)
└── android/                  # Configuración nativa de Android
```

---

## 🎨 Colores

| Uso                | Color      |
|--------------------|------------|
| Fondo              | `#FFFFFF`  |
| Botones primarios  | `#2196F3`  |
| Precio             | `#FF5252`  |
| Texto              | `#000000`  |
| Botón secundario   | `#9E9E9E`  |
| Botón guardar      | `#4CAF50`  |

---

## 🗃️ Base de datos

**Tabla `PRODUCTOS`:**

| Columna         | Tipo    | Notas               |
|-----------------|---------|---------------------|
| id              | INTEGER | PK autoincremental  |
| codigo_barras   | TEXT    | UNIQUE + INDEXED    |
| nombre          | TEXT    |                     |
| precio          | REAL    |                     |
| stock           | INTEGER |                     |

**Productos de ejemplo** (se insertan la primera vez):

| Código          | Nombre  | Precio | Stock |
|-----------------|---------|--------|-------|
| 7501234567890   | Aceite  | 12.50  | 100   |
| 7501234567891   | Azúcar  | 8.99   | 150   |
| 7501234567892   | Café    | 18.00  | 75    |

---

## 🚀 Puesta en marcha

> **Requisitos:** Node.js ≥ 16, JDK 17, Android SDK y (para compilar) Android Studio.

### Opción A — Proyecto ya inicializado

Si este repositorio ya contiene la carpeta `android/` completa con el
`gradle-wrapper.jar` y los scripts `gradlew`:

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar en un dispositivo/emulador conectado (modo desarrollo)
npm run android
```

### Opción B — Regenerar el andamiaje nativo (recomendado)

El binario `gradle-wrapper.jar` y los scripts `gradlew` **no** se versionan en
este repositorio (son binarios). La forma más fiable de obtener un proyecto
compilable es generar el andamiaje con la CLI oficial y luego copiar el código:

```bash
# 1. Crear un proyecto base con la misma versión de React Native
npx @react-native-community/cli@latest init MiTiendaApp --version 0.72.6

# 2. Copiar dentro de ese proyecto:
#    - la carpeta  src/
#    - index.js, app.json, package.json, babel.config.js, metro.config.js
#    - la carpeta  android/app/src/main/java/com/mitiendaapp/
#    - android/app/src/main/AndroidManifest.xml
#    - android/app/src/main/res/values/strings.xml y styles.xml
#    - android/app/build.gradle, android/build.gradle, android/gradle.properties

# 3. Instalar dependencias
cd MiTiendaApp
npm install
```

---

## 📦 Compilar el APK de release

```bash
cd android
./gradlew assembleRelease
```

El APK final quedará en:

```
android/app/build/outputs/apk/release/app-release.apk
```

> Por defecto el `build.gradle` firma el release con la clave de **debug** para
> que puedas generar un APK instalable de prueba de inmediato.

---

## 🔐 Firmar para Google Play Store

Para publicar necesitas tu propia clave de firma:

```bash
# 1. Generar keystore de release
keytool -genkeypair -v -storetype PKCS12 \
  -keystore my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 2. Colócalo en android/app/my-release-key.keystore
```

Añade en `android/gradle.properties` (¡no lo subas a git!):

```properties
MYAPP_UPLOAD_STORE_FILE=my-release-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=*****
MYAPP_UPLOAD_KEY_PASSWORD=*****
```

Luego genera el **App Bundle** para la Play Store:

```bash
cd android
./gradlew bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔄 Flujo de uso

1. Abres la app → ves la pantalla de inicio.
2. Tocas **ESCANEAR CÓDIGO** → se abre la cámara.
3. Apuntas al código de barras → se detecta automáticamente.
4. Se muestra el resultado con **precio** y **stock**.
5. Opcionalmente editas el precio → se guarda en SQLite.
6. Cierras la app → los datos persisten.
7. Sin internet → funciona igual.

---

## 📝 Notas técnicas

- **Sin permiso de INTERNET**: el `AndroidManifest.xml` no lo declara, reforzando
  el carácter 100% offline.
- **`react-native-camera`** está en modo mantenimiento. Se usa aquí por requisito
  explícito y es compatible con React Native 0.72. Para proyectos nuevos a largo
  plazo considera migrar a `react-native-vision-camera`.
- El `logo_tienda.png` es un **placeholder** blanco con borde; reemplázalo por el
  logo real de la tienda (200x200 px).
