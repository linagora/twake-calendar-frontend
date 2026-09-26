package com.linagora.calendar.e2e.tests;

import static com.linagora.calendar.e2e.docker.ClockAt.Day.LAST_OF_MONTH;

import com.linagora.calendar.e2e.docker.ClockAt;

/** The last day of a month, a quarter to midnight: the next round hour is in the next month. */
@ClockAt(day = LAST_OF_MONTH, time = "23:45")
class EdgeLastDayEveningTest extends CalendarEdgesContract {
}
