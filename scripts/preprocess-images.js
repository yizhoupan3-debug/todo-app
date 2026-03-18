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
    const total = w * h;

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    // 1. Identify Background (Flood Fill)
    const isBg = new Uint8Array(total);
    const visited = new Uint8Array(total);

    function isWhiteish(pi) {
        const r = d[pi], g = d[pi+1], b = d[pi+2];
        const maxC = Math.max(r,g,b), minC = Math.min(r,g,b);
        return maxC > 140 && (maxC - minC < 30);
    }

    const queue = [];
    for (let x = 0; x < w; x++) {
        const top = x, bottom = (h-1)*w + x;
        if (isWhiteish(top*4)) { visited[top]=1; queue.push(top); }
        if (isWhiteish(bottom*4)) { visited[bottom]=1; queue.push(bottom); }
    }
    for (let y = 1; y < h - 1; y++) {
        const left = y*w, right = y*w + (w-1);
        if (isWhiteish(left*4)) { visited[left]=1; queue.push(left); }
        if (isWhiteish(right*4)) { visited[right]=1; queue.push(right); }
    }

    while (queue.length > 0) {
        const idx = queue.pop();
        isBg[idx] = 1;
        const x = idx % w, y = Math.floor(idx / w);
        const neighbors = [idx-1, idx+1, idx-w, idx+w];
        if (x === 0) neighbors[0] = -1;
        if (x === w-1) neighbors[1] = -1;
        
        for (const ni of neighbors) {
            if (ni >= 0 && ni < total && !visited[ni]) {
                visited[ni] = 1;
                if (isWhiteish(ni*4)) queue.push(ni);
            }
        }
    }

    // 2. Continuous Alpha Mask via Box Blur (Radius 2 = 5x5 kernel)
    const alphaMask = new Float32Array(total);
    for(let i=0; i<total; i++) alphaMask[i] = isBg[i] ? 0.0 : 1.0;

    const blurTemp = new Float32Array(total);
    const R = 2; // radius
    
    // Horizontal blur
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let sum = 0, count = 0;
            for (let k = -R; k <= R; k++) {
                const nx = x + k;
                if (nx >= 0 && nx < w) {
                    sum += alphaMask[y * w + nx];
                    count++;
                }
            }
            blurTemp[y * w + x] = sum / count;
        }
    }
    // Vertical blur
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let sum = 0, count = 0;
            for (let k = -R; k <= R; k++) {
                const ny = y + k;
                if (ny >= 0 && ny < h) {
                    sum += blurTemp[ny * w + x];
                    count++;
                }
            }
            alphaMask[y * w + x] = sum / count;
        }
    }

    // 3. Exact Un-premultiply (Decontamination) & Internal Spot Dimming
    for (let i = 0; i < total; i++) {
        const pi = i * 4;
        const r = d[pi], g = d[pi+1], b = d[pi+2];
        const maxC = Math.max(r,g,b), minC = Math.min(r,g,b);
        let a = alphaMask[i];

        if (a < 1.0 && a > 0.0) {
            // It's an edge pixel, remove the white glow
            let fgR = Math.max(0, Math.min(255, (r - 255 * (1 - a)) / a));
            let fgG = Math.max(0, Math.min(255, (g - 255 * (1 - a)) / a));
            let fgB = Math.max(0, Math.min(255, (b - 255 * (1 - a)) / a));
            d[pi] = fgR; d[pi+1] = fgG; d[pi+2] = fgB;
            d[pi+3] = Math.round(a * 255);
        } else if (a === 0.0) {
            d[pi+3] = 0;
        } else {
            // a === 1.0 (Interior pixels)
            // If it's pure white/gray inside the tree (trapped spots)
            if (maxC > 200 && maxC - minC < 20) {
                // Dim it to shadow level (100) so it doesn't stand out 
                const factor = 100 / Math.max(100, maxC);
                d[pi] = Math.round(r * factor);
                d[pi+1] = Math.round(g * factor);
                d[pi+2] = Math.round(b * factor);
                // Also give it 70% opacity to blend with background organically
                d[pi+3] = 180;
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
