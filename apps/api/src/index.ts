import { createDb } from './db.js';
import { buildServer } from './server.js';
import { isSeeded } from './seed.js';
import { seedReal } from './seed-real.js';

const DATA_DIR = process.env.ETOP_DATA_DIR ?? './.data/etop';
const PORT = Number(process.env.PORT ?? 3001);

const db = await createDb(DATA_DIR);
if (!(await isSeeded(db))) {
  console.log("Empty database — seeding the real E'TOP tenant…");
  await seedReal(db);
}

const app = await buildServer(db, { logger: true });
await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`ETOP API listening on :${PORT}${process.env.DATABASE_URL ? ' (hosted Postgres)' : ' (embedded PGlite)'}`);
