/**
 * Chain of Responsibility Pattern — Upload Pipeline Base Step
 *
 * Each upload step:
 *  1. Receives a shared `context` object.
 *  2. Does its work and mutates context as needed.
 *  3. Calls this.next(context) to pass to the next step — OR sets context.error
 *     and returns early to short-circuit the chain.
 *
 * The context object shape (built by file.service.js before running the chain):
 * {
 *   // Input
 *   file: { buffer, originalname, mimetype, size },
 *   ownerId: string,
 *   folderId: string|null,
 *
 *   // Populated by steps
 *   chunks: Array<{ data, hash, sizeBytes }>,  // chunkStep
 *   chunkAssignments: Array<{ ...chunk, bucketId, key, skipUpload, existingLocation }>,
 *   presignedUrls: Array<{ order, url, bucketId, key }>,
 *   savedFile: mongoose.Document,              // saveMetadataStep
 *   error: ApiError|null,                     // set on failure
 * }
 */
class UploadStepBase {
  constructor() {
    this._next = null;
  }

  /**
   * Set the next step in the chain.
   * @param {UploadStepBase} step
   * @returns {UploadStepBase} The next step (enables fluent chaining: a.setNext(b).setNext(c))
   */
  setNext(step) {
    this._next = step;
    return step;
  }

  /**
   * Execute this step, then pass to the next if no error occurred.
   * Subclasses override execute() — not handle().
   * @param {Object} context
   */
  async handle(context) {
    await this.execute(context);

    if (!context.error && this._next) {
      await this._next.handle(context);
    }
  }

  /**
   * Override in subclasses. Set context.error to short-circuit the chain.
   * @param {Object} context
   */
  // eslint-disable-next-line no-unused-vars
  async execute(context) {
    throw new Error("UploadStepBase.execute() must be implemented by subclass.");
  }
}

export default UploadStepBase;
