import { ModuleConfiguration, userData } from "../userDataTypes";

export interface OpenPaasUserData {
  firstname?: string;
  lastname?: string;
  id?: string;
  preferredEmail?: string;
  configurations?: {
    modules?: ModuleConfiguration[];
  };
  emails: string[];
}

export function ToUserData(
  openpaas: OpenPaasUserData | undefined
): userData | undefined {
  if (!openpaas) return undefined;
  const email = openpaas.preferredEmail ?? openpaas.emails?.[0] ?? "";

  const given_name = openpaas.firstname ?? "";
  const family_name = openpaas.lastname ?? "";

  return {
    email,
    given_name,
    family_name,
    name: [given_name, family_name].filter(Boolean).join(" "),
    sid: openpaas.id ?? "",
    sub: openpaas.id ?? "",
    openpaasId: openpaas.id,
  };
}
