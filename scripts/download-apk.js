#!/usr/bin/env node
/**
 * Descarga el APK del build más reciente de EAS y lo guarda como
 * MiTiendita.apk en la raíz del proyecto (nombre fijo, sin importar
 * cómo se llame el artefacto en el servidor de Expo).
 *
 * Uso: npm run download:apk
 */
const {execSync} = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DEST = path.join(__dirname, '..', 'MiTiendita.apk');

function ultimoBuild() {
  console.log('Buscando el build más reciente de Android...');
  const raw = execSync(
    'npx eas-cli build:list --platform android --limit 1 --non-interactive --json',
    {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']},
  );
  const builds = JSON.parse(raw);
  if (!builds.length) {
    throw new Error('No se encontraron builds de Android en esta cuenta.');
  }
  return builds[0];
}

function descargar(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = urlActual => {
      https
        .get(urlActual, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return request(res.headers.location);
          }
          if (res.statusCode !== 200) {
            reject(new Error('Error al descargar (' + res.statusCode + ')'));
            return;
          }
          res.pipe(file);
          file.on('finish', () => file.close(resolve));
        })
        .on('error', reject);
    };
    request(url);
  });
}

async function main() {
  const build = ultimoBuild();

  if (build.status !== 'FINISHED') {
    console.error(`El build más reciente está en estado "${build.status}", todavía no tiene APK listo.`);
    process.exit(1);
  }

  const url = build.artifacts && build.artifacts.buildUrl;
  if (!url) {
    console.error('El build más reciente no tiene un artefacto descargable.');
    process.exit(1);
  }

  console.log('Build:', build.id, '(' + build.status + ')');
  console.log('Descargando...');
  await descargar(url, DEST);
  console.log('\nListo: ' + DEST);
  console.log('Copia ese archivo a tu celular (USB, Drive, WhatsApp, etc.) y ábrelo para instalar.');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
