import React, { useState } from "react";
import { aiApi } from "@/api/aiApi";
import Button from "@/components/common/Button";
import ApiError from "@/components/common/ApiError";

/**
 * Candidate Ranking Table
 * Backend: POST /api/ai/resume/rank
 */

const CandidateRankingTable = () => {
  const [input, setInput] = useState("");
  const [ranked, setRanked] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRank = async () => {
    if (!input) return;

    setLoading(true);
    setError(null);

    try {
      const parsed = input.split(",").map((name) => name.trim());

      const res = await aiApi.rankCandidates({
        candidates: parsed
      });

      setRanked(res.data.ranked);
      setSummary(res.data.summary);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-3">
      <h2 className="font-semibold">AI Candidate Ranking</h2>

      {error && <ApiError error={{ message: error.message }} />}

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter candidates comma separated"
        className="w-full p-2 border rounded"
      />

      <Button onClick={handleRank} loading={loading}>
        Rank Candidates
      </Button>

      {ranked.length > 0 && (
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-left border-b">
              <th>Name</th>
              <th>Rank</th>
              <th>Score</th>
              <th>Reason</th>
            </tr>
          </thead>

          <tbody>
            {ranked.map((r, i) => (
              <tr key={i} className="border-b">
                <td>{r.name}</td>
                <td>{r.rank}</td>
                <td>{r.score}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {summary && (
        <p className="text-sm text-gray-600 mt-2">{summary}</p>
      )}
    </div>
  );
};

export default CandidateRankingTable;
