import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Daily Stock",
  description: "個人持股損益追蹤",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Daily Stock",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f8f7f4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-surface min-h-screen font-sans antialiased">
        <AuthGuard>
          <div className="max-w-md mx-auto min-h-screen relative">
            <main className="pb-24 pt-0">{children}</main>

            <BottomNav />
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}