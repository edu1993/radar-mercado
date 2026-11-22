const fs = require('node:fs/promises');
const path = require('node:path');
const { computePriceSummary } = require('./utils/stats');

const PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'supermercados.yml');

const PROMPT_INJECTION_PATTERNS = [
  /ignor[aá]\s+(todas\s+)?(las|tus)\s+instrucciones/i,
  /olvid[aá]\s+(todas\s+)?(las|tus)\s+(reglas|instrucciones)/i,
  /system\s*prompt/i,
  /actu[aá]\s+como\s+(un|una)?\s*(programador|abogado|m[eé]dico|profesor|hacker|poeta)/i,
  /dame\s+un\s+c[oó]digo\s+(en\s+)?(python|javascript|java|c\+\+|html|sql)/i,
  /resolv[eé]\s+(esta\s+)?(ecuaci[oó]n|integral|derivada|tarea)/i
];

function isBlockedOffTopicPrompt(text = '') {
  const clean = String(text || '').trim();
  if (!clean) return false;
  return PROMPT_INJECTION_PATTERNS.some((rx) => rx.test(clean));
}

function buildOffTopicRefusal(study) {
  const term = study?.term || 'tu búsqueda';
  return {
    badge: 'Fuera de alcance',
    reply: `Solo puedo ayudarte a analizar precios de supermercado y elegir dónde te conviene comprar "${term}". Probá preguntándome en qué súper está más barato o qué marca conviene.`,
    verdict: null,
    quickReplies: [
      '¿Dónde me conviene comprar?',
      'Mejor precio por kg/litro',
      'Menor precio seguro'
    ],
    recommendations: []
  };
}

function computeBasketByStore(products = [], searchItems = []) {
  const itemsList = Array.isArray(searchItems) && searchItems.length > 0
    ? searchItems
    : Array.from(new Set(products.map((p) => p.searchItem).filter(Boolean)));

  if (itemsList.length <= 1) {
    return null;
  }

  const byStore = new Map();
  const globalBestByItem = new Map();

  for (const prod of products) {
    if (typeof prod.price !== 'number' || prod.price <= 0 || !prod.searchItem) continue;
    const store = prod.source || prod.seller || 'Supermercado';
    const itemKey = prod.searchItem;

    if (!byStore.has(store)) byStore.set(store, new Map());
    const storeItems = byStore.get(store);
    const prev = storeItems.get(itemKey);
    if (!prev || prod.price < prev.price) {
      storeItems.set(itemKey, prod);
    }

    const prevGlobal = globalBestByItem.get(itemKey);
    if (!prevGlobal || prod.price < prevGlobal.price) {
      globalBestByItem.set(itemKey, prod);
    }
  }

  const rankingPorSupermercado = Array.from(byStore.entries())
    .map(([supermercado, itemMap]) => {
      const detalle = itemsList.map((item) => {
        const match = itemMap.get(item);
        return match
          ? { item, titulo: match.title, marca: match.brand || null, envase: match.packSize || null, precioARS: match.price, precioPorUnidad: match.unitPrice && match.unitBase ? `$${Math.round(match.unitPrice)}/${match.unitBase}` : null, url: match.url || null }
          : { item, titulo: null, marca: null, envase: null, precioARS: null, precioPorUnidad: null, url: null };
      });
      const encontrados = detalle.filter((d) => d.precioARS !== null).length;
      const totalARS = detalle.reduce((acc, d) => acc + (d.precioARS || 0), 0);
      return {
        supermercado,
        itemsEncontrados: encontrados,
        totalItemsPedidos: itemsList.length,
        listaCompleta: encontrados === itemsList.length,
        totalChanguitoARS: Math.round(totalARS),
        detalle
      };
    })
    .sort((a, b) => {
      if (a.listaCompleta !== b.listaCompleta) return a.listaCompleta ? -1 : 1;
      return a.totalChanguitoARS - b.totalChanguitoARS;
    });

  const detalleOptimoCombinado = itemsList.map((item) => {
    const best = globalBestByItem.get(item);
    return best
      ? { item, supermercado: best.source || best.seller, titulo: best.title, precioARS: best.price, url: best.url || null }
      : { item, supermercado: null, titulo: null, precioARS: null, url: null };
  });

  const totalOptimoCombinadoARS = Math.round(
    detalleOptimoCombinado.reduce((acc, d) => acc + (d.precioARS || 0), 0)
  );
  const mejorUnicoSuper = rankingPorSupermercado.find((r) => r.listaCompleta) || null;

  return {
    itemsBuscados: itemsList,
    rankingPorSupermercado,
    changuitoCombinadoOptimo: {
      totalARS: totalOptimoCombinadoARS,
      ahorroVsMejorUnicoSuperARS: mejorUnicoSuper
        ? Math.max(0, mejorUnicoSuper.totalChanguitoARS - totalOptimoCombinadoARS)
        : 0,
      detalle: detalleOptimoCombinado
    }
  };
}

