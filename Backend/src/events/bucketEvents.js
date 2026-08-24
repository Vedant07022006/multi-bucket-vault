import { EventEmitter } from "events";

/**
 * Observer Pattern — Bucket Events
 *
 * A singleton EventEmitter for bucket-lifecycle events.
 * Decouples "bucket got full" from "what should happen next."
 *
 * Emitted events:
 *   - "bucket:nearFull"  { bucketId }  → triggers rebalance job
 *
 * Subscribers are registered in server.js on startup.
 * In production, the BullMQ job queue is the concrete realization of this
 * decoupling — the EventEmitter is the lightweight in-process equivalent.
 */
class BucketEventEmitter extends EventEmitter {}

const bucketEvents = new BucketEventEmitter();
export default bucketEvents;
