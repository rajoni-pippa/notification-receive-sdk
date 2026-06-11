
const params = new URLSearchParams(self.location.search);
const version = params.get('onesignal_version') || '16';

importScripts(`https://cdn.onesignal.com/sdks/web/v${version}/OneSignalSDK.sw.js`);