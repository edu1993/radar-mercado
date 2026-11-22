import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Radar } from 'lucide-react';
import {
  clearSearchHistory,
  deleteStudyById,
  fetchAssistantHistory,
  fetchMe,
  fetchSearchHistory,
  fetchSearchVariations,
  fetchSources,
  fetchStudyById,
  loginUser,
  logoutUser,
  registerUser,
  runMarketSearch,
  sendAssistantMessage,
  updateStudyById
} from './services/api.js';
import { analyzeMarket, normalizeBrandLabel, packSizeSortWeight } from './utils/marketStats.js';
import { formatARS, formatRelativeDate } from './utils/formatters.js';
import AuthScreen from './components/AuthScreen.jsx';
import HeaderBar from './components/HeaderBar.jsx';
import HistorySidebar from './components/HistorySidebar.jsx';
import SearchPanel from './components/SearchPanel.jsx';
import BasketSummary from './components/BasketSummary.jsx';
import RefinementBar from './components/RefinementBar.jsx';
import MarketSummary from './components/MarketSummary.jsx';
import PriceHistogram from './components/PriceHistogram.jsx';
import ProductTable from './components/ProductTable.jsx';
import CopilotPanel from './components/CopilotPanel.jsx';
import CompareModal from './components/CompareModal.jsx';
import HomeShowcase from './components/HomeShowcase.jsx';

const TOKEN_KEY = 'radar_mercado_token_v1';
const PREFS_KEY = 'radar_mercado_prefs_v1';

const FALLBACK_SOURCES = [
  { key: 'precios_claros_tl', name: 'Precios Claros SEPA (Trenque Lauquen y zona)', active: true, maxLimit: 200 },
  { key: 'dia_ar', name: 'Supermercados DIA% (Trenque Lauquen)', active: true, maxLimit: 200 },
  { key: 'todos_supermercados', name: 'Comparar Todos los Súper (DIA + Carrefour + Más Online)', active: true, maxLimit: 200 },
  { key: 'carrefour_ar', name: 'Carrefour AR', active: true, maxLimit: 200 },
  { key: 'masonline_ar', name: 'Más Online (ChangoMás)', active: true, maxLimit: 200 }
];

function loadSavedPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch {
    return {};
  }
}

function buildInitialCopilotMessage(study, stats) {
  if (!study?.id || !stats.pricedCount) {
    return {
      id: 'msg-empty',
      role: 'assistant',
      badge: 'Listo para ayudarte',
      text: 'Buscá un producto o una lista separada por comas (ej: yerba mate, coca cola) y te digo dónde conviene comprar.',
      quickReplies: [],
      recommendations: []
    };
  }
  const isMulti = Boolean(study?.isBasket) || (study?.searchItems?.length || 0) > 1;
  return {
    id: `msg-init-${study.id}`,
    role: 'assistant',
    badge: 'Asistente listo',
    text: isMulti
      ? `Encontré ${stats.pricedCount} opciones para tu changuito (${study.searchItems?.length || 2} productos). Elegí un atajo arriba para analizar esta compra.`
      : `Encontré ${stats.pricedCount} opciones para "${study.term}" (precio típico ${formatARS(stats.median)}). Elegí un atajo arriba para analizar esta compra.`,
    quickReplies: [],
    recommendations: []
  };
}

