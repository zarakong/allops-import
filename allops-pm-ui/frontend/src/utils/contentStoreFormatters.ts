const KB_PER_GB = 1024 * 1024;

const normalizeNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
};

export const formatGbNumber = (kbValue: unknown): number | null => {
  const numeric = normalizeNumber(kbValue);
  if (numeric === null) {
    return null;
  }
  return numeric / KB_PER_GB;
};

export const formatGbLabel = (kbValue: unknown): string => {
  const gb = formatGbNumber(kbValue);
  if (gb === null) {
    return '-';
  }
  return `${gb.toFixed(2)} GB`;
};

export const formatDateIso = (value?: string | number | null): string => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toISOString().slice(0, 10);
};

export const extractVersionText = (value: unknown): string => {
  if (!value) {
    return '-';
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return '-';
    }
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'string') {
        return parsed;
      }
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).join(' | ') || '-';
      }
      if (typeof parsed === 'object' && parsed !== null) {
        const values = Object.values(parsed as Record<string, unknown>)
          .filter(Boolean)
          .map(String);
        return values.join(' | ') || '-';
      }
    } catch (error) {
      return text;
    }
    return text;
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String).join(' | ') || '-';
  }
  if (typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>)
      .filter(Boolean)
      .map(String);
    return values.join(' | ') || '-';
  }
  return String(value);
};

export type VersionEntry = {
  label?: string;
  value: string;
};

const splitInlinePairs = (text: string): VersionEntry[] => {
  let lines = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    const pipeParts = text.split('|').map((part) => part.trim()).filter(Boolean);
    if (pipeParts.length > 1) {
      lines = pipeParts;
    }
  }

  if (lines.length === 0) {
    return text ? [{ value: text }] : [];
  }

  return lines.map((line) => {
    const match = line.match(/^[^=:]+(?:=|:).+/);
    if (match) {
      const [label, ...rest] = line.split(/=|:/);
      const value = rest.join('=').trim();
      return {
        label: label.trim(),
        value: value || '-',
      };
    }
    return { value: line };
  });
};

const normalizeVersionEntries = (input: unknown): VersionEntry[] => {
  if (input === null || input === undefined) {
    return [];
  }

  if (typeof input === 'string') {
    const text = input.trim();
    if (!text) {
      return [];
    }
    try {
      const parsed = JSON.parse(text);
      return normalizeVersionEntries(parsed);
    } catch (error) {
      return splitInlinePairs(text);
    }
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => normalizeVersionEntries(item));
  }

  if (typeof input === 'object') {
    return Object.entries(input as Record<string, unknown>)
      .map(([label, rawValue]) => {
        const value = rawValue === null || rawValue === undefined ? '-' : String(rawValue).trim();
        return {
          label,
          value: value || '-',
        };
      })
      .filter((entry) => Boolean(entry.value));
  }

  return [{ value: String(input) }];
};

export const extractVersionEntries = (value: unknown): VersionEntry[] => {
  return normalizeVersionEntries(value);
};

export { KB_PER_GB };
