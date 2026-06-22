# @rajoni/notification-service-sdk

Realtime in-app + browser push notification SDK. Works with **Laravel Reverb** (WebSocket) and **Firebase / OneSignal** (push). Compatible with any frontend framework.

> **Zero config on the client.** No `public/` folder files, no Reverb keys, no Firebase credentials — everything is fetched automatically from the server.

---

## Install

### npm (React / Vue / Angular / Next.js)

```bash
npm install @rajoni/notification-service-sdk@latest
```

### CDN (Blade / Django / plain HTML)

```html
<script src="https://unpkg.com/@rajoni/notification-service-sdk@latest/dist/sdk.min.js"></script>
```

---

## Quick Start

```js
NotificationService.init({
  apiKey:     "your_workspace_api_key",
  userId:     1,
  enablePush: true,   // ← set true to enable browser push notifications
  onNotify: (data) => {
    console.log(data.short_message);
  },
});
```

---

## How It Works

When `NotificationService.init()` is called, the SDK does the following automatically:

```
init()
   │
   ├─ 1. Fetch config from server (/api/sdk/auth)
   │       └─ Reverb host/port/key, socket token, push credentials
   │
   ├─ 2. Connect to Laravel Reverb via WebSocket (laravel-echo + pusher-js)
   │       └─ Subscribe to private channel → fires onNotify callback
   │
   └─ 3. If enablePush: true, initialize push notifications
           ├─ Firebase: registers Service Worker via Blob URL (no public/ file needed)
           └─ OneSignal: Service Worker is served from the notification server
```

### Reverb (In-App, Real-time)

`laravel-echo` and `pusher-js` are bundled inside the SDK — no separate install needed. Reverb `host`, `port`, `key`, `scheme`, and auth endpoint are all fetched from the server automatically. No `.env` setup required on the client.

### Push Notifications (Firebase / OneSignal)

Used to deliver notifications even when the page is closed. **No credentials needed on the client** — everything comes from the server.

- **Firebase:** A Service Worker is created at runtime using a Blob URL with the Firebase config injected directly. No `public/firebase-messaging-sw.js` needed.
- **OneSignal:** The Service Worker is served directly from the notification server. No `public/OneSignalSDKWorker.js` needed.

> If no push credentials are configured on the server, setting `enablePush: true` will still work — only in-app (Reverb) notifications will run. No errors thrown.

---

## Framework Examples

### React

```jsx
import NotificationService from "@rajoni/notification-service-sdk";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    NotificationService.init({
      apiKey:     "cust_abc123",
      userId:     6,
      enablePush: true,
      onNotify: (data) => {
        alert(data.short_message);
      },
    });

    return () => NotificationService.disconnect();
  }, []);

  return <div>Your App</div>;
}
```

### Next.js (App Router)

```jsx
"use client";
import NotificationService from "@rajoni/notification-service-sdk";
import { useEffect } from "react";

export default function NotificationProvider({ userId }) {
  useEffect(() => {
    NotificationService.init({
      apiKey:     process.env.NEXT_PUBLIC_API_KEY,
      userId,
      enablePush: true,
      onNotify: (data) => console.log("New notification:", data.short_message),
    });

    return () => NotificationService.disconnect();
  }, [userId]);

  return null;
}
```

### Vue 3

```vue
<script setup>
import NotificationService from "@rajoni/notification-service-sdk";
import { onMounted, onUnmounted } from "vue";

onMounted(() => {
  NotificationService.init({
    apiKey:     "cust_abc123",
    userId:     6,
    enablePush: true,
    onNotify:   (data) => alert(data.short_message),
  });
});

onUnmounted(() => NotificationService.disconnect());
</script>
```

### Angular

