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
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    const total = w * h;

    const isBg = new Uint8Array(total);
    const visited = new Uint8Array(total);

    // Extremely aggressive flood fill for the outside background
    function canFloodFill(idx) {
        const pi = idx * 4;
        const r = d[pi], g = d[pi + 1], b = d[pi + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        // Any light, unsaturated pixel is background
        return maxC > 140 && (maxC - minC < 40);
    }

    const queue = [];
    // Seed from all edges
    for (let x = 0; x < w; x++) {
        let idx = x;
        if (canFloodFill(idx)) { visited[idx] = 1; queue.push(idx); }
        idx = (h - 1) * w + x;
        if (canFloodFill(idx)) { visited[idx] = 1; queue.push(idx); }
    }
    for (let y = 1; y < h - 1; y++) {
        let idx = y * w;
        if (canFloodFill(idx)) { visited[idx] = 1; queue.push(idx); }
        idx = y * w + (w - 1);
        if (canFloodFill(idx)) { visited[idx] = 1; queue.push(idx); }
    }

    while (queue.length > 0) {
        const idx = queue.pop();
        isBg[idx] = 1;
        const x = idx % w;
        const y = Math.floor(idx / w);
        const neighbors = [idx - 1, idx + 1, idx - w, idx + w];
        if (x === 0) neighbors[0] = -1;
        if (x === w - 1) neighbors[1] = -1;
        
        for (const ni of neighbors) {
            if (ni >= 0 && ni < total && !visited[ni]) {
                visited[ni] = 1;
                if (canFloodFill(ni)) {
                    queue.push(ni);
                }
            }
        }
    }

    // Compute distance field (Matte Choker) up to 3 pixels from background
    const dist = new Uint8Array(total);
    dist.fill(255);
    let edgeQueue = [];
    for (let i = 0; i < total; i++) {
        if (isBg[i]) {
            dist[i] = 0;
            edgeQueue.push(i);
        }
    }

    for (let level = 1; level <= 3; level++) {
        const nextQueue = [];
        for (const idx of edgeQueue) {
            const x = idx % w;
            const y = Math.floor(idx / w);
            const neighbors = [idx - 1, idx + 1, idx - w, idx + w];
            if (x === 0) neighbors[0] = -1;
            if (x === w - 1) neighbors[1] = -1;
            for (const ni of neighbors) {
                if (ni >= 0 && ni < total && dist[ni] === 255) {
                    dist[ni] = level;
                    nextQueue.push(ni);
                }
            }
        }
        edgeQueue = nextQueue;
    }

    for (let i = 0; i < total; i++) {
        const pi = i * 4;
        const r = d[pi], g = d[pi + 1], b = d[pi + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);

        // 1. Handle actual background and fringe (Edge Decontamination)
        if (dist[i] === 0) {
            d[pi + 3] = 0;
            continue;
        } else if (dist[i] <= 3) {
            // Un-premultiply alpha: assume original was blended with solid white
            let alphaRaw = dist[i] === 1 ? 0.35 : dist[i] === 2 ? 0.65 : 0.85;
            
            // Reconstruct original object color
            let fgR = Math.min(255, Math.max(0, (r - 255 * (1 - alphaRaw)) / alphaRaw));
            let fgG = Math.min(255, Math.max(0, (g - 255 * (1 - alphaRaw)) / alphaRaw));
            let fgB = Math.min(255, Math.max(0, (b - 255 * (1 - alphaRaw)) / alphaRaw));
            
            d[pi] = fgR; d[pi + 1] = fgG; d[pi + 2] = fgB;
            d[pi + 3] = Math.round(d[pi + 3] * alphaRaw);
        } 
        
        // 2. Handle inner trapped white spots
        if (dist[i] > 0) {
            // Overwhelmingly white/light gray colors that escaped flood fill
            if (maxC > 200 && maxC - minC < 30) {
                // Dim them and make them significantly transparent so they blend into whatever is behind them
                const fadeAlpha = 255 - Math.min(255, (minC - 180) * 3); 
                d[pi + 3] = Math.max(0, Math.min(d[pi + 3], fadeAlpha));
                d[pi] = Math.min(d[pi], 190);
                d[pi + 1] = Math.min(d[pi + 1], 190);
                d[pi + 2] = Math.min(d[pi + 2], 190);
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);

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
