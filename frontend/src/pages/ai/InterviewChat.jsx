import React, { useState } from "react";
import { aiApi } from "@/api/aiApi";
import ChatMessage from "@/pages/ai/ChatMessage";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";

/**
 * Interview Chat Core UI
 * Backend: POST /api/ai/chat/interview
 */

const InterviewChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.chatInterview({
        message: input
      });

      const aiMsg = {
        role: "ai",
        text: res.data.reply,
        follow_up: res.data.follow_up_questions
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
      <h2 className="font-semibold">Interview Chat</h2>

      {error && <ApiError error={{ message: error.message }} />}

      <div className="h-64 overflow-y-auto border rounded p-2">
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask interview question..."
          className="flex-1 p-2 border rounded"
        />

        <Button onClick={sendMessage} loading={loading}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default InterviewChat;