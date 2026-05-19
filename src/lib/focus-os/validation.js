const VAGUE_PATTERNS = [
  /^do\s+\w+/i,
  /^work\s+on/i,
  /^improve/i,
  /^fix\s+\w+$/i,
  /^make\s+\w+\s+better/i,
  /^wso$/i,
  /^wso\s+(machen|do|work)$/i,
  /^build\s+\w+$/i,
];

const MEASURABLE_PATTERNS = [
  /\b\d+\b/,
  /\b(send|sent|publish|published|write|written|ship|shipped|call|called|review|reviewed|check|checked|finish|finished|record|recorded|create|created)\b/i,
];

export function getPlainTextFromDefinition(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      // Recursive function to extract text from TipTap JSON
      const extractText = (node) => {
        if (node.type === 'text') return node.text || "";
        if (node.content) return node.content.map(extractText).join(node.type === 'paragraph' ? '\n' : '');
        return "";
      };
      return extractText(parsed).trim();
    }
  } catch (e) {
    // Not JSON, return as is
  }
  return value;
}

export function isTaskPlannable(task = {}) {
  const hasArea = Boolean(task.area);
  const hasWorkType = Boolean(task.work_type);
  const hasEnergy = Boolean(task.energy_required);
  const hasEstimate = Boolean(task.estimated_minutes && task.estimated_minutes > 0);
  const hasValidDoD = validateDefinitionOfDone(task.definition_of_done).valid;

  return hasArea && hasWorkType && hasEnergy && hasEstimate && hasValidDoD;
}

export function validateDefinitionOfDone(text) {
  const value = getPlainTextFromDefinition(text);
  if (value.length < 8) {
    return {
      valid: false,
      reason: "Add a concrete finish line before this can be a main block.",
    };
  }

  if (VAGUE_PATTERNS.some((pattern) => pattern.test(value))) {
    return {
      valid: false,
      reason: "This is still too vague. Define the visible output.",
    };
  }

  if (!MEASURABLE_PATTERNS.some((pattern) => pattern.test(value))) {
    return {
      valid: false,
      reason: "Make it measurable: number, shipped artifact, sent message, reviewed list, or finished output.",
    };
  }

  return { valid: true, reason: "Clear enough to start." };
}

export function getGoalItemsFromDefinition(text) {
  const value = getPlainTextFromDefinition(text);
  if (!value) return [];

  const lines = value
    .split(/\n|;|,/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map((label) => ({ label, done: false }));
  }

  return [{ label: value, done: false }];
}

export function suggestDefinitionOfDone(task = {}) {
  const area = task.area || "WSO";
  const workType = task.work_type || "Cash";

  if (area === "WSO" && workType === "Cash") {
    return [
      "Review 10 leads and send 5 outreach messages",
      "Send 5 follow-ups and log every reply",
      "Qualify 10 leads and choose the next 3 best accounts",
    ];
  }

  if (area === "WSO" && workType === "Asset") {
    return [
      "Write 1 sales page section and publish the draft",
      "Improve 1 demo flow and record what changed",
      "Create 1 reusable outreach template and test it on 3 leads",
    ];
  }

  if (area === "School") {
    return [
      "Finish 1 assignment section and submit or save the draft",
      "Review 20 minutes of notes and write 5 recall questions",
      "Complete the next concrete school deliverable",
    ];
  }

  if (area === "Body") {
    return [
      "Complete the planned gym session",
      "Walk for 30 minutes without business audio",
      "Finish mobility work and log how the body feels",
    ];
  }

  return [
    "Finish 1 visible deliverable and write the next step",
    "Complete the smallest useful version and mark it done",
    "Spend 30 focused minutes and save the concrete output",
  ];
}
