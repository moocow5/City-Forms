const msal = require("@azure/msal-node");

const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
};

const cca = new msal.ConfidentialClientApplication(msalConfig);
const SCOPES = ["User.Read", "Sites.ReadWrite.All"];

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

async function graphPost(accessToken, path, body) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph POST ${res.status}: ${text.substring(0, 300)}`);
  }
  return res.json();
}

async function graphPatch(accessToken, path, body) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph PATCH ${res.status}: ${text.substring(0, 300)}`);
  }
  // PATCH to SP list fields returns 204 No Content
  return res.status === 204 ? {} : res.json();
}

module.exports = { getAuthUrl, acquireTokenByCode, acquireTokenSilent, graphGet, graphPost, graphPatch };
