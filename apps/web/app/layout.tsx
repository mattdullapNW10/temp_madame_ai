import type { ReactNode } from "react"
import "@workspace/ui/globals.css"
import localFont from "next/font/local"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils";

/**
 * Gilroy — bundled via `next/font/local` from `apps/web/public/gilroy/*.ttf`.
 * `font-medium` (500) resolves to Gilroy-Medium.
 */
const gilroy = localFont({
  src: [
    {
      path: "../public/gilroy/Gilroy-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/gilroy/Gilroy-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/gilroy/Gilroy-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/gilroy/Gilroy-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-gilroy",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(gilroy.variable, "antialiased")}
    >
      <body className={cn("min-h-svh bg-white font-sans")}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
