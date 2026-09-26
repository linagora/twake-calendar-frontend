package com.linagora.calendar.e2e.tests;

import static com.linagora.calendar.e2e.docker.ClockAt.Day.FIRST_OF_MONTH;

import com.linagora.calendar.e2e.docker.ClockAt;

/** The first day of a month, just after midnight: yesterday is in the previous month. */
@ClockAt(day = FIRST_OF_MONTH, time = "00:05")
class EdgeFirstDayMidnightTest extends CalendarEdgesContract {
}
