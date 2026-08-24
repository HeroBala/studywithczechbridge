import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory / file-backed SMTP configuration & email logs
const CONFIG_FILE = path.join(__dirname, 'email-config.json');

let emailConfig = {
  host: process.env.EMAIL_SMTP_HOST || 'mail.privateemail.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '465', 10),
  secure: process.env.EMAIL_SMTP_SECURE ? process.env.EMAIL_SMTP_SECURE === 'true' : true,
  user: process.env.EMAIL_SMTP_USER || 'info@studywithczechbridge.com',
  pass: process.env.EMAIL_SMTP_PASS,
  fromEmail: process.env.EMAIL_FROM || 'info@studywithczechbridge.com',
  fromName: process.env.EMAIL_FROM_NAME || 'Study With Czech Bridge',
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
function getTransporter(customPort, customSecure) {
  const host = emailConfig.host || 'mail.privateemail.com';
  const user = emailConfig.user || 'info@studywithczechbridge.com';
  const pass = emailConfig.pass || 'INFO@gmail1696';
  const port = customPort !== undefined ? customPort : emailConfig.port;
  const secure = customSecure !== undefined ? customSecure : (port === 465);

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
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
      console.warn(`[SMTP Warning on port ${emailConfig.port}] ${err.message}. Trying alternate port fallback...`);
      try {
        const fallbackPort = emailConfig.port === 465 ? 587 : 465;
        const fallbackSecure = fallbackPort === 465;
        const fallbackTransporter = getTransporter(fallbackPort, fallbackSecure);
        if (fallbackTransporter) {
          const fallbackInfo = await fallbackTransporter.sendMail({
            from: fromAddress,
            to: to,
            subject: subject,
            text: text,
            html: html || text
          });
          sentReal = true;
          statusMessage = `Dispatched via SMTP fallback port ${fallbackPort} (${fallbackInfo.messageId})`;
          console.log(`[SMTP FALLBACK SUCCESS] Email sent to ${to}: ${fallbackInfo.messageId}`);
        }
      } catch (fallbackErr) {
        console.error(`[SMTP ERROR] Failed sending to ${to}:`, fallbackErr.message);
        statusMessage = `SMTP Error: ${err.message} / ${fallbackErr.message}`;
      }
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

// Saved Email Templates handling
const TEMPLATES_FILE = path.join(__dirname, 'email-templates.json');

function loadEmailTemplates() {
  if (fs.existsSync(TEMPLATES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf-8'));
    } catch (err) {
      console.error('Error reading email-templates.json:', err);
    }
  }
  return [];
}

function saveEmailTemplates(templates) {
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
  } catch (err) {
    console.error('Error writing email-templates.json:', err);
  }
}

// Serve static assets from 'frontend' directory
app.use(express.static(path.join(__dirname, 'frontend'), {
  extensions: ['html']
}));

// Route to get saved email templates
app.get('/api/email-templates', (req, res) => {
  const templates = loadEmailTemplates();
  res.json({ ok: true, templates });
});

// Route to save or update an email template
app.post('/api/email-templates', (req, res) => {
  const { id, title, category, subject, body } = req.body;
  if (!title || !subject || !body) {
    return res.status(400).json({ ok: false, message: 'Title, subject, and body are required.' });
  }

  let templates = loadEmailTemplates();
  if (id) {
    const idx = templates.findIndex(t => t.id === id);
    if (idx !== -1) {
      templates[idx] = { ...templates[idx], title, category: category || 'General', subject, body };
    } else {
      templates.unshift({ id, title, category: category || 'General', subject, body });
    }
  } else {
    const newId = 'tpl-' + Math.random().toString(36).substring(2, 9);
    templates.unshift({ id: newId, title, category: category || 'General', subject, body });
  }

  saveEmailTemplates(templates);
  res.json({ ok: true, message: 'Email template saved successfully.', templates });
});

// Route to delete an email template
app.delete('/api/email-templates/:id', (req, res) => {
  const { id } = req.params;
  let templates = loadEmailTemplates();
  templates = templates.filter(t => t.id !== id);
  saveEmailTemplates(templates);
  res.json({ ok: true, message: 'Template deleted.', templates });
});

// Route to send email using a saved template
app.post('/api/send-template-email', async (req, res) => {
  const { to, subject, body, variables } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ ok: false, message: 'Recipient, subject, and body are required.' });
  }

  // Replace variable placeholders like {student_name}, {country}, {counselor_name}, {notes}, {program_or_job}
  let finalSubject = subject;
  let finalBody = body;

  const vars = variables || {};
  Object.keys(vars).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    const val = vars[key] != null ? String(vars[key]) : '';
    finalSubject = finalSubject.replace(regex, val);
    finalBody = finalBody.replace(regex, val);
  });

  // Convert plaintext body with line breaks to clean HTML format
  const formattedHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff;">
      <div style="background: #14315e; color: #ffffff; padding: 18px 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 1.3rem;">Study with Czech Bridge — Admissions & Mobility</h2>
      </div>
      <div style="padding: 22px 0; color: #334155; font-size: 0.98rem; line-height: 1.6; white-space: pre-line;">
        ${finalBody}
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 0.82rem;">
        Study with Czech Bridge · Veveří 111, Brno, Czech Republic · ${emailConfig.fromEmail}
      </div>
    </div>
  `;

  const logResult = await sendEmail({
    to,
    subject: finalSubject,
    text: finalBody,
    html: formattedHtml,
    type: 'admin_template_email'
  });

  res.json({ ok: true, message: `Email sent to ${to}`, result: logResult });
});

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
  const targetEmail = recipient || emailConfig.adminEmail || 'info@studywithczechbridge.com';

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

// Route: Admission Update Notification (Notifies both Student and Admin/Counselor)
app.post('/api/notify-admission-update', async (req, res) => {
  const { studentEmail, studentName, stepTitle, stepNumber, newStatus, adminNotes, counselorEmail, counselorName } = req.body;

  let resultUser = null;
  let resultAdmin = null;

  if (emailConfig.notifyOnAdmissionUpdate) {
    const timeStr = new Date().toLocaleString();

    // 1. Notify Student via Email
    if (studentEmail) {
      const subject = `🇨🇿 Admission Milestone Updated: ${stepTitle || 'Step Update'} (${newStatus || 'Updated'})`;
      const text = `Dear ${studentName || 'Student'},\n\nYour university admission journey status has been updated!\n\nMilestone / Step: ${stepNumber ? 'Step ' + stepNumber + ': ' : ''}${stepTitle || 'Admission Progress'}\nNew Status: ${newStatus}\n${adminNotes ? 'Notes from Advisor: ' + adminNotes + '\n' : ''}\nPlease log into your student dashboard to review your 20-step admission tracker and document requirements.\n\nBest regards,\nStudyCzechBridge Admissions Team (Brno, Czech Republic)`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
          <div style="background: #14315e; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0; font-size: 1.3rem;">🇨🇿 StudyCzechBridge Admission Update</h2>
          </div>
          <div style="padding: 20px 0;">
            <p style="color: #334155; font-size: 1rem;">Dear <strong>${studentName || 'Student'}</strong>,</p>
            <p style="color: #334155; line-height: 1.5;">There is a new update on your European university admission timeline:</p>
            
            <div style="background: #f0f7ff; border-left: 5px solid #1e8e5a; padding: 15px; border-radius: 6px; margin: 18px 0;">
              <div style="font-weight: bold; color: #14315e; font-size: 1.05rem;">${stepNumber ? 'Step ' + stepNumber + ': ' : ''}${stepTitle || 'Admission Status'}</div>
              <div style="margin-top: 6px; font-size: 0.95rem; color: #0f172a;">Status: <span style="background: #1e8e5a; color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 0.8rem;">${newStatus}</span></div>
              ${adminNotes ? `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; color: #475569; font-size: 0.9rem;">📌 <strong>Note from Brno Counselor:</strong> ${adminNotes}</div>` : ''}
            </div>

            <p style="color: #334155;">Log into your student portal to view your complete 20-step admission roadmap and track your progress.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="/dashboard.html" style="background: #14315e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Open Student Dashboard →</a>
            </div>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 0.8rem;">
            StudyCzechBridge · Veveří, Brno, Czech Republic · ${emailConfig.fromEmail}
          </div>
        </div>
      `;

      resultUser = await sendEmail({
        to: studentEmail,
        subject,
        text,
        html,
        type: 'admission_update_student'
      });
    }

    // 2. Notify Admin & Counselor via Email
    const notifyAdminTarget = counselorEmail || emailConfig.adminEmail || 'info@studywithczechbridge.com';
    if (notifyAdminTarget) {
      const adminSubject = `🔔 Status Update Notification: ${studentName || 'Student'} (${newStatus})`;
      const adminText = `Admin & Counselor Notification:\n\nStudent: ${studentName || 'Student'} (${studentEmail})\nStatus Updated To: ${newStatus}\nStep: ${stepTitle || 'General Status'}\nCounselor Notes: ${adminNotes || 'None'}\nUpdated At: ${timeStr}`;

      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fafafa;">
          <h3 style="color: #14315e; margin-top: 0;">🔔 Admission Status Change Alert</h3>
          <p style="color: #334155;">Status update logged for student <strong>${studentName || 'Student'}</strong> (${studentEmail}).</p>
          <div style="background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 12px 0;">
            <strong>Milestone:</strong> ${stepTitle || 'General Application Status'}<br>
            <strong>New Status:</strong> <span style="color: #1e8e5a; font-weight: bold;">${newStatus}</span><br>
            <strong>Counselor Notes:</strong> ${adminNotes || 'No notes added'}<br>
            <strong>Timestamp:</strong> ${timeStr}
          </div>
          <p style="color: #64748b; font-size: 0.82rem;">StudyCzechBridge Super Admin Command Center</p>
        </div>
      `;

      resultAdmin = await sendEmail({
        to: notifyAdminTarget,
        subject: adminSubject,
        text: adminText,
        html: adminHtml,
        type: 'admission_update_admin'
      });
    }
  }

  res.json({ ok: true, userAlert: resultUser, adminAlert: resultAdmin });
});

