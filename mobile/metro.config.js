// Metro configuration for lif.os
// - Registers .wasm as an asset so expo-sqlite's WebAssembly worker
//   (node_modules/expo-sqlite/web/wa-sqlite/wa-sqlite.wasm) resolves on web.
// - Sends COOP/COEP from the dev server: expo-sqlite on web needs
//   SharedArrayBuffer, which browsers only enable on cross-origin-isolated pages.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
