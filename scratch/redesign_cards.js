const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const styleCssPath = path.join(__dirname, '..', 'css', 'style.css');

let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const services = [
  { id: 'general', title: 'General Service' },
  { id: 'engine', title: 'Engine Repair' },
  { id: 'brake', title: 'Brake Service' },
  { id: 'oil', title: 'Oil Change' },
  { id: 'tyre', title: 'Tyre Service' },
  { id: 'battery', title: 'Battery Care' },
  { id: 'electrical', title: 'Electrical Work' },
  { id: 'custom', title: 'Custom Upgrades' }
];

services.forEach(svc => {
  // Regex to match the entire service-card for a given ID
  // It matches <div class="service-card" onclick="window.openServiceModal('general')"> down to the closing </div> of the card
  const regex = new RegExp(\`<div class="service-card" onclick="window\\.openServiceModal\\('\${svc.id}'\\)">[\\\\s\\\\S]*?Explore →<\\/span>\\\\s*<\\/div>\\\\s*<\\/div>\`, 'g');
  
  // Also need to get the description and price
  const descMatch = indexHtml.match(new RegExp(\`<h3 class="service-card-title">\${svc.title}<\\/h3>\\s*<p class="service-card-desc">([^<]+)<\\/p>\\s*<div class="service-card-footer">\\s*<span class="service-price-tag">([^<]+)<\\/span>\`));
  
  const desc = descMatch ? descMatch[1] : '';
  const price = descMatch ? descMatch[2] : '';
  
  const placeholdText = svc.title.replace(/ /g, '+');
  
  const newCard = \`<div class="service-card new-design" onclick="window.openServiceModal('\${svc.id}')">
          <div class="service-card-img-wrap">
            <img src="https://placehold.co/600x400/0f1e3f/00d2ff?text=\${placeholdText}" alt="\${svc.title}">
          </div>
          <div class="service-card-body">
            <h3 class="service-card-title">\${svc.title}</h3>
            <p class="service-card-desc">\${desc}</p>
            <div class="service-card-footer">
              <span class="service-price-tag">\${price}</span>
              <span class="service-action-link">Explore →</span>
            </div>
          </div>
        </div>\`;

  indexHtml = indexHtml.replace(regex, newCard);
});

// Update Logo Image
indexHtml = indexHtml.replace(/assets\/images\/velocity_logo\.png/g, 'assets/images/velocity_logo_2d.png');

fs.writeFileSync(indexHtmlPath, indexHtml);

let css = fs.readFileSync(styleCssPath, 'utf8');

const newStyles = \`

/* New Service Card Design */
.service-card.new-design {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-dark-card);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all var(--transition-normal);
}

.service-card.new-design:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  border-color: rgba(0, 210, 255, 0.3);
}

.service-card.new-design .service-card-img-wrap {
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.service-card.new-design .service-card-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.service-card.new-design:hover .service-card-img-wrap img {
  transform: scale(1.05);
}

.service-card.new-design .service-card-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.service-card.new-design .service-card-title {
  font-size: 1.25rem;
  margin-bottom: 8px;
}

.service-card.new-design .service-card-desc {
  font-size: 0.95rem;
  color: var(--text-slate-400);
  margin-bottom: 20px;
  flex-grow: 1;
}

.service-card.new-design .service-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 16px;
}

.service-card.new-design .service-price-tag {
  color: var(--primary-cyan);
  font-weight: 700;
}
\`;

if (!css.includes('.service-card.new-design')) {
  fs.writeFileSync(styleCssPath, css + newStyles);
}

console.log('Cards redesigned successfully.');
