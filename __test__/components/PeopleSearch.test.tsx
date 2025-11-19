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

  it("no options doesn't show dropdown when input is empty", async () => {
    mockedSearchUsers.mockResolvedValueOnce([baseUser]);
    setup();
    const input = screen.getByRole("combobox");

    userEvent.type(input, "Test");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    userEvent.clear(input);

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("shows 'No results' when search succeeds but returns empty array", async () => {
    mockedSearchUsers.mockResolvedValueOnce([]);
    setup();

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Test");

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    const noResults = await screen.findByText(
      "peopleSearch.noResults",
      {},
      { timeout: 5000 }
    );
    expect(noResults).toBeInTheDocument();
  });

  it("does not clear options when search fails and shows error snackbar", async () => {
    mockedSearchUsers.mockResolvedValueOnce([baseUser]);
    setup();

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Test");
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    mockedSearchUsers.mockRejectedValueOnce(new Error("Network error"));
    await userEvent.clear(input);
    await userEvent.type(input, "Error");
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    const errorMessage = await screen.findByText("peopleSearch.searchError");
    expect(errorMessage).toBeInTheDocument();

    expect(screen.queryByText("Test User")).not.toBeInTheDocument();

    mockedSearchUsers.mockResolvedValueOnce([baseUser]);
    await userEvent.clear(input);
    await userEvent.type(input, "Test");
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });
  });

  it("shows loading text when searching", async () => {
    let resolveSearch: (value: User[]) => void;
    const searchPromise = new Promise<User[]>((resolve) => {
      resolveSearch = resolve;
    });
    mockedSearchUsers.mockReturnValueOnce(searchPromise);
    setup();

    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Test");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    const loadingText = await screen.findByText(
      "peopleSearch.loading",
      {},
      { timeout: 5000 }
    );
    expect(loadingText).toBeInTheDocument();

    await act(async () => {
      resolveSearch!([baseUser]);
      await searchPromise;
    });
  });

  it("retains input value when field loses focus (blur)", async () => {
    let resolveSearch: (value: User[]) => void;
    const searchPromise = new Promise<User[]>((resolve) => {
      resolveSearch = resolve;
    });
    mockedSearchUsers.mockReturnValueOnce(searchPromise);
    await act(async () => {
      setup();
    });

    const input = screen.getByRole("combobox");

    await act(async () => {
      userEvent.type(input, "Test");
    });

    await waitFor(() => {
      expect(mockedSearchUsers).toHaveBeenCalledWith("Test", ["user"]);
    });

    expect(input).toHaveValue("Test");

    await act(async () => {
      input.blur();
    });

    await waitFor(() => {
      expect(input).toHaveValue("Test");
    });
  });
});
