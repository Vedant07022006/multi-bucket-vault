import crypto from "crypto";

/**
 * Merkle Tree
 *
 * Builds a binary hash tree over chunk hashes so that any chunk's
 * integrity can be verified without re-downloading the entire file.
 *
 * Structure:
 *  - Leaves are chunk content hashes (SHA-256).
 *  - Each internal node is SHA-256(leftChild + rightChild).
 *  - Root hash is stored in the File document (merkleRoot field).
 *
 * Used by: saveMetadataStep.js (build), file.service.js download verify (verifyChunk).
 */

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

/**
 * Build a Merkle tree from an array of chunk hashes.
 * @param {string[]} chunkHashes - SHA-256 hex strings, one per chunk
 * @returns {{ root: string, levels: string[][] }} root hash and all tree levels
 */
export const buildTree = (chunkHashes) => {
  if (!chunkHashes || chunkHashes.length === 0) {
    throw new Error("Cannot build Merkle tree from empty chunk list.");
  }

  const levels = [chunkHashes.slice()]; // Level 0 = leaves
  let current = chunkHashes.slice();

  while (current.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      // If odd number of nodes, duplicate the last one (standard Merkle padding)
      const right = current[i + 1] ?? current[i];
      nextLevel.push(sha256(left + right));
    }
    levels.push(nextLevel);
    current = nextLevel;
  }

  return { root: current[0], levels };
};

/**
 * Generate an inclusion proof for a specific chunk (by index).
 * The proof is an ordered list of sibling hashes needed to recompute the root.
 * @param {string[][]} levels - All levels from buildTree()
 * @param {number} chunkIndex - 0-based index of the chunk to prove
 * @returns {Array<{hash: string, position: 'left'|'right'}>}
 */
export const generateProof = (levels, chunkIndex) => {
  const proof = [];
  let index = chunkIndex;

  for (let level = 0; level < levels.length - 1; level++) {
    const siblings = levels[level];
    const isLeft = index % 2 === 0;
    const siblingIndex = isLeft ? index + 1 : index - 1;
    const sibling = siblings[siblingIndex] ?? siblings[index]; // padding case

    proof.push({ hash: sibling, position: isLeft ? "right" : "left" });
    index = Math.floor(index / 2);
  }

  return proof;
};

/**
 * Verify that a chunk's data matches the stored Merkle root.
 * @param {Buffer|string} chunkData - Raw chunk buffer or its SHA-256 hex hash
 * @param {Array<{hash: string, position: 'left'|'right'}>} proof
 * @param {string} rootHash - The stored merkleRoot from the File document
 * @returns {boolean}
 */
export const verifyChunk = (chunkData, proof, rootHash) => {
  let current =
    typeof chunkData === "string"
      ? chunkData
      : sha256(chunkData);

  for (const { hash, position } of proof) {
    current =
      position === "right"
        ? sha256(current + hash)
        : sha256(hash + current);
  }

  return current === rootHash;
};
