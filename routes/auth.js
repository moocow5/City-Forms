const express = require("express");
const router = express.Router();
const { getAuthUrl, acquireTokenByCode } = require("../services/graph");

const REDIRECT_URI = process.env.REDIRECT_URI;
const SP_ORIGIN = process.env.SP_ORIGIN || "https://cityofnorthplattene.sharepoint.com";

// GET /auth/signin — redirect user to Microsoft login
router.get("/signin", async (req, res) => {
  try {
    req.session.returnTo = req.query.returnTo || "/forms/travel-expense";
    if (req.query.embedded === "1") {
      req.session.returnTo += "?embedded=1";
      req.session.embedded = true;
    }
    const authUrl = await getAuthUrl(REDIRECT_URI);
    res.redirect(authUrl);
  } catch (err) {
    console.error("Auth URL error:", err);
    res.status(500).send("Could not start sign-in flow.");
  }
});

// GET /auth/callback — handle redirect from Microsoft
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("No auth code received.");
  }
  try {
    const result = await acquireTokenByCode(code, REDIRECT_URI);
    req.session.user = {
      name: result.account.name || result.account.username,
      username: result.account.username,
      homeAccountId: result.account.homeAccountId,
    };
    req.session.accessToken = result.accessToken;

    const rawReturnTo = req.session.returnTo || "/forms/travel-expense";
    delete req.session.returnTo;
    // Only allow relative paths to prevent open-redirect
    const safeReturnTo = /^\/[^/\\]/.test(rawReturnTo) ? rawReturnTo : "/forms/travel-expense";

    // If we're in a popup (embedded mode), send a page that closes itself
    // and tells the parent frame to reload
    if (req.session.embedded) {
      return res.send(`
        <!DOCTYPE html>
        <html><head><title>Signed In</title></head>
        <body>
          <p>Signed in! This window will close...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: "auth-complete" }, ${JSON.stringify(SP_ORIGIN)});
              window.close();
            } else {
              window.location.href = ${JSON.stringify(safeReturnTo)};
            }
          </script>
        </body>
        </html>
      `);
    }

    res.redirect(safeReturnTo);
  } catch (err) {
    console.error("Token exchange error:", err);
    res.status(500).send("Sign-in failed. Please try again.");
  }
});

// GET /auth/signout
router.get("/signout", (req, res) => {
  const embedded = req.session.embedded;
  req.session.destroy(() => {
    res.redirect("/forms/travel-expense" + (embedded ? "?embedded=1" : ""));
  });
});

module.exports = router;
