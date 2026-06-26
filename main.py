import os
import json
import base64
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

import asyncpg
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/products_db")

pool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
    yield
    await pool.close()


app = FastAPI(
    title="Product Browser API",
    description="Cursor-based keyset pagination over 200k products",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def encode_cursor(created_at: datetime, product_id: int) -> str:
    payload = json.dumps({"c": created_at.isoformat(), "i": product_id})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, int]:
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        return datetime.fromisoformat(payload["c"]), payload["i"]
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid cursor: {e}")


def row_to_dict(row: asyncpg.Record) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "price": float(row["price"]),
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


@app.get("/products")
async def get_products(
    category: str = Query(default="All", description="Product category to filter by"),
    limit: int = Query(default=50, ge=1, le=100, description="Items per page"),
    cursor: Optional[str] = Query(default=None, description="Pagination cursor from previous response"),
):
    async with pool.acquire() as conn:
        if category == "All":
            if cursor:
                cursor_ts, cursor_id = decode_cursor(cursor)
                rows = await conn.fetch(
                    """
                    SELECT id, name, category, price, created_at, updated_at
                    FROM   products
                    WHERE  (created_at, id) < ($1, $2)
                    ORDER  BY created_at DESC, id DESC
                    LIMIT  $3
                    """,
                    cursor_ts,
                    cursor_id,
                    limit + 1,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, name, category, price, created_at, updated_at
                    FROM   products
                    ORDER  BY created_at DESC, id DESC
                    LIMIT  $1
                    """,
                    limit + 1,
                )
        else:
            if cursor:
                cursor_ts, cursor_id = decode_cursor(cursor)
                rows = await conn.fetch(
                    """
                    SELECT id, name, category, price, created_at, updated_at
                    FROM   products
                    WHERE  category = $1
                      AND  (created_at, id) < ($2, $3)
                    ORDER  BY created_at DESC, id DESC
                    LIMIT  $4
                    """,
                    category,
                    cursor_ts,
                    cursor_id,
                    limit + 1,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, name, category, price, created_at, updated_at
                    FROM   products
                    WHERE  category = $1
                    ORDER  BY created_at DESC, id DESC
                    LIMIT  $2
                    """,
                    category,
                    limit + 1,
                )

        has_more = len(rows) > limit
        items = rows[:limit]

        next_cursor = None
        if has_more and items:
            last = items[-1]
            next_cursor = encode_cursor(last["created_at"], last["id"])

        return {
            "data": [row_to_dict(r) for r in items],
            "next_cursor": next_cursor,
        }


@app.get("/categories")
async def get_categories():
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT   category, COUNT(*) AS count
            FROM     products
            GROUP BY category
            ORDER BY category
            """
        )
        categories = [{"name": r["category"], "count": r["count"]} for r in rows]
        total_count = sum(c["count"] for c in categories)
        return [{"name": "All", "count": total_count}] + categories


class ProductCreate(BaseModel):
    name: str
    category: str
    price: float


@app.post("/products", status_code=201)
async def create_product(product: ProductCreate):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO products (name, category, price, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING id, name, category, price, created_at, updated_at
            """,
            product.name,
            product.category,
            product.price,
        )
        return row_to_dict(row)
