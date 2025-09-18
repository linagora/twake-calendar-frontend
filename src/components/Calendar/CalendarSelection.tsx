import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Typography from "@mui/material/Typography";
import { useAppSelector } from "../../app/hooks";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import CalendarPopover from "../../features/Calendars/CalendarModal";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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

  if (calendars.length === 0) return null;
  const [expended, setExpended] = useState(defaultExpanded);

  return (
    <Accordion defaultExpanded={defaultExpanded} expanded={expended}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${title}-content`}
        id={`${title}-header`}
        className="calendarListHeader"
        onClick={() => setExpended(!expended)}
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
      <AccordionDetails>
        {calendars.map((id) =>
          CalendarSelector(
            allCalendars,
            id,
            selectedCalendars,
            handleToggle,
            () => setOpen(id)
          )
        )}
      </AccordionDetails>
    </Accordion>
  );
}
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CalendarSearch from "./CalendarSearch";

export default function CalendarSelection({
  selectedCalendars,
  setSelectedCalendars,
}: {
  selectedCalendars: string[];
  setSelectedCalendars: Function;
}) {
  const userId = useAppSelector((state) => state.user.userData.openpaasId);
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
          defaultExpanded
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
        anchorEl={anchorElCal}
        open={Boolean(anchorElCal)}
        onClose={() => {
          setSelectedCalId("");
          setAnchorElCal(null);
        }}
      />
      <CalendarSearch
        anchorEl={anchorElCalOthers}
        open={Boolean(anchorElCalOthers)}
        onClose={() => setAnchorElCalOthers(null)}
      />
    </>
  );
}

function CalendarSelector(
  calendars: Record<string, Calendars>,
  id: string,
  selectedCalendars: string[],
  handleCalendarToggle: (name: string) => void,
  setOpen: Function
) {
  return (
    <div key={id}>
      <label>
        <Checkbox
          sx={{
            color: calendars[id].color,
            "&.Mui-checked": { color: calendars[id].color },
          }}
          size="small"
          checked={selectedCalendars.includes(id)}
          onChange={() => handleCalendarToggle(id)}
        />
        {calendars[id].name}
      </label>
      <IconButton onClick={() => setOpen()}>
        <MoreVertIcon />
      </IconButton>
    </div>
  );
}
