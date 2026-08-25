import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewFlow",
  description: "Atsiliepimų valdymo sistema",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lt">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}