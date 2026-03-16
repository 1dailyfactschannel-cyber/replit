import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Encrypt a token using bcrypt (one-way hashing)
 * Note: This is for verification only, not for decryption
 * For actual encryption/decryption, consider using crypto library
 */
export async function encryptToken(token: string): Promise<string> {
  if (!token) {
    throw new Error("Token cannot be empty");
  }
  return await bcrypt.hash(token, SALT_ROUNDS);
}

/**
 * Compare a token with its encrypted hash
 * @param token Plain token to verify
 * @param hash Encrypted hash to compare against
 * @returns True if token matches hash
 */
export async function compareToken(token: string, hash: string): Promise<boolean> {
  if (!token || !hash) {
    return false;
  }
  return await bcrypt.compare(token, hash);
}

// For actual encryption/decryption (if needed in future), we could add:
// import crypto from "crypto";
// ... but for OAuth token verification, bcrypt comparison is sufficient