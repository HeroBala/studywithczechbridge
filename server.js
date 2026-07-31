import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory / file-backed SMTP configuration & email logs
const CONFIG_FILE = path.join(__dirname, 'email-config.json');

let emailConfig = {
  host: process.env.EMAIL_SMTP_HOST || '',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587', 10),
  secure: process.env.EMAIL_SMTP_SECURE === 'true',
  user: process.env.EMAIL_SMTP_USER || '',
  pass: process.env.EMAIL_SMTP_PASS || '',
  fromEmail: process.env.EMAIL_FROM || 'info@studywithczechbridge.com',
  fromName: process.env.EMAIL_FROM_NAME || 'StudyCzechBridge Admissions',
  adminEmail: process.env.EMAIL_ADMIN_NOTIFY || '1997herobala@gmail.com',
  notifyOnLogin: true,
  notifyOnAdmissionUpdate: true,
  notifyOnDocumentUpload: true
};

// Load saved config if exists
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    emailConfig = { ...emailConfig, ...saved };
  } catch (err) {
    console.error('Could not parse email-config.json:', err);
  }
}

function saveEmailConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(emailConfig, null, 2));
  } catch (err) {
    console.error('Could not save email-config.json:', err);
  }
}

const emailLogs = [];

function addEmailLog(log) {
  emailLogs.unshift({
    id: 'log-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    ...log
  });
  if (emailLogs.length > 100) emailLogs.pop();
}

// Helper to create Nodemailer Transporter
function getTransporter() {
  if (emailConfig.host && emailConfig.user && emailConfig.pass) {
    return nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return null;
}

// Helper function to send email
async function sendEmail({ to, subject, text, html, type = 'general' }) {
  const fromAddress = `"${emailConfig.fromName}" <${emailConfig.fromEmail || 'info@studywithczechbridge.com'}>`;
  const transporter = getTransporter();

  let sentReal = false;
  let statusMessage = '';

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: to,
        subject: subject,
        text: text,
        html: html || text
      });
      sentReal = true;
      statusMessage = `Dispatched via SMTP (${info.messageId})`;
      console.log(`[SMTP SUCCESS] Email sent to ${to}: ${info.messageId}`);
    } catch (err) {
      console.error(`[SMTP ERROR] Failed sending to ${to}:`, err.message);
      statusMessage = `SMTP Error: ${err.message} (Logged to activity history)`;
    }
  } else {
    statusMessage = `Logged (Configure private SMTP in Admin > Email Settings to enable live inbox delivery)`;
    console.log(`[EMAIL DISPATCH LOG] From: ${fromAddress} | To: ${to} | Subject: ${subject}`);
  }

  const logEntry = {
    type,
    from: fromAddress,
    to,
    subject,
    body: text,
    sentReal,
    statusMessage
  };
  addEmailLog(logEntry);

  return logEntry;
}

// Serve static assets from 'frontend' directory
app.use(express.static(path.join(__dirname, 'frontend'), {
  extensions: ['html']
}));

// Route to get current email config
app.get('/api/email-config', (req, res) => {
  // Mask password for safety
  const safeConfig = { ...emailConfig, pass: emailConfig.pass ? '••••••••' : '' };
  res.json({ ok: true, config: safeConfig, logs: emailLogs.slice(0, 20) });
});

// Route to update email config
app.post('/api/email-config', (req, res) => {
  const updates = req.body || {};
  if (updates.host !== undefined) emailConfig.host = updates.host;
  if (updates.port !== undefined) emailConfig.port = parseInt(updates.port, 10);
  if (updates.secure !== undefined) emailConfig.secure = !!updates.secure;
  if (updates.user !== undefined) emailConfig.user = updates.user;
  if (updates.pass !== undefined && updates.pass !== '••••••••') emailConfig.pass = updates.pass;
  if (updates.fromEmail !== undefined) emailConfig.fromEmail = updates.fromEmail;
  if (updates.fromName !== undefined) emailConfig.fromName = updates.fromName;
  if (updates.adminEmail !== undefined) emailConfig.adminEmail = updates.adminEmail;
  if (updates.notifyOnLogin !== undefined) emailConfig.notifyOnLogin = !!updates.notifyOnLogin;
  if (updates.notifyOnAdmissionUpdate !== undefined) emailConfig.notifyOnAdmissionUpdate = !!updates.notifyOnAdmissionUpdate;
  if (updates.notifyOnDocumentUpload !== undefined) emailConfig.notifyOnDocumentUpload = !!updates.notifyOnDocumentUpload;

  saveEmailConfig();
  res.json({ ok: true, message: 'Private email & SMTP settings updated successfully.' });
});

