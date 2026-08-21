import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../context/CartContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata = {
  metadataBase: new URL('https://kallamakan.com'),
  title: "Kalla Makan - Asinan Buah Segar Premium Kiamboy & Pomegranate",
  description: "Pesan asinan buah segar premium langsung secara online. Kuah kiamboy merah spesial & asinan delima merah pomegranate segar langsung antar ke alamat Anda.",
  keywords: ["asinan buah", "asinan kiamboy", "asinan pomegranate", "asinan jakarta", "kalla makan", "buah segar"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kalla Makan",
  },
  openGraph: {
    title: "Kalla Makan - Asinan Buah Segar Premium",
    description: "Nikmati asinan buah segar premium kiamboy dan pomegranate. Pesan cepat, higienis, dan langsung terhubung via WhatsApp.",
    url: "https://kallamakan.com",
    siteName: "Kalla Makan",
    images: [
      {
        url: "/logo-kallamakan.png",
        width: 800,
        height: 800,
        alt: "Logo Kalla Makan",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kalla Makan - Asinan Buah Segar Premium",
    description: "Pemesanan Asinan Buah Segar Premium Online Cepat via WhatsApp.",
    images: ["/logo-kallamakan.png"],
  },
  icons: {
    icon: "/logo-kallamakan.png",
    apple: "/logo-kallamakan.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#059669",
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    "name": "Kalla Makan",
    "image": "https://kallamakan.com/logo-kallamakan.png",
    "telephone": "082227418224",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Jakarta Barat",
      "addressRegion": "DKI Jakarta",
      "addressCountry": "ID"
    },
    "servesCuisine": "Indonesian, Fresh Fruit Asinan",
    "priceRange": "Rp 35.000 - Rp 135.000"
  };

  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
