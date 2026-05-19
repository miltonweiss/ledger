"use client";

import { AREAS, BLOCK_TYPES, ENERGY_LEVELS, WORK_TYPES } from "@/lib/focus-os/constants.js";

export function FocusSelect({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold opacity-50 uppercase tracking-wider">{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value || null)} className="focus-input">
        <option value="">Unset</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function AreaSelect(props) {
  return <FocusSelect label="Area" options={AREAS} {...props} />;
}

export function WorkTypeSelect(props) {
  return <FocusSelect label="Work Type" options={WORK_TYPES} {...props} />;
}

export function BlockTypeSelect(props) {
  return <FocusSelect label="Block Type" options={BLOCK_TYPES} {...props} />;
}

export function EnergySelect(props) {
  return <FocusSelect label="Energy" options={ENERGY_LEVELS} {...props} />;
}
