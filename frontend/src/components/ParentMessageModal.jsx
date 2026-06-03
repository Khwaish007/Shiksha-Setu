import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';
import '../styles/ParentMessageModal.css';

const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (!text) return;
    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(intervalId);
    }, 50);
    return () => clearInterval(intervalId);
  }, [text]);

  return <span>{displayedText}</span>;
};

const ParentMessageModal = ({ student, onClose }) => {
  const [language, setLanguage] = useState('both');
  const [tone, setTone] = useState('friendly');
  const [loading, setLoading] = useState(false);
  const [messageData, setMessageData] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setMessageData(null);
    try {
      const data = await analyticsAPI.generateParentMessage(student._id, { language, tone });
      setMessageData(data);
    } catch (err) {
      console.error('Failed to generate message:', err);
      alert('Failed to generate message.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!messageData) return;
    navigator.clipboard.writeText(messageData.whatsappText);
    alert('Copied to clipboard!');
  };

  const openWhatsApp = () => {
    if (!messageData) return;
    const encoded = encodeURIComponent(messageData.whatsappText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="pm-modal-overlay">
      <motion.div 
        className="pm-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="pm-modal-header">
          <h2>Notify Parent: {student.studentName}</h2>
          <button className="pm-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="pm-modal-body">
          <div className="pm-controls">
            <div className="pm-control-group">
              <label>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="both">Hindi + English</option>
                <option value="hindi">Hindi Only</option>
                <option value="english">English Only</option>
              </select>
            </div>
            <div className="pm-control-group">
              <label>Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="friendly">Warm & Friendly</option>
                <option value="formal">Professional & Formal</option>
              </select>
            </div>
            <button className="pm-generate-btn" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Composing...' : 'Generate Message'}
            </button>
          </div>

          <div className="pm-preview-container">
            {loading ? (
              <div className="pm-loading">
                <span className="pm-spinner">✍️</span>
                <p><TypewriterText text="Composing personalized message..." /></p>
              </div>
            ) : messageData ? (
              <div className="pm-preview-card">
                {messageData.hindi && (
                  <div className="pm-message-part hindi-text">
                    {messageData.hindi}
                  </div>
                )}
                {messageData.hindi && messageData.english && <hr />}
                {messageData.english && (
                  <div className="pm-message-part english-text">
                    {messageData.english}
                  </div>
                )}
              </div>
            ) : (
              <div className="pm-empty-state">
                <p>Select options and click Generate to create a parent message.</p>
              </div>
            )}
          </div>
        </div>

        <div className="pm-modal-footer">
          <button className="pm-btn-secondary" onClick={copyToClipboard} disabled={!messageData || loading}>
            Copy to Clipboard
          </button>
          <button className="pm-btn-primary" onClick={openWhatsApp} disabled={!messageData || loading}>
            <span className="whatsapp-icon">💬</span> Open in WhatsApp
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ParentMessageModal;
