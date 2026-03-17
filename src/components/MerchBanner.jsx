import { useLanguage } from '../context/LanguageContext';

export default function MerchBanner() {
    const { t } = useLanguage();
    return (
        <div className="merch-banner fade-in" id="merch-banner">
            <div className="merch-emoji">👕</div>
            <div className="merch-text">
                <div className="merch-title">{t('merchTitle')}</div>
                <div className="merch-cta">{t('merchCTA')}</div>
            </div>
        </div>
    );
}
