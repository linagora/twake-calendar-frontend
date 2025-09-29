import ky from "ky";
import { Auth } from "../features/User/oidcAuth";

export const api = ky.extend({
  prefixUrl: (window as any).CALENDAR_BASE_URL,
  hooks: {
    beforeRequest: [
      async (request) => {
        const saved = sessionStorage.getItem("tokenSet")
          ? JSON.parse(sessionStorage.getItem("tokenSet")!)
          : null;
        const access_token = saved?.access_token;

        const modifiedRequest = new Request(request);
        modifiedRequest.headers.set("Authorization", `Bearer ${access_token}`);
        return modifiedRequest;
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
    `api/files?mimetype${file.type}&name=${file.name}&size=${file.size}`
  );
  return await response.json();
}
