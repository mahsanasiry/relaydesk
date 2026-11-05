import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createQueryClient } from "@/lib/query/client";
import { QueryProvider } from "@/lib/query/provider";

describe("createQueryClient", () => {
  it("keeps data fresh briefly and never retries a mutation", () => {
    const defaults = createQueryClient().getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it("gives each provider its own client", () => {
    function Probe({ id }: { id: string }) {
      const client = useQueryClient();
      client.setQueryData(["probe", id], true);
      return <p>{id}</p>;
    }

    const { unmount } = render(
      <QueryProvider>
        <Probe id="first" />
      </QueryProvider>,
    );
    expect(screen.getByText("first")).toBeInTheDocument();
    unmount();

    function Check() {
      return <p>{String(useQueryClient().getQueryData(["probe", "first"]))}</p>;
    }
    render(
      <QueryProvider>
        <Check />
      </QueryProvider>,
    );
    expect(screen.getByText("undefined")).toBeInTheDocument();
  });
});
