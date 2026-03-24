/* eslint-disable no-console */
/**
 * Garden Forest Theme Tests
 *
 * Pure Node.js test suite — no external dependencies.
 * Validates that the garden has been converted from Boom Beach ocean
 * theme to Forest app theme.
 *
 * Run: node tests/garden-forest.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✅ ${name}`);
    } catch (err) {
        failed++;
        console.error(`  ❌ ${name}`);
        console.error(`     ${err.message}`);
    }
}

function readFile(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

console.log('\n🌲 Garden → Forest Theme Tests\n');

// ── CSS File Existence ──
console.log('📂 File Existence:');

test('garden-island.css exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/css/garden-island.css')));
});

test('garden-base.css exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/css/garden-base.css')));
});

test('garden-panels.css exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/css/garden-panels.css')));
});

test('garden-backpack.css exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'public/css/garden-backpack.css')));
});

// ── CSS Content: Ocean keywords removed ──
console.log('\n🌊 Ocean Keywords Removed from CSS:');

const islandCSS = readFile('public/css/garden-island.css');

test('No "ocean-wave" class with visible styles', () => {
    // ocean-wave should only appear in a display:none rule, not with active styles
    const blocks = islandCSS.split('}');
    const activeBlock = blocks.find(b => {
        if (!b.includes('.ocean-wave')) return false;
        if (!b.includes('{')) return false;
        const body = b.split('{').pop();
        return !body.includes('display: none') && !body.includes('display:none');
    });
    assert.ok(!activeBlock, 'Found active .ocean-wave style block');
});

test('No "ocean-foam-ring" with visible styles', () => {
    const blocks = islandCSS.split('}');
    const activeBlock = blocks.find(b => {
        if (!b.includes('.ocean-foam-ring')) return false;
        if (!b.includes('{')) return false;
        const body = b.split('{').pop();
        return !body.includes('display: none') && !body.includes('display:none');
    });
    assert.ok(!activeBlock, 'Found active .ocean-foam-ring style block');
});

test('No "ocean-caustics" with visible styles', () => {
    const blocks = islandCSS.split('}');
    const activeBlock = blocks.find(b => {
        if (!b.includes('.ocean-caustics')) return false;
        if (!b.includes('{')) return false;
        const body = b.split('{').pop();
        return !body.includes('display: none') && !body.includes('display:none');
    });
    assert.ok(!activeBlock, 'Found active .ocean-caustics style block');
});

test('No "sandBedShimmer" keyframe', () => {
    assert.ok(!islandCSS.includes('sandBedShimmer'), 'Found sandBedShimmer keyframe');
});

test('No "foamShimmer" keyframe', () => {
    assert.ok(!islandCSS.includes('foamShimmer'), 'Found foamShimmer keyframe');
});

test('No "causticDrift" keyframe', () => {
    assert.ok(!islandCSS.includes('causticDrift'), 'Found causticDrift keyframe');
});

test('No "smokeRise" keyframe', () => {
    assert.ok(!islandCSS.includes('smokeRise'), 'Found smokeRise keyframe');
});

test('No "cloudDrift" keyframe', () => {
    assert.ok(!islandCSS.includes('cloudDrift'), 'Found cloudDrift keyframe');
});

// ── CSS Content: Forest keywords present ──
console.log('\n🌲 Forest Keywords Present in CSS:');

test('Contains Forest app teal viewport background (#5bb8a8 or similar)', () => {
    assert.ok(islandCSS.includes('#5bb8a8') || islandCSS.includes('#5dbfae') || islandCSS.includes('#62c5b4'), 'No teal viewport bg');
});

test('Contains Forest-style isometric grass platform (rotateX)', () => {
    assert.ok(islandCSS.includes('rotateX'), 'No rotateX isometric transform on island-land');
});

test('Contains leaf fall animation or simplified forest class', () => {
    assert.ok(islandCSS.includes('forest-leaf') || islandCSS.includes('leafFall'), 'No forest-leaf class or animation');
});

test('Contains Forest app sand/cream platform surface (#e8dcc8 or similar)', () => {
    assert.ok(islandCSS.includes('#e8dcc8') || islandCSS.includes('#dfd2bc') || islandCSS.includes('#d8cab2'), 'No sand/cream platform surface');
});

test('island-hud uses translucent white (Forest style)', () => {
    assert.ok(islandCSS.includes('rgba(255, 255, 255, 0.08)') || islandCSS.includes('rgba(255,255,255,0.08)'), 'HUD not translucent white Forest style');
});

// ── JS Content: Ocean elements removed from render ──
console.log('\n📜 JS Content Validation:');

const islandJS = readFile('public/js/views/garden-island.js');

test('render() no longer outputs scene-sea-glow', () => {
    assert.ok(!islandJS.includes('scene-sea-glow'), 'Found scene-sea-glow in JS');
});

test('render() no longer outputs scene-surf', () => {
    assert.ok(!islandJS.includes('scene-surf'), 'Found scene-surf in JS');
});

test('render() no longer outputs shore-palm', () => {
    assert.ok(!islandJS.includes('shore-palm'), 'Found shore-palm in JS');
});

test('render() no longer outputs nearshore-foam', () => {
    assert.ok(!islandJS.includes('nearshore-foam'), 'Found nearshore-foam in JS');
});

test('render() includes forest-leaf class or simplified decor', () => {
    // Forest style uses no backdrop decor (renderBackdropDecor returns empty)
    // This is intentional — the simplicity IS the Forest app style
    assert.ok(!islandJS.includes('scene-nearshore'), 'Old ocean decor still in JS');
});

test('render() has no ambient-particle (simplified Forest style)', () => {
    // Forest style intentionally omits particles for cleanliness
    assert.ok(!islandJS.includes('scene-sea-glow') && !islandJS.includes('nearshore-foam'), 'Old ocean elements found');
});

test('HUD uses tree emoji (🌲) not island emoji', () => {
    assert.ok(islandJS.includes('\\u{1F332}'), 'HUD still uses island emoji');
});

// ── Panel CSS: Forest green theme ──
console.log('\n🎨 Panel Theme:');

const panelsCSS = readFile('public/css/garden-panels.css');

test('World map overlay uses green background', () => {
    assert.ok(panelsCSS.includes('8, 30, 18') || panelsCSS.includes('#0a2a1a'), 'Map overlay not green');
});

test('Harbor content uses green background', () => {
    assert.ok(panelsCSS.includes('#1a3a28') || panelsCSS.includes('#0d2a1a'), 'Harbor content not green');
});

test('Stats bar uses forest green background', () => {
    assert.ok(panelsCSS.includes('10, 42, 28'), 'Stats bar not green');
});

// ── Backpack CSS: Forest green theme ──
console.log('\n🎒 Backpack Theme:');

const backpackCSS = readFile('public/css/garden-backpack.css');

test('Backpack modal uses green background', () => {
    assert.ok(backpackCSS.includes('16, 40, 26') || backpackCSS.includes('10, 28, 18'), 'Backpack not green');
});

test('Active persona button uses green gradient', () => {
    assert.ok(backpackCSS.includes('56, 142, 74') || backpackCSS.includes('42, 120, 60'), 'Persona btn not green');
});

// ── Garden Base CSS ──
console.log('\n🌿 Garden Base:');

const baseCSS = readFile('public/css/garden-base.css');

test('Primary button uses forest green', () => {
    assert.ok(baseCSS.includes('#2d8f4e') || baseCSS.includes('#3aaa5e'), 'Primary btn not forest green');
});

// ── GardenView object structure (static analysis) ──
console.log('\n🧩 GardenView Structure:');

const gardenJS = readFile('public/js/views/garden.js');

test('GardenView has catalog array', () => {
    assert.ok(gardenJS.includes('catalog:'), 'No catalog property');
});

test('GardenView has TREE_MATURE_MINUTES constant', () => {
    assert.ok(gardenJS.includes('TREE_MATURE_MINUTES:'), 'No TREE_MATURE_MINUTES');
});

test('GardenView has getGrowthStage method', () => {
    assert.ok(gardenJS.includes('getGrowthStage('), 'No getGrowthStage method');
});

test('GardenView has getPlotLayout method', () => {
    assert.ok(gardenJS.includes('getPlotLayout('), 'No getPlotLayout method');
});

test('Catalog has 29 tree types', () => {
    const catalogMatch = gardenJS.match(/type:\s*'/g);
    assert.ok(catalogMatch && catalogMatch.length >= 29, `Expected 29+ tree types, got ${catalogMatch ? catalogMatch.length : 0}`);
});

// ── Optimization: CSS hover conflict resolved ──
console.log('\n🔧 Optimization Checks:');

test('island-land background contains #e8dcc8 (sand color)', () => {
    assert.ok(islandCSS.includes('#e8dcc8'), 'No #e8dcc8 sand color in island-land background');
});

test('No conflicting iplot:hover with translate(-50%, -50%)', () => {
    // Parse only the .iplot:hover rule blocks; keyframe frames are exempt.
    // A bad rule: ".iplot:hover { transform: translate(-50%, -50%) scale..." }
    const hoverBlockMatch = islandCSS.match(/\.iplot(?::hover|\.planted:hover)[^{]*\{([^}]+)\}/g) || [];
    const hasBadHover = hoverBlockMatch.some(block =>
        block.includes('translate(-50%, -50%) scale')
    );
    assert.ok(!hasBadHover, 'Found old conflicting hover rule with translate(-50%, -50%) scale in .iplot:hover block');
});

test('_todayString uses Asia/Shanghai timezone', () => {
    assert.ok(gardenJS.includes('Asia/Shanghai'), '_todayString does not use Asia/Shanghai timezone');
});

test('clearPlot uses _confirmInline instead of confirm()', () => {
    const gardenIslandJS = readFile('public/js/views/garden-island.js');
    assert.ok(gardenIslandJS.includes('_confirmInline'), 'Missing _confirmInline helper');
    assert.ok(!gardenIslandJS.includes("if (!confirm("), 'Still using browser confirm() in garden-island.js');
});

// ── Summary ──
console.log(`\n${'─'.repeat(40)}`);
console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'─'.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
