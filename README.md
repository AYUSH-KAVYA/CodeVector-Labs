# ⚡ ProductDB — Cursor-Based Keyset Pagination

> **Browse 200,000 products with zero duplicates and zero skipped rows — even when data changes mid-scroll.**

A full-stack demo showing why cursor-based (keyset) pagination is the correct way to paginate mutable datasets. Built with **FastAPI** + **PostgreSQL** + **React**.

---

## 🎯 The Problem

Standard `OFFSET`-based pagination breaks when data changes:

```
Page 1: SELECT ... LIMIT 50 OFFSET 0    ← User sees items 1-50
──── 5 new products are inserted ────
Page 2: SELECT ... LIMIT 50 OFFSET 50   ← Items shifted! User re-sees some items, skips others
```

| Issue | OFFSET Pagination | Cursor Pagination |
|-------|:-----------------:|:-----------------:|
| Duplicates when rows inserted | ❌ Yes | ✅ No |
| Skipped rows when rows inserted | ❌ Yes | ✅ No |
| Performance on page 1000+ | ❌ O(n) scan | ✅ O(1) index seek |
| Works with concurrent writes | ❌ Breaks | ✅ Stable |

---

## 🧠 The Solution: Keyset Cursor

Instead of saying *"skip 50 rows"*, we say *"give me rows after this specific point"*:

```sql
-- First page (no cursor)
SELECT * FROM products
WHERE category = $1
ORDER BY created_at DESC, id DESC
LIMIT 51;                     -- fetch limit+1 to detect "has more"

-- Page 2+ (with cursor from last item)
SELECT * FROM products
WHERE category = $1
  AND (created_at, id) < ($2, $3)   -- ← tuple comparison = keyset
ORDER BY created_at DESC, id DESC
LIMIT 51;
```

The cursor is a **Base64-encoded JSON** of `{ created_at, id }` from the last item on the current page. New inserts above the cursor don't affect results below it.

### Why `(created_at, id)` as the cursor?

- `created_at` gives us **newest-first** ordering
- `id` is the **tie-breaker** (two products can share a `created_at`)
- Together, `(created_at DESC, id DESC)` is a **unique sort key** — guaranteed stable

### The Index That Makes It Fast

```sql
CREATE INDEX idx_products_category_created_id
    ON products (category, created_at DESC, id DESC);
```

This composite index means PostgreSQL can answer `WHERE category = 'X' AND (created_at, id) < (ts, id) ORDER BY created_at DESC, id DESC` with a single **index range scan** — no table scan, even with millions of rows.

---

## 📂 Project Structure

```
Database task/
├── schema.sql          # PostgreSQL table + indexes
├── seed.py             # Generates 200k products via psycopg COPY
├── main.py             # FastAPI API with cursor pagination
├── requirements.txt    # Python dependencies
├── .env                # Database connection string
├── README.md           # You are here
└── frontend/           # React + Vite UI
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── index.css          # Design system (dark theme)
        ├── App.jsx            # Main shell + state
        ├── App.css
        ├── api.js             # API client
        └── components/
            ├── Header.jsx     # Top bar with stats
            ├── Header.css
            ├── Sidebar.jsx    # Category filter
            ├── Sidebar.css
            ├── ProductCard.jsx    # Glass product card
            ├── ProductCard.css
            ├── ProductGrid.jsx    # Grid + Load More
            ├── ProductGrid.css
            ├── SimulatePanel.jsx  # Live insert tester
            └── SimulatePanel.css
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **API** | FastAPI (Python 3.10+) | Async, fast, auto-docs at `/docs` |
| **Database** | PostgreSQL | Composite indexes, tuple comparison, COPY protocol |
| **Async Driver** | asyncpg | Fastest Python PostgreSQL driver (C extension) |
| **Seed Driver** | psycopg 3 | COPY protocol for bulk streaming |
| **Frontend** | React + Vite | Fast HMR, modern tooling |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL 14+ (running locally)
- Node.js 18+

### 1. Create the Database

```bash
createdb products_db
```

### 2. Backend Setup

```bash
cd "Database task"

# Create a virtual environment
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Edit .env if your PostgreSQL credentials differ
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/products_db

# Run the schema + seed 200k products
python seed.py
```

Expected output:
```
🗄️  Product Seeder — psycopg COPY
=============================================

⏳ Generating 200,000 products in memory...
   ✅ Generated in 2.15s

🔌 Connecting to PostgreSQL...
   ✅ Schema applied
   🗑️  Table truncated

⚡ Streaming data via COPY...
   ✅ COPY completed in 1.83s

=============================================
✅ Done! 200,000 products across 10 categories
   Generation: 2.15s | COPY: 1.83s | Total: 3.98s
```

### 3. Start the API

```bash
uvicorn main:app --reload --port 8000
```

- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs

### 4. Start the Frontend

```bash
cd frontend
npm install   # Only needed first time
npm run dev
```

- UI: http://localhost:5173

---

## 📡 API Reference

### `GET /products`

Fetch products with cursor-based pagination.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | `"Electronics"` | Filter by category |
| `limit` | int (1-100) | `50` | Items per page |
| `cursor` | string | `null` | Base64 cursor from previous response |

**Response:**
```json
{
  "data": [
    {
      "id": 199847,
      "name": "Premium Widget Ele-42",
      "category": "Electronics",
      "price": 249.99,
      "created_at": "2025-06-25T14:30:00+00:00",
      "updated_at": "2025-06-26T08:15:00+00:00"
    }
  ],
  "next_cursor": "eyJjIjoiMjAyNS0wNi0yNVQxNDozMDowMCswMDowMCIsImkiOjE5OTg0N30="
}
```

- `next_cursor` is `null` when there are no more pages.
- Pass `next_cursor` as the `cursor` param to get the next page.

### `GET /categories`

Returns all categories with product counts.

```json
[
  { "name": "Electronics", "count": 20143 },
  { "name": "Clothing", "count": 19876 }
]
```

### `POST /products`

Insert a new product (used by the Simulate panel).

```json
{
  "name": "Quantum Processor X1",
  "category": "Electronics",
  "price": 299.99
}
```

---

## 🧪 Testing Cursor Stability

The UI includes a **"Simulate 50 Inserts"** button at the bottom. Here's how to test:

1. Open the UI and load a couple pages of "Electronics"
2. Click **🚀 Simulate 50 Inserts**
3. Watch 50 new products get inserted into the *same category*
4. Click **Load More** — you'll get the next logical page with **zero duplicates** and **zero skipped items**

This works because the cursor remembers exactly where you left off. New inserts have `created_at = NOW()`, which is *above* your cursor position, so they're invisible to your current pagination session.

---

## 🔑 Key Design Decisions

