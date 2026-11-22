/**
 * Catálogo centralizado de fuentes de supermercados para Trenque Lauquen y Argentina.
 * Incluye la red oficial Precios Claros (SEPA) geolocalizada en Trenque Lauquen,
 * cadenas VTEX en vivo y espacios preparados para futuros adaptadores directos.
 */

function buildSourcesCatalog() {
  return {
    precios_claros_tl: {
      key: 'precios_claros_tl',
      name: 'Precios Claros (Trenque Lauquen)',
      active: true,
      status: 'active',
      localTrenqueLauquen: true,
      branches: ['DIA Mitre 56', 'Naldo Villegas 202', 'Red SEPA Regional'],
      region: 'AR',
      currency: 'ARS',
      maxLimit: 200,
      baseUrl: 'https://www.preciosclaros.gob.ar',
      notes: 'API oficial SEPA actualizada diariamente por sucursales de Trenque Lauquen y zona.'
    },
    todos_supermercados: {
      key: 'todos_supermercados',
      name: 'Todos los supermercados',
      active: true,
      status: 'active',
      localTrenqueLauquen: true,
      branches: ['Multifuente'],
      region: 'AR',
      currency: 'ARS',
      maxLimit: 200,
      baseUrl: 'https://www.preciosclaros.gob.ar',
      notes: 'Consulta las 4 fuentes activas en paralelo para detectar el menor precio.'
    },
    dia_ar: {
      key: 'dia_ar',
      name: 'Supermercados DIA% (Trenque Lauquen)',
      active: true,
      status: 'active',
      localTrenqueLauquen: true,
      branches: ['Mitre 56', 'Simini 572'],
      region: 'AR',
      currency: 'ARS',
      maxLimit: 200,
      baseUrl: 'https://diaonline.supermercadosdia.com.ar',
      notes: 'Sucursales en Trenque Lauquen. Catálogo online en tiempo real en ARS.'
    },
    carrefour_ar: {
      key: 'carrefour_ar',
      name: 'Carrefour AR',
      active: true,
      status: 'active',
      localTrenqueLauquen: false,
      branches: ['Referencia Nacional'],
      region: 'AR',
      currency: 'ARS',
      maxLimit: 200,
      baseUrl: 'https://www.carrefour.com.ar',
      notes: 'Referencia nacional de precios de almacén, bebidas, lácteos y limpieza.'
    },
    masonline_ar: {
      key: 'masonline_ar',
      name: 'Más Online (ChangoMás)',
      active: true,
      status: 'active',
      localTrenqueLauquen: false,
      branches: ['Referencia Nacional'],
      region: 'AR',
      currency: 'ARS',
      maxLimit: 200,
      baseUrl: 'https://www.masonline.com.ar',
      notes: 'Referencia nacional de hipermercado en ARS.'
    },
    cooperativa_obrera: {
      key: 'cooperativa_obrera',
      name: 'Cooperativa Obrera (Trenque Lauquen)',
      active: false,
      status: 'planned',
      localTrenqueLauquen: true,
      branches: ['Sucursal Trenque Lauquen'],
      region: 'AR',
      currency: 'ARS',
      maxLimit: 150,
      baseUrl: 'https://www.lacoopeencasa.coop',
      notes: 'Preparado para integrar el catálogo directo de La Coope en Casa.'
    },
    la_anonima: {
      key: 'la_anonima',
      name: 'La Anónima (Trenque Lauquen)',
      active: false,
      status: 'planned',
      localTrenqueLauquen: true,
      branches: ['Simini 836 (Suc. 203)', 'Av. García Salinas 1100 (Suc. 103)'],
      region: 'AR',
      currency: 'ARS',
      maxLimit: 150,
      baseUrl: 'https://www.laanonima.com.ar',
      notes: 'Dos sucursales en Trenque Lauquen; pendiente de catálogo web abierto.'
    },
    diarco: {
      key: 'diarco',
      name: 'Diarco (Trenque Lauquen)',
      active: false,
      status: 'planned',
      localTrenqueLauquen: true,
      branches: ['Av. García Salinas 1475'],
      region: 'AR',
      currency: 'ARS',
      maxLimit: 100,
      baseUrl: 'https://www.diarco.com.ar',
      notes: 'Mayorista/minorista en Trenque Lauquen (actualmente solo publica folletos).'
    }
  };
}

function getSources({ activeOnly = false } = {}) {
  const list = Object.values(buildSourcesCatalog());
  return activeOnly ? list.filter((s) => s.active) : list;
}

function getSourceByKey(key) {
  const catalog = buildSourcesCatalog();
  return catalog[String(key || '').trim()] || null;
}

module.exports = {
  buildSourcesCatalog,
  getSources,
  getSourceByKey
};
