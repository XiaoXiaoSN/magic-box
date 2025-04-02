import * as node_crypto from 'crypto';

// Use browser's crypto API or Node.js crypto
const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  // Node.js environment
  return node_crypto.webcrypto;
};

const crypto = getCrypto();

// Define a type-safe crypto interface
const getRandomValues = (array: Uint32Array): Uint32Array => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.getRandomValues(array);
  }
  // Node.js environment
  return node_crypto.webcrypto.getRandomValues(array);
};

export default {
  crypto,
  getRandomValues,
};
