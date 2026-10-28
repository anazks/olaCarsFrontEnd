import React from 'react';
import { Info, Lightbulb, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DocCalloutProps {
  type: 'tip' | 'warning' | 'info' | 'success';
  title?: string;
  children: React.ReactNode;
}

export const DocCallout: React.FC<DocCalloutProps> = ({ type, title, children }) => {
  const configs = {
    tip: {
      icon: <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0" />,
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      defaultTitle: 'Pro Tip'
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10',
      defaultTitle: 'Important Rule'
    },
    info: {
      icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      defaultTitle: 'Note'
    },
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      defaultTitle: 'Best Practice'
    }
  };

  const config = configs[type];

  return (
    <div className={`my-4 p-4 rounded-xl border ${config.border} ${config.bg} flex gap-3.5 items-start`}>
      <div className="pt-0.5">{config.icon}</div>
      <div className="flex-1 text-sm leading-relaxed">
        <h5 className="font-semibold mb-1 text-[var(--text-main)]">
          {title || config.defaultTitle}
        </h5>
        <div className="text-[var(--text-muted)] space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
};
