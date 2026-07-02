import NotificationLog from '../models/NotificationLog.js';

export const CHANNELS = ['whatsapp', 'sms', 'ivr'];
export const PREFERRED_CHANNELS = ['whatsapp', 'sms', 'ivr', 'auto'];

const TWILIO_SMS_SEGMENT_LIMIT = 320;

/**
 * Normalize an Indian mobile number to E.164 (+91XXXXXXXXXX).
 */
export const normalizeIndianPhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith('091')) return `+91${digits.slice(3)}`;
  if (phone.startsWith('+') && digits.length >= 10) return `+${digits}`;

  return digits.length >= 10 ? `+${digits}` : null;
};

export const isTwilioConfigured = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID
    && process.env.TWILIO_AUTH_TOKEN
    && process.env.TWILIO_SMS_FROM
  );

export const isTwilioVoiceConfigured = () =>
  isTwilioConfigured() && Boolean(process.env.TWILIO_VOICE_FROM || process.env.TWILIO_SMS_FROM);

/**
 * Derive channel-specific message bodies from bilingual AI output.
 */
export const buildChannelTexts = (messageData = {}, language = 'hindi') => {
  const hindi = messageData.hindi || '';
  const english = messageData.english || '';
  const whatsappText = messageData.whatsappText || english || hindi;

  const primaryText = language === 'english'
    ? (english || hindi)
    : (hindi || english);

  let smsText = messageData.smsText;
  if (!smsText) {
    const compact = primaryText.replace(/\s+/g, ' ').trim();
    smsText = compact.length > TWILIO_SMS_SEGMENT_LIMIT
      ? `${compact.slice(0, TWILIO_SMS_SEGMENT_LIMIT - 3)}...`
      : compact;
  }

  let ivrText = messageData.ivrText;
  if (!ivrText) {
    ivrText = primaryText
      .replace(/[📚🎯✅💬•—]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return { whatsappText, smsText, ivrText, hindi, english };
};

/**
 * Resolve which channel to use when "auto" is selected.
 * Feature-phone families default to SMS; IVR is the last resort.
 */
export const resolveAutoChannel = (parentCommunication = {}) => {
  const { preferredChannel, hasSmartphone } = parentCommunication;

  if (preferredChannel && preferredChannel !== 'auto') {
    return preferredChannel;
  }
  if (hasSmartphone === false) {
    return isTwilioConfigured() ? 'sms' : 'ivr';
  }
  return 'whatsapp';
};

export const buildWhatsAppLink = (phone, text) => {
  const encoded = encodeURIComponent(text);
  const normalized = normalizeIndianPhone(phone);
  const digits = normalized ? normalized.replace(/\D/g, '') : '';
  return digits
    ? `https://wa.me/${digits}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
};

const twilioRequest = async (path, body) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Twilio error (${response.status})`);
  }
  return data;
};

const sendSms = async (phone, body) => {
  const to = normalizeIndianPhone(phone);
  if (!to) throw new Error('Invalid parent phone number for SMS.');

  if (!isTwilioConfigured()) {
    return {
      provider: 'mock',
      providerId: `mock-sms-${Date.now()}`,
      status: 'mock',
      mode: 'mock',
      message: 'Twilio not configured — SMS logged in demo mode.',
    };
  }

  const result = await twilioRequest('/Messages.json', {
    To: to,
    From: process.env.TWILIO_SMS_FROM,
    Body: body,
  });

  return {
    provider: 'twilio',
    providerId: result.sid,
    status: result.status === 'queued' || result.status === 'sent' ? 'sent' : 'pending',
    mode: 'live',
  };
};

export const buildTwiml = (script, language) => {
  const lang = language === 'english' ? 'en-IN' : 'hi-IN';
  const escaped = script
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${lang}" voice="Polly.Aditi">${escaped}</Say>
  <Pause length="1"/>
  <Say language="${lang}" voice="Polly.Aditi">धन्यवाद। Shiksha Setu से संदेश समाप्त।</Say>
</Response>`;
};

const sendIvrCall = async (phone, script, language = 'hindi') => {
  const to = normalizeIndianPhone(phone);
  if (!to) throw new Error('Invalid parent phone number for voice call.');

  if (!isTwilioVoiceConfigured()) {
    return {
      provider: 'mock',
      providerId: `mock-ivr-${Date.now()}`,
      status: 'mock',
      mode: 'mock',
      message: 'Twilio Voice not configured — IVR logged in demo mode.',
      ivrScript: script,
    };
  }

  const from = process.env.TWILIO_VOICE_FROM || process.env.TWILIO_SMS_FROM;
  const twiml = buildTwiml(script, language);

  const result = await twilioRequest('/Calls.json', {
    To: to,
    From: from,
    Twiml: twiml,
  });

  return {
    provider: 'twilio',
    providerId: result.sid,
    status: result.status === 'queued' || result.status === 'in-progress' ? 'sent' : 'pending',
    mode: 'live',
    ivrScript: script,
  };
};

/**
 * Send a parent notification on the chosen channel.
 */
export const sendParentNotification = async ({
  studentId,
  studentName,
  phone,
  channel,
  messageData,
  language = 'hindi',
  templateType = 'parent_message',
  parentCommunication = {},
  metadata = {},
}) => {
  const resolvedChannel = channel === 'auto'
    ? resolveAutoChannel(parentCommunication)
    : channel;

  if (!CHANNELS.includes(resolvedChannel)) {
    throw new Error(`Unsupported channel: ${resolvedChannel}`);
  }

  const texts = buildChannelTexts(messageData, language);
  let deliveryResult;
  let body;
  let status;
  let provider;
  let providerId;
  let error;

  try {
    if (resolvedChannel === 'whatsapp') {
      body = texts.whatsappText;
      deliveryResult = {
        provider: 'manual',
        providerId: null,
        status: 'manual',
        mode: 'manual',
        whatsappLink: buildWhatsAppLink(phone, body),
        message: 'Open WhatsApp link to complete delivery (requires smartphone).',
      };
    } else if (resolvedChannel === 'sms') {
      body = texts.smsText;
      if (!phone) throw new Error('Parent phone number is required for SMS.');
      deliveryResult = await sendSms(phone, body);
    } else if (resolvedChannel === 'ivr') {
      body = texts.ivrText;
      if (!phone) throw new Error('Parent phone number is required for voice call.');
      deliveryResult = await sendIvrCall(phone, body, language);
    }

    status = deliveryResult.status;
    provider = deliveryResult.provider;
    providerId = deliveryResult.providerId;
  } catch (err) {
    status = 'failed';
    provider = 'twilio';
    error = err.message;
    body = body || texts.smsText || texts.ivrText || texts.whatsappText;
  }

  const log = await NotificationLog.create({
    studentId,
    studentName,
    channel: resolvedChannel,
    templateType,
    body,
    phone: phone || '',
    status,
    provider,
    providerId,
    error,
    metadata: { ...metadata, language, mode: deliveryResult?.mode },
  });

  if (status === 'failed') {
    const failError = new Error(error || 'Failed to send parent notification.');
    failError.logId = log._id;
    throw failError;
  }

  return {
    logId: log._id,
    channel: resolvedChannel,
    status,
    provider,
    providerId,
    ...deliveryResult,
  };
};

export const getChannelStatus = () => ({
  sms: { available: isTwilioConfigured(), provider: 'twilio' },
  ivr: { available: isTwilioVoiceConfigured(), provider: 'twilio' },
  whatsapp: { available: true, provider: 'manual', note: 'Uses wa.me deep link (smartphone required)' },
  mockMode: !isTwilioConfigured(),
});
