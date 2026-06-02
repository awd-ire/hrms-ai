import React, { useState } from "react";
import { aiApi } from "@/api/aiApi";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";

/**
 * Interview AI Panel
 * Backend:
 * POST /api/ai/chat/interview
 * POST /api/ai/interview/conduct
 */

const InterviewPanel = () => {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async () => {
    if (!message) return;

    const userMsg = { role: "user", text: message };
    setChat((prev) => [...prev, userMsg]);

    setLoading(true);
    setError(null);

    try {
      const res = await aiApi.chatInterview({
        message
      });

      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: res.data.reply,
          follow_up: res.data.follow_up_questions
        }
      ]);

      setMessage("");
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
      <h2 className="font-semibold">AI Interview Panel</h2>

      {error && <ApiError error={{ message: error.message }} />}

      <div className="h-64 overflow-y-auto border p-2 rounded">
        {chat.map((c, i) => (
          <div key={i} className="mb-2">
            <p
              className={
                c.role === "user"
                  ? "text-blue-600"
                  : "text-green-600"
              }
            >
              {c.text}
            </p>

            {c.follow_up && (
              <ul className="text-xs text-gray-500 ml-2 list-disc">
                {c.follow_up.map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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

export default InterviewPanel;