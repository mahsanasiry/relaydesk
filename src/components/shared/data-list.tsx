import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  cell: (item: T) => ReactNode;
  /** The column that names the row. It is the row header in the table and the title on a card. */
  primary?: boolean;
}

interface DataListProps<T> {
  caption: string;
  items: readonly T[];
  columns: readonly Column<T>[];
  getKey: (item: T) => string;
}

const headerCell = "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

/** A table on wide screens and a stack of cards on narrow ones, from the same column list. */
export function DataList<T>({ caption, items, columns, getKey }: DataListProps<T>) {
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const others = columns.filter((column) => column !== primary);

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border">
            <tr>
              {columns.map((column) => (
                <th key={column.header} scope="col" className={headerCell}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={getKey(item)}>
                {columns.map((column) =>
                  column === primary ? (
                    <th key={column.header} scope="row" className="px-3 py-3 align-top font-medium">
                      {column.cell(item)}
                    </th>
                  ) : (
                    <td key={column.header} className="px-3 py-3 align-top">
                      {column.cell(item)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label={caption} className="space-y-3 md:hidden">
        {items.map((item) => (
          <li key={getKey(item)} className="rounded-lg border border-border bg-surface p-4">
            {primary ? <div className="font-medium">{primary.cell(item)}</div> : null}
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {others.map((column) => (
                <div key={column.header} className="contents">
                  <dt className="text-muted-foreground">{column.header}</dt>
                  <dd>{column.cell(item)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
