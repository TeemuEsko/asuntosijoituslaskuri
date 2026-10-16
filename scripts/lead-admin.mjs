import postgres from "postgres";

const [command, rawEmail] = process.argv.slice(2);
const email = rawEmail?.trim().toLocaleLowerCase("en-US");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL puuttuu.");
if (!email || !["revoke", "delete"].includes(command)) {
  throw new Error("Käyttö: npm run lead:admin -- revoke|delete sähköposti@example.fi");
}
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  if (command === "revoke") {
    await sql.begin(async (transaction) => {
      const rows = await transaction`update leads set marketing_consent = false, updated_at = now() where email_normalized = ${email} returning id`;
      if (rows[0]) await transaction`insert into consent_events (lead_id, action, consent_source) values (${rows[0].id}, 'revoked', 'admin_procedure')`;
      console.log(rows.length ? "Markkinointilupa peruutettu." : "Sähköpostia ei löytynyt.");
    });
  } else {
    const rows = await sql`delete from leads where email_normalized = ${email} returning id`;
    console.log(rows.length ? "Liidi ja siihen viittaava suostumushistoria poistettu." : "Sähköpostia ei löytynyt.");
  }
} finally {
  await sql.end();
}
