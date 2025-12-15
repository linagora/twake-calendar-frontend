import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { type AutocompleteRenderInputParams } from "@mui/material/Autocomplete";
import { useRef, useState, useEffect } from "react";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import { useI18n } from "twake-i18n";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { searchEventsAsync } from "../../features/Search/SearchSlice";
import { setView } from "../../features/Settings/SettingsSlice";
import { userAttendee } from "../../features/User/userDataTypes";
import UserSearch from "../Attendees/AttendeeSearch";
import { CalendarItemList } from "../Calendar/CalendarItemList";
import { PeopleSearch, User } from "../Attendees/PeopleSearch";

export default function SearchBar() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const calendars = Object.values(
    useAppSelector((state) => state.calendars.list)
  );
  const userId = useAppSelector((state) => state.user.userData?.openpaasId);
  const personnalCalendars = userId
    ? calendars.filter((c) => c.id.split("/")[0] === userId)
    : [];
  const sharedCalendars = userId
    ? calendars.filter((c) => c.id.split("/")[0] !== userId)
    : calendars;

  const [search, setSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<User[]>([]);
  const [extended, setExtended] = useState(false);

  const [filters, setFilters] = useState({
    searchIn: "my-calendars",
    keywords: "",
    organizers: [] as userAttendee[],
    attendees: [] as userAttendee[],
  });

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const filterOpen = Boolean(anchorEl);

  const searchWidth = {
    xs: "10vw",
    sm: "20vw",
    md: "35vw",
    xl: "35vw",
    "@media (min-width: 2000px)": {
      width: "55vw",
    },
  };

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldCollapseRef = useRef(false);

  type FilterField = "searchIn" | "keywords" | "organizers" | "attendees";
  const handleFilterChange = (
    field: FilterField,
    value: string | userAttendee[]
  ) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (field === "organizers") {
      setSelectedContacts(
        (value as userAttendee[]).map(
          (a: userAttendee) =>
            ({
              displayName: a.cn,
              email: a.cal_address || "",
            }) as User
        )
      );
    }
  };

  function buildQuery(
    searchQuery: string,
    filters: {
      searchIn: string;
      keywords: string;
      organizers: userAttendee[];
      attendees: userAttendee[];
    }
  ) {
    const trimmedSearch = searchQuery.trim();
    const trimmedKeywords = filters.keywords.trim();

    // Block search if all search criteria are empty
    const hasSearchCriteria =
      trimmedSearch ||
      trimmedKeywords ||
      filters.organizers.length > 0 ||
      filters.attendees.length > 0;

    if (!hasSearchCriteria) {
      return;
    }

    let searchInCalendars: string[];

    if (filters.searchIn === "" || !filters.searchIn) {
      searchInCalendars = calendars.map((c) => c.id);
    } else if (filters.searchIn === "my-calendars") {
      searchInCalendars = personnalCalendars.map((c) => c.id);
    } else if (filters.searchIn === "shared-calendars") {
      searchInCalendars = sharedCalendars.map((c) => c.id);
    } else {
      searchInCalendars = [filters.searchIn];
    }

    const cleanedFilters = {
      keywords: trimmedKeywords,
      organizers: filters.organizers.map((u) => u.cal_address),
      attendees: filters.attendees.map((u) => u.cal_address),
      searchIn: searchInCalendars,
    };
    return {
      search: trimmedSearch,
      filters: cleanedFilters,
    };
  }

  const handleClearFilters = () => {
    setFilters({
      searchIn: "my-calendars",
      keywords: "",
      organizers: [] as userAttendee[],
      attendees: [] as userAttendee[],
    });
    setAnchorEl(null);
  };

  const handleContactSelect = (_event: any, contacts: User[]) => {
    setSelectedContacts(contacts);
    setSearch("");
    if (contacts.length > 0) {
      handleSearch("", {
        ...filters,
        organizers: contacts.map((c) => ({
          cal_address: c.email || c.displayName || "",
          cutype: "INDIVIDUAL",
          cn: c.displayName || c.email,
          role: "Participant",
          rsvp: "TRUE",
          partstat: "",
        })),
      });
    }
  };

  const handleSearch = async (
    searchQuery: string,
    filters: {
      searchIn: string;
      keywords: string;
      organizers: userAttendee[];
      attendees: userAttendee[];
    }
  ) => {
    const cleanedQuery = buildQuery(searchQuery, filters);
    if (cleanedQuery) {
      dispatch(searchEventsAsync(cleanedQuery));
    }
    dispatch(setView("search"));
    setAnchorEl(null);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (filterOpen) {
        return;
      }

      if (
        containerRef.current?.contains(target) ||
        inputRef.current?.contains(target) ||
        (target as HTMLElement).closest(".MuiAutocomplete-popper")
      ) {
        return;
      }

      if (!search.trim() && selectedContacts.length === 0) {
        setExtended(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen, search, selectedContacts]);

  return (
    <>
      <Box
        ref={containerRef}
        sx={{
          margin: "0 auto",
          height: "44px",
          position: "relative",
          width: extended ? searchWidth : "auto",
          transition: "width 0.25s ease-out",
        }}
      >
        {!extended && (
          <IconButton onClick={() => setExtended(true)}>
            <SearchIcon />
          </IconButton>
        )}

        {extended && (
          <PeopleSearch
            selectedUsers={selectedContacts}
            onChange={(event, users) => {
              handleContactSelect(event, users);
            }}
            objectTypes={["user", "contact"]}
            onToggleEventPreview={() => {}}
            customRenderInput={(
              params: AutocompleteRenderInputParams,
              query: string,
              setQuery: (value: string) => void
            ) => (
              <TextField
                {...params}
                fullWidth
                autoFocus
                placeholder={t("common.search")}
                value={query}
                inputRef={(el) => {
                  inputRef.current = el;
                  const ref = params.InputProps.ref;
                  if (typeof ref === "function") {
                    ref(el);
                  } else if (ref && "current" in ref) {
                    (
                      ref as React.MutableRefObject<HTMLInputElement | null>
                    ).current = el;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch(query, filters);
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuery(value);
                  setSearch(value);
                }}
                variant="outlined"
                sx={{
                  borderRadius: "999px",
                  "& .MuiInputBase-input": { padding: "12px 10px" },
                  animation: "scaleIn 0.25s ease-out",
                  "@keyframes scaleIn": {
                    from: { transform: "scaleX(0)", opacity: 0 },
                    to: { transform: "scaleX(1)", opacity: 1 },
                  },
                  transformOrigin: "right",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "999px",
                    height: 40,
                    padding: "0 10px",
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#605D62" }} />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {params.InputProps.endAdornment}
                      <InputAdornment position="end">
                        <IconButton
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setAnchorEl(containerRef.current);
                            handleFilterChange("keywords", query);
                            handleFilterChange(
                              "organizers",
                              selectedContacts.map((a: User) => ({
                                cn: a.displayName,
                                cal_address: a.email || "",
                                partstat: "NEEDS-ACTION",
                                rsvp: "FALSE",
                                role: "REQ-PARTICIPANT",
                                cutype: "INDIVIDUAL",
                              }))
                            );
                          }}
                        >
                          <TuneIcon />
                        </IconButton>
                      </InputAdornment>
                      {query && (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => {
                              setQuery("");
                              setSearch("");
                              handleFilterChange("keywords", "");
                            }}
                          >
                            <HighlightOffIcon />
                          </IconButton>
                        </InputAdornment>
                      )}
                    </>
                  ),
                }}
              />
            )}
          />
        )}
      </Box>

      <Popover
        open={filterOpen}
        anchorEl={anchorEl}
        onClose={handleClearFilters}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: { mt: 1.2, width: extended ? searchWidth : "auto" },
          },
          transition: {
            onExited: () => {
              if (
                !search.trim() &&
                selectedContacts.length === 0 &&
                shouldCollapseRef.current
              ) {
                setExtended(false);
              }
              shouldCollapseRef.current = false;
            },
          },
        }}
      >
        <Card sx={{ p: 2, pb: 1 }}>
          <CardContent>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <InputLabel id="search-in" sx={{ m: 0 }}>
                  {t("search.searchIn")}
                </InputLabel>
                <Select
                  displayEmpty
                  value={filters.searchIn}
                  onChange={(e) =>
                    handleFilterChange("searchIn", e.target.value)
                  }
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                        color: "#8C9CAF",
                      },
                    },
                  }}
                  sx={{ height: "40px" }}
                >
                  <MenuItem value="">
                    <Typography
                      sx={{
                        color: "#243B55",
                        font: "Roboto",
                        fontSize: "16px",
                        weight: 400,
                        pointerEvents: "auto",
                      }}
                    >
                      {t("search.filter.allCalendar")}
                    </Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    value="my-calendars"
                    sx={{
                      color: "#243B55",
                      font: "Roboto",
                      fontSize: "12px",
                      weight: 400,
                      pointerEvents: "auto",
                    }}
                  >
                    {t("search.filter.myCalendar")}
                  </MenuItem>
                  {CalendarItemList(personnalCalendars)}
                  <Divider />
                  <MenuItem
                    value="shared-calendars"
                    sx={{
                      color: "#243B55",
                      font: "Roboto",
                      fontSize: "12px",
                      weight: 400,
                      pointerEvents: "auto",
                    }}
                  >
                    {t("search.filter.sharedCalendars")}
                  </MenuItem>
                  {CalendarItemList(sharedCalendars)}
                </Select>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <InputLabel id="keywords" sx={{ m: 0 }}>
                  {t("search.keywords")}
                </InputLabel>
                <TextField
                  fullWidth
                  placeholder={t("search.keywordsPlaceholder")}
                  value={filters.keywords}
                  onChange={(e) =>
                    handleFilterChange("keywords", e.target.value)
                  }
                  size="small"
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <InputLabel id="from" sx={{ m: 0 }}>
                  {t("search.organizers")}
                </InputLabel>
                <UserSearch
                  attendees={filters.organizers}
                  setAttendees={(users: userAttendee[]) =>
                    handleFilterChange("organizers", users)
                  }
                />
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <InputLabel id="participant" sx={{ m: 0 }}>
                  {t("search.participants")}
                </InputLabel>
                <UserSearch
                  attendees={filters.attendees}
                  setAttendees={(users: userAttendee[]) =>
                    handleFilterChange("attendees", users)
                  }
                />
              </Box>
            </Stack>
          </CardContent>

          <CardActions sx={{ justifyContent: "flex-end", p: 2, gap: 2 }}>
            <Button
              variant="text"
              onClick={() => {
                handleClearFilters();
                setSelectedContacts([]);
                setSearch("");
                shouldCollapseRef.current = true;
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="contained"
              onClick={() => handleSearch(filters.keywords, filters)}
            >
              {t("common.search")}
            </Button>
          </CardActions>
        </Card>
      </Popover>
    </>
  );
}
