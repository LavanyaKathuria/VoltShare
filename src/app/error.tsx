"use client";

import { Button } from "@/components/ui/Button";
import { TriangleAlert } from "lucide-react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <TriangleAlert className="h-10 w-10 text-busy-fg" />
      <h1 className="mt-4 text-2xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
