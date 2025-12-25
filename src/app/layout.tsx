import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STARK Todo",
  description: "Minimalist Todo List",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

