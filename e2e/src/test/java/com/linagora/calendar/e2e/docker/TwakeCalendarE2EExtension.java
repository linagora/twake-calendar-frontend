package com.linagora.calendar.e2e.docker;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.AfterTestExecutionCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.ParameterContext;
import org.junit.jupiter.api.extension.ParameterResolver;

import com.linagora.calendar.e2e.backend.CalendarProbe;
import com.linagora.calendar.e2e.backend.E2EUser;
import com.linagora.calendar.e2e.backend.E2EUserFactory;
import com.linagora.calendar.e2e.backend.MailProbe;
import com.linagora.calendar.e2e.backend.ResourceProbe;
import com.linagora.calendar.e2e.backend.TeamCalendarProbe;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.Tracing;

/**
 * Wires a Playwright {@link Page} onto the docker stack, one fresh browser context per test.
 *
 * <p>Injectable parameters: {@link Page}, {@link BrowserContext}, {@link TwakeCalendarStack},
 * {@link CalendarProbe}, {@link E2EUser}, {@link E2EUserFactory}, {@link E2ESessions} and
 * {@link BrowserLog}.
 *
 * <p><b>Parallelism.</b> Test classes run four at a time against the single docker stack, see
 * {@code junit-platform.properties}. Playwright is not thread safe and its objects belong to the
 * thread that created them, so every worker thread gets its own engine and its own browser —
 * nothing about Playwright is shared. What is shared is what can be: the docker stack, the
 * directory the accounts are created in, and the CalDAV probe, all of which are thread safe.
 * The state of a running test lives in a {@link ThreadLocal}, so it cannot leak from one class
 * to another whatever JUnit does with extension instances.
 *
 * <p>Knobs, all through environment variables:
 * <ul>
 *   <li>{@code E2E_HEADLESS=false} to watch the browser drive the app</li>
 *   <li>{@code E2E_SLOWMO=<ms>} to slow every action down</li>
 *   <li>{@code E2E_TRACE=always} to always record a trace, not only on failure</li>
 * </ul>
 * Failures always leave a screenshot and a Playwright trace under {@code target/e2e-artifacts/}.
 * Open a trace with {@code npx playwright show-trace target/e2e-artifacts/<test>/trace.zip}.
 */
