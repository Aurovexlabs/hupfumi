import { Spinner } from "@/components/common/LoadingScreen";
import { useConversations, useMessages, useSendMessage } from "@/hooks/useApi";
import { connectSocket, getSocket } from "@/lib/socket";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCheck,
  MessageSquare,
  MoreVertical,
  Search,
  Send,
  Smile,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { data: convosData, isLoading: convosLoading } = useConversations();
  const convos: any[] = Array.isArray(convosData) ? convosData : [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const qc = useQueryClient();
  const sendMessageMutation = useSendMessage();

  const { data: msgData, isLoading: msgsLoading } = useMessages(activeId ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromQuery = new URLSearchParams(window.location.search).get(
      "conversation",
    );

    if (fromQuery) {
      setActiveId(fromQuery);
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(msgData)) {
      setMessages(msgData);
      return;
    }
    setMessages([]);
  }, [msgData]);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();
    const onNew = (msg: any) => {
      if (msg.conversation === activeId) {
        setMessages((prev) =>
          prev.some((m) => m._id === msg._id) ? prev : [...prev, msg],
        );
        socket.emit("messages:read", { conversationId: activeId });
      }
      qc.invalidateQueries({ queryKey: ["conversations"] });
    };
    const onTypingStart = ({ conversationId, userId }: any) => {
      if (conversationId === activeId && userId !== user?._id) setTyping(true);
    };
    const onTypingStop = ({ conversationId, userId }: any) => {
      if (conversationId === activeId && userId !== user?._id) setTyping(false);
    };
    socket.on("message:new", onNew);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    return () => {
      socket.off("message:new", onNew);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
    };
  }, [activeId, user?._id, qc]);

  useEffect(() => {
    if (!activeId) return;
    const socket = getSocket();
    socket.emit("conversation:join", { conversationId: activeId });
    socket.emit("messages:read", { conversationId: activeId });
    return () => {
      socket.emit("conversation:leave", { conversationId: activeId });
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleTyping = useCallback(
    (val: string) => {
      setText(val);
      if (!activeId) return;
      const socket = getSocket();
      socket.emit("typing:start", { conversationId: activeId });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(
        () => socket.emit("typing:stop", { conversationId: activeId }),
        1500,
      );
    },
    [activeId],
  );

  const handleSend = useCallback(async () => {
    const t = text.trim();
    if (!t || !activeId || sending) return;
    setSending(true);
    setText("");
    try {
      const sent = await sendMessageMutation.mutateAsync({
        conversationId: activeId,
        text: t,
      });

      if (sent?._id) {
        setMessages((prev) =>
          prev.some((msg) => msg._id === sent._id) ? prev : [...prev, sent],
        );
      }

      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [text, activeId, sending, sendMessageMutation, qc]);

  const activeConvo = convos.find((c) => c._id === activeId);
  const otherPerson = activeConvo?.participants?.find(
    (p: any) => p._id !== user?._id,
  );
  const filteredConvos = search
    ? convos.filter((c) =>
        c.participants
          ?.find((p: any) => p._id !== user?._id)
          ?.fullName?.toLowerCase()
          .includes(search.toLowerCase()),
      )
    : convos;

  return (
    <div className="flex h-[calc(100dvh-4rem)] bg-surface-0 dark:bg-dark-bg">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col w-full sm:w-80 lg:w-96 shrink-0 border-r border-surface-200 dark:border-dark-border bg-surface-0 dark:bg-dark-surface",
          activeId ? "hidden sm:flex" : "flex",
        )}
      >
        <div className="px-5 py-4 border-b border-surface-200 dark:border-dark-border">
          <h1 className="font-display font-bold text-xl text-brand-navy dark:text-white mb-4">
            Messages
          </h1>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            />
            <input
              className="input pl-9 text-sm"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convosLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size={22} className="text-brand-orange" />
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-surface-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare
                  size={28}
                  className="text-text-tertiary dark:text-slate-500"
                />
              </div>
              <p className="font-semibold text-text-primary dark:text-white text-sm">
                {search ? "No results" : "No conversations"}
              </p>
              <p className="text-text-tertiary dark:text-slate-500 text-xs mt-1">
                {search
                  ? "Try another search"
                  : "Message a seller from their profile"}
              </p>
            </div>
          ) : (
            filteredConvos.map((convo: any) => {
              const other = convo.participants?.find(
                (p: any) => p._id !== user?._id,
              );
              const unread = convo.unreadCounts?.[user?._id ?? ""] ?? 0;
              const isActive = activeId === convo._id;
              return (
                <button
                  key={convo._id}
                  type="button"
                  onClick={() => setActiveId(convo._id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-surface-50 dark:border-dark-border",
                    isActive
                      ? "bg-brand-orange-50 dark:bg-brand-orange/10 border-l-2 border-l-brand-orange"
                      : "hover:bg-surface-50 dark:hover:bg-dark-hover",
                  )}
                >
                  <div className="relative shrink-0">
                    {other?.avatar ? (
                      <img
                        src={other.avatar}
                        alt=""
                        className="avatar w-11 h-11"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-brand-navy text-white text-sm font-bold flex items-center justify-center">
                        {getInitials(other?.fullName ?? "U")}
                      </div>
                    )}
                    {other?.availabilityStatus === "available" && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-brand-green border-2 border-surface-0 dark:border-dark-surface rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p
                        className={cn(
                          "text-sm truncate",
                          unread > 0
                            ? "font-bold text-text-primary dark:text-white"
                            : "font-semibold text-text-primary dark:text-white",
                        )}
                      >
                        {other?.fullName ?? "Unknown"}
                      </p>
                      {convo.lastMessageAt && (
                        <span className="text-[11px] text-text-tertiary dark:text-slate-500 shrink-0">
                          {formatRelativeTime(convo.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs truncate",
                          unread > 0
                            ? "text-text-secondary dark:text-slate-300 font-medium"
                            : "text-text-tertiary dark:text-slate-500",
                        )}
                      >
                        {convo.lastMessagePreview ?? "No messages"}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 min-w-4.5 h-4.5 bg-brand-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Chat pane */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          !activeId ? "hidden sm:flex" : "flex",
        )}
      >
        {!activeId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-surface-100 dark:bg-dark-card rounded-3xl flex items-center justify-center mb-6">
              <MessageSquare
                size={40}
                className="text-text-tertiary dark:text-slate-500"
              />
            </div>
            <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
              Your messages
            </h2>
            <p className="text-text-secondary dark:text-slate-400 text-sm max-w-xs">
              Select a conversation or visit a seller's profile to start one.
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-surface-200 dark:border-dark-border bg-surface-0 dark:bg-dark-surface shrink-0">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="sm:hidden btn-icon mr-1"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="relative shrink-0">
                {otherPerson?.avatar ? (
                  <img
                    src={otherPerson.avatar}
                    alt=""
                    className="avatar w-10 h-10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-navy text-white text-sm font-bold flex items-center justify-center">
                    {getInitials(otherPerson?.fullName ?? "U")}
                  </div>
                )}
                {otherPerson?.availabilityStatus === "available" && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-brand-green border-2 border-surface-0 dark:border-dark-surface rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-text-primary dark:text-white truncate">
                  {otherPerson?.fullName ?? "Unknown"}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    otherPerson?.availabilityStatus === "available"
                      ? "text-brand-green"
                      : "text-text-tertiary dark:text-slate-500",
                  )}
                >
                  {typing ? (
                    <span className="italic">typing…</span>
                  ) : otherPerson?.availabilityStatus === "available" ? (
                    "Online"
                  ) : (
                    "Offline"
                  )}
                </p>
              </div>
              <button type="button" className="btn-icon shrink-0">
                <MoreVertical size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-surface-50 dark:bg-dark-bg">
              {msgsLoading ? (
                <div className="flex justify-center pt-12">
                  <Spinner size={22} className="text-brand-orange" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    Say hello!
                  </p>
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                    Start the conversation with{" "}
                    {otherPerson?.fullName?.split(" ")[0] ?? "them"}
                  </p>
                </div>
              ) : (
                messages.map((msg: any, idx: number) => {
                  const isMe = (msg.sender?._id ?? msg.sender) === user?._id;
                  return (
                    <div
                      key={msg._id}
                      className={cn(
                        "flex items-end gap-2",
                        isMe ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-brand-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-4">
                          {getInitials(msg.sender?.fullName ?? "U")}
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex flex-col gap-1",
                          isMe ? "items-end" : "items-start",
                        )}
                      >
                        <div
                          className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm max-w-[min(340px,75vw)] leading-relaxed",
                            isMe
                              ? "bg-brand-orange text-white rounded-br-sm shadow-orange"
                              : "bg-surface-0 dark:bg-dark-card text-text-primary dark:text-white shadow-xs rounded-bl-sm",
                            msg.isDeleted && "opacity-50 italic",
                          )}
                        >
                          {msg.isDeleted ? "Message deleted" : msg.text}
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            isMe && "flex-row-reverse",
                          )}
                        >
                          <span className="text-[10px] text-text-tertiary dark:text-slate-500">
                            {formatRelativeTime(msg.createdAt)}
                          </span>
                          {isMe && (
                            <CheckCheck
                              size={11}
                              className="text-text-tertiary dark:text-slate-500"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {typing && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {getInitials(otherPerson?.fullName ?? "U")}
                  </div>
                  <div className="bg-surface-0 dark:bg-dark-card px-4 py-3 rounded-2xl rounded-bl-sm shadow-xs">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-text-tertiary dark:bg-slate-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3.5 border-t border-surface-200 dark:border-dark-border bg-surface-0 dark:bg-dark-surface shrink-0">
              <div className="flex items-center gap-2">
                <button type="button" className="btn-icon shrink-0">
                  <Smile size={18} />
                </button>
                <div className="flex-1 flex items-center bg-surface-50 dark:bg-dark-card rounded-2xl px-4 py-2 border border-surface-200 dark:border-dark-border focus-within:border-brand-orange transition-colors">
                  <input
                    ref={inputRef}
                    className="flex-1 bg-transparent text-sm outline-none text-text-primary dark:text-white placeholder:text-text-tertiary dark:placeholder:text-slate-500"
                    placeholder={`Message ${otherPerson?.fullName?.split(" ")[0] ?? "them"}…`}
                    value={text}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                    text.trim()
                      ? "bg-brand-orange hover:bg-brand-orange-600 text-white shadow-orange"
                      : "bg-surface-200 dark:bg-dark-border text-text-disabled dark:text-slate-600 cursor-not-allowed",
                  )}
                >
                  {sending ? (
                    <Spinner size={14} className="text-white" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
