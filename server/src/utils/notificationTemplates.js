import { renderEmailTemplate } from "./emailTemplate.js";

const APP_NAME = String(process.env.APP_NAME || "e-Swasthya").trim() || "e-Swasthya";

const TEMPLATE_DEFINITIONS = Object.freeze({
  patientAppointmentConfirmed: {
    subjectTemplateName: "notifications/patientAppointmentConfirmed/subject.txt",
    titleTemplateName: "notifications/patientAppointmentConfirmed/title.txt",
    detailTemplateName: "notifications/patientAppointmentConfirmed/detail.txt",
    emailTemplateName: "email/appointmentConfirmed.hbs",
    defaultActionText: "View appointment",
  },
  appointmentReminder: {
    subjectTemplateName: "notifications/appointmentReminder/subject.txt",
    titleTemplateName: "notifications/appointmentReminder/title.txt",
    detailTemplateName: "notifications/appointmentReminder/detail.txt",
    defaultActionText: "Open schedule",
  },
  newAppointmentBooked: {
    subjectTemplateName: "notifications/newAppointmentBooked/subject.txt",
    titleTemplateName: "notifications/newAppointmentBooked/title.txt",
    detailTemplateName: "notifications/newAppointmentBooked/detail.txt",
    defaultActionText: "Review appointments",
  },
  appointmentRescheduled: {
    subjectTemplateName: "notifications/appointmentRescheduled/subject.txt",
    titleTemplateName: "notifications/appointmentRescheduled/title.txt",
    detailTemplateName: "notifications/appointmentRescheduled/detail.txt",
    defaultActionText: "View appointment",
  },
  appointmentCancelled: {
    subjectTemplateName: "notifications/appointmentCancelled/subject.txt",
    titleTemplateName: "notifications/appointmentCancelled/title.txt",
    detailTemplateName: "notifications/appointmentCancelled/detail.txt",
    defaultActionText: "View appointment",
  },
  appointmentCompleted: {
    subjectTemplateName: "notifications/appointmentCompleted/subject.txt",
    titleTemplateName: "notifications/appointmentCompleted/title.txt",
    detailTemplateName: "notifications/appointmentCompleted/detail.txt",
    defaultActionText: "Open appointment history",
  },
  blogSubmitted: {
    subjectTemplateName: "notifications/blogSubmitted/subject.txt",
    titleTemplateName: "notifications/blogSubmitted/title.txt",
    detailTemplateName: "notifications/blogSubmitted/detail.txt",
    defaultActionText: "Review blogs",
  },
  blogApproved: {
    subjectTemplateName: "notifications/blogApproved/subject.txt",
    titleTemplateName: "notifications/blogApproved/title.txt",
    detailTemplateName: "notifications/blogApproved/detail.txt",
    defaultActionText: "Open blog workspace",
  },
  blogRejected: {
    subjectTemplateName: "notifications/blogRejected/subject.txt",
    titleTemplateName: "notifications/blogRejected/title.txt",
    detailTemplateName: "notifications/blogRejected/detail.txt",
    defaultActionText: "Edit blog",
  },
  systemAnnouncement: {
    subjectTemplateName: "notifications/systemAnnouncement/subject.txt",
    titleTemplateName: "notifications/systemAnnouncement/title.txt",
    detailTemplateName: "notifications/systemAnnouncement/detail.txt",
    defaultActionText: "Open dashboard",
  },
});

const normalizeInlineText = (value = "") =>
  String(value || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

const normalizeFreeText = (value = "") => String(value || "").trim();

const renderTemplateValue = async (templateName = "", context = {}) => {
  if (!templateName) return "";
  const rendered = await renderEmailTemplate({ templateName, context });
  return normalizeInlineText(rendered);
};

export const resolveNotificationTemplate = (templateKey = "") => {
  const normalizedKey = normalizeFreeText(templateKey);
  const definition = TEMPLATE_DEFINITIONS[normalizedKey];
  if (!definition) {
    const error = new Error(`Unknown notification template "${templateKey}".`);
    error.status = 400;
    throw error;
  }
  return definition;
};

export const buildNotificationTemplate = async ({
  templateKey,
  context = {},
  overrides = {},
} = {}) => {
  const definition = resolveNotificationTemplate(templateKey);
  const [subjectFromTemplate, titleFromTemplate, detailFromTemplate] = await Promise.all([
    renderTemplateValue(definition.subjectTemplateName, context),
    renderTemplateValue(definition.titleTemplateName, context),
    renderTemplateValue(definition.detailTemplateName, context),
  ]);

  const title = normalizeFreeText(overrides.title) || titleFromTemplate || subjectFromTemplate || "Notification";
  const detail = normalizeFreeText(overrides.detail) || detailFromTemplate || "";
  const emailSubject = normalizeFreeText(overrides.subject) || subjectFromTemplate || title;
  const actionText = normalizeFreeText(overrides.actionText) || definition.defaultActionText || "";
  const actionUrl = normalizeFreeText(overrides.actionUrl);

  return {
    templateKey: normalizeFreeText(templateKey),
    title,
    detail,
    emailSubject,
    actionText,
    actionUrl,
    emailTemplateName: definition.emailTemplateName || "email/notification.hbs",
    emailContext: {
      ...context,
      appName: normalizeFreeText(context?.appName) || APP_NAME,
      year: context?.year || new Date().getFullYear(),
      title,
      message: detail,
      actionText,
      actionUrl,
    },
  };
};
