import * as folderService from "./folder.service.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

export const createFolder = asyncHandler(async (req, res) => {
  const { name, parentFolderId } = req.body;
  if (!name) return ApiResponse.error(res, "Folder name is required.", 400);

  const folder = await folderService.createFolder(req.user.userId, name, parentFolderId ?? null);
  return ApiResponse.created(res, folder, "Folder created.");
});

export const getFolderContents = asyncHandler(async (req, res) => {
  // folderId = null means root; pass a path param of "root" or a real ObjectId
  const folderId = req.params.id === "root" ? null : req.params.id;
  const contents = await folderService.getFolderContents(req.user.userId, folderId);
  return ApiResponse.success(res, contents);
});

export const deleteFolder = asyncHandler(async (req, res) => {
  await folderService.deleteFolder(req.params.id, req.user.userId);
  return ApiResponse.success(res, null, "Folder and all its contents deleted.");
});
