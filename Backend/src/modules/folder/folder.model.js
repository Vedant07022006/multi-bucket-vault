import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Folder name is required"],
      trim: true,
      maxlength: [255, "Folder name cannot exceed 255 characters"],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // null = root folder (top-level); otherwise points to parent folder
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate folder names within the same parent for the same user
folderSchema.index({ ownerId: 1, parentFolderId: 1, name: 1 }, { unique: true });

const Folder = mongoose.model("Folder", folderSchema);
export default Folder;
