# Notification Service — System Design

---

## A. Architecture Design

### 1. High-Level System Diagram
![Getting Started](images/Notification%20Service.png)

---

### 2. Key Components and Responsibilities

**API Gateway**: 
Rate limiting, Authentication (JWT/API keys)

**API Service**:
Accepts incoming notification requests, validates payloads, handles auth, and routes to either the scheduler or immediate dispatch

**Scheduler Service**:
Stores future-dated notifications and uses a polling mechanism to enqueue them at the right time.

**Message Broker**:
Decouple API from delivery, buffer spikes improving reliability

**Services Workers**:
Consume messsages, call the appropriate third-party provider, emit delivery event

**Status Tracker**:
Consumes delivery event and writes outcomes to the database. Exposes a query API for clients to check delivery status.

---

### 3. Database Schema

```sql
-- Core notification record
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  channel       ENUM('email','sms','push','in_app') NOT NULL,
  template_id   UUID,
  payload       JSONB NOT NULL,           -- rendered content
  scheduled_at  TIMESTAMPTZ,              -- NULL = send immediately
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  idempotency_key VARCHAR(255) UNIQUE     -- prevent duplicate sends
);

-- Delivery attempts (separate table — append-only)
CREATE TABLE delivery_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id  UUID REFERENCES notifications(id),
  attempted_at     TIMESTAMPTZ DEFAULT NOW(),
  status           ENUM('pending','sent','failed','bounced') NOT NULL,
  provider_response JSONB,               -- raw provider status/error
  attempt_number   SMALLINT NOT NULL
);

-- Index for status polling and retries
CREATE INDEX idx_delivery_notification ON delivery_attempts(notification_id);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at)
  WHERE scheduled_at IS NOT NULL;
```

**Partitioning strategy:** Partition `notifications` and `delivery_attempts` by `created_at` (monthly ranges). Older partitions can be archived to cold storage (S3 + Athena) after 90 days.

---

### 4. Technology Stack

| Layer | Choice | Justification |
|---|---|---|
| API | Go | Go preferred at scale for lower memory footprint |
| Message Broker | RabbitMQ | Built-in DLQ, flexible exchange/routing model, simpler ops, sufficient throughput for 1M+/day |
| Scheduler | Redis sorted sets | `ZADD` by Unix timestamp, `ZRANGEBYSCORE` poll every 5s — simple, fast, no extra infra |
| Primary DB | PostgreSQL | JSONB for flexible payloads, strong consistency for idempotency keys, mature ecosystem |
| Cache / State | Redis | Status caching, rate limiting, scheduler, distributed locks |
| Email | SendGrid | Deliverability reputation, webhooks for bounce/open tracking |
| SMS | Twilio | Reliable, global coverage, fallback routing built-in |
| Push | FCM + APNs | Platform-required; abstracted behind a thin wrapper |
| Infra | Kubernetes + KEDA | Worker autoscaling per channel based on RabbitMQ queue depth |

---

### 5. Reliability Mechanisms

**Idempotency keys** on every notification prevent duplicate sends if the API is called more than once due to network retries.

**Message durability** — declare all queues and exchanges as `durable: true` and publish messages with `persistent: true` (delivery mode 2). This ensures messages survive a broker restart.

**Publisher confirms** — the API waits for RabbitMQ to acknowledge receipt before returning a success response to the caller. Without this, a broker crash between publish and persistence loses the message silently.

**Retry with exponential backoff** — RabbitMQ doesn't have native delayed retry, so the standard pattern is a **dead-letter exchange (DLX) with TTL queues**:

```
Main Queue → worker fails → DLX → Retry-1m queue (TTL 60s)
                                         │ expires
                                         └──► Main Queue (attempt 2)
                                              ... repeat for 5m, 30m, 2h ...
                                         └──► DLQ after max attempts
```

The worker tracks attempt count in the message headers.

**Dead Letter Queue** — after exhausting retries, the message lands in a final DLQ. An alert fires to ops. A replay process can re-publish to the main exchange after the root cause is resolved. Since every notification is written to Postgres before being published, the DB can also serve as a replay source.

**Prefetch / QoS** — set `prefetch_count` on each worker (e.g. 10) so a slow worker doesn't accumulate unacked messages it can't process, which would block other consumers.

