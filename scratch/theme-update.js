const fs = require('fs');
const path = require('path');

function updateTheme(filePath) {
  let css = fs.readFileSync(filePath, 'utf8');

  // Replace dark colors
  css = css.replace(/--bg-dark-900: #0a0c10;/g, '--bg-dark-900: #040d21;');
  css = css.replace(/--bg-dark-850: #0f1217;/g, '--bg-dark-850: #0a1631;');
  css = css.replace(/--bg-dark-800: #141820;/g, '--bg-dark-800: #0f1e3f;');
  css = css.replace(/--bg-dark-700: #1b212c;/g, '--bg-dark-700: #15274d;');
  css = css.replace(/--bg-dark-card: #161b24;/g, '--bg-dark-card: #0c1833;');
  css = css.replace(/--bg-dark-card-hover: #1e2430;/g, '--bg-dark-card-hover: #132446;');

  // Replace orange references with cyan
  css = css.replace(/orange/g, 'cyan');
  css = css.replace(/Orange/g, 'Cyan');

  // Replace cyan hex values (which used to be orange)
  css = css.replace(/--primary-cyan: #f25c05;/g, '--primary-cyan: #00d2ff;');
  css = css.replace(/--primary-cyan-light: #ff7426;/g, '--primary-cyan-light: #4de0ff;');
  css = css.replace(/--primary-cyan-dark: #d94e00;/g, '--primary-cyan-dark: #0099cc;');
  css = css.replace(/--primary-cyan-glow: rgba\(242, 92, 5, 0\.4\);/g, '--primary-cyan-glow: rgba(0, 210, 255, 0.4);');
  css = css.replace(/--primary-cyan-subtle: rgba\(242, 92, 5, 0\.12\);/g, '--primary-cyan-subtle: rgba(0, 210, 255, 0.12);');
  css = css.replace(/--cyan-gradient: linear-gradient\(135deg, #f25c05 0%, #ff7324 100%\);/g, '--cyan-gradient: linear-gradient(135deg, #00d2ff 0%, #0099cc 100%);');
  css = css.replace(/--cyan-gradient-hover: linear-gradient\(135deg, #ff7324 0%, #f25c05 100%\);/g, '--cyan-gradient-hover: linear-gradient(135deg, #0099cc 0%, #00d2ff 100%);');
  css = css.replace(/--border-cyan: rgba\(242, 92, 5, 0\.35\);/g, '--border-cyan: rgba(0, 210, 255, 0.35);');
  css = css.replace(/--shadow-cyan: 0 8px 24px rgba\(242, 92, 5, 0\.35\);/g, '--shadow-cyan: 0 8px 24px rgba(0, 210, 255, 0.35);');

  fs.writeFileSync(filePath, css);
}

try {
  updateTheme(path.join(__dirname, '../css/style.css'));
  updateTheme(path.join(__dirname, '../css/responsive.css'));
  console.log('Theme updated successfully.');
} catch (e) {
  console.error('Failed to update theme', e);
}
