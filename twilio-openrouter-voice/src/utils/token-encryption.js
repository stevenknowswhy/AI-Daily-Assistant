/**
 * Token Encryption Utility
 * =========================
 * 
 * Secure encryption/decryption for OAuth tokens and sensitive data
 * using AES-256-GCM with proper key derivation and authentication.
 */

import crypto from 'crypto';
import { logger } from './logger.js';

export class TokenEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
    
    // Validate encryption key is available
    if (!process.env.TOKEN_ENCRYPTION_KEY) {
      throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
    }
    
    // Derive key from environment variable using PBKDF2
    this.masterKey = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');
    
    if (this.masterKey.length !== this.keyLength) {
      throw new Error(`TOKEN_ENCRYPTION_KEY must be ${this.keyLength * 2} hex characters (${this.keyLength} bytes)`);
    }
  }

  /**
   * Encrypt sensitive token data
   * @param {string} plaintext - The token to encrypt
   * @param {string} context - Additional context for encryption (e.g., 'oauth-token', 'api-key')
   * @returns {Object} Encrypted data with metadata
   */
  encrypt(plaintext, context = 'oauth-token') {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a non-empty string');
      }

      // Generate random salt and IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derive encryption key using PBKDF2 with salt
      const derivedKey = crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha256');

      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, derivedKey, iv);
      cipher.setAAD(Buffer.from(context, 'utf8'));

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      const result = {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        context
      };

      logger.debug('Token encrypted successfully', {
        context,
        encryptedLength: encrypted.length
      });

      return result;

    } catch (error) {
      logger.error('Token encryption failed', {
        error: error.message,
        context
      });
      throw new Error(`Token encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt encrypted token data
   * @param {Object} encryptedData - The encrypted data object
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'object') {
        throw new Error('Encrypted data must be an object');
      }

      const { encrypted, iv, salt, authTag, algorithm, context } = encryptedData;
      
      if (!encrypted || !iv || !salt || !authTag) {
        throw new Error('Missing required encryption metadata');
      }

      if (algorithm !== this.algorithm) {
        throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
      }

      // Derive the same key using stored salt
      const saltBuffer = Buffer.from(salt, 'hex');
      const derivedKey = crypto.pbkdf2Sync(this.masterKey, saltBuffer, 100000, this.keyLength, 'sha256');
      
      // Create decipher with IV
      const ivBuffer = Buffer.from(iv, 'hex');
      const decipher = crypto.createDecipher(algorithm, derivedKey, ivBuffer);
      decipher.setAAD(Buffer.from(context || 'oauth-token', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      logger.debug('Token decrypted successfully', {
        context: context || 'oauth-token'
      });

      return decrypted;

    } catch (error) {
      logger.error('Token decryption failed', {
        error: error.message
      });
      throw new Error(`Token decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt multiple tokens in a batch
   * @param {Object} tokens - Object containing multiple tokens
   * @param {string} context - Encryption context
   * @returns {Object} Object with encrypted tokens
   */
  encryptTokens(tokens, context = 'oauth-tokens') {
    const encryptedTokens = {};
    
    for (const [key, value] of Object.entries(tokens)) {
      if (value && typeof value === 'string') {
        encryptedTokens[key] = this.encrypt(value, `${context}-${key}`);
      } else {
        encryptedTokens[key] = value; // Keep non-string values as-is
      }
    }
    
    return encryptedTokens;
  }

  /**
   * Decrypt multiple tokens in a batch
   * @param {Object} encryptedTokens - Object containing encrypted tokens
   * @returns {Object} Object with decrypted tokens
   */
  decryptTokens(encryptedTokens) {
    const decryptedTokens = {};
    
    for (const [key, value] of Object.entries(encryptedTokens)) {
      if (value && typeof value === 'object' && value.encrypted) {
        decryptedTokens[key] = this.decrypt(value);
      } else {
        decryptedTokens[key] = value; // Keep non-encrypted values as-is
      }
    }
    
    return decryptedTokens;
  }

  /**
   * Generate a new encryption key (for setup/rotation)
   * @returns {string} Hex-encoded encryption key
   */
  static generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate encryption key format
   * @param {string} key - Hex-encoded key to validate
   * @returns {boolean} True if valid
   */
  static validateEncryptionKey(key) {
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    try {
      const buffer = Buffer.from(key, 'hex');
      return buffer.length === 32; // 256 bits
    } catch {
      return false;
    }
  }
}

// Export singleton instance (lazy initialization)
let _tokenEncryption = null;

export const tokenEncryption = {
  get instance() {
    if (!_tokenEncryption) {
      _tokenEncryption = new TokenEncryption();
    }
    return _tokenEncryption;
  },

  encrypt(plaintext, context) {
    return this.instance.encrypt(plaintext, context);
  },

  decrypt(encryptedData) {
    return this.instance.decrypt(encryptedData);
  },

  encryptTokens(tokens, context) {
    return this.instance.encryptTokens(tokens, context);
  },

  decryptTokens(encryptedTokens) {
    return this.instance.decryptTokens(encryptedTokens);
  }
};
