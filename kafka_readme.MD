# Resolve Platform — Central Kafka Infrastructure

Shared Redpanda broker (Kafka-compatible) and topic provisioning for all Resolve microservices.

**Contract source of truth:** [`Resolve_Documentation/Contracts/kafka.md`](Resolve_Documentation/Contracts/kafka.md)

## Quick start

```bash
docker compose up -d
```

This starts Redpanda on `localhost:9092` and auto-provisions all 20 topics. Check the init container logs to confirm:

```bash
docker compose logs kafka-init
```

Stop everything (data persists):

```bash
docker compose down
```

Stop and wipe all data:

```bash
docker compose down -v
```

## How services connect

Services running on the host (`npm run dev`) connect to `localhost:9092`. Each service has its own `.env` with `KAFKA_BOOTSTRAP_SERVERS` or `KAFKA_BROKERS` already set to `localhost:9092`.

The Redpanda broker advertises `localhost:9092`, so Kafka clients resolve the broker correctly from the host.

## Topics

10 main domain-event topics + 10 dead-letter queues, per the Kafka contract:

| Topic | Producer | Consumers | Partitions |
|---|---|---|---|
| `resolve.case.created` | Case Management | Audit, Search Indexer | 6 |
| `resolve.case.assigned` | Case Management | Workflow, Notification, Audit | 6 |
| `resolve.case.statuschanged` | Case Management | Workflow, Notification (REJECTED only), Audit, Search Indexer | 6 |
| `resolve.case.resolved` | Case Management | Notification, Audit | 6 |
| `resolve.task.created` | Workflow | Notification, Audit | 6 |
| `resolve.task.completed` | Workflow | Audit | 6 |
| `resolve.document.uploaded` | Document | Audit, Virus Scanner, OCR, Metadata Processor, Search Indexer | 6 |
| `resolve.document.scanned` | Document | Audit | 6 |
| `resolve.approval.requested` | Workflow | Notification, Audit | 6 |
| `resolve.approval.completed` | Workflow | Audit | 6 |

Each topic has a corresponding `.dlq` topic (1 partition) for events that exhaust retries.

### Partition strategy

Partition key is `aggregate_id` (the `resourceId` from the event envelope). This keeps all events for one case, task, document, or approval on the same partition, preserving per-aggregate ordering.

### Retry and DLQ

- Base delay 1s, doubled each retry, capped at 5 minutes.
- 5 failed attempts → event routed to `{topic}.dlq`.
- Core writes never block on Kafka availability (FR-EVT-09).

## Consumer groups

Defined per the contract — one group per consuming service:

| Group ID | Service |
|---|---|
| `resolve-audit-service` | Audit Service (subscribes to all 10 topics) |
| `resolve-notification-service` | Notification Service |
| `resolve-workflow-service` | Workflow Service |
| `resolve-search-indexer` | Search Indexer |
| `resolve-virus-scanner-worker` | Virus Scanner Worker |
| `resolve-ocr-worker` | OCR Worker |
| `resolve-metadata-processor` | Metadata Processor |

Consumer groups are created automatically by Kafka when a consumer subscribes. No manual setup needed.

## Manual topic provisioning

Topics are created automatically on `docker compose up`. To re-run provisioning manually:

```bash
docker exec resolve-kafka /bin/sh /scripts/create-topics.sh
```

The script is idempotent — existing topics are skipped.

## Verify topics

```bash
docker exec resolve-kafka rpk topic list
```

Or consume a topic live:

```bash
docker exec -it resolve-kafka rpk topic consume resolve.document.uploaded
```

## Architecture notes

- **Redpanda** is used instead of Apache Kafka to avoid ZooKeeper and JVM dependencies. It's Kafka-protocol compatible — all services use KafkaJS, which works unchanged.
- The `kafka-init` container shares the Redpanda container's network namespace (`network_mode: "service:redpanda"`), so `rpk` connects to `localhost:9092` without any advertised-address issues.
- Redpanda data persists in a named Docker volume (`redpanda-data`). `docker compose down` preserves it; `docker compose down -v` deletes it.
- Admin API is exposed on port 9644 for debugging via `rpk cluster health`.

## Service-specific Kafka configuration

| Service | Env var | Default | Enable |
|---|---|---|---|
| Audit Service | `KAFKA_ENABLED` | `false` | Set `true` + configure `KAFKA_BOOTSTRAP_SERVERS` |
| Document Service | `KAFKA_BROKERS` | `localhost:9092` | Already configured; outbox relay auto-starts |
| Case Management | *(not built yet)* | — | — |
| Workflow Service | *(not built yet)* | — | — |
| Notification Service | *(not built yet)* | — | — |
