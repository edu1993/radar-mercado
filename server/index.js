try {
  require('dotenv').config();
} catch {
  // Permite ejecutar con --env-file en entornos donde dotenv aún no fue instalado
}

const { initDatabase } = require('./db');
const { createApp } = require('./app');

const db = initDatabase();
const app = createApp({ db });

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Radar Mercado corriendo en http://0.0.0.0:${port}`);
});
