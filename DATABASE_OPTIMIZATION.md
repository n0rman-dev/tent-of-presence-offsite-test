# Database & Performance Optimization

---

## A. Query Optimization

### 1. The SQL Query

```sql
SELECT
    u.id,
    u.username,
    u.email,
    u.created_at,
    COUNT(DISTINCT o.id)        AS total_orders,
    SUM(o.total_amount)         AS total_spent
FROM users u
INNER JOIN orders o
    ON o.user_id = u.id
WHERE o.status != 'cancelled'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.username, u.email, u.created_at
ORDER BY total_spent DESC
LIMIT 10;
```

### 2. Indexes to Add

```sql
-- covers the WHERE clause filter and supports the JOIN
-- A partial index on non-cancelled orders reduces index size significantly
CREATE INDEX idx_orders_user_created
    ON orders (user_id, created_at)
    WHERE status != 'cancelled';
```

The composite `(user_id, created_at)` index lets PostgreSQL satisfy both the JOIN and the date range filter in one index scan, avoiding a sequential scan on the orders table entirely.

### 3. When Indexes Aren't Enough

**Materialized View** to pre-aggregate daily spending and refresh on a schedule:

```sql
CREATE MATERIALIZED VIEW mv_user_spending_30d AS
SELECT
    user_id,
    COUNT(DISTINCT id) AS total_orders,
    SUM(total_amount)  AS total_spent,
    MAX(created_at)    AS last_order_at
FROM orders
WHERE status != 'cancelled'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id;

CREATE UNIQUE INDEX ON mv_user_spending_30d (user_id);
CREATE INDEX ON mv_user_spending_30d (total_spent DESC);

-- Refresh concurrently (no table lock) via pg_cron
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_spending_30d;
```

The report query then becomes a trivial indexed lookup against the view instead of a full aggregation. Other strategies worth considering: **table partitioning** by `created_at` so the planner only scans the relevant partition, **read replicas** for reporting workloads to offload the primary, and **result caching** at the application layer (Redis with a 5–15 minute TTL) since this leaderboard doesn't need to be real-time.

---

## B. Recently Viewed Products Feature

### 1. Schema Changes
```sql
CREATE TABLE product_views (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    viewed_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_views_user_time ON product_views (user_id, viewed_at DESC);
```

### 2. SQL vs NoSQL
Both is should be used.
NoSQL fits naturally because the data shape is a simple ranked list with no relationships or joins, the cap can be enforced atomically on every write, and reads need to be sub-millisecond since they're blocking a homepage render. A key-value store with sorted set support is the most natural fit, the data structure itself encodes the ranking and enforces the cap in one atomic operation.
SQL handles product data retrieval: once you have the 50 IDs from NoSQL, a single query hydrates the full details.

### 3. Enforcing the 50-Item Limit

The trimming happens atomically in NoSQL on every write using a pipeline:

```python
pipe = redis.pipeline()
pipe.zadd(key, {product_id: timestamp})  # add item
pipe.zremrangebyrank(key, 0, -51)        # trim to 50 in same transaction
pipe.execute()                           # both happen together or not at all
```

No separate cleanup job needed for the cap.

### 4. API Endpoint Design

```
# Record a view (fire-and-forget, async)
POST /api/v1/products/{product_id}/view
Authorization: Bearer <token>
→ 204 No Content

# Fetch recently viewed (homepage)
GET /api/v1/users/me/recently-viewed?limit=20
Authorization: Bearer <token>
→ 200 OK
```

```json
{
  "items": [
    {
      "product_id": "uuid",
      "name": "Product Name",
      "price": 29.99,
      "image_url": "...",
      "viewed_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 20
}
```

The `POST` endpoint is async (queued via a background task) so it never blocks the user's page load. The `GET` fetches IDs from NoSQL, then does a single `WHERE id = ANY(:ids)` query against SQL (or a product cache) to hydrate the details.

---

## C. Scaling the Orders Table (10M+ Rows)

### 1. Query Performance

The highest-leverage changes in priority order:

**Partition the table** by `created_at`, most queries filter by date, so this alone can turn 10M-row scans into 300K-row scans:

```sql
CREATE TABLE orders_partitioned (
    LIKE orders INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_q1 PARTITION OF orders_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
-- repeat quarterly...
```

**Targeted composite indexes** on the access patterns with `pg_stat_statements`. **Connection pooling** via PgBouncer, since connection overhead compounds under load.

### 2. Archiving Old Data

The goal is to keep old data queryable without it polluting hot query paths:

```sql
-- Archive table (can live on cheaper storage / different tablespace)
CREATE TABLE orders_archive (LIKE orders INCLUDING ALL);

-- Move old orders in safe batches, never lock the whole table
WITH archived AS (
    DELETE FROM orders
    WHERE created_at < NOW() - INTERVAL '2 years'
      AND id IN (
          SELECT id FROM orders
          WHERE created_at < NOW() - INTERVAL '2 years'
          LIMIT 10000
      )
    RETURNING *
)
INSERT INTO orders_archive SELECT * FROM archived;
```

Run this loop during off-peak hours. For querying across both tables without application changes, expose a `UNION ALL` view:

```sql
CREATE VIEW orders_all AS
    SELECT * FROM orders
    UNION ALL
    SELECT * FROM orders_archive;
```

### 3. Zero-Downtime Optimization
For the partition migration specifically, the safe path is to create the new partitioned table in parallel, sync data across via a background copy job, then cut over with a brief swap of the table name. Users only see the cutover, not the migration work.

The batch archive job from part 2 is already written safely, deleting in chunks of 10,000 rows avoids long-running transactions that would block reads. The UNION ALL view also requires no downtime since it's purely additive.