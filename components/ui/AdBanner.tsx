import React, { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT_ID, ADSENSE_AD_SLOT } from '../../constants';

interface AdBannerProps {
  className?: string;
}

// Persistent ad strip — unlike AdGate, there's nothing to unlock here, it just displays.
// Renders the real AdSense unit once ADSENSE_AD_SLOT is set; placeholder until then.
export const AdBanner: React.FC<AdBannerProps> = ({ className = '' }) => {
  const hasPushedAd = useRef(false);
  const hasRealAdUnit = Boolean(ADSENSE_CLIENT_ID && ADSENSE_AD_SLOT);

  useEffect(() => {
    if (!hasRealAdUnit || hasPushedAd.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      hasPushedAd.current = true;
    } catch (_) {
      // Ad blocker or script not loaded.
    }
  }, [hasRealAdUnit]);

  return (
    <div className={`bg-black/95 border-t border-gray-800 max-h-[90px] overflow-hidden flex items-center justify-center ${className}`}>
      {hasRealAdUnit ? (
        <ins
          className="adsbygoogle block"
          style={{ display: 'block', width: '100%' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={ADSENSE_AD_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="flex items-center justify-center text-gray-500 text-xs py-4">
          Ad placeholder
        </div>
      )}
    </div>
  );
};
