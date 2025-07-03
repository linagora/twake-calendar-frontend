export default async function getOpenPaasUserId(opaque_token: string) {
  const response = await fetch(
    `${process.env.REACT_APP_CALENDAR_BASE_URL}/api/user`,
    {
      headers: {
        Authorization: `Bearer ${opaque_token}`,
      },
    }
  );
  const user = await response.json();
  return user;
}
