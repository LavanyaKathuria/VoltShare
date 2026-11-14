import { ButtonLink } from "@/components/ui/Button";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-tint text-sky-600">
        <MapPinOff className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-3xl">This page drove off</h1>
      <p className="mt-2 text-muted">We couldn’t find what you were looking for.</p>
      <ButtonLink href="/explore" variant="brand" className="mt-6">
        Find a charger
      </ButtonLink>
    </main>
  );
}
