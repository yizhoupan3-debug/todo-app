#!/usr/bin/env node
/**
 * preprocess-images.js
 * 
 * 1. Remove white/light backgrounds via flood-fill from edges
 * 2. Resize 640×640 → 128×128 (2x of max display size 68px)
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

const FILL_THRESHOLD = 200;
const EDGE_THRESHOLD = 180;

async function processImage(filePath) {
    const img = await loadImage(filePath);
    const w = img.width;
    const h = img.height;

    // --- Phase 1: Flood-fill white background removal ---
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const total = w * h;

    const visited = new Uint8Array(total);
    const isBg = new Uint8Array(total);

    function canFloodFill(idx) {
        const pi = idx * 4;
        return d[pi] > FILL_THRESHOLD && d[pi + 1] > FILL_THRESHOLD && d[pi + 2] > FILL_THRESHOLD && d[pi + 3] > 0;
    }

    // Seed from ALL edge pixels
    const queue = [];
    for (let x = 0; x < w; x++) {
        let idx = x;
        if (canFloodFill(idx) && !visited[idx]) { visited[idx] = 1; queue.push(idx); }
        idx = (h - 1) * w + x;
        if (canFloodFill(idx) && !visited[idx]) { visited[idx] = 1; queue.push(idx); }
    }
    for (let y = 1; y < h - 1; y++) {
        let idx = y * w;
        if (canFloodFill(idx) && !visited[idx]) { visited[idx] = 1; queue.push(idx); }
        idx = y * w + (w - 1);
        if (canFloodFill(idx) && !visited[idx]) { visited[idx] = 1; queue.push(idx); }
    }

    while (queue.length > 0) {
        const idx = queue.pop();
        isBg[idx] = 1;
        const x = idx % w;
        const y = Math.floor(idx / w);

        const neighbors = [];
        if (x > 0) neighbors.push(idx - 1);
        if (x < w - 1) neighbors.push(idx + 1);
        if (y > 0) neighbors.push(idx - w);
        if (y < h - 1) neighbors.push(idx + w);
        if (x > 0 && y > 0) neighbors.push(idx - w - 1);
        if (x < w - 1 && y > 0) neighbors.push(idx - w + 1);
        if (x > 0 && y < h - 1) neighbors.push(idx + w - 1);
        if (x < w - 1 && y < h - 1) neighbors.push(idx + w + 1);

        for (const ni of neighbors) {
            if (visited[ni]) continue;
            visited[ni] = 1;
            if (canFloodFill(ni)) {
                queue.push(ni);
            }
        }
    }

    let bgCount = 0;
    for (let i = 0; i < total; i++) {
        if (isBg[i]) bgCount++;
    }

    const hasBg = bgCount >= total * 0.03;

    if (hasBg) {
        for (let i = 0; i < total; i++) {
            if (isBg[i]) d[i * 4 + 3] = 0;
        }

        // 3-pass edge feathering
        for (let pass = 0; pass < 3; pass++) {
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const idx = y * w + x;
                    if (d[idx * 4 + 3] === 0) continue;
                    let adjacentTransparent = 0, totalNeighbors = 0;
                    const neighbors = [];
                    if (x > 0) neighbors.push(idx - 1);
                    if (x < w - 1) neighbors.push(idx + 1);
                    if (y > 0) neighbors.push(idx - w);
                    if (y < h - 1) neighbors.push(idx + w);
                    for (const ni of neighbors) {
                        totalNeighbors++;
                        if (d[ni * 4 + 3] === 0) adjacentTransparent++;
                    }
                    if (adjacentTransparent > 0) {
                        const pi = idx * 4;
                        if (d[pi] > EDGE_THRESHOLD && d[pi + 1] > EDGE_THRESHOLD && d[pi + 2] > EDGE_THRESHOLD) {
                            const ratio = adjacentTransparent / totalNeighbors;
                            const newAlpha = Math.round(d[pi + 3] * (1 - ratio * 0.7));
                            d[pi + 3] = newAlpha < 20 ? 0 : newAlpha;
                        }
                    }
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    // --- Phase 2: Resize to TARGET_SIZE ---
    const needsResize = w > TARGET_SIZE || h > TARGET_SIZE;
    let outCanvas;
    if (needsResize) {
        outCanvas = createCanvas(TARGET_SIZE, TARGET_SIZE);
        const outCtx = outCanvas.getContext('2d');
        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';
        outCtx.drawImage(canvas, 0, 0, TARGET_SIZE, TARGET_SIZE);
    } else {
        outCanvas = canvas;
    }

    const buffer = outCanvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);
    return { bgRemoved: hasBg, resized: needsResize };
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
                const result = await processImage(filePath);
                const newBytes = fs.statSync(filePath).size;
                newSize.bytes += newBytes;
                const pct = ((1 - newBytes / origBytes) * 100).toFixed(0);
                console.log(`  ✅ ${file} (${(origBytes/1024).toFixed(0)}K → ${(newBytes/1024).toFixed(0)}K, -${pct}%)`);
                processed++;
            } catch (err) {
                console.error(`  ❌ ${file}: ${err.message}`);
                errors++;
            }
        }
    }

    console.log(`\n🏁 Done! ${processed} files processed, ${errors} errors`);
    console.log(`   Total: ${(origSize.bytes/1024/1024).toFixed(1)}MB → ${(newSize.bytes/1024/1024).toFixed(1)}MB (-${((1-newSize.bytes/origSize.bytes)*100).toFixed(0)}%)`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
