/*
 * flags.js — bandierine disegnate in SVG per il paese dei titoli esteri (vista 5, industrie: SOXX).
 * Le emoji delle bandiere su Windows diventano due lettere: qui sono forme semplici, riconoscibili a 14 × 10 px.
 * Il paese è quello del file delle holdings di iShares (colonna Location), non per forza la sede legale.
 */
const NS = 'http://www.w3.org/2000/svg';

// paese di iShares → codice
export const COUNTRY = {
  'United States': 'US', Taiwan: 'TW', 'Korea (South)': 'KR', Netherlands: 'NL', Israel: 'IL', France: 'FR', 'United Kingdom': 'GB',
  Japan: 'JP', Germany: 'DE', Switzerland: 'CH', China: 'CN', Canada: 'CA', Ireland: 'IE',
};
export const COUNTRY_IT = { US: 'Stati Uniti', TW: 'Taiwan', KR: 'Corea del Sud', NL: 'Paesi Bassi', IL: 'Israele', FR: 'Francia', GB: 'Regno Unito', JP: 'Giappone', DE: 'Germania', CH: 'Svizzera', CN: 'Cina', CA: 'Canada', IE: 'Irlanda' };

// contenuto di una bandiera in un riquadro 30 × 20 (unità del viewBox)
const SHAPES = {
  TW: '<rect width="30" height="20" fill="#d71920"/><rect width="15" height="10" fill="#1f3f99"/><circle cx="7.5" cy="5" r="2.8" fill="#fff"/>',
  KR: '<rect width="30" height="20" fill="#fff"/><path d="M10 10a5 5 0 0 1 10 0z" fill="#cd2e3a"/><path d="M10 10a5 5 0 0 0 10 0z" fill="#0047a0"/><g stroke="#000" stroke-width="1.1"><path d="M3 4l3-2M4 5.5l3-2M25 2l3 2M24 3.5l3 2M3 16l3 2M4 14.5l3 2M24 16.5l3-2M25 18l3-2"/></g>',
  NL: '<rect width="30" height="20" fill="#ae1c28"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#21468b"/>',
  IL: '<rect width="30" height="20" fill="#fff"/><rect y="2" width="30" height="2.5" fill="#0038b8"/><rect y="15.5" width="30" height="2.5" fill="#0038b8"/><path d="M15 6.2l3.3 5.7h-6.6zM15 13.8l-3.3-5.7h6.6z" fill="none" stroke="#0038b8" stroke-width="1"/>',
  FR: '<rect width="30" height="20" fill="#fff"/><rect width="10" height="20" fill="#0055a4"/><rect x="20" width="10" height="20" fill="#ef4135"/>',
  GB: '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.5"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.4"/>',
  US: '<rect width="30" height="20" fill="#fff"/><g fill="#b22234">' + [0, 2, 4, 6, 8, 10, 12].map((i) => `<rect y="${(i * 20) / 13}" width="30" height="${20 / 13}"/>`).join('') + '</g><rect width="13" height="10.77" fill="#3c3b6e"/>',
};
export const hasFlag = (c) => !!SHAPES[c];

/** Bandierina SVG come testo HTML (riquadro dei valori, lista): larghezza w px */
export function flagHTML(c, w = 16) {
  if (!SHAPES[c]) return '';
  return `<svg class="flag" viewBox="0 0 30 20" width="${w}" height="${(w * 2) / 3}" role="img" aria-label="${COUNTRY_IT[c] || c}"><title>${COUNTRY_IT[c] || c}</title>${SHAPES[c]}<rect width="30" height="20" fill="none" stroke="rgba(127,127,127,.6)" stroke-width="1"/></svg>`;
}

/** Bandierina dentro un SVG, con l'angolo in alto a sinistra in (x, y) e larghezza w */
export function drawFlag(parent, c, x, y, w = 14) {
  if (!SHAPES[c]) return null;
  const g = document.createElementNS(NS, 'svg');
  g.setAttribute('x', x); g.setAttribute('y', y); g.setAttribute('width', w); g.setAttribute('height', (w * 2) / 3);
  g.setAttribute('viewBox', '0 0 30 20'); g.setAttribute('class', 'flag');
  g.innerHTML = SHAPES[c] + '<rect width="30" height="20" fill="none" stroke="rgba(127,127,127,.7)" stroke-width="1.2"/>';
  parent.appendChild(g);
  return g;
}
