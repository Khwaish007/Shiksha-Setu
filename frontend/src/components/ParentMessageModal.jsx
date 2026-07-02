import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';
import { useI18n } from '../i18n.jsx';
import ParentChannelActions from './ParentChannelActions';
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
  const { t } = useI18n();
  const [language, setLanguage] = useState('both');
  const [tone, setTone] = useState('friendly');
  const [loading, setLoading] = useState(false);
  const [messageData, setMessageData] = useState(null);
  const [parentPhone, setParentPhone] = useState(student?.parentPhone || '');
  const [parentCommunication, setParentCommunication] = useState(
    student?.parentCommunication || { preferredChannel: 'auto', preferredLanguage: 'hindi', hasSmartphone: true }
  );

  useEffect(() => {
    if (student?.parentPhone) setParentPhone(student.parentPhone);
    if (student?.parentCommunication) setParentCommunication(student.parentCommunication);
  }, [student]);

  const handleGenerate = async () => {
    setLoading(true);
    setMessageData(null);
    try {
      const data = await analyticsAPI.generateParentMessage(student._id, { language, tone });
      setMessageData(data);
    } catch (err) {
      console.error('Failed to generate message:', err);
      alert(t('failedGenerateMessage'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!messageData) return;
    navigator.clipboard.writeText(messageData.whatsappText);
    alert(t('copiedToClipboard'));
  };

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <motion.div 
        className="pm-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pm-modal-header">
          <h2>{t('notifyParentFor', { name: student.studentName })}</h2>
          <button className="pm-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="pm-modal-body">
          <div className="pm-controls">
            <div className="pm-control-group">
              <label>{t('language')}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="both">{t('hindiEnglish')}</option>
                <option value="hindi">{t('hindiOnly')}</option>
                <option value="english">{t('englishOnly')}</option>
              </select>
            </div>
            <div className="pm-control-group">
              <label>{t('tone')}</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="friendly">{t('warmFriendly')}</option>
                <option value="formal">{t('professionalFormal')}</option>
              </select>
            </div>
            <button className="pm-generate-btn" onClick={handleGenerate} disabled={loading}>
              {loading ? t('composing') : t('generateMessage')}
            </button>
          </div>

          <div className="pm-preview-container">
            {loading ? (
              <div className="pm-loading">
                <span className="pm-spinner">✍️</span>
                <p><TypewriterText text={t('composingPersonalizedMessage')} /></p>
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
                <p>{t('selectOptionsGenerate')}</p>
              </div>
            )}
          </div>

          {messageData && (
            <div className="pm-channel-section">
              <h3 className="pm-channel-title">📡 {t('sendToParent')}</h3>
              <ParentChannelActions
                studentId={student._id}
                messageData={messageData}
                parentPhone={parentPhone}
                parentCommunication={parentCommunication}
                templateType="parent_message"
                onPhoneSaved={setParentPhone}
                onPreferencesSaved={setParentCommunication}
              />
            </div>
          )}
        </div>

        <div className="pm-modal-footer">
          <button className="pm-btn-secondary" onClick={copyToClipboard} disabled={!messageData || loading}>
            {t('copyToClipboard')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ParentMessageModal;
