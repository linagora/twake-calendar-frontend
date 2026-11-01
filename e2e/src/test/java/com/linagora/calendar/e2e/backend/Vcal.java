package com.linagora.calendar.e2e.backend;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Building blocks for the calendar objects other clients write: Outlook's Windows zone names,
 * custom VTIMEZONEs, rules and parameters this application does not produce itself.
 *
 * <p>{@link Ical} covers what the application writes; this class covers what it has to read
 * back and save without damage.
 */
public final class Vcal {
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");

    private Vcal() {
    }

    /** A date as iCalendar writes it: {@code 20261104}. */
    public static String day(LocalDate day) {
        return day.format(DAY);
    }

    /** Wraps components into a VCALENDAR, with the CRLF line endings RFC 5545 asks for. */
    public static String calendar(String... components) {
        String body = Arrays.stream(components)
            .map(component -> component.endsWith("\n") ? component : component + "\n")
            .collect(Collectors.joining());
        return ("BEGIN:VCALENDAR\n"
            + "VERSION:2.0\n"
            + "PRODID:-//Other client//e2e interop//EN\n"
            + body
            + "END:VCALENDAR\n").replace("\r\n", "\n").replace("\n", "\r\n");
    }

    /** A zone with a single fixed offset, under any name: {@code +0100}, {@code -0500}. */
    public static String fixedZone(String tzid, String offset) {
        return """
            BEGIN:VTIMEZONE
            TZID:%s
            BEGIN:STANDARD
            DTSTART:19700101T000000
            TZOFFSETFROM:%s
            TZOFFSETTO:%s
            END:STANDARD
            END:VTIMEZONE
            """.formatted(tzid, offset, offset);
    }

    /**
     * Central European time under a given name: what Outlook writes as
     * {@code Romance Standard Time}, and what everybody else calls {@code Europe/Paris}.
     */
    public static String centralEuropeanZone(String tzid) {
        return """
            BEGIN:VTIMEZONE
            TZID:%s
            BEGIN:STANDARD
            DTSTART:16011028T030000
            RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10
            TZOFFSETFROM:+0200
            TZOFFSETTO:+0100
            END:STANDARD
            BEGIN:DAYLIGHT
            DTSTART:16010325T020000
            RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3
            TZOFFSETFROM:+0100
            TZOFFSETTO:+0200
            END:DAYLIGHT
            END:VTIMEZONE
            """.formatted(tzid);
    }

    /** The TZID of every VTIMEZONE of a calendar object. */
    public static List<String> vtimezoneIds(String icalendar) {
        return Arrays.stream(Ics.unfold(icalendar).split("BEGIN:VTIMEZONE"))
            .skip(1)
            .map(block -> Ics.property(block, "TZID").orElse(""))
            .toList();
    }

    /** Every ATTENDEE line of a VEVENT naming that address, whatever its case. */
    public static List<String> attendeeLines(String vevent, String email) {
        String address = email.toLowerCase(Locale.ROOT);
        return Arrays.stream(Ics.unfold(vevent).split("\r?\n"))
            .filter(line -> line.toUpperCase(Locale.ROOT).startsWith("ATTENDEE"))
            .filter(line -> line.toLowerCase(Locale.ROOT).replace(" ", "").contains(address))
            .toList();
    }

    /** The PARTSTAT of an ATTENDEE line, empty when it carries none. */
    public static String partstat(String attendeeLine) {
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("PARTSTAT=([A-Z-]+)").matcher(attendeeLine);
        return matcher.find() ? matcher.group(1) : "";
    }
}