```ts
import { Component, OnInit, OnDestroy } from "@angular/core";
import NotificationService from "@rajoni/notification-service-sdk";

@Component({ selector: "app-root", template: "<router-outlet />" })
export class AppComponent implements OnInit, OnDestroy {
  ngOnInit() {
    NotificationService.init({
      apiKey:     "cust_abc123",
      userId:     6,
      enablePush: true,
      onNotify:   (data) => console.log(data.short_message),
    });
  }

  ngOnDestroy() {
    NotificationService.disconnect();
  }
}
```

### Laravel Blade

```html
@auth
<script src="https://unpkg.com/@rajoni/notification-service-sdk@latest/dist/sdk.min.js"></script>
<script>
  const SDK = window.NotificationService?.default ?? window.NotificationService;

  SDK.init({
    apiKey:     '{{ $workspace->api_key }}',
    userId:     {{ auth()->id() }},
    enablePush: true,
    onNotify:   function(data) { console.log(data.short_message); }
  });
</script>
@endauth
```

### Django Template

```html
{% if user.is_authenticated %}
<script src="https://unpkg.com/@rajoni/notification-service-sdk@latest/dist/sdk.min.js"></script>
<script>
  const SDK = window.NotificationService?.default ?? window.NotificationService;

  SDK.init({
    apiKey:     '{{ api_key }}',
    userId:     {{ user.id }},
    enablePush: true,
    onNotify:   function(data) { console.log(data.short_message); }
  });
</script>
{% endif %}
```

### Plain HTML (CDN)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/@rajoni/notification-service-sdk@latest/dist/sdk.min.js"></script>
</head>
<body>
  <script>
    const SDK = window.NotificationService?.default ?? window.NotificationService;

    SDK.init({
      apiKey:     "cust_abc123",
      userId:     1,
      enablePush: true,
      onNotify: function(data) {
        alert(data.short_message);
      }
    });
  </script>
</body>
</html>
```

---

## API Reference

### `NotificationService.init(options)`

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | `string` | ✅ | — | Workspace API key |
| `userId` | `number\|string` | ✅ | — | Logged-in user ID |
| `onNotify` | `function` | ✅ | — | Callback fired on in-app notification (Reverb) |
| `enablePush` | `boolean` | ❌ | `false` | Enable browser push notifications (Firebase / OneSignal) |

### `NotificationService.disconnect()`

Closes the WebSocket connection. Call on component unmount or page unload.

---

## `onNotify` Callback Payload

```js
onNotify: (data) => {
  data.id;            // Notification ID
  data.type;          // Notification type (e.g. "order_placed")
  data.short_message; // Notification body text
  data.raw;           // Full raw payload from the server
}
```

---

## Supported Channels

| Channel | Provider | Works when page is closed? | How it works |
|---------|----------|----------------------------|--------------|
| In-App | Laravel Reverb | No | WebSocket — real-time while page is open |
| Push | Firebase FCM | Yes | Blob SW — no `public/` file needed |
| Push | OneSignal | Yes | Server-side SW — no `public/` file needed |

---

## Server Endpoints

The SDK calls these endpoints internally — no manual configuration needed on the client.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sdk/auth` | GET | Fetch Reverb config + push credentials |
| `/api/sdk/broadcasting/auth` | POST | Authenticate private channel |
| `/api/sdk/device-token` | POST | Register device push token |
| `/api/sdk/sw/onesignal` | GET | Serve OneSignal service worker |

---

## Build from Source

```bash
git clone <repo>
cd sdk-v2
npm install
npm run build
```

Output files:

| File | Use case |
|------|----------|
| `dist/sdk.min.js` | CDN, Blade, Django, plain HTML |
| `dist/sdk.esm.js` | npm, React, Vue, Angular |

---

## Browser Support

Chrome, Firefox, Edge, Safari (iOS 16.4+) — any modern browser with Service Worker support.

> **Note:** On `localhost`, Chrome may show push notifications with a generic title. This is a browser limitation for non-HTTPS origins. Everything works correctly in production on `https://`.

---

## License

MIT