import * as authService from "./auth.service.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

/**
 * Thin controllers — read req, call one service method, respond via ApiResponse.
 * No business logic lives here.
 */

export const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  return ApiResponse.created(res, result, "Account created successfully.");
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return ApiResponse.success(res, result, "Logged in successfully.");
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  return ApiResponse.success(res, result, "Access token refreshed.");
});

export const logout = asyncHandler(async (req, res) => {
  // req.user is attached by auth.middleware after JWT verification
  await authService.logout(req.user.userId);
  return ApiResponse.success(res, null, "Logged out successfully.");
});
