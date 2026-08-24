import * as folderRepository from "./folder.repository.js";
import * as fileRepository from "../file/file.repository.js";
import * as fileService from "../file/file.service.js";
import ApiError from "../../utils/ApiError.js";

/**
 * Create a new folder for the authenticated user.
 * @param {string} ownerId
 * @param {string} name
 * @param {string|null} [parentFolderId]
 */
export const createFolder = async (ownerId, name, parentFolderId = null) => {
  // Validate parent exists if specified
  if (parentFolderId) {
    const parent = await folderRepository.findById(parentFolderId);
    if (!parent) throw new ApiError(404, "Parent folder not found.");
    if (parent.ownerId.toString() !== ownerId) {
      throw new ApiError(403, "You do not own the parent folder.");
    }
  }
  return folderRepository.create({ name, ownerId, parentFolderId });
};

/**
 * List the contents (sub-folders + files) of a folder, or root if folderId is null.
 * @param {string} ownerId
 * @param {string|null} folderId
 */
export const getFolderContents = async (ownerId, folderId = null) => {
  if (folderId) {
    const folder = await folderRepository.findById(folderId);
    if (!folder) throw new ApiError(404, "Folder not found.");
    if (folder.ownerId.toString() !== ownerId) {
      throw new ApiError(403, "You do not have access to this folder.");
    }
  }

  const [subfolders, files] = await Promise.all([
    folderRepository.findChildren(ownerId, folderId),
    fileRepository.findByOwner(ownerId, folderId),
  ]);

  return { folder: folderId, subfolders, files };
};

/**
 * Recursively delete a folder, all its sub-folders, and all files within.
 * Deletes files from their buckets via fileService.deleteFile.
 * @param {string} folderId
 * @param {string} requestingUserId
 */
export const deleteFolder = async (folderId, requestingUserId) => {
  const folder = await folderRepository.findById(folderId);
  if (!folder) throw new ApiError(404, "Folder not found.");
  if (folder.ownerId.toString() !== requestingUserId) {
    throw new ApiError(403, "You do not have permission to delete this folder.");
  }

  await _recursiveDelete(folderId, requestingUserId);
};

/** Recursive helper — collects all child folder IDs then deletes files bottom-up. */
const _recursiveDelete = async (folderId, ownerId) => {
  // Delete all files in this folder
  const files = await fileRepository.findByOwner(ownerId, folderId);
  await Promise.all(files.map((f) => fileService.deleteFile(f._id.toString(), ownerId)));

  // Recurse into child folders
  const children = await folderRepository.findChildren(ownerId, folderId);
  await Promise.all(children.map((c) => _recursiveDelete(c._id.toString(), ownerId)));

  // Delete the folder itself
  await folderRepository.deleteById(folderId);
};
