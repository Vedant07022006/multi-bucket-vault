import Folder from "./folder.model.js";

/**
 * Repository/DAO Pattern — folder.repository.js
 * Only Mongoose queries. No business logic.
 */

export const create = (folderData) => Folder.create(folderData);

/** @param {string} ownerId */
export const findByOwner = (ownerId) => Folder.find({ ownerId }).sort({ name: 1 });

/**
 * Find all immediate children of a folder (or root-level folders if parentFolderId is null).
 * @param {string} ownerId
 * @param {string|null} parentFolderId
 */
export const findChildren = (ownerId, parentFolderId = null) =>
  Folder.find({ ownerId, parentFolderId }).sort({ name: 1 });

/** @param {string} folderId */
export const findById = (folderId) => Folder.findById(folderId);

/** @param {string} folderId */
export const deleteById = (folderId) => Folder.findByIdAndDelete(folderId);

/**
 * Rename a folder.
 * @param {string} folderId
 * @param {string} newName
 */
export const rename = (folderId, newName) =>
  Folder.findByIdAndUpdate(folderId, { name: newName }, { new: true });
