import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    // Never store plaintext passwords — only the bcrypt hash
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false, // Excluded from queries by default; use .select('+passwordHash') when needed
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * Instance method — compare a plain password against the stored hash.
 * Lives on the model (not the service) because it's a data operation tied
 * to the document itself.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Indexes for frequently queried fields
userSchema.index({ email: 1 });

const User = mongoose.model("User", userSchema);
export default User;
