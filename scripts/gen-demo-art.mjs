// Generates the illustrated demo "photos" in public/demo/ (no external image hosts needed).
// Run: node scripts/gen-demo-art.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const W = 800, H = 500;
const out = new URL("../public/demo/", import.meta.url);
mkdirSync(out, { recursive: true });

const wrap = (id, body, sky = ["#E0F2FE", "#F0FDF4"]) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
  <linearGradient id="brand-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0EA5E9"/><stop offset="1" stop-color="#10B981"/></linearGradient>
  <radialGradient id="glow-${id}"><stop offset="0" stop-color="#34D399" stop-opacity=".9"/><stop offset="1" stop-color="#34D399" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky-${id})"/>
${body(id)}
</svg>`;

const car = (x, y, color = "#0F172A", s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M0 60 Q8 28 52 22 L92 0 Q120 -8 168 0 L214 24 Q250 30 256 60 L256 74 L0 74Z" fill="${color}"/>
  <path d="M98 8 L130 4 L130 28 L80 28Z M140 4 Q164 4 196 26 L140 28Z" fill="#BAE6FD" opacity=".85"/>
  <circle cx="58" cy="76" r="22" fill="#1E293B"/><circle cx="58" cy="76" r="9" fill="#CBD5E1"/>
  <circle cx="200" cy="76" r="22" fill="#1E293B"/><circle cx="200" cy="76" r="9" fill="#CBD5E1"/>
  <rect x="234" y="44" width="16" height="7" rx="3" fill="#FDE68A"/>
</g>`;

const wallbox = (id, x, y, s = 1, cableTo) => `<g transform="translate(${x} ${y}) scale(${s})">
  <ellipse cx="30" cy="40" rx="60" ry="60" fill="url(#glow-${id})" opacity=".35"/>
  <rect x="0" y="0" width="60" height="84" rx="12" fill="#fff" stroke="#CBD5E1" stroke-width="2"/>
  <rect x="10" y="12" width="40" height="22" rx="5" fill="url(#brand-${id})"/>
  <path d="M33 15 L24 25 H30 L27 32 L36 22 H30Z" fill="#fff"/>
  <circle cx="30" cy="56" r="9" fill="#0F172A"/><circle cx="30" cy="56" r="4" fill="#34D399"/>
</g>${cableTo ? `<path d="M${x + 30 * s} ${y + 65 * s} C ${x + 30 * s} ${cableTo[1] + 40}, ${cableTo[0] - 60} ${cableTo[1] + 50}, ${cableTo[0]} ${cableTo[1]}" fill="none" stroke="#0F172A" stroke-width="${5 * s}" stroke-linecap="round"/>` : ""}`;

