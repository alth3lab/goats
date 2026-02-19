import type { Metadata } from "next";

export const dynamic = 'force-dynamic';
import { Cairo } from "next/font/google";
import { RTLThemeProvider } from "@/theme/RTLThemeProvider";
import { AppNotifierProvider } from "@/components/AppNotifier";
import { CssBaseline } from "@mui/material";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "نظام إدارة المواشي",
  description: "نظام شامل لإدارة المواشي — ماعز وإبل وأغنام",
  icons: {
    icon: "/favicon.svg",
  },
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
          <AppNotifierProvider>
            <CssBaseline />
            {children}
          </AppNotifierProvider>
        </RTLThemeProvider>
      </body>
    </html>
  );
}
