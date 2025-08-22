import { useAppDispatch, useAppSelector } from "../../app/hooks";

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

  return (
    <div>
      <p className="calendarListHeader">
        <h3>Personnal Calendars</h3>
      </p>
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
          <p className="calendarListHeader">
            <h3>Delegated Calendars</h3>
          </p>
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
          <p className="calendarListHeader">
            <h3>Shared Calendars</h3>
          </p>
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
  );
}
