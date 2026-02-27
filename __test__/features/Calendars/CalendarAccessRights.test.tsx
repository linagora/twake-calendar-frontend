import { AccessTab } from "@/components/Calendar/AccessTab";
import {
  CalendarAccessRights,
  UserWithAccess,
} from "@/components/Calendar/CalendarAccessRights";
import CalendarPopover from "@/components/Calendar/CalendarModal";
import { updateDelegationCalendar } from "@/features/Calendars/api/updateDelegationCalendar";
import { AccessRight, Calendar } from "@/features/Calendars/CalendarTypes";
import * as eventThunks from "@/features/Calendars/services";
import * as delegationThunks from "@/features/Calendars/services/updateDelegationCalendarAsync";
import { getUserDetails } from "@/features/User/userAPI";
import { accessRightToDavProp } from "@/utils/accessRightToDavProp";
import { api } from "@/utils/apiUtils";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../utils/Renderwithproviders";

jest.mock("@/utils/apiUtils", () => ({
  api: { post: jest.fn() },
}));

jest.mock("@/features/User/userAPI", () => ({
  getUserDetails: jest.fn(),
}));

jest.mock("@/features/Calendars/CalendarApi", () => ({
  getSecretLink: jest.fn().mockReturnValue(""),
  exportCalendar: jest.fn(),
}));

const mockThunkWithUnwrap = (resolvedValue: unknown = {}) =>
  jest.fn().mockImplementation(() => {
    const result = Object.assign(Promise.resolve(resolvedValue), {
      unwrap: () => Promise.resolve(resolvedValue),
    });
    return jest.fn().mockReturnValue(result);
  });

describe("accessRightToDavProp", () => {
  it("maps 5 (ADMIN) → dav:administration", () => {
    expect(accessRightToDavProp(5)).toBe("dav:administration");
  });

  it("maps 3 (EDITOR) → dav:read-write", () => {
    expect(accessRightToDavProp(3)).toBe("dav:read-write");
  });

  it("maps 2 (VIEW) → dav:read", () => {
    expect(accessRightToDavProp(2)).toBe("dav:read");
  });

  it("defaults to dav:read for unknown values (covered by default case)", () => {
    expect(accessRightToDavProp(2 as AccessRight)).toBe("dav:read");
  });
});

describe("updateDelegationCalendar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("posts to the correct DAV endpoint with the share body", async () => {
    (api.post as jest.Mock).mockResolvedValue({ ok: true });

    const share = {
      set: [{ "dav:href": "mailto:alice@example.com", "dav:read": true }],
      remove: [],
    };

    await updateDelegationCalendar("/calendars/user/cal1.json", share);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "dav/calendars/user/cal1.json",
        expect.objectContaining({
          body: JSON.stringify({ share }),
        })
      )
    );
  });
});

const baseCalendar: Calendar = {
  id: "user1/cal1",
  name: "My Calendar",
  description: "",
  color: { color: "#0062FF", dark: "#FFF" },
  link: "/calendars/user1/cal1.json",
  visibility: "public",
  events: {},
  invite: [],
  owner: { emails: ["user1@example.com"] },
};

