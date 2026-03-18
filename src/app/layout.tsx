import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import { AuthProvider } from "@/lib/auth";
import ThemeProvider from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "MitrrAi — SVNIT Study Buddy Matching",
  description: "AI-powered study partner matching for SVNIT Surat students. Find compatible buddies across departments, subjects, and schedules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* visualViewport --vh variable for mobile keyboard */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            function setVh(){
              var vh=(window.visualViewport?window.visualViewport.height:window.innerHeight)*0.01;
              document.documentElement.style.setProperty('--vh',vh+'px');
            }
            setVh();
            if(window.visualViewport){
              window.visualViewport.addEventListener('resize',setVh);
              window.visualViewport.addEventListener('scroll',setVh);
            }
            window.addEventListener('resize',setVh);
            window.addEventListener('orientationchange',setVh);
          })();
        `}} />
      </head>
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
            <AppProviders>
              <AppShell>
                {children}
              </AppShell>
            </AppProviders>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
