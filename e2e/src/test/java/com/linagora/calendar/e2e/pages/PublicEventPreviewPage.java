package com.linagora.calendar.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

/**
 * The public preview of an event, as an invited outsider sees it.
 *
 * <p>Reached with a token in the query string and nothing else: no account, no session. The page
 * shows what the event is and lets the visitor answer the invitation or propose another time.
 */
public class PublicEventPreviewPage {
    private final Page page;

    public PublicEventPreviewPage(Page page) {
        this.page = page;
    }

    public static PublicEventPreviewPage open(Page page, String url) {
        page.navigate(url);
        return new PublicEventPreviewPage(page).waitUntilSettled();
    }

    /** Waits for the page to have made up its mind: either the event, or why it cannot show it. */
    public PublicEventPreviewPage waitUntilSettled() {
        page.waitForFunction("""
            () => {
              const text = document.body.innerText || '';
              return /Attending|Want to change|invalid|expired|could not be found|went wrong/i
                .test(text);
            }""", null, new Page.WaitForFunctionOptions().setTimeout(30_000));
        return this;
    }

    public String text() {
        return page.locator("body").innerText();
    }

    /** Answers the invitation: Yes, No or Maybe. */
    public PublicEventPreviewPage answer(String label) {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName(label).setExact(true))
            .first().click();
        return this;
    }

    public Locator answerButton(String label) {
        // the current answer adds "(current answer)" to its name
        return page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions()
            // no Pattern.quote: Playwright runs the pattern as a JavaScript RegExp, which
            // knows nothing of \Q...\E; the labels are plain words
            .setName(java.util.regex.Pattern.compile("^" + label + "\\s*(\\(.*\\))?$")));
    }

    /** Opens the panel offering another time for the event. */
    public PublicEventPreviewPage proposeNewTime() {
        page.getByRole(AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("New time").setExact(true)).first().click();
        page.getByRole(AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("Send proposal")).first().waitFor();
        return this;
    }

    public PublicEventPreviewPage sendProposal() {
        page.getByRole(AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("Send proposal")).first().click();
        return this;
    }

    public boolean offersToAnswer() {
        return answerButton("Yes").count() > 0;
    }
}
