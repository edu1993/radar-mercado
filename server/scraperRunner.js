const { spawn } = require('node:child_process');
const path = require('node:path');

const REGISTRY_SCRIPT = path.join(__dirname, '..', 'scrapers', 'registry.py');
const TIMEOUT_MS = 120_000;
const KILL_GRACE_MS = 2_000;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

function terminateProcess(child) {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
  const forceTimer = setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch {
      // El proceso ya finalizó
    }
  }, KILL_GRACE_MS);
  if (typeof forceTimer.unref === 'function') forceTimer.unref();
}

function runMarketplaceScraper({ source = 'precios_claros_tl', term, limit = 150 }) {
  return new Promise((resolve, reject) => {
    const python = process.env.PYTHON || 'python3';
    const child = spawn(
      python,
      [REGISTRY_SCRIPT, '--source', source, '--term', term, '--limit', String(limit)],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let tooLarge = false;

    const timer = setTimeout(() => {
      timedOut = true;
      terminateProcess(child);
    }, TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) > MAX_OUTPUT_BYTES) {
        tooLarge = true;
        terminateProcess(child);
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-3000);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error('La búsqueda excedió el límite de 120 segundos.'));
      if (tooLarge) return reject(new Error('El extractor superó el tamaño máximo de respuesta.'));
      if (code !== 0) return reject(new Error(stderr.trim() || `El extractor falló con código ${code}.`));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('El extractor no devolvió un JSON válido.'));
      }
    });
  });
}

module.exports = { runMarketplaceScraper };
