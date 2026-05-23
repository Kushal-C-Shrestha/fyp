import fs from "fs";
import handlebars from "handlebars";

const source = fs.readFileSync("otp.hbs", "utf8");
const template = handlebars.compile(source);

const data = {
  appName: "e-Swasthya",
  title: "Verify your email",
  recipientName: "there",
  message: "Use the verification code below to complete your account registration.",
  otpCode: "123456",
  expiresIn: "5 minutes",
  purpose: "Email Verification",
};

const result = template(data);

fs.writeFileSync("preview.html", result);

console.log("Preview generated: open preview.html");
