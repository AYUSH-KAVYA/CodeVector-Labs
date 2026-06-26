import './ProductCard.css';

const CATEGORY_GRADIENTS = {
  Electronics: 'var(--gradient-purple)',
  Clothing: 'var(--gradient-pink)',
  Home: 'var(--gradient-amber)',
  Sports: 'var(--gradient-green)',
  Books: 'var(--gradient-blue)',
  Toys: 'var(--gradient-cyan)',
  Food: 'var(--gradient-warm)',
  Beauty: 'var(--gradient-pink)',
  Automotive: 'var(--gradient-blue)',
  Garden: 'var(--gradient-green)',
};

function getRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

function ProductCard({ product, index }) {
  const gradient = CATEGORY_GRADIENTS[product.category] || 'var(--gradient-accent)';
  const delay = Math.min(index % 50, 20) * 30;

  return (
    <div
      className="product-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="product-card-glow" style={{ background: gradient }}></div>
      <div className="product-card-inner">
        <div className="product-card-top">
          <span
            className="product-card-category"
            style={{ background: gradient }}
          >
            {product.category}
          </span>
          <span className="product-card-price">
            ${product.price.toFixed(2)}
          </span>
        </div>
        <h3 className="product-card-name">{product.name}</h3>
        <div className="product-card-bottom">
          <span className="product-card-id">#{product.id}</span>
          <span className="product-card-time">
            {getRelativeTime(product.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
