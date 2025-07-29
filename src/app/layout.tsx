import type { Metadata } from "next";
import "./globals.css";
import {HeroUIProvider} from "@heroui/react";

export const metadata: Metadata = {
  title: "SKYPOINT SOCIALS AI",
  description: "Social Media Post Automation Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <HeroUIProvider>
          {children}
        </HeroUIProvider>
      </body>
    </html>
  );
}
