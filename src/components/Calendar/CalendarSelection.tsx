import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";
import CalendarPopover from "../../features/Calendars/CalendarModal";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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
  return (
    <>
      <div>
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="persoCal-content"
            id="persoCal-header"
            className="calendarListHeader"
          >
            <Typography component="h3">Personnal Calendars</Typography>
            <Button onClick={() => setAnchorElCal(document.body)}>
              <AddIcon />
            </Button>
          </AccordionSummary>
          <AccordionDetails>
            {personnalCalendars.map((id) =>
              CalendarSelector(
                calendars,
                id,
                selectedCalendars,
                handleCalendarToggle,
                () => {
                  setAnchorElCal(document.body);
                  setSelectedCalId(id);
                }
              )
            )}
          </AccordionDetails>
        </Accordion>

        {delegatedCalendars.length > 0 && (
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="persoCal-content"
              id="persoCal-header"
              className="calendarListHeader"
            >
              <Typography component="h3">Delegated Calendars</Typography>
              <Button onClick={() => setAnchorElCal(document.body)}>
                <AddIcon />
              </Button>
            </AccordionSummary>
            <AccordionDetails>
              {delegatedCalendars.map((id) =>
                CalendarSelector(
                  calendars,
                  id,
                  selectedCalendars,
                  handleCalendarToggle,
                  () => {
                    setAnchorElCal(document.body);
                    setSelectedCalId(id);
                  }
                )
              )}
            </AccordionDetails>
          </Accordion>
        )}
        {sharedCalendars.length > 0 && (
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="persoCal-content"
              id="persoCal-header"
              className="calendarListHeader"
            >
              <Typography component="h3">Other Calendars</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {sharedCalendars.map((id) =>
                CalendarSelector(
                  calendars,
                  id,
                  selectedCalendars,
                  handleCalendarToggle,
                  () => {
                    setAnchorElCal(document.body);
                    setSelectedCalId(id);
                  }
                )
              )}
            </AccordionDetails>
          </Accordion>
        )}
      </div>

      <CalendarPopover
        anchorEl={anchorElCal}
        open={Boolean(anchorElCal)}
        onClose={() => {
          setAnchorElCal(null);
        }}
        calendar={calendars[selectedCalId] ?? undefined}
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
