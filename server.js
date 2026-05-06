require("dotenv").config();
const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const https = require("https");

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET env var must be set before starting the server.");
}

const authRoutes = require("./routes/auth");
const formRoutes = require("./routes/forms");
const apiRoutes = require("./routes/api");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;
const SP_ORIGIN = process.env.SP_ORIGIN || "https://cityofnorthplattene.sharepoint.com";

// ── View engine ──
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Block access to sensitive paths before static serving
app.use((req, res, next) => {
  const blocked = /^\/(\.env|\.git|config\.json|config\.js|config\.ya?ml|package-lock\.json|node_modules)/i;
  if (blocked.test(req.path)) return res.status(404).send("Not found");
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 60 * 60 * 1000,
    },
  })
);

// ── Security headers + SharePoint iframe/CORS ──
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://graph.microsoft.com; frame-ancestors 'self' ${SP_ORIGIN}`
  );
  res.removeHeader("X-Frame-Options");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  const origin = req.headers.origin;
  if (origin && origin === SP_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── Rate limiting on auth endpoints ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Make user info available to all views ──
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.embedded = req.query.embedded === "1" || req.session.embedded || false;
  if (req.query.embedded === "1") req.session.embedded = true;
  next();
});

// ── Routes ──
app.use("/auth", authLimiter, authRoutes);
app.use("/forms", formRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.redirect("/forms/travel-expense");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const keyPath  = path.join(__dirname, "certs", "server.key");
const certPath = path.join(__dirname, "certs", "server.cert");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const sslOptions = {
    key:  fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`\n  City Forms running → https://localhost:${PORT}`);
    console.log(`  SharePoint embed URL → https://localhost:${PORT}/forms/travel-expense?embedded=1\n`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`\n  City Forms running (HTTP) → http://localhost:${PORT}`);
    console.log(`  Run 'node generate-cert.js' to enable HTTPS.\n`);
  });
}
