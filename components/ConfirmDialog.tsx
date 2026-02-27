import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
}) => {
  if (!isOpen) return null;

  const btnColors = {
    danger: 'bg-rose-700 text-white hover:bg-rose-800 shadow-md',
    warning: 'bg-amber-500 text-stone-900 hover:bg-amber-600 shadow-md',
    info: 'bg-amber-500 text-stone-900 hover:bg-amber-600 shadow-md',
  };

  const iconColors = {
    danger: <XCircle size={32} className="text-rose-600" />,
    warning: <AlertTriangle size={32} className="text-amber-500" />,
    info: <Info size={32} className="text-amber-500" />,
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-50 rounded-3xl shadow-2xl max-w-md w-full border border-stone-200 transform scale-100 transition-transform">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 mt-1">
              {iconColors[type]}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black text-stone-900 mb-2 font-serif leading-tight">{title}</h3>
              <p className="text-stone-600 font-sans leading-relaxed text-sm">{message}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 bg-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-200 rounded-xl font-bold transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-6 py-2.5 font-bold rounded-xl transition-all active:scale-[0.98] ${btnColors[type]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
