import './Header.css';

function Header({
  totalLoaded,
  category,
  onSimulate,
  simulating,
  simulateProgress,
  onRefresh,
  loading,
}) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <h1 className="header-title">ProductDB</h1>
        </div>
      </div>
      <div className="header-right">
        <button
          className="header-btn header-btn-primary"
          onClick={onSimulate}
          disabled={simulating}
        >
          {simulating ? (
            <>
              <span className="spinner-warm-small"></span>
              <span>Inserting ({simulateProgress}/50)</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Insert 50</span>
            </>
          )}
        </button>

        <button
          className="header-btn header-btn-secondary"
          onClick={onRefresh}
          disabled={loading || simulating}
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>

        <div className="header-badge">
          <span className="header-badge-dot"></span>
          <span className="header-badge-text">{totalLoaded.toLocaleString()} Products Loaded</span>
        </div>
        <div className="header-badge header-badge-category">
          <span className="header-badge-text">{category}</span>
        </div>
      </div>
    </header>
  );
}

export default Header;

