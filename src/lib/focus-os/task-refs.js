export function isExternalTaskId(id) {
  return typeof id === "string" && id.includes(":");
}

export function getMainBlockTaskId(dailyLog) {
  return dailyLog?.main_block_external_id || dailyLog?.main_block_task_id || null;
}

export function getSideBlockTaskId(dailyLog) {
  return dailyLog?.side_block_external_id || dailyLog?.side_block_task_id || null;
}

export function getCutTaskIds(dailyLog) {
  return [
    ...(dailyLog?.cut_task_ids || []),
    ...(dailyLog?.cut_task_external_ids || []),
  ];
}

export function taskSelectionUpdates(kind, id) {
  const uuidColumn = kind === "main" ? "main_block_task_id" : "side_block_task_id";
  const externalColumn = kind === "main" ? "main_block_external_id" : "side_block_external_id";

  if (!id) {
    return {
      [uuidColumn]: null,
      [externalColumn]: null,
    };
  }

  return isExternalTaskId(id)
    ? { [uuidColumn]: null, [externalColumn]: id }
    : { [uuidColumn]: id, [externalColumn]: null };
}

export function splitTaskIdsByStorage(ids = []) {
  return ids.reduce(
    (groups, id) => {
      if (!id) return groups;
      if (isExternalTaskId(id)) groups.externalIds.push(id);
      else groups.supabaseIds.push(id);
      return groups;
    },
    { supabaseIds: [], externalIds: [] },
  );
}
