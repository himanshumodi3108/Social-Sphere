// End-to-End Encryption Utility using Web Crypto API

// Generate a key pair for a chat conversation
export async function generateKeyPair() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
    return keyPair;
  } catch (error) {
    // console.error("Error generating key pair:", error);
    throw error;
  }
}

// Export public key to base64 string for sharing
export async function exportPublicKey(publicKey) {
  try {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    const exportedAsBase64 = arrayBufferToBase64(exported);
    return exportedAsBase64;
  } catch (error) {
    // console.error("Error exporting public key:", error);
    throw error;
  }
}

// Import public key from base64 string
export async function importPublicKey(base64Key) {
  try {
    const keyData = base64ToArrayBuffer(base64Key);
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      keyData,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );
    return publicKey;
  } catch (error) {
    // console.error("Error importing public key:", error);
    throw error;
  }
}

// Export private key to base64 string for storage
export async function exportPrivateKey(privateKey) {
  try {
    const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    const exportedAsBase64 = arrayBufferToBase64(exported);
    return exportedAsBase64;
  } catch (error) {
    // console.error("Error exporting private key:", error);
    throw error;
  }
}

// Import private key from base64 string
export async function importPrivateKey(base64Key) {
  try {
    const keyData = base64ToArrayBuffer(base64Key);
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      keyData,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );
    return privateKey;
  } catch (error) {
    // console.error("Error importing private key:", error);
    throw error;
  }
}

// Encrypt message using public key
export async function encryptMessage(message, publicKey) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      data
    );
    return arrayBufferToBase64(encrypted);
  } catch (error) {
    // console.error("Error encrypting message:", error);
    throw error;
  }
}

// Decrypt message using private key
export async function decryptMessage(encryptedMessage, privateKey) {
  try {
    const encryptedData = base64ToArrayBuffer(encryptedMessage);
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      encryptedData
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    // console.error("Error decrypting message:", error);
    throw error;
  }
}

// Generate a shared secret key for AES-GCM (more efficient for large messages)
export async function generateSharedKey() {
  try {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    return key;
  } catch (error) {
    // console.error("Error generating shared key:", error);
    throw error;
  }
}

// Export shared key for storage/exchange
export async function exportSharedKey(key) {
  try {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exported);
  } catch (error) {
    // console.error("Error exporting shared key:", error);
    throw error;
  }
}

// Import shared key
export async function importSharedKey(base64Key) {
  try {
    const keyData = base64ToArrayBuffer(base64Key);
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    return key;
  } catch (error) {
    // console.error("Error importing shared key:", error);
    throw error;
  }
}

// Encrypt message using AES-GCM (more efficient)
export async function encryptMessageAES(message, key) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data
    );
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);
    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    // console.error("Error encrypting message with AES:", error);
    throw error;
  }
}

// Decrypt message using AES-GCM
export async function decryptMessageAES(encryptedMessage, key) {
  try {
    const combined = base64ToArrayBuffer(encryptedMessage);
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encrypted
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    // console.error("Error decrypting message with AES:", error);
    throw error;
  }
}

// Helper functions
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Store encryption key in localStorage
export function storeChatKey(chatId, keyData) {
  try {
    const keys = JSON.parse(localStorage.getItem("chatKeys") || "{}");
    keys[chatId] = keyData;
    localStorage.setItem("chatKeys", JSON.stringify(keys));
  } catch (error) {
    // console.error("Error storing chat key:", error);
  }
}

// Retrieve encryption key from localStorage
export function getChatKey(chatId) {
  try {
    const keys = JSON.parse(localStorage.getItem("chatKeys") || "{}");
    return keys[chatId] || null;
  } catch (error) {
    // console.error("Error retrieving chat key:", error);
    return null;
  }
}

// Generate a deterministic shared key from chat ID and user IDs
async function deriveSharedKeyFromChat(chatId, userId1, userId2) {
  try {
    // Sort user IDs to ensure same key regardless of order
    const sortedUsers = [String(userId1), String(userId2)].sort().join("-");
    const seed = `${chatId}-${sortedUsers}`;
    
    // Use PBKDF2 to derive a key from the seed
    const encoder = new TextEncoder();
    const seedData = encoder.encode(seed);
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      seedData,
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );
    
    const salt = encoder.encode("SocialSphere-Chat-Salt");
    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    
    return key;
  } catch (error) {
    // console.error("Error deriving shared key:", error);
    throw error;
  }
}

// Initialize encryption for a chat (generate or retrieve keys)
export async function initializeChatEncryption(chatId, otherUserId, currentUserId) {
  try {
    let keyData = getChatKey(chatId);
    
    if (!keyData) {
      // Derive shared key deterministically from chat ID and user IDs
      const sharedKey = await deriveSharedKeyFromChat(chatId, currentUserId, otherUserId);
      const sharedKeyBase64 = await exportSharedKey(sharedKey);
      
      keyData = {
        sharedKey: sharedKeyBase64,
        initialized: true,
      };
      
      storeChatKey(chatId, keyData);
    }
    
    return keyData;
  } catch (error) {
    // console.error("Error initializing chat encryption:", error);
    throw error;
  }
}

