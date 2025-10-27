import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  User,
  PeopleSearch,
} from "../../src/components/Attendees/PeopleSearch";
import { renderWithProviders } from "../utils/Renderwithproviders";
import { searchUsers } from "../../src/features/User/userAPI";

jest.mock("../../src/features/User/userAPI");
const mockedSearchUsers = searchUsers as jest.MockedFunction<
  typeof searchUsers
>;

describe("PeopleSearch", () => {
  const baseUser: User = {
    email: "test@example.com",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    openpaasId: "1234567890",
  };

  function setup(
    selectedUsers: User[] = [],
    props?: Partial<React.ComponentProps<typeof PeopleSearch>>
  ) {
    const onChange = jest.fn();
    renderWithProviders(
      <PeopleSearch
        objectTypes={["user"]}
        selectedUsers={selectedUsers}
        onChange={onChange}
        {...props}
      />
    );
    return { onChange };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    mockedSearchUsers.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls searchUsers after debounce when typing", async () => {
    mockedSearchUsers.mockResolvedValueOnce([baseUser]);
    setup();

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Test");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockedSearchUsers).toHaveBeenCalledWith("Test", ["user"]);
    });
  });

  it("renders search results and allows selection", async () => {
    mockedSearchUsers.mockResolvedValueOnce([baseUser]);
    const { onChange } = setup();

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Test");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    const option = await screen.findByText("Test User");
    await userEvent.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it("does not show already selected users in options", async () => {
    mockedSearchUsers.mockResolvedValueOnce([baseUser]);
    setup([baseUser]);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Test");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();
    });
  });

  it("triggers onToggleEventPreview on Enter key press", () => {
    const onToggleEventPreview = jest.fn();
    setup([], { onToggleEventPreview });

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onToggleEventPreview).toHaveBeenCalled();
  });

  it("respects disabled state", () => {
    setup([], { disabled: true });
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
