const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const adminHtmlPath = path.join(__dirname, '..', 'admin.html');
const styleCssPath = path.join(__dirname, '..', 'css', 'style.css');

// 1. Fix CSS
let css = fs.readFileSync(styleCssPath, 'utf8');
// Remove button glow (box-shadow)
css = css.replace(/box-shadow: var\(--shadow-cyan\);/g, '/* removed glow */');
css = css.replace(/box-shadow: 0 12px 28px rgba\(242, 92, 5, 0\.45\);/g, '/* removed hover glow */');
css = css.replace(/box-shadow: 0 12px 28px rgba\(0, 210, 255, 0\.45\);/g, '/* removed hover glow */');

// Replace leftover orange colors
css = css.replace(/#f25c05/gi, '#00d2ff');
css = css.replace(/#ff8336/gi, '#0099cc');
css = css.replace(/rgba\(242,\s*92,\s*5,/gi, 'rgba(0, 210, 255,');

fs.writeFileSync(styleCssPath, css);

// 2. Fix Admin HTML
let adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
adminHtml = adminHtml.replace(/#f25c05/gi, '#00d2ff');
adminHtml = adminHtml.replace(/#ff8336/gi, '#0099cc');
adminHtml = adminHtml.replace(/rgba\(242,\s*92,\s*5,/gi, 'rgba(0, 210, 255,');
fs.writeFileSync(adminHtmlPath, adminHtml);

// 3. Fix Index HTML
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
// Fix leftover orange colors
indexHtml = indexHtml.replace(/rgba\(242,\s*92,\s*5,/gi, 'rgba(0, 210, 255,');
indexHtml = indexHtml.replace(/--border-orange/g, '--border-cyan');

// Replace "RIDECARE" to "VELOCITY MOTORS"
indexHtml = indexHtml.replace(/RIDECARE/g, 'VELOCITY MOTORS');
indexHtml = indexHtml.replace(/RIDE<span\>CARE<\/span\>/g, 'VELOCITY<span\>MOTORS<\/span\>');
indexHtml = indexHtml.replace(/RideCare/g, 'Velocity Motors');

// Change Logo SVG to the new image
indexHtml = indexHtml.replace(/<div class="logo-badge">[\s\S]*?<\/svg>\s*<\/div>/, '<div class="logo-badge"><img src="assets/images/velocity_logo.png" alt="Velocity Motors Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%;"></div>');

// Replace Service Icons with Images
indexHtml = indexHtml.replace(/<div class="service-icon-box">[\s\S]*?<\/svg>\s*<\/div>/g, '<div class="service-icon-box"><img src="assets/images/service_icon.png" alt="Service" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;"></div>');

// Remove Why Us Icons
indexHtml = indexHtml.replace(/<div class="pillar-icon-box">[\s\S]*?<\/svg>\s*<\/div>/g, '');

fs.writeFileSync(indexHtmlPath, indexHtml);

console.log('UI Fixes Applied');
