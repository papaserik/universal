const { prisma } = require('../../../config/db');

let cache = null;
let cacheTime = 0;
const TTL = 30 * 1000;

async function allActive() {
  const now = Date.now();
  if (cache && (now - cacheTime) < TTL) return cache;
  cache = await prisma.marketplace.findMany({
    where: { active: true },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }]
  });
  cacheTime = now;
  return cache;
}

function invalidate() { cache = null; cacheTime = 0; }

module.exports = { allActive, invalidate };
