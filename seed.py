#!/usr/bin/env python3
"""
seed.py — Generates 200,000 mock products and streams them into
PostgreSQL using psycopg's COPY protocol for maximum speed.

Usage:
    python seed.py
"""

import os
import io
import csv
import time
import random
from datetime import datetime, timedelta, timezone

import psycopg
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/products_db")
NUM_PRODUCTS = 200_000

CATEGORIES = [
    "Electronics", "Clothing", "Home & Kitchen", "Sports & Outdoors",
    "Books", "Beauty", "Toys & Games", "Automotive",
    "Grocery", "Health & Wellness",
]

ADJECTIVES = [
    "Premium", "Classic", "Ultra", "Pro", "Elite",
    "Essential", "Deluxe", "Smart", "Eco", "Turbo",
    "Compact", "Advanced", "Portable", "Heavy-Duty", "Lightweight",
]

NOUNS = [
    "Widget", "Gadget", "Device", "Tool", "Gear",
    "Kit", "Set", "Pack", "Bundle", "System",
    "Station", "Hub", "Module", "Adapter", "Controller",
]


def generate_products_tsv() -> io.StringIO:
    """Generate NUM_PRODUCTS rows as tab-separated text in memory."""
    now = datetime.now(timezone.utc)
    one_year_ago = now - timedelta(days=365)
    total_seconds = int((now - one_year_ago).total_seconds())

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter="\t", lineterminator="\n")

    for i in range(NUM_PRODUCTS):
        category = random.choice(CATEGORIES)
        name = f"{random.choice(ADJECTIVES)} {random.choice(NOUNS)} {category[:3]}-{i + 1}"
        price = round(random.uniform(1.99, 999.99), 2)

        created_offset = random.randint(0, total_seconds)
        created_at = one_year_ago + timedelta(seconds=created_offset)

        update_offset = random.randint(0, int((now - created_at).total_seconds()))
        updated_at = created_at + timedelta(seconds=update_offset)

        writer.writerow([
            name,
            category,
            f"{price:.2f}",
            created_at.isoformat(),
            updated_at.isoformat(),
        ])

    buf.seek(0)
    return buf


def main() -> None:
    print("\n🗄️  Product Seeder — psycopg COPY")
    print("=" * 45)

    # ── Step 1: Generate data in memory ──────────────────
    print(f"\n⏳ Generating {NUM_PRODUCTS:,} products in memory...")
    t0 = time.perf_counter()
    tsv_buffer = generate_products_tsv()
    gen_time = time.perf_counter() - t0
    print(f"   ✅ Generated in {gen_time:.2f}s")

    # ── Step 2: Connect and prepare schema ───────────────
    print(f"\n🔌 Connecting to PostgreSQL...")
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Apply schema
            with open("schema.sql") as f:
                cur.execute(f.read())
            conn.commit()
            print("   ✅ Schema applied")

            # Truncate existing data
            cur.execute("TRUNCATE products RESTART IDENTITY CASCADE")
            conn.commit()
            print("   🗑️  Table truncated")

            # ── Step 3: COPY data ────────────────────────
            print(f"\n⚡ Streaming data via COPY...")
            t0 = time.perf_counter()
            with cur.copy(
                "COPY products (name, category, price, created_at, updated_at) FROM STDIN"
            ) as copy:
                for line in tsv_buffer:
                    copy.write(line)
            conn.commit()
            copy_time = time.perf_counter() - t0
            print(f"   ✅ COPY completed in {copy_time:.2f}s")

            # ── Step 4: Verify ───────────────────────────
            cur.execute("SELECT COUNT(*) FROM products")
            count = cur.fetchone()[0]

            cur.execute("SELECT COUNT(DISTINCT category) FROM products")
            cats = cur.fetchone()[0]

    print(f"\n{'=' * 45}")
    print(f"✅ Done! {count:,} products across {cats} categories")
    print(f"   Generation: {gen_time:.2f}s | COPY: {copy_time:.2f}s | Total: {gen_time + copy_time:.2f}s")
    print()


if __name__ == "__main__":
    main()
