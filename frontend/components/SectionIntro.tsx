import { HelpTooltip } from "@/components/HelpTooltip";

type SectionIntroProps = {
  title: string;
  description: string;
  helpText?: string;
  action?: React.ReactNode;
};

export function SectionIntro({ title, description, helpText, action }: SectionIntroProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {helpText ? <HelpTooltip text={helpText} /> : null}
      </div>
    </div>
  );
}
