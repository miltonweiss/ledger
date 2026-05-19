"use client";

import { Check, Scissors, Sparkles } from "lucide-react";
import { greenToast, redToast } from "@/components/toasts";

export default function FocusProposalCard({ proposal, tasks = [], onApplied }) {
  if (!proposal) return null;

  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const keepIds = proposal.keep_task_ids || [
    proposal.main_block_task_id,
    proposal.side_block_task_id,
  ].filter(Boolean);

  async function handleApply() {
    const hasKills = Array.isArray(proposal.kill_task_ids) && proposal.kill_task_ids.length > 0;
    const confirmKill = hasKills
      ? window.confirm("This proposal kills tasks permanently by setting killed_at. Apply kills too?")
      : false;

    const response = await fetch("/api/focus-os/apply-proposal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal, confirmKill }),
    });

    if (!response.ok) {
      redToast("Proposal failed", "The Focus OS proposal could not be applied.");
      return;
    }

    greenToast("Proposal applied", "Your day was cleaned and saved.");
    onApplied?.();
  }

  return (
    <div className="focus-proposal">
      <div className="flex items-start gap-3">
        <Sparkles />
        <div>
          <h4>{proposal.title || "Focus OS proposal"}</h4>
          <p>{proposal.summary || "A smaller plan for today."}</p>
        </div>
      </div>

      {proposal.stop_permission ? (
        <div className="focus-proposal-section">
          <p className="text-sm bold">{proposal.stop_permission.title}</p>
          <p className="text-sm deemphasize">{proposal.stop_permission.message}</p>
          {(proposal.stop_permission.checks || []).map((check) => (
            <div key={check.label} className="focus-mini-row">
              <Check size={14} />
              <span className={check.done ? "" : "deemphasize"}>{check.done ? "Yes" : "Missing"}: {check.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {keepIds.length > 0 ? (
        <ProposalList title="Keep" ids={keepIds} taskMap={taskMap} fallback={proposal.keep_tasks} />
      ) : null}
      {proposal.cut_task_ids?.length ? (
        <ProposalList title="Cut today" ids={proposal.cut_task_ids} taskMap={taskMap} fallback={proposal.cut_tasks} />
      ) : null}
      {proposal.move_tasks?.length ? (
        <div className="focus-proposal-section">
          <p className="text-sm bold">Move</p>
          {proposal.move_tasks.map((move) => (
            <p key={move.id} className="text-sm deemphasize">
              {taskName(move.id, taskMap, proposal.move_task_names)} {move.due ? `to ${move.due}` : "off today"}
            </p>
          ))}
        </div>
      ) : null}
      {proposal.kill_task_ids?.length ? (
        <ProposalList title="Kill" ids={proposal.kill_task_ids} taskMap={taskMap} fallback={proposal.kill_tasks} />
      ) : null}

      {proposal.kind !== "can_stop" ? (
        <button className="accent-btn" onClick={handleApply}>
          <Scissors size={16} />
          Apply proposal
        </button>
      ) : null}
    </div>
  );
}

function ProposalList({ title, ids, taskMap, fallback = [] }) {
  return (
    <div className="focus-proposal-section">
      <p className="text-sm bold">{title}</p>
      {ids.map((id, index) => (
        <p key={id || index} className="text-sm deemphasize">
          {taskName(id, taskMap, fallback)}
        </p>
      ))}
    </div>
  );
}

function taskName(id, taskMap, fallback = []) {
  if (taskMap.has(id)) return taskMap.get(id).name;
  const byId = fallback.find((task) => task.id === id);
  if (byId?.name) return byId.name;
  return id || "Untitled task";
}
