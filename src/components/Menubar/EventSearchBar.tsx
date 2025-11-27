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
  ListSubheader,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
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
    searchIn: "",
    keywords: "",
    organizers: [] as userAttendee[],
    participants: [] as userAttendee[],
  });

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const filterOpen = Boolean(anchorEl);

  const handleFilterChange = (
    field: string,
    value: string | userAttendee[]
  ) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      searchIn: "",
      keywords: "",
      organizers: [] as userAttendee[],
      participants: [] as userAttendee[],
    });
    setAnchorEl(null);
    setExtended(false);
  };

  const handleSearch = async () => {
    const cleanedFilters = {
      ...filters,
      organizers: filters.organizers.map((u) => u.cal_address),
      participants: filters.participants.map((u) => u.cal_address),
      searchIn:
        filters.searchIn === ""
          ? calendars.map((c) => c.id)
          : [filters.searchIn],
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
        sx={{
          width: "100%",
          maxWidth: 600,
          margin: "0 auto",
          position: "relative",
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
            placeholder={t("common.search")}
            value={search}
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
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                      <TuneIcon />
                    </IconButton>
                  </InputAdornment>
                  {search && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearch("")}>
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
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 600 } }}
      >
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <div style={{ display: "flex", flexDirection: "row" }}>
                <InputLabel id="search-in">{t("search.searchIn")}</InputLabel>
                <Select
                  displayEmpty
                  value={filters.searchIn}
                  onChange={(e) =>
                    handleFilterChange("searchIn", e.target.value)
                  }
                >
                  <MenuItem value="">
                    <Typography>{t("search.filter.allCalendar")}</Typography>
                  </MenuItem>
                  <Divider />
                  <ListSubheader>{t("search.filter.myCalendar")}</ListSubheader>
                  {CalendarItemList(personnalCalendars)} <Divider />
                  <ListSubheader>
                    {t("search.filter.sharedCalendars")}
                  </ListSubheader>
                  {CalendarItemList(sharedCalendars)}
                </Select>
              </div>

              <div style={{ display: "flex", flexDirection: "row" }}>
                <InputLabel id="keywords">{t("search.keywords")}</InputLabel>
                <TextField
                  fullWidth
                  placeholder={t("search.keywordsPlaceholder")}
                  value={filters.keywords}
                  onChange={(e) =>
                    handleFilterChange("keywords", e.target.value)
                  }
                />
              </div>

              <div style={{ display: "flex", flexDirection: "row" }}>
                <InputLabel id="from">{t("search.organizers")}</InputLabel>
                <UserSearch
                  attendees={filters.organizers}
                  setAttendees={(users: userAttendee[]) =>
                    handleFilterChange("organizers", users)
                  }
                />
              </div>

              <div style={{ display: "flex", flexDirection: "row" }}>
                <InputLabel id="participant">
                  {t("search.participants")}
                </InputLabel>
                <UserSearch
                  attendees={filters.participants}
                  setAttendees={(users: userAttendee[]) =>
                    handleFilterChange("participants", users)
                  }
                />
              </div>
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
