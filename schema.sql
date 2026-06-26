-- ============================================================
-- Product Browser — Database Schema
-- PostgreSQL 14+
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255)   NOT NULL,
    category      VARCHAR(100)   NOT NULL,
    price         NUMERIC(10, 2) NOT NULL,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================
-- Indexes for Cursor-Based Keyset Pagination
-- =============================================================

-- Primary pagination index: category filter + newest-first sort
-- Covers: WHERE category = $1 ORDER BY created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_products_category_created_id
    ON products (category, created_at DESC, id DESC);

-- Secondary index: global newest-first (no category filter)
-- Covers: ORDER BY created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_products_created_id
    ON products (created_at DESC, id DESC);
