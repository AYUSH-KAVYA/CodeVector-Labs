import ProductCard from './ProductCard';
import './ProductGrid.css';

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-badge"></div>
      <div className="skeleton-line skeleton-price"></div>
      <div className="skeleton-line skeleton-name"></div>
      <div className="skeleton-line skeleton-name-short"></div>
      <div className="skeleton-bottom">
        <div className="skeleton-line skeleton-id"></div>
        <div className="skeleton-line skeleton-time"></div>
      </div>
    </div>
  );
}

function ProductGrid({ products, loading, hasMore, onLoadMore, category, totalLoaded }) {
  const showSkeleton = loading && products.length === 0;
  const showLoadingMore = loading && products.length > 0;

  return (
    <div className="product-grid-container">
      <div className="product-grid-header">
        <h2 className="product-grid-title">
          Showing <span className="product-grid-count">{totalLoaded.toLocaleString()}</span> in{' '}
          <span className="product-grid-category">{category}</span>
        </h2>
      </div>

      {showSkeleton ? (
        <div className="product-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products.length === 0 && !loading ? (
        <div className="product-grid-empty">
          <span className="product-grid-empty-icon">📦</span>
          <h3>No products found</h3>
          <p>Try selecting a different category or inserting some test data.</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {showLoadingMore && (
            <div className="product-grid-loading-more">
              <div className="spinner"></div>
              <span>Loading more products...</span>
            </div>
          )}

          {hasMore && !loading && (
            <div className="product-grid-actions">
              <button className="load-more-btn" onClick={onLoadMore}>
                <span className="load-more-text">Load More</span>
                <span className="load-more-icon">↓</span>
              </button>
            </div>
          )}

          {!hasMore && products.length > 0 && (
            <div className="product-grid-end">
              <span className="product-grid-end-line"></span>
              <span className="product-grid-end-text">All products loaded</span>
              <span className="product-grid-end-line"></span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProductGrid;

