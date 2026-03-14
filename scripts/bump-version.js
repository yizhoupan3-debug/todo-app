#!/usr/bin/env node
/**
 * bump-version.js — Automatically bump the cache-busting version number
 * across sw.js, index.html, and any file referencing ?v=<N>.
 *
 * Usage:
 *   node scripts/bump-version.js        # auto-increment current version
 *   node scripts/bump-version.js 50     # set to specific version
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = [
    'public/sw.js',
    'public/index.html',
];

// Pattern matches: ?v=<number> and CACHE_VERSION = 'v<number>'
const VERSION_PARAM_RE = /(\?v=)(\d+)/g;
const CACHE_VERSION_RE = /(CACHE_VERSION\s*=\s*['"]v)(\d+)(['"])/;

// 1. Detect current version from sw.js
const swPath = path.join(ROOT, 'public/sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');
const currentMatch = swContent.match(CACHE_VERSION_RE);
if (!currentMatch) {
    console.error('❌ Could not find CACHE_VERSION in sw.js');
    process.exit(1);
}
const currentVersion = parseInt(currentMatch[2], 10);

// 2. Determine new version
const arg = process.argv[2];
const newVersion = arg ? parseInt(arg, 10) : currentVersion + 1;

if (isNaN(newVersion) || newVersion < 1) {
    console.error('❌ Invalid version number:', arg);
    process.exit(1);
}

if (newVersion === currentVersion) {
    console.log(`ℹ️  Version is already v${currentVersion}, nothing to do.`);
    process.exit(0);
}

console.log(`🔄 Bumping version: v${currentVersion} → v${newVersion}\n`);

// 3. Update each file
let totalReplacements = 0;
for (const relPath of FILES) {
    const filePath = path.join(ROOT, relPath);
    if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️  ${relPath} not found, skipping`);
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let count = 0;

    // Replace every ?v=N so drift between files cannot accumulate.
    content = content.replace(VERSION_PARAM_RE, (match, prefix, ver) => {
        if (parseInt(ver, 10) === newVersion) return match;
        count++;
        return `${prefix}${newVersion}`;
    });

    // Replace CACHE_VERSION = 'vN'
    content = content.replace(CACHE_VERSION_RE, (match, prefix, ver, suffix) => {
        if (parseInt(ver, 10) === newVersion) return match;
        count++;
        return `${prefix}${newVersion}${suffix}`;
    });

    if (count > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ ${relPath} — ${count} replacement(s)`);
        totalReplacements += count;
    } else {
        console.log(`  ⏭️  ${relPath} — no matches`);
    }
}

console.log(`\n✨ Done! Updated ${totalReplacements} references to v${newVersion}.`);
console.log(`   Remember to restart the server and deploy.`);
