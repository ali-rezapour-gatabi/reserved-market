import { Geist_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { DirectionProvider } from "@/components/ui/direction"

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
    <html
      lang="fa"
      dir="rtl"
      className={cn("antialiased", "font-sans", fontMono.variable)}
    >
      <body>
        <DirectionProvider direction="rtl">{children}</DirectionProvider>
      </body>
    </html>
  )
}
