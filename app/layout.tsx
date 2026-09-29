import { Geist_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" className={cn("antialiased", "font-sans", fontMono.variable)}>
      <body>{children}</body>
    </html>
  )
}
