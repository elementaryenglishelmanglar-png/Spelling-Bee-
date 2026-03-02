const fs = require('fs');
const path = 'C:\\Users\\friki\\OneDrive\\Desktop\\Spelling-Bee-\\views\\LiveEventDisplay.tsx';

let content = fs.readFileSync(path, 'utf8');

// The file current has literal strings like \${meta} and \`
// We need to replace "\${" with "${" and "\`" with "`"
content = content.replace(/\\\$\{/g, '${');
content = content.replace(/\\`/g, '`');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed template literals');
