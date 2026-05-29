import "./globals.css";

export const metadata = {
  title: "asuntosijoituslaskuri.fi",
  description: "Sijoitusasunnon analyysi ja URL-haku",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fi">
      <body>{children}</body>
    </html>
  );
}
