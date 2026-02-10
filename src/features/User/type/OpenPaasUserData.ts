import { ModuleConfiguration } from "../userDataTypes";

export interface OpenPaasUserData {
  firstname?: string;
  lastname?: string;
  id?: string;
  preferredEmail?: string;
  configurations?: {
    modules?: ModuleConfiguration[];
  };
}
