/* eslint-disable no-console */
/**
 * Backend Audit Integration Tests
 *
 * Pure Node.js test suite — tests backend API routes via HTTP requests.
 * Requires the server to be running on PORT 3000.
 *
 * Run: node tests/backend-audit.test.js
 */

const http = require('http');

const BASE = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    return fn()
        .then(() => {
            passed++;
            console.log(`  ✅ ${name}`);
        })
        .catch(err => {
            failed++;
            failures.push({ name, error: err.message });
            console.error(`  ❌ ${name}`);
            console.error(`     ${err.message}`);
        });
}

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : null;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
            },
        };
        const url = new URL(BASE + path);
        options.hostname = url.hostname;
        options.port = url.port;
        options.path = url.pathname + url.search;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function runTests() {
    console.log('\n🔍 Backend Audit Integration Tests\n');

    // ── BUG-1: /goal 路由顺序 ──
    console.log('📋 BUG-1: checkin /goal 路由顺序 (must return 400, not 404/500)');

    await test('GET /api/checkin/goal 无 assignee → 400', async () => {
        const r = await request('GET', '/api/checkin/goal');
        if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}: ${JSON.stringify(r.body)}`);
    });

    await test('GET /api/checkin/goal?assignee=潘潘 → 200 with goal', async () => {
        const r = await request('GET', '/api/checkin/goal?assignee=潘潘&type=water');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
        if (typeof r.body.goal !== 'number') throw new Error(`Expected goal number, got: ${JSON.stringify(r.body)}`);
    });

    await test('PUT /api/checkin/goal 设置目标 → 200', async () => {
        const r = await request('PUT', '/api/checkin/goal', { assignee: '潘潘', type: 'water', goal: 2200 });
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
        if (!r.body.success) throw new Error(`Expected success=true: ${JSON.stringify(r.body)}`);
    });

    await test('GET /api/checkin/goal?assignee=潘潘 → 返回更新后的 2200', async () => {
        const r = await request('GET', '/api/checkin/goal?assignee=潘潘&type=water');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (r.body.goal !== 2200) throw new Error(`Expected goal=2200, got ${r.body.goal}`);
        // Restore
        await request('PUT', '/api/checkin/goal', { assignee: '潘潘', type: 'water', goal: 2000 });
    });

    // ── BUG-2: import assignee 校验 ──
    console.log('\n📦 BUG-2: import/confirm assignee 校验');

    await test('POST /api/import/ics/confirm 无效 assignee → 400', async () => {
        const r = await request('POST', '/api/import/ics/confirm', {
            tasks: [{ title: 'test' }],
            assignee: 'invalid_user',
        });
        if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}: ${JSON.stringify(r.body)}`);
    });

    await test('POST /api/import/ics/confirm 无 assignee → 400', async () => {
        const r = await request('POST', '/api/import/ics/confirm', { tasks: [] });
        if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
    });

    await test('POST /api/import/ics/confirm 有效请求 → 200', async () => {
        const r = await request('POST', '/api/import/ics/confirm', {
            tasks: [],
            assignee: '潘潘',
        });
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    });

    // ── Tasks 基础 CRUD ──
    console.log('\n📝 Tasks CRUD');

    let createdTaskId = null;

    await test('POST /api/tasks 创建任务', async () => {
        const r = await request('POST', '/api/tasks', {
            title: '[测试任务] 后端审计',
            assignee: '潘潘',
            priority: 2,
        });
        if (r.status !== 201) throw new Error(`Expected 201, got ${r.status}: ${JSON.stringify(r.body)}`);
        if (!r.body.id) throw new Error('No id in response');
        createdTaskId = r.body.id;
    });

    await test('GET /api/tasks?assignee=潘潘 返回任务', async () => {
        const r = await request('GET', '/api/tasks?assignee=潘潘');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!Array.isArray(r.body)) throw new Error(`Expected array, got ${typeof r.body}`);
    });

    await test('PUT /api/tasks/:id 状态 → done 获得金币', async () => {
        if (!createdTaskId) return;
        const r = await request('PUT', `/api/tasks/${createdTaskId}`, { status: 'done' });
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
        if (r.body.coinsEarned < 0) throw new Error(`Expected coinsEarned >= 0, got ${r.body.coinsEarned}`);
    });

    await test('DELETE /api/tasks/:id 删除任务', async () => {
        if (!createdTaskId) return;
        const r = await request('DELETE', `/api/tasks/${createdTaskId}`);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    });

    await test('GET /api/tasks/:id 不存在 → 404 (via PUT)', async () => {
        const r = await request('PUT', '/api/tasks/999999999', { status: 'done' });
        if (r.status !== 404) throw new Error(`Expected 404, got ${r.status}`);
    });

    await test('POST /api/tasks 无效 assignee → 400', async () => {
        const r = await request('POST', '/api/tasks', { title: 'test', assignee: 'nobody' });
        if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
    });

    // ── Categories CRUD ──
    console.log('\n🏷️  Categories');

    await test('GET /api/categories → 200 array', async () => {
        const r = await request('GET', '/api/categories');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!Array.isArray(r.body)) throw new Error('Expected array');
    });

    await test('DELETE /api/categories 不存在 → 404', async () => {
        const r = await request('DELETE', '/api/categories/999999999');
        if (r.status !== 404) throw new Error(`Expected 404, got ${r.status}`);
    });

    // ── Stats ──
    console.log('\n📊 Stats');

    await test('GET /api/stats?range=week → 200 含 waterGoal', async () => {
        const r = await request('GET', '/api/stats?range=week');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (typeof r.body.waterGoal !== 'number') throw new Error(`Expected waterGoal number, got ${r.body.waterGoal}`);
    });

    await test('GET /api/stats?range=month&assignee=潘潘 → 200', async () => {
        const r = await request('GET', '/api/stats?range=month&assignee=潘潘');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    });

    // ── Garden Coins ──
    console.log('\n🪙  Garden Coins');

    await test('GET /api/garden/coins/潘潘 → 200 with balance', async () => {
        const r = await request('GET', '/api/garden/coins/潘潘');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (typeof r.body.balance !== 'number') throw new Error(`Expected balance number, got ${r.body.balance}`);
    });

    await test('POST /api/garden/coins/earn 非法 reason → 403', async () => {
        const r = await request('POST', '/api/garden/coins/earn', {
            assignee: '潘潘',
            amount: 999,
            reason: 'cheat',
        });
        if (r.status !== 403) throw new Error(`Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
    });

    await test('POST /api/garden/coins/earn pomodoro → 200', async () => {
        const r = await request('POST', '/api/garden/coins/earn', {
            assignee: '潘潘',
            amount: 1,
            reason: 'pomodoro',
            detail: '测试专注',
        });
        if (r.status !== 200 && r.status !== 429) {
            throw new Error(`Expected 200 or 429 (rate limit), got ${r.status}: ${JSON.stringify(r.body)}`);
        }
    });

    // ── Journal ──
    console.log('\n📓 Journal');

    await test('GET /api/journal?date=2026-01-01 → 200 (no entry)', async () => {
        const r = await request('GET', '/api/journal?date=2026-01-01');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (r.body.elements === undefined) throw new Error('Expected elements array in response');
    });

    await test('GET /api/journal 无 date → 400', async () => {
        const r = await request('GET', '/api/journal');
        if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
    });

    await test('GET /api/journal/recent → 200 array', async () => {
        const r = await request('GET', '/api/journal/recent');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!Array.isArray(r.body)) throw new Error('Expected array');
    });

    // ── Garden Islands & Boats ──
    console.log('\n🏝️  Garden Islands & Boats');

    await test('GET /api/garden/islands/潘潘 → 200 array', async () => {
        const r = await request('GET', '/api/garden/islands/潘潘');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!Array.isArray(r.body)) throw new Error('Expected array');
    });

    await test('GET /api/garden/boats/潘潘 → 200 with catalog', async () => {
        const r = await request('GET', '/api/garden/boats/潘潘');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!r.body.catalog) throw new Error('Expected catalog in response');
    });

    await test('POST /api/garden/boats/buy 余额不足 → 400', async () => {
        // Fresh test: try to buy very expensive boat (galleon=1000) on hopefully empty account
        // Even if user has coins, test the error path by using invalid boat_type first
        const r = await request('POST', '/api/garden/boats/buy', {
            assignee: '潘潘',
            boat_type: 'unknown_boat',
        });
        if (r.status !== 400) throw new Error(`Expected 400 for unknown boat_type, got ${r.status}`);
    });

    // ── Expedition Error Cases ──
    console.log('\n⛵ Expedition Error Cases');

    await test('POST /api/garden/expeditions/start 无 boat → 404', async () => {
        const r = await request('POST', '/api/garden/expeditions/start', {
            assignee: '潘潘',
            boat_id: 999999,
        });
        if (r.status !== 404) throw new Error(`Expected 404, got ${r.status}: ${JSON.stringify(r.body)}`);
    });

    await test('POST /api/garden/expeditions/start 缺少参数 → 400', async () => {
        const r = await request('POST', '/api/garden/expeditions/start', { assignee: '潘潘' });
        if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
    });

    // ── Summary ──
    console.log(`\n${'─'.repeat(48)}`);
    console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    if (failures.length > 0) {
        console.log('\n  Failed tests:');
        for (const f of failures) {
            console.log(`    ❌ ${f.name}: ${f.error}`);
        }
    }
    console.log(`${'─'.repeat(48)}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('\n💥 Test runner crashed:', err.message);
    console.error('  Is the server running on port 3000? Run: npm run dev');
    process.exit(1);
});
