interface CalendarHTMLElement extends HTMLElement {
  __calendarMouseMoveHandler?: (e: MouseEvent) => void;
  __calendarMouseLeaveHandler?: () => void;
}
export interface MouseHandlersProps {
  calendarEl: CalendarHTMLElement;
}

export const createMouseHandlers = (props: MouseHandlersProps) => {
  const { calendarEl } = props;

  const handleMouseMove = (e: MouseEvent) => {
    const timegridEl = calendarEl.querySelector(".fc-timegrid-body");
    if (!timegridEl) return;

    const allDayTable = calendarEl.querySelector(".fc-scrollgrid-sync-table");
    if (allDayTable) {
      const allDayRect = allDayTable.getBoundingClientRect();
      if (e.clientY >= allDayRect.top && e.clientY <= allDayRect.bottom) {
        timegridEl
          .querySelectorAll(".hour-highlight")
          .forEach((el: Element) => el.remove());
        return;
      }
    }

    const target = e.target as HTMLElement;
    if (target && target.closest(".fc-timegrid-slot-label")) {
      timegridEl
        .querySelectorAll(".hour-highlight")
        .forEach((el: Element) => el.remove());
      return;
    }

    const dayColumns = timegridEl.querySelectorAll(".fc-timegrid-col");
    if (dayColumns.length === 0) return;

    timegridEl
      .querySelectorAll(".hour-highlight")
      .forEach((el: Element) => el.remove());

    let targetColumn: Element | null = null;
    for (const column of dayColumns) {
      const rect = column.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right) {
        targetColumn = column;
        break;
      }
    }

    if (targetColumn) {
      const rect = targetColumn.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const slotHeight = rect.height / 48;
      const slotIndex = Math.floor(relativeY / slotHeight);

      if (relativeY >= 0 && relativeY <= rect.height) {
        const highlight = document.createElement("div");
        highlight.className = "hour-highlight";
        highlight.style.top = `${slotIndex * slotHeight}px`;
        highlight.style.height = `${slotHeight}px`;

        (targetColumn as HTMLElement).style.position = "relative";
        targetColumn.appendChild(highlight);
      }
    }
  };

  const handleMouseLeave = () => {
    const timegridEl = calendarEl.querySelector(".fc-timegrid-body");
    if (timegridEl) {
      timegridEl
        .querySelectorAll(".hour-highlight")
        .forEach((el: Element) => el.remove());
    }
  };

  const addMouseEventListeners = () => {
    calendarEl.addEventListener("mousemove", handleMouseMove);
    calendarEl.addEventListener("mouseleave", handleMouseLeave);

    calendarEl.__calendarMouseMoveHandler = handleMouseMove;
    calendarEl.__calendarMouseLeaveHandler = handleMouseLeave;
  };

  const removeMouseEventListeners = () => {
    if (calendarEl.__calendarMouseMoveHandler) {
      calendarEl.removeEventListener(
        "mousemove",
        calendarEl.__calendarMouseMoveHandler
      );
      delete calendarEl.__calendarMouseMoveHandler;
    }
    if (calendarEl.__calendarMouseLeaveHandler) {
      calendarEl.removeEventListener(
        "mouseleave",
        calendarEl.__calendarMouseLeaveHandler
      );
      delete calendarEl.__calendarMouseLeaveHandler;
    }
  };

  return {
    handleMouseMove,
    handleMouseLeave,
    addMouseEventListeners,
    removeMouseEventListeners,
  };
};
