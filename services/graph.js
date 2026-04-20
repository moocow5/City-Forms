const msal = require("@azure/msal-node");

const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
};

const cca = new msal.ConfidentialClientApplication(msalConfig);
const SCOPES = ["User.Read", "Sites.Read.All"];

async function getAuthUrl(redirectUri) {
  return cca.getAuthCodeUrl({ scopes: SCOPES, redirectUri });
}

async function acquireTokenByCode(code, redirectUri) {
  return cca.acquireTokenByCode({ code, scopes: SCOPES, redirectUri });
}

async function acquireTokenSilent(account) {
  return cca.acquireTokenSilent({ account, scopes: SCOPES });
}

async function graphGet(accessToken, path) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph ${res.status}: ${body.substring(0, 300)}`);
  }
  return res.json();
}

module.exports = { getAuthUrl, acquireTokenByCode, acquireTokenSilent, graphGet };
