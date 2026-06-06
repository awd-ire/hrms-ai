import React, { useEffect, useMemo, useRef, useState } from "react";
import publicPortalApi from "@/api/publicPortalApi";
import ApiError from "@/components/common/ApiError";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { getFinalDecisionLabel, getShortlistDecisionLabel } from "@/utils/candidateStatus";

const TAB_CONFIG = [
  { id: "apply", label: "Apply", title: "Job Application" },
  { id: "interview", label: "Interview", title: "AI Interview" },
  { id: "result", label: "Result", title: "View Result" },
];

const emptyCandidateRef = { candidate_id: "", email: "" };

const normalizeCandidateId = (candidateId) => {
  const value = Number(candidateId);
  return Number.isFinite(value) && value > 0 ? String(value) : "";
};

const getCandidatePortalDecisionLabel = (candidate) => {
  if (!candidate) {
    return "pending";
  }

  if (candidate.shortlist_decision === "shortlisted") {
    return "Shortlisted";
  }

  if (candidate.final_decision) {
    return getFinalDecisionLabel(candidate.final_decision);
  }

  if (candidate.shortlist_decision) {
    return getShortlistDecisionLabel(candidate.shortlist_decision);
  }

  return getFinalDecisionLabel(candidate.stage) || candidate.stage || "pending";
};

const pickRecordingMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || "audio/webm";
};

const blobToFileName = (blob) => {
  if (blob?.type?.includes("wav")) return "answer.wav";
  if (blob?.type?.includes("ogg")) return "answer.ogg";
  return "answer.webm";
};

const encodeAudioBufferToWav = (audioBuffer) => {
  const channels = Math.max(1, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const input = audioBuffer.getChannelData(0);
  const pcm = new Int16Array(input.length);

  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i += 1) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, pcm.length * 2, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    view.setInt16(offset, pcm[i], true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
};

const convertRecordingToWav = async (blob) => {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor || !blob) {
    return blob;
  }

  const audioContext = new AudioContextCtor();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return encodeAudioBufferToWav(audioBuffer);
  } catch (err) {
    return blob;
  } finally {
    try {
      await audioContext.close();
    } catch (err) {
      // ignore
    }
  }
};

const getRecordingDuration = async (blob) => {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor || !blob) {
    return 0;
  }

  const audioContext = new AudioContextCtor();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return audioBuffer.duration || 0;
  } catch (err) {
    return 0;
  } finally {
    try {
      await audioContext.close();
    } catch (err) {
      // ignore
    }
  }
};

