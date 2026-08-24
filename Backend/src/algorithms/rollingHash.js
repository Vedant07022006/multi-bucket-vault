import crypto from "crypto";

/**
 * Rabin-Karp Content-Defined Chunking (Rolling Hash)
 *
 * Splits a Buffer into variable-size chunks based on content, not fixed offsets.
 * This is critical for deduplication: if a file's beginning is edited, a fixed-size
 * chunker would shift ALL subsequent chunk boundaries, creating all new hashes.
 * A content-defined chunker keeps unchanged portions in the same chunks.
 *
 * Algorithm:
 *  - Slide a window across the buffer, maintaining a rolling polynomial hash.
 *  - When the hash modulo a divisor equals a magic value, cut a chunk boundary.
 *  - Output: array of { data: Buffer, hash: string }.
 *
 * Used by: chunkStep.js in the upload pipeline.
 */

const WINDOW_SIZE = 48;          // Rolling window width in bytes
const MAGIC_VALUE = 0;           // Cut when (rollingHash % DIVISOR) === MAGIC_VALUE
const BASE = 257;                // Prime base for Rabin fingerprint
const MOD = 2 ** 31 - 1;        // Large prime modulus to prevent overflow
// Precomputed: BASE^(WINDOW_SIZE-1) % MOD — used to slide the window
const BASE_POW = (() => {
  let result = 1n;
  const b = BigInt(BASE);
  const m = BigInt(MOD);
  for (let i = 0; i < WINDOW_SIZE - 1; i++) result = (result * b) % m;
  return Number(result);
})();

/**
 * Splits `buffer` into content-defined chunks.
 *
 * @param {Buffer} buffer - The full file buffer
 * @param {number} targetChunkSize - Target average chunk size in bytes
 * @returns {Array<{data: Buffer, hash: string, sizeBytes: number}>}
 */
export const chunkBuffer = (buffer, targetChunkSize = 5 * 1024 * 1024) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return [];

  const divisor = Math.max(1, targetChunkSize >> 1); // divisor ≈ half the target size
  const minChunkSize = Math.floor(targetChunkSize / 4);
  const maxChunkSize = targetChunkSize * 4;

  const chunks = [];
  let start = 0;
  let hash = 0;
  // Fill initial window
  for (let i = 0; i < Math.min(WINDOW_SIZE, buffer.length); i++) {
    hash = (hash * BASE + buffer[i]) % MOD;
  }

  for (let i = WINDOW_SIZE; i < buffer.length; i++) {
    // Slide window: remove outgoing byte, add incoming byte
    hash = ((hash - buffer[i - WINDOW_SIZE] * BASE_POW % MOD + MOD) * BASE + buffer[i]) % MOD;

    const chunkLen = i - start + 1;

    const isBoundary = chunkLen >= minChunkSize && hash % divisor === MAGIC_VALUE;
    const isMaxReached = chunkLen >= maxChunkSize;

    if (isBoundary || isMaxReached) {
      const data = buffer.slice(start, i + 1);
      chunks.push({ data, hash: sha256(data), sizeBytes: data.length });
      start = i + 1;
      hash = 0;
    }
  }

  // Remaining bytes form the last chunk
  if (start < buffer.length) {
    const data = buffer.slice(start);
    chunks.push({ data, hash: sha256(data), sizeBytes: data.length });
  }

  return chunks;
};

/** SHA-256 hash of a buffer — used as each chunk's content fingerprint */
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
