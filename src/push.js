const SAAS_URL = "https://naas.api.pippasync.com/api";

export async function initPush(apiKey, userId, pushConfig) {
  if (!pushConfig || !pushConfig.provider) {
    console.warn("[Push] No push config from server. Push disabled.");
    return;
  }

  const { provider } = pushConfig;

  if (provider === "firebase") {
    await initFirebasePush(apiKey, userId, pushConfig);
  } else if (provider === "onesignal") {
    await initOneSignalPush(apiKey, userId, pushConfig);
  } else {
    console.warn(`[Push] Unknown provider: ${provider}`);
  }
}

// ─────────────────────────────────────────────
// FIREBASE
// ─────────────────────────────────────────────

async function initFirebasePush(apiKey, userId, pushConfig) {
  const { firebase_config, vapid_key, sdk_version } = pushConfig;

  if (!firebase_config || !vapid_key) {
    console.warn("[Push] Firebase config or vapid_key missing.");
    return;
  }

  const version = sdk_version || "10.12.5";

  try {
    const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] =
      await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-messaging.js`),
      ]);

    const supported = await isSupported();
    if (!supported) {
      console.warn("[Push] Firebase Messaging not supported in this browser.");
      return;
    }

    const apps = getApps();
    const app =
      apps.find((a) => a.name === "__notification_service__") ??
      initializeApp(firebase_config, "__notification_service__");

    const messaging = getMessaging(app);

    const registration = await registerFirebaseSW(apiKey, version);

    const token = await getToken(messaging, {
      vapidKey: vapid_key,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await saveDeviceToken(apiKey, userId, token, "firebase");
      console.log("[Push] Firebase token registered.");
    }
  } catch (err) {
    console.error("[Push] Firebase init failed:", err?.message ?? err);
  }
}

async function registerFirebaseSW(apiKey, version) {
  const swUrl = `/firebase-messaging-sw.js?api_key=${apiKey}&saas_url=${encodeURIComponent(SAAS_URL)}`;

  const existing = await navigator.serviceWorker
    .getRegistration("/")
    .catch(() => null);

  if (existing) {
    await existing.update();
    return existing;
  }

  const registration = await navigator.serviceWorker.register(swUrl, {
    scope: "/",
  });

  console.log("[Push] Firebase SW registered.");
  return registration;
}

// ─────────────────────────────────────────────
// ONESIGNAL
// ─────────────────────────────────────────────

async function initOneSignalPush(apiKey, userId, pushConfig) {
  const { onesignal_app_id, sdk_version } = pushConfig;

  if (!onesignal_app_id) {
    console.warn("[Push] OneSignal app_id missing.");
    return;
  }

  // already initialized হলে skip করো
  if (window.__onesignal_initialized) {
    console.log("[Push] OneSignal already initialized, skipping init.");

    // তবে login + token refresh করো
    try {
      const OneSignal = window.OneSignal;
      if (OneSignal) {
        await OneSignal.login(String(userId));
        const subscriptionId = OneSignal.User.PushSubscription.id;
        if (subscriptionId) {
          await saveDeviceToken(apiKey, userId, subscriptionId, "onesignal");
        }
      }
    } catch (err) {
      console.warn("[Push] OneSignal re-login failed:", err?.message ?? err);
    }
    return;
  }

  const version = sdk_version || "16";

  try {
    await loadScript(
      `https://cdn.onesignal.com/sdks/web/v${version}/OneSignalSDK.page.js`
    );

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    await new Promise((resolve, reject) => {
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.init({
            appId: onesignal_app_id,
            serviceWorkerPath: `/OneSignalSDKWorker.js?onesignal_version=${version}`,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
          });

          // initialized mark করো
          window.__onesignal_initialized = true;

          const granted = await OneSignal.Notifications.requestPermission();
          if (!granted) {
            console.warn("[Push] OneSignal notification permission denied.");
            resolve();
            return;
          }

          await OneSignal.login(String(userId));

          // subscription ID পেতে একটু wait করতে হতে পারে
          let subscriptionId = OneSignal.User.PushSubscription.id;
          if (!subscriptionId) {
            await new Promise((res) => setTimeout(res, 1500));
            subscriptionId = OneSignal.User.PushSubscription.id;
          }

          if (subscriptionId) {
            await saveDeviceToken(apiKey, userId, subscriptionId, "onesignal");
            console.log("[Push] OneSignal token registered:", subscriptionId);
          } else {
            console.warn("[Push] OneSignal subscription ID not available.");
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  } catch (err) {
    console.error("[Push] OneSignal init failed:", err?.message ?? err);
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function saveDeviceToken(apiKey, userId, token, provider) {
  try {
    await fetch(`${SAAS_URL}/sdk/device-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({ user_id: userId, token, provider }),
    });
  } catch (err) {
    console.error("[Push] Failed to save device token:", err?.message ?? err);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      return resolve();
    }
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}