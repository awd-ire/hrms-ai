import React from "react";

/**
 * Single chat message renderer
 */

const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      } mb-2`}
    >
      <div
        className={`max-w-[70%] p-2 rounded-lg text-sm shadow ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
        }`}
      >
        <p>{message.text}</p>

        {message.follow_up?.length > 0 && (
          <ul className="text-xs mt-1 list-disc ml-4 opacity-80">
            {message.follow_up.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;