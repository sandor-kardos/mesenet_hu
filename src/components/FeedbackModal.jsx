import React, { useState, useEffect } from 'react';

export default function FeedbackModal({ isOpen, onClose, storyTitle, storyId }) {
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const categories = [
    { id: 'missing', label: '🧩 Hiányos / Érthetetlen szöveg' },
    { id: 'age', label: '🔞 Nem megfelelő korcsoport' },
    { id: 'ai', label: '🤖 AI hiba (furcsa mondatok)' },
    { id: 'image', label: '🖼️ A kép nem illik a meséhez' },
    { id: 'boring', label: '💤 Nem volt érdekes' }
  ];

  const handleSubmit = async (reason) => {
    setIsSending(true);
    try {
      // Professional WP Alert integration
      await fetch('/wp-json/mesenet/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: storyTitle,
          reason: reason,
          id: storyId || window.location.pathname,
          to: 'hello@sandorkardos.com'
        })
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    } catch (e) {
      console.error('[Feedback] Network error', e);
      // Fallback for demo
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div className="modal-content feedback-modal" onClick={e => e.stopPropagation()} style={{ background: '#1a1a2e', borderColor: 'rgba(255,215,0,0.2)' }}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        {isSuccess ? (
          <div className="fade-in" style={{ padding: '2em 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✨</div>
            <h3 style={{ color: '#ffd700' }}>Köszönjük!</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>A visszajelzésed sokat segít a Mesenet fejlődésében.</p>
          </div>
        ) : (
          <>
            <h3 style={{ color: '#ffd700', marginBottom: '10px' }}>Miben segíthetünk?</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Miért nem tetszett a(z) <strong style={{color: '#fff'}}>{storyTitle || 'történet'}</strong>?
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  className="feedback-option-btn"
                  onClick={() => handleSubmit(cat.label)}
                  disabled={isSending}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    padding: '14px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    fontSize: '0.95rem'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            
            {isSending && (
              <div style={{ marginTop: '15px', color: '#ffd700', fontSize: '0.8rem' }}>
                Küldés... 🚀
              </div>
            )}
          </>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .feedback-option-btn:hover:not(:disabled) {
          background: rgba(255,215,0,0.1) !important;
          border-color: #ffd700 !important;
          color: #ffd700 !important;
          transform: translateY(-2px);
        }
        .feedback-option-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .feedback-modal {
          max-width: 400px !important;
          width: 90% !important;
          border-radius: 28px !important;
        }
      `}} />
    </div>
  );
}
