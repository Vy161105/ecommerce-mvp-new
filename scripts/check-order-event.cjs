const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

// Verify a saved Outbox row after asynchronous publication; do not rely on
// the tiny interval between delivery to Shipment and marking publishedAt.
module.exports = async function checkOrderEvent(oid) {
  assert.ok(Number.isInteger(oid) && oid > 0);
  for (let attempt = 0; attempt < 40; attempt++) {
    const output = execFileSync('docker', [
      'compose', 'exec', '-T', 'order-db', 'psql',
      '-U', process.env.POSTGRES_USER || 'ecommerce',
      '-d', process.env.ORDER_DB_NAME || 'order_db', '-At', '-c',
      `SELECT count(*) FROM "Outbox" WHERE oid=${oid} AND "publishedAt" IS NOT NULL AND payload->>'type'='OrderCreated';`,
    ], { encoding: 'utf8', timeout: 10000 });
    if (Number(output.trim()) === 1) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw Error(`Outbox for oid=${oid} was not marked published`);
};
