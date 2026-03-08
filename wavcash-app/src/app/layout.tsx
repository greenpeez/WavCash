import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import PrivyProviderWrapper from "@/components/providers/privy-provider";
import { SupportWidget } from "@/components/support/SupportWidget";
import GlobalCursor from "@/components/global-cursor";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// DM Sans as fallback for General Sans (visually similar geometric sans)
const dmSans = DM_Sans({
  variable: "--font-general-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WavCash — Your music. Your money. Finally.",
  description:
    "Royalty intelligence and payment infrastructure for music rights holders in Africa and Latin America.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning style={{ background: "#0a0a0a", colorScheme: "dark" }}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background:#0a0a0a}' }} />
      </head>
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} ${dmSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var b=document.body;b.style.opacity='0';try{var t=localStorage.getItem('wavcash-theme')||localStorage.getItem('theme');var l=t==='light';document.documentElement.style.background=l?'#F8F6F3':'#0a0a0a';document.documentElement.setAttribute('data-theme',l?'light':'dark');b.style.background=l?'#F8F6F3':'#0a0a0a'}catch(e){document.documentElement.style.background='#0a0a0a';document.documentElement.setAttribute('data-theme','dark');b.style.background='#0a0a0a'}window.addEventListener('beforeunload',function(){b.style.opacity='0'});setTimeout(function(){b.style.opacity='1'},3000)})()`,
          }}
        />
        <PrivyProviderWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
          >
            {children}
            <GlobalCursor />
            <SupportWidget />
            <Toaster />
          </ThemeProvider>
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}
