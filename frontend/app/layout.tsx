// app/layout.tsx

import { Toaster } from "sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import "./globals.css";
import UnauthenticatedModal from "@/components/common/UnauthenticatedModal";


export const metadata = {
  title: "Anavran livelihood Services Pvt Ltd",
  description:
    "Empowering individuals through health, wellness, and community development.",
  icons: {
    icon: "/vercel.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-background text-foreground">
        {children}
        <UnauthenticatedModal />
        <Toaster position="top-right" closeButton richColors />
        <HotToaster position="top-right" reverseOrder={false} />
      </body>
    </html>
  );
}
