import './SimulatePanel.css';

function SimulatePanel({ onSimulate, simulating, progress }) {
  return (
    <div className="simulate-panel">
      <div className="simulate-panel-inner">
        <div className="simulate-panel-info">
          <span className="simulate-panel-label">🧪 Cursor Stability Test</span>
          <p className="simulate-panel-desc">
            Insert products while browsing — cursor pagination ensures <strong>zero duplicates</strong> and no skipped rows.
          </p>
        </div>
        <div className="simulate-panel-actions">
          {simulating ? (
            <div className="simulate-progress">
              <div className="spinner spinner-warm"></div>
              <span className="simulate-progress-text">
                Inserting... {progress}/50
              </span>
              <div className="simulate-progress-bar">
                <div
                  className="simulate-progress-fill"
                  style={{ width: `${(progress / 50) * 100}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <button className="simulate-btn" onClick={onSimulate}>
              <span className="simulate-btn-icon">🚀</span>
              <span>Simulate 50 Inserts</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SimulatePanel;

