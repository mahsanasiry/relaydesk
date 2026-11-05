import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "@/components/ui/toast";

function Trigger() {
  const { notify } = useToast();
  return (
    <button type="button" onClick={() => notify("success", "Request saved.")}>
      Save
    </button>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastProvider", () => {
  it("announces a message in a live region and lets the person dismiss it", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status")).toHaveTextContent("Request saved.");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.getByRole("status")).not.toHaveTextContent("Request saved.");
  });

  it("removes a message by itself after a few seconds", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByRole("status")).not.toHaveTextContent("Request saved.");
  });

  it("refuses to be used outside a provider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<Trigger />)).toThrow("useToast must be used inside ToastProvider.");
    quiet.mockRestore();
  });
});
