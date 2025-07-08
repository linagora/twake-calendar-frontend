export default async function getOpenPaasUserId(opaque_token: string) {
  const response = await fetch(
    `${(window as any).CALENDAR_BASE_URL}/api/user`,
    {
      headers: {
        Authorization: `Bearer ${opaque_token}`,
      },
    }
  );
  const user = await response.json();
  return user;
}
