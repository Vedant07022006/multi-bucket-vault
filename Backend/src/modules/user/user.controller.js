import * as userService from "./user.service.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

export const getMe = asyncHandler(async (req, res) => {
  const profile = await userService.getMyProfile(req.user.userId);
  return ApiResponse.success(res, profile);
});

export const updateMe = asyncHandler(async (req, res) => {
  const updated = await userService.updateMyProfile(req.user.userId, req.body);
  return ApiResponse.success(res, updated, "Profile updated.");
});
