import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Typography from "@mui/material/Typography";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AddIcon from "@mui/icons-material/Add";
import { useState, useMemo } from "react";
import CalendarPopover from "./CalendarModal";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CalendarSearch from "./CalendarSearch";
import { Divider, ListItem, Menu, MenuItem } from "@mui/material";
import { removeCalendarAsync } from "../../features/Calendars/CalendarSlice";
import { DeleteCalendarDialog } from "./DeleteCalendarDialog";
import { trimLongTextWithoutSpace } from "../../utils/textUtils";

function CalendarAccordion({
  title,
  calendars,
  selectedCalendars,
  handleToggle,
  showAddButton = false,
  onAddClick,
  defaultExpanded = false,
  setOpen,
}: {
  title: string;
  calendars: string[];
  selectedCalendars: string[];
  handleToggle: (id: string) => void;
  showAddButton?: boolean;
  onAddClick?: Function;
  defaultExpanded?: boolean;
  setOpen: Function;
}) {
  const allCalendars = useAppSelector((state) => state.calendars.list);

  const [expended, setExpended] = useState(defaultExpanded);
  if (calendars.length === 0 && !defaultExpanded) return null;

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      expanded={expended}
      style={{ width: "100%", padding: 0, margin: 0, boxShadow: "none" }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${title}-content`}
        id={`${title}-header`}
        className="calendarListHeader"
        onClick={() => setExpended(!expended)}
        sx={{
          "& .MuiAccordionSummary-content": {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          },
        }}
      >
        <Typography component="h3">{title}</Typography>
        {showAddButton && (
          <IconButton
            component="span"
            onClick={(e) => {
              expended && e.stopPropagation();
              onAddClick && onAddClick();
            }}
          >
            <AddIcon />
          </IconButton>
        )}
      </AccordionSummary>
      <AccordionDetails style={{ textAlign: "left", padding: 0 }}>
        {calendars.map((id) => (
          <CalendarSelector
            key={id}
            calendars={allCalendars}
            id={id}
            isPersonnal={defaultExpanded}
            selectedCalendars={selectedCalendars}
            handleCalendarToggle={handleToggle}
            setOpen={() => setOpen(id)}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

export default function CalendarSelection({
  selectedCalendars,
  setSelectedCalendars,
}: {
  selectedCalendars: string[];
  setSelectedCalendars: Function;
}) {
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const calendars = useAppSelector((state) => state.calendars.list);

  const personnalCalendars = Object.keys(calendars).filter(
    (id) => id.split("/")[0] === userId
  );
  const delegatedCalendars = Object.keys(calendars).filter(
    (id) => id.split("/")[0] !== userId && calendars[id].delegated
  );
  const sharedCalendars = Object.keys(calendars).filter(
    (id) => id.split("/")[0] !== userId && !calendars[id].delegated
  );

  const handleCalendarToggle = (name: string) => {
    setSelectedCalendars((prev: string[]) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };
  const [selectedCalId, setSelectedCalId] = useState("");

  const [anchorElCal, setAnchorElCal] = useState<HTMLElement | null>(null);
  const [anchorElCalOthers, setAnchorElCalOthers] =
    useState<HTMLElement | null>(null);

  return (
    <>
      <div>
        <CalendarAccordion
          title="Personnal Calendars"
          calendars={personnalCalendars}
          selectedCalendars={selectedCalendars}
          handleToggle={handleCalendarToggle}
          showAddButton
          onAddClick={() => setAnchorElCal(document.body)}
          setOpen={(id: string) => {
            setAnchorElCal(document.body);
            setSelectedCalId(id);
          }}
          defaultExpanded
        />

        <CalendarAccordion
          title="Delegated Calendars"
          calendars={delegatedCalendars}
          selectedCalendars={selectedCalendars}
          handleToggle={handleCalendarToggle}
          setOpen={(id: string) => {
            setAnchorElCal(document.body);
            setSelectedCalId(id);
          }}
        />

        <CalendarAccordion
          title="Other Calendars"
          calendars={sharedCalendars}
          selectedCalendars={selectedCalendars}
          showAddButton
          onAddClick={() => {
            setAnchorElCalOthers(document.body);
          }}
          handleToggle={handleCalendarToggle}
          setOpen={(id: string) => {
            setAnchorElCal(document.body);
            setSelectedCalId(id);
          }}
        />
      </div>
      <CalendarPopover
        open={Boolean(anchorElCal)}
        calendar={calendars[selectedCalId] ?? undefined}
        onClose={() => {
          setSelectedCalId("");
          setAnchorElCal(null);
        }}
      />
      <CalendarSearch
        anchorEl={anchorElCalOthers}
        open={Boolean(anchorElCalOthers)}
        onClose={(newCalIds?: string[]) => {
          setAnchorElCalOthers(null);
          if (newCalIds?.length) {
            newCalIds.forEach((id) => handleCalendarToggle(id));
          }
        }}
      />
    </>
  );
}

function CalendarSelector({
  calendars,
  id,
  isPersonnal,
  selectedCalendars,
  handleCalendarToggle,
  setOpen,
}: {
  calendars: Record<string, Calendars>;
  id: string;
  isPersonnal: boolean;
  selectedCalendars: string[];
  handleCalendarToggle: (name: string) => void;
  setOpen: Function;
}) {
  const dispatch = useAppDispatch();
  const calLink =
    useAppSelector((state) => state.calendars.list[id].link) ?? "";

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const [userId, calId] = id.split("/");
  const isDefault = isPersonnal && userId === calId;

  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const handleDeleteConfirm = () => {
    dispatch(removeCalendarAsync({ calId: id, calLink }));
    setDeletePopupOpen(false);
    handleClose();
  };

  const trimmedName = useMemo(
    () => trimLongTextWithoutSpace(calendars[id].name),
    [calendars, id]
  );
  return (
    <>
      <ListItem
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background-color 0.2s ease",
          padding: "8px 24px 8px 16px",
          "& .MoreBtn": {
            opacity: 0,
          },
          "&:hover": {
            backgroundColor: "#F3F3F6",
            "& .MoreBtn": {
              opacity: 1,
            },
          },
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            maxWidth: "calc(100% - 40px)",
            overflow: "hidden",
          }}
        >
          <Checkbox
            sx={{
              color: calendars[id].color?.light,
              "&.Mui-checked": { color: calendars[id].color?.light },
            }}
            size="small"
            checked={selectedCalendars.includes(id)}
            onChange={() => handleCalendarToggle(id)}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
            }}
          >
            {trimmedName}
          </span>
        </label>
        <IconButton className="MoreBtn" onClick={handleClick}>
          <MoreVertIcon />
        </IconButton>
      </ListItem>
      <Menu id={id} anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem
          onClick={() => {
            setOpen();
            handleClose();
          }}
        >
          Modify
        </MenuItem>
        {!isDefault && <Divider />}
        {!isDefault && (
          <MenuItem onClick={() => setDeletePopupOpen(!deletePopupOpen)}>
            {isPersonnal ? "Delete" : "Remove"}
          </MenuItem>
        )}
      </Menu>

      <DeleteCalendarDialog
        deletePopupOpen={deletePopupOpen}
        setDeletePopupOpen={setDeletePopupOpen}
        calendars={calendars}
        id={id}
        isPersonnal={isPersonnal}
        handleDeleteConfirm={handleDeleteConfirm}
      />
    </>
  );
}
