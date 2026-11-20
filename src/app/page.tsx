import { HeroPreview } from "@/components/landing/HeroPreview";
import { ButtonLink } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { Logo } from "@/components/ui/Logo";
import {
  ArrowRight,
  BatteryCharging,
  Building2,
  CalendarCheck,
  Car,
  IndianRupee,
  KeyRound,
  Lock,
  MapPinned,
  ShieldCheck,
  Zap,
} from "lucide-react";

// Plain-language problem framing. Add sourced figures here if you want numbers on the page.
const PROBLEMS = [
  { Icon: Building2, stat: "No place to plug in", text: "Many urban EV owners live in apartments, where installing a personal charger needs society approval, a dedicated bay and often a separate connection." },
  { Icon: Car, stat: "Scarce public chargers", text: "Public stations are few, unevenly spread and often occupied — hardest of all for cab and delivery drivers who charge every day." },
  { Icon: BatteryCharging, stat: "Idle private chargers", text: "Chargers at homes, cafés, hotels and housing societies sit unused for most of the day, earning nothing." },
];

const STEPS = [
  { Icon: MapPinned, title: "Find & book", text: "Browse nearby driveway, café and society chargers on a live map. Pick 30-minute slots that lock instantly — no double bookings, ever." },
  { Icon: KeyRound, title: "Self check-in", text: "The exact address and gate notes unlock only after you book. Arrive, and check in with your 4-digit PIN within 100 m of the charger." },
  { Icon: IndianRupee, title: "Pay per kWh", text: "Plug in, watch your session live, then check out with the meter reading. You pay only for the energy you used." },
];

const TRUST = [
  { Icon: Lock, title: "Address privacy", text: "Public listings show a ~300 m circle. Exact location is shared only with confirmed renters, only for their slot." },
  { Icon: ShieldCheck, title: "Verified hosts", text: "Hosts are verified by admins, with a DISCOM EV-meter compliance badge on every listing." },
  { Icon: Zap, title: "Real-time everywhere", text: "Slot pills, map pins and earnings update live across every open device." },
];

export default function Landing() {
  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-[520px] bg-[radial-gradient(60%_60%_at_20%_20%,rgba(14,165,233,0.14),transparent),radial-gradient(50%_50%_at_80%_30%,rgba(16,185,129,0.14),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-12 sm:px-6 md:pt-20 lg:grid-cols-2">
          <FadeIn>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-dot" /> Prototype · demo with 21 sample chargers in Bengaluru &amp; Delhi
            </span>
            <h1 className="mt-5 text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
              Charge at a neighbour’s driveway, <span className="text-brand-gradient">not a queue.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              VoltShare turns idle home, café and society chargers into bookable 30-minute slots. Drivers find a charger
              nearby, self check-in and pay per kWh. Hosts earn from a charger that would otherwise sit unused.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/explore" variant="brand" size="lg">
                Find a charger <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/host" variant="outline" size="lg">
                List your charger
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs text-muted">
              From <span className="num text-ink">₹10/kWh</span> · Type 2, CCS2 & 15A sockets · No app download needed
            </p>
          </FadeIn>
          <FadeIn delay={0.1} className="pb-8">
            <HeroPreview />
          </FadeIn>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <FadeIn className="max-w-2xl">
            <p className="text-sm font-semibold text-sky">The problem</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">India’s EV owners have cars. Not chargers.</h2>
            <p className="mt-4 text-muted">
              Many new EV owners — apartment dwellers, cab and delivery drivers — have the least access to charging.
              Meanwhile, a growing number of private chargers already exist, and sit idle.
            </p>
          </FadeIn>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map(({ Icon, stat, text }, i) => (
              <FadeIn key={stat} delay={i * 0.06} className="card p-6">
                <Icon className="h-6 w-6 text-sky" />
                <p className="mt-4 font-display text-xl font-bold tracking-tight">{stat}</p>
                <p className="mt-2 text-sm text-muted">{text}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <FadeIn className="text-center">
          <p className="text-sm font-semibold text-brand-600">How it works</p>
          <h2 className="mt-2 text-3xl sm:text-4xl">Three steps from low battery to on your way</h2>
        </FadeIn>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ Icon, title, text }, i) => (
            <FadeIn key={title} delay={i * 0.08} className="card relative p-6">
              <span className="num absolute right-5 top-5 text-sm text-slate-300">0{i + 1}</span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg">{title}</h3>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 rounded-3xl bg-gradient-to-br from-sky-tint to-mint p-6 sm:p-10 md:grid-cols-3">
          {TRUST.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-white/70 p-5 backdrop-blur">
              <Icon className="h-5 w-5 text-brand-600" />
              <h3 className="mt-3 text-base">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-sky/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-brand/30 blur-3xl" />
          <CalendarCheck className="relative mx-auto h-8 w-8 text-emerald-300" />
          <h2 className="relative mt-4 text-3xl sm:text-4xl">Got a charger that sleeps all day?</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-slate-300">
            List it in minutes. You set the rate, the hours and the rules — we handle bookings, check-in and billing.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/host" variant="brand" size="lg">
              Become a host
            </ButtonLink>
            <ButtonLink href="/explore" size="lg" className="bg-white/10 hover:bg-white/15 text-white shadow-none">
              Explore chargers
            </ButtonLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <Logo />
          <p>A peer-to-peer EV charging prototype · Payments in test mode</p>
        </div>
      </footer>
    </main>
  );
}
