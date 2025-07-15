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
            "tokenSet",
            JSON.stringify({
              code_verifier: loginurl.code_verifier,
              state: loginurl.state,
            })
          );
          window.location.assign(loginurl.redirectTo);
        }
      },
    ],
  },
});
