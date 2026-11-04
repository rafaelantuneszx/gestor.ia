import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const espaco = localFont({
  src: [
    { path: "./fonts/SpaceGrotesk-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/SpaceGrotesk-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/SpaceGrotesk-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--fonte-space",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestor.IA",
  description: "Seu escritório remoto 24 horas. Sua empresa e seu grupo em um só lugar.",
  metadataBase: new URL("https://gestoria-rose.vercel.app"),
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Gestor.IA", statusBarStyle: "default", startupImage: "/marca/splash-1170x2532.png" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={espaco.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
