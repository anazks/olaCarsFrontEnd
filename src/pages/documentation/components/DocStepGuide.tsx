import React from 'react';
import type { DocStep } from '../../../data/documentation/types';
import { ArrowRight } from 'lucide-react';

interface DocStepGuideProps {
  steps: DocStep[];
}

export const DocStepGuide: React.FC<DocStepGuideProps> = ({ steps }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="my-6 space-y-4">
      {steps.map((step) => (
        <div
          key={step.stepNumber}
          className="relative p-5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] hover:border-[#C8E600]/40 transition-all shadow-sm"
        >
          <div className="flex items-start gap-4">
            {/* Step Counter Badge */}
            <div className="w-8 h-8 rounded-lg bg-[#C8E600]/20 text-[#C8E600] border border-[#C8E600]/40 font-bold flex items-center justify-center text-sm flex-shrink-0">
              {step.stepNumber}
            </div>

            <div className="flex-1">
              <h4 className="text-base font-semibold text-[var(--text-main)] mb-1.5 flex items-center gap-2">
                {step.title}
              </h4>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {step.description}
              </p>

              {step.expectedOutcome && (
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 w-fit">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Expected: {step.expectedOutcome}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
