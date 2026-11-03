import { CheckIcon, XIcon } from "lucide-react";
import { isClosed, OUTCOMES, STEPS, stepLabel, TONE_CLASS, TOTAL_STEPS, type Outcome } from "@/lib/admission";
import { cn } from "@/lib/utils";

/**
 * Where one family is: eleven stops, travelled ones filled in the dashboard accent, the
 * current one ringed. A closed journey (rejected, declined…) ends in red where it stopped.
 */
export function JourneyRail({ step, outcome, size = "sm" }: { step: number; outcome: Outcome; size?: "sm" | "lg" }) {
  const closed = isClosed(outcome);
  // Closing completes the step it happened on, so the stop is the last completed one
  const stop = closed ? Math.max(step - 1, 1) : Math.min(step, TOTAL_STEPS + 1);
  const label = closed
    ? `${OUTCOMES[outcome].label} at ${stepLabel(stop)}`
    : step > TOTAL_STEPS
      ? "Enrolled"
      : `Step ${step} of ${TOTAL_STEPS}: ${stepLabel(step)}`;

  if (size === "sm") {
    return (
      <span role="img" aria-label={label} title={label} className="flex items-center gap-[3px]">
        {STEPS.map(({ step: n }) => (
          <span
            key={n}
            className={cn(
              "h-1.5 w-3 rounded-full",
              n < stop || (step > TOTAL_STEPS && !closed)
                ? "bg-brand"
                : n === stop
                  ? closed
                    ? "bg-red-500"
                    : "bg-brand/40 ring-2 ring-brand"
                  : "bg-muted-foreground/20"
            )}
          />
        ))}
      </span>
    );
  }

  return (
    <ol aria-label={label} className="grid grid-cols-11 gap-1">
      {STEPS.map(({ step: n, short, label: full }) => {
        const done = n < stop || step > TOTAL_STEPS;
        const current = n === stop && step <= TOTAL_STEPS;
        return (
          <li key={n} aria-current={current ? "step" : undefined} className="relative flex flex-col items-center gap-1.5 text-center">
            {n > 1 && (
              <span
                aria-hidden
                className={cn("absolute top-3.5 right-1/2 -z-0 h-0.5 w-full", n <= stop ? "bg-brand" : "bg-muted-foreground/20")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 items-center justify-center rounded-full text-[0.7rem] font-semibold tabular-nums",
                done && "bg-brand text-brand-foreground",
                current && !closed && "bg-background text-brand ring-[3px] ring-brand",
                current && closed && "bg-red-600 text-white dark:text-black/[0.87]",
                !done && !current && "border-2 border-dashed border-muted-foreground/30 bg-background text-muted-foreground"
              )}
            >
              {done ? <CheckIcon className="size-3.5" strokeWidth={3} /> : current && closed ? <XIcon className="size-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={cn("text-[0.7rem] leading-tight", current ? "font-semibold" : "text-muted-foreground")} title={full}>
              {short}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OutcomePill({ outcome, className }: { outcome: Outcome; className?: string }) {
  const { label, tone } = OUTCOMES[outcome];
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONE_CLASS[tone], className)}>{label}</span>;
}
