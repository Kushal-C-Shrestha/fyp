import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import { transporter } from "../config/mailer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


transporter.use('compile', hbs({
  viewEngine: {
    extname: '.hbs',
    defaultLayout: false,
  },
  viewPath: path.join(__dirname, '../templates/email/'),
  extName: '.hbs',
}));

export const sendEmail = async ({ to, subject, template, context }) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    template: template,
    context,
  });
};
