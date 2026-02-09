import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { RTLThemeProvider } from "@/theme/RTLThemeProvider";
import { CssBaseline } from "@mui/material";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "نظام إدارة الماعز - Goat Management System",
  description: "نظام شامل لإدارة قطيع الماعز والخرفان",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>
        <RTLThemeProvider>
          <CssBaseline />
          {children}
        </RTLThemeProvider>
      </body>
    </html>
  );
}
