import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { ADSENSE_CLIENT_ID, ADSENSE_AD_SLOT } from '../../constants';

const AD_VIEW_SECONDS = 5;

interface AdGateProps {
  onContinue: () => void;
  continueLabel?: string;
}

// Gates a reveal behind a short ad view. Renders a real AdSense unit once ADSENSE_CLIENT_ID is set
// (constants.ts); until then, shows a placeholder so the gating UX/flow can be built and tested now.
export const AdGate: React.FC<AdGateProps> = ({ onContinue, continueLabel = 'your result' }) => {
  const [secondsLeft, setSecondsLeft] = useState(AD_VIEW_SECONDS);
  const adRef = useRef<HTMLModElement>(null);
  const hasPushedAd = useRef(false);

  // When no real ad unit is configured, skip the gate entirely.
  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !ADSENSE_AD_SLOT) {
      onContinue();
    }
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const hasRealAdUnit = Boolean(ADSENSE_CLIENT_ID && ADSENSE_AD_SLOT);

  useEffect(() => {
    if (!hasRealAdUnit || hasPushedAd.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      hasPushedAd.current = true;
    } catch (_) {
      // Ad blocker or script not loaded — placeholder behavior below still applies.
    }
  }, [hasRealAdUnit]);

  return (
    <div className="rounded-xl border border-purple-500/30 bg-black/60 p-6 text-center space-y-4">
      {hasRealAdUnit ? (
        <ins
          ref={adRef}
          className="adsbygoogle block"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={ADSENSE_AD_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/60 p-8 text-gray-500 text-sm">
          Ad placeholder
        </div>
      )}
      <Button onClick={onContinue} disabled={secondsLeft > 0} className="w-full">
        {secondsLeft > 0 ? `Continue in ${secondsLeft}s...` : `Reveal ${continueLabel}`}
      </Button>
    </div>
  );
};