**Circuit breaker** per provider — if SendGrid error rate exceeds a threshold in a 60s window, stop consuming from the email queue and alert. Optionally route to a backup provider (e.g. Mailgun).

---

## B. Scalability & Performance

### Scaling from 100K to 1M+ Notifications/Day

100K/day is ~1–2/sec average; 1M/day is ~12/sec. Neither number is close to RabbitMQ's throughput ceiling. The scaling levers are:

- Add more consumer replicas per queue (competing consumers, no coordination needed)
- Use KEDA to autoscale worker pods in Kubernetes based on queue depth, targeting near-zero lag
- Add PgBouncer in front of Postgres to manage connection pooling as DB write volume grows
- Add Postgres read replicas to offload status query traffic from the primary

No structural changes needed between 100K and 1M/day — it's purely horizontal scaling of existing components.

### Handling Traffic Spikes (e.g. 50K in 5 Minutes)

50K in 5 minutes is ~167/sec — well within RabbitMQ's capacity. The API publishes to the broker immediately and returns; the queue absorbs the burst and workers drain it as they scale up.

Two things to configure in advance for large backlogs:

- **Lazy queues** — store queue contents to disk rather than RAM, trading some throughput for resilience under load. Essential if backlogs can grow to tens of thousands.
- **Memory high watermark** — configure RabbitMQ's memory limit (default 40% of RAM) and ensure disk alarms are set so the broker flow-controls producers rather than crashing under memory pressure.

KEDA will scale worker pods within ~60 seconds of queue depth growing, so the backlog drains quickly after the initial spike.

### High Availability and Fault Tolerance

- **RabbitMQ** runs as a Quorum Queue cluster (3 nodes across availability zones). Quorum queues use Raft-based replication and are the modern replacement for classic mirrored queues — more reliable under network partitions.
- **Postgres** runs Multi-AZ with synchronous replication to a hot standby (RDS Multi-AZ or equivalent).
- **Redis** runs in Sentinel or Cluster mode across AZs.
- **Workers** are stateless — a crashed pod loses nothing, because its unacked messages are automatically requeued by RabbitMQ after the consumer timeout expires.
- **API layer** sits behind a load balancer with health checks and multiple replicas spread across AZs.

---

## C. Trade-offs

### 1. Building In-House vs. Third-Party Services

Building in-house gives you full control over data, custom routing logic, scheduling, retry behaviour, and no per-notification costs at scale. The trade-off is that you own deliverability reputation for email, carrier relationships for SMS, and ongoing ops burden.

The practical middle ground: **use third-party providers for actual delivery** (SendGrid, Twilio, FCM/APNs) but build your own orchestration layer on top. You get deliverability expertise and infrastructure from the providers while keeping control over scheduling, routing, retry logic, and status tracking. Going fully third-party (e.g. AWS SNS for everything) saves engineering time early but limits customisation and creates vendor lock-in on core business logic.

### 2. SQL vs. NoSQL

PostgreSQL is the right choice here for several reasons. Idempotency keys require unique constraint guarantees that are difficult to enforce reliably in most NoSQL stores. The notification and delivery tables have a clear relational structure. And ACID transactions matter when transitioning notification state. The JSONB payload column provides the schema flexibility that people often reach for NoSQL to get, without giving up relational guarantees.

NoSQL (e.g. DynamoDB) would be worth considering if you hit Postgres write throughput limits and needed to shard — but 1M/day at ~12 writes/sec sustained is well within Postgres's comfort zone. Use NoSQL as a specific optimisation when needed, not as a default.

### 3. Synchronous vs. Asynchronous Processing

Synchronous delivery — where the API call blocks until the SMS or email is actually sent — is not viable at any real scale. Latency would be high and variable (provider p99 becomes your p99), and a provider outage would cascade into API downtime.

Asynchronous is the right choice: the API returns a notification ID immediately, delivery happens in the background, and status is queryable separately. The trade-off is that callers must poll or subscribe for delivery confirmation rather than getting it inline, which adds a small amount of client complexity but is well worth it.

The one nuance is **publisher confirms** at the broker boundary: the API does wait for RabbitMQ to acknowledge that the message is durably stored before returning a success response. This adds a small synchronous step at publish time, but it's necessary for durability and imperceptible to the caller.