package com.linagora.calendar.e2e.tests;

import static com.linagora.calendar.e2e.docker.ClockAt.Day.FIRST_OF_MONTH;

import com.linagora.calendar.e2e.docker.ClockAt;

/** The first day of a month, a quarter to midnight. */
@ClockAt(day = FIRST_OF_MONTH, time = "23:45")
class EdgeFirstDayEveningTest extends CalendarEdgesContract {
}
