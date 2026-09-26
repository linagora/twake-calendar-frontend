package com.linagora.calendar.e2e.tests;

import static com.linagora.calendar.e2e.docker.ClockAt.Day.LAST_OF_MONTH;

import com.linagora.calendar.e2e.docker.ClockAt;

/** The last day of a month, just after midnight. */
@ClockAt(day = LAST_OF_MONTH, time = "00:05")
class EdgeLastDayMidnightTest extends CalendarEdgesContract {
}
