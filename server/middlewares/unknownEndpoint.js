function unknownEndpoint(_req, res) {
  return res.status(404).json({ error: 'Ruta de API no encontrada.' });
}

module.exports = { unknownEndpoint };
