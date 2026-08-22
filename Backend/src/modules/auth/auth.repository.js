import User from "../user/user.model.js";

/**
 * Repository/DAO Pattern — auth.repository.js
 *
 * Only Mongoose queries. No password hashing, no token logic — that belongs
 * in auth.service.js. Isolates DB specifics from business logic.
 */

/**
 * Find a user by email, explicitly including the passwordHash field
 * (excluded by default via `select: false` in the schema).
 * @param {string} email
 * @returns {Promise<import('mongoose').Document|null>}
 */
export const findUserByEmail = (email) =>
  User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

/**
 * Create a new user document. Caller (auth.service) is responsible for
 * hashing the password before calling this — repositories don't know about bcrypt.
 * @param {{ name: string, email: string, passwordHash: string }} userData
 * @returns {Promise<import('mongoose').Document>}
 */
export const createUser = (userData) => User.create(userData);

/**
 * Find a user by their MongoDB _id (no sensitive fields).
 * @param {string} userId
 */
export const findUserById = (userId) => User.findById(userId);
