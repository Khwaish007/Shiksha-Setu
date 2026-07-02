import { useState, useEffect } from 'react';
import { analyticsAPI } from '../api/analyticsAPI';
import { useI18n } from '../i18n.jsx';
import '../styles/ParentChannelActions.css';

const DEFAULT_PREFS = {
  preferredChannel: 'auto',
  preferredLanguage: 'hindi',
  hasSmartphone: true,
};

const ParentChannelActions = ({
  studentId,
  messageData,
  parentPhone: initialPhone = '',
  parentCommunication: initialPrefs = DEFAULT_PREFS,
  templateType = 'parent_message',
  onPhoneSaved,
  onPreferencesSaved,
}) => {
  const { t } = useI18n();
  const [parentPhone, setParentPhone] = useState(initialPhone);
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS, ...initialPrefs });
  const [activeChannel, setActiveChannel] = useState(
    initialPrefs?.preferredChannel === 'auto' ? 'sms' : (initialPrefs?.preferredChannel || 'sms')
  );
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [channelStatus, setChannelStatus] = useState(null);

  useEffect(() => {
    setParentPhone(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    setPrefs({ ...DEFAULT_PREFS, ...initialPrefs });
  }, [initialPrefs]);

  useEffect(() => {
    analyticsAPI.getParentChannelStatus()
      .then(setChannelStatus)
      .catch(() => setChannelStatus(null));
  }, []);

  const handleSaveContact = async () => {
    if (!studentId) return;
    setSaving(true);
    try {
      const data = await analyticsAPI.updateCommunicationPreferences(studentId, {
        parentPhone,
        ...prefs,
      });
      onPhoneSaved?.(data.parentPhone);
      onPreferencesSaved?.(data.parentCommunication);
      setPrefs(data.parentCommunication);
    } catch (err) {
      console.error('Failed to save contact:', err);
      alert(t('failedSaveContact'));
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (channel) => {
    if (!messageData) return;

    if (channel === 'whatsapp') {
      const text = messageData.whatsappText || messageData.english || messageData.hindi;
      const encoded = encodeURIComponent(text);
      const digits = parentPhone.replace(/\D/g, '');
      const url = digits
        ? `https://wa.me/${digits}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      window.open(url, '_blank');
      return;
    }

    if (!studentId) {
      alert(t('saveStudentForServerSend'));
      return;
    }
    if (!parentPhone.trim()) {
      alert(t('phoneRequiredForChannel'));
      return;
    }

    setSending(true);
    setSendResult(null);
    try {
      if (studentId) {
        await analyticsAPI.updateCommunicationPreferences(studentId, {
          parentPhone,
          ...prefs,
        });
      }

      const result = await analyticsAPI.sendParentNotification(studentId, {
        channel,
        messageData,
        templateType,
        language: prefs.preferredLanguage,
      });
      setSendResult(result);
      if (result.mode === 'mock') {
        alert(t('channelSentMock', { channel: t(`channel_${channel}`) }));
      } else {
        alert(t('channelSentSuccess', { channel: t(`channel_${channel}`) }));
      }
    } catch (err) {
      console.error('Send failed:', err);
      alert(err.response?.data?.error || t('channelSendFailed'));
    } finally {
      setSending(false);
    }
  };

  const channels = [
    { id: 'whatsapp', icon: '💬', label: t('channel_whatsapp'), needsPhone: false },
    { id: 'sms', icon: '📱', label: t('channel_sms'), needsPhone: true },
    { id: 'ivr', icon: '📞', label: t('channel_ivr'), needsPhone: true },
  ];

  return (
    <div className="pca-container">
      <div className="pca-equity-banner">
        <span className="pca-equity-icon">🟡</span>
        <p>{t('featurePhoneEquityNote')}</p>
      </div>

      <div className="pca-contact-section">
        <label className="pca-label">{t('parentPhoneNumber')}</label>
        <div className="pca-phone-row">
          <input
            type="tel"
            className="pca-phone-input"
            placeholder={t('parentPhonePlaceholder')}
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
          />
          {studentId && (
            <button
              className="pca-save-btn"
              onClick={handleSaveContact}
              disabled={saving}
            >
              {saving ? t('saving') : t('save')}
            </button>
          )}
        </div>
        <p className="pca-hint">{t('parentPhoneHintMultiChannel')}</p>
      </div>

      <div className="pca-prefs-row">
        <label className="pca-pref-item">
          <span>{t('preferredLanguage')}</span>
          <select
            value={prefs.preferredLanguage}
            onChange={(e) => setPrefs((p) => ({ ...p, preferredLanguage: e.target.value }))}
          >
            <option value="hindi">{t('hindiOnly')}</option>
            <option value="english">{t('englishOnly')}</option>
            <option value="both">{t('hindiEnglish')}</option>
          </select>
        </label>
        <label className="pca-pref-item pca-checkbox">
          <input
            type="checkbox"
            checked={!prefs.hasSmartphone}
            onChange={(e) => setPrefs((p) => ({ ...p, hasSmartphone: !e.target.checked }))}
          />
          <span>{t('parentHasFeaturePhone')}</span>
        </label>
      </div>

      <div className="pca-channel-tabs">
        {channels.map((ch) => (
          <button
            key={ch.id}
            type="button"
            className={`pca-channel-tab ${activeChannel === ch.id ? 'active' : ''}`}
            onClick={() => setActiveChannel(ch.id)}
          >
            <span>{ch.icon}</span> {ch.label}
          </button>
        ))}
      </div>

      {channelStatus?.mockMode && activeChannel !== 'whatsapp' && (
        <p className="pca-mock-notice">{t('smsIvrDemoMode')}</p>
      )}

      <div className="pca-channel-preview">
        {activeChannel === 'whatsapp' && messageData?.whatsappText && (
          <p className="pca-preview-text">{messageData.whatsappText}</p>
        )}
        {activeChannel === 'sms' && (
          <p className="pca-preview-text">
            {messageData?.smsText || messageData?.hindi || messageData?.english}
          </p>
        )}
        {activeChannel === 'ivr' && (
          <p className="pca-preview-text pca-ivr-script">
            {messageData?.ivrText || messageData?.hindi || messageData?.english}
          </p>
        )}
      </div>

      {sendResult && (
        <div className={`pca-send-result pca-status-${sendResult.status}`}>
          {t('lastSendStatus', {
            channel: t(`channel_${sendResult.channel}`),
            status: sendResult.status,
          })}
        </div>
      )}

      <div className="pca-send-actions">
        <button
          type="button"
          className={`pca-send-btn pca-send-${activeChannel}`}
          onClick={() => handleSend(activeChannel)}
          disabled={!messageData || sending}
        >
          {sending ? t('sending') : (
            activeChannel === 'whatsapp'
              ? t('sendViaWhatsApp')
              : activeChannel === 'sms'
                ? t('sendViaSms')
                : t('sendViaIvr')
          )}
        </button>
      </div>
    </div>
  );
};

export default ParentChannelActions;
