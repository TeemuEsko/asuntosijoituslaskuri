export const metadata = {
  title: "Asuntosijoituslaskuri",
  description: "Sijoitusasunnon analyysi",
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="fi">
      <body>{children}</body>
    </html>
  );
}
