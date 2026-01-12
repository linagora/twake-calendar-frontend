import { useEffect, useState } from "react";

export function useSelectedCalendars(): string[] {
  const [calendars, setCalendars] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("selectedCalendars") ?? "[]");
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "selectedCalendars") {
        setCalendars(JSON.parse(e.newValue ?? "[]"));
      }
    };

    const onLocalChange = (e: CustomEvent<string[]>) => {
      setCalendars(e.detail);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "selectedCalendarsChanged",
      onLocalChange as EventListener
    );

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "selectedCalendarsChanged",
        onLocalChange as EventListener
      );
    };
  }, []);

  return calendars;
}
