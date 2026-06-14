import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack/server";
import { Inter } from "next/font/google";
// @ts-expect-error: global CSS import without explicit type declaration
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GovNexus AI - Public Resource Management",
  description:
    "AI-Powered Public Resource Management Platform for Governments, NGOs, and Humanitarian Organizations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <StackProvider app={stackServerApp}>
          <StackTheme theme={{}}>{children}</StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
