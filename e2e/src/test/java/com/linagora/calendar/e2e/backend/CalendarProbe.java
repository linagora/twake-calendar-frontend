package com.linagora.calendar.e2e.backend;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.bson.Document;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.linagora.calendar.e2e.docker.E2EClock;
import com.linagora.calendar.e2e.docker.TwakeCalendarStack;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

/**
 * Backend side view of a user's calendar, for tests that need to seed a fixture or to assert
 * that what the UI showed really made it to the server.
 *
 * <p>It talks CalDAV to Sabre with the admin impersonation credentials, which sidesteps OIDC
 * entirely: a probe call never disturbs the browser session under test.
 */
public class CalendarProbe {
    private static final String SABRE_ADMIN_PASSWORD = "secret123";
    private static final Pattern SUMMARY = Pattern.compile("^SUMMARY:(.*)$", Pattern.MULTILINE);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final Pattern HREF = Pattern.compile("<[^>]*href>([^<]*\\.ics)</[^>]*href>");

    private final HttpClient httpClient;
    private final String davBaseUrl;
    private final MongoDatabase esnDatabase;

    public CalendarProbe(TwakeCalendarStack stack) {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
        this.davBaseUrl = stack.davUri();
        MongoClient mongoClient = MongoClients.create(stack.mongoUri());
        this.esnDatabase = mongoClient.getDatabase("esn_docker");
    }

    /**
     * OpenPaaS identifier of a user, which is also the name of its DAV principal.
     * Empty until the user logged in once: the side service provisions accounts lazily,
     * on the first authenticated call.
     */
    public Optional<String> openPaasId(E2EUser user) {
        return Optional.ofNullable(esnDatabase.getCollection("users")
                .find(new Document("accounts.emails", user.email())).first())
            .map(document -> document.getObjectId("_id").toString());
    }

    public String requireOpenPaasId(E2EUser user) {
        return openPaasId(user).orElseThrow(() -> new IllegalStateException(
            user.email() + " is not provisioned yet. It gets created upon its first login."));
    }

    /** The display names of every calendar collection the user owns. */
    public List<String> calendarNames(E2EUser user) {
        HttpResponse<String> response = execute(user, "PROPFIND",
            "/calendars/" + requireOpenPaasId(user) + "/", null, null);
        List<String> names = new ArrayList<>();
        Matcher matcher = Pattern.compile("<[^>]*displayname[^>]*>([^<]+)<").matcher(response.body());
        while (matcher.find()) {
            names.add(matcher.group(1).trim());
        }
        return names;
    }

    /** Summaries of every event of the user's default calendar. */
    public List<String> eventSummaries(E2EUser user) {
        return eventHrefs(user).stream()
            .map(href -> get(user, href))
            .map(this::summaryOf)
            .flatMap(Optional::stream)
            .toList();
    }

    /** Raw iCalendar payload of every event of the user's default calendar. */
    public List<String> rawEvents(E2EUser user) {
        return eventHrefs(user).stream()
            .map(href -> get(user, href))
            .toList();
    }

    /**
     * The one and only calendar object of the user, raw. A recurring event is a single object,
     * holding its master VEVENT and one VEVENT per overridden occurrence.
     */
    public String singleEvent(E2EUser user) {
        List<String> events = rawEvents(user);
        if (events.size() != 1) {
            throw new AssertionError("Expected exactly one calendar object, got " + events.size());
        }
        return events.getFirst();
    }

    /** Removes every event of the user's default calendar, to give a test a clean slate. */
    public void clearCalendar(E2EUser user) {
        eventHrefs(user).forEach(href -> execute(user, "DELETE", href, null, null));
    }

    public void deleteEvent(E2EUser user, String eventUid) {
        execute(user, "DELETE", defaultCalendarPath(user) + eventUid + ".ics", null, null);
    }

    /** Writes an event straight into the user's default calendar, bypassing the UI. */
    public void putEvent(E2EUser user, String eventUid, String icalendar) {
        String href = defaultCalendarPath(user) + eventUid + ".ics";
        HttpResponse<String> response = execute(user, "PUT", href, icalendar, "text/calendar");
        if (response.statusCode() != 201 && response.statusCode() != 204) {
            throw new IllegalStateException("Failed to create event " + eventUid + ": "
                + response.statusCode() + " " + response.body());
        }
    }

    /**
     * What every authenticated user of the instance may do with a calendar, whether or not it was
     * shared with them: the "public right" of esn-sabre, in the vocabulary its ACL route speaks.
     */
    public enum PublicRight {
        NONE(""),
        READ("{DAV:}read"),
        READ_WRITE("{DAV:}write");

        private final String privilege;

        PublicRight(String privilege) {
            this.privilege = privilege;
        }

        /** The ACL privilege the right grants to every authenticated user, empty for none. */
        public String privilege() {
            return privilege;
        }
    }

    /** Sets the public right of the user's default calendar. */
    public void setPublicRight(E2EUser user, PublicRight right) {
        HttpResponse<String> response = execute(user, "ACL", defaultCalendarJsonPath(user),
            "{\"public_right\":\"" + right.privilege + "\"}", "application/json",
            // esn-sabre reads the body as JSON only for a client that asks for JSON back
            "application/json");
        if (response.statusCode() != 200 && response.statusCode() != 204) {
            throw new IllegalStateException("Failed to set the public right of " + user.email()
                + " to " + right + ": " + response.statusCode() + " " + response.body());
        }
    }

