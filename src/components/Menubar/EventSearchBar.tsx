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
import { useRef, useState } from "react";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { searchEventsAsync } from "../../features/Search/SearchSlice";
import { setView } from "../../features/Settings/SettingsSlice";
import { userAttendee } from "../../features/User/userDataTypes";
import UserSearch from "../Attendees/AttendeeSearch";
import { CalendarItemList } from "../Calendar/CalendarItemList";

export default function SearchBar() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const calendars = Object.values(
    useAppSelector((state) => state.calendars.list)
  );
  const userId = useAppSelector((state) => state.user.userData.openpaasId);
  const personnalCalendars = calendars.filter(
    (c) => c.id.split("/")[0] === userId
  );
  const sharedCalendars = calendars.filter(
    (c) => c.id.split("/")[0] !== userId
  );

  const [search, setSearch] = useState("");
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
  const searchBoxRef = useRef<HTMLElement | null>(null);

  const handleFilterChange = (
    field: string,
    value: string | userAttendee[]
  ) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      searchIn: "my-calendars",
      keywords: "",
      organizers: [] as userAttendee[],
      attendees: [] as userAttendee[],
    });
    setAnchorEl(null);
    setExtended(false);
  };

  const handleSearch = async () => {
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
      ...filters,
      organizers: filters.organizers.map((u) => u.cal_address),
      attendees: filters.attendees.map((u) => u.cal_address),
      searchIn: searchInCalendars,
    };

    dispatch(
      searchEventsAsync({
        search,
        filters: cleanedFilters,
      })
    );

    dispatch(setView("search"));
    setAnchorEl(null);
  };

  return (
    <>
      <Box
        ref={searchBoxRef}
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
          <TextField
            fullWidth
            autoFocus
            placeholder={t("common.search")}
            value={search}
            onBlur={(e) => {
              const next = e.relatedTarget as HTMLElement | null;
              if (
                next instanceof Node &&
                searchBoxRef.current?.contains(next)
              ) {
                return;
              }
              if (!search.trim()) {
                setExtended(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            onChange={(e) => {
              setSearch(e.target.value);
              handleFilterChange("keywords", e.target.value);
            }}
            variant="outlined"
            sx={{
              borderRadius: "999px",
              "& .MuiOutlinedInput-root": {
                borderRadius: "999px",
              },
              "& .MuiInputBase-input": { padding: "12px 10px" },
              animation: "scaleIn 0.25s ease-out",
              "@keyframes scaleIn": {
                from: { transform: "scaleX(0)", opacity: 0 },
                to: { transform: "scaleX(1)", opacity: 1 },
              },
              transformOrigin: "right",
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#605D62" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  <InputAdornment position="end">
                    <IconButton
                      onClick={(e) => setAnchorEl(searchBoxRef.current)}
                    >
                      <TuneIcon />
                    </IconButton>
                  </InputAdornment>
                  {search && (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => {
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
            <Button variant="text" onClick={handleClearFilters}>
              {t("common.cancel")}
            </Button>
            <Button variant="contained" onClick={handleSearch}>
              {t("common.search")}
            </Button>
          </CardActions>
        </Card>
      </Popover>
    </>
  );
}
