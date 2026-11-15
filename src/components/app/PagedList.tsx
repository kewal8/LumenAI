import type { ListParams } from "@/lib/listQuery";
import { ListSearch, Pager } from "./ListControls";
import { EmptyState, PANEL } from "./ui";

/**
 * A list whose rows the server has already searched and cut to one page:
 * search above, rows in a panel, and the count and pages underneath. Rows are
 * passed in as list items.
 */
export function PagedList({
  path,
  params,
  total,
  placeholder,
  noun,
  single,
  head,
  filters,
  bar,
  children,
}: {
  path: string;
  params: ListParams;
  /** How many match across every page. */
  total: number;
  placeholder: string;
  noun: string;
  single?: string;
  /** Column headings, drawn inside the panel above the rows. */
  head?: React.ReactNode;
  /** Filter dropdowns and the ⋯ menu, shown beside the search. */
  filters?: React.ReactNode;
  /** Shown under the search, such as the bar for deleting several rows. */
  bar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 basis-80">
          <ListSearch path={path} params={params} placeholder={placeholder} />
        </div>
        {filters}
      </div>
      {bar}
      {total === 0 ? (
        <EmptyState title="Nothing matches" body="Check the spelling, or clear the filters." />
      ) : (
        <div className={`${PANEL} overflow-hidden`}>
          {head}
          <ul>{children}</ul>
          <Pager path={path} params={params} total={total} noun={noun} single={single} />
        </div>
      )}
    </div>
  );
}
