import "./globals.css";

export const metadata = {
  title: "Akash's Health Reset",
  description: "Personal fitness and health tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Health Reset",
  },
};

export const viewport = {
  themeColor: "#faf5ff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents annoying zoom on mobile inputs
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
