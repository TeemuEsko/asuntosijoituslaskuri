import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.asuntosijoituslaskuri.fi"),
  title: "Asuntosijoituslaskuri.fi – analysoi sijoitusasunto maksutta",
  description:
    "Laske sijoitusasunnon vuokratuotto, kassavirta, rahoitus ja keskeiset riskit maksutta Etuovi- tai Oikotie-ilmoituksesta.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fi_FI",
    url: "/",
    siteName: "asuntosijoituslaskuri.fi",
    title: "Asuntosijoituslaskuri.fi",
    description:
      "Analysoi sijoitusasunnon tuotto, kassavirta, rahoitus ja keskeiset riskit maksutta.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
