import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getConsent, acceptConsent, declineConsent } from '../utils/consent';

// Opt-in banner for the Microsoft Clarity analytics. Both answers are equally easy to give.
export default function ConsentBanner() {
  const { t } = useLanguage();
  const [answered, setAnswered] = useState(() => getConsent() !== null);

  useEffect(() => {
    const sync = () => setAnswered(getConsent() !== null);
    window.addEventListener('mesenet-consent', sync);
    return () => window.removeEventListener('mesenet-consent', sync);
  }, []);

  if (answered) return null;

  return (
    <div className="consent-banner" role="dialog" aria-labelledby="consent-title" aria-describedby="consent-text">
      <strong id="consent-title" className="consent-title">{t('consentTitle')}</strong>
      <p id="consent-text" className="consent-text">{t('consentText')}</p>
      <div className="consent-actions">
        <button type="button" className="consent-btn" onClick={declineConsent}>{t('consentDecline')}</button>
        <button type="button" className="consent-btn" onClick={acceptConsent}>{t('consentAccept')}</button>
      </div>
    </div>
  );
}
