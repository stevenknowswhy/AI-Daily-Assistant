/**
 * Token Encryption Tests
 * ======================
 * 
 * Comprehensive test suite for OAuth token encryption functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { TokenEncryption } from '../src/utils/token-encryption.js';

describe('Token Encryption Security Tests', () => {
  let tokenEncryption;
  const originalEnvKey = process.env.TOKEN_ENCRYPTION_KEY;

  beforeAll(() => {
    // Set a test encryption key
    process.env.TOKEN_ENCRYPTION_KEY = '941c8b770cb397238758a9d6ff8f4a90e07aebd2f2a4e4ef50c91e96de54e35f';
    tokenEncryption = new TokenEncryption();
  });

  afterAll(() => {
    // Restore original environment
    if (originalEnvKey) {
      process.env.TOKEN_ENCRYPTION_KEY = originalEnvKey;
    } else {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    }
  });

  describe('Encryption Key Validation', () => {
    it('should require TOKEN_ENCRYPTION_KEY environment variable', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      expect(() => new TokenEncryption()).toThrow('TOKEN_ENCRYPTION_KEY environment variable is required');
      process.env.TOKEN_ENCRYPTION_KEY = '941c8b770cb397238758a9d6ff8f4a90e07aebd2f2a4e4ef50c91e96de54e35f';
    });

    it('should validate encryption key length', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'short';
      expect(() => new TokenEncryption()).toThrow('TOKEN_ENCRYPTION_KEY must be 64 hex characters');
      process.env.TOKEN_ENCRYPTION_KEY = '941c8b770cb397238758a9d6ff8f4a90e07aebd2f2a4e4ef50c91e96de54e35f';
    });

    it('should generate valid encryption keys', () => {
      const key = TokenEncryption.generateEncryptionKey();
      expect(key).toHaveLength(64); // 32 bytes * 2 hex chars
      expect(TokenEncryption.validateEncryptionKey(key)).toBe(true);
    });
  });

  describe('Token Encryption/Decryption', () => {
    const testToken = 'ya29.a0AfH6SMBxyz123...test-oauth-token';
    const testContext = 'oauth-access-test';

    it('should encrypt tokens successfully', () => {
      const encrypted = tokenEncryption.encrypt(testToken, testContext);
      
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('salt');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('algorithm', 'aes-256-gcm');
      expect(encrypted).toHaveProperty('context', testContext);
      
      // Encrypted data should be different from original
      expect(encrypted.encrypted).not.toBe(testToken);
      expect(encrypted.encrypted).toHaveLength(testToken.length * 2); // Hex encoding
    });

    it('should decrypt tokens successfully', () => {
      const encrypted = tokenEncryption.encrypt(testToken, testContext);
      const decrypted = tokenEncryption.decrypt(encrypted);
      
      expect(decrypted).toBe(testToken);
    });

    it('should handle different contexts', () => {
      const context1 = 'oauth-access';
      const context2 = 'oauth-refresh';
      
      const encrypted1 = tokenEncryption.encrypt(testToken, context1);
      const encrypted2 = tokenEncryption.encrypt(testToken, context2);
      
      // Same token with different contexts should produce different encrypted data
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      
      // But both should decrypt to the same original token
      expect(tokenEncryption.decrypt(encrypted1)).toBe(testToken);
      expect(tokenEncryption.decrypt(encrypted2)).toBe(testToken);
    });

    it('should fail decryption with wrong context', () => {
      const encrypted = tokenEncryption.encrypt(testToken, 'oauth-access');
      encrypted.context = 'wrong-context';
      
      expect(() => tokenEncryption.decrypt(encrypted)).toThrow();
    });

    it('should fail decryption with tampered data', () => {
      const encrypted = tokenEncryption.encrypt(testToken, testContext);
      encrypted.encrypted = encrypted.encrypted.slice(0, -2) + '00'; // Tamper with data
      
      expect(() => tokenEncryption.decrypt(encrypted)).toThrow();
    });
  });

  describe('Batch Token Operations', () => {
    const testTokens = {
      access_token: 'ya29.a0AfH6SMBxyz123...access-token',
      refresh_token: '1//04xyz789...refresh-token',
      id_token: 'eyJhbGciOiJSUzI1NiIs...id-token'
    };

    it('should encrypt multiple tokens', () => {
      const encrypted = tokenEncryption.encryptTokens(testTokens, 'oauth-batch');
      
      expect(encrypted).toHaveProperty('access_token');
      expect(encrypted).toHaveProperty('refresh_token');
      expect(encrypted).toHaveProperty('id_token');
      
      // All tokens should be encrypted objects
      expect(encrypted.access_token).toHaveProperty('encrypted');
      expect(encrypted.refresh_token).toHaveProperty('encrypted');
      expect(encrypted.id_token).toHaveProperty('encrypted');
    });

    it('should decrypt multiple tokens', () => {
      const encrypted = tokenEncryption.encryptTokens(testTokens, 'oauth-batch');
      const decrypted = tokenEncryption.decryptTokens(encrypted);
      
      expect(decrypted).toEqual(testTokens);
    });

    it('should preserve non-string values', () => {
      const mixedData = {
        access_token: 'token-string',
        expiry_date: 1640995200000,
        is_active: true,
        metadata: { scope: 'read write' }
      };
      
      const encrypted = tokenEncryption.encryptTokens(mixedData);
      const decrypted = tokenEncryption.decryptTokens(encrypted);
      
      expect(decrypted.access_token).toBe('token-string');
      expect(decrypted.expiry_date).toBe(1640995200000);
      expect(decrypted.is_active).toBe(true);
      expect(decrypted.metadata).toEqual({ scope: 'read write' });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty or invalid input', () => {
      expect(() => tokenEncryption.encrypt('')).toThrow('Plaintext must be a non-empty string');
      expect(() => tokenEncryption.encrypt(null)).toThrow('Plaintext must be a non-empty string');
      expect(() => tokenEncryption.encrypt(123)).toThrow('Plaintext must be a non-empty string');
    });

    it('should handle invalid encrypted data', () => {
      expect(() => tokenEncryption.decrypt(null)).toThrow('Encrypted data must be an object');
      expect(() => tokenEncryption.decrypt({})).toThrow('Missing required encryption metadata');
      expect(() => tokenEncryption.decrypt({ encrypted: 'test' })).toThrow('Missing required encryption metadata');
    });

    it('should handle unsupported algorithms', () => {
      const encrypted = tokenEncryption.encrypt('test-token');
      encrypted.algorithm = 'unsupported-algorithm';
      
      expect(() => tokenEncryption.decrypt(encrypted)).toThrow('Unsupported encryption algorithm');
    });
  });

  describe('Security Properties', () => {
    const testToken = 'sensitive-oauth-token';

    it('should produce different encrypted data for same input', () => {
      const encrypted1 = tokenEncryption.encrypt(testToken);
      const encrypted2 = tokenEncryption.encrypt(testToken);
      
      // Should be different due to random IV and salt
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      
      // But both should decrypt to same value
      expect(tokenEncryption.decrypt(encrypted1)).toBe(testToken);
      expect(tokenEncryption.decrypt(encrypted2)).toBe(testToken);
    });

    it('should use proper key derivation', () => {
      const encrypted = tokenEncryption.encrypt(testToken);
      
      // Should have salt for key derivation
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.salt).toHaveLength(64); // 32 bytes * 2 hex chars
    });

    it('should include authentication tag', () => {
      const encrypted = tokenEncryption.encrypt(testToken);
      
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.authTag).toHaveLength(32); // 16 bytes * 2 hex chars
    });
  });
});
