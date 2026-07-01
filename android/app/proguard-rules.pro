# Reglas de ProGuard específicas de la app.
# Por defecto ProGuard está desactivado (ver build.gradle).

# Mantener clases de react-native-sqlite-storage.
-keep class org.pgsqlite.** { *; }
