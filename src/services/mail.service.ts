import { transporter } from "../utils/nodemailer.util";
import ejs from 'ejs';
import path from 'path';
import config from "../config";
import { InternalServerError } from "../errors/internal-server.error";

class MailService {
    constructor(private readonly _transporter = transporter) {}

    async sendEmail(
        toEmail: string,
        templateName: string,
        templateData: Record<string, unknown>,
        subject: string,
    ) {
        try {
            const templatePath = path.resolve(__dirname, '../templates', templateName);

            const fs = require('fs');
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template file not found: ${templateName}`);
            }

            const html = await ejs.renderFile(templatePath, templateData);

            const mailOptions = {
                from: `'Caroal dot com' <${config.GMAIL_USER}>`,
                to: toEmail,
                subject,
                html,
            };

            const info = await this._transporter.sendMail(mailOptions);

            if(!info.messageId) {
                throw new InternalServerError('Email failed to send');
            }

            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email sending error: ', error);
            throw new InternalServerError('Failed to send email');            
        }
    }
}

export default new MailService();