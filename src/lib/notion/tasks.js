import { DEFAULT_TASK_VALUES } from "@/lib/focus-os/constants.js";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = process.env.NOTION_API_VERSION || "2022-06-28";

const FIELD_CONFIG = {
  name: {
    env: ["NOTION_TASK_NAME_PROPERTY", "NOTION_TASK_TITLE_PROPERTY"],
    aliases: ["Name", "Task", "Task Name", "Todo", "Title", "Aufgabe"],
    types: ["title"],
  },
  done: {
    env: ["NOTION_TASK_DONE_PROPERTY", "NOTION_TASK_STATUS_PROPERTY"],
    aliases: ["Done", "Done?", "Completed", "Complete", "Erledigt", "Status", "Select"],
    types: ["checkbox", "status", "select"],
  },
  due: {
    env: ["NOTION_TASK_DUE_PROPERTY", "NOTION_TASK_DUE_DATE_PROPERTY"],
    aliases: ["Due", "Due Date", "Deadline", "Date", "Datum", "Fällig", "Fällig am"],
    types: ["date"],
  },
  priority: {
    env: ["NOTION_TASK_PRIORITY_PROPERTY"],
    aliases: ["Priority", "Priorität", "Importance", "Wichtigkeit"],
    types: ["select", "status"],
  },
  area: {
    env: ["NOTION_TASK_AREA_PROPERTY"],
    aliases: ["Area", "Bereich"],
    types: ["select", "multi_select", "rich_text"],
  },
  work_type: {
    env: ["NOTION_TASK_WORK_TYPE_PROPERTY"],
    aliases: ["Work Type", "Work type", "Type", "Art"],
    types: ["select", "multi_select", "rich_text"],
  },
  block_type: {
    env: ["NOTION_TASK_BLOCK_TYPE_PROPERTY"],
    aliases: ["Block Type", "Block"],
    types: ["select", "multi_select", "rich_text"],
  },
  energy_required: {
    env: ["NOTION_TASK_ENERGY_PROPERTY", "NOTION_TASK_ENERGY_REQUIRED_PROPERTY"],
    aliases: ["Energy", "Energy Required", "Energie"],
    types: ["select", "multi_select", "rich_text"],
  },
  definition_of_done: {
    env: ["NOTION_TASK_DEFINITION_PROPERTY", "NOTION_TASK_DOD_PROPERTY"],
    aliases: ["Definition of Done", "DoD", "Definition"],
    types: ["rich_text", "title"],
  },
  estimated_minutes: {
    env: ["NOTION_TASK_ESTIMATE_PROPERTY", "NOTION_TASK_ESTIMATED_MINUTES_PROPERTY"],
    aliases: ["Estimated Minutes", "Est. Minutes", "Estimate", "Estimated", "Minutes", "Dauer"],
    types: ["number"],
  },
  actual_minutes: {
    env: ["NOTION_TASK_ACTUAL_PROPERTY", "NOTION_TASK_ACTUAL_MINUTES_PROPERTY"],
    aliases: ["Actual Minutes", "Logged", "Logged Minutes", "Actual"],
    types: ["number"],
  },
  completed_at: {
    env: ["NOTION_TASK_COMPLETED_AT_PROPERTY"],
    aliases: ["Completed At", "Done At", "Erledigt am"],
    types: ["date"],
  },
  killed_at: {
    env: ["NOTION_TASK_KILLED_AT_PROPERTY"],
    aliases: ["Killed At", "Archived At", "Removed At"],
    types: ["date"],
  },
};

let schemaPromise;

export function notionTaskId(pageId) {
  return `notion:${pageId}`;
}

export function notionPageIdFromTaskId(id) {
  return String(id || "").replace(/^notion:/, "");
}

export function isNotionConfigured() {
  return Boolean(getNotionAuth() && getNotionDatabaseId());
}

export async function getNotionTasks() {
  if (!isNotionConfigured()) return [];

  const { mapping } = await getTaskSchema();
  const pages = [];
  let startCursor;

  do {
    const body = {
      page_size: 100,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    };
    if (startCursor) body.start_cursor = startCursor;

    const result = await notionRequest(`/databases/${getNotionDatabaseId()}/query`, {
      method: "POST",
      body,
    });

    pages.push(...(result.results || []));
    startCursor = result.has_more ? result.next_cursor : null;
  } while (startCursor);

  return pages
    .map((page) => notionPageToTask(page, mapping))
    .filter((task) => !task.killed_at);
}

export async function getNotionTask(id) {
  if (!isNotionConfigured()) return null;

  const pageId = notionPageIdFromTaskId(id);
  const [{ mapping }, page] = await Promise.all([
    getTaskSchema(),
    notionRequest(`/pages/${pageId}`),
  ]);

  return notionPageToTask(page, mapping);
}

