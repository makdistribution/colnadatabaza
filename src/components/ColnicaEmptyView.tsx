import React from 'react';

interface ColnicaEmptyViewProps {
  title: string;
}

/** Empty placeholder pages for COLNICA submenu tools. */
export const ColnicaEmptyView: React.FC<ColnicaEmptyViewProps> = ({ title }) => {
  return (
    <div className="bg-white border-2 border-slate-500 rounded-xl shadow-xs overflow-hidden my-4">
      <div className="bg-slate-50 px-5 py-3.5 border-b-2 border-slate-600">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
      </div>
      <div className="p-8 min-h-[200px]" />
    </div>
  );
};
