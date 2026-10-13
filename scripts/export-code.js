const fs = require('fs');
const path = require('path');

const FILES = [
    'src/app/home.tsx',
    'src/components/ZonePlan.tsx',
    'src/components/ZoneMini.tsx',
    'src/lib/floorPlan.ts',
    'src/lib/tables.ts',
];

const root = path.join(__dirname, '..');
let out = `# Kod Dökümü\n\nOluşturulma: ${new Date().toLocaleString('tr-TR')}\n\n`;

for (const rel of FILES) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
        out += `## ${rel}\n\n(dosya bulunamadı)\n\n`;
        continue;
    }
    const ext = path.extname(rel).slice(1);
    out += `## ${rel}\n\n\`\`\`${ext}\n${fs.readFileSync(full, 'utf8')}\n\`\`\`\n\n`;
}

fs.writeFileSync(path.join(root, 'ClaudeDevam_Kod.md'), out);
console.log('ClaudeDevam_Kod.md oluşturuldu');