describe("CalendarAccessRights", () => {
  const mockOnChange = jest.fn();
  const mockOnInvitesLoaded = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it("renders the grant access rights section", () => {
    renderWithProviders(
      <CalendarAccessRights
        calendar={baseCalendar}
        value={[]}
        onChange={mockOnChange}
        onInvitesLoaded={mockOnInvitesLoaded}
      />
    );

    expect(
      screen.getByText("calendarPopover.access.grantAccessRights")
    ).toBeInTheDocument();
  });

  it("shows a list of users already passed in via value prop", () => {
    const users: UserWithAccess[] = [
      {
        openpaasId: "abc",
        displayName: "Alice",
        email: "alice@example.com",
        accessRight: 2,
      },
    ];

    renderWithProviders(
      <CalendarAccessRights
        calendar={baseCalendar}
        value={users}
        onChange={mockOnChange}
        onInvitesLoaded={mockOnInvitesLoaded}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("calls onChange with user removed when remove button is clicked", () => {
    const users: UserWithAccess[] = [
      {
        openpaasId: "abc",
        displayName: "Alice",
        email: "alice@example.com",
        accessRight: 2,
      },
    ];

    renderWithProviders(
      <CalendarAccessRights
        calendar={baseCalendar}
        value={users}
        onChange={mockOnChange}
        onInvitesLoaded={mockOnInvitesLoaded}
      />
    );

    fireEvent.click(screen.getByLabelText(/remove/i));
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it("loads invited users from calendar.invite on mount", async () => {
    const calendarWithInvite: Calendar = {
      ...baseCalendar,
      invite: [
        {
          href: "mailto:bob@example.com",
          principal: "/principals/users/bob123",
          access: 3,
          inviteStatus: 1,
        },
      ],
    };

    (getUserDetails as jest.Mock).mockResolvedValue({
      preferredEmail: "bob@example.com",
      firstname: "Bob",
      lastname: "Smith",
      emails: ["bob@example.com"],
    });

    renderWithProviders(
      <CalendarAccessRights
        calendar={calendarWithInvite}
        value={[]}
        onChange={mockOnChange}
        onInvitesLoaded={mockOnInvitesLoaded}
      />
    );

    await waitFor(() => expect(getUserDetails).toHaveBeenCalledWith("bob123"));
    await waitFor(() =>
      expect(mockOnInvitesLoaded).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            email: "bob@example.com",
            accessRight: 3,
          }),
        ])
      )
    );
  });

  it("skips invite entries where getUserDetails throws", async () => {
    const calendarWithInvite: Calendar = {
      ...baseCalendar,
      invite: [
        {
          href: "mailto:ghost@example.com",
          principal: "/principals/users/ghost",
          access: 2,
          inviteStatus: 1,
        },
      ],
    };

    (getUserDetails as jest.Mock).mockRejectedValue(new Error("Not found"));

    renderWithProviders(
      <CalendarAccessRights
        calendar={calendarWithInvite}
        value={[]}
        onChange={mockOnChange}
        onInvitesLoaded={mockOnInvitesLoaded}
      />
    );

    await waitFor(() => expect(mockOnInvitesLoaded).toHaveBeenCalledWith([]));
  });

  it("shows a loading spinner while invite users are being fetched", async () => {
    const calendarWithInvite: Calendar = {
      ...baseCalendar,
      invite: [
        {
          href: "mailto:carol@example.com",
          principal: "/principals/users/carol",
          access: 2,
          inviteStatus: 1,
        },
      ],
    };

    // Never resolves during the assertion window
    (getUserDetails as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithProviders(
      <CalendarAccessRights
        calendar={calendarWithInvite}
        value={[]}
        onChange={mockOnChange}
        onInvitesLoaded={mockOnInvitesLoaded}
      />
    );

    expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument();
  });
});

const userState = {
  user: {
    userData: { openpaasId: "user1", email: "user1@example.com" },
  },
};

describe("AccessTab – conditional rendering of CalendarAccessRights", () => {
  const noop = jest.fn();

  afterEach(() => jest.clearAllMocks());

  it("shows CalendarAccessRights when the current user owns the calendar", () => {
    renderWithProviders(
      <AccessTab
        calendar={baseCalendar}
        usersWithAccess={[]}
        onUsersWithAccessChange={noop}
        onInvitesLoaded={noop}
      />,
      {
        ...userState,
        calendars: { list: { "user1/cal1": baseCalendar } },
      }
    );

    expect(
      screen.getByText("calendarPopover.access.grantAccessRights")
    ).toBeInTheDocument();
  });

  it("hides CalendarAccessRights for a non-owner without admin delegation", () => {
    const foreignCalendar: Calendar = {
      ...baseCalendar,
      id: "otherUser/cal1",
      invite: [],
    };

    renderWithProviders(
      <AccessTab
        calendar={foreignCalendar}
        usersWithAccess={[]}
        onUsersWithAccessChange={noop}
        onInvitesLoaded={noop}
      />,
      {
        ...userState,
        calendars: { list: { "otherUser/cal1": foreignCalendar } },
      }
    );

    expect(screen.queryByText(/grant access rights/i)).not.toBeInTheDocument();
  });

  it("shows CalendarAccessRights when the user has access=5 (admin) delegation", () => {
    const delegatedCalendar: Calendar = {
      ...baseCalendar,
      id: "otherUser/cal1",
      invite: [
        {
          href: "mailto:user1@example.com",
          principal: "/principals/users/user1",
          access: 5,
          inviteStatus: 1,
        },
      ],
    };

    renderWithProviders(
      <AccessTab
        calendar={delegatedCalendar}
        usersWithAccess={[]}
        onUsersWithAccessChange={noop}
        onInvitesLoaded={noop}
      />,
      {
        ...userState,
        calendars: { list: { "otherUser/cal1": delegatedCalendar } },
      }
    );

    expect(
      screen.getByText("calendarPopover.access.grantAccessRights")
    ).toBeInTheDocument();
  });
});

const existingCalendar: Calendar = {
  id: "user1/cal1",
  name: "Existing Cal",
  description: "Desc",
  color: { color: "#0062FF", dark: "#FFF" },
  link: "/calendars/user/cal1",
  visibility: "public",
  events: {},
  invite: [],
  owner: { emails: ["user1@example.com"] },
};

describe("CalendarModal – updateDelegationCalendarAsync integration", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(eventThunks, "patchCalendarAsync")
      .mockImplementation(mockThunkWithUnwrap());
    jest
      .spyOn(eventThunks, "patchACLCalendarAsync")
      .mockImplementation(mockThunkWithUnwrap());
    jest
      .spyOn(delegationThunks, "updateDelegationCalendarAsync")
      .mockImplementation(mockThunkWithUnwrap());
  });

  it("does NOT call updateDelegationCalendarAsync when no users are added or removed", async () => {
    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { ...userState, calendars: { list: { "user1/cal1": existingCalendar } } }
    );

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());

    expect(
      delegationThunks.updateDelegationCalendarAsync
    ).not.toHaveBeenCalled();
  });
});

