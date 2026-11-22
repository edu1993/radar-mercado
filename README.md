# Radar Mercado — Comparador de Supermercados (Trenque Lauquen)

Aplicación web full stack de análisis estadístico de precios de supermercado y co-piloto de compra con inteligencia artificial. Permite relevar productos reales de góndola en ARS sin necesidad de login ni proxies, detectar precios fuera de rango (*outliers*), comparar ofertas entre cadenas, guardar estudios con notas y favoritos en SQLite y consultar a Gemini para elegir la mejor relación precio/tamaño.

## Qué hace el proyecto

- **Relevamiento real de supermercados:** Consulta precios oficiales diarios en **Precios Claros SEPA (geolocalizado en Trenque Lauquen y zona)**, **Supermercados DIA%** (Mitre 56 y Simini 572), **Carrefour AR**, **Más Online (ChangoMás)** y ofrece un modo **Comparar Todos** que consulta las cuatro fuentes en paralelo y ordena por menor precio.
- **Análisis estadístico interactivo:** Calcula mediana (P50), rango intercuartílico (P25–P75), mínimo/P10, media, máximo/P90, coeficiente de variación (dispersión), detección de *outliers* e histograma interactivo por rangos de precio.
- **Gestión completa de estudios:** Historial persistido por usuario en SQLite con filtros por supermercado/texto, marcado de favoritos, edición de notas personales (`PUT`), resumen estadístico general (`GET /api/search-history/resumen`), comparador de hasta 3 productos y exportación a CSV.
- **Co-piloto de góndola con IA:** Chat contextual impulsado por Gemini especializado en compras de supermercado (evalúa precio por kilo/litro, packs chicos engañosos y descuentos reales) con historial persistido por estudio en SQLite.
- **Arquitectura extensible para más supermercados locales:** Preparada mediante el patrón *Adapter/Registry* para sumar **Cooperativa Obrera (Trenque Lauquen)**, **La Anónima (Trenque Lauquen)** y **Diarco (Trenque Lauquen)** sin modificar el frontend ni el núcleo de rutas.

## Tecnologías empleadas

- **Frontend:** React 19, Vite 6, Tailwind CSS, Axios, Recharts, Lucide React.
- **Backend:** Node.js, Express 5, `cors`, `morgan`, `dotenv`, `express-rate-limit`, autenticación con `scrypt` + sesiones persistentes y middlewares modulares de logging y manejo de errores.
- **Base de datos:** SQLite (`better-sqlite3` en modo WAL) con tablas normalizadas (`sources`, `users`, `sessions`, `studies`, `assistant_messages`, `ip_events`).
- **Extractores:** Python 3 (`requests`) bajo una interfaz común (`MarketplaceScraper` + `VtexSupermarketScraper`) con ejecución concurrente para comparativas multicadena.
- **Asistente IA:** Google Gemini (`@google/genai`).
- **Testing y CI:** `node:test` (tests unitarios e integración HTTP con SQLite `:memory:`), `unittest` de Python para scrapers y GitHub Actions (`.github/workflows/ci.yml`).

## Cómo levantar el proyecto en local

### Requisitos previos
- **Node.js** 20 o superior (recomendado Node 22)
- **Python** 3.10 o superior

### 1. Configurar variables de entorno
```bash
cp .env.example .env
```
Cargá tu `GEMINI_API_KEY` en `.env` (y opcionalmente `PYTHON=.venv/bin/python` si usás entorno virtual en Ubuntu).

### 2. Instalar dependencias (Node + Python)
```bash
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r scrapers/requirements.txt
```

### 3. Iniciar en modo desarrollo
```bash
# Backend (nodemon) + Frontend (Vite) juntos
npm run dev:all
```
La aplicación queda disponible en `http://localhost:4173` (con proxy automático a `/api` en `http://127.0.0.1:3000`).

### 4. Compilar y ejecutar en producción
```bash
npm run build
npm start
```

## Cómo ejecutar los tests y probar el extractor

```bash
# Tests unitarios + integración API con SQLite en memoria
npm test

# Tests de los extractores Python (sin depender de internet)
npm run test:scrapers

# Probar scraping en vivo desde la terminal (Trenque Lauquen — DIA% o todos los súper)
python3 scrapers/registry.py --source precios_claros_tl --term "yerba mate" --limit 20 | python3 -m json.tool
python3 scrapers/registry.py --source dia_ar --term "yerba mate" --limit 20 | python3 -m json.tool
python3 scrapers/registry.py --source todos_supermercados --term "leche" --limit 30 | python3 -m json.tool
```

## Principales rutas de la API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Estado de salud del servidor y SQLite |
| `GET` | `/api/info` | Resumen del servicio (estudios, usuarios, supermercados y hora) |
| `GET` | `/api/sources` | Catálogo de supermercados activos y planificados (`?active=true`) |
| `POST` | `/api/auth/register` | Alta de cuenta con validación y sesión Bearer |
| `POST` | `/api/auth/login` | Inicio de sesión con protección contra fuerza bruta |
| `GET` | `/api/auth/me` | Verifica sesión activa |
| `POST` | `/api/auth/logout` | Cierra la sesión actual |
| `POST` | `/api/search` | Ejecuta búsqueda real en supermercados o recupera caché reciente |
| `POST` | `/api/search/variations` | Genera 3 búsquedas alternativas con Gemini |
| `GET` | `/api/search-history` | Lista estudios del usuario (`?source=`, `?q=`, `?favorite=true`) |
| `GET` | `/api/search-history/resumen` | Resumen agregado del historial del usuario |
| `GET` | `/api/search-history/:id` | Obtiene el detalle completo de un estudio |
| `PUT` | `/api/search-history/:id` | Edita título, notas, categoría o favorito de un estudio |
| `DELETE` | `/api/search-history/:id` | Elimina un estudio puntual |
| `DELETE` | `/api/search-history` | Vacía el historial completo del usuario |
| `GET` | `/api/assistant/chat/:studyId` | Recupera la conversación persistida del co-piloto |
| `POST` | `/api/assistant/chat` | Envía una consulta al co-piloto Gemini |

## Despliegue en producción

El repositorio incluye `Dockerfile` y `render.yaml` listos para desplegar en Render, Railway o Fly.io configurando `GEMINI_API_KEY` en las variables de entorno de la plataforma.


## APP online
link: [radar-mercado](https://radar-mercado-jobq.onrender.com/)