export async function createNotionTask(todo) {
  if (!isNotionConfigured()) return null;

  const { mapping } = await getTaskSchema();
  const properties = taskUpdatesToNotionProperties(
    {
      name: todo.name,
      done: todo.done || false,
      due: todo.due || null,
      priority: todo.priority || "Average",
      area: todo.area || null,
      work_type: todo.work_type || null,
      block_type: todo.block_type || null,
      energy_required: todo.energy_required || null,
      definition_of_done: todo.definition_of_done || null,
      estimated_minutes: todo.estimated_minutes || null,
      actual_minutes: todo.actual_minutes || 0,
      completed_at: todo.done ? new Date().toISOString() : null,
    },
    mapping,
  );

  if (!Object.keys(properties).length) return null;

  const page = await notionRequest("/pages", {
    method: "POST",
    body: {
      parent: { database_id: getNotionDatabaseId() },
      properties,
    },
  });

  return notionPageToTask(page, mapping);
}

export async function updateNotionTask(id, updates) {
  if (!isNotionConfigured()) return null;

  const pageId = notionPageIdFromTaskId(id);
  const { mapping } = await getTaskSchema();
  const nextUpdates = { ...updates };

  if (Object.prototype.hasOwnProperty.call(nextUpdates, "done")) {
    nextUpdates.completed_at = nextUpdates.done ? new Date().toISOString() : null;
  }

  const properties = taskUpdatesToNotionProperties(nextUpdates, mapping);
  if (!Object.keys(properties).length) return getNotionTask(pageId);

  const page = await notionRequest(`/pages/${pageId}`, {
    method: "PATCH",
    body: { properties },
  });

  return notionPageToTask(page, mapping);
}

export async function archiveNotionTask(id) {
  if (!isNotionConfigured()) return true;

  const pageId = notionPageIdFromTaskId(id);
  await notionRequest(`/pages/${pageId}`, {
    method: "PATCH",
    body: trashPagePayload(),
  });

  return true;
}

function trashPagePayload() {
  return NOTION_VERSION >= "2026-03-11" ? { in_trash: true } : { archived: true };
}

async function getTaskSchema() {
  if (!schemaPromise) {
    schemaPromise = notionRequest(`/databases/${getNotionDatabaseId()}`).then((database) => ({
      database,
      mapping: buildFieldMapping(database.properties || {}),
    }));
  }

  return schemaPromise;
}

function buildFieldMapping(properties) {
  const entries = Object.entries(properties).map(([name, property]) => ({
    name,
    type: property.type,
    property,
    normalizedName: normalizeName(name),
  }));

  return Object.fromEntries(
    Object.entries(FIELD_CONFIG).map(([field, config]) => [
      field,
      resolveField(entries, config),
    ]),
  );
}

function resolveField(entries, config) {
  const envName = config.env.map((name) => process.env[name]).find(Boolean);
  if (envName) {
    const envEntry = entries.find((entry) => entry.name === envName);
    if (envEntry) return envEntry;
  }

  const normalizedAliases = config.aliases.map(normalizeName);
  const typedEntries = entries.filter((entry) => config.types.includes(entry.type));
  const exact = typedEntries.find((entry) => normalizedAliases.includes(entry.normalizedName));
  if (exact) return exact;

  return typedEntries.find((entry) =>
    normalizedAliases.some((alias) => entry.normalizedName.includes(alias) || alias.includes(entry.normalizedName)),
  ) || null;
}

function notionPageToTask(page, mapping) {
  const values = {};

  for (const field of Object.keys(FIELD_CONFIG)) {
    const mapped = mapping[field];
    values[field] = mapped ? readPropertyValue(page.properties?.[mapped.name], field) : null;
  }

  const name = values.name || "Untitled";

  return {
    id: notionTaskId(page.id),
    source: "notion",
    notion_page_id: page.id,
    notion_url: page.url,
    name,
    done: Boolean(values.done),
    due: values.due,
    priority: normalizePriority(values.priority),
    area: values.area || DEFAULT_TASK_VALUES.area,
    work_type: values.work_type || DEFAULT_TASK_VALUES.work_type,
    block_type: values.block_type || DEFAULT_TASK_VALUES.block_type,
    energy_required: values.energy_required || DEFAULT_TASK_VALUES.energy_required,
    definition_of_done: values.definition_of_done || `Finish ${name}`,
    estimated_minutes: values.estimated_minutes || DEFAULT_TASK_VALUES.estimated_minutes,
    actual_minutes: values.actual_minutes || 0,
    completed_at: values.completed_at,
    killed_at: values.killed_at,
    created_at: page.created_time,
    updated_at: page.last_edited_time,
  };
}

