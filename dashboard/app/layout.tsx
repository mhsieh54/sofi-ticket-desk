import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "SoFi Ticket Desk",
  description: "Ticket resale operation dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
