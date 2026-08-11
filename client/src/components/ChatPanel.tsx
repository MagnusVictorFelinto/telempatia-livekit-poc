import { FormEvent, useState } from "react";
import type { ChatMessage } from "../lib/types";
import { ROLE_LABELS } from "../lib/types";

interface ChatHeader {
  initials: string;
  title: string;
  subtitle?: string;
}

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  header?: ChatHeader;
}

export default function ChatPanel({ messages, onSend, header }: Props) {
  const [text, setText] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <div className="chat-panel">
      {header && (
        <div className="chat-header">
          <div className="chat-header-avatar">{header.initials}</div>
          <div>
            <div className="chat-header-title">{header.title}</div>
            {header.subtitle && <div className="chat-header-subtitle">{header.subtitle}</div>}
          </div>
        </div>
      )}
      <div className="chat-messages">
        {messages.length === 0 && (
          <p style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
            Nenhuma mensagem ainda. O histórico não é salvo — some ao sair da sala.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-message ${m.self ? "self" : ""}`}>
            <span className="meta">
              {m.senderName} · {ROLE_LABELS[m.role]}
            </span>
            {m.text}
          </div>
        ))}
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem..."
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}
