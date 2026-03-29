import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminSettingsPage from "../AdminSettings";

const mocks = vi.hoisted(() => ({
  getWorkspaceSettings: vi.fn(),
  updateWorkspaceSettings: vi.fn(),
  track: vi.fn(),
}));

vi.mock("../../lib/admin", () => ({
  getWorkspaceSettings: mocks.getWorkspaceSettings,
  updateWorkspaceSettings: mocks.updateWorkspaceSettings,
}));

vi.mock("../../lib/track", () => ({
  track: mocks.track,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminSettingsPage", () => {
  it("shows the initial load state and then renders persisted settings", async () => {
    mocks.getWorkspaceSettings.mockResolvedValue({
      settings: {
        workspaceId: "ws-1",
        displayName: "Northwind Workspace",
        updatedAt: "2026-03-28T10:00:00.000Z",
      },
    });

    render(<AdminSettingsPage />);

    expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();

    expect(await screen.findByDisplayValue("Northwind Workspace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("saves updated settings and shows success feedback", async () => {
    mocks.getWorkspaceSettings.mockResolvedValue({
      settings: {
        workspaceId: "ws-1",
        displayName: "Analytics Workspace",
        updatedAt: "2026-03-28T10:00:00.000Z",
      },
    });
    mocks.updateWorkspaceSettings.mockResolvedValue({
      settings: {
        workspaceId: "ws-1",
        displayName: "Team Alpha",
        updatedAt: "2026-03-28T11:00:00.000Z",
      },
    });

    render(<AdminSettingsPage />);

    const input = await screen.findByLabelText("Workspace display name");
    fireEvent.change(input, { target: { value: "Team Alpha" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mocks.updateWorkspaceSettings).toHaveBeenCalledWith({ displayName: "Team Alpha" });
    });
    expect(mocks.track).toHaveBeenCalledWith("settings_updated", { metadata: { section: "workspace" } });
    expect(await screen.findByText("Settings saved.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Team Alpha")).toBeInTheDocument();
  });

  it("renders an error when loading settings fails", async () => {
    mocks.getWorkspaceSettings.mockRejectedValue(new Error("Unable to load settings"));

    render(<AdminSettingsPage />);

    expect(await screen.findByText("Unable to load settings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("renders an error when saving settings fails", async () => {
    mocks.getWorkspaceSettings.mockResolvedValue({
      settings: {
        workspaceId: "ws-1",
        displayName: "Analytics Workspace",
        updatedAt: "2026-03-28T10:00:00.000Z",
      },
    });
    mocks.updateWorkspaceSettings.mockRejectedValue(new Error("Save failed"));

    render(<AdminSettingsPage />);

    const input = await screen.findByLabelText("Workspace display name");
    fireEvent.change(input, { target: { value: "Broken Save" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("falls back to the default workspace name when the field is cleared before save", async () => {
    mocks.getWorkspaceSettings.mockResolvedValue({
      settings: {
        workspaceId: "ws-1",
        displayName: "Custom Workspace",
        updatedAt: "2026-03-28T10:00:00.000Z",
      },
    });
    mocks.updateWorkspaceSettings.mockResolvedValue({
      settings: {
        workspaceId: "ws-1",
        displayName: "Analytics Workspace",
        updatedAt: "2026-03-28T11:00:00.000Z",
      },
    });

    render(<AdminSettingsPage />);

    const input = await screen.findByLabelText("Workspace display name");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mocks.updateWorkspaceSettings).toHaveBeenCalledWith({ displayName: "Analytics Workspace" });
    });
    expect(await screen.findByDisplayValue("Analytics Workspace")).toBeInTheDocument();
  });
});