    /**
     * The privileges the user's default calendar grants to every authenticated user, read back
     * from Sabre: empty for a calendar nobody but its owner and grantees may read.
     *
     * <p>Fails rather than answering empty when the list cannot be read or does not hold the
     * default calendar: an empty answer is what a private calendar looks like, and a privacy
     * assertion must never pass on a request that went wrong.
     */
    public List<String> publicPrivileges(E2EUser user) {
        JsonNode calendar = listedDefaultCalendar(user);
        List<String> privileges = new ArrayList<>();
        for (JsonNode entry : calendar.path("acl")) {
            if ("{DAV:}authenticated".equals(entry.path("principal").asText())) {
                privileges.add(entry.path("privilege").asText());
            }
        }
        return privileges;
    }

    /** The default calendar of the user, as the JSON listing of their home describes it. */
    private JsonNode listedDefaultCalendar(E2EUser user) {
        HttpResponse<String> response = execute(user, "GET",
            "/calendars/" + requireOpenPaasId(user) + ".json?personal=true&withRights=true",
            null, null, "application/calendar+json");
        if (response.statusCode() != 200) {
            throw new IllegalStateException("Could not list the calendars of " + user.email()
                + ": " + response.statusCode() + " " + response.body());
        }
        String href = defaultCalendarJsonPath(user);
        for (JsonNode calendar : readJson(response).path("_embedded").path("dav:calendar")) {
            if (href.equals(calendar.path("_links").path("self").path("href").asText())) {
                return calendar;
            }
        }
        throw new IllegalStateException("No default calendar " + href + " in the calendars of "
            + user.email() + ": " + response.body());
    }

    private JsonNode readJson(HttpResponse<String> response) {
        try {
            return JSON.readTree(response.body());
        } catch (Exception e) {
            throw new IllegalStateException("Not JSON: " + response.body(), e);
        }
    }

    /**
     * The HTTP status Sabre answers when the reader asks for this week's events of a calendar
     * node, {@code /calendars/<home>/<calendar>}: 200 when they may read it -- as its owner, or
     * because it is public -- and 403 when they may not.
     */
    public int readStatus(E2EUser reader, String calendarPath) {
        LocalDate today = E2EClock.today();
        String body = "{\"match\":{\"start\":\"" + today.minusDays(7).format(DAY) + "T000000\","
            + "\"end\":\"" + today.plusDays(7).format(DAY) + "T000000\"}}";
        return execute(reader, "REPORT", calendarPath + ".json", body, "application/json",
            "application/json").statusCode();
    }

    /** The node of the default calendar of a user, a team or a resource: {@code /calendars/<id>/<id>}. */
    public static String defaultCalendarNode(String homeId) {
        return "/calendars/" + homeId + "/" + homeId;
    }

    /** The DTSTART line of an event of the user's default calendar, to tell whether it moved. */
    public Optional<String> dtStart(E2EUser user, String summary) {
        return rawEvents(user).stream()
            .map(Ics::unfold)
            .filter(ics -> summaryOf(ics).filter(summary::equals).isPresent())
            .findFirst()
            .flatMap(ics -> Ics.property(Ics.event(ics), "DTSTART"));
    }

    /** Forces the provisioning of the user's default calendar. */
    public void provisionDefaultCalendar(E2EUser user) {
        String id = requireOpenPaasId(user);
        execute(user, "PROPFIND", "/calendars/" + id, null, null);
    }

    private List<String> eventHrefs(E2EUser user) {
        HttpResponse<String> response = execute(user, "PROPFIND", defaultCalendarPath(user), null, null);
        if (response.statusCode() != 207) {
            throw new IllegalStateException("Failed to list the calendar of " + user.email() + ": "
                + response.statusCode() + " " + response.body());
        }
        List<String> hrefs = new ArrayList<>();
        Matcher matcher = HREF.matcher(response.body());
        while (matcher.find()) {
            hrefs.add(matcher.group(1));
        }
        return hrefs;
    }

    private String defaultCalendarPath(E2EUser user) {
        String id = requireOpenPaasId(user);
        return "/calendars/" + id + "/" + id + "/";
    }

    private String defaultCalendarJsonPath(E2EUser user) {
        String id = requireOpenPaasId(user);
        return "/calendars/" + id + "/" + id + ".json";
    }

    private String get(E2EUser user, String href) {
        return execute(user, "GET", href, null, null).body();
    }

    private Optional<String> summaryOf(String icalendar) {
        // RFC 5545 folds long lines: unfold first, or a long summary comes back truncated
        Matcher matcher = SUMMARY.matcher(Ics.unfold(icalendar));
        return matcher.find() ? Optional.of(matcher.group(1).trim()) : Optional.empty();
    }

    private HttpResponse<String> execute(E2EUser user, String method, String path, String body, String contentType) {
        return execute(user, method, path, body, contentType, "application/xml, text/calendar, */*");
    }

    private HttpResponse<String> execute(E2EUser user, String method, String path, String body,
                                         String contentType, String accept) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(davBaseUrl + path))
            .header("Authorization", impersonationHeader(user))
            .header("Accept", accept)
            .timeout(Duration.ofSeconds(30));
        if ("PROPFIND".equals(method)) {
            builder.header("Depth", "1");
        }
        if (contentType != null) {
            builder.header("Content-Type", contentType);
        }
        builder.method(method, body == null
            ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8));

        try {
            return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw new RuntimeException(method + " " + path + " failed", e);
        }
    }

    private String impersonationHeader(E2EUser user) {
        String credentials = "admin&" + user.email() + ":" + SABRE_ADMIN_PASSWORD;
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }
}
