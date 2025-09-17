import CloseIcon from "@mui/icons-material/Close";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { searchUsers } from "../../features/User/userAPI";

import { getCalendars } from "../../features/Calendars/CalendarApi";
import { addSharedCalendarAsync } from "../../features/Calendars/CalendarSlice";

interface User {
  email: string;
  displayName: string;
  avatarUrl: string;
  openpaasId: string;
}

export default function CalendarSearch({
  anchorEl,
  open,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (Calendar: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const openpaasId =
    useAppSelector((state) => state.user.userData.openpaasId) ?? "";
  const [options, setOptions] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const calendars = useAppSelector((state) => state.calendars.list);
  const [selectedCal, setSelectedCalendars] = useState<Record<string, any>[]>(
    []
  );
  const colors = ["#34d399", "#fbbf24", "#f87171", "#60a5fa", "#f472b6"];

  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const handleSave = () => {
    if (selectedCal) {
      selectedCal.forEach(async (cal) => {
        const calId = crypto.randomUUID();
        await dispatch(
          addSharedCalendarAsync({
            userId: openpaasId,
            calId,
            cal: {
              ...cal,
              color: cal.cal["apple:color"],
            },
          })
        );
      });
      onClose({}, "backdropClick");
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query) {
        setLoading(true);
        const res = await searchUsers(query, ["user"]);
        setOptions(res);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: "20%",
          transform: "translate( -50%)",
          width: "50vw",
          maxHeight: "80vh",
        }}
      >
        <Card
          sx={{
            p: 2,
            borderRadius: 3,
            boxShadow: 6,
            display: "flex",
            flexDirection: "column",
            maxHeight: "80vh",
          }}
        >
          <Box sx={{ position: "absolute", top: 8, right: 8 }}>
            <IconButton
              size="small"
              onClick={() => onClose({}, "backdropClick")}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <CardHeader title="Browse other calendars" sx={{ pb: 0 }} />
          <CardContent sx={{ flex: 1, overflow: "auto" }}>
            <Autocomplete
              multiple
              options={options}
              loading={loading}
              filterOptions={(x) => x}
              fullWidth
              getOptionLabel={(option) => option.displayName || option.email}
              filterSelectedOptions
              value={selectedUsers}
              onInputChange={(event, value) => setQuery(value)}
              onChange={async (event, value) => {
                setSelectedUsers(value);

                const cals = await Promise.all(
                  value.map(async (user) => {
                    const cals = (await getCalendars(
                      user.openpaasId,
                      "sharedPublic=true&withRights=true"
                    )) as Record<string, any>;
                    return cals._embedded["dav:calendar"].map(
                      (cal: Record<string, any>) => ({ cal, owner: user })
                    );
                  })
                );
                console.log(cals.flat());
                setSelectedCalendars(cals.flat());
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search user"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                return (
                  <ListItem
                    {...props}
                    key={option.email + option.displayName}
                    disableGutters
                  >
                    <ListItemAvatar>
                      <Avatar src={option.avatarUrl} alt={option.displayName} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={option.displayName}
                      secondary={option.email}
                    />
                  </ListItem>
                );
              }}
            />

            {selectedCal.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle1" gutterBottom>
                  Name
                </Typography>
                {selectedCal.map((cal) => (
                  <Box
                    key={cal.owner.email + cal.cal["dav:name"]}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      borderRadius: 2,
                      border: "1px solid #e5e7eb",
                      p: 1,
                      mb: 1,
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        src={cal.owner.avatarUrl}
                        alt={cal.owner.email}
                        sx={{
                          border: `2px solid ${
                            cal.cal["apple:color"] ?? "transparent"
                          }`,
                          boxShadow: cal.cal["apple:color"]
                            ? `0 0 0 2px ${cal.cal["apple:color"]}`
                            : "none",
                        }}
                      />

                      <Box>
                        <Typography variant="body1">
                          {cal.cal["dav:name"]}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {cal.owner.email}
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                      {colors.map((c) => (
                        <Box
                          key={c}
                          onClick={() =>
                            setSelectedCalendars((prev) =>
                              prev.map((prevcal) =>
                                prevcal.owner.email === cal.owner.email &&
                                prevcal.cal._links.self.href ===
                                  cal.cal._links.self.href
                                  ? {
                                      ...prevcal,
                                      cal: {
                                        ...prevcal.cal,
                                        "apple:color": c,
                                      },
                                    }
                                  : prevcal
                              )
                            )
                          }
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            bgcolor: c,
                            cursor: "pointer",
                            border:
                              cal.cal["apple:color"] === c
                                ? "2px solid black"
                                : "2px solid transparent",
                            transition: "all 0.2s",
                          }}
                        />
                      ))}

                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedCalendars((prev) =>
                            prev.filter(
                              (prevcal) =>
                                prevcal.cal._links.self.href !==
                                cal.cal._links.self.href
                            )
                          );
                          if (
                            !selectedCal.find(
                              (c) =>
                                cal.owner.email === c.owner.email &&
                                c.cal._links.self.href !==
                                  cal.cal._links.self.href
                            )
                          ) {
                            setSelectedUsers((prev) =>
                              prev.filter((u) => u.email !== cal.owner.email)
                            );
                          }
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>

          <CardActions sx={{ justifyContent: "flex-end", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => onClose({}, "backdropClick")}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Add
            </Button>
          </CardActions>
        </Card>
      </Box>
    </Modal>
  );
}
