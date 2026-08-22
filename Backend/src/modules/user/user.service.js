import * as userRepository from "./user.repository.js";
import { sumStorageByOwner } from "../file/file.repository.js";
import ApiError from "../../utils/ApiError.js";

/**
 * Get the current user's profile + their total storage usage.
 * @param {string} userId
 */
export const getMyProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) throw new ApiError(404, "User not found.");

  const storageUsedBytes = await sumStorageByOwner(userId);

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    storageUsedBytes,
  };
};

/**
 * Update the user's profile (name only for now).
 * @param {string} userId
 * @param {{ name: string }} updates
 */
export const updateMyProfile = async (userId, updates) => {
  const user = await userRepository.updateProfile(userId, { name: updates.name });
  if (!user) throw new ApiError(404, "User not found.");
  return user;
};