// Route to test sending email
app.post('/api/test-email', async (req, res) => {
  const { recipient } = req.body;
  const targetEmail = recipient || emailConfig.adminEmail || '1997herobala@gmail.com';

  const result = await sendEmail({
    to: targetEmail,
    subject: '🧪 Test Email — StudyCzechBridge Private SMTP Integration',
    text: `Hello,\n\nThis is a test notification from StudyCzechBridge Admissions platform.\nYour private email configuration is set up and working properly!\n\nTimestamp: ${new Date().toLocaleString()}\nFrom: ${emailConfig.fromEmail}\n\nBest regards,\nStudyCzechBridge Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <h2 style="color: #14315e; margin-top: 0;">🇨🇿 StudyCzechBridge Private SMTP Test</h2>
        <p style="color: #334155; line-height: 1.5;">This is a test email confirmation from your StudyCzechBridge platform.</p>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 0.88rem; font-family: monospace;">
          <strong>Sender:</strong> ${emailConfig.fromName} &lt;${emailConfig.fromEmail}&gt;<br>
          <strong>Status:</strong> Active &amp; Ready<br>
          <strong>Time:</strong> ${new Date().toLocaleString()}
        </div>
        <p style="color: #64748b; font-size: 0.85rem; margin-top: 20px;">StudyCzechBridge — Czech Republic University Admissions Platform</p>
      </div>
    `,
    type: 'test'
  });

  res.json({ ok: true, result });
});

// Route: User Login Notification
app.post('/api/notify-login', async (req, res) => {
  const { email, fullName, role, ip, userAgent } = req.body;

  let resultUser = null;
  let resultAdmin = null;

  if (emailConfig.notifyOnLogin) {
    const timeStr = new Date().toLocaleString();

    // 1. Send Login Security Alert to the User
    if (email) {
      resultUser = await sendEmail({
        to: email,
        subject: `🔐 New Login Alert — StudyCzechBridge Account`,
        text: `Dear ${fullName || 'Student'},\n\nA new login was detected on your StudyCzechBridge account.\n\nDate & Time: ${timeStr}\nRole: ${role || 'Student'}\n\nIf this was you, no action is needed. If you did not log in, please contact us immediately at ${emailConfig.fromEmail}.\n\nBest regards,\nStudyCzechBridge Admissions Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #14315e; margin-top: 0;">🔐 Account Login Notification</h2>
            <p style="color: #334155;">Hello <strong>${fullName || 'Student'}</strong>,</p>
            <p style="color: #334155;">A login was recorded for your StudyCzechBridge account on <strong>${timeStr}</strong>.</p>
            <div style="background: #f8fafc; padding: 12px; border-left: 4px solid #14315e; font-size: 0.88rem;">
              <strong>Account:</strong> ${email}<br>
              <strong>Role:</strong> ${role || 'Student'}
            </div>
            <p style="color: #64748b; font-size: 0.82rem; margin-top: 20px;">If you did not perform this login, please notify our team at ${emailConfig.fromEmail}.</p>
          </div>
        `,
        type: 'login_user'
      });
    }

    // 2. Notify Admin Email of Student/User Login
    if (emailConfig.adminEmail) {
      resultAdmin = await sendEmail({
        to: emailConfig.adminEmail,
        subject: `🔔 Admin Alert: User Logged In (${fullName || email})`,
        text: `Admin Alert:\nUser ${fullName || 'User'} (${email}) logged into StudyCzechBridge as ${role || 'Student'} at ${timeStr}.\nIP / Agent: ${ip || 'Web client'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px;">
            <h3 style="color: #14315e; margin-top: 0;">🔔 Admin Activity Alert: User Login</h3>
            <p><strong>User:</strong> ${fullName} (${email})</p>
            <p><strong>Role:</strong> ${role || 'Student'}</p>
            <p><strong>Timestamp:</strong> ${timeStr}</p>
          </div>
        `,
        type: 'login_admin'
      });
    }
  }

  res.json({ ok: true, userAlert: resultUser, adminAlert: resultAdmin });
});

