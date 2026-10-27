import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Central · Rafael Enterprises",
  description: "Mesa de aprovações e arquivo dos agentes da Rafael Enterprises",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