const tree = (x, y, s = 1, c = "#86EFAC") => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="20" width="10" height="50" fill="#A16207" opacity=".6"/><circle cy="10" r="34" fill="${c}"/><circle cx="-20" cy="24" r="22" fill="${c}" opacity=".85"/><circle cx="22" cy="22" r="24" fill="${c}" opacity=".9"/></g>`;

const scenes = {
  driveway: (carColor, wall) => (id) => `
  <rect y="330" width="${W}" height="170" fill="#E2E8F0"/>
  <path d="M260 500 L340 330 L620 330 L700 500Z" fill="#CBD5E1"/>
  ${tree(120, 230, 1.3)}
  <rect x="300" y="110" width="380" height="220" fill="${wall}"/>
  <path d="M280 120 L490 30 L700 120Z" fill="#475569"/>
  <rect x="340" y="160" width="70" height="60" rx="4" fill="#BAE6FD"/><rect x="580" y="160" width="70" height="60" rx="4" fill="#BAE6FD"/>
  <rect x="450" y="200" width="80" height="130" rx="4" fill="#94A3B8"/>
  ${wallbox(id, 600, 230, 0.9, [560, 392])}
  ${car(300, 330, carColor, 1.15)}
  ${tree(740, 250, 1, "#4ADE80")}`,
  cafe: (awning) => (id) => `
  <rect y="350" width="${W}" height="150" fill="#E2E8F0"/>
  <rect x="80" y="90" width="640" height="260" fill="#FFF7ED"/>
  <rect x="80" y="70" width="640" height="34" fill="#0F172A"/>
  <text x="400" y="94" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#FDE68A" letter-spacing="4">CAFÉ</text>
  <path d="M80 104 H720 V140 Q700 160 680 140 Q660 160 640 140 Q620 160 600 140 Q580 160 560 140 Q540 160 520 140 Q500 160 480 140 Q460 160 440 140 Q420 160 400 140 Q380 160 360 140 Q340 160 320 140 Q300 160 280 140 Q260 160 240 140 Q220 160 200 140 Q180 160 160 140 Q140 160 120 140 Q100 160 80 140Z" fill="${awning}"/>
  <rect x="120" y="180" width="200" height="140" rx="6" fill="#BAE6FD" opacity=".9"/>
  <rect x="360" y="190" width="80" height="160" rx="4" fill="#78350F" opacity=".8"/>
  <rect x="480" y="180" width="200" height="140" rx="6" fill="#BAE6FD" opacity=".9"/>
  <circle cx="220" cy="300" r="14" fill="#FB923C"/><circle cx="580" cy="300" r="14" fill="#A3E635"/>
  ${wallbox(id, 660, 250, 0.85, [600, 420])}
  ${car(380, 350, "#0EA5E9", 1)}
  <rect x="40" y="320" width="30" height="40" fill="#22C55E" rx="6"/>`,
  basement: (stripe) => (id) => `
  <rect width="${W}" height="${H}" fill="#334155"/>
  <rect y="0" width="${W}" height="60" fill="#1E293B"/>
  ${[120, 360, 600].map((x) => `<rect x="${x - 10}" y="0" width="${80}" height="10" fill="#FEF9C3" opacity=".9"/>`).join("")}
  <rect y="330" width="${W}" height="170" fill="#475569"/>
  ${[0, 200, 400, 600].map((x) => `<path d="M${x + 40} 500 L${x + 80} 340" stroke="#FACC15" stroke-width="6"/>`).join("")}
  <rect x="520" y="60" width="70" height="280" fill="#64748B"/>
  <rect x="520" y="110" width="70" height="18" fill="${stripe}"/><rect x="520" y="300" width="70" height="18" fill="${stripe}"/>
  <text x="555" y="170" text-anchor="middle" font-family="monospace" font-size="26" font-weight="700" fill="#F8FAFC">B-12</text>
  ${wallbox(id, 525, 190, 1, [470, 420])}
  ${car(200, 350, "#F8FAFC", 1.1)}
  <rect x="40" y="200" width="120" height="40" rx="6" fill="#10B981"/><text x="100" y="227" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#fff">EV ONLY</text>`,
  hotel: () => (id) => `
  <rect y="360" width="${W}" height="140" fill="#E7E5E4"/>
  ${tree(90, 260, 1.2, "#4ADE80")}${tree(720, 260, 1.2, "#4ADE80")}
  <rect x="160" y="40" width="480" height="320" fill="#F5F5F4"/>
  ${Array.from({ length: 4 }, (_, r) => Array.from({ length: 6 }, (_, c) => `<rect x="${190 + c * 72}" y="${60 + r * 52}" width="44" height="32" rx="3" fill="#BAE6FD"/>`).join("")).join("")}
  <path d="M220 270 H580 L620 300 H180Z" fill="#B45309"/>
  <rect x="340" y="300" width="120" height="60" fill="#78350F" opacity=".7"/>
  ${wallbox(id, 230, 296, 0.75, [260, 440])}
  ${car(250, 368, "#B91C1C", 1.05)}`,
  techpark: () => (id) => `
  <rect y="330" width="${W}" height="170" fill="#E2E8F0"/>
  <rect x="60" y="40" width="320" height="290" fill="#CBD5E1"/>
  ${Array.from({ length: 9 }, (_, r) => `<rect x="70" y="${50 + r * 30}" width="300" height="18" fill="#7DD3FC" opacity=".8"/>`).join("")}
  <rect x="420" y="100" width="320" height="230" fill="#E2E8F0" stroke="#CBD5E1"/>
  ${Array.from({ length: 6 }, (_, r) => `<rect x="430" y="${110 + r * 36}" width="300" height="22" fill="#BAE6FD"/>`).join("")}
  <rect x="0" y="320" width="${W}" height="14" fill="#94A3B8"/>
  ${wallbox(id, 640, 250, 0.9, [600, 420])}
  ${wallbox(id, 140, 250, 0.9)}
  ${car(360, 345, "#10B981", 1.05)}`,
  closeup: (bg) => (id) => `
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sky-${id})" opacity=".35"/>
  <ellipse cx="330" cy="240" rx="230" ry="230" fill="url(#glow-${id})" opacity=".45"/>
  <rect x="230" y="70" width="200" height="300" rx="34" fill="#fff" stroke="#CBD5E1" stroke-width="4"/>
  <rect x="262" y="110" width="136" height="80" rx="14" fill="url(#brand-${id})"/>
  <path d="M342 122 L310 160 H332 L320 182 L352 146 H330Z" fill="#fff"/>
  <text x="330" y="230" text-anchor="middle" font-family="monospace" font-size="22" font-weight="700" fill="#0F172A">7.4 kW</text>
  <circle cx="330" cy="300" r="34" fill="#0F172A"/><circle cx="330" cy="300" r="14" fill="#34D399"/>
  <path d="M330 334 C 330 440, 560 380, 610 470" fill="none" stroke="#0F172A" stroke-width="16" stroke-linecap="round"/>
  <rect x="560" y="200" width="160" height="40" rx="20" fill="#DCFCE7"/><circle cx="586" cy="220" r="7" fill="#10B981"/>
  <text x="604" y="227" font-family="sans-serif" font-size="18" font-weight="600" fill="#15803D">Available</text>`,
};

const files = {
  "driveway-1": scenes.driveway("#0F172A", "#F8FAFC"),
  "driveway-2": scenes.driveway("#DC2626", "#FEF3C7"),
  "driveway-3": scenes.driveway("#0EA5E9", "#ECFCCB"),
  "cafe-1": scenes.cafe("#10B981"),
  "cafe-2": scenes.cafe("#F97316"),
  "basement-1": scenes.basement("#FACC15"),
  "basement-2": scenes.basement("#10B981"),
  "hotel-1": scenes.hotel(),
  "techpark-1": scenes.techpark(),
  "closeup-1": scenes.closeup("#F1F5F9"),
  "closeup-2": scenes.closeup("#ECFDF5"),
};

for (const [name, body] of Object.entries(files)) {
  writeFileSync(new URL(`${name}.svg`, out), wrap(name, body));
}
console.log(`Wrote ${Object.keys(files).length} files to public/demo/`);
