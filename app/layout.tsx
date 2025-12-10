import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { VersionBanner } from "@/components/VersionBanner";
import SystemNotificationBanner from "@/components/banner/banner";
import { BannerContainer } from "@/components/banner/BannerContainer";
import { BannerTitle } from "@/components/ui/shadcn-io/banner";
import { CustomToaster } from "@/components/ui/custom-toaster";
import { BrokerProvider } from "@/lib/broker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Moonbase",
  description: "A modern inbox for your development workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BrokerProvider>
            <div className="flex flex-col h-screen overflow-hidden">
              <BannerContainer>
                    <SystemNotificationBanner variant="github" canClose={false}>
                      <BannerTitle className="text-center">
                        <span className="font-bold">Moonbase </span> is
                        currently under{" "}
                        <span className="font-bold">development</span>. Please
                        report any issues on{" "}
                        <a
                          href="https://github.com/linus-skold/moonbase/issues"
                          className="underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          GitHub
                        </a>
                        .
                      </BannerTitle>
                    </SystemNotificationBanner>
                    <VersionBanner />
                  </BannerContainer>

                  <div className="flex flex-1 overflow-hidden">
                    <SidebarProvider>
                      <AppSidebar />

                      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-12">
                        {children}
                      </main>
                    </SidebarProvider>
                  </div>
                </div>
          </BrokerProvider>
        </ThemeProvider>
        <CustomToaster position="top-center" />
      </body>
    </html>
  );
}