function buildCompactContext(study) {
  const priced = (study.products || [])
    .filter((p) => typeof p.price === 'number' && p.price > 0)
    .sort((a, b) => a.price - b.price);
  const summary = computePriceSummary(priced);

  const byStoreMap = new Map();
  for (const item of priced) {
    const storeName = item.source || item.seller || 'Supermercado';
    if (!byStoreMap.has(storeName)) byStoreMap.set(storeName, []);
    byStoreMap.get(storeName).push(item);
  }
  const resumenPorSupermercado = Array.from(byStoreMap.entries()).map(([supermercado, items]) => {
    const st = computePriceSummary(items);
    return {
      supermercado,
      cantidadProductos: st.count,
      medianaARS: st.median,
      minimoARS: st.min,
      maximoARS: st.max
    };
  }).sort((a, b) => (a.medianaARS ?? Infinity) - (b.medianaARS ?? Infinity));

  const searchItems = Array.isArray(study.searchItems) && study.searchItems.length > 0
    ? study.searchItems
    : [study.term];
  const isBasket = Boolean(study.isBasket) || searchItems.length > 1;
  const basketSummary = isBasket ? computeBasketByStore(priced, searchItems) : null;

  // En modo changuito, balancea las ofertas por cada ítem para que ningún producto desplace a otro
  let selectedOffers = priced.slice(0, 120);
  if (isBasket) {
    const perItemCap = Math.max(15, Math.floor(120 / searchItems.length));
    selectedOffers = [];
    for (const itemTerm of searchItems) {
      const subset = priced.filter((p) => p.searchItem === itemTerm).slice(0, perItemCap);
      selectedOffers.push(...subset);
    }
  }

  return {
    fuente: study.source || 'Todos los Supermercados',
    terminoBusqueda: study.term,
    esChanguito: isBasket,
    itemsBuscados: searchItems,
    capturadoEn: study.capturedAt,
    totalCapturados: summary.count,
    medianaARS: summary.median,
    minimoARS: summary.min,
    maximoARS: summary.max,
    resumenPorSupermercado,
    ...(basketSummary ? { resumenChanguitoPorSupermercado: basketSummary } : {}),
    ofertasOrdenadasPorMenorPrecio: selectedOffers.map((p) => ({
      id: p.id,
      itemLista: p.searchItem || study.term,
      titulo: p.title,
      precioARS: p.price,
      envase: p.packSize ?? null,
      precioPorUnidad: p.unitPrice && p.unitBase ? `$${Math.round(p.unitPrice)}/${p.unitBase}` : null,
      precioListaARS: p.listPrice ?? null,
      descuentoPct: p.discountPct ?? 0,
      supermercado: p.source ?? null,
      marca: p.brand ?? null,
      vendedor: p.seller ?? null,
      url: p.url ?? null
    }))
  };
}

function parseModelJson(rawText) {
  const cleaned = String(rawText || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function askGeminiCopilot({ study, messages }) {
  const lastUserMsg = [...(messages || [])].reverse().find((m) => m.role === 'user');
  if (lastUserMsg && isBlockedOffTopicPrompt(lastUserMsg.text)) {
    return buildOffTopicRefusal(study);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('Falta configurar GEMINI_API_KEY en el entorno del backend.');
    err.status = 503;
    throw err;
  }

  const { GoogleGenAI } = require('@google/genai');
  const client = new GoogleGenAI({ apiKey });
  const basePrompt = await fs.readFile(PROMPT_FILE, 'utf8');
  const context = buildCompactContext(study);

  const jsonContract = `
DEVOLVÉ SIEMPRE UN JSON VÁLIDO con esta estructura exacta (sin texto fuera del JSON):
{
  "badge": "Etiqueta corta (ej: Mejor Supermercado, Changuito Óptimo, Mejor Precio/Kg, Fuera de alcance)",
  "reply": "Análisis conciso y directo en español rioplatense con veredicto claro. Si la pregunta NO es sobre supermercados, compras o los productos del estudio, rechazala amablemente diciendo que solo podés analizar precios de supermercado y dónde conviene comprar.",
  "verdict": {
    "fairRange": "Rango justo P25–P50 o total del changuito en ARS (null si es fuera de alcance)",
    "avoidAbove": "Precio caro a evitar en ARS (null si no aplica)"
  },
  "quickReplies": ["2 a 3 preguntas cortas de seguimiento SOLO sobre esta compra"],
  "recommendations": [
    {
      "id": "id exacto del producto en la muestra",
      "title": "título exacto",
      "price": 1234,
      "reason": "por qué conviene (supermercado, tamaño, descuento o ahorro vs mediana)",
      "url": "url exacta de la muestra"
    }
  ]
}
Incluí como máximo 4 recomendaciones reales tomadas EXCLUSIVAMENTE de ofertasOrdenadasPorMenorPrecio. Si el tema está fuera de alcance, devolvé recommendations: [] y verdict: null.
`;

  const historyText = (messages || [])
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'USUARIO' : 'ASISTENTE'}: ${m.text}`)
    .join('\n');

  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${basePrompt}\n\n${jsonContract}\n\nDATOS REALES DEL ESTUDIO:\n${JSON.stringify(context)}\n\nCONVERSACIÓN:\n${historyText}`
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.25
    }
  });

  const parsed = parseModelJson(response.text);
  const validById = new Map((study.products || []).map((p) => [p.id, p]));
  const safeRecs = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
        .filter((r) => r && validById.has(r.id))
        .slice(0, 4)
        .map((r) => {
          const orig = validById.get(r.id);
          return {
            id: orig.id,
            title: orig.title,
            brand: orig.brand || null,
            price: orig.price,
            unitPrice: orig.unitPrice ? Math.round(orig.unitPrice) : null,
            unitBase: orig.unitBase || null,
            reason: String(r.reason || orig.source || 'Opción destacada'),
            url: orig.url
          };
        })
    : [];

  return {
    badge: String(parsed.badge || 'Co-piloto Súper'),
    reply: String(parsed.reply || 'No pude generar un análisis en este momento.'),
    verdict: parsed.verdict || null,
    quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies.slice(0, 4) : [],
    recommendations: safeRecs
  };
}

