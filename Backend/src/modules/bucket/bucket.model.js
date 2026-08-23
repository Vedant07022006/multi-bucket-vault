import mongoose from "mongoose";
import crypto from "crypto";
import config from "../../config/env.config.js";

// AES-256-CBC encryption helpers for storing sensitive bucket credentials
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Encrypt a plaintext string using AES-256-CBC.
 * Returns "iv:encryptedHex" format stored in MongoDB.
 */
const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(config.encryptionKey, "utf8"),
    iv
  );
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

/**
 * Decrypt a "iv:encryptedHex" string back to plaintext.
 */
const decrypt = (encryptedText) => {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedBuffer = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(config.encryptionKey, "utf8"),
    iv
  );
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]).toString();
};

const bucketSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["minio", "r2", "b2", "s3"],
      required: [true, "Provider is required"],
    },
    endpoint: {
      type: String,
      required: [true, "Endpoint URL is required"],
    },
    bucketName: {
      type: String,
      required: [true, "Bucket name is required"],
    },
    region: {
      type: String,
      default: "us-east-1",
    },
    accessKeyId: {
      type: String,
      required: [true, "Access key ID is required"],
    },
    // Stored encrypted; decrypted only when building the S3Client
    secretAccessKey: {
      type: String,
      required: [true, "Secret access key is required"],
    },
    capacityBytes: {
      type: Number,
      required: [true, "Capacity in bytes is required"],
      min: [1, "Capacity must be positive"],
    },
    usedBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "full", "offline"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Encrypt secretAccessKey before saving to MongoDB
bucketSchema.pre("save", function (next) {
  if (this.isModified("secretAccessKey")) {
    this.secretAccessKey = encrypt(this.secretAccessKey);
  }
  next();
});

/**
 * Instance method — decrypts and returns the plain-text secret.
 * Used only inside the storage adapter when building the S3Client.
 */
bucketSchema.methods.getDecryptedSecret = function () {
  return decrypt(this.secretAccessKey);
};

/** Virtual: free space remaining */
bucketSchema.virtual("freeBytes").get(function () {
  return this.capacityBytes - this.usedBytes;
});

/** Virtual: usage as a fraction (0.0 – 1.0) */
bucketSchema.virtual("usageFraction").get(function () {
  return this.usedBytes / this.capacityBytes;
});

bucketSchema.set("toJSON", { virtuals: true });
bucketSchema.set("toObject", { virtuals: true });

bucketSchema.index({ status: 1 });

const Bucket = mongoose.model("Bucket", bucketSchema);
export default Bucket;