public class TwakeCalendarE2EExtension implements BeforeEachCallback, AfterTestExecutionCallback,
    AfterEachCallback, ParameterResolver {

    private static final Path ARTIFACTS = Paths.get("target", "e2e-artifacts");
    /**
     * Generous on purpose: four classes share one backend, so a response that takes an instant
     * on an idle stack can take several seconds under load. Too tight a value here does not
     * catch bugs, it manufactures flakes.
     */
    private static final double DEFAULT_TIMEOUT_MS = 30_000;

    static {
        // conditions are evaluated on the thread of the test: the clock of E2EClock belongs to
        // it, and Playwright objects are not meant to be driven from another thread anyway
        Awaitility.pollInSameThread();
    }

    /** One engine per worker thread; closing an engine closes the browsers it launched. */
    private static final ThreadLocal<Browser> BROWSER = new ThreadLocal<>();
    private static final List<Playwright> ENGINES = Collections.synchronizedList(new ArrayList<>());
    private static final AtomicBoolean CLOSING_REGISTERED = new AtomicBoolean();

    private static volatile CalendarProbe probe;
    private static volatile E2EUserFactory userFactory;

    /** Everything a running test owns, kept off any shared field. */
    private static final ThreadLocal<TestState> STATE = new ThreadLocal<>();

    private static final class TestState {
        private BrowserContext context;
        private Page page;
        private E2EUser user;
        private E2ESessions sessions;
        private BrowserLog browserLog;
        private RuntimeConfig runtimeConfig;
    }

    private static Browser browser() {
        Browser existing = BROWSER.get();
        if (existing != null) {
            return existing;
        }
        Playwright playwright = Playwright.create();
        ENGINES.add(playwright);
        Browser browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
            .setHeadless(!"false".equals(System.getenv("E2E_HEADLESS")))
            .setSlowMo(slowMo())
            .setArgs(chromiumArgs(TwakeCalendarStack.singleton())));
        BROWSER.set(browser);
        registerClosing();
        return browser;
    }

    private static void registerClosing() {
        if (CLOSING_REGISTERED.compareAndSet(false, true)) {
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                synchronized (ENGINES) {
                    ENGINES.forEach(Playwright::close);
                }
            }));
        }
    }

    /** Every session of the suite is opened the same way, primary or secondary. */
    static Browser.NewContextOptions contextOptions() {
        return new Browser.NewContextOptions()
            .setBaseURL(TwakeCalendarStack.FRONTEND_URL)
            // Dex serves a self signed certificate, see docker/Dockerfile.dex
            .setIgnoreHTTPSErrors(true)
            .setViewportSize(1500, 950)
            .setLocale("en-US")
            .setTimezoneId("Europe/Paris");
    }

    private static double slowMo() {
        String slowMo = System.getenv("E2E_SLOWMO");
        return slowMo == null ? 0 : Double.parseDouble(slowMo);
    }

    private static List<String> chromiumArgs(TwakeCalendarStack stack) {
        List<String> args = new ArrayList<>();
        // Resolve the docker hostnames the SPA is configured with
        args.add("--host-resolver-rules=" + stack.hostResolverRules());
        args.add("--disable-dev-shm-usage");
        args.add("--no-sandbox");
        return args;
    }

    @Override
    public void beforeEach(ExtensionContext extensionContext) {
        Browser browser = browser();
        TestState state = new TestState();
        LocalDateTime start = extensionContext.getTestMethod()
            .map(method -> method.getAnnotation(ClockAt.class))
            .or(() -> extensionContext.getTestClass().map(type -> type.getAnnotation(ClockAt.class)))
            .map(E2EClock::startOf)
            .orElseGet(E2EClock::defaultStart);
        E2EClock.startAt(start);
        System.out.println("[e2e] " + testId(extensionContext) + " starts at " + start
            + " " + E2EClock.BROWSER_ZONE + ", reproduce the whole run with E2E_NOW="
            + E2EClock.defaultStart());
        state.context = browser.newContext(contextOptions());
        E2EClock.install(state.context);
        LiveProbe.install(state.context);
        state.context.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
        // several features hand something to the clipboard and confirm it on screen; without the
        // permission the write silently rejects and the confirmation never comes
        state.context.grantPermissions(List.of("clipboard-read", "clipboard-write"));
        state.sessions = new E2ESessions(browser);
        state.browserLog = new BrowserLog();
        state.runtimeConfig = new RuntimeConfig(state.context);
        state.context.tracing().start(new Tracing.StartOptions()
            .setScreenshots(true)
            .setSnapshots(true)
            .setSources(true));

        state.page = state.context.newPage();
        // Browser side errors are the usual suspects behind a flaky looking e2e failure:
        // surface them in the maven output rather than making people re-run with a debugger.
        state.page.onConsoleMessage(message -> {
            if ("error".equals(message.type())) {
                state.browserLog.recordConsoleError(message.text());
                System.out.println("[browser console error] " + message.text());
            }
        });
        state.page.onResponse(response -> {
            if (response.status() >= 400) {
                state.browserLog.recordFailedRequest(response.status(),
                    response.request().method(), response.url());
            }
        });
        state.page.onPageError(error -> {
            state.browserLog.recordPageError(error);
            System.out.println("[browser page error] " + error);
        });
        STATE.set(state);
    }

    @Override
    public void afterTestExecution(ExtensionContext extensionContext) {
        TestState state = STATE.get();
        boolean failed = extensionContext.getExecutionException().isPresent();
        Path directory = ARTIFACTS.resolve(testId(extensionContext));

        if (failed) {
            state.page.screenshot(new Page.ScreenshotOptions()
                .setPath(directory.resolve("failure.png"))
                .setFullPage(true));
            System.out.println("[e2e] failure artifacts in " + directory.toAbsolutePath());
        }

        if (failed || "always".equals(System.getenv("E2E_TRACE"))) {
            state.context.tracing().stop(new Tracing.StopOptions().setPath(directory.resolve("trace.zip")));
        } else {
            state.context.tracing().stop();
        }
    }

    @Override
    public void afterEach(ExtensionContext extensionContext) {
        E2EClock.reset();
        TestState state = STATE.get();
        if (state != null) {
            state.sessions.closeAll();
            state.context.close();
            STATE.remove();
        }
    }

    /**
     * The account of the running test, created on first use: one dedicated user per test,
     * because the stack is shared and the user is what isolates one test from the next.
     */
    private E2EUser user() {
        TestState state = STATE.get();
        if (state.user == null) {
            state.user = userFactory().newUser();
        }
        return state.user;
    }

    private static synchronized E2EUserFactory userFactory() {
        if (userFactory == null) {
            userFactory = new E2EUserFactory(TwakeCalendarStack.singleton());
        }
        return userFactory;
    }

    private static synchronized CalendarProbe probe() {
        if (probe == null) {
            probe = new CalendarProbe(TwakeCalendarStack.singleton());
        }
        return probe;
    }

    private String testId(ExtensionContext extensionContext) {
        return extensionContext.getRequiredTestClass().getSimpleName()
            + "/" + extensionContext.getRequiredTestMethod().getName();
    }

    @Override
    public boolean supportsParameter(ParameterContext parameterContext, ExtensionContext extensionContext) {
        Class<?> type = parameterContext.getParameter().getType();
        return type == Page.class
            || type == BrowserContext.class
            || type == TwakeCalendarStack.class
            || type == CalendarProbe.class
            || type == TeamCalendarProbe.class
            || type == MailProbe.class
            || type == ResourceProbe.class
            || type == E2EUser.class
            || type == E2EUserFactory.class
            || type == E2ESessions.class
            || type == BrowserLog.class
            || type == RuntimeConfig.class;
    }

    @Override
    public Object resolveParameter(ParameterContext parameterContext, ExtensionContext extensionContext) {
        Class<?> type = parameterContext.getParameter().getType();
        TestState state = STATE.get();
        if (type == Page.class) {
            return state.page;
        }
        if (type == BrowserContext.class) {
            return state.context;
        }
        if (type == TwakeCalendarStack.class) {
            return TwakeCalendarStack.singleton();
        }
        if (type == E2EUser.class) {
            return user();
        }
        if (type == E2EUserFactory.class) {
            return userFactory();
        }
        if (type == E2ESessions.class) {
            return state.sessions;
        }
        if (type == BrowserLog.class) {
            return state.browserLog;
        }
        if (type == RuntimeConfig.class) {
            return state.runtimeConfig;
        }
        if (type == ResourceProbe.class) {
            return new ResourceProbe(TwakeCalendarStack.singleton());
        }
        if (type == MailProbe.class) {
            return new MailProbe(TwakeCalendarStack.singleton());
        }
        if (type == TeamCalendarProbe.class) {
            return new TeamCalendarProbe(TwakeCalendarStack.singleton());
        }
        return probe();
    }
}