async function generateSearchVariations({ term, medianPrice }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('Falta configurar GEMINI_API_KEY en el entorno del backend.');
    err.status = 503;
    throw err;
  }

  const { GoogleGenAI } = require('@google/genai');
  const client = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const prompt = `El usuario buscó "${term}" en supermercados de Argentina (mediana aproximada: ${medianPrice ? '$' + Math.round(medianPrice) + ' ARS' : 'desconocida'}).
Devolvé SOLO un JSON válido con 3 búsquedas alternativas útiles de supermercado (ej: marcas más económicas, presentaciones de mayor rendimiento o sustitutos):
{"variations":[{"angle":"Marca económica","term":"...","why":"..."},{"angle":"Presentación rendidora","term":"...","why":"..."},{"angle":"Alternativa similar","term":"...","why":"..."}]}`;

  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { responseMimeType: 'application/json', temperature: 0.4 }
  });

  const parsed = parseModelJson(response.text);
  return Array.isArray(parsed.variations) ? parsed.variations.slice(0, 3) : [];
}


async function filterRelevantProductsWithAI({ products = [], searchItems = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !Array.isArray(products) || products.length === 0) {
    return { products, removedCount: 0, aiFiltered: false };
  }

  try {
    const { GoogleGenAI } = require('@google/genai');
    const client = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

    const compact = products.slice(0, 160).map((p) => ({
      id: p.id,
      buscado: p.searchItem || searchItems[0] || '',
      titulo: p.title,
      marca: p.brand || null,
      precio: p.price
    }));

    const prompt = `Sos un filtro estricto de productos de supermercado argentino.
El usuario buscó estos productos: ${JSON.stringify(searchItems)}.
Analizá la lista y devolvé ÚNICAMENTE los IDs de productos que SON realmente lo que el usuario quiso comprar.

REGLAS ESTRICTAS DE DESCARTE:
- Si buscó "azucar", DESCARTÁ chicles con azúcar, gaseosas sin azúcar, galletitas, golosinas, edulcorantes o postres; dejá SOLO paquetes/sobres de azúcar.
- Si buscó "aceite", DESCARTÁ atún/pescado en aceite, aceites aromatizantes/corporales/esenciales/de motor; dejá SOLO aceites comestibles de cocina.
- Si buscó "arroz", DESCARTÁ condimentos para arroz, galletas/tostadas/copos/cereales de arroz, alfajores o postres; dejá SOLO paquetes de arroz.
- Si buscó "leche", DESCARTÁ dulce de leche, cremas corporales, jabones, chocolates o postres; dejá SOLO leche líquida o en polvo.
- Si buscó "fernet", DESCARTÁ vasos, hielos o accesorios; dejá SOLO botellas/latas de fernet.
- Aplicá el mismo criterio de sentido común para cualquier otro alimento o bebida, y descartá precios claramente rotos o absurdos.

Devolvé SOLO un JSON válido con esta estructura exacta:
{"keepIds": ["id1", "id2"]}

LISTA DE PRODUCTOS:
${JSON.stringify(compact)}`;

    const response = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', temperature: 0 }
    });

    const parsed = parseModelJson(response.text);
    if (!Array.isArray(parsed?.keepIds)) {
      return { products, removedCount: 0, aiFiltered: false };
    }

    const keepSet = new Set(parsed.keepIds.map(String));
    const kept = products.filter((prod) => keepSet.has(String(prod.id)));

    // Seguridad: si la IA devolvió vacío por error de formato, mantenemos los productos originales
    if (kept.length === 0) {
      return { products, removedCount: 0, aiFiltered: false };
    }

    return {
      products: kept,
      removedCount: Math.max(0, products.length - kept.length),
      aiFiltered: true
    };
  } catch {
    return { products, removedCount: 0, aiFiltered: false };
  }
}

module.exports = {
  askGeminiCopilot,
  generateSearchVariations,
  computeBasketByStore,
  isBlockedOffTopicPrompt,
  buildCompactContext,
  filterRelevantProductsWithAI
};
