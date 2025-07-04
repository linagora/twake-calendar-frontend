import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { getCalendarDetailAsync } from "../../features/Calendars/CalendarSlice";

export default function CalendarSelection({
  selectedCalendars,
  setSelectedCalendars,
}: {
  selectedCalendars: string[];
  setSelectedCalendars: Function;
}) {
  const tokens = useAppSelector((state) => state.user.tokens);
  const userId = useAppSelector((state) => state.user.userData.openpaasId);
  const dispatch = useAppDispatch();
  const calendars = useAppSelector((state) => state.calendars.list);

  const handleCalendarToggle = (name: string) => {

    setSelectedCalendars((prev: string[]) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  return (
    <div>
      <h3>personnalCalendars</h3>
      {Object.keys(calendars)
        .filter((id) => id.split("/")[0] === userId)
        .map((id) => {
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
      <h3>sharedCalendars</h3>
      {Object.keys(calendars)
        .filter((id) => id.split("/")[0] !== userId)
        .map((id) => (
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
    </div>
  );
}
