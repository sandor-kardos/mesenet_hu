import { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';

const FacebookIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const WhatsAppIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.724-8.869L1.254 2.25H8.08l4.257 5.631 5.907-5.631Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
  </svg>
);

const PLATFORMS = [
  {
    label: 'WhatsApp',
    icon: WhatsAppIcon,
    color: '#25D366',
    bg: 'rgba(37,211,102,0.12)',
    getHref: (url, title) => `https://wa.me/?text=${encodeURIComponent(`📖 *${title}* | Mesenet.hu\n\n✨ Nézd meg ezt a gyönyörű esti mesét: illusztrációval és beszélgetős kérdésekkel készült gyerekeknek. Olvasd el itt ingyen:\n👉 ${url}`)}`,
  },
  {
    label: 'Facebook',
    icon: FacebookIcon,
    color: '#1877F2',
    bg: 'rgba(24,119,242,0.12)',
    getHref: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    label: 'X',
    icon: XIcon,
    color: '#000000',
    bg: 'rgba(0,0,0,0.08)',
    getHref: (url, title) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`✨ Olvasd el a(z) „${title}” című mesét a Mesenet.hu-n! 📖 Ingyenes esti mese gyerekeknek illusztrációval:`)}`,
  },
  {
    label: 'Email',
    icon: Mail,
    color: '#EA4335',
    bg: 'rgba(234,67,53,0.12)',
    getHref: (url, title) => `mailto:?subject=${encodeURIComponent(`📖 Meseajánló: ${title}`)}&body=${encodeURIComponent(`Szia!\n\nGondoltam, tetszeni fog ez a gyönyörű mese a Mesenet.hu-n:\n\n${title}\n\nIngyen elolvashatod itt:\n${url}\n\nJó olvasást kívánok!`)}`,
  },
];

export default function SocialShareButton({ url, title }) {
  const [copied, setCopied] = useState(false);
  const shareText = `📖 ${title} | Mesenet.hu\n✨ Olvasd el ezt a gyönyörű esti mesét itt: ${url}`;

  const handleCopy = async (e) => {
    e.stopPropagation();
    try { 
      await navigator.clipboard.writeText(url); 
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleNativeShare = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} · Mesenet.hu`,
          text: `✨ Nézd meg ezt a gyönyörű mesét a Mesenet.hu-n: ${title}`,
          url: url,
        });
      } catch (_) {}
    } else {
      handleCopy(e);
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="social-share-panel animate-slide-up-smooth">
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <p className="social-share-label" style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, opacity: 0.9 }}>
          ✨ Oszd meg más szülőkkel is!
        </p>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.75 }}>
          Küldd el a mesét ismerőseidnek egy kattintással
        </span>
      </div>

      <div className="social-share-grid">
        {PLATFORMS.map(({ label, icon: Icon, color, bg, getHref }) => (
          <a
            key={label}
            href={getHref(url, title)}
            target="_blank"
            rel="noopener noreferrer"
            className="social-share-item"
            style={{ '--social-color': color, '--social-bg': bg }}
            onClick={(e) => e.stopPropagation()}
            title={label}
          >
            <Icon size={20} />
            <span>{label}</span>
          </a>
        ))}

        <button
          className={`social-share-item copy-item${copied ? ' copied' : ''}`}
          onClick={handleCopy}
          title="Link másolása"
        >
          {copied ? <Check size={20} /> : <Copy size={20} />}
          <span>{copied ? 'Másolva!' : 'Link'}</span>
        </button>
      </div>

      {hasNativeShare && (
        <button 
          onClick={handleNativeShare}
          style={{
            marginTop: '10px',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '12px',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            fontSize: '0.78rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            border: '1px solid var(--accent-glow)',
            cursor: 'pointer'
          }}
        >
          <span>📲</span> Megosztás a telefonon
        </button>
      )}
    </div>
  );
}