function taskUpdatesToNotionProperties(updates, mapping) {
  const properties = {};

  for (const [field, value] of Object.entries(updates)) {
    const mapped = mapping[field];
    if (!mapped) continue;

    const propertyValue = buildPropertyValue(mapped, field, value);
    if (propertyValue !== undefined) {
      properties[mapped.name] = propertyValue;
    }
  }

  return properties;
}

function readPropertyValue(property, field) {
  if (!property) return null;

  switch (property.type) {
    case "title":
      return plainText(property.title);
    case "rich_text":
      return plainText(property.rich_text);
    case "checkbox":
      return Boolean(property.checkbox);
    case "date":
      return property.date?.start || null;
    case "select":
      return field === "done"
        ? isDoneStatus(property.select?.name)
        : property.select?.name || null;
    case "status":
      return field === "done"
        ? isDoneStatus(property.status?.name)
        : property.status?.name || null;
    case "multi_select":
      return property.multi_select?.[0]?.name || null;
    case "number":
      return property.number ?? null;
    default:
      return null;
  }
}

function buildPropertyValue(mapped, field, value) {
  switch (mapped.type) {
    case "title":
      return { title: textArray(value) };
    case "rich_text":
      return { rich_text: textArray(value) };
    case "checkbox":
      return { checkbox: Boolean(value) };
    case "date":
      return { date: value ? { start: String(value) } : null };
    case "select": {
      const optionName = field === "done"
        ? doneOptionNameFor(mapped, Boolean(value))
        : optionNameFor(mapped, field, value);
      return { select: optionName ? { name: optionName } : null };
    }
    case "status": {
      const statusName = field === "done"
        ? doneOptionNameFor(mapped, Boolean(value))
        : optionNameFor(mapped, field, value);
      return statusName ? { status: { name: statusName } } : undefined;
    }
    case "multi_select": {
      const optionName = optionNameFor(mapped, field, value);
      return { multi_select: optionName ? [{ name: optionName }] : [] };
    }
    case "number": {
      if (value === "" || value === null || value === undefined) return { number: null };
      const number = Number(value);
      return Number.isFinite(number) ? { number } : undefined;
    }
    default:
      return undefined;
  }
}

async function notionRequest(path, options = {}) {
  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${getNotionAuth()}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let details = "";
    try {
      const payload = await response.json();
      details = payload.message || JSON.stringify(payload);
    } catch {
      details = await response.text();
    }
    throw new Error(`Notion request failed (${response.status}): ${details}`);
  }

  return response.json();
}

function getNotionAuth() {
  return process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
}

function getNotionDatabaseId() {
  return process.env.NOTION_DB_ID || process.env.NOTION_DATABASE_ID || process.env.NOTION_TASKS_DATABASE_ID;
}

function textArray(value) {
  const content = typeof value === "string" ? value : value == null ? "" : String(value);
  return content ? [{ text: { content } }] : [];
}

function plainText(parts = []) {
  return parts.map((part) => part.plain_text || part.text?.content || "").join("");
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]/g, "");
}

function isDoneStatus(statusName) {
  const normalized = normalizeName(statusName);
  return ["done", "completed", "complete", "finished", "erledigt"].includes(normalized);
}

function doneOptionNameFor(mapped, done) {
  const envName = done ? process.env.NOTION_TASK_DONE_STATUS_NAME : process.env.NOTION_TASK_OPEN_STATUS_NAME;
  if (envName) return envName;

  const options = mapped.property[mapped.type]?.options || [];
  const candidates = done
    ? ["Done", "Completed", "Complete", "Finished", "Erledigt"]
    : ["Not started", "To Do", "Todo", "Open", "Backlog", "Nicht begonnen"];

  return findOption(options, candidates) || (done ? "Done" : options.find((option) => !isDoneStatus(option.name))?.name);
}

function optionNameFor(mapped, field, value) {
  if (!value) return null;

  const raw = String(value);
  const options = mapped.property[mapped.type]?.options || [];
  const candidates = [raw];

  if (field === "priority") {
    if (raw === "Important") candidates.push("High", "Urgent", "P1");
    if (raw === "Average") candidates.push("Medium", "Normal");
    if (raw === "For sometime") candidates.push("Low", "Someday", "Later");
  }

  return findOption(options, candidates) || raw;
}

function findOption(options, candidates) {
  const normalizedCandidates = candidates.map(normalizeName);
  return options.find((option) => normalizedCandidates.includes(normalizeName(option.name)))?.name || null;
}

function normalizePriority(value) {
  const normalized = normalizeName(value);
  if (["high", "urgent", "p1", "important"].includes(normalized)) return "Important";
  if (["medium", "normal", "average"].includes(normalized)) return "Average";
  if (["low", "later", "someday", "forsometime"].includes(normalized)) return "For sometime";
  return value || "Average";
}
