const db = require('../server/db');

const TARGET_DATE = '2026-03-14';
const TARGET_TIMES = {
    '潘潘': '2026-03-14 17:51:23',
    '蒲蒲': '2026-03-14 08:33:26',
};
const WAKEUP_REWARD_AMOUNT = 0.5;

function loadState() {
    const records = db.prepare(`
        SELECT * FROM checkin_records
        WHERE type = 'wakeup' AND date = ?
        ORDER BY assignee
    `).all(TARGET_DATE);

    const transactions = db.prepare(`
        SELECT * FROM coin_transactions
        WHERE reason = 'checkin_daily'
          AND detail = 'wakeup 达标'
          AND date(created_at) = ?
        ORDER BY assignee, created_at, id
    `).all(TARGET_DATE);

    const balances = db.prepare(`
        SELECT assignee, balance
        FROM coin_accounts
        WHERE assignee IN ('潘潘', '蒲蒲')
        ORDER BY assignee
    `).all();

    return { records, transactions, balances };
}

function validateState(state) {
    const panpanRecord = state.records.find(r => r.assignee === '潘潘');
    const pupuRecord = state.records.find(r => r.assignee === '蒲蒲');
    if (!panpanRecord || !pupuRecord) {
        throw new Error(`expected two wakeup records for ${TARGET_DATE}`);
    }

    const panpanTx = state.transactions.find(tx => tx.assignee === '潘潘');
    const pupuTx = state.transactions.find(tx => tx.assignee === '蒲蒲');
    if (!panpanTx || !pupuTx) {
        throw new Error(`expected two wakeup reward transactions for ${TARGET_DATE}`);
    }

    return { panpanRecord, pupuRecord, panpanTx, pupuTx };
}

function printState(label, state) {
    console.log(`\n=== ${label} ===`);
    console.log(JSON.stringify(state, null, 2));
}

function alreadyFixed(state) {
    const panpanRecord = state.records.find(r => r.assignee === '潘潘');
    const pupuRecord = state.records.find(r => r.assignee === '蒲蒲');
    const panpanTx = state.transactions.find(tx => tx.assignee === '潘潘');
    const pupuTx = state.transactions.find(tx => tx.assignee === '蒲蒲');

    return (
        panpanRecord?.created_at === TARGET_TIMES['潘潘'] &&
        pupuRecord?.created_at === TARGET_TIMES['蒲蒲'] &&
        !panpanTx &&
        !!pupuTx &&
        pupuTx.created_at === TARGET_TIMES['蒲蒲']
    );
}

const applyFix = db.transaction(() => {
    const before = loadState();
    const { panpanRecord, pupuRecord, panpanTx, pupuTx } = validateState(before);

    db.prepare('UPDATE checkin_records SET created_at = ? WHERE id = ?')
        .run(TARGET_TIMES['潘潘'], panpanRecord.id);
    db.prepare('UPDATE checkin_records SET created_at = ? WHERE id = ?')
        .run(TARGET_TIMES['蒲蒲'], pupuRecord.id);

    db.prepare('UPDATE coin_transactions SET assignee = ?, created_at = ? WHERE id = ?')
        .run('蒲蒲', TARGET_TIMES['蒲蒲'], panpanTx.id);
    db.prepare('DELETE FROM coin_transactions WHERE id = ?').run(pupuTx.id);

    db.prepare('UPDATE coin_accounts SET balance = balance - ? WHERE assignee = ?')
        .run(WAKEUP_REWARD_AMOUNT, '潘潘');

    return loadState();
});

try {
    const before = loadState();
    printState('BEFORE', before);

    if (alreadyFixed(before)) {
        console.log('\nNo changes needed. Target state already applied.');
        process.exit(0);
    }

    if (!process.argv.includes('--apply')) {
        console.log('\nDry run only. Re-run with:');
        console.log('node scripts/fix-wakeup-mar14-swap.js --apply');
        process.exit(0);
    }

    const after = applyFix();
    printState('AFTER', after);
    console.log('\nApplied wakeup swap fix for 2026-03-14.');
} catch (err) {
    console.error('\nFix failed:', err.message);
    process.exit(1);
}
