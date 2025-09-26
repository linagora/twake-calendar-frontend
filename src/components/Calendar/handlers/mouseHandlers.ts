export interface MouseHandlersProps {
  calendarEl: HTMLElement;
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
      const hourHeight = rect.height / 24;
      const hourIndex = Math.floor(relativeY / hourHeight);

      if (relativeY >= 0 && relativeY <= rect.height) {
        const highlight = document.createElement("div");
        highlight.className = "hour-highlight";
        highlight.style.top = `${hourIndex * hourHeight}px`;
        highlight.style.height = `${hourHeight}px`;

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

    (calendarEl as any).__calendarMouseMoveHandler = handleMouseMove;
    (calendarEl as any).__calendarMouseLeaveHandler = handleMouseLeave;
  };

  const removeMouseEventListeners = () => {
    if ((calendarEl as any).__calendarMouseMoveHandler) {
      calendarEl.removeEventListener(
        "mousemove",
        (calendarEl as any).__calendarMouseMoveHandler
      );
      delete (calendarEl as any).__calendarMouseMoveHandler;
    }
    if ((calendarEl as any).__calendarMouseLeaveHandler) {
      calendarEl.removeEventListener(
        "mouseleave",
        (calendarEl as any).__calendarMouseLeaveHandler
      );
      delete (calendarEl as any).__calendarMouseLeaveHandler;
    }
  };

  return {
    handleMouseMove,
    handleMouseLeave,
    addMouseEventListeners,
    removeMouseEventListeners,
  };
};
