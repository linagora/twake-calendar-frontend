import { Button } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AddIcon from "@mui/icons-material/Add";
import { useEffect, useState } from "react";
import CalendarPopover from "../../features/Calendars/CalendarModal";

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

  const [anchorElCal, setAnchorElCal] = useState<HTMLElement | null>(null);

  return (
    <>
      <div>
        <div className="calendarListHeader">
          <h3>Personnal Calendars</h3>
          <Button onClick={() => setAnchorElCal(document.body)}>
            <AddIcon />
          </Button>
        </div>
        {personnalCalendars.map((id) => {
          return (
            <div key={id}>
              <label>
                <input
                  type="checkbox"
                  style={{ backgroundColor: calendars[id].color }}
                  checked={selectedCalendars.includes(id)}
                  onChange={() => handleCalendarToggle(id)}
                />
                {calendars[id].name}
              </label>
            </div>
          );
        })}
        {delegatedCalendars.length > 0 && (
          <>
            <span className="calendarListHeader">
              <h3>Delegated Calendars</h3>
            </span>
            {delegatedCalendars.map((id) => (
              <div key={id}>
                <label>
                  <input
                    type="checkbox"
                    style={{ backgroundColor: calendars[id].color }}
                    checked={selectedCalendars.includes(id)}
                    onChange={() => handleCalendarToggle(id)}
                  />
                  {calendars[id].name}
                </label>
              </div>
            ))}
          </>
        )}
        {sharedCalendars.length > 0 && (
          <>
            <span className="calendarListHeader">
              <h3>Shared Calendars</h3>
            </span>
            {sharedCalendars.map((id) => (
              <div key={id}>
                <label>
                  <input
                    type="checkbox"
                    style={{ backgroundColor: calendars[id].color }}
                    checked={selectedCalendars.includes(id)}
                    onChange={() => handleCalendarToggle(id)}
                  />
                  {calendars[id].name}
                </label>
              </div>
            ))}
          </>
        )}
      </div>
      <CalendarPopover
        anchorEl={anchorElCal}
        open={Boolean(anchorElCal)}
        onClose={() => setAnchorElCal(null)}
      />
    </>
  );
}