const CandidatePortal = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("apply");
  const [applyForm, setApplyForm] = useState({
    job_posting_id: "",
    full_name: "",
    email: "",
    phone: "",
    experience_years: "",
    current_company: "",
    current_role: "",
    applied_date: new Date().toISOString().slice(0, 10),
    resume: null,
  });
  const [statusForm, setStatusForm] = useState(emptyCandidateRef);
  const [liveForm, setLiveForm] = useState(emptyCandidateRef);
  const [result, setResult] = useState(null);
  const [success, setSuccess] = useState("");
  const [liveSession, setLiveSession] = useState(null);
  const [recording, setRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveQuestion, setLiveQuestion] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [questionSpeaking, setQuestionSpeaking] = useState(false);
  const [questionCooldown, setQuestionCooldown] = useState(false);
  const [recordedAnswer, setRecordedAnswer] = useState(null);
  const [answerReady, setAnswerReady] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedAnswerRef = useRef(null);
  const chunksRef = useRef([]);
  const questionCooldownTimerRef = useRef(null);
  const MIN_ANSWER_DURATION_SECONDS = 2.5;

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await publicPortalApi.getJobs();
        setJobs(res.data || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, []);

  useEffect(() => {
    if (!result?.candidate) {
      return;
    }

    const nextCandidateId = normalizeCandidateId(result.candidate.id);
    const nextEmail = result.candidate.email || "";

    if (nextCandidateId && nextEmail) {
      setStatusForm((current) => ({
        candidate_id: current.candidate_id || nextCandidateId,
        email: current.email || nextEmail,
      }));
      setLiveForm((current) => ({
        candidate_id: current.candidate_id || nextCandidateId,
        email: current.email || nextEmail,
      }));
    }
  }, [result?.candidate]);

  useEffect(() => {
    if (!voiceEnabled || activeTab !== "interview" || !liveSession || !liveQuestion) {
      setQuestionSpeaking(false);
      setQuestionCooldown(false);
      if (questionCooldownTimerRef.current) {
        clearTimeout(questionCooldownTimerRef.current);
        questionCooldownTimerRef.current = null;
      }
      return undefined;
    }

    if (!("speechSynthesis" in window)) {
      setQuestionSpeaking(false);
      setQuestionCooldown(false);
      return undefined;
    }

    if (questionCooldownTimerRef.current) {
      clearTimeout(questionCooldownTimerRef.current);
      questionCooldownTimerRef.current = null;
    }

    const releaseRecordingLock = () => {
      setQuestionSpeaking(false);
      setQuestionCooldown(true);
      if (questionCooldownTimerRef.current) {
        clearTimeout(questionCooldownTimerRef.current);
      }
      questionCooldownTimerRef.current = window.setTimeout(() => {
        setQuestionCooldown(false);
        questionCooldownTimerRef.current = null;
      }, 1200);
    };

    const utterance = new SpeechSynthesisUtterance(liveQuestion);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    utterance.onstart = () => {
      setQuestionSpeaking(true);
      setQuestionCooldown(true);
    };
    utterance.onend = releaseRecordingLock;
    utterance.onerror = releaseRecordingLock;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      setQuestionSpeaking(false);
      setQuestionCooldown(false);
      if (questionCooldownTimerRef.current) {
        clearTimeout(questionCooldownTimerRef.current);
        questionCooldownTimerRef.current = null;
      }
    };
  }, [voiceEnabled, activeTab, liveSession, liveQuestion]);

  const jobOptions = useMemo(
    () =>
      jobs.map((job) => ({
        value: job.id,
        label: `${job.title} - ${job.department?.name || `#${job.department_id}`}`,
      })),
    [jobs]
  );

  const candidateContext = useMemo(
    () => ({
      candidate_id: statusForm.candidate_id || liveForm.candidate_id,
      email: statusForm.email || liveForm.email,
    }),
    [liveForm.candidate_id, liveForm.email, statusForm.candidate_id, statusForm.email]
  );

  const resultCandidate = result?.candidate || null;
  const resultInterview = result?.interview || null;
  const resultSummary = result?.latest_result || result?.evaluation || null;
  const resultDecision = getCandidatePortalDecisionLabel(resultCandidate);
  const totalInterviewQuestions = liveSession?.total_questions || resultInterview?.total_questions || 0;
  const openJobsCount = jobs.length;
  const hasCurrentResult = Boolean(result);

  const setCandidateDetails = (candidate) => {
    setStatusForm({ candidate_id: String(candidate.id), email: candidate.email });
    setLiveForm({ candidate_id: String(candidate.id), email: candidate.email });
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError(null);
    setResult(null);

    const formData = new FormData();
    Object.entries(applyForm).forEach(([key, value]) => {
      if (value !== null && value !== "") {
        formData.append(key, value);
      }
    });

    try {
      const res = await publicPortalApi.apply(formData);
      setSuccess(`Application submitted successfully. Candidate ID: ${res.data.candidate.id}`);
      setResult(res.data);
      setCandidateDetails(res.data.candidate);
    } catch (err) {
      setError(err);
    }
  };

  const getCandidatePayload = () => {
    const candidate_id = normalizeCandidateId(liveForm.candidate_id);
    const email = String(liveForm.email || "").trim();

    if (!candidate_id || !email) {
      return {
        candidate_id: "",
        email: "",
        error: "Please enter a valid candidate ID and email, or submit an application first so we can reuse the details.",
      };
    }

    return { candidate_id, email, error: null };
  };

  const submitLiveAnswer = async (blob) => {
    if (!liveSession?.session_id) {
      return;
    }

    const candidatePayload = getCandidatePayload();
    if (candidatePayload.error) {
      setError({ message: candidatePayload.error });
      return;
    }

    const formData = new FormData();
    formData.append("candidate_id", candidatePayload.candidate_id);
    formData.append("email", candidatePayload.email);
    formData.append("audio", blob, blobToFileName(blob));

    try {
      const res = await publicPortalApi.continueLiveInterview(liveSession.session_id, formData);
      setResult(res.data);
      setLiveTranscript(res.data.transcript || "");
      setLiveQuestion(res.data.question || "");
      recordedAnswerRef.current = null;
      setRecordedAnswer(null);
      setAnswerReady(false);
      setSuccess(res.data.completed ? "Live interview completed." : "Answer received. Next question ready.");
      if (res.data.completed) {
        setLiveSession((prev) => ({ ...prev, completed: true }));
        setActiveTab("result");
      }
    } catch (err) {
      if (
        err?.status === 422 ||
        String(err?.message || "").toLowerCase().includes("could not detect speech") ||
        String(err?.message || "").toLowerCase().includes("empty text")
      ) {
        window.alert("We couldn't detect your speech. Please record again and speak a little louder.");
        return;
      }
      setError(err);
    }
  };

  const loadStatus = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError(null);

    const candidate_id = normalizeCandidateId(statusForm.candidate_id);
    const email = String(statusForm.email || "").trim();

    if (!candidate_id || !email) {
      setError({
        message:
          "Please enter a valid candidate ID and email before loading the result.",
      });
      return;
    }

    try {
      const res = await publicPortalApi.getCandidateStatus(candidate_id, email);
      setResult(res.data);
      setSuccess("Candidate result loaded.");
    } catch (err) {
      setError(err);
    }
  };

  const startLiveInterview = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError(null);

    const candidatePayload = getCandidatePayload();
    if (candidatePayload.error) {
      setError({ message: candidatePayload.error });
      return;
    }

    try {
      const res = await publicPortalApi.startLiveInterview({
        candidate_id: Number(candidatePayload.candidate_id),
        email: candidatePayload.email,
      });
      setLiveSession(res.data);
      setLiveQuestion(res.data.question);
      setResult(res.data);
      recordedAnswerRef.current = null;
      setRecordedAnswer(null);
      setAnswerReady(false);
      setActiveTab("interview");
      setSuccess("AI interview started. Allow microphone access to answer the next question.");
    } catch (err) {
      if (err?.status === 409 || String(err?.message || "").toLowerCase().includes("already taken")) {
        window.alert("You have already taken the AI interview.");
        return;
      }
      setError(err);
    }
  };

  const startRecording = async (target) => {
    setError(null);
    recordedAnswerRef.current = null;
    setRecordedAnswer(null);
    setAnswerReady(false);

    if (questionSpeaking || questionCooldown) {
      setError({ message: "Please wait a moment after the question finishes before recording your answer." });
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError({ message: "This browser does not support microphone recording." });
      return;
    }

    try {
      window.speechSynthesis?.cancel?.();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecordingMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        const uploadBlob = await convertRecordingToWav(blob);
        const durationSeconds = await getRecordingDuration(uploadBlob);

        if (durationSeconds > 0 && durationSeconds < MIN_ANSWER_DURATION_SECONDS) {
          setError({
            message: `The recording is too short (${durationSeconds.toFixed(1)}s). Please record a longer answer and try again.`,
          });
          setSuccess("");
          return;
        }

        recordedAnswerRef.current = uploadBlob;
        setRecordedAnswer(uploadBlob);
        setAnswerReady(true);
        setSuccess("Answer recorded. Press Submit Answer when you are ready to send it.");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
    } catch (err) {
      setError(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const submitRecordedAnswer = async () => {
    const answerBlob = recordedAnswerRef.current || recordedAnswer;

    if (!answerBlob) {
      setError({ message: "Please record an answer before submitting it." });
      return;
    }

    if (answerBlob.size < 1024) {
      setError({
        message: "The recording looks too short. Please record again and speak for a few seconds.",
      });
      return;
    }

    setError(null);
    setSubmittingAnswer(true);

    try {
      await submitLiveAnswer(answerBlob);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const selectedApplyFile = applyForm.resume?.name || "No file selected";
  const displayError = error?.message || error?.detail || "Something went wrong";

  if (loading) return <LoadingSpinner />;
  if (error && !result) return <ApiError error={{ message: displayError }} />;

  return (
    <div className="relative space-y-6 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-slate-50/80 p-4 shadow-[0_24px_90px_-40px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(14,116,144,0.78))] opacity-95" />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-slate-950/90 px-6 py-8 text-white shadow-2xl ring-1 ring-white/10 md:px-8">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">Candidate Portal</p>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Apply, interview, and follow your progress in one polished workspace
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                Submit your application, answer AI interview prompts when they are available, and check the latest screening outcome without leaving the portal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-cyan-100">
                {openJobsCount} open roles
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-cyan-100">
                Guided application flow
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-cyan-100">
                Voice interview ready
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[22rem] lg:grid-cols-1">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200">Jobs</div>
              <div className="mt-2 text-2xl font-semibold text-white">{openJobsCount}</div>
              <p className="mt-1 text-xs leading-5 text-slate-300">Open jobs available to apply for right now.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200">Result</div>
              <div className="mt-2 text-2xl font-semibold text-white">{hasCurrentResult ? "Ready" : "Pending"}</div>
              <p className="mt-1 text-xs leading-5 text-slate-300">Your latest status appears as soon as it is available.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200">Interview</div>
              <div className="mt-2 text-2xl font-semibold text-white">{liveSession?.completed ? "Done" : "Live"}</div>
              <p className="mt-1 text-xs leading-5 text-slate-300">Practice through a structured AI interview when enabled.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative grid gap-3 md:grid-cols-3">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            className={`group rounded-2xl border px-4 py-4 text-left shadow-sm transition-all duration-200 ${
              activeTab === tab.id
                ? "border-cyan-400/60 bg-white text-slate-900 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-200/70 dark:border-cyan-400/40 dark:bg-slate-900 dark:text-white dark:ring-cyan-400/20"
                : "border-slate-200 bg-white/80 text-slate-700 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100"
            }`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <div
              className={`text-xs uppercase tracking-[0.25em] ${
                activeTab === tab.id ? "text-cyan-500 dark:text-cyan-300" : "text-slate-400"
              }`}
            >
              {tab.label}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="font-semibold">{tab.title}</div>
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full transition ${
                  activeTab === tab.id ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              />
            </div>
          </button>
        ))}
      </div>

      {activeTab === "result" && result && (
        <div className="mx-auto w-full max-w-6xl rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:ring-slate-700/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-blue-600 dark:text-blue-300">
                Result Center
              </p>
              <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-100">
                Your latest screening result
              </h2>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                This is the current outcome from screening or interview review, shown in one centered card for easier reading.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  resultCandidate?.shortlist_decision === "shortlisted"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {resultCandidate?.shortlist_decision === "shortlisted"
                  ? "Shortlisted"
                  : resultCandidate?.shortlist_decision
                  ? getShortlistDecisionLabel(resultCandidate.shortlist_decision)
                  : "Pending"}
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                Status: {resultDecision}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {resultCandidate && (
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Candidate
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-700 dark:text-slate-100">
                  {resultCandidate.full_name}
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {resultCandidate.email}
                </div>
                <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                  Portal stage: {
                    resultCandidate.shortlist_decision === "shortlisted"
                      ? "shortlisted"
                      : resultCandidate.stage
                  }
                </div>
              </div>
            )}

            {resultSummary && (
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Result summary
                </div>
                <div className="mt-3 text-3xl font-bold text-slate-700 dark:text-slate-100">
                  {resultSummary.score ?? resultSummary.ai_score ?? "N/A"}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {resultSummary.summary ||
                    resultSummary.screening_summary ||
                    resultSummary.interview_summary ||
                    "No summary available."}
                </p>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Decision
              </div>
              <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                  <span>Shortlist</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-100">
                    {result.latest_result?.shortlist_decision === "shortlisted"
                      ? "Shortlisted"
                      : getShortlistDecisionLabel(result.latest_result?.shortlist_decision) || "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                  <span>Final</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-100">
                    {result.latest_result?.shortlist_decision === "shortlisted"
                      ? "Shortlisted"
                      : getFinalDecisionLabel(result.latest_result?.final_decision) || "Pending"}
                  </span>
                </div>
                {resultInterview && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                    <span>Interview</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-100">
                      {resultInterview.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {resultInterview && (
            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Interview details
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Round</div>
                  <div className="font-medium text-slate-700 dark:text-slate-100">
                    {resultInterview.interview_round}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Scheduled</div>
                  <div className="font-medium text-slate-700 dark:text-slate-100">
                    {resultInterview.scheduled_date}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
                  <div className="font-medium text-slate-700 dark:text-slate-100">
                    {resultInterview.status}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Transcript
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {resultInterview.transcript || "No transcript available yet."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.5)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          {activeTab === "apply" && (
            <form className="space-y-5" onSubmit={submitApplication}>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Apply for a job</h2>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-300">
                  Fill out your details, upload your resume, and we will create your candidate record automatically.
                </p>
              </div>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                required
                value={applyForm.job_posting_id}
                onChange={(e) => setApplyForm({ ...applyForm, job_posting_id: e.target.value })}
              >
                <option value="">Select job</option>
                {jobOptions.map((job) => (
                  <option key={job.value} value={job.value}>
                    {job.label}
                  </option>
                ))}
              </select>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                  placeholder="Full name"
                  required
                  value={applyForm.full_name}
                  onChange={(e) => setApplyForm({ ...applyForm, full_name: e.target.value })}
                />
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                  placeholder="Email"
                  type="email"
                  required
                  value={applyForm.email}
                  onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                  placeholder="Phone"
                  value={applyForm.phone}
                  onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                />
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                  placeholder="Experience years"
                  type="number"
                  step="0.1"
                  value={applyForm.experience_years}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, experience_years: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                  placeholder="Current company"
                  value={applyForm.current_company}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, current_company: e.target.value })
                  }
                />
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                  placeholder="Current role"
                  value={applyForm.current_role}
                  onChange={(e) => setApplyForm({ ...applyForm, current_role: e.target.value })}
                />
              </div>

              <input
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                type="date"
                value={applyForm.applied_date}
                onChange={(e) => setApplyForm({ ...applyForm, applied_date: e.target.value })}
              />

              <label className="block rounded-3xl border border-dashed border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/5">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-100">Resume upload</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                  PDF, DOC, DOCX, or TXT up to 5 MB.
                </div>
                <input
                  className="mt-3 w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-700 dark:text-slate-300"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  required
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, resume: e.target.files?.[0] || null })
                  }
                />
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">Selected file: {selectedApplyFile}</div>
              </label>

              <button
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-4 focus:ring-cyan-200 dark:focus:ring-cyan-400/20"
                type="submit"
              >
                Submit Application
              </button>
            </form>
          )}

          {activeTab === "interview" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">AI interview</h2>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-300">
                  After your interview is scheduled, start the session and the AI will ask role-based questions one by one.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Interview session</h3>
                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">
                      This interview uses the job role, requirements, and your resume memory to choose questions.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <input
                      checked={voiceEnabled}
                      type="checkbox"
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                    />
                    Speak aloud
                  </label>
                </div>

                <form className="mt-5 space-y-4" onSubmit={startLiveInterview}>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                    placeholder="Candidate ID"
                    required
                    value={liveForm.candidate_id}
                    onChange={(e) => setLiveForm({ ...liveForm, candidate_id: e.target.value })}
                  />
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                    placeholder="Email used for application"
                    type="email"
                    required
                    value={liveForm.email}
                    onChange={(e) => setLiveForm({ ...liveForm, email: e.target.value })}
                  />

                  <button
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-4 focus:ring-cyan-200 dark:focus:ring-cyan-400/20"
                    type="submit"
                  >
                    Start AI interview
                  </button>
                </form>

                {liveSession && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <div className="font-medium text-slate-900 dark:text-white">Session {liveSession.session_id}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Question {liveSession.round_number} of {totalInterviewQuestions || "?"}
                      {liveSession.completed ? " - completed" : ""}
                    </div>
                    {liveSession.completed && (
                      <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                        AI interview completed. Your result and status are now visible in the Result tab.
                      </div>
                    )}

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                      <div className="font-medium text-slate-700 dark:text-slate-100">Current question</div>
                      <div className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-100">
                        {liveQuestion || "No active question yet."}
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                      <div className="font-medium text-slate-700 dark:text-slate-100">Interview progress</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Total questions: {totalInterviewQuestions || "Not available yet"}
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                      <div className="font-medium text-slate-700 dark:text-slate-100">Transcript</div>
                      <div className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-100">
                        {liveTranscript || "No transcript yet."}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {!recording ? (
                        <button
                          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                          type="button"
                          onClick={() => startRecording("live")}
                          disabled={!!liveSession.completed || questionSpeaking || questionCooldown}
                        >
                          {questionSpeaking || questionCooldown ? "Wait for question to finish" : "Start recording"}
                        </button>
                      ) : (
                        <button
                          className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500"
                          type="button"
                          onClick={stopRecording}
                        >
                          Stop recording
                        </button>
                      )}

                      <button
                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={submitRecordedAnswer}
                        disabled={!answerReady || recording || submittingAnswer || !!liveSession.completed}
                      >
                        {submittingAnswer ? "Submitting..." : "Submit Answer"}
                      </button>
                    </div>

                    {submittingAnswer && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
                        Transcribing and generating next question...
                      </div>
                    )}

                    {answerReady && !recording && (
                      <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                        Answer ready for submission. Press <span className="font-semibold">Submit Answer</span> to send it and load the next question.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "result" && (
            <form className="space-y-5" onSubmit={loadStatus}>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">View result</h2>
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-300">
                  Enter the candidate details from your application to load the latest screening or interview status.
                </p>
              </div>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                placeholder="Candidate ID"
                required
                value={statusForm.candidate_id}
                onChange={(e) => setStatusForm({ ...statusForm, candidate_id: e.target.value })}
              />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400/20"
                placeholder="Email used for application"
                type="email"
                required
                value={statusForm.email}
                onChange={(e) => setStatusForm({ ...statusForm, email: e.target.value })}
              />
              <button
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-4 focus:ring-cyan-200 dark:focus:ring-cyan-400/20"
                type="submit"
              >
                Load Result
              </button>
            </form>
          )}

          {success && (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200">
              {success}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
              {displayError}
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.5)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Open Jobs</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Browse current openings before applying.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-200">
              {openJobsCount} roles
            </span>
          </div>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:from-slate-900 dark:to-slate-950"
              >
                <div className="font-semibold text-slate-900 dark:text-white">{job.title}</div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  {job.department?.name || `Department #${job.department_id}`}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{job.description}</div>
              </div>
            ))}
            {jobs.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-300">No open jobs are available right now.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <h3 className="font-semibold text-slate-900 dark:text-white">Candidate details</h3>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Candidate ID: {candidateContext.candidate_id || "Not set yet"}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Email: {candidateContext.email || "Not set yet"}</div>
            <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Once you submit an application, we will reuse those details for interview and result lookups.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatePortal;
