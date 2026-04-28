import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminEventsPage from "../AdminEvents";

const mocks = vi.hoisted(() => ({
  getActivity: vi.fn(),
}));

vi.mock("../../api/adminAnalytics", () => ({
  getActivity: mocks.getActivity,
}));

afterEach(() => {
  vi.resetAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminEventsPage />
    </MemoryRouter>
  );
}

describe("AdminEventsPage", () => {
  it("keeps the events explorer read-only and does not expose mutation controls", async () => {
    mocks.getActivity.mockResolvedValue({
      events: [
        {
          id: "evt-1",
          eventName: "order_created",
          userId: "user-1",
          actorLabel: "Admin User",
          createdAt: "2026-03-28T10:00:00.000Z",
          productId: "product-12345678",
          orderId: "order-12345678",
          metadata: { plan: "pro", total: 49 },
        },
      ],
      nextCursor: null,
    });

    renderPage();

    expect((await screen.findAllByText("order_created")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /create event/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "View" }).length).toBeGreaterThan(0);
  });

  it("renders events and lets the user inspect metadata", async () => {
    mocks.getActivity.mockResolvedValue({
      events: [
        {
          id: "evt-1",
          eventName: "order_created",
          userId: "user-1",
          actorLabel: "Admin User",
          createdAt: "2026-03-28T10:00:00.000Z",
          productId: "product-12345678",
          orderId: "order-12345678",
          metadata: { plan: "pro", total: 49 },
        },
      ],
      nextCursor: null,
    });

    renderPage();

    expect((await screen.findAllByText("order_created")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Admin User/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('{"plan":"pro","total":49}').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]);

    expect((await screen.findAllByText(/"plan": "pro"/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/"total": 49/).length).toBeGreaterThan(0);
  });

  it("filters rendered events by event type and applies search after debounce", async () => {
    mocks.getActivity
      .mockResolvedValueOnce({
        events: [
          {
            id: "evt-1",
            eventName: "order_created",
            userId: "user-1",
            actorLabel: "Admin User",
            createdAt: "2026-03-28T10:00:00.000Z",
            productId: "product-12345678",
            orderId: "order-12345678",
            metadata: { plan: "pro" },
          },
          {
            id: "evt-2",
            eventName: "login",
            userId: "user-2",
            actorLabel: "Viewer User",
            createdAt: "2026-03-28T11:00:00.000Z",
            productId: null,
            orderId: null,
            metadata: null,
          },
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        events: [],
        nextCursor: null,
      });

    renderPage();

    expect((await screen.findAllByText("order_created")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("login").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Filter by event type" }));
    const eventTypeOptions = await screen.findAllByRole("button", { name: "order_created" });
    fireEvent.click(eventTypeOptions[eventTypeOptions.length - 1]!);

    expect(screen.getAllByText("order_created").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("login")).toHaveLength(0);

    fireEvent.change(screen.getByPlaceholderText("Search by event, id, metadata..."), {
      target: { value: "missing" },
    });

    await waitFor(() => {
      expect(mocks.getActivity).toHaveBeenLastCalledWith("30d", 50, "missing");
    });
    expect(await screen.findByText("No events match the current filters.")).toBeInTheDocument();
  });

  it("shows the general empty state when the workspace has no events", async () => {
    mocks.getActivity.mockResolvedValue({
      events: [],
      nextCursor: null,
    });

    renderPage();

    expect(await screen.findByText("No events found yet for this workspace.")).toBeInTheDocument();
  });

  it("shows the error state and retries loading events", async () => {
    mocks.getActivity
      .mockRejectedValueOnce(new Error("Events failed"))
      .mockResolvedValueOnce({
        events: [
          {
            id: "evt-1",
            eventName: "settings_updated",
            userId: "user-1",
            actorLabel: "Admin User",
            createdAt: "2026-03-28T10:00:00.000Z",
            productId: null,
            orderId: null,
            metadata: { section: "workspace" },
          },
        ],
        nextCursor: null,
      });

    renderPage();

    expect(await screen.findByText("Events failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect((await screen.findAllByText("settings_updated")).length).toBeGreaterThan(0);
    expect(mocks.getActivity).toHaveBeenCalledTimes(2);
  });
});
