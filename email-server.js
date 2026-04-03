import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

let transporter;

// Create a Test Account automatically on startup using Ethereal Email
// This requires ZERO setup from the user!
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return process.exit(1);
    }

    console.log('\n========================================');
    console.log('📧 Virtual SMTP Server Ready!');
    console.log('No personal email credentials required.');
    console.log('========================================\n');

    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
});

// HTML Template Builder
const buildEmailTemplate = (name, subject, message) => {
    return `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fcfcfc;">
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #000; color: #fff; width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin: 0 auto;">
                Sq
            </div>
            <h1 style="color: #000; font-size: 24px; font-weight: 300; margin-top: 20px; letter-spacing: -0.5px;">Squrx <strong style="font-weight: 700;">Notification</strong></h1>
        </div>

        <div style="background: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.05);">
            <h2 style="font-size: 18px; color: #000; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Hi ${name},</h2>
            <p style="font-size: 15px; color: #444; line-height: 1.6; font-weight: 400; margin-bottom: 30px;">
                ${message}
            </p>

            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 12px; border: 1px dashed rgba(0,0,0,0.1); margin-top: 30px;">
                <p style="font-size: 13px; color: #666; margin: 0; font-weight: 500;">
                    <strong>Event:</strong> ${subject}
                </p>
            </div>
        </div>

        <div style="text-align: center; margin-top: 30px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 30px;">
            <p style="font-size: 12px; color: #888; margin: 0; font-weight: 400;">
                You received this alert because of recent activity on your Squrx account.
            </p>
            <p style="font-size: 12px; color: #bbb; margin-top: 8px;">
                © 2026 Squrx Platform. All rights reserved.
            </p>
        </div>
    </div>
    `;
};

// API Endpoint to send email
app.post('/api/send-email', async (req, res) => {
    const { to, name, subject, message } = req.body;

    if (!to || !name || !subject || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!transporter) {
        return res.status(500).json({ error: 'Nodemailer test transporter not initialized yet' });
    }

    try {
        const info = await transporter.sendMail({
            from: '"Squrx Notifications" <no-reply@squrx.com>',
            to: to,
            subject: `[Squrx] ${subject}`,
            html: buildEmailTemplate(name, subject, message),
        });

        console.log(`\n========================================`);
        console.log(`✅ EMAIL SENT SUCCESSFULLY TO: ${to}`);
        console.log(`📎 MESSAGE ID: ${info.messageId}`);
        console.log(`🌐 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
        console.log(`========================================\n`);

        // Provide the generated preview link back to the frontend too!
        res.status(200).json({
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        });

    } catch (error) {
        console.error('Email Send Error:', error);
        res.status(500).json({ error: 'Failed to send isolated test email.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n🚀 Squrx Custom Email Microservice Active`);
    console.log(`📡 Listening on http://localhost:${PORT}`);
    console.log('Generating Ethereal isolated email credentials...');
});
