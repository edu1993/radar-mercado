function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es un JSON válido.' });
  }

  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos únicos.' });
  }

  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;

  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[errorHandler]', err);
  }

  return res.status(status).json({
    error: err?.message || 'Error interno del servidor.'
  });
}

module.exports = { errorHandler };
