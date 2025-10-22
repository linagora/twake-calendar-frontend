import { useAppSelector } from "../../app/hooks";

export function Error() {
  const userError = useAppSelector((state) => state.user.error);
  const calendarError = useAppSelector((state) => state.calendars.error);
  return (
    <div>
      <h1>Error:</h1>
      <span>{userError ? userError : calendarError}</span>
    </div>
  );
}
