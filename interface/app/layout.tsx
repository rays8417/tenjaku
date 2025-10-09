import type { Metadata } from "next";
import localFont from "next/font/local";
import Navbar from "../components/Navbar";
import { WalletProvider } from "../contexts/WalletContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Tenjaku",
  description: "Cricket fantasy",
  icons: {
    icon: '/tenjaku-circular-blackwhite.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased scrollbar-thin`}
      >
        <WalletProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--card)',
                color: 'var(--foreground)',
              },
              success: {
                duration: 4000,
                iconTheme: {
                  primary: '#3b82f6',
                  secondary: '#0b0b0b',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#0b0b0b',
                },
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}
