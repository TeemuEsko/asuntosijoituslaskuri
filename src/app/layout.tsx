import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropertyOS — Property Workspace",
  description: "Asuntosijoittajan päätöksenteon työtila",
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
