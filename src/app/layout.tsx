import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gridline | Multiplayer Game Platform",
  description: "Play, create, and grow multiplayer games together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
