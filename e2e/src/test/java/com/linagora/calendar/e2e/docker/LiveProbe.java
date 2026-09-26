package com.linagora.calendar.e2e.docker;

import com.microsoft.playwright.BrowserContext;

/**
 * Lets a test know when the live update socket is really listening.
 *
 * <p>An open socket is not enough: the application registers to the calendars of the user
 * afterwards, once their list is loaded, and a change made in between is delivered to nobody.
 * The registration is a plain message with no answer, so the page records when it goes out.
 */
public final class LiveProbe {
    private LiveProbe() {
    }

    public static void install(BrowserContext context) {
        context.addInitScript("""
            (() => {
              const send = WebSocket.prototype.send;
              WebSocket.prototype.send = function (data) {
                if (typeof data === 'string' && data.includes('"register"')) {
                  window.__wsRegistered = true;
                }
                return send.call(this, data);
              };
            })();""");
    }
}
