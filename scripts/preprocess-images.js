#!/usr/bin/env node
/**
 * preprocess-images.js
 *
 * CONSERVATIVE APPROACH:
 *   1. Flood-fill from edges to identify the white background.
 *   2. Background pixels → Alpha = 0 (fully transparent, original RGB kept).
 *   3. Non-background pixels → completely untouched (original RGBA kept).
 *      NO Box Blur, NO un-premultiply, NO interior pixel deletion.
 *   4. Resize 640×640 → 128×128 using high-quality interpolation.
 *
 * For any remaining faint white fringes on complex trees, we use
 * CSS `mix-blend-mode: multiply` at the display layer instead of
 * risking damage to the sprite's actual colors.
 *
 * Usage:  node scripts/preprocess-images.js
 * Deps:   npm install canvas
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ROOT = path.resolve(__dirname, '..', 'public', 'img');
const DIRS = ['trees', 'garden'];
const TARGET_SIZE = 128;

/**
 * Determines if a pixel is part of the white/light background.
 * Uses a strict check: very bright AND very low saturation.
 * @param {Uint8ClampedArray} d - Image data array
 * @param {number} pi - Pixel index (start of RGBA group)
 * @returns {boolean}
 */
function isBackground(d, pi) {
    const r = d[pi], g = d[pi + 1], b = d[pi + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    // Must be very bright (>200) AND nearly achromatic (delta <25)
    // This is strict enough to not touch colored pixels
    return maxC > 200 && (maxC - minC) < 25;
}

/**
 * Processes a single image: removes white background via flood-fill,
 * then resizes to TARGET_SIZE.
 * @param {string} filePath - Absolute path to the PNG file
 */
async function processImage(filePath) {
    const img = await loadImage(filePath);
    const w = img.width;
    const h = img.height;
    const total = w * h;

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    // --- Step 1: Flood-fill BFS from all 4 edges to mark background pixels ---
    const isBg = new Uint8Array(total); // 1 = confirmed background
    const visited = new Uint8Array(total);
    const queue = [];

    // Seed from top and bottom edges
    for (let x = 0; x < w; x++) {
        const topIdx = x;
        const botIdx = (h - 1) * w + x;
        if (isBackground(d, topIdx * 4)) { visited[topIdx] = 1; queue.push(topIdx); }
        if (isBackground(d, botIdx * 4)) { visited[botIdx] = 1; queue.push(botIdx); }
    }
    // Seed from left and right edges
    for (let y = 1; y < h - 1; y++) {
        const leftIdx = y * w;
        const rightIdx = y * w + (w - 1);
        if (isBackground(d, leftIdx * 4)) { visited[leftIdx] = 1; queue.push(leftIdx); }
        if (isBackground(d, rightIdx * 4)) { visited[rightIdx] = 1; queue.push(rightIdx); }
    }

    // BFS expand
    while (queue.length > 0) {
        const idx = queue.pop();
        isBg[idx] = 1;
        const x = idx % w;
        // 4-connectivity neighbors
        const neighbors = [idx - 1, idx + 1, idx - w, idx + w];
        if (x === 0) neighbors[0] = -1;         // no left-wrap
        if (x === w - 1) neighbors[1] = -1;     // no right-wrap

        for (const ni of neighbors) {
            if (ni >= 0 && ni < total && !visited[ni]) {
                visited[ni] = 1;
                if (isBackground(d, ni * 4)) {
                    queue.push(ni);
                }
            }
        }
    }

    // --- Step 2: Apply transparency ONLY to confirmed background pixels ---
    // Interior pixels are left 100% untouched.
    for (let i = 0; i < total; i++) {
        if (isBg[i]) {
            d[i * 4 + 3] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // --- Step 3: High-quality resize to TARGET_SIZE ---
    const needsResize = w > TARGET_SIZE || h > TARGET_SIZE;
    let outCanvas = canvas;
    if (needsResize) {
        outCanvas = createCanvas(TARGET_SIZE, TARGET_SIZE);
        const outCtx = outCanvas.getContext('2d');
        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';
        outCtx.drawImage(canvas, 0, 0, TARGET_SIZE, TARGET_SIZE);
    }

    fs.writeFileSync(filePath, outCanvas.toBuffer('image/png'));
    return { bgRemoved: true, resized: needsResize };
}

async function main() {
    let processed = 0, errors = 0;
    const origSize = { bytes: 0 }, newSize = { bytes: 0 };

    for (const dir of DIRS) {
        const dirPath = path.join(ROOT, dir);
        if (!fs.existsSync(dirPath)) continue;
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png'));
        console.log(`\n📂 ${dir}/ — ${files.length} PNG files`);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const origBytes = fs.statSync(filePath).size;
            origSize.bytes += origBytes;
            try {
                await processImage(filePath);
                const newBytes = fs.statSync(filePath).size;
                newSize.bytes += newBytes;
                const pct = ((1 - newBytes / origBytes) * 100).toFixed(0);
                console.log(`  ✅ ${file} (${(origBytes / 1024).toFixed(0)}K → ${(newBytes / 1024).toFixed(0)}K, -${pct}%)`);
                processed++;
            } catch (err) {
                console.error(`  ❌ ${file}: ${err.message}`);
                errors++;
            }
        }
    }

    console.log(`\n🏁 Done! ${processed} files processed, ${errors} errors`);
    console.log(`   Total: ${(origSize.bytes / 1024 / 1024).toFixed(1)}MB → ${(newSize.bytes / 1024 / 1024).toFixed(1)}MB (-${((1 - newSize.bytes / origSize.bytes) * 100).toFixed(0)}%)`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
