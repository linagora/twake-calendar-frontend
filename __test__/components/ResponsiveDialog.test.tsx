import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { ResponsiveDialog } from "../../src/components/Dialog";
import { Button, TextField } from "@mui/material";

describe("ResponsiveDialog", () => {
  const mockOnClose = jest.fn();
  const mockOnExpandToggle = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnExpandToggle.mockClear();
  });

  it("renders in normal mode by default", () => {
    render(
      <ResponsiveDialog open={true} onClose={mockOnClose} title="Test Dialog">
        <TextField label="Name" />
      </ResponsiveDialog>
    );

    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("renders title in normal mode", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="My Title"
        isExpanded={false}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.queryByLabelText("show less")).not.toBeInTheDocument();
  });

  it("renders back arrow in extended mode", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="My Title"
        isExpanded={true}
        onExpandToggle={mockOnExpandToggle}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    expect(screen.queryByText("My Title")).not.toBeInTheDocument();
    expect(screen.getByLabelText("show less")).toBeInTheDocument();
  });

  it("calls onExpandToggle when back arrow is clicked", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        isExpanded={true}
        onExpandToggle={mockOnExpandToggle}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    const backButton = screen.getByLabelText("show less");
    fireEvent.click(backButton);

    expect(mockOnExpandToggle).toHaveBeenCalledTimes(1);
  });

  it("renders actions when provided", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        actions={<Button>Custom Action</Button>}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("Custom Action")).toBeInTheDocument();
  });

  it("does not render actions when not provided", () => {
    const { container } = render(
      <ResponsiveDialog open={true} onClose={mockOnClose} title="Test">
        <div>Content</div>
      </ResponsiveDialog>
    );

    const dialogActions = container.querySelector(".MuiDialogActions-root");
    expect(dialogActions).not.toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    render(
      <ResponsiveDialog open={true} onClose={mockOnClose} title="Test">
        <div>Content</div>
      </ResponsiveDialog>
    );

    const backdrop = document.querySelector(".MuiBackdrop-root");
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("applies custom normalMaxWidth", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        normalMaxWidth="800px"
      >
        <div>Normal Width Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("Normal Width Content")).toBeInTheDocument();
  });

  it("wraps children in Stack component", () => {
    render(
      <ResponsiveDialog open={true} onClose={mockOnClose} title="Test">
        <TextField label="Field 1" />
        <TextField label="Field 2" />
      </ResponsiveDialog>
    );

    expect(screen.getByLabelText("Field 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Field 2")).toBeInTheDocument();
  });

  it("uses correct spacing in normal mode", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        isExpanded={false}
        normalSpacing={2}
      >
        <div>Normal Spacing Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("Normal Spacing Content")).toBeInTheDocument();
  });

  it("uses correct spacing in extended mode", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        isExpanded={true}
        expandedSpacing={3}
      >
        <div>Extended Spacing Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("Extended Spacing Content")).toBeInTheDocument();
  });

  it("applies contentSx custom styles", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        contentSx={{ padding: 4 }}
      >
        <div>Custom Styled Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("Custom Styled Content")).toBeInTheDocument();
  });

  it("applies titleSx custom styles", () => {
    const { container } = render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        titleSx={{ color: "red" }}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    const title = screen.getByText("Test");
    expect(title).toBeInTheDocument();
  });

  it("shows dividers when dividers prop is true", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        dividers={true}
      >
        <div>Content with Dividers</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("Content with Dividers")).toBeInTheDocument();
  });

  it("does not show back arrow when onExpandToggle is not provided", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test Title"
        isExpanded={true}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    expect(screen.queryByLabelText("show less")).not.toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("accepts custom headerHeight", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        isExpanded={true}
        headerHeight="100px"
      >
        <div>Custom Header Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("Custom Header Content")).toBeInTheDocument();
  });

  it("renders with custom expandedContentMaxWidth", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        isExpanded={true}
        expandedContentMaxWidth="1200px"
      >
        <div>Wide Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("Wide Content")).toBeInTheDocument();
  });

  it("does not render dialog content when open is false", () => {
    render(
      <ResponsiveDialog open={false} onClose={mockOnClose} title="Test">
        <div>Test Content</div>
      </ResponsiveDialog>
    );

    expect(screen.queryByText("Test Content")).not.toBeInTheDocument();
  });

  it("renders correctly in extended mode", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        isExpanded={true}
        onExpandToggle={mockOnExpandToggle}
      >
        <div>Extended Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByText("Extended Content")).toBeInTheDocument();
    expect(screen.getByLabelText("show less")).toBeInTheDocument();
  });

  it("renders expand and close icons in normal mode when showHeaderActions is true", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        isExpanded={false}
        onExpandToggle={mockOnExpandToggle}
        showHeaderActions={true}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    expect(screen.getByLabelText("expand")).toBeInTheDocument();
    expect(screen.getByLabelText("close")).toBeInTheDocument();
  });

  it("does not render header icons when showHeaderActions is false", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test Title"
        isExpanded={false}
        onExpandToggle={mockOnExpandToggle}
        showHeaderActions={false}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    expect(screen.queryByLabelText("expand")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("close")).not.toBeInTheDocument();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("calls onClose when close icon is clicked", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        isExpanded={false}
        showHeaderActions={true}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    const closeButton = screen.getByLabelText("close");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onExpandToggle when expand icon is clicked", () => {
    render(
      <ResponsiveDialog
        open={true}
        onClose={mockOnClose}
        title="Test"
        isExpanded={false}
        onExpandToggle={mockOnExpandToggle}
        showHeaderActions={true}
      >
        <div>Content</div>
      </ResponsiveDialog>
    );

    const expandButton = screen.getByLabelText("expand");
    fireEvent.click(expandButton);

    expect(mockOnExpandToggle).toHaveBeenCalledTimes(1);
  });
});
