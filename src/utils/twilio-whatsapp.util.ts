import twilio from 'twilio';
import config from '../config';

export const twilioWhatsAppClient = twilio (
    config.TWILIO_ACCOUNT_SID,
    config.TWILIO_AUTH_TOKEN
)