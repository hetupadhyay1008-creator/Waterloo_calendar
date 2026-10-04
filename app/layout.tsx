import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waterloo Day",
  description: "Your Waterloo classes, times and rooms, one day at a time.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
