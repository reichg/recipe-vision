import { Lora, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import { DatabaseHealthIndicator } from "./components/DatabaseHealthIndicator";
import Navbar from "./components/Navbar";
import { layoutStyles } from "./styles/layout.styles";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

export const metadata = {
  title: "Recipe OCR",
  description: "OCR an image and extract a structured recipe",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${lora.variable}`}>
      <body style={layoutStyles.body}>
        <Navbar />
        {children}
        <DatabaseHealthIndicator />
      </body>
    </html>
  );
}
