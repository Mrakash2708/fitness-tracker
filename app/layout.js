import "./globals.css";

export const metadata = {
  title: "Akash's Health Reset — Fitness Tracker",
  description: "Personal fitness and health tracker for a 3-6 month health reset plan. Track protein, water, steps, workouts, and more.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
