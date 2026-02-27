import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  className = '',
  text
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Custom Institutional Spinner */}
      <div
        className="animate-spin rounded-full border-[3px] border-stone-200 border-t-amber-500"
        style={{ width: size, height: size }}
      />
      {text && <p className="text-sm text-stone-600 font-serif font-medium tracking-wide">{text}</p>}
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, text }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[9998] flex items-center justify-center animate-fade-in">
      <div className="bg-stone-50 rounded-3xl p-8 shadow-2xl border border-stone-200 flex flex-col items-center">
        <LoadingSpinner size={48} text={text || 'Loading...'} />
      </div>
    </div>
  );
};
