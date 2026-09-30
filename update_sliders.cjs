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
  let before = content;
  content = content.replace(/className="([^"]*)h-(1\.5|2|2\.5) ([^"]*)rounded-lg([^"]*)"/g, (match, p1, p2, p3, p4) => {
    if (match.includes("accent-")) {
        return `className="${p1}h-5 sm:h-${p2} ${p3}rounded-lg${p4}"`;
    }
    return match;
  });
  if(before !== content) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
console.log('Sliders updated');
