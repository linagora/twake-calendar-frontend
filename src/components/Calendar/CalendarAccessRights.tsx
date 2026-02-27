import { AccessRight, Calendar } from "@/features/Calendars/CalendarTypes";
import { getUserDetails } from "@/features/User/userAPI";
import {
  AutocompleteRenderInputParams,
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@linagora/twake-mui";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "twake-i18n";
import { PeopleSearch, User } from "../Attendees/PeopleSearch";
import { FieldWithLabel } from "../Event/components/FieldWithLabel";
import { stringAvatar } from "../Event/utils/eventUtils";

export interface UserWithAccess extends User {
  accessRight: AccessRight;
}

interface CalendarAccessRightsProps {
  calendar: Calendar;
  value: UserWithAccess[];
  onChange: (users: UserWithAccess[]) => void;
  onInvitesLoaded: (users: UserWithAccess[]) => void;
}

export function CalendarAccessRights({
  calendar,
  value: usersWithAccess,
  onChange,
  onInvitesLoaded,
}: CalendarAccessRightsProps) {
  const { t } = useI18n();

  const containerRef = useRef<HTMLDivElement>(null);
  const [searchWidth, setSearchWidth] = useState<number | undefined>(undefined);
  const [accessRight, setAccessRight] = useState<AccessRight>(2);
  const [inviteLoading, setInvitesLoading] = useState(false);

  const currentUsersRef = useRef<UserWithAccess[]>(usersWithAccess);
  useEffect(() => {
    currentUsersRef.current = usersWithAccess;
  }, [usersWithAccess]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSearchWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!calendar.invite?.length) return;

    let cancelled = false;

    async function loadInvitedUsers() {
      setInvitesLoading(true);
      try {
        const loaded: UserWithAccess[] = (
          await Promise.all(
            calendar.invite.map(async (invite) => {
              const principalId = invite.principal.split("/").pop();
              if (!principalId) return null;
              try {
                const details = await getUserDetails(principalId);
                const email =
                  details?.preferredEmail ?? details?.emails?.[0] ?? "";
                return {
                  openpaasId: principalId,
                  displayName:
                    [details?.firstname, details?.lastname]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || email,
                  email,
                  accessRight: invite.access as AccessRight,
                } satisfies UserWithAccess;
              } catch {
                return null;
              }
            })
          )
        ).filter((u) => u !== null && !!u.email);

        if (cancelled) return;

        const loadedIds = new Set(loaded.map((u) => normalizeEmail(u.email)));
        const manuallyAdded = currentUsersRef.current.filter(
          (u) => !loadedIds.has(normalizeEmail(u.email))
        );
        const merged = [...loaded, ...manuallyAdded];

        onInvitesLoaded(loaded);
        onChange(merged);
      } finally {
        if (!cancelled) setInvitesLoading(false);
      }
    }

    loadInvitedUsers();
    return () => {
      cancelled = true;
    };
  }, [calendar.invite, onChange, onInvitesLoaded]);

  const normalizeEmail = (email?: string) => email?.trim().toLowerCase() ?? "";

  const handleUserSelect = (_event: unknown, users: User[]) => {
    const updated: UserWithAccess[] = users.map((user) => {
      const existing = usersWithAccess.find(
        (u) => normalizeEmail(u.email) === normalizeEmail(user.email)
      );
      return existing ?? { ...user, accessRight };
    });
    onChange(updated);
  };

  const handleRemoveUser = (email: string) => {
    onChange(
      usersWithAccess.filter(
        (u) => normalizeEmail(u.email) !== normalizeEmail(email)
      )
    );
  };

  const handleChangeUserRight = (email: string, right: AccessRight) => {
    onChange(
      usersWithAccess.map((u) =>
        normalizeEmail(u.email) === normalizeEmail(email)
          ? { ...u, accessRight: right }
          : u
      )
    );
  };

  const accessRightOptions: { value: AccessRight; label: string }[] = [
    { value: 2, label: t("calendarPopover.access.viewAllEvents") },
    { value: 3, label: t("calendarPopover.access.editor") },
    { value: 5, label: t("calendarPopover.access.administrator") },
  ];

  return (
    <FieldWithLabel
      label={t("calendarPopover.access.grantAccessRights")}
      isExpanded={false}
    >
      <Box ref={containerRef}>
        <PeopleSearch
          selectedUsers={usersWithAccess}
          onChange={handleUserSelect}
          objectTypes={["user"]}
          onToggleEventPreview={() => {}}
          customSlotProps={{
            popper: {
              anchorEl: containerRef.current,
              placement: "bottom-start",
              sx: {
                minWidth: searchWidth,
                "& .MuiPaper-root": {
                  width: "100%",
                },
              },
              modifiers: [
                {
                  name: "offset",
                  options: {
                    offset: [0, 8],
                  },
                },
              ],
            },
          }}
          customRenderInput={(
            params: AutocompleteRenderInputParams,
            query: string,
            setQuery: (value: string) => void
          ) => (
            <TextField
              {...params}
              fullWidth
              autoFocus
              placeholder={t("peopleSearch.label")}
              value={query}
              inputRef={(el) => {
                const ref = params.InputProps.ref;
                if (typeof ref === "function") {
                  ref(el);
                } else if (ref && "current" in ref) {
                  (
                    ref as React.MutableRefObject<HTMLInputElement | null>
                  ).current = el;
                }
              }}
              onChange={(e) => setQuery(e.target.value)}
              variant="outlined"
              inputProps={{
                ...params.inputProps,
                sx: {
                  fontSize: "14px",
                  "&::placeholder": { fontSize: "14px" },
                },
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <PeopleOutlineOutlinedIcon
                      sx={{ color: "text.secondary" }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Select
                      value={accessRight}
                      onChange={(e) =>
                        setAccessRight(e.target.value as AccessRight)
                      }
                      variant="standard"
                      disableUnderline
                      sx={{
                        fontSize: "0.875rem",
                        color: "text.secondary",
                        "& .MuiSelect-select": {
                          paddingRight: "24px !important",
                          paddingY: 0,
                        },
                        "& .MuiSelect-icon": { fontSize: "1rem" },
                        "&:before, &:after": { display: "none" },
                      }}
                    >
                      {accessRightOptions.map((opt) => (
                        <MenuItem
                          key={opt.value}
                          value={opt.value}
                          sx={{ color: "text.secondary" }}
                        >
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      </Box>

      {inviteLoading ? (
        <Box mt={2} display="flex" justifyContent="center">
          <CircularProgress size={24} />
        </Box>
      ) : (
        usersWithAccess.length > 0 && (
          <Box mt={2} display="flex" flexDirection="column" gap={1}>
            {usersWithAccess.map((user) => (
              <Box
                key={user.email}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                px={1}
                py={0.5}
                sx={{
                  borderRadius: "8px",
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
                  <Avatar
                    {...stringAvatar(user.displayName)}
                    sx={{ width: 28, height: 28, fontSize: "0.875rem" }}
                  >
                    {user.displayName?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box
                    minWidth={0}
                    display="flex"
                    flexDirection="column"
                    gap={0}
                  >
                    <Typography noWrap>{user.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                  flexShrink={0}
                >
                  <Select
                    value={user.accessRight}
                    onChange={(e) =>
                      handleChangeUserRight(
                        user.email,
                        e.target.value as AccessRight
                      )
                    }
                    variant="standard"
                    disableUnderline
                    sx={{
                      fontSize: "0.875rem",
                      color: "text.secondary",
                      "& .MuiSelect-select": {
                        paddingRight: "24px !important",
                        paddingY: 0,
                      },
                      "& .MuiSelect-icon": { fontSize: "1rem" },
                    }}
                  >
                    {accessRightOptions.map((opt) => (
                      <MenuItem
                        key={opt.value}
                        value={opt.value}
                        sx={{ color: "text.secondary" }}
                      >
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <IconButton
                    size="small"
                    aria-label={t("actions.remove")}
                    onClick={() => handleRemoveUser(user.email)}
                    sx={{ color: "text.secondary" }}
                  >
                    <HighlightOffIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        )
      )}
    </FieldWithLabel>
  );
}
