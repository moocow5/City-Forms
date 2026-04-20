const fs = require('fs');
const path = require('path');
const src = path.join(require('os').homedir(), 'OneDrive - Lincoln County', 'Desktop', '2022_CityLogo_WHITEFG.png');
const dst = path.join(__dirname, 'public', 'images', '2022_CityLogo_WHITEFG.png');
fs.copyFileSync(src, dst);
console.log(`Copied logo: ${src} → ${dst}`);
console.log(`Size: ${fs.statSync(dst).size} bytes`);
