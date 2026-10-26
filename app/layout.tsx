import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono, Newsreader } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--next-newsreader" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--next-hanken" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: "400", variable: "--next-plex-mono" });

export const metadata: Metadata = {
  title: "ResumeDB",
  description: "Tailor your resume to a job posting, and decide every change yourself.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${newsreader.variable} ${hanken.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
