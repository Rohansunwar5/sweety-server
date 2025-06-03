import { twilioWhatsAppClient } from "../utils/twilio-whatsapp.util";
import { InternalServerError } from "../errors/internal-server.error";
import config from "../config";
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';
import { NotFoundError } from "../errors/not-found.error";

class WhatsAppService {
    constructor(private readonly _twilioClient = twilioWhatsAppClient) {}

    async sendWhatsappText (
        toNumber: string,
        message: string
    ) {
        try {
            const response = await this._twilioClient.messages.create({
                body: message, 
                from: `whatsapp:${config.TWILIO_WHATSAPP_NUMBER}`,
                to: `whatsapp:${toNumber}`
            });

            if(!response.sid) {
                throw new InternalServerError('WhatsApp message failed to send')
            }

            return { success: true, messageSid: response.sid }
        } catch (error) {
            console.error('WhatsApp sending error: ', error);
            throw new InternalServerError('Failed to send WhatsApp message');
        }
    }

    async sendWhatsAppTemplate(
        toNumber: string,
        templateName: string,
        templateData: Record<string, unknown>
    ) {
        try {
            const templatePath = path.join(__dirname, '../templates/whatsapp', templateName);

            if(!fs.existsSync(templatePath)) throw new NotFoundError(`WhatsApp template file not found: ${templateName}`)

            const message = await ejs.renderFile(templatePath, templateData);

            return this.sendWhatsappText(toNumber, message);

        } catch (error) {
            console.error('WhatsApp template error: ', error);
            throw new InternalServerError('Failed to process WhatsApp template');
        }
    }
}

export default new WhatsAppService();