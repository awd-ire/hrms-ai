import React, { useRef, useState } from "react";
import { aiApi } from "@/api/aiApi";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";

/**
 * Voice Recorder for Interview AI
 * Backend: POST /api/ai/voice/transcribe
 */

const VoiceRecorder = ({ onTranscribed }) => {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startRecording = async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setLoading(true);

        try {
          const audioBlob = new Blob(chunksRef.current, {
            type: "audio/webm"
          });

          const formData = new FormData();
          formData.append("file", audioBlob, "voice.webm");

          const res = await aiApi.transcribeVoice(formData);

          onTranscribed?.(res.data.transcript);
        } catch (err) {
          setError(err);
        } finally {
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="font-semibold">Voice Recorder</h2>

      {error && <ApiError error={{ message: error.message }} />}

      <div className="flex gap-2">
        {!recording ? (
          <Button onClick={startRecording}>
            Start Recording
          </Button>
        ) : (
          <Button variant="danger" onClick={stopRecording}>
            Stop Recording
          </Button>
        )}
      </div>

      {loading && (
        <p className="text-sm text-gray-500">
          Transcribing audio...
        </p>
      )}
    </div>
  );
};

export default VoiceRecorder;
