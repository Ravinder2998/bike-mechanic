const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'server', 'db.js');
let code = fs.readFileSync(dbPath, 'utf8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync(dbPath, code);
console.log('Fixed db.js backticks.');
