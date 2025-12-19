import ky from "ky";
import { Auth } from "../features/User/oidcAuth";

const authHooks = {
  beforeRequest: [
    async (request: Request) => {
      const saved = sessionStorage.getItem("tokenSet")
        ? JSON.parse(sessionStorage.getItem("tokenSet")!)
        : null;

      const access_token = saved?.access_token;

      if (access_token) {
        request.headers.set("Authorization", `Bearer ${access_token}`);
      }
    },
  ],
  afterResponse: [
    async (_request: Request, _options: any, response: Response) => {
      if (response.status === 401) {
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
};

export const noPrefixApi = ky.extend({
  hooks: authHooks,
});

export const api = ky.extend({
  prefixUrl: (window as any).CALENDAR_BASE_URL,
  hooks: authHooks,
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
