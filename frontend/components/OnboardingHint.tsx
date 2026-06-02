import { Sparkles } from "lucide-react";

type OnboardingHintProps = {
  title: string;
  description: string;
};

export function OnboardingHint({ title, description }: OnboardingHintProps) {
  return (
    <div className="rounded-app border border-amber/30 bg-amber/10 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 text-amber" size={16} />
        <div>
          <strong className="block">{title}</strong>
          <span className="mt-1 block text-muted">{description}</span>
        </div>
      </div>
    </div>
  );
}
