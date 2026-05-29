import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-6 shadow-sm">
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">← Takaisin laskuriin</Link>
        <h1 className="mt-6 text-3xl font-bold">Tietosuoja</h1>
        <p className="mt-4">Tämä MVP-versio ei sisällä käyttäjätiliä eikä pysyvää tietokantaa. Käyttäjän syöttämät tiedot käsitellään laskurin näkymässä.</p>
      </div>
    </main>
  );
}
