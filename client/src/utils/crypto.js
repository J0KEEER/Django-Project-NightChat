import nacl from 'tweetnacl';

// Helper to convert string to Uint8Array
const encode = (str) => new TextEncoder().encode(str);
// Helper to convert Uint8Array to string
const decode = (arr) => new TextDecoder().decode(arr);
// Helper to convert Uint8Array to Base64
const toBase64 = (arr) => btoa(String.fromCharCode.apply(null, arr));
// Helper to convert Base64 to Uint8Array
const fromBase64 = (base64) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: toBase64(keyPair.publicKey),
    privateKey: toBase64(keyPair.secretKey)
  };
};

/**
 * Encrypt a message for a recipient using their public key.
 * Uses Authenticated Encryption (libsodium box).
 */
export const encryptMessage = (text, recipientPubKeyB64, senderPrivKeyB64) => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = encode(text);
  const recipientPubKey = fromBase64(recipientPubKeyB64);
  const senderPrivKey = fromBase64(senderPrivKeyB64);

  const box = nacl.box(messageUint8, nonce, recipientPubKey, senderPrivKey);

  const fullMessage = new Uint8Array(nonce.length + box.length);
  fullMessage.set(nonce);
  fullMessage.set(box, nonce.length);

  return {
    ciphertext: toBase64(fullMessage),
    nonce: toBase64(nonce)
  };
};

/**
 * Decrypt a message from a sender.
 */
export const decryptMessage = (ciphertextB64, senderPubKeyB64, recipientPrivKeyB64) => {
  try {
    const fullMessage = fromBase64(ciphertextB64);
    const senderPubKey = fromBase64(senderPubKeyB64);
    const recipientPrivKey = fromBase64(recipientPrivKeyB64);

    const nonce = fullMessage.slice(0, nacl.box.nonceLength);
    const message = fullMessage.slice(nacl.box.nonceLength);

    const decrypted = nacl.box.open(message, nonce, senderPubKey, recipientPrivKey);
    if (!decrypted) return "[Decryption Failed]";

    return decode(decrypted);
  } catch (err) {
    console.error("Decryption error", err);
    return "[Decryption Error]";
  }
};

/**
 * Symmetric encryption for files using a shared secret.
 */
export const encryptFile = async (file, sharedSecretB64) => {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const sharedSecret = fromBase64(sharedSecretB64);

  const box = nacl.secretbox(data, nonce, sharedSecret);

  const fullMessage = new Uint8Array(nonce.length + box.length);
  fullMessage.set(nonce);
  fullMessage.set(box, nonce.length);

  return new Blob([fullMessage], { type: 'application/octet-stream' });
};

/**
 * Symmetric decryption for files.
 */
export const decryptFile = async (blob, sharedSecretB64) => {
  const buffer = await blob.arrayBuffer();
  const fullMessage = new Uint8Array(buffer);
  const sharedSecret = fromBase64(sharedSecretB64);

  const nonce = fullMessage.slice(0, nacl.secretbox.nonceLength);
  const ciphertext = fullMessage.slice(nacl.secretbox.nonceLength);

  const decrypted = nacl.secretbox.open(ciphertext, nonce, sharedSecret);
  if (!decrypted) throw new Error("File decryption failed");

  return new Blob([decrypted]);
};

/**
 * Derive a shared secret from our private key and their public key.
 */
export const deriveSharedSecret = (theirPubKeyB64, myPrivKeyB64) => {
  const theirPubKey = fromBase64(theirPubKeyB64);
  const myPrivKey = fromBase64(myPrivKeyB64);
  return toBase64(nacl.box.before(theirPubKey, myPrivKey));
};

/**
 * Symmetric encryption for messages using a shared secret.
 */
export const encryptMessageSymmetric = (text, sharedSecretB64) => {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = encode(text);
  const sharedSecret = fromBase64(sharedSecretB64);

  const box = nacl.secretbox(messageUint8, nonce, sharedSecret);

  const fullMessage = new Uint8Array(nonce.length + box.length);
  fullMessage.set(nonce);
  fullMessage.set(box, nonce.length);

  return toBase64(fullMessage);
};

/**
 * Symmetric decryption for messages.
 */
export const decryptMessageSymmetric = (ciphertextB64, sharedSecretB64) => {
  try {
    const fullMessage = fromBase64(ciphertextB64);
    const sharedSecret = fromBase64(sharedSecretB64);

    const nonce = fullMessage.slice(0, nacl.secretbox.nonceLength);
    const ciphertext = fullMessage.slice(nacl.secretbox.nonceLength);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, sharedSecret);
    if (!decrypted) return "[Decryption Failed]";

    return decode(decrypted);
  } catch (err) {
    console.error("Decryption error", err);
    return "[Decryption Error]";
  }
};

export const generateRandomKey = () => toBase64(nacl.randomBytes(32));
