/**
 * generate-cert.js
 * 
 * Generates a self-signed SSL certificate using pure Node.js crypto.
 * No OpenSSL required.
 * 
 * Run once: node generate-cert.js
 * Outputs: certs/server.key and certs/server.cert
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const certsDir = path.join(__dirname, "certs");
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir);

const keyPath = path.join(certsDir, "server.key");
const certPath = path.join(certsDir, "server.cert");

console.log("Generating self-signed SSL certificate (pure Node.js)...\n");

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Build a self-signed X.509 certificate using Node 15+ createCertificate if available,
// otherwise fall back to manual ASN.1 construction

if (typeof crypto.X509Certificate !== "undefined" && typeof crypto.createPrivateKey === "function") {
  // Node 19+ has generateCertificateSync... but it's not widely available yet.
  // We'll use the forge-free ASN.1 approach below for maximum compatibility.
}

// ── ASN.1 DER encoding helpers ──
function asn1Len(length) {
  if (length < 128) return Buffer.from([length]);
  if (length < 256) return Buffer.from([0x81, length]);
  return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
}

function asn1Seq(...items) {
  const body = Buffer.concat(items);
  return Buffer.concat([Buffer.from([0x30]), asn1Len(body.length), body]);
}

function asn1Set(...items) {
  const body = Buffer.concat(items);
  return Buffer.concat([Buffer.from([0x31]), asn1Len(body.length), body]);
}

function asn1Int(val) {
  if (Buffer.isBuffer(val)) {
    // Ensure positive (add leading 0 if high bit set)
    const buf = val[0] & 0x80 ? Buffer.concat([Buffer.from([0]), val]) : val;
    return Buffer.concat([Buffer.from([0x02]), asn1Len(buf.length), buf]);
  }
  if (val < 128) return Buffer.from([0x02, 0x01, val]);
  const hex = val.toString(16);
  const padded = hex.length % 2 ? "0" + hex : hex;
  const bytes = Buffer.from(padded, "hex");
  const buf = bytes[0] & 0x80 ? Buffer.concat([Buffer.from([0]), bytes]) : bytes;
  return Buffer.concat([Buffer.from([0x02]), asn1Len(buf.length), buf]);
}

function asn1OID(oid) {
  const parts = oid.split(".").map(Number);
  const bytes = [40 * parts[0] + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let v = parts[i];
    if (v < 128) {
      bytes.push(v);
    } else {
      const enc = [];
      enc.push(v & 0x7f);
      v >>= 7;
      while (v > 0) {
        enc.push(0x80 | (v & 0x7f));
        v >>= 7;
      }
      enc.reverse();
      bytes.push(...enc);
    }
  }
  const buf = Buffer.from(bytes);
  return Buffer.concat([Buffer.from([0x06]), asn1Len(buf.length), buf]);
}

function asn1UTF8(str) {
  const buf = Buffer.from(str, "utf8");
  return Buffer.concat([Buffer.from([0x0c]), asn1Len(buf.length), buf]);
}

function asn1BitString(buf) {
  const body = Buffer.concat([Buffer.from([0x00]), buf]); // 0 unused bits
  return Buffer.concat([Buffer.from([0x03]), asn1Len(body.length), body]);
}

function asn1OctetString(buf) {
  return Buffer.concat([Buffer.from([0x04]), asn1Len(buf.length), buf]);
}

function asn1Explicit(tag, content) {
  return Buffer.concat([Buffer.from([0xa0 | tag]), asn1Len(content.length), content]);
}

function asn1GeneralizedTime(date) {
  const s = date.toISOString().replace(/[-:T]/g, "").replace(/\.\d+Z/, "Z");
  const buf = Buffer.from(s, "ascii");
  return Buffer.concat([Buffer.from([0x18]), asn1Len(buf.length), buf]);
}

// ── Parse the public key from PEM ──
function pemToBuffer(pem, label) {
  const b64 = pem.replace(`-----BEGIN ${label}-----`, "").replace(`-----END ${label}-----`, "").replace(/\s/g, "");
  return Buffer.from(b64, "base64");
}

const pubKeyDer = pemToBuffer(publicKey, "PUBLIC KEY");
const privKeyDer = pemToBuffer(privateKey, "PRIVATE KEY");

// ── Build the TBS (To Be Signed) Certificate ──
const now = new Date();
const notBefore = new Date(now);
const notAfter = new Date(now);
notAfter.setFullYear(notAfter.getFullYear() + 1);

// Serial number (random)
const serial = crypto.randomBytes(8);

// Signature algorithm: sha256WithRSAEncryption
const sha256WithRSA = asn1Seq(asn1OID("1.2.840.113549.1.1.11"), Buffer.from([0x05, 0x00]));

// Issuer and Subject: CN=CityForms
const cn = asn1Seq(asn1Set(asn1Seq(asn1OID("2.5.4.3"), asn1UTF8("CityForms"))));

// Validity
const validity = asn1Seq(asn1GeneralizedTime(notBefore), asn1GeneralizedTime(notAfter));

// Subject Alternative Name extension: DNS:localhost, IP:172.30.2.55
const sanDNS = Buffer.concat([Buffer.from([0x82]), asn1Len(9), Buffer.from("localhost", "ascii")]);
const ipBytes = Buffer.from([172, 30, 2, 55]);
const sanIP = Buffer.concat([Buffer.from([0x87]), asn1Len(4), ipBytes]);
const sanValue = asn1Seq(sanDNS, sanIP);
const sanExt = asn1Seq(
  asn1OID("2.5.29.17"), // subjectAltName
  asn1OctetString(sanValue)
);

// Basic Constraints extension
const bcExt = asn1Seq(
  asn1OID("2.5.29.19"),
  Buffer.from([0x01, 0x01, 0xff]), // critical = true
  asn1OctetString(asn1Seq()) // CA=false (empty seq)
);

const extensions = asn1Explicit(3, asn1Seq(sanExt, bcExt));

// TBS Certificate
const tbs = asn1Seq(
  asn1Explicit(0, asn1Int(2)), // version v3
  asn1Int(serial),
  sha256WithRSA,
  cn, // issuer
  validity,
  cn, // subject (same as issuer for self-signed)
  pubKeyDer, // subjectPublicKeyInfo (already DER-encoded from PEM)
  extensions
);

// ── Sign the TBS ──
const signer = crypto.createSign("SHA256");
signer.update(tbs);
const signature = signer.sign(privateKey);

// ── Build the full certificate ──
const cert = asn1Seq(tbs, sha256WithRSA, asn1BitString(signature));

// ── Write PEM files ──
const certPem = `-----BEGIN CERTIFICATE-----\n${cert.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END CERTIFICATE-----\n`;

fs.writeFileSync(keyPath, privateKey);
fs.writeFileSync(certPath, certPem);

console.log(`  ✓ Certificate: ${certPath}`);
console.log(`  ✓ Key:         ${keyPath}`);
console.log(`  ✓ Valid for:   365 days`);
console.log(`  ✓ SANs:        localhost, 172.30.2.55\n`);
