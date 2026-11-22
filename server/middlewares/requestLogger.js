/**
 * Middleware de logging HTTP con morgan('tiny').
 * Se desactiva automáticamente cuando NODE_ENV=test para mantener limpia la salida de pruebas.
 */
function createRequestLogger() {
  if (process.env.NODE_ENV === 'test') {
    return (_req, _res, next) => next();
  }

  try {
    const morgan = require('morgan');
    return morgan('tiny');
  } catch {
    return (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms} ms`);
      });
      next();
    };
  }
}

module.exports = { createRequestLogger };
