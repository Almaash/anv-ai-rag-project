"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UNAUTHENTICATED_EVENT = "auth:unauthenticated";

export function triggerUnauthenticatedModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UNAUTHENTICATED_EVENT));
  }
}

export default function UnauthenticatedModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleUnauthenticated = () => {
      if (typeof window === "undefined") return;

      const path = window.location.pathname || "";

      // Do not show the unauthenticated modal on the sign-in page itself
      if (path.startsWith("/auth/signin") || path === "/auth/signin/") {
        return;
      }

      setOpen(true);
    };

    window.addEventListener(UNAUTHENTICATED_EVENT, handleUnauthenticated);

    return () => {
      window.removeEventListener(UNAUTHENTICATED_EVENT, handleUnauthenticated);
    };
  }, []);

  const handleLoginRedirect = () => {
    setOpen(false);

    if (typeof window !== "undefined") {
      window.location.href = "/auth/signin";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-center">Unauthenticated</DialogTitle>
          <DialogDescription className="text-center">
            Your session has expired or is invalid. You have been logged out. Please sign in again to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center pt-2">
          <Button onClick={handleLoginRedirect} className="w-full sm:w-auto">
            Go to Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
