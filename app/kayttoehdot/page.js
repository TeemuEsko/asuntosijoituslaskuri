import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-6 shadow-sm">
        <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">← Takaisin laskuriin</Link>
        <h1 className="mt-6 text-3xl font-bold">Käyttöehdot</h1>
        <p className="mt-4">asuntosijoituslaskuri.fi on suuntaa-antava laskuri ja analyysityökalu asuntosijoituskohteiden arviointiin.</p>
        <h2 className="mt-6 text-xl font-semibold">Ei sijoitusneuvontaa</h2>
        <p className="mt-2">Palvelu ei tarjoa sijoitusneuvontaa, taloudellista neuvontaa, veroneuvontaa, lakineuvontaa tai ostosuosituksia.</p>
        <h2 className="mt-6 text-xl font-semibold">Käyttäjän vastuu</h2>
        <p className="mt-2">Käyttäjä vastaa syöttämiensä tietojen oikeellisuudesta ja lopullisesta sijoituspäätöksestä.</p>
      </div>
    </main>
  );
}
