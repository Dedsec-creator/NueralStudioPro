const fs = require('fs');
let content = fs.readFileSync('src/components/BottomTransportDock.tsx', 'utf8');
content = content.replace(/className="flex-1 w-full flex items-center gap-2 sm:gap-3 px-1 sm:px-2 order-1 md:order-2"/, 'className="w-full md:w-auto md:flex-1 flex items-center gap-2 sm:gap-3 px-1 sm:px-2 order-1 md:order-2"');
fs.writeFileSync('src/components/BottomTransportDock.tsx', content);