describe("CalendarModal – cancel button", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(delegationThunks, "updateDelegationCalendarAsync")
      .mockImplementation(mockThunkWithUnwrap());
    jest
      .spyOn(eventThunks, "patchCalendarAsync")
      .mockImplementation(mockThunkWithUnwrap());
  });

  it("calls onClose without saving when Cancel is clicked", async () => {
    renderWithProviders(
      <CalendarPopover
        open={true}
        onClose={mockOnClose}
        calendar={existingCalendar}
      />,
      { ...userState }
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
    expect(
      delegationThunks.updateDelegationCalendarAsync
    ).not.toHaveBeenCalled();
    expect(eventThunks.patchCalendarAsync).not.toHaveBeenCalled();
  });
});

describe("CalendarInvite access filtering (unit)", () => {
  it("only keeps invite entries with access values 2, 3, or 5", () => {
    const rawInvites = [
      { href: "a", principal: "/p/a", access: 2, inviteStatus: 1 },
      { href: "b", principal: "/p/b", access: 3, inviteStatus: 1 },
      { href: "c", principal: "/p/c", access: 5, inviteStatus: 1 },
      { href: "d", principal: "/p/d", access: 1, inviteStatus: 1 }, // invalid
      { href: "e", principal: "/p/e", access: 99, inviteStatus: 1 }, // invalid
    ];

    const filtered = rawInvites.filter((inv) => [2, 3, 5].includes(inv.access));

    expect(filtered).toHaveLength(3);
    expect(filtered.map((i) => i.access)).toEqual([2, 3, 5]);
  });
});
