import './Sidebar.css';

function Sidebar({ categories, selectedCategory, onCategoryChange }) {
  const categoryIcons = {
    All: '🛍️',
    Electronics: '🔌',
    Clothing: '👕',
    Home: '🏠',
    Sports: '⚽',
    Books: '📚',
    Toys: '🎮',
    Food: '🍔',
    Beauty: '💄',
    Automotive: '🚗',
    Garden: '🌿',
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Categories</h2>
        <span className="sidebar-count">{categories.length} total</span>
      </div>
      <nav className="sidebar-nav">
        {categories.map(cat => (
          <button
            key={cat.name}
            className={`sidebar-item ${selectedCategory === cat.name ? 'sidebar-item-active' : ''}`}
            onClick={() => onCategoryChange(cat.name)}
          >
            <span className="sidebar-item-indicator"></span>
            <span className="sidebar-item-icon">
              {categoryIcons[cat.name] || '📦'}
            </span>
            <span className="sidebar-item-name">{cat.name}</span>
            <span className="sidebar-item-count">{cat.count.toLocaleString()}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
