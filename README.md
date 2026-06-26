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
