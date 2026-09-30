const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');
content = content.replace(/py-1\.5 text-xs font-bold rounded-xl/g, 'py-2 sm:py-1.5 text-xs font-bold rounded-xl');
content = content.replace(/py-1\.5 text-xs font-semibold rounded-xl/g, 'py-2 sm:py-1.5 text-xs font-semibold rounded-xl');
fs.writeFileSync('src/components/Header.tsx', content);
