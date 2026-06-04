import React, { useEffect, useMemo, useRef, useState } from "react";
import { recruitmentApi } from "@/api/recruitmentApi";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  getFinalDecisionLabel,
  getShortlistDecisionLabel,
} from "@/utils/candidateStatus";

const eligibleStages = new Set(["shortlisted", "interview_scheduled", "interview_in_progress", "interviewed", "hired"]);

const roundOptions = [
  { value: "phone", label: "Phone" },
  { value: "technical", label: "Technical" },
  { value: "hr", label: "HR" },
  { value: "final", label: "Final" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

const InterviewWorkspace = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    candidate_id: "",
    interview_round: "phone",
    scheduled_date: todayIso(),
  });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [result, setResult] = useState(null);

  const loadCandidates = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await recruitmentApi.getCandidates();
      setCandidates(res.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => String(candidate.id) === String(selectedCandidateId)) || null,
    [candidates, selectedCandidateId]
  );

  const latestInterview = useMemo(() => {
    if (!selectedCandidate?.interviews?.length) return null;
    return [...selectedCandidate.interviews].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    })[0];
  }, [selectedCandidate]);
  const interviewCompleted = latestInterview?.status === "completed";
  const latestTranscript = latestInterview?.transcript || result?.transcript || "";

  const interviewCandidates = useMemo(
    () => candidates.filter((candidate) => eligibleStages.has(candidate.stage)),
    [candidates]
  );

  useEffect(() => {
    if (!selectedCandidate && interviewCandidates.length > 0) {
      const first = interviewCandidates[0];
      setSelectedCandidateId(String(first.id));
      setScheduleForm((prev) => ({
        ...prev,
        candidate_id: String(first.id),
      }));
    }
  }, [interviewCandidates, selectedCandidate]);

  const pickCandidate = (candidate) => {
    setSelectedCandidateId(String(candidate.id));
    setScheduleForm((prev) => ({
      ...prev,
      candidate_id: String(candidate.id),
    }));
    setSuccess("");
    setError(null);
    setResult(null);
  };

  const scheduleInterview = async (e) => {
    e.preventDefault();
    setScheduleLoading(true);
    setSuccess("");
    setError(null);

    try {
      const res = await recruitmentApi.createInterview({
        candidate_id: Number(scheduleForm.candidate_id),
        interview_round: scheduleForm.interview_round,
        scheduled_date: scheduleForm.scheduled_date,
        status: "scheduled",
      });
      setResult(res.data);
      setSuccess("Interview scheduled successfully.");
      await loadCandidates();
    } catch (err) {
      setError(err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const updateReviewDecision = async (recommendation) => {
    if (!selectedCandidate) {
      setError({ message: "Select a candidate with an interview record first." });
      return;
    }

    setReviewLoading(true);
    setSuccess("");
    setError(null);

    try {
      if (recommendation === "shortlist") {
        await recruitmentApi.updateStage(selectedCandidate.id, { stage: "shortlisted" });
        setSuccess("Candidate shortlisted successfully.");
        await loadCandidates();
        return;
      }

      if (!latestInterview) {
        await recruitmentApi.updateStage(selectedCandidate.id, { stage: recommendation === "reject" ? "rejected" : "shortlisted" });
        setSuccess(recommendation === "reject" ? "Candidate rejected." : "Candidate shortlisted successfully.");
        await loadCandidates();
        return;
      }

      await recruitmentApi.interviewFeedback(latestInterview.id, {
        feedback: selectedCandidate.interview_summary || selectedCandidate.ai_summary || "HR review completed.",
        score: selectedCandidate.interview_score ?? selectedCandidate.ai_score ?? 0,
        recommendation,
        status: recommendation === "reject" ? "rejected" : "completed",
      });
      setSuccess(recommendation === "reject" ? "Candidate rejected after interview." : "Candidate approved for the next step.");
      await loadCandidates();
    } catch (err) {
      setError(err);
    } finally {
      setReviewLoading(false);
    }
  };

  const grantAnotherChance = async () => {
    if (!selectedCandidate || !latestInterview) {
      setError({ message: "Select a candidate with an interview record first." });
      return;
    }

    setRetryLoading(true);
    setSuccess("");
    setError(null);

    try {
      const res = await recruitmentApi.retryInterview(selectedCandidate.id, {
        interview_round: latestInterview.interview_round,
        scheduled_date: todayIso(),
      });
      setResult(res.data);
      setSuccess("A fresh AI interview attempt has been granted.");
      await loadCandidates();
    } catch (err) {
      setError(err);
    } finally {
      setRetryLoading(false);
    }
  };

  const displayError = error?.message || error?.detail || "Something went wrong";

  if (loading && candidates.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-violet-900 to-indigo-700 px-6 py-8 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">HR Interview Workspace</p>
        <h1 className="mt-2 text-3xl font-bold">Schedule and run interviews in one place</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Use this workspace to shortlist-ready candidates, schedule an interview date, and run the AI interview with a candidate answer recording.
        </p>
      </div>

      {error && <ApiError error={{ message: displayError }} />}
      {success && (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl bg-white p-5 shadow dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Interview-ready candidates</h2>
              <p className="text-sm text-gray-500">
                Candidates in shortlist or interview stages.
              </p>
            </div>
            <Button variant="ghost" onClick={loadCandidates} loading={loading}>
              Refresh
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {interviewCandidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => pickCandidate(candidate)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  String(candidate.id) === String(selectedCandidateId)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{candidate.full_name}</div>
                    <div className="text-xs text-gray-500">{candidate.email}</div>
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                    {candidate.stage}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Final Select: {
                    candidate.shortlist_decision === "shortlisted"
                      ? "Shortlisted - Final selected"
                      : getShortlistDecisionLabel(candidate.shortlist_decision) || "Pending"
                  } | Final: {getFinalDecisionLabel(candidate.final_decision) || "Pending"}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Interview score: {candidate.interview_score ?? "-"}
                </div>
              </button>
            ))}

            {interviewCandidates.length === 0 && (
              <p className="text-sm text-gray-500">No shortlisted candidates available for interview.</p>
            )}
          </div>
        </section>

        <section className="space-y-5 rounded-2xl bg-white p-5 shadow dark:bg-gray-800">
          <div>
            <h2 className="text-lg font-semibold">Interview actions</h2>
            <p className="text-sm text-gray-500">
              Schedule the interview date, then upload the candidate answer audio to process it with AI.
            </p>
          </div>

          {selectedCandidate ? (
            <>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="text-sm font-semibold">{selectedCandidate.full_name}</div>
                <div className="text-xs text-gray-500">{selectedCandidate.email}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Current stage: {selectedCandidate.stage}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Latest interview: {latestInterview?.interview_round || "none"}
                </div>
                {interviewCompleted && (
                  <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    AI interview completed. HR review is ready for the next decision.
                  </div>
                )}
              </div>

              <form className="space-y-4 rounded-xl border border-dashed p-4" onSubmit={scheduleInterview}>
                <div>
                  <h3 className="font-semibold">Schedule interview</h3>
                  <p className="text-xs text-gray-500">
                    This updates the candidate to interview scheduled and stores the interview date.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Interview round</span>
                    <select
                      className="w-full rounded border px-3 py-2"
                      value={scheduleForm.interview_round}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, interview_round: e.target.value })
                      }
                    >
                      {roundOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-gray-500">Scheduled date</span>
                    <input
                      className="w-full rounded border px-3 py-2"
                      type="date"
                      value={scheduleForm.scheduled_date}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })
                      }
                      required
                    />
                  </label>
                </div>

                <Button type="submit" loading={scheduleLoading}>
                  Schedule Interview
                </Button>
              </form>

              <div className="rounded-xl border border-dashed p-4">
                <div>
                  <h3 className="font-semibold">HR decision</h3>
                  <p className="text-xs text-gray-500">
                    Shortlist means the candidate is selected for the role. It can be used with or without an AI interview.
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Score</div>
                    <div className="mt-1 text-2xl font-semibold">
                      {selectedCandidate?.interview_score ?? selectedCandidate?.ai_score ?? "-"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Summary</div>
                    <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                      {selectedCandidate?.interview_summary || selectedCandidate?.ai_summary || "No interview summary available yet."}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Transcript</div>
                    <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                      {latestTranscript || "No transcript available yet."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => updateReviewDecision("shortlist")}
                      loading={reviewLoading}
                    >
                      Final Select Candidate
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => updateReviewDecision("reject")}
                      loading={reviewLoading}
                      disabled={!selectedCandidate}
                    >
                      Reject Candidate
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={grantAnotherChance}
                      loading={retryLoading}
                      disabled={!selectedCandidate || !latestInterview}
                    >
                      Give Another Chance
                    </Button>
                  </div>
                  {!interviewCompleted && (
                    <p className="text-xs text-amber-700">
                      Final selection now marks the candidate as shortlisted in the public portal.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
              Select a candidate from the left side to schedule and process the interview.
            </div>
          )}

          {result && (
            <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900">
              <h3 className="font-semibold">Latest interview activity</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border bg-white p-3 text-sm dark:bg-gray-800">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Transcript</div>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                    {latestTranscript || "No transcript available."}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-3 text-sm dark:bg-gray-800">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Evaluation</div>
                  <p className="mt-1 text-gray-700 dark:text-gray-200">
                    Score: {result.evaluation?.score ?? "-"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                    {result.evaluation?.summary || "No summary available."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default InterviewWorkspace;
