export const getCandidateStageLabel = (stage) => {
  switch (stage) {
    case "applied":
      return "Applied";
    case "shortlisted":
      return "Shortlisted";
    case "interview_scheduled":
      return "Interview Scheduled";
    case "interview_in_progress":
      return "Interview In Progress";
    case "interviewed":
      return "Interviewed";
    case "hired":
      return "Hired";
    case "rejected":
      return "Rejected";
    default:
      return stage || "Applied";
  }
};

export const getCandidateStageBadgeType = (stage) => {
  switch (stage) {
    case "hired":
      return "success";
    case "rejected":
      return "danger";
    case "shortlisted":
      return "info";
    case "interview_scheduled":
    case "interview_in_progress":
      return "warning";
    default:
      return "default";
  }
};

export const getShortlistActionLabel = (stage) => {
  return stage === "applied" ? "Shortlist" : "Allow Next Step";
};

export const getShortlistDecisionLabel = (decision) => {
  if (!decision) return "";
  return decision === "shortlisted" ? "Shortlisted" : getCandidateStageLabel(decision);
};

export const getFinalDecisionLabel = (decision) => {
  if (!decision) return "";

  switch (decision) {
    case "advance":
      return "Advance";
    case "reject":
    case "rejected":
      return "Rejected";
    case "hire":
    case "hired":
      return "Hired";
    case "hold":
      return "On Hold";
    case "pending_hr_review":
      return "Pending HR Review";
    default:
      return getCandidateStageLabel(decision);
  }
};
