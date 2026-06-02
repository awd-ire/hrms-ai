import React, { useEffect, useMemo, useRef, useState } from "react";
import publicPortalApi from "@/api/publicPortalApi";
import ApiError from "@/components/common/ApiError";
import LoadingSpinner from "@/components/common/LoadingSpinner";

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
  const [interviewForm, setInterviewForm] = useState({
    candidate_id: "",
    email: "",
    audio: null,
  });
  const [statusForm, setStatusForm] = useState({
    candidate_id: "",
    email: "",
  });
  const [liveForm, setLiveForm] = useState({
    candidate_id: "",
    email: "",
  });
  const [result, setResult] = useState(null);
  const [success, setSuccess] = useState("");
  const [liveSession, setLiveSession] = useState(null);
  const [recording, setRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveQuestion, setLiveQuestion] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

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
    if (!voiceEnabled || activeTab !== "live" || !liveSession || !liveQuestion) {
      return undefined;
    }

    if (!("speechSynthesis" in window)) {
      return undefined;
    }

    const utterance = new SpeechSynthesisUtterance(liveQuestion);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = "en-US";

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
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
      const nextCandidate = {
        candidate_id: String(res.data.candidate.id),
        email: res.data.candidate.email,
      };
      setInterviewForm({ ...nextCandidate, audio: null });
      setStatusForm(nextCandidate);
      setLiveForm(nextCandidate);
    } catch (err) {
      setError(err);
    }
  };

  const submitInterview = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("candidate_id", interviewForm.candidate_id);
      formData.append("email", interviewForm.email);
      formData.append("audio", interviewForm.audio);
      const res = await publicPortalApi.conductInterview(formData);
      setResult(res.data);
      setSuccess("AI interview completed successfully.");
    } catch (err) {
      setError(err);
    }
  };

  const loadStatus = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError(null);
    try {
      const res = await publicPortalApi.getCandidateStatus(
        statusForm.candidate_id,
        statusForm.email
      );
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
    try {
      const res = await publicPortalApi.startLiveInterview({
        candidate_id: Number(liveForm.candidate_id),
        email: liveForm.email,
      });
      setLiveSession(res.data);
      setLiveQuestion(res.data.question);
      setResult(res.data);
      setActiveTab("live");
      setSuccess("Live interview started. Allow microphone access to answer the next question.");
    } catch (err) {
      setError(err);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await submitLiveAnswer(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
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

  const submitLiveAnswer = async (blob) => {
    if (!liveSession?.session_id) return;

    const formData = new FormData();
    formData.append("candidate_id", liveForm.candidate_id);
    formData.append("email", liveForm.email);
    formData.append("audio", blob, "answer.webm");

    try {
      const res = await publicPortalApi.continueLiveInterview(liveSession.session_id, formData);
      setResult(res.data);
      setLiveTranscript(res.data.transcript || "");
      setLiveQuestion(res.data.question || "");
      setSuccess(res.data.completed ? "Live interview completed." : "Answer received. Next question ready.");
      if (res.data.completed) {
        setLiveSession((prev) => ({ ...prev, completed: true }));
      }
    } catch (err) {
      setError(err);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error && !result) return <ApiError error={{ message: error.message }} />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 px-6 py-8 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Candidate Portal</p>
        <h1 className="mt-2 text-3xl font-bold">Apply, talk to the AI interviewer, and view your result</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          This page supports job applications, a one-shot AI interview, and a live microphone-based interview conversation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <button className={`rounded-xl px-4 py-3 text-left shadow ${activeTab === "apply" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800"}`} onClick={() => setActiveTab("apply")} type="button">
          <div className="text-xs uppercase tracking-wide opacity-70">Apply</div>
          <div className="font-semibold">Job Application</div>
        </button>
        <button className={`rounded-xl px-4 py-3 text-left shadow ${activeTab === "interview" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800"}`} onClick={() => setActiveTab("interview")} type="button">
          <div className="text-xs uppercase tracking-wide opacity-70">AI</div>
          <div className="font-semibold">Interview</div>
        </button>
        <button className={`rounded-xl px-4 py-3 text-left shadow ${activeTab === "live" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800"}`} onClick={() => setActiveTab("live")} type="button">
          <div className="text-xs uppercase tracking-wide opacity-70">Voice</div>
          <div className="font-semibold">Live Interview</div>
        </button>
        <button className={`rounded-xl px-4 py-3 text-left shadow ${activeTab === "result" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800"}`} onClick={() => setActiveTab("result")} type="button">
          <div className="text-xs uppercase tracking-wide opacity-70">Status</div>
          <div className="font-semibold">View Result</div>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
          {activeTab === "apply" && (
            <form className="space-y-4" onSubmit={submitApplication}>
              <h2 className="text-lg font-semibold">Apply for a job</h2>
              <select className="w-full rounded border px-3 py-2" required value={applyForm.job_posting_id} onChange={(e) => setApplyForm({ ...applyForm, job_posting_id: e.target.value })}>
                <option value="">Select job</option>
                {jobOptions.map((job) => (
                  <option key={job.value} value={job.value}>{job.label}</option>
                ))}
              </select>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded border px-3 py-2" placeholder="Full name" required value={applyForm.full_name} onChange={(e) => setApplyForm({ ...applyForm, full_name: e.target.value })} />
                <input className="rounded border px-3 py-2" placeholder="Email" type="email" required value={applyForm.email} onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded border px-3 py-2" placeholder="Phone" value={applyForm.phone} onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })} />
                <input className="rounded border px-3 py-2" placeholder="Experience years" type="number" step="0.1" value={applyForm.experience_years} onChange={(e) => setApplyForm({ ...applyForm, experience_years: e.target.value })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded border px-3 py-2" placeholder="Current company" value={applyForm.current_company} onChange={(e) => setApplyForm({ ...applyForm, current_company: e.target.value })} />
                <input className="rounded border px-3 py-2" placeholder="Current role" value={applyForm.current_role} onChange={(e) => setApplyForm({ ...applyForm, current_role: e.target.value })} />
              </div>
              <input className="rounded border px-3 py-2" type="date" value={applyForm.applied_date} onChange={(e) => setApplyForm({ ...applyForm, applied_date: e.target.value })} />
              <input className="w-full rounded border px-3 py-2" type="file" accept=".pdf,.doc,.docx" required onChange={(e) => setApplyForm({ ...applyForm, resume: e.target.files?.[0] || null })} />
              <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">Submit Application</button>
            </form>
          )}

          {activeTab === "interview" && (
            <form className="space-y-4" onSubmit={submitInterview}>
              <h2 className="text-lg font-semibold">One-shot AI interview</h2>
              <input className="w-full rounded border px-3 py-2" placeholder="Candidate ID" required value={interviewForm.candidate_id} onChange={(e) => setInterviewForm({ ...interviewForm, candidate_id: e.target.value })} />
              <input className="w-full rounded border px-3 py-2" placeholder="Email used for application" type="email" required value={interviewForm.email} onChange={(e) => setInterviewForm({ ...interviewForm, email: e.target.value })} />
              <input className="w-full rounded border px-3 py-2" type="file" accept="audio/*" required onChange={(e) => setInterviewForm({ ...interviewForm, audio: e.target.files?.[0] || null })} />
              <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">Start AI Interview</button>
            </form>
          )}

          {activeTab === "live" && (
            <div className="space-y-4">
              {!liveSession ? (
                <form className="space-y-4" onSubmit={startLiveInterview}>
                  <h2 className="text-lg font-semibold">Live voice interview</h2>
                  <input className="w-full rounded border px-3 py-2" placeholder="Candidate ID" required value={liveForm.candidate_id} onChange={(e) => setLiveForm({ ...liveForm, candidate_id: e.target.value })} />
                  <input className="w-full rounded border px-3 py-2" placeholder="Email used for application" type="email" required value={liveForm.email} onChange={(e) => setLiveForm({ ...liveForm, email: e.target.value })} />
                  <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">Start Live Interview</button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">AI Question</div>
                    <p className="mt-2 text-base font-medium">{liveQuestion || "Waiting for next question..."}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                    />
                    Speak AI questions aloud
                  </label>
                  <div className="rounded-xl border bg-white p-4 dark:bg-gray-900">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Transcript</div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{liveTranscript || "No answer recorded yet."}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={recording ? stopRecording : startRecording}
                      className={`rounded px-4 py-2 text-white ${recording ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                    >
                      {recording ? "Stop Recording" : "Record Answer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveSession(null)}
                      className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
                    >
                      Reset Session
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Click <strong>Record Answer</strong>, speak into your microphone, then click <strong>Stop Recording</strong> to send the answer.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "result" && (
            <form className="space-y-4" onSubmit={loadStatus}>
              <h2 className="text-lg font-semibold">View result</h2>
              <input className="w-full rounded border px-3 py-2" placeholder="Candidate ID" required value={statusForm.candidate_id} onChange={(e) => setStatusForm({ ...statusForm, candidate_id: e.target.value })} />
              <input className="w-full rounded border px-3 py-2" placeholder="Email used for application" type="email" required value={statusForm.email} onChange={(e) => setStatusForm({ ...statusForm, email: e.target.value })} />
              <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">Load Result</button>
            </form>
          )}

          {success && <p className="mt-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}
          {error && <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>}
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
          <h2 className="text-lg font-semibold">Open Jobs</h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-xl border p-4">
                <div className="font-semibold">{job.title}</div>
                <div className="text-sm text-gray-500">{job.department?.name || `Department #${job.department_id}`}</div>
                <div className="mt-2 text-sm text-gray-600">{job.description}</div>
              </div>
            ))}
            {jobs.length === 0 && <p className="text-sm text-gray-500">No open jobs are available right now.</p>}
          </div>

          {result && (
            <div className="rounded-xl border bg-slate-50 p-4">
              <h3 className="font-semibold">Latest response</h3>
              <pre className="mt-3 overflow-auto text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidatePortal;
