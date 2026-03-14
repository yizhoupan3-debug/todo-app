#!/usr/bin/env node
/**
 * bump-version.js — deprecated helper kept for compatibility.
 * Asset versions are now derived automatically from files in /public.
 */

const path = require('path');
const { createAssetPipeline } = require('../server/assets');

const publicDir = path.join(__dirname, '..', 'public');
const assets = createAssetPipeline({ publicDir });

console.log(`Current asset version: ${assets.version}`);
console.log(`Precache asset count: ${assets.precacheAssets.length}`);
console.log('Manual version bumping is no longer required.');
