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
  title: "وبر وصوف — نظام إدارة المواشي",
  description: "وبر وصوف: نظام سحابي شامل لإدارة مزارع الإبل والأغنام والمواشي في الوطن العربي",
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
