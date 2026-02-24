import type { Metadata } from "next";

export const dynamic = 'force-dynamic';
import { Cairo } from "next/font/google";
import { RTLThemeProvider } from "@/theme/RTLThemeProvider"
import { AppNotifierProvider } from "@/components/AppNotifier"
import { CssBaseline } from "@mui/material"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"
import "./globals.css"

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "وبر وصوف — نظام إدارة المواشي",
  description: "وبر وصوف: نظام سحابي شامل لإدارة مزارع الإبل والأغنام والمواشي في الوطن العربي",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'وبر وصوف',
  },
  icons: {
    icon: "/favicon.svg",
    apple: '/favicon.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#2e7d32',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="theme-color" content="#2e7d32" />
        <meta name="color-scheme" content="light dark" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body className={cairo.className}>
        <RTLThemeProvider>
          <AppNotifierProvider>
            <CssBaseline />
            {children}
            <ServiceWorkerRegistration />
          </AppNotifierProvider>
        </RTLThemeProvider>
      </body>
    </html>
  )
}