// Route: Admission Update Notification
app.post('/api/notify-admission-update', async (req, res) => {
  const { studentEmail, studentName, stepTitle, stepNumber, newStatus, adminNotes } = req.body;

  let result = null;
  if (emailConfig.notifyOnAdmissionUpdate && studentEmail) {
    const subject = `🇨🇿 Admission Milestone Updated: ${stepTitle || 'Step Update'} (${newStatus || 'Updated'})`;
    const text = `Dear ${studentName || 'Student'},\n\nYour university admission journey status has been updated!\n\nMilestone / Step: ${stepNumber ? 'Step ' + stepNumber + ': ' : ''}${stepTitle || 'Admission Progress'}\nNew Status: ${newStatus}\n${adminNotes ? 'Notes from Advisor: ' + adminNotes + '\n' : ''}\nPlease log into your student dashboard to review your 20-step admission tracker and document requirements.\n\nDashboard: http://localhost:3000/dashboard.html\n\nBest regards,\nStudyCzechBridge Admissions Team (Brno, Czech Republic)`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <div style="background: #14315e; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 1.3rem;">🇨🇿 StudyCzechBridge Admission Update</h2>
        </div>
        <div style="padding: 20px 0;">
          <p style="color: #334155; font-size: 1rem;">Dear <strong>${studentName || 'Student'}</strong>,</p>
          <p style="color: #334155; line-height: 1.5;">There is an update on your European university admission timeline:</p>
          
          <div style="background: #f0f7ff; border-left: 5px solid #1e8e5a; padding: 15px; border-radius: 6px; margin: 18px 0;">
            <div style="font-weight: bold; color: #14315e; font-size: 1.05rem;">${stepNumber ? 'Step ' + stepNumber + ': ' : ''}${stepTitle || 'Admission Status'}</div>
            <div style="margin-top: 6px; font-size: 0.95rem; color: #0f172a;">Status: <span style="background: #1e8e5a; color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 0.8rem;">${newStatus}</span></div>
            ${adminNotes ? `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; color: #475569; font-size: 0.9rem;">📌 <strong>Note from Brno Advisor:</strong> ${adminNotes}</div>` : ''}
          </div>

          <p style="color: #334155;">Log into your portal to view your complete 20-step admission roadmap, upload requested documents, and message your assigned counselor.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="/dashboard.html" style="background: #14315e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Open Student Dashboard →</a>
          </div>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 0.8rem;">
          StudyCzechBridge · Veveří, Brno, Czech Republic · ${emailConfig.fromEmail}
        </div>
      </div>
    `;

    result = await sendEmail({
      to: studentEmail,
      subject,
      text,
      html,
      type: 'admission_update'
    });
  }

  res.json({ ok: true, emailResult: result });
});

// Route to simulate sending a welcome email
app.post('/api/welcome', async (req, res) => {
  const { email, fullName } = req.body;
  
  const result = await sendEmail({
    to: email,
    subject: "Welcome to StudyCzechBridge! 🇨🇿",
    text: `Dear ${fullName},\n\nWelcome to StudyCzechBridge! We are excited to support you on your journey to study in the Czech Republic and Europe.\n\nOur team in Brno is here to guide you with university admissions, visa processing, and relocation assistance.\n\nBest regards,\nThe Brno Team\nStudyCzechBridge`,
    type: 'welcome'
  });

  res.json({
    ok: true,
    message: `Welcome email sent successfully to ${email}`,
    details: result
  });
});

// Simple check-alive endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', emailConfigured: !!(emailConfig.host && emailConfig.user) });
});

// For any other requests, fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

