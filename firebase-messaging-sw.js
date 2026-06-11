const params = new URLSearchParams(self.location.search);
const saasUrl = params.get('saas_url');
const apiKey = params.get('api_key');

importScripts(`${saasUrl}/sdk/sw/firebase?api_key=${apiKey}`);