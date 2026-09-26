package com.linagora.calendar.e2e.docker;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;

import com.microsoft.playwright.BrowserContext;

/**
 * The clock of the suite, shared by the tests and the browsers, and deterministic.
 *
 * <p>A calendar behaves differently on a Sunday, on the last day of a month or at 23:50, and a
 * suite reading the wall clock therefore passes or fails depending on when it runs. Every test
 * rather starts at a chosen instant, and time then flows normally from there:
 *
 * <ul>
 *   <li>by default, a Wednesday at 10:00, whose week lies whole within its month: no test
 *   depends on the day it happens to run any more;</li>
 *   <li>a test annotated {@link ClockAt} starts at the edge it names instead, which is how the
 *   first and last days of a month and the first and last minutes of a day are covered;</li>
 *   <li>{@code E2E_NOW=2026-09-27T23:50} moves the whole suite to that instant, to reproduce a
 *   failure seen elsewhere. The edges of the {@link ClockAt} tests are taken around it.</li>
 * </ul>
 *
 * <p>Only the browsers and the tests are moved. The backend keeps the real clock, which is why
 * the chosen instants stay within a couple of weeks of the real date: dates the tests write are
 * explicit, and nothing the server computes from its own clock drifts far enough to matter.
 */
public final class E2EClock {
    public static final ZoneId BROWSER_ZONE = ZoneId.of("Europe/Paris");
    public static final LocalTime DEFAULT_TIME = LocalTime.of(10, 0);

    /** How far the clock of the running test is ahead of the real one, in milliseconds. */
    private static final ThreadLocal<Long> SHIFT = ThreadLocal.withInitial(() -> 0L);

    private E2EClock() {
    }

    /** Where the suite is anchored: the real date, or the one {@code E2E_NOW} forces. */
    static LocalDateTime base() {
        String forced = System.getenv("E2E_NOW");
        if (forced == null || forced.isBlank()) {
            return LocalDateTime.now(BROWSER_ZONE);
        }
        String value = forced.trim();
        return value.length() == 10 ? LocalDate.parse(value).atTime(DEFAULT_TIME) : LocalDateTime.parse(value);
    }

    /** The instant a test without {@link ClockAt} starts at. */
    public static LocalDateTime defaultStart() {
        if (System.getenv("E2E_NOW") != null && !System.getenv("E2E_NOW").isBlank()) {
            return base();
        }
        // the Wednesday closest to the real date whose week lies whole within its month, from
        // Monday (-2) to Sunday (+4): close, since the backend keeps the real clock
        LocalDate real = base().toLocalDate();
        LocalDate thisWeek = real.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).plusDays(2);
        LocalDate wednesday = java.util.stream.Stream.of(thisWeek, thisWeek.plusWeeks(1), thisWeek.minusWeeks(1))
            .filter(day -> day.getDayOfMonth() >= 3 && day.getDayOfMonth() <= day.lengthOfMonth() - 4)
            .min(java.util.Comparator.comparingLong((LocalDate day) ->
                Math.abs(ChronoUnit.DAYS.between(real, day))).thenComparing(day -> day.isBefore(real)))
            .orElseThrow();
        return wednesday.atTime(DEFAULT_TIME);
    }

    /**
     * The month boundary closest to the anchor: the one it follows in the first half of a
     * month, the one it precedes in the second half.
     */
    public static LocalDate firstDayOfEdgeMonth() {
        LocalDate anchor = base().toLocalDate();
        return anchor.getDayOfMonth() <= 15 ? anchor.withDayOfMonth(1) : anchor.plusMonths(1).withDayOfMonth(1);
    }

    public static LocalDateTime startOf(ClockAt at) {
        LocalDate first = firstDayOfEdgeMonth();
        LocalDate day = switch (at.day()) {
            case FIRST_OF_MONTH -> first;
            case LAST_OF_MONTH -> first.minusDays(1);
            case SUNDAY -> defaultStart().toLocalDate().with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        };
        return day.atTime(LocalTime.parse(at.time()));
    }

    /** Starts the clock of the current test at the given instant, in the browser zone. */
    public static void startAt(LocalDateTime start) {
        SHIFT.set(start.atZone(BROWSER_ZONE).toInstant().toEpochMilli() - System.currentTimeMillis());
    }

    static void reset() {
        SHIFT.remove();
    }

    public static LocalDateTime now() {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(System.currentTimeMillis() + SHIFT.get()),
            BROWSER_ZONE);
    }

    public static LocalDate today() {
        return now().toLocalDate();
    }

    /**
     * A day far enough ahead to be in the future for the browser and for the backend alike,
     * whose clocks differ by a few days: what the server computes from its own, bookable slots
     * typically, needs it.
     */
    public static LocalDate daysAheadOnBothClocks(int days) {
        LocalDate real = LocalDate.now(BROWSER_ZONE);
        return (today().isAfter(real) ? today() : real).plusDays(days);
    }

    /** Today somewhere else, at the instant of the test: a zone far east is often tomorrow. */
    public static LocalDate today(ZoneId zone) {
        return now().atZone(BROWSER_ZONE).withZoneSameInstant(zone).toLocalDate();
    }

    /**
     * Moves the clock of every page of the context to the one of the test.
     *
     * <p>Except on the OIDC callback, which checks the freshly issued tokens against the clock
     * and would find them expired from a later day. The SPA reads its date once, as it starts,
     * so the login is followed by a reload: see {@code LoginPage}.
     */
    public static void install(BrowserContext context) {
        context.addInitScript("""
            (() => {
              const shift = %d;
              const RealDate = Date;
              const offset = () => location.pathname.startsWith('/callback') ? 0 : shift;
              class ShiftedDate extends RealDate {
                constructor(...args) {
                  if (args.length === 0) { super(RealDate.now() + offset()); } else { super(...args); }
                }
                static now() { return RealDate.now() + offset(); }
              }
              globalThis.Date = ShiftedDate;
            })();""".formatted(SHIFT.get()));
    }
}
