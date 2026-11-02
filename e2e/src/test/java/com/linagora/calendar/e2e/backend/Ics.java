package com.linagora.calendar.e2e.backend;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Just enough iCalendar parsing to assert on what the SPA wrote.
 *
 * <p>A recurring event lives in a single calendar object: one master VEVENT carrying the
 * `RRULE`, plus one overriding VEVENT per modified occurrence, each carrying a
 * `RECURRENCE-ID`. Most recurrence regressions are visible right here.
 */
public class Ics {

    /** One of the iCalendar files the suite imports, by name, out of {@code src/test/resources/ics}. */
    public static Path fixture(String name) {
        try {
            return Path.of(Ics.class.getResource("/ics/" + name).toURI());
        } catch (Exception e) {
            throw new IllegalStateException("Missing fixture " + name, e);
        }
    }

    /** Unfolds the RFC 5545 line folding, so a property can be matched in one piece. */
    public static String unfold(String icalendar) {
        return icalendar.replaceAll("\r?\n[ \t]", "");
    }

    /** Every VEVENT of the calendar object, master first. */
    public static List<String> vevents(String icalendar) {
        List<String> events = new ArrayList<>();
        Matcher matcher = Pattern.compile("BEGIN:VEVENT(.*?)END:VEVENT", Pattern.DOTALL)
            .matcher(unfold(icalendar));
        while (matcher.find()) {
            events.add(matcher.group(1));
        }
        return events;
    }

    /**
     * The main VEVENT of a calendar object: the master of a series, or the only event.
     * Always go through it rather than reading a property off the whole object, which also
     * holds a VTIMEZONE carrying its own DTSTART and RRULE.
     */
    public static String event(String icalendar) {
        List<String> events = vevents(icalendar);
        return events.stream()
            .filter(vevent -> property(vevent, "RECURRENCE-ID").isEmpty())
            .findFirst()
            .orElseGet(events::getFirst);
    }

    /** The VEVENT holding the `RRULE`, that is the one the occurrences are generated from. */
    public static String master(String icalendar) {
        return vevents(icalendar).stream()
            .filter(vevent -> property(vevent, "RRULE").isPresent())
            .findFirst()
            .orElseThrow(() -> new AssertionError("No recurring VEVENT in:\n" + icalendar));
    }

    /** The VEVENTs overriding one occurrence, that is the exceptions of the series. */
    public static List<String> overrides(String icalendar) {
        return vevents(icalendar).stream()
            .filter(vevent -> property(vevent, "RECURRENCE-ID").isPresent())
            .toList();
    }

    /**
     * The parameters and the value of every line of a property, in order. A content line ends
     * its parameters at the first colon outside a quoted parameter value: the one of
     * {@code SENT-BY="mailto:assistant@example.com"} is part of the parameters.
     */
    private static List<String[]> contentLines(String vevent, String name) {
        List<String[]> lines = new ArrayList<>();
        Matcher matcher = Pattern.compile("^" + Pattern.quote(name) + "([;:][^\r\n]*)$", Pattern.MULTILINE)
            .matcher(vevent);
        while (matcher.find()) {
            String rest = matcher.group(1);
            boolean quoted = false;
            for (int i = 0; i < rest.length(); i++) {
                char character = rest.charAt(i);
                if (character == '"') {
                    quoted = !quoted;
                } else if (character == ':' && !quoted) {
                    lines.add(new String[] {rest.substring(0, i), rest.substring(i + 1)});
                    break;
                }
            }
        }
        return lines;
    }

    /**
     * The raw value of a property, parameters excluded. `RRULE` of a master, `SUMMARY`,
     * `SEQUENCE`... Empty when the property is absent.
     */
    public static Optional<String> property(String vevent, String name) {
        return contentLines(vevent, name).stream().findFirst().map(line -> line[1].trim());
    }

    /** The parameters of a property, `;TZID=Europe/Paris` and friends. Empty string when none. */
    public static String parameters(String vevent, String name) {
        return contentLines(vevent, name).stream().findFirst().map(line -> line[0]).orElse("");
    }

    /** Every value of a property that may appear several times, `EXDATE` typically. */
    public static List<String> properties(String vevent, String name) {
        return contentLines(vevent, name).stream().map(line -> line[1].trim()).toList();
    }

    /** The value of a content line, parameters excluded, the colons of quoted parameters skipped. */
    public static String value(String contentLine) {
        Matcher name = Pattern.compile("^[A-Za-z0-9-]+").matcher(contentLine);
        return name.find() ? property(contentLine, name.group()).orElse("") : "";
    }

    /** One part of an `RRULE`, `FREQ`, `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY`... */
    public static Optional<String> rulePart(String rrule, String part) {
        Matcher matcher = Pattern.compile("(?:^|;)" + Pattern.quote(part) + "=([^;]*)").matcher(rrule);
        return matcher.find() ? Optional.of(matcher.group(1)) : Optional.empty();
    }
}
