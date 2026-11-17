#!/bin/sh
# Idempotent topic provisioning for the Resolve Kafka pipeline.
#
# Creates 10 main domain-event topics (6 partitions each) and 10
# dead-letter-queue topics (1 partition each) per the contract in
# Resolve_Documentation/Contracts/kafka.md.
#
# Safe to re-run: existing topics are skipped.
#
# When run inside the docker-compose kafka-init container (network_mode:
# service:redpanda), localhost:9092 reaches the broker directly.
# When run standalone via `docker exec resolve-kafka /bin/sh /create-topics.sh`,
# the same applies because it executes inside the Redpanda container.

set -e

PARTITIONS="${PARTITIONS:-6}"

echo "=== Provisioning Resolve Kafka topics ==="
echo ""

# ---------------------------------------------------------------------------
# Main domain-event topics
#   Partition key: aggregate_id (resourceId) for per-aggregate ordering.
#   6 partitions gives consumers room to parallelize without over-partitioning
#   for the project's scale (5+ orgs, 100 concurrent users, 10k cases).
# ---------------------------------------------------------------------------
echo "--- Main topics ($PARTITIONS partitions each) ---"

MAIN_TOPICS="
  resolve.case.created
  resolve.case.assigned
  resolve.case.statuschanged
  resolve.case.resolved
  resolve.task.created
  resolve.task.completed
  resolve.document.uploaded
  resolve.document.scanned
  resolve.approval.requested
  resolve.approval.completed
"

for topic in $MAIN_TOPICS; do
  if rpk topic describe "$topic" >/dev/null 2>&1; then
    echo "  $topic -- already exists, skipping"
  else
    rpk topic create "$topic" --partitions "$PARTITIONS" --replicas 1 >/dev/null
    echo "  $topic -- created ($PARTITIONS partitions)"
  fi
done

echo ""

# ---------------------------------------------------------------------------
# Dead-letter-queue topics
#   Naming: {topic}.dlq  (per kafka.md section 5)
#   1 partition each -- DLQs are low-volume inspection queues, not throughput
#   critical.
# ---------------------------------------------------------------------------
echo "--- DLQ topics (1 partition each) ---"

DLQ_TOPICS="
  resolve.case.created.dlq
  resolve.case.assigned.dlq
  resolve.case.statuschanged.dlq
  resolve.case.resolved.dlq
  resolve.task.created.dlq
  resolve.task.completed.dlq
  resolve.document.uploaded.dlq
  resolve.document.scanned.dlq
  resolve.approval.requested.dlq
  resolve.approval.completed.dlq
"

for topic in $DLQ_TOPICS; do
  if rpk topic describe "$topic" >/dev/null 2>&1; then
    echo "  $topic -- already exists, skipping"
  else
    rpk topic create "$topic" --partitions 1 --replicas 1 >/dev/null
    echo "  $topic -- created (1 partition)"
  fi
done

echo ""
echo "=== Topic provisioning complete ==="
echo ""
echo "Final topic list:"
rpk topic list
