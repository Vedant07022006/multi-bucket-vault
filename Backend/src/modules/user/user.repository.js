import User from "./user.model.js";

/**
 * Repository/DAO Pattern — user.repository.js
 * Only Mongoose queries. No business logic.
 */

export const findById = (userId) => User.findById(userId);

/**
 * Update user profile fields (name only — email changes require re-verification).
 * @param {string} userId
 * @param {{ name?: string }} updates
 */
export const updateProfile = (userId, updates) =>
  User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });

/** @param {string} userId */
export const deleteUser = (userId) => User.findByIdAndDelete(userId);
