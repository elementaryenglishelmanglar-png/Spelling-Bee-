import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 24, 
  className = '', 
  text 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 size={size} className="animate-spin text-yellow-500" />
      {text && <p className="text-sm text-stone-600 font-medium">{text}</p>}
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-xl border border-stone-200">
        <LoadingSpinner size={48} text={text || 'Loading...'} />
      </div>
    </div>
  );
};
