import type { Metadata } from "next";
import { inter, playfair } from "@/lib/fonts";
import "./globals.css";
import { Auth0ProviderWrapper } from "@/components/auth0-provider";

export const metadata: Metadata = {
  title: "ERly",
  description: "Find the right care, right now — healthcare navigation powered by smart triage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://tiles.mapbox.com" />
        <link rel="preconnect" href="https://events.mapbox.com" />
      </head>
      <body className="antialiased">
        <Auth0ProviderWrapper>
          {children}
        </Auth0ProviderWrapper>
      </body>
    </html>
  );
}
