import { api } from "../../utils/apiUtils";

export default async function getOpenPaasUserId() {
  const user = await api.get(`api/user`).json();
  return user;
}
