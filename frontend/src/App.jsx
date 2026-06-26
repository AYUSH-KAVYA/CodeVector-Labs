import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { fetchProducts, fetchCategories, createProduct } from './api';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProductGrid from './components/ProductGrid';

function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [simulatingInserts, setSimulatingInserts] = useState(false);
  const [simulateProgress, setSimulateProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);

  const showToast = useCallback((message, icon = '✅') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, icon });
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadProducts = useCallback(async (category, currentCursor) => {
    setLoading(true);
    try {
      const result = await fetchProducts({
        category,
        limit: 50,
        cursor: currentCursor,
      });
      setProducts(prev => currentCursor ? [...prev, ...result.data] : result.data);
      setCursor(result.next_cursor);
      setHasMore(result.next_cursor !== null);
      setTotalLoaded(prev => currentCursor ? prev + result.data.length : result.data.length);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      showToast('Failed to load products', '❌');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load categories on mount
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  // Load products when category changes
  useEffect(() => {
    setProducts([]);
    setCursor(null);
    setTotalLoaded(0);
    setHasMore(true);
    loadProducts(selectedCategory, null);
  }, [selectedCategory, loadProducts]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && cursor) {
      loadProducts(selectedCategory, cursor);
    }
  }, [loading, hasMore, cursor, selectedCategory, loadProducts]);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleSimulateInserts = useCallback(async () => {
    setSimulatingInserts(true);
    setSimulateProgress(0);

    const batchSize = 10;
    const totalInserts = 50;
    const productNames = [
      'Quantum Processor', 'Neural Display', 'Photon Router', 'Nano Battery',
      'Holo Projector', 'Bio Scanner', 'Flux Capacitor', 'Plasma Shield',
      'Cryo Module', 'Gravity Lens', 'Dark Matter Cell', 'Fusion Core',
      'Tachyon Relay', 'Void Engine', 'Stellar Compass', 'Ion Thruster',
      'Warp Coil', 'Phase Inverter', 'Zero-Point Cell', 'Singularity Drive',
      'Entanglement Hub', 'Temporal Probe', 'Antimatter Pod', 'Muon Tracker',
      'Neutrino Mesh', 'Chromatic Lens', 'Exo Armor', 'Sonic Blade',
      'Tesla Gauntlet', 'Photonic Blade', 'Cryo Dagger', 'Plasma Bow',
      'Gravity Hammer', 'Void Shield', 'Dark Saber', 'Ion Lance',
      'Stellar Mace', 'Warp Pike', 'Phase Whip', 'Singularity Net',
      'Entangle Wire', 'Temporal Axe', 'Anti Staff', 'Muon Rod',
      'Neutrino Flail', 'Chrono Disc', 'Exo Blade', 'Sonic Spear',
      'Tesla Bow', 'Photon Axe',
    ];

    // Determine target category for insertion (avoid using 'All' directly)
    const nonAllCategories = categories.filter(c => c.name !== 'All');
    const targetCategory = selectedCategory === 'All'
      ? (nonAllCategories[Math.floor(Math.random() * nonAllCategories.length)]?.name || 'Electronics')
      : selectedCategory;

    try {
      for (let i = 0; i < totalInserts; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && i + j < totalInserts; j++) {
          const idx = i + j;
          batch.push(
            createProduct({
              name: `${productNames[idx % productNames.length]} ${Date.now()}-${idx}`,
              category: targetCategory,
              price: parseFloat((Math.random() * 500 + 10).toFixed(2)),
            })
          );
        }
        await Promise.all(batch);
        setSimulateProgress(Math.min(i + batchSize, totalInserts));
      }
      showToast(`50 products inserted into ${targetCategory}! Refresh or keep scrolling.`, '🚀');

      // Refresh categories count
      fetchCategories().then(setCategories).catch(() => {});
    } catch (err) {
      console.error('Simulate insert error:', err);
      showToast('Some inserts failed. Check console.', '⚠️');
    } finally {
      setSimulatingInserts(false);
      setSimulateProgress(0);
    }
  }, [selectedCategory, categories, showToast]);

  const handleRefresh = useCallback(async () => {
    setProducts([]);
    setCursor(null);
    setTotalLoaded(0);
    setHasMore(true);
    await loadProducts(selectedCategory, null);
    fetchCategories().then(setCategories).catch(() => {});
    showToast('Refreshed to show newest items!', '🔄');
  }, [selectedCategory, loadProducts, showToast]);

  return (
    <div className="app">
      <Header
        totalLoaded={totalLoaded}
        category={selectedCategory}
        onSimulate={handleSimulateInserts}
        simulating={simulatingInserts}
        simulateProgress={simulateProgress}
        onRefresh={handleRefresh}
        loading={loading}
      />
      <div className="app-main">
        <Sidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
        <div className="content-area">
          <ProductGrid
            products={products}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            category={selectedCategory}
            totalLoaded={totalLoaded}
          />
        </div>
      </div>
      {toast && (
        <div className="toast">
          <span className="toast-icon">{toast.icon}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;

// Toast is auto-dismissed after 3000ms

// Batch size configured to simulate fast multi-inserts

// Selected category updates reset cursor and list state
