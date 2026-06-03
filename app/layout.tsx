import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";
import UserMenu from "@/components/UserMenu";

export const metadata: Metadata = {
  title: "股市損益",
  description: "個人持股損益追蹤",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "股市損益",
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
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-surface min-h-screen font-sans antialiased">
        <AuthGuard>
          <div className="max-w-md mx-auto min-h-screen relative">
            {/* 右上角使用者選單（登入頁不顯示） */}
            <div className="absolute top-3 right-4 z-30">
              <UserMenu />
            </div>

            <main className="pb-24 pt-0">
              {children}
            </main>

            <BottomNav />
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
