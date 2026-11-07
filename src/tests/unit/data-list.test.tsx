import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataList } from "@/components/shared/data-list";

interface Row {
  id: string;
  name: string;
  count: number;
}

const columns = [
  { header: "Name", primary: true, cell: (row: Row) => row.name },
  { header: "Count", cell: (row: Row) => row.count },
];

describe("DataList", () => {
  it("renders the same rows as a table and as cards", () => {
    render(
      <DataList
        caption="Things"
        items={[
          { id: "1", name: "Alpha", count: 3 },
          { id: "2", name: "Beta", count: 0 },
        ]}
        columns={columns}
        getKey={(row) => row.id}
      />,
    );

    const table = screen.getByRole("table", { name: "Things" });
    expect(within(table).getByRole("rowheader", { name: "Alpha" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
