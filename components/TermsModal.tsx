import React from 'react';

interface TermsModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  showDeclineMessage: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  open,
  onAccept,
  onDecline,
  showDeclineMessage,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-purple-500/60 bg-black/90 shadow-[0_0_40px_rgba(168,85,247,0.35)]">
        <div className="border-b border-purple-500/30 p-6">
          <h2 className="text-2xl font-bold text-purple-300">Terms & Conditions</h2>
          <p className="mt-1 text-sm text-gray-400">
            Please read and accept before continuing.
          </p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6 text-sm leading-relaxed text-gray-300">
          <p>
            Pick Vision AI provides informational analysis and suggestions for entertainment
            purposes only. We do not guarantee outcomes, profits, or accuracy, and we are not
            responsible for any losses, damages, or decisions you make based on the content in
            this app. Betting involves risk; only wager what you can afford to lose.
          </p>
          <p className="mt-4">
            By using this service, you acknowledge that you are solely responsible for your bets,
            that results may vary, and that Pick Vision AI, its creators, and affiliates are not
            liable for any direct or indirect loss. You also confirm you are of legal gambling age
            in your jurisdiction.
          </p>
          <p className="mt-4">
            We use cookies and local storage to maintain sessions, save login information, and
            personalize your experience. By accepting these terms, you consent to this data
            storage and processing in accordance with our privacy practices.
          </p>
          <p className="mt-4">
            If you do not agree to these terms, you must discontinue use of the application.
          </p>
          {showDeclineMessage && (
            <p className="mt-4 rounded-lg border border-gray-700 bg-gray-900/70 px-4 py-3 text-gray-300">
              You must accept the terms to continue using Pick Vision AI.
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-purple-500/30 p-6">
          <button
            type="button"
            onClick={onDecline}
            className="rounded-lg bg-gray-700 px-5 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-600"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-500"
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
