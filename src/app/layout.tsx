import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ModeProvider } from "@/components/layout/ModeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { inter, jakarta, jetbrains } from "./fonts";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltShare — book a private EV charger nearby",
  description:
    "Peer-to-peer EV charger booking. Hosts list idle chargers at homes, cafés and societies; drivers book 30-minute slots, self check-in and pay per kWh.",
};

export const viewport: Viewport = { themeColor: "#F0F9FF", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <AuthProvider>
          <ModeProvider>
            <Navbar />
            {children}
          </ModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
