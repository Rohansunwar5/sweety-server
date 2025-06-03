import twilio from 'twilio';
import config from '../config';

export const twilioWhatsAppClient = twilio (
    config.TWILIO_ACCOUNT_SID,
    config.TWILIO_AUTH_TOKEN
)

twilioWhatsAppClient.messages.list({ limit: 1 })
    .then(() => console.log('twilio WhatsApp client is ready'))
    .catch((error) => console.error('Error with Twilio WhatsApp client', error));