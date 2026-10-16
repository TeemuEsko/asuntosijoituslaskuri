import { readFile } from "node:fs/promises";
import postgres from "postgres";

const connection = process.env.DATABASE_URL;
if (!connection) throw new Error("DATABASE_URL puuttuu.");
const migration = await readFile(new URL("../db/migrations/001_lead_capture.sql", import.meta.url), "utf8");
const sql = postgres(connection, { max: 1 });
try {
  await sql.unsafe(migration);
  console.log("Liiditietokannan migraatio valmis.");
} finally {
  await sql.end();
}
