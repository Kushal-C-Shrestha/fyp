import { sendEmail } from "../utils/mailer.util.js";


const buildEmailContentByPurpose = ({ purpose }) => {
  if (purpose === "reset-password") {
    return {
      subject: "Password Reset OTP",
      title: "Reset your password",
      purposeLabel: "Password Reset",
      message: "Use the verification code below to continue resetting your password."
    };
  }

  if (purpose === "registration") {
    return {
      subject: "Email Verification OTP",
      title: "Verify your email",
      purposeLabel: "Email Verification",
      message: "Use the verification code below to complete your account registration."
    };
  }

  if (purpose === "approval") {
    return {
      subject: "Account Approved - e-Swasthya",
      title: "Welcome to e-Swasthya",
      purposeLabel: "Approval",
      message: "Congratulations! Your account has been reviewed and approved by our medical board. You can now access your dashboard and start using our platform."
    };
  }

  if (purpose === "rejection") {
    return {
      subject: "Registration Update - e-Swasthya",
      title: "Registration Request Status",
      purposeLabel: "Rejection",
      message: "Thank you for your interest in e-Swasthya. After careful review, our medical board has decided to reject your hospital registration request at this time. If you believe this was in error or wish to submit additional details, please contact our support team."
    };
  }
};

export const sendOtpEmail = async ({ to, otp, expiresIn, purpose }) => {
  if (!to || !otp) {
    throw new Error("Missing required fields: to and otp");
  }

  const emailContent = buildEmailContentByPurpose({ purpose });

  await sendEmail({
    to,
    subject: emailContent.subject,
    template: "otp",
    context: {
      appName: process.env.SMTP_FROM,
      title: emailContent.title,
      recipientName: "there",
      message: emailContent.message,
      otpCode: otp,
      expiresIn: expiresIn,
      purpose: emailContent.purposeLabel,
    },
  });
};

export const sendApprovalEmail = async ({ to, name }) => {
  if (!to) return;

  const emailContent = buildEmailContentByPurpose({ purpose: "approval" });

  await sendEmail({
    to,
    subject: emailContent.subject,
    template: "notification",
    context: {
      appName: "e-Swasthya",
      title: emailContent.title,
      recipientName: name || "there",
      message: emailContent.message,
    },
  });
};

export const sendRejectionEmail = async ({ to, name, reason }) => {
  if (!to) return;

  const emailContent = buildEmailContentByPurpose({ purpose: "rejection" });
  let message = emailContent.message;
  if (reason) {
    message += `\n\nReason for rejection:\n${reason}`;
  }

  await sendEmail({
    to,
    subject: emailContent.subject,
    template: "notification",
    context: {
      appName: "e-Swasthya",
      title: emailContent.title,
      recipientName: name || "there",
      message: message,
    },
  });
};
