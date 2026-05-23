import React, { useEffect, useRef } from "react";
import { MessageSquareText, Paperclip, Send, X } from "lucide-react";

const AppointmentChatPanel = ({
  messages = [],
  loading = false,
  canSend = false,
  draft = "",
  onDraftChange = null,
  onSend = null,
  emptyMessage = "No messages yet for this appointment.",
  placeholder = "Type a message...",
  disabledPlaceholder = "Chat unavailable right now",
  title = "Appointment Chat",
  className = "",
  heightClassName = "h-[360px]",
  embedded = false,
  showComposer = true,
  selectedAttachment = null,
  onAttachmentChange = null,
  onAttachmentClear = null,
  onOpenAttachment = null,
  attachmentAccept = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip",
}) => {
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const normalizedMessages = Array.isArray(messages) ? messages : [];
  const composerEnabled = showComposer && typeof onDraftChange === "function" && typeof onSend === "function";
  const attachmentEnabled = composerEnabled && typeof onAttachmentChange === "function";
  const hasSelectedAttachment = Boolean(selectedAttachment?.name || selectedAttachment?.fileName);
  const canSubmit = Boolean(String(draft || "").trim() || hasSelectedAttachment);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [normalizedMessages.length, loading]);

  return (
    <div
      className={[
        embedded
          ? "flex flex-col overflow-hidden border-t border-slate-100 bg-white"
          : "flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white",
        heightClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title ? (
        <div className={embedded ? "px-0 py-3" : "border-b border-slate-200 px-4 py-3"}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquareText className="h-4 w-4 text-sky-600" />
            {title}
          </h3>
        </div>
      ) : null}

      <div ref={scrollContainerRef} className={embedded ? "flex-1 overflow-y-auto py-3" : "flex-1 overflow-y-auto bg-slate-50/80 px-3 py-3"}>
        {loading ? (
          <p className="text-sm text-slate-500">Loading chat...</p>
        ) : normalizedMessages.length > 0 ? (
          <div className="space-y-2.5">
            {normalizedMessages.map((msg) => {
              const isOwn = Boolean(msg?.isOwn);
              const senderLabel = msg?.senderLabel || msg?.sender || (isOwn ? "You" : "Participant");
              const attachment = msg?.attachment || null;
              const hasAttachment = Boolean(attachment?.fileName);

              return (
                <div
                  key={msg?.id || `${senderLabel}-${msg?.time || "time"}`}
                  className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm ${
                    isOwn
                      ? "ml-auto rounded-br-md bg-emerald-50 text-slate-800 ring-1 ring-inset ring-emerald-100"
                      : "rounded-bl-md bg-slate-100 text-slate-700"
                  }`}
                >
                  {!isOwn ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {senderLabel}
                    </p>
                  ) : null}
                  {msg?.text ? <p className="mt-1 whitespace-pre-wrap break-words">{msg.text}</p> : null}
                  {hasAttachment ? (
                    typeof onOpenAttachment === "function" && attachment?.viewPath ? (
                      <button
                        type="button"
                        onClick={() => onOpenAttachment(msg)}
                        className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium ${
                          isOwn
                            ? "bg-emerald-100/70 text-emerald-800 hover:bg-emerald-100"
                            : "bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        title={attachment.fileName}
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{attachment.fileName}</span>
                      </button>
                    ) : (
                      <div
                        className={`mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium ${
                          isOwn
                            ? "bg-emerald-100/70 text-emerald-800"
                            : "bg-white text-slate-700"
                        }`}
                        title={attachment.fileName}
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{attachment.fileName}</span>
                      </div>
                    )
                  ) : null}
                  <p className={`mt-1.5 text-[11px] ${isOwn ? "text-emerald-700/70" : "text-slate-500"}`}>{msg?.time || ""}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        )}
      </div>

      {composerEnabled ? (
        <div className={embedded ? "border-t border-slate-100 py-3" : "border-t border-slate-200 p-3"}>
          <div
            className={`flex items-center gap-2 rounded-xl px-2 py-2 ${
              canSend ? "bg-slate-50" : "bg-slate-100"
            }`}
          >
            {attachmentEnabled ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={attachmentAccept}
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null;
                    onAttachmentChange(nextFile);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canSend}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </>
            ) : null}
            <input
              type="text"
              placeholder={canSend ? placeholder : disabledPlaceholder}
              className="w-full bg-transparent text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              disabled={!canSend}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSend();
                }
              }}
            />
            <button
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              onClick={onSend}
              disabled={!canSend || !canSubmit}
              title="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {hasSelectedAttachment ? (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{selectedAttachment?.name || selectedAttachment?.fileName}</span>
              </div>
              {typeof onAttachmentClear === "function" ? (
                <button
                  type="button"
                  onClick={onAttachmentClear}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default AppointmentChatPanel;
