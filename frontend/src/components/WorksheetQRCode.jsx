import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '../i18n.jsx';
import '../styles/WorksheetQRCode.css';

const buildFeedbackUrl = (token) => {
  if (!token) return '';
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/feedback/${token}`;
  }
  return `/feedback/${token}`;
};

const WorksheetQRCode = ({
  feedbackToken,
  feedbackUrl,
  studentName,
  score,
  compact = false,
  showPrint = true,
}) => {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const [url, setUrl] = useState(feedbackUrl || buildFeedbackUrl(feedbackToken));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(feedbackUrl || buildFeedbackUrl(feedbackToken));
  }, [feedbackToken, feedbackUrl]);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: compact ? 120 : 160,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch((err) => console.error('QR render failed:', err));
  }, [url, compact]);

  const handleCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!feedbackToken) return null;

  return (
    <div className={`worksheet-qr ${compact ? 'compact' : ''}`}>
      <div className="worksheet-qr-print-area">
        <div className="worksheet-qr-header">
          <span className="worksheet-qr-brand">Shiksha Setu</span>
          {studentName && <span className="worksheet-qr-student">{studentName}</span>}
          {typeof score === 'number' && (
            <span className="worksheet-qr-score">{t('scoreLabel')}: {score}%</span>
          )}
        </div>
        <canvas ref={canvasRef} className="worksheet-qr-canvas" />
        <p className="worksheet-qr-caption">{t('scanForFeedback')}</p>
        <p className="worksheet-qr-url">{url}</p>
      </div>

      {!compact && (
        <div className="worksheet-qr-actions">
          <button type="button" className="worksheet-qr-btn" onClick={handleCopy}>
            {copied ? t('copiedToClipboard') : t('copyFeedbackLink')}
          </button>
          {showPrint && (
            <button type="button" className="worksheet-qr-btn primary" onClick={handlePrint}>
              {t('printQrSticker')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WorksheetQRCode;
