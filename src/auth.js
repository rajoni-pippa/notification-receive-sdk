// const SAAS_URL = import.meta.env.VITE_SAAS_BASE_URL;
const SAAS_URL = "https://pippasync-notification-service.test/api";

export async function fetchConfig(apiKey, userId) {
  const res = await fetch(
    `${SAAS_URL}/sdk/auth?api_key=${apiKey}&user_id=${userId}`,
  );

  if (res.status === 401) {
    throw new Error(
      "[NotificationService] Invalid API key. Check your apiKey.",
    );
  }

  if (res.status === 404) {
    throw new Error("[NotificationService] User not found. Check your userId.");
  }

  if (!res.ok) {
    throw new Error(
      `[NotificationService] Auth failed with status ${res.status}`,
    );
  }

  const json = await res.json();
  const config = json.data;

  return {
    channel: config.channel,
    socketToken: config.socket_token,
    authEndpoint: config.auth_endpoint,
    reverb: config.reverb,
    apiKey: apiKey,
    // push config — server এ push credential থাকলে এটা আসবে, না থাকলে null
    push: config.push ?? null,
  };
}
