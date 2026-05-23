import React, { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";
import { createSocket } from "../../lib/socket";
import { formatMessageTime } from "../../utils/dateTime";
import { getAppointmentChatAttachmentViewPath, openProtectedFile } from "../../utils/fileAccess";
import { getSafeErrorMessage } from "../../utils/errorMessages";
import AppointmentChatPanel from "../AppointmentChatPanel";

const AppointmentChat = ({
  appointmentId,
  participantName = "",
  participantFallback = "Participant",
  canSend = true,
  heightClassName = "h-80",
  className = "",
  emptyMessage = "No messages yet for this appointment.",
}) => {
  const { accessToken, user } = useAuth();
  const currentUserId = user?.id ?? user?.user_id ?? null;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState("");

  const mapMessage = useCallback(
    (message) => {
      const senderId = Number(message?.sender_id);
      const userId = Number(currentUserId);
      const isOwn = Number.isInteger(senderId) && Number.isInteger(userId) && senderId === userId;
      const fileName =
        message?.attachment_file_name ||
        message?.attachment_name ||
        message?.attachmentFileName ||
        message?.attachment_url ||
        "";
      const viewPath =
        message?.attachment_view_path ||
        message?.attachmentViewPath ||
        (fileName && message?.id ? getAppointmentChatAttachmentViewPath(message.id) : "");

      return {
        id: message?.id ?? `${Date.now()}`,
        senderLabel: isOwn ? "You" : message?.sender_name || participantName || participantFallback,
        text: message?.message || "",
        attachment: fileName ? { fileName, viewPath } : null,
        time: formatMessageTime(message?.created_at),
        isOwn,
      };
    },
    [currentUserId, participantFallback, participantName],
  );

  const mergeMessage = useCallback((previousMessages, nextMessage) => {
    if (!nextMessage?.id) return previousMessages;
    if (previousMessages.some((message) => String(message.id) === String(nextMessage.id))) {
      return previousMessages;
    }
    return [...previousMessages, nextMessage];
  }, []);

  useEffect(() => {
    if (!appointmentId || !accessToken) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    api
      .get(`/video-call/chat/${appointmentId}`)
      .then(({ data }) => {
        if (!active) return;
        const nextMessages = Array.isArray(data?.messages) ? data.messages.map(mapMessage) : [];
        setMessages(nextMessages);
      })
      .catch(() => {
        if (active) setError("Failed to load appointment chat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const socket = createSocket();
    socket.on("connect", () => socket.emit("join-appointment-room", { appointmentId, token: accessToken }));
    socket.on("appointment-chat-message", (payload = {}) => {
      if (Number(payload?.appointment_id) !== Number(appointmentId) || !payload?.message || !active) return;
      setMessages((previousMessages) => mergeMessage(previousMessages, mapMessage(payload.message)));
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [accessToken, appointmentId, mapMessage, mergeMessage]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!canSend || (!text && !attachment)) return;

    try {
      setError("");
      const payload = new FormData();
      if (text) payload.append("message", text);
      if (attachment instanceof File) payload.append("attachment", attachment);

      const { data } = await api.post(`/video-call/chat/${appointmentId}`, payload);
      setMessages((previousMessages) => mergeMessage(previousMessages, mapMessage(data?.message)));
      setDraft("");
      setAttachment(null);
    } catch (err) {
      setError(getSafeErrorMessage(err, "Failed to send message."));
    }
  };

  const openAttachment = async (message) => {
    try {
      setError("");
      const nextAttachment = message?.attachment;
      if (!nextAttachment?.viewPath) throw new Error("Cannot open this file.");
      await openProtectedFile(nextAttachment.viewPath, nextAttachment.fileName || "attachment");
    } catch (err) {
      setError(getSafeErrorMessage(err, "Failed to open attachment."));
    }
  };

  return (
    <div className="space-y-2">
      <AppointmentChatPanel
        messages={messages}
        loading={loading}
        canSend={canSend}
        draft={draft}
        onDraftChange={setDraft}
        onSend={sendMessage}
        selectedAttachment={attachment}
        onAttachmentChange={setAttachment}
        onAttachmentClear={() => setAttachment(null)}
        onOpenAttachment={openAttachment}
        heightClassName={heightClassName}
        className={className}
        emptyMessage={emptyMessage}
      />
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
};

export default AppointmentChat;
