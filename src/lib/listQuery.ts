// Long lists are paged on the server: the address bar holds the page, search,
// sort and filters, and only the rows for that page are read from the
// database. Shared by every list in the app.

export const PAGE_SIZES = [10, 25, 50, 100];

export type ListParams = {
  q: string;
  page: number;
  size: number;
  sort: string;
  dir: "asc" | "desc";
  /** Other filters by name, such as owner or modality. Empty means not set. */
  filter: Record<string, string>;
};

export type Paged<T> = { rows: T[]; total: number };

type Raw = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Reads the list settings from the address, falling back to safe defaults. */
export function readListParams(
  raw: Raw,
  options: { sorts: string[]; sort: string; dir: "asc" | "desc"; filters?: string[]; size?: number },
): ListParams {
  const size = Number(one(raw.size));
  const page = Math.floor(Number(one(raw.page)));
  const sort = one(raw.sort);
  const dir = one(raw.dir);
  return {
    q: one(raw.q).trim().slice(0, 100),
    page: page >= 1 ? page : 1,
    size: PAGE_SIZES.includes(size) ? size : (options.size ?? PAGE_SIZES[0]),
    sort: options.sorts.includes(sort) ? sort : options.sort,
    dir: dir === "asc" || dir === "desc" ? dir : options.dir,
    filter: Object.fromEntries((options.filters ?? []).map((name) => [name, one(raw[name]).slice(0, 60)])),
  };
}

/** Rows to skip for the requested page. */
export function offsetOf(params: ListParams) {
  return (params.page - 1) * params.size;
}

/** Text for a LIKE match that treats the search as plain text. */
export function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

/** The address of this list with some settings changed. Empty values are left out. */
export function listHref(path: string, current: ListParams, change: Partial<Record<string, string | number>>) {
  const values: Record<string, string> = {
    q: current.q,
    page: String(current.page),
    size: String(current.size),
    sort: current.sort,
    dir: current.dir,
    ...current.filter,
  };
  for (const [key, value] of Object.entries(change)) values[key] = value === undefined ? "" : String(value);
  // Anything other than moving between pages starts again at page one.
  if (!("page" in change)) values.page = "1";
  const query = new URLSearchParams(
    Object.entries(values).filter(([key, value]) => value && !(key === "page" && value === "1")),
  ).toString();
  return query ? `${path}?${query}` : path;
}
