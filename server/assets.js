const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ASSET_VERSION_TOKEN = '__ASSET_VERSION__';
const CACHE_VERSION_TOKEN = '__CACHE_VERSION__';
const PRECACHE_ASSETS_TOKEN = '__PRECACHE_ASSETS__';
const DEFAULT_BACKEND_ORIGIN_TOKEN = '__DEFAULT_BACKEND_ORIGIN__';

function walkFiles(dir, rootDir = dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkFiles(fullPath, rootDir));
            continue;
        }
        if (!entry.isFile()) continue;
        const relativePath = '/' + path.relative(rootDir, fullPath).replace(/\\/g, '/');
        files.push(relativePath);
    }

    return files.sort();
}

function computeAssetVersion(publicDir, files) {
    const hash = crypto.createHash('sha1');

    for (const relativePath of files) {
        const fullPath = path.join(publicDir, relativePath.slice(1));
        hash.update(relativePath);
        try {
            const stat = fs.statSync(fullPath);
            hash.update(String(stat.size));
            hash.update(String(Math.trunc(stat.mtimeMs)));
        } catch (error) {
            console.warn(`[assets] Failed to stat ${relativePath}: ${error.message}`);
            hash.update('missing');
        }
    }

    return hash.digest('hex').slice(0, 12);
}

function isPrecacheAsset(relativePath) {
    if (relativePath === '/sw.js') return false;
    if (relativePath === '/index.html') return false;
    return /\.(?:css|js|json|png|jpe?g|svg|ico|html)$/i.test(relativePath);
}

function replaceAll(content, token, value) {
    return content.split(token).join(value);
}

function safeReadText(filePath, fallback) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.warn(`[assets] Failed to read ${filePath}: ${error.message}`);
        return fallback;
    }
}

function createAssetPipeline({ publicDir, defaultBackendOrigin = '' }) {
    const allFiles = walkFiles(publicDir);
    const version = computeAssetVersion(publicDir, allFiles);
    const precacheAssets = ['/', '/index.html', ...allFiles.filter(isPrecacheAsset)];
    const indexTemplate = safeReadText(path.join(publicDir, 'index.html'), '<!DOCTYPE html><html><body>App shell unavailable</body></html>');
    const manifestTemplate = safeReadText(path.join(publicDir, 'manifest.json'), '{"name":"App"}');
    const swTemplate = safeReadText(path.join(publicDir, 'sw.js'), 'self.addEventListener("install", () => self.skipWaiting());');
    const serializedDefaultBackendOrigin = JSON.stringify(defaultBackendOrigin || '');

    return {
        version,
        precacheAssets,
        renderIndex() {
            return replaceAll(
                replaceAll(indexTemplate, ASSET_VERSION_TOKEN, version),
                DEFAULT_BACKEND_ORIGIN_TOKEN,
                serializedDefaultBackendOrigin
            );
        },
        renderManifest() {
            return replaceAll(manifestTemplate, ASSET_VERSION_TOKEN, version);
        },
        renderServiceWorker() {
            return replaceAll(
                replaceAll(
                    replaceAll(swTemplate, ASSET_VERSION_TOKEN, version),
                    CACHE_VERSION_TOKEN,
                    version
                ),
                PRECACHE_ASSETS_TOKEN,
                JSON.stringify(precacheAssets, null, 4)
            );
        },
    };
}

module.exports = {
    createAssetPipeline,
};
