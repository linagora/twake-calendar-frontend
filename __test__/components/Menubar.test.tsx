import { fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Menubar } from "../../src/components/Menubar/Menubar";
import { renderWithProviders } from "../utils/Renderwithproviders";

describe("Calendar App Component Display Tests", () => {
  const preloadedState = {
    user: {
      userData: {
        sub: "test",
        email: "test@test.com",
        family_name: "Doe",
        name: "John",
        sid: "mockSid",
        openpaasId: "667037022b752d0026472254",
      },
    },
  };
  test("renders the Menubar component", () => {
    (window as any).appList = [
      { name: "Twake", link: "/twake", icon: "twake.svg" },
      { name: "Calendar", link: "/calendar", icon: "calendar.svg" },
    ];
    renderWithProviders(<Menubar />, preloadedState);
    const navbarElement = screen.getByText("Twake");
    expect(navbarElement).toBeInTheDocument();
  });
  it("renders the main title", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    renderWithProviders(<Menubar />, preloadedState);
    expect(screen.getByText(/Twake/i)).toBeInTheDocument();
    expect(screen.getByText(/Calendar/i)).toBeInTheDocument();
  });

  it("shows avatar with user initials", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    renderWithProviders(<Menubar />, preloadedState);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows avatar with email initials when no user name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: "Doe",
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    renderWithProviders(<Menubar />, preloadedState);
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  // Edge cases for avatar display logic
  it("handles user with only family_name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: "Smith",
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    renderWithProviders(<Menubar />, preloadedState);
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  it("handles user with only name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: null,
          name: "John",
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    renderWithProviders(<Menubar />, preloadedState);
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  it("handles user with both name and family_name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: "Doe",
          name: "John",
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    renderWithProviders(<Menubar />, preloadedState);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("handles user with no name and family_name", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "test@test.com",
          family_name: null,
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    renderWithProviders(<Menubar />, preloadedState);
    expect(screen.getByText("t")).toBeInTheDocument();
  });

  it("handles user with empty email", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: "",
          family_name: null,
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    renderWithProviders(<Menubar />, preloadedState);
    // Should not crash and show empty string
    const avatar = screen.getByRole("img", { hidden: true });
    expect(avatar).toBeInTheDocument();
  });

  it("handles user with null email", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: null,
          family_name: null,
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    renderWithProviders(<Menubar />, preloadedState);
    // Should not crash and show empty string
    const avatar = screen.getByRole("img", { hidden: true });
    expect(avatar).toBeInTheDocument();
  });

  it("handles user with undefined email", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    const preloadedState = {
      user: {
        userData: {
          sub: "test",
          email: undefined,
          family_name: null,
          name: null,
          sid: "mockSid",
          openpaasId: "667037022b752d0026472254",
        },
      },
    };
    renderWithProviders(<Menubar />, preloadedState);
    // Should not crash and show empty string
    const avatar = screen.getByRole("img", { hidden: true });
    expect(avatar).toBeInTheDocument();
  });

  it("shows AppsIcon when applist is not empty", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    renderWithProviders(<Menubar />, preloadedState);
    expect(screen.getByTestId("AppsIcon")).toBeInTheDocument();
  });

  it("opens popover when clicking AppsIcon", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    renderWithProviders(<Menubar />, preloadedState);
    const appsButton = screen.getByRole("button");
    fireEvent.click(appsButton);
    expect(screen.getByText("Twake")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
  });

  it("renders app icons as links", () => {
    (window as any).appList = [{ name: "test", icon: "test", link: "test" }];
    renderWithProviders(<Menubar />, preloadedState);
    const appsButton = screen.getByRole("button");
    fireEvent.click(appsButton);

    const twakeLink = screen.getByRole("link", { name: /test/i });
    expect(twakeLink).toHaveAttribute("href", "test");
  });
});
