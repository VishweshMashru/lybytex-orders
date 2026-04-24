import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "LybyTex Orders",
  description: "Order & Invoice Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
        <SessionProvider>
          <Nav />
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
