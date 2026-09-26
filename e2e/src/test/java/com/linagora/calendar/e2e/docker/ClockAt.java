package com.linagora.calendar.e2e.docker;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Starts the test at an edge of the calendar rather than at the default instant of
 * {@link E2EClock}: the first or last day of the month closest to the anchor of the suite, or
 * the Sunday ending the default week, at the given time of day, in the browser zone.
 *
 * <p>On a class, it applies to all of its tests, inherited ones included.
 *
 * <p>Time flows from there: leave the test a few minutes before midnight, not seconds.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface ClockAt {
    Day day();

    /** {@code HH:mm}, Europe/Paris. */
    String time();

    enum Day {
        FIRST_OF_MONTH,
        LAST_OF_MONTH,
        /** The Sunday closing the default week: the last day of the week on screen. */
        SUNDAY
    }
}
