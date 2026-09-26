package com.linagora.calendar.e2e.backend;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/** Minimal iCalendar builder, to seed events straight into CalDAV. */
public class Ical {
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter UTC = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    /** A one hour event on the given day, in UTC. */
    public static String event(String uid, String summary, LocalDate day, int startHourUtc) {
        String date = day.format(DAY);
        return """
            BEGIN:VCALENDAR
            VERSION:2.0
            PRODID:-//linagora//twake-calendar-e2e//EN
            BEGIN:VEVENT
            UID:%s
            DTSTAMP:%sT%02d0000Z
            DTSTART:%sT%02d0000Z
            DTEND:%sT%02d0000Z
            SUMMARY:%s
            END:VEVENT
            END:VCALENDAR
            """.formatted(uid, date, startHourUtc, date, startHourUtc, date, startHourUtc + 1, summary)
            .replace("\n", "\r\n");
    }

    /** An event between two instants, written in UTC whatever zone they are given in. */
    public static String eventBetween(String uid, String summary, ZonedDateTime start, ZonedDateTime end) {
        return """
            BEGIN:VCALENDAR
            VERSION:2.0
            PRODID:-//linagora//twake-calendar-e2e//EN
            BEGIN:VEVENT
            UID:%s
            DTSTAMP:%s
            DTSTART:%s
            DTEND:%s
            SUMMARY:%s
            END:VEVENT
            END:VCALENDAR
            """.formatted(uid, utc(start), utc(start), utc(end), summary)
            .replace("\n", "\r\n");
    }

    private static String utc(ZonedDateTime instant) {
        return instant.withZoneSameInstant(ZoneOffset.UTC).format(UTC);
    }

    /** Same, organised by somebody: what the application writes for an event it creates. */
    public static String eventOrganisedBy(String uid, String summary, LocalDate day, int startHourUtc,
                                          String organizerEmail) {
        return event(uid, summary, day, startHourUtc)
            .replace("SUMMARY:", "ORGANIZER:mailto:" + organizerEmail + "\r\nSUMMARY:");
    }

    /** Same, marked private: only its owner may read what it is about. */
    public static String privateEvent(String uid, String summary, String location, LocalDate day,
                                      int startHourUtc) {
        return event(uid, summary, day, startHourUtc)
            .replace("SUMMARY:", "CLASS:PRIVATE\r\nLOCATION:" + location + "\r\nSUMMARY:");
    }
}
