const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
};

const files = walk('./src/components');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Match standard slider classes
  content = content.replace(/className="w-full accent-([^ ]+) cursor-pointer h-(1\.5|2|2\.5) bg-slate-800 rounded-lg"/g, 'className="w-full accent-$1 cursor-pointer h-5 sm:h-$2 bg-slate-800 rounded-lg"');
  fs.writeFileSync(file, content);
});
console.log('Sliders updated');
