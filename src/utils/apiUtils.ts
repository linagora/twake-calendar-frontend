import ky from "ky";
import { Auth } from "../features/User/oidcAuth";

const RETRY_CONFIG = {
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 120000,
};

function getRetryDelay(attemptNumber: number): number {
  const cap = RETRY_CONFIG.maxDelay;
  const base = RETRY_CONFIG.initialDelay * Math.pow(2, attemptNumber);
  return Math.random() * Math.min(cap, base);
}

export const api = ky.extend({
  prefixUrl: (window as any).CALENDAR_BASE_URL,
  retry: {
    limit: RETRY_CONFIG.maxRetries,
    backoffLimit: RETRY_CONFIG.maxDelay,
    delay: (attemptCount) => getRetryDelay(attemptCount - 1),
  },
  hooks: {
    beforeRequest: [
      async (request) => {
        const saved = sessionStorage.getItem("tokenSet")
          ? JSON.parse(sessionStorage.getItem("tokenSet")!)
          : null;
        const access_token = saved?.access_token;
        if (access_token) {
          request.headers.set("Authorization", `Bearer ${access_token}`);
        }
        return request;
      },
    ],

    beforeRetry: [
      async ({ request, options, error, retryCount }) => {
        const delay = getRetryDelay(retryCount - 1);
        console.warn(
          `[API Retry] Attempt ${retryCount}/${RETRY_CONFIG.maxRetries} after ${delay}ms`,
          {
            url: request.url,
            error: error?.message,
          }
        );
      },
    ],

    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          // Attempt token refresh on unauthorized response
          const loginurl = await Auth();

          sessionStorage.setItem(
            "redirectState",
            JSON.stringify({
              code_verifier: loginurl.code_verifier,
              state: loginurl.state,
            })
          );
          redirectTo(loginurl.redirectTo);
        }
      },
    ],
  },
});

export function redirectTo(url: URL) {
  window.location.assign(url);
}

export function getLocation() {
  return window.location.href;
}

export function isValidUrl(string?: string) {
  let url;

  try {
    url = new URL(string ?? "");
  } catch (_) {
    return false;
  }
  return url;
}

export async function importFile(file: File) {
  const response = await api.post(
    `api/files?mimetype=${file.type}&name=${file.name}&size=${file.size}`,
    { body: await file.text() }
  );
  return await response.json();
}
