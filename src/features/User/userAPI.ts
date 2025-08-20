import { api } from "../../utils/apiUtils";

export default async function getOpenPaasUser() {
  const user = await api.get(`api/user`).json();
  return user;
}
