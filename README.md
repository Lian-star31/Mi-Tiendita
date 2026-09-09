# MiTiendita — Punto de venta offline para tiendas de abarrotes

Aplicación **Android** hecha con **React Native CLI** (sin Expo) pensada para
que el dueño o encargado de una tienda pequeña escanee productos, arme una
venta y calcule el cambio, todo **sin conexión a internet**. Los datos viven en
**SQLite local** y persisten aunque se cierre la app o no haya internet.

Diseñada con botones e interfaz grandes/simples, pensada para personas
mayores de 60 años.

---

## ✨ Funcionalidad actual

- 📷 **Escaneo continuo**: la cámara se queda activa, cada código escaneado se
  agrega solo al carrito (cooldown de 1.5s entre lecturas para evitar
  duplicados). No hay que navegar a otra pantalla entre productos.
- 🛒 **Carrito de venta**: cantidades, subtotales y total en vivo. Botón
  "NUEVA VENTA" para vaciarlo y volver directo a la cámara.
- 💵 **Cobro con cambio**: se ingresa el efectivo recibido y se muestra al
  instante el cambio a entregar (o cuánto falta si no alcanza).
- 🏷️ **Editar precio directo al escanear**: el aviso que aparece tras cada
  escaneo (nombre + precio) incluye un botón "EDITAR PRECIO" que abre el
  modal ahí mismo, sin tener que buscar el producto de nuevo. Ese aviso es
  solo una confirmación temporal del último escaneo: se reemplaza con cada
  nuevo producto y desaparece por completo al vaciar el carrito.
- ➕ **Productos sin código de barras** (a granel): botón "+ NUEVO PRODUCTO"
  con nombre + precio. Si el nombre ya existe, avisa "Producto existente" en
  vez de duplicarlo.
- 🔍 **Búsqueda manual** por código o nombre, con prioridad a coincidencia
  exacta; si hay varias coincidencias parciales sin una exacta, se muestra
  una lista corta para elegir en vez de adivinar.
- 🗄️ **Catálogo precargado**: ~1,829 productos con nombre, precio y código de
  barras real, importados una sola vez desde un Excel del negocio
  (`src/db/seedData.js`). 100% offline vía `react-native-sqlite-storage`.

---

## 🧱 Estructura del proyecto

```
MiTiendaApp/
├── index.js                    # Punto de entrada
├── app.json                    # Nombre de la app ("MiTiendita")
├── package.json                # Dependencias exactas
├── babel.config.js
├── metro.config.js
├── eas.json                    # Perfiles de build para EAS (preview/production)
├── scripts/
│   └── download-apk.js         # Descarga el build más reciente de EAS y lo
│                                # guarda como MiTiendita.apk (npm run download:apk)
├── src/
│   ├── App.js                  # Navegación (stack) + inicialización de BD
│   ├── context/
│   │   └── CarritoContext.js   # Estado del carrito (cantidades, total) vía Context
│   ├── db/
│   │   ├── database.js         # Crear/migrar BD + funciones CRUD
│   │   └── seedData.js         # Catálogo inicial (~1,829 productos)
│   ├── screens/
│   │   ├── HomeScreen.js       # Inicio: logo, escanear, +nuevo producto, buscar
│   │   ├── ResultScreen.js     # Resultado de búsqueda manual (agregar/editar)
│   │   ├── CarritoScreen.js    # Carrito, cobro y cambio
│   │   └── EditPriceModal.js   # Modal para editar precio (reusado en 2 lugares)
│   ├── components/
│   │   └── BarcodeScanner.js   # Cámara con detección continua de códigos
│   └── assets/
│       └── logo_tienda.png     # Logo de la app (perico/loro)
└── android/                    # Configuración nativa de Android
```

---

## 🗃️ Base de datos

**Tabla `PRODUCTOS`:**

| Columna         | Tipo    | Notas                                   |
|-----------------|---------|------------------------------------------|
| id              | INTEGER | PK autoincremental                       |
| codigo_barras   | TEXT    | UNIQUE + INDEXED, puede ser NULL (a granel) |
| nombre          | TEXT    | NOT NULL                                 |
| precio          | REAL    |                                           |
| stock           | INTEGER |                                           |

El catálogo se carga una sola vez (primer arranque) desde `seedData.js`.
En cada arranque se corre además una migración segura que corrige códigos de
barras de 11 dígitos que perdieron el cero inicial al leer el Excel original
(UPC-A real son 12 dígitos) — no borra ni duplica datos existentes.

---

## 🚀 Puesta en marcha (desarrollo local)

> **Requisitos:** Node.js ≥ 16, JDK 17, Android SDK y (para compilar) Android Studio.

```bash
npm install
npm run android   # con un dispositivo/emulador conectado
```

---

## 📦 Compilar y descargar el APK (EAS Build)

El proyecto está configurado para compilar en la nube con EAS (no requiere
Android Studio en la máquina que solo quiere generar el APK):

```bash
cd /Users/lianpalafox/Desktop/MiTiendaApp
npx eas-cli build -p android --profile preview
```

Cuando el build termine, para obtener el archivo ya nombrado
`MiTiendita.apk` (sin renombrar nada a mano):

```bash
cd /Users/lianpalafox/Desktop/MiTiendaApp
npm run download:apk
```

Esto crea `MiTiendita.apk` en la raíz del proyecto. Cópialo al celular (USB,
Drive, WhatsApp, etc.) y ábrelo para instalar (activar "instalar de fuentes
desconocidas" si Android lo pide).

### Build local (alternativa sin EAS)

```bash
cd android
./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔐 Firmar para Google Play Store

Para publicar en la Play Store (distinto del APK interno de EAS) necesitas tu
propia clave de firma:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Colócalo en `android/app/my-release-key.keystore` y agrega en
`android/gradle.properties` (¡no lo subas a git!):

```properties
MYAPP_UPLOAD_STORE_FILE=my-release-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=*****
MYAPP_UPLOAD_KEY_PASSWORD=*****
```

```bash
cd android
./gradlew bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔄 Flujo de uso típico

1. Abre la app → pantalla de inicio con el logo.
2. Toca **ESCANEAR CÓDIGO** → la cámara queda activa.
3. Escanea productos uno tras otro → cada uno se agrega solo al carrito
   (aviso verde con nombre + precio + opción de editar precio ahí mismo).
4. Si un código no está registrado, pide nombre + precio y lo agrega también.
5. Toca **VER CARRITO** → ajusta cantidades si hace falta.
6. Toca **COBRAR** → ingresa el efectivo recibido → aparece el cambio a
   entregar.
7. **FINALIZAR VENTA** o **NUEVA VENTA** → vacía el carrito y regresa a
   escanear, listo para el siguiente cliente.

Todo funciona sin internet; los datos y precios quedan guardados en el
celular entre sesiones.

---

## 📝 Notas técnicas

- **Sin permiso de INTERNET**: el `AndroidManifest.xml` no lo declara,
  reforzando el carácter 100% offline de la app en tiempo de ejecución (EAS sí
  necesita internet para compilar, no para correr la app instalada).
- **`react-native-camera`** está en modo mantenimiento pero es compatible con
  React Native 0.72. Para proyectos nuevos a largo plazo considerar migrar a
  `react-native-vision-camera`.
- Kotlin fijado en `1.8.0` (ver `android/build.gradle` y `android/app/build.gradle`)
  y `@react-native-async-storage/async-storage` en `1.23.0` por compatibilidad
  con React Native 0.72.6.
