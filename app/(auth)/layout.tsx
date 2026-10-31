import { ShaderBackground } from "@/components/auth/shader-background";

// Ported from Keyed-frontend src/components/auth/AuthShell.tsx. Always light, like
// Keyed's: colours are explicit, so the dark theme doesn't touch the login screen.
const HEADLINE = "Education, Powered by Intelligence";
const LEGAL = [
  { label: "Privacy Policy", href: "https://myatlasedu.ai/privacy-policy.html" },
  { label: "Terms & Conditions", href: "https://myatlasedu.ai/term-conditions.html" },
];

function Wordmark({ className }: { className?: string }) {
  return <p className={`text-3xl font-black tracking-tight ${className ?? ""}`}>MyAISee</p>;
}

function Dots() {
  return (
    <div aria-hidden className="flex items-center gap-4">
      <span className="size-3 rounded-full bg-blue-500" />
      <span className="size-3 rounded-full bg-green-500" />
      <span className="size-3 rounded-full bg-red-500" />
    </div>
  );
}

function Legal({ className }: { className: string }) {
  return (
    <nav aria-label="Legal" className="flex items-center gap-8 text-sm">
      {LEGAL.map(({ label, href }) => (
        <a key={href} href={href} target="_blank" rel="noreferrer" className={className}>
          {label}
        </a>
      ))}
    </nav>
  );
}

export default function AuthLayout({ children }: LayoutProps<"/">) {
  // One form instance: Keyed renders children twice (a hidden copy per breakpoint),
  // which duplicates ids and handlers; here the panels are just shown or hidden.
  return (
    <div className="min-h-dvh bg-white [color-scheme:light] md:grid md:grid-cols-2">
      {/* md and up: black brand panel with the drifting dots */}
      <div className="relative hidden flex-col overflow-hidden bg-black p-12 text-white md:flex">
        <ShaderBackground className="pointer-events-auto absolute inset-0" variant="dark" />
        {/* Content lets the pointer through to the canvas, except the links */}
        <div className="pointer-events-none relative z-10 mb-auto">
          <Wordmark className="text-5xl" />
        </div>
        <div className="pointer-events-none relative z-10 mb-auto">
          <h1 className="mb-8 text-6xl leading-tight font-light">{HEADLINE}</h1>
          <Dots />
        </div>
        <div className="pointer-events-auto relative z-10">
          <Legal className="text-gray-400 transition-colors hover:text-gray-200" />
        </div>
      </div>

      {/* Below md: white and stacked, legal pinned to the bottom. md and up: the form on grey */}
      <div className="flex min-h-dvh flex-col p-6 md:items-center md:justify-center md:bg-gray-50 md:p-12">
        <div className="pt-2 md:hidden">
          <Wordmark className="mb-8 text-gray-900" />
          <p className="mb-6 text-3xl leading-tight font-light text-gray-900">{HEADLINE}</p>
          <div className="mb-10">
            <Dots />
          </div>
        </div>
        <main className="mx-auto w-full max-w-md">{children}</main>
        <div className="mt-auto flex justify-center pt-10 md:hidden">
          <Legal className="text-gray-500 transition-colors hover:text-gray-900" />
        </div>
      </div>
    </div>
  );
}