// Route: Counselor Assignment Notification
app.post('/api/notify-counselor-assigned', async (req, res) => {
  const { studentEmail, studentName, counselorName, counselorEmail, counselorPhone } = req.body;

  let resultStudent = null;
  let resultCounselor = null;

  const timeStr = new Date().toLocaleString();

  // 1. Send Email to Student
  if (studentEmail) {
    const subject = `🎓 Your Dedicated StudyCzechBridge Counselor Has Been Assigned: ${counselorName || 'Counselor'}`;
    const text = `Dear ${studentName || 'Student'},\n\nGreat news! Your application to study in the Czech Republic is moving forward.\n\n${counselorName || 'An expert counselor'} (${counselorEmail || ''}) has been assigned as your personal study counselor in Brno.\n\nYour counselor will assist you with university admissions, document sworn translation, nostrification, entrance exam preparation, and embassy visa scheduling.\n\nLog in to your portal to communicate with your counselor.\n\nBest regards,\nStudyCzechBridge Admissions Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <div style="background: #14315e; color: #ffffff; padding: 18px 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 1.35rem;">🇨🇿 Counselor Assigned to Your Application</h2>
        </div>
        <div style="padding: 20px 0;">
          <p style="color: #334155; font-size: 1rem;">Dear <strong>${studentName || 'Student'}</strong>,</p>
          <p style="color: #334155; line-height: 1.5;">We are pleased to inform you that a dedicated admissions counselor in Brno, Czech Republic has been assigned to support your European study journey!</p>
          
          <div style="background: #f0f7ff; border: 1px solid #bae6fd; padding: 16px; border-radius: 8px; margin: 18px 0;">
            <div style="font-weight: bold; color: #14315e; font-size: 1.1rem; margin-bottom: 6px;">👤 Assigned Counselor: ${counselorName || 'Brno Staff Counselor'}</div>
            <div style="color: #0369a1; font-size: 0.95rem;">📧 Email: <a href="mailto:${counselorEmail}" style="color:#0284c7;">${counselorEmail || 'counselor@studywithczechbridge.com'}</a></div>
            ${counselorPhone ? `<div style="color: #0369a1; font-size: 0.95rem; margin-top: 4px;">📞 Phone / WhatsApp: ${counselorPhone}</div>` : ''}
            <div style="margin-top: 10px; font-size: 0.88rem; color: #334155; border-top: 1px solid #e0f2fe; padding-top: 8px;">
              📍 Location: Brno Admissions Headquarters, Czech Republic
            </div>
          </div>

          <p style="color: #334155;">Your counselor will oversee your 20-step university admission and visa roadmap.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="/dashboard.html" style="background: #14315e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Open Student Dashboard →</a>
          </div>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 0.8rem;">
          StudyCzechBridge · Veveří, Brno, Czech Republic · ${emailConfig.fromEmail}
        </div>
      </div>
    `;

    resultStudent = await sendEmail({
      to: studentEmail,
      subject,
      text,
      html,
      type: 'counselor_assigned_student'
    });
  }

  // 2. Send Email to Counselor (if email provided)
  if (counselorEmail) {
    const cSubject = `📌 New Student Assigned to You: ${studentName || 'Student'}`;
    const cText = `Hello ${counselorName || 'Counselor'},\n\nYou have been assigned as the counselor for ${studentName || 'Student'} (${studentEmail}).\n\nPlease log into the Super Admin panel to review their 20-step admission roadmap, verify uploaded documents, and contact the student.\n\nTimestamp: ${timeStr}`;

    const cHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px;">
        <h3 style="color: #14315e; margin-top: 0;">📌 New Student Assigned to Your Workspace</h3>
        <p style="color: #334155;">Hello <strong>${counselorName || 'Counselor'}</strong>,</p>
        <p style="color: #334155;">Super Admin has assigned student <strong>${studentName}</strong> (${studentEmail}) to you.</p>
        <div style="background: #f8fafc; padding: 12px; border-left: 4px solid #14315e; margin: 12px 0;">
          <strong>Student:</strong> ${studentName}<br>
          <strong>Email:</strong> ${studentEmail}<br>
          <strong>Assigned Date:</strong> ${timeStr}
        </div>
        <p style="color: #334155;">Log into your portal to manage their 20-step admission checklist and tasks.</p>
      </div>
    `;

    resultCounselor = await sendEmail({
      to: counselorEmail,
      subject: cSubject,
      text: cText,
      html: cHtml,
      type: 'counselor_assigned_counselor'
    });
  }

  res.json({ ok: true, studentAlert: resultStudent, counselorAlert: resultCounselor });
});

// Route: Super Admin Task Assignment Notification
app.post('/api/notify-task-assigned', async (req, res) => {
  const { toEmail, toName, taskTitle, taskDescription, dueDate, priority, assignedByName } = req.body;
  const timeStr = new Date().toLocaleString();

  let result = null;
  if (toEmail) {
    const subject = `📌 New Task Assigned to You: ${taskTitle || 'Admissions Task'}`;
    const text = `Dear ${toName || 'User'},\n\nSuper Admin (${assignedByName || 'Admissions Director'}) has assigned a new task to your account on StudyCzechBridge.\n\nTask Title: ${taskTitle}\nDescription: ${taskDescription || 'No description provided'}\nPriority: ${priority || 'Normal'}\nDue Date: ${dueDate || 'As soon as possible'}\nAssigned At: ${timeStr}\n\nPlease log into your portal to view and update task progress.\n\nBest regards,\nStudyCzechBridge Admissions Command Center\ninfo@studywithczechbridge.com`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <div style="background: #14315e; color: #ffffff; padding: 18px 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin: 0; font-size: 1.35rem;">📌 Super Admin Task Assignment</h2>
        </div>
        <div style="padding: 20px 0;">
          <p style="color: #334155; font-size: 1rem;">Dear <strong>${toName || 'User'}</strong>,</p>
          <p style="color: #334155; line-height: 1.5;">Super Admin (<strong>${assignedByName || 'Admissions Command Center'}</strong>) has assigned a new task to your workspace:</p>
          
          <div style="background: #f8fafc; border-left: 5px solid #2563eb; padding: 16px; border-radius: 6px; margin: 18px 0; border: 1px solid #e2e8f0; border-left-width: 5px;">
            <div style="font-weight: bold; color: #1e3a8a; font-size: 1.15rem; margin-bottom: 6px;">${taskTitle || 'Untitled Task'}</div>
            ${taskDescription ? `<div style="color: #475569; font-size: 0.95rem; margin-bottom: 10px;">${taskDescription}</div>` : ''}
            <div style="display: flex; gap: 15px; font-size: 0.88rem; color: #334155; border-top: 1px solid #cbd5e1; padding-top: 10px; flex-wrap: wrap;">
              <span>🚨 <strong>Priority:</strong> <span style="text-transform: capitalize; color: ${priority === 'high' ? '#dc2626' : '#2563eb'}; font-weight: bold;">${priority || 'Normal'}</span></span>
              <span>📅 <strong>Due Date:</strong> ${dueDate || 'Flexible'}</span>
            </div>
          </div>

          <p style="color: #334155;">Please complete or update status on this task in your StudyCzechBridge dashboard.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="/admin.html" style="background: #14315e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">Open Command Center →</a>
          </div>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 0.8rem;">
          StudyCzechBridge · Veveří, Brno, Czech Republic · info@studywithczechbridge.com
        </div>
      </div>
    `;

    result = await sendEmail({
      to: toEmail,
      subject,
      text,
      html,
      type: 'task_assigned'
    });
  }

  res.json({ ok: true, alert: result });
});

