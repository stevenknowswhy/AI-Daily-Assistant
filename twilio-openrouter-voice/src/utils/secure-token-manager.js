/**
 * Secure Token Manager
 * ====================
 * 
 * Simple and secure encryption/decryption for OAuth tokens
 * using Node.js built-in crypto with AES-256-GCM
 */

import crypto from 'crypto';
import { logger } from './logger.js';

export class SecureTokenManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Validate encryption key is available
    if (!process.env.TOKEN_ENCRYPTION_KEY) {
      throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
    }
    
    this.encryptionKey = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');
    
    if (this.encryptionKey.length !== this.keyLength) {
      throw new Error(`TOKEN_ENCRYPTION_KEY must be ${this.keyLength * 2} hex characters (${this.keyLength} bytes)`);
    }
  }

  /**
   * Encrypt a token
   * @param {string} plaintext - The token to encrypt
   * @param {string} context - Additional context for encryption
   * @returns {Object} Encrypted data with metadata
   */
  encrypt(plaintext, context = 'oauth-token') {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a non-empty string');
      }

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Add additional authenticated data
      cipher.setAAD(Buffer.from(context, 'utf8'));

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      const result = {
        encrypted,
        iv: iv.toString('hex'),
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
   * Decrypt a token
   * @param {Object} encryptedData - The encrypted data object
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'object') {
        throw new Error('Encrypted data must be an object');
      }

      const { encrypted, iv, authTag, algorithm, context } = encryptedData;
      
      if (!encrypted || !iv || !authTag) {
        throw new Error('Missing required encryption metadata');
      }

      if (algorithm !== this.algorithm) {
        throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
      }

      // Create decipher
      const ivBuffer = Buffer.from(iv, 'hex');
      const decipher = crypto.createDecipheriv(algorithm, this.encryptionKey, ivBuffer);

      // Set additional authenticated data
      decipher.setAAD(Buffer.from(context || 'oauth-token', 'utf8'));

      // Set authentication tag
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
      if (value && typeof value === 'string' && key.includes('token')) {
        encryptedTokens[key] = this.encrypt(value, `${context}-${key}`);
      } else {
        encryptedTokens[key] = value; // Keep non-token values as-is
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
let _secureTokenManager = null;

export const secureTokenManager = {
  get instance() {
    if (!_secureTokenManager) {
      _secureTokenManager = new SecureTokenManager();
    }
    return _secureTokenManager;
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