export default function App() {
  const initialPrefs = useMemo(() => loadSavedPrefs(), []);

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [currentUser, setCurrentUser] = useState('');
  const [checkingSession, setCheckingSession] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [sources, setSources] = useState(FALLBACK_SOURCES);
  const [sourceFilter, setSourceFilter] = useState('');
  const [historyList, setHistoryList] = useState([]);
  const [activeStudy, setActiveStudy] = useState(null);
  const [loadingStudy, setLoadingStudy] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const [leftOpen, setLeftOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  const [rightOpen, setRightOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1280 : true));
  const [mobilePanel, setMobilePanel] = useState('dashboard');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarketplace, setSelectedMarketplace] = useState('todos_supermercados');
  const [sampleLimit, setSampleLimit] = useState(initialPrefs.sampleLimit || 100);
  const [includeVariations, setIncludeVariations] = useState(false);
  const [variations, setVariations] = useState([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const searchInputRef = useRef(null);

  const [selectedBinId, setSelectedBinId] = useState(null);
  const [basketItemFilter, setBasketItemFilter] = useState('');
  const [filtersByItem, setFiltersByItem] = useState({});
  const [hideOutliers, setHideOutliers] = useState(Boolean(initialPrefs.hideOutliers));
  const [onlySmartZone, setOnlySmartZone] = useState(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [tableQuery, setTableQuery] = useState('');
  const [sortBy, setSortBy] = useState(initialPrefs.sortBy || 'price_asc');
  const [pageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const [compareIds, setCompareIds] = useState([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);

  const [chatByStudy, setChatByStudy] = useState({});
  const [chatUsageByStudy, setChatUsageByStudy] = useState({});
  const [chatThinking, setChatThinking] = useState(false);
  const chatEndRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 4000);
  };

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ sampleLimit, hideOutliers, sortBy }));
  }, [sampleLimit, hideOutliers, sortBy]);

  useEffect(() => {
    fetchSources()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) setSources(list);
      })
      .catch(() => {});
  }, []);

  const resetFilters = () => {
    setSelectedBinId(null);
    setBasketItemFilter('');
    setFiltersByItem({});
    setCompareIds([]);
    setTableQuery('');
    setOnlySmartZone(false);
    setOnlyDiscounted(false);
  };

  const loadStudyChat = async (studyId, authToken) => {
    if (!studyId || !authToken) return;
    try {
      const res = await fetchAssistantHistory(studyId, authToken);
      if (Array.isArray(res?.messages) && res.messages.length > 0) {
        setChatByStudy((prev) => ({ ...prev, [studyId]: res.messages }));
      }
      if (res?.usage) {
        setChatUsageByStudy((prev) => ({ ...prev, [studyId]: res.usage }));
      }
    } catch {
      // Si no hay historial previo, se muestra el mensaje inicial por defecto
    }
  };

  const loadHistory = async (authToken, filterSource = sourceFilter, autoLoadFirst = false) => {
    const params = filterSource ? { source: filterSource } : {};
    const list = await fetchSearchHistory(authToken, params);
    setHistoryList(list);
    if (autoLoadFirst) {
      if (list.length > 0) {
        setLoadingStudy(true);
        try {
          const fullStudy = await fetchStudyById(list[0].id, authToken);
          setActiveStudy(fullStudy);
          loadStudyChat(fullStudy.id, authToken);
        } finally {
          setLoadingStudy(false);
        }
      } else {
        setActiveStudy(null);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      setCheckingSession(false);
      return;
    }
    fetchMe(token)
      .then((me) => {
        setCurrentUser(me.username);
        return loadHistory(token, '', false);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setCurrentUser('');
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!token || !currentUser) return;
    loadHistory(token, sourceFilter, false).catch((err) => showToast(err.message));
  }, [sourceFilter]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobilePanel('dashboard');
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const fn = authMode === 'register' ? registerUser : loginUser;
      const res = await fn({ username: authUsername, password: authPassword, website_url: honeypot });
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setCurrentUser(res.username);
      setAuthPassword('');
      await loadHistory(res.token, '', false);
      showToast(`Conectado como ${res.username}.`);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try { if (token) await logoutUser(token); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setCurrentUser('');
    setHistoryList([]);
    setActiveStudy(null);
  };

  const handleSelectStudy = async (id) => {
    if (!id || id === activeStudy?.id) return;
    setLoadingStudy(true);
    setMobilePanel('dashboard');
    resetFilters();
    setVariations([]);
    try {
      const fullStudy = await fetchStudyById(id, token);
      setActiveStudy(fullStudy);
      loadStudyChat(fullStudy.id, token);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoadingStudy(false);
    }
  };

  const handleToggleFavorite = async (study, e) => {
    if (e) e.stopPropagation();
    try {
      const updated = await updateStudyById(study.id, { isFavorite: !study.isFavorite }, token);
      setHistoryList((prev) =>
        prev.map((item) => (item.id === study.id ? { ...item, isFavorite: updated.isFavorite } : item))
      );
      if (activeStudy?.id === study.id) {
        setActiveStudy((prev) => (prev ? { ...prev, isFavorite: updated.isFavorite } : prev));
      }
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSaveNotes = async (studyId, notes) => {
    try {
      const updated = await updateStudyById(studyId, { notes }, token);
      setHistoryList((prev) =>
        prev.map((item) => (item.id === studyId ? { ...item, notes: updated.notes } : item))
      );
      if (activeStudy?.id === studyId) {
        setActiveStudy((prev) => (prev ? { ...prev, notes: updated.notes } : prev));
      }
      showToast('Nota guardada.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteStudy = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await deleteStudyById(id, token);
      const next = historyList.filter((item) => item.id !== id);
      setHistoryList(next);
      if (activeStudy?.id === id) {
        if (next[0]) {
          const full = await fetchStudyById(next[0].id, token);
          setActiveStudy(full);
          loadStudyChat(full.id, token);
        } else {
          setActiveStudy(null);
        }
      }
      showToast('Estudio eliminado.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await clearSearchHistory(token);
      setHistoryList([]);
      setActiveStudy(null);
      resetFilters();
      setConfirmClearOpen(false);
      showToast('Historial vaciado.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const itemGroups = useMemo(() => {
    const list = activeStudy?.products || [];
    if (!list.length) return [];
    const keys =
      Array.isArray(activeStudy?.searchItems) && activeStudy.searchItems.length > 1
        ? activeStudy.searchItems
        : [activeStudy?.term || 'producto'];

    return keys.map((itemKey) => {
      const scoped =
        keys.length > 1
          ? list.filter((p) => (p.searchItem || activeStudy?.term) === itemKey)
          : list;

      const activeFilter = filtersByItem[itemKey] || { sizes: [], brands: [] };
      const selSizes = activeFilter.sizes || [];
      const selBrands = activeFilter.brands || [];

      const allSizes = new Set();
      const allBrands = new Set();
      for (const item of scoped) {
        if (item.packSize) allSizes.add(item.packSize);
        const br = normalizeBrandLabel(item.brand);
        if (br) allBrands.add(br);
      }

      const scopedByBrand = selBrands.length > 0
        ? scoped.filter((p) => selBrands.includes(normalizeBrandLabel(p.brand)))
        : scoped;
      const scopedBySize = selSizes.length > 0
        ? scoped.filter((p) => selSizes.includes(p.packSize))
        : scoped;
      const matchedCount = scoped.filter((p) => {
        if (selSizes.length > 0 && !selSizes.includes(p.packSize)) return false;
        if (selBrands.length > 0 && !selBrands.includes(normalizeBrandLabel(p.brand))) return false;
        return true;
      }).length;

      const sizeCounts = new Map([...allSizes].map((s) => [s, 0]));
      for (const item of scopedByBrand) {
        if (item.packSize) sizeCounts.set(item.packSize, (sizeCounts.get(item.packSize) || 0) + 1);
      }

      const brandCounts = new Map([...allBrands].map((b) => [b, 0]));
      for (const item of scopedBySize) {
        const br = normalizeBrandLabel(item.brand);
        if (br) brandCounts.set(br, (brandCounts.get(br) || 0) + 1);
      }

      const availableSizes = Array.from(sizeCounts.entries())
        .map(([size, count]) => ({ size, count }))
        .sort((a, b) => packSizeSortWeight(b.size) - packSizeSortWeight(a.size) || b.count - a.count)
        .slice(0, 14);

      const availableBrands = Array.from(brandCounts.entries())
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand))
        .slice(0, 12);

      return {
        itemKey,
        label: itemKey,
        totalCount: scoped.length,
        matchedCount,
        availableSizes,
        availableBrands
      };
    });
  }, [activeStudy, filtersByItem]);

  useEffect(() => {
    const reqSize = activeStudy?.requestedSize;
    if (
      reqSize &&
      !activeStudy?.isBasket &&
      itemGroups.length === 1 &&
      itemGroups[0].availableSizes.some((s) => s.size === reqSize)
    ) {
      setFiltersByItem({ [itemGroups[0].itemKey]: { sizes: [reqSize], brands: [] } });
    } else {
      setFiltersByItem({});
    }
  }, [activeStudy?.id]);

  const handleToggleSize = (itemKey, size) => {
    setSelectedBinId(null);
    setFiltersByItem((prev) => {
      const curr = prev[itemKey] || { sizes: [], brands: [] };
      const nextSizes = curr.sizes.includes(size)
        ? curr.sizes.filter((s) => s !== size)
        : [...curr.sizes, size];
      return { ...prev, [itemKey]: { ...curr, sizes: nextSizes } };
    });
  };

  const handleClearSizes = (itemKey) => {
    setSelectedBinId(null);
    setFiltersByItem((prev) => {
      const curr = prev[itemKey] || { sizes: [], brands: [] };
      return { ...prev, [itemKey]: { ...curr, sizes: [] } };
    });
  };

  const handleToggleBrand = (itemKey, brand) => {
    setSelectedBinId(null);
    setFiltersByItem((prev) => {
      const curr = prev[itemKey] || { sizes: [], brands: [] };
      const nextBrands = curr.brands.includes(brand)
        ? curr.brands.filter((b) => b !== brand)
        : [...curr.brands, brand];
      return { ...prev, [itemKey]: { ...curr, brands: nextBrands } };
    });
  };

  const handleClearBrands = (itemKey) => {
    setSelectedBinId(null);
    setFiltersByItem((prev) => {
      const curr = prev[itemKey] || { sizes: [], brands: [] };
      return { ...prev, [itemKey]: { ...curr, brands: [] } };
    });
  };

  const handleClearAllRefinements = () => {
    setSelectedBinId(null);
    setFiltersByItem({});
  };

  const perItemFilteredProducts = useMemo(() => {
    const list = activeStudy?.products || [];
    if (!list.length) return [];
    const isMulti = Array.isArray(activeStudy?.searchItems) && activeStudy.searchItems.length > 1;
    const fallbackKey = activeStudy?.term || 'producto';

    return list.filter((item) => {
      const itemKey = isMulti ? (item.searchItem || fallbackKey) : fallbackKey;
      const f = filtersByItem[itemKey];
      if (!f) return true;
      if (f.sizes?.length > 0 && !f.sizes.includes(item.packSize)) return false;
      if (f.brands?.length > 0 && !f.brands.includes(normalizeBrandLabel(item.brand))) return false;
      return true;
    });
  }, [activeStudy, filtersByItem]);

  const refinedProducts = useMemo(() => {
    if (!basketItemFilter) return perItemFilteredProducts;
    return perItemFilteredProducts.filter((item) => item.searchItem === basketItemFilter);
  }, [perItemFilteredProducts, basketItemFilter]);

  const stats = useMemo(() => analyzeMarket(refinedProducts), [refinedProducts]);

  useEffect(() => {
    if (!includeVariations || !activeStudy?.term || !token) {
      setVariations([]);
      return;
    }
    let cancelled = false;
    setLoadingVariations(true);
    fetchSearchVariations({ term: activeStudy.term, medianPrice: stats.median, token })
      .then((res) => { if (!cancelled) setVariations(res.variations || []); })
      .catch(() => { if (!cancelled) setVariations([]); })
      .finally(() => { if (!cancelled) setLoadingVariations(false); });
    return () => { cancelled = true; };
  }, [includeVariations, activeStudy?.id]);

  const handleRunSearch = async (event, overrideTerm) => {
    if (event?.preventDefault) event.preventDefault();
    const cleanTerm = (typeof overrideTerm === 'string' ? overrideTerm : searchTerm).trim();
    if (cleanTerm.length < 2 || isScanning) return;

    setMobilePanel('dashboard');
    setIsScanning(true);
    setScanStep(0);
    const t1 = setTimeout(() => setScanStep(1), 900);
    const t2 = setTimeout(() => setScanStep(2), 2000);
    const t3 = setTimeout(() => setScanStep(3), 3200);

    try {
      const created = await runMarketSearch({
        term: cleanTerm,
        source: selectedMarketplace,
        limit: sampleLimit,
        token
      });
      setActiveStudy(created);
      resetFilters();
      setSearchTerm('');
      await loadHistory(token, sourceFilter, false);
      const aiNote = created.aiRemovedCount > 0
        ? ` (${created.aiRemovedCount} irrelevantes filtrados por IA)`
        : '';
      showToast(
        `${created.fromCache ? 'Desde caché:' : 'Encontramos'} ${created.products.length} productos para "${cleanTerm}"${aiNote}.`
      );
    } catch (err) {
      showToast(err.message);
    } finally {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      setIsScanning(false);
    }
  };

  const selectedBin = useMemo(
    () => stats.bins.find((b) => b.id === selectedBinId) || null,
    [stats.bins, selectedBinId]
  );

  const filteredProducts = useMemo(() => {
    let list = [...stats.enrichedItems];
    if (basketItemFilter) list = list.filter((item) => item.searchItem === basketItemFilter);
    if (selectedBin) {
      const isLast = selectedBin.index === stats.bins.length - 1;
      list = list.filter((item) =>
        isLast
          ? item.price >= selectedBin.start && item.price <= selectedBin.end
          : item.price >= selectedBin.start && item.price < selectedBin.end
      );
    }
    if (hideOutliers) list = list.filter((item) => !item.isOutlier);
    if (onlySmartZone) list = list.filter((item) => item.isSmartZone);
    if (onlyDiscounted) list = list.filter((item) => (item.discountPct || 0) > 0);

    const q = tableQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) => item.title.toLowerCase().includes(q) || item.seller.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0);
      if (sortBy === 'unit_price_asc') return (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity);
      if (sortBy === 'delta_asc') return a.deltaPct - b.deltaPct;
      return a.price - b.price;
    });
    return list;
  }, [stats, selectedBin, basketItemFilter, hideOutliers, onlySmartZone, onlyDiscounted, tableQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, safePage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeStudy?.id, selectedBinId, basketItemFilter, filtersByItem, hideOutliers, onlySmartZone, onlyDiscounted, tableQuery, sortBy, pageSize]);

  const comparedProducts = useMemo(
    () => stats.enrichedItems.filter((item) => compareIds.includes(item.id)),
    [stats.enrichedItems, compareIds]
  );

  const handleToggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3) {
        showToast('Podés comparar hasta 3 publicaciones.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const activeChatMessages = useMemo(() => {
    if (!activeStudy?.id) return [buildInitialCopilotMessage(null, stats)];
    const existing = chatByStudy[activeStudy.id];
    if (existing && existing.length > 0) return existing;
    return [buildInitialCopilotMessage(activeStudy, stats)];
  }, [chatByStudy, activeStudy, stats]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeChatMessages, chatThinking]);

  const activeChatUsage = useMemo(() => {
    if (!activeStudy?.id) return { usedQueries: 0, maxQueries: 15, remainingQueries: 15 };
    const stored = chatUsageByStudy[activeStudy.id];
    if (stored) return stored;
    const itemCount = Math.max(1, activeStudy.searchItems?.length || 1);
    const maxQueries = 15 * itemCount;
    return { usedQueries: 0, maxQueries, remainingQueries: maxQueries };
  }, [activeStudy, chatUsageByStudy]);

  const handleSendChat = async (overrideText) => {
    const text = (typeof overrideText === 'string' ? overrideText : '').trim();
    if (!text || chatThinking || !activeStudy?.id) return;
    if (activeChatUsage.remainingQueries <= 0) {
      showToast(`Alcanzaste el límite de ${activeChatUsage.maxQueries} consultas IA para esta búsqueda.`);
      return;
    }

    const studyId = activeStudy.id;
    const userMsg = { id: `msg-u-${Date.now()}`, role: 'user', text };
    const baseMsgs = chatByStudy[studyId]?.length
      ? chatByStudy[studyId]
      : [buildInitialCopilotMessage(activeStudy, stats)];
    const nextConversation = [...baseMsgs, userMsg];

    setChatByStudy((prev) => ({ ...prev, [studyId]: nextConversation }));
    setChatThinking(true);

    try {
      const apiMessages = nextConversation
        .filter((m) => !String(m.id).startsWith('msg-init-'))
        .map((m) => ({ role: m.role, text: m.text }));

      const hasActiveFilters =
        Boolean(basketItemFilter) ||
        Object.values(filtersByItem).some((f) => (f?.sizes?.length || 0) > 0 || (f?.brands?.length || 0) > 0);
      const filteredProductIds = hasActiveFilters ? refinedProducts.map((p) => p.id) : undefined;
      const res = await sendAssistantMessage({ studyId, messages: apiMessages, filteredProductIds, token });
      const aiMsg = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        badge: res.badge || 'Gemini AI',
        text: res.reply,
        verdict: res.verdict,
        quickReplies: res.quickReplies || [],
        recommendations: res.recommendations || []
      };
      setChatByStudy((prev) => ({
        ...prev,
        [studyId]: [...(prev[studyId] || nextConversation), aiMsg]
      }));
      if (res.usage) {
        setChatUsageByStudy((prev) => ({ ...prev, [studyId]: res.usage }));
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setChatThinking(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5F1] text-xs font-medium text-[#666560]">
        Verificando sesión...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        honeypot={honeypot}
        setHoneypot={setHoneypot}
        authLoading={authLoading}
        authError={authError}
        setAuthError={setAuthError}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-50/50 via-slate-50 to-sky-50/60 text-slate-900">
      <HeaderBar
        leftOpen={leftOpen}
        onToggleLeft={() =>
          window.innerWidth < 1024
            ? setMobilePanel((p) => (p === 'history' ? 'dashboard' : 'history'))
            : setLeftOpen((v) => !v)
        }
        onToggleRight={() =>
          window.innerWidth < 1024
            ? setMobilePanel((p) => (p === 'copilot' ? 'dashboard' : 'copilot'))
            : setRightOpen((v) => !v)
        }
        hasActiveStudy={Boolean(activeStudy)}
        onGoHome={() => { setActiveStudy(null); resetFilters(); setMobilePanel('dashboard'); }}
        currentUser={currentUser}
        historyCount={historyList.length}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <HistorySidebar
          leftOpen={leftOpen}
          mobilePanel={mobilePanel}
          historyList={historyList}
          activeStudyId={activeStudy?.id}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          sources={sources}
          onSelectStudy={handleSelectStudy}
          onToggleFavorite={handleToggleFavorite}
          onSaveNotes={handleSaveNotes}
          onDeleteStudy={handleDeleteStudy}
          onOpenClearModal={() => setConfirmClearOpen(true)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto px-3 sm:px-6 pt-4 pb-20 lg:pb-6">
          <div className="max-w-5xl mx-auto space-y-5">
            <SearchPanel
              searchInputRef={searchInputRef}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedMarketplace={selectedMarketplace}
              setSelectedMarketplace={setSelectedMarketplace}
              sources={sources}
              includeVariations={includeVariations}
              setIncludeVariations={setIncludeVariations}
              isScanning={isScanning}
              scanStep={scanStep}
              onSubmit={handleRunSearch}
            />

            {loadingStudy ? (
              <div className="p-12 text-center text-xs text-[#666560] bg-white rounded-lg border border-[#E5E3DC]">
                Cargando búsqueda...
              </div>
            ) : !activeStudy ? (
              <HomeShowcase
                onSelectCombo={(term) => handleRunSearch(null, term)}
                isScanning={isScanning}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-medium text-[#666560] uppercase tracking-wider">
                      {activeStudy.source} · {formatRelativeDate(activeStudy.createdAt)}{' '}
                      {activeStudy.fromCache ? '· Caché' : '· En vivo'}
                    </div>
                    <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-[-0.025em]">
                      {activeStudy.term}
                    </h1>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-md border border-[#E5E3DC] bg-white font-mono-num">
                      {stats.pricedCount === 1 ? '1 producto' : `${stats.pricedCount} productos`}
                    </span>

                  </div>
                </div>

                {includeVariations && (
                  <section className="rounded-lg border border-[#E5E3DC] bg-white p-3.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider mb-2">
                      {loadingVariations
                        ? 'Generando 3 alternativas con Gemini...'
                        : '3 Alternativas sugeridas en el mismo rango'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {variations.map((v, i) => (
                        <div
                          key={i}
                          className="rounded-md border border-[#E5E3DC] bg-[#FAF9F6] p-3 flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="text-[10px] font-semibold uppercase text-[#666560]">{v.angle}</div>
                            <div className="mt-1 text-xs font-bold">{v.term}</div>
                            <p className="mt-1 text-[11px] text-[#666560]">{v.why}</p>
                          </div>
                          <button
                            type="button"
                            disabled={isScanning}
                            onClick={() => handleRunSearch(null, v.term)}
                            className="self-end px-2.5 py-1 rounded border border-[#E5E3DC] bg-white hover:bg-[#121212] hover:text-white text-[11px] font-semibold"
                          >
                            Buscar esta
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <BasketSummary
                  study={activeStudy}
                  products={perItemFilteredProducts}
                  activeItemFilter={basketItemFilter}
                  onSelectItemFilter={(it) => { setBasketItemFilter(it); setSelectedBinId(null); }}
                />

                <RefinementBar
                  itemGroups={itemGroups}
                  filtersByItem={filtersByItem}
                  onToggleSize={handleToggleSize}
                  onClearSizes={handleClearSizes}
                  onToggleBrand={handleToggleBrand}
                  onClearBrands={handleClearBrands}
                  onClearAll={handleClearAllRefinements}
                  requestedSize={activeStudy?.requestedSize}
                />

                {(!activeStudy.isBasket || basketItemFilter) ? (
                  <>
                    <MarketSummary stats={stats} />

                    <PriceHistogram
                      stats={stats}
                      selectedBin={selectedBin}
                      selectedBinId={selectedBinId}
                      onSelectBin={setSelectedBinId}
                    />
                  </>
                ) : (
                  <div className="rounded-xl border border-teal-200/70 bg-teal-50/50 px-4 py-2.5 text-xs text-teal-900 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Estás viendo los {activeStudy.searchItems?.length || 'múltiples'} productos del changuito juntos. Tocá un producto puntual arriba para ver su precio típico y su gráfico sin mezclar rubros.
                    </span>
                  </div>
                )}

                <ProductTable
                  studyTerm={activeStudy.term}
                  filteredProducts={filteredProducts}
                  paginatedProducts={paginatedProducts}
                  totalPriced={stats.pricedCount}
                  outlierCount={stats.outlierCount}
                  compareIds={compareIds}
                  onToggleCompare={handleToggleCompare}
                  onOpenCompare={() => setCompareModalOpen(true)}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                  tableQuery={tableQuery}
                  onTableQueryChange={setTableQuery}
                  hideOutliers={hideOutliers}
                  onToggleHideOutliers={() => setHideOutliers((v) => !v)}
                  onlySmartZone={onlySmartZone}
                  onToggleOnlySmartZone={() => setOnlySmartZone((v) => !v)}
                  onlyDiscounted={onlyDiscounted}
                  onToggleOnlyDiscounted={() => setOnlyDiscounted((v) => !v)}
                  safePage={safePage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </main>

        <CopilotPanel
          rightOpen={rightOpen}
          mobilePanel={mobilePanel}
          activeStudy={activeStudy}
          messages={activeChatMessages}
          chatThinking={chatThinking}
          chatUsage={activeChatUsage}
          chatEndRef={chatEndRef}
          onSendChat={handleSendChat}
          onResetChat={() => activeStudy && setChatByStudy((p) => ({ ...p, [activeStudy.id]: [] }))}
        />
      </div>

      <CompareModal
        open={compareModalOpen}
        products={comparedProducts}
        onClose={() => setCompareModalOpen(false)}
      />

      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
          <div className="w-full max-w-sm rounded-lg border border-[#E5E3DC] bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold">¿Borrar todo tu historial de búsquedas?</h3>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-1.5 rounded border border-[#E5E3DC] text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-[#E11D48] text-white"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 backdrop-blur text-white text-xs font-semibold shadow-lg animate-fade-up">
          {toast}
        </div>
      )}
    </div>
  );
}