// Route: GSTU Seminar Registration Confirmation Notification
app.post('/api/notify-seminar-registered', async (req, res) => {
  const { email, fullName, phone, ticketCode, freeDrinkChoice } = req.body;
  const timeStr = new Date().toLocaleString();
  const code = ticketCode || `GSTU-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  if (!email) {
    return res.status(400).json({ ok: false, error: "Email is required" });
  }

  const subject = `🎓 Registration Confirmed: Higher Education in Europe Seminar @ GSTU [Pass: ${code}]`;
  const text = `Dear ${fullName || 'Student'},\n\nCongratulations! Your registration for the Special Seminar on Higher Education in Europe & European Life at Gopalganj Science and Technology University (GSTU) has been confirmed.\n\nEVENT DETAILS:\n- Event: Higher Education in Europe, Schengen Opportunities & European Life\n- Date: 13 September 2026\n- Time: 15:00 – 18:00 BST (03:00 PM – 06:00 PM)\n- Venue: Central Auditorium / Seminar Hall, GSTU, Gopalganj\n- Your Seminar Pass / Ticket Code: ${code}\n- Registered Phone: ${phone || 'N/A'}\n- Complimentary Drink Voucher: Included for all registered attendees (Claim at the refreshment counter)\n\nSEMINAR AGENDA & HIGHLIGHTS:\n1. Tuition-free & low-cost English-taught degrees in Czech Republic, Germany & Poland (€0 – €2,500/year)\n2. 20-Step direct admission, document legalization & university nostrification guide\n3. Schengen post-study work visas, part-time work rights (20 hrs/week) and European job market\n4. Direct live interactive Q&A with counselors in Brno, Czech Republic\n\nIf you have any questions before the event, reach out to us at info@studywithczechbridge.com or WhatsApp +420 608 147 604.\n\nWe look forward to meeting you on 13 September at GSTU!\n\nBest regards,\nStudyCzechBridge Admissions Team\nVeveří, Brno, Czech Republic\ninfo@studywithczechbridge.com\nhttps://studywithczechbridge.com`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 24px 20px; border-radius: 10px 10px 0 0; text-align: center;">
        <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #bae6fd; margin-bottom: 6px;">Official Event Pass &amp; Confirmation</div>
        <h1 style="margin: 0; font-size: 1.45rem; font-weight: 800; color: #ffffff; line-height: 1.3;">🎓 GSTU Special Campus Seminar</h1>
        <p style="margin: 6px 0 0 0; font-size: 0.92rem; color: #e0f2fe;">Higher Education in Europe &amp; European Life</p>
      </div>

      <div style="padding: 22px 4px;">
        <p style="color: #334155; font-size: 1.05rem; margin-top: 0;">Dear <strong>${fullName || 'Student'}</strong>,</p>
        <p style="color: #475569; line-height: 1.6; font-size: 0.95rem;">
          Your registration for the upcoming seminar at <strong>Gopalganj Science and Technology University (GSTU)</strong> has been successfully confirmed. Please keep this email or save your ticket code for entry.
        </p>

        <!-- Ticket Card Box -->
        <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 10px; padding: 18px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 12px;">
            <div>
              <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Attendee Name</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">${fullName || 'Registered Student'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Ticket Code</div>
              <div style="font-size: 1.25rem; font-weight: 800; font-family: monospace; color: #0284c7;">${code}</div>
            </div>
          </div>

          <table style="width: 100%; font-size: 0.9rem; border-collapse: collapse; line-height: 1.6;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; width: 35%;"><strong>🗓️ Date:</strong></td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">13 September 2026</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>🕒 Time:</strong></td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">15:00 – 18:00 BST (03:00 PM – 06:00 PM)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>📍 Venue:</strong></td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">Central Auditorium / Seminar Hall, GSTU, Gopalganj</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>📞 Contact:</strong></td>
              <td style="padding: 4px 0; color: #0f172a;">${phone || 'Provided during registration'}</td>
            </tr>
          </table>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; margin-top: 14px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="color: #065f46; font-weight: 800; font-size: 0.88rem;">🥤 Complimentary Free Drink Voucher Included</div>
              <div style="color: #047857; font-size: 0.78rem;">Show this pass at the counter to claim your chilled beverage during the event.</div>
            </div>
            <span style="background: #10b981; color: #ffffff; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 999px;">PASS ACTIVE</span>
          </div>
        </div>

        <!-- Key Session Highlights -->
        <h3 style="color: #0f172a; font-size: 1.05rem; margin: 20px 0 10px 0;">✨ What You Will Discover:</h3>
        <ul style="color: #475569; font-size: 0.9rem; line-height: 1.6; padding-left: 20px; margin: 0 0 20px 0;">
          <li><strong>Tuition-free &amp; Low-cost English Degrees:</strong> Explore Bachelor's and Master's programs across Czech Republic, Germany, and Poland (€0 to €2,500/year).</li>
          <li><strong>20-Step Direct Admissions &amp; Legalization:</strong> Complete roadmap for degree recognition (Nostrification), superlegalization, and visa preparation.</li>
          <li><strong>European Life &amp; Career Pathways:</strong> Living costs (€450–€600/month), 20-hour weekly part-time work rights, and post-graduation Schengen work permits.</li>
          <li><strong>Direct Interactive Q&amp;A:</strong> Personalized answers from advisors living in Brno, Czech Republic.</li>
        </ul>

        <div style="text-align: center; margin: 26px 0;">
          <a href="https://wa.me/420608147604?text=Hello%20CzechBridge%20team%2C%20I%20registered%20for%20the%20GSTU%20seminar%20(Pass%3A%20${encodeURIComponent(code)})" style="background: #25D366; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 800; font-size: 0.92rem; display: inline-block; box-shadow: 0 4px 10px rgba(37,211,102,0.3);">
            💬 Join Seminar WhatsApp Group &amp; Connect →
          </a>
        </div>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 0.8rem; line-height: 1.5;">
        StudyCzechBridge · Veveří, Brno, Czech Republic<br>
        Email: <a href="mailto:info@studywithczechbridge.com" style="color: #0284c7; text-decoration: none;">info@studywithczechbridge.com</a> · Support WhatsApp: +420 608 147 604
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: email,
    subject,
    text,
    html,
    type: 'seminar_registration'
  });

  res.json({
    ok: true,
    message: `Seminar confirmation email dispatched to ${email}`,
    ticketCode: code,
    details: result
  });
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

