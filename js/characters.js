/* Aftermotion echo characters: a small parts-based SVG character kit (heads, eyes, mouths, hats,
 * effects) and the roster built from it. Every character draws four eye/mouth "moods" (normal,
 * happy, dizzy, asleep); CSS shows the one matching the echo's state, and the pupils group
 * (.pp) shifts toward the echo's trace via --lx/--ly. No DOM access here. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AMChars = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DARK = '#1a1230', PINK = '#ff8fb1', GOLD = '#ffc24b', GOLD_D = '#b8860b';
  const star = (cx, cy, R, r, fill, extra) => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
      d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1);
    }
    return '<path d="' + d + 'Z" fill="' + fill + '" ' + (extra || '') + '/>';
  };
  const heart = (cx, cy, s, fill) => '<path d="M' + cx + ' ' + (cy + s * 0.9) + ' C' + (cx - s * 1.6) + ' ' + (cy - s * 0.2) + ' ' + (cx - s * 0.6) + ' ' + (cy - s * 1.3) + ' ' + cx + ' ' + (cy - s * 0.4) + ' C' + (cx + s * 0.6) + ' ' + (cy - s * 1.3) + ' ' + (cx + s * 1.6) + ' ' + (cy - s * 0.2) + ' ' + cx + ' ' + (cy + s * 0.9) + 'Z" fill="' + fill + '"/>';

  /* ---------- heads: return [svg, faceY] ---------- */
  function head(c, F) {
    const b = c.body, a = c.accent || '#ffffff', S = F;
    switch (c.head) {
      case 'cat': return ['<path d="M19 46 L23 9 L46 29 Z" ' + S + '/><path d="M81 46 L77 9 L54 29 Z" ' + S + '/>' +
        (c.neon ? '' : '<path d="M25 37 L27 17 L39 29Z" fill="' + PINK + '"/><path d="M75 37 L73 17 L61 29Z" fill="' + PINK + '"/>') +
        '<circle cx="50" cy="58" r="31" ' + S + '/>', 56];
      case 'bear': return ['<circle cx="24" cy="30" r="12" ' + S + '/><circle cx="76" cy="30" r="12" ' + S + '/>' +
        '<circle cx="24" cy="30" r="6" fill="' + a + '"/><circle cx="76" cy="30" r="6" fill="' + a + '"/><circle cx="50" cy="57" r="32" ' + S + '/>' +
        '<ellipse cx="50" cy="70" rx="13" ry="10" fill="' + a + '" opacity=".9"/>', 54];
      case 'panda': return ['<circle cx="24" cy="30" r="12" fill="' + DARK + '"/><circle cx="76" cy="30" r="12" fill="' + DARK + '"/><circle cx="50" cy="57" r="32" ' + S + '/>' +
        '<ellipse cx="37" cy="54" rx="9" ry="11" fill="' + DARK + '" transform="rotate(-20 37 54)"/><ellipse cx="63" cy="54" rx="9" ry="11" fill="' + DARK + '" transform="rotate(20 63 54)"/>', 54];
      case 'bunny': return ['<ellipse cx="37" cy="20" rx="8" ry="21" ' + S + '/><ellipse cx="63" cy="20" rx="8" ry="21" ' + S + '/>' +
        '<ellipse cx="37" cy="21" rx="4" ry="14" fill="' + PINK + '"/><ellipse cx="63" cy="21" rx="4" ry="14" fill="' + PINK + '"/><circle cx="50" cy="61" r="29" ' + S + '/>', 58];
      case 'fox': return ['<path d="M17 50 L16 12 L40 28 Z" ' + S + '/><path d="M83 50 L84 12 L60 28 Z" ' + S + '/>' +
        '<path d="M16 50 Q18 26 50 25 Q82 26 84 50 Q82 76 50 89 Q18 76 16 50Z" ' + S + '/><path d="M28 62 Q50 96 72 62 Q50 72 28 62Z" fill="' + a + '"/>', 52];
      case 'skull': return ['<path d="M17 50 Q17 17 50 17 Q83 17 83 50 Q83 64 72 68 L72 80 Q50 91 28 80 L28 68 Q17 64 17 50Z" ' + S + '/>' +
        '<path d="M50 60 L45 68 L55 68Z" fill="' + DARK + '" opacity=".85"/>', 50];
      case 'ghost': return ['<path d="M20 87 L20 50 Q20 19 50 19 Q80 19 80 50 L80 87 Q73 80 66 87 Q58 94 50 87 Q42 80 34 87 Q27 94 20 87Z" ' + S + '/>', 52];
      case 'robot': return ['<line x1="50" y1="28" x2="50" y2="13" stroke="' + DARK + '" stroke-width="3"/><circle cx="50" cy="11" r="5" fill="' + a + '" class="blinky"/>' +
        '<circle cx="18" cy="57" r="5" fill="' + a + '"/><circle cx="82" cy="57" r="5" fill="' + a + '"/><rect x="20" y="27" width="60" height="58" rx="12" ' + S + '/>', 54];
      case 'alien': return ['<line x1="38" y1="30" x2="28" y2="10" stroke="' + b + '" stroke-width="3"/><line x1="62" y1="30" x2="72" y2="10" stroke="' + b + '" stroke-width="3"/>' +
        '<circle cx="28" cy="9" r="5" fill="' + a + '" class="blinky"/><circle cx="72" cy="9" r="5" fill="' + a + '"/><ellipse cx="50" cy="58" rx="31" ry="32" ' + S + '/>', 54];
      case 'slime': return ['<path d="M15 85 Q13 50 30 34 Q50 14 70 34 Q87 50 85 85 Q77 89 71 83 Q67 93 59 87 Q50 93 42 87 Q34 93 29 85 Q22 91 15 85Z" ' + S + '/>' +
        '<ellipse cx="34" cy="38" rx="7" ry="4" fill="#fff" opacity=".45" transform="rotate(-30 34 38)"/>', 58];
      case 'pumpkin': return ['<rect x="46" y="16" width="8" height="12" rx="3" fill="#4caf50"/><ellipse cx="33" cy="58" rx="18" ry="28" ' + S + '/><ellipse cx="67" cy="58" rx="18" ry="28" ' + S + '/>' +
        '<ellipse cx="50" cy="58" rx="20" ry="30" ' + S + '/>', 54];
      case 'frog': return ['<circle cx="31" cy="37" r="14" ' + S + '/><circle cx="69" cy="37" r="14" ' + S + '/><ellipse cx="50" cy="63" rx="35" ry="26" ' + S + '/>', 36];
      case 'owl': return ['<path d="M20 34 L22 12 L38 28Z" ' + S + '/><path d="M80 34 L78 12 L62 28Z" ' + S + '/><circle cx="50" cy="57" r="32" ' + S + '/>' +
        '<ellipse cx="50" cy="74" rx="16" ry="12" fill="' + a + '" opacity=".9"/>', 52];
      case 'devil': return ['<path d="M30 33 Q18 16 22 4 Q31 20 40 27Z" fill="' + a + '"/><path d="M70 33 Q82 16 78 4 Q69 20 60 27Z" fill="' + a + '"/><circle cx="50" cy="57" r="32" ' + S + '/>', 54];
      case 'dragon': return ['<path d="M31 32 Q24 14 30 5 Q35 20 42 27Z" fill="' + a + '"/><path d="M69 32 Q76 14 70 5 Q65 20 58 27Z" fill="' + a + '"/>' +
        '<path d="M44 26 L50 14 L56 26Z" fill="' + a + '"/><circle cx="50" cy="57" r="32" ' + S + '/><circle cx="44" cy="71" r="2" fill="' + DARK + '"/><circle cx="56" cy="71" r="2" fill="' + DARK + '"/>', 52];
      case 'cloud': return ['<circle cx="31" cy="61" r="18" ' + S + '/><circle cx="69" cy="61" r="18" ' + S + '/><circle cx="50" cy="48" r="23" ' + S + '/><circle cx="50" cy="67" r="20" ' + S + '/>', 56];
      case 'star': return [star(50, 56, 44, 21, b, S.replace(/fill="[^"]*"/, '')), 56];
      case 'octo': return ['<path d="M21 60 Q19 87 29 85 Q33 71 39 81 Q44 93 50 83 Q56 93 61 81 Q67 71 71 85 Q81 87 79 60Z" ' + S + '/><circle cx="50" cy="50" r="30" ' + S + '/>', 48];
      case 'penguin': return ['<circle cx="50" cy="57" r="32" ' + S + '/><path d="M28 54 Q30 33 50 42 Q70 33 72 54 Q72 80 50 85 Q28 80 28 54Z" fill="' + a + '"/>', 54];
      case 'mushroom': return ['<rect x="28" y="46" width="44" height="42" rx="15" fill="' + a + '"/><path d="M12 54 Q12 14 50 14 Q88 14 88 54 Q50 46 12 54Z" ' + S + '/>' +
        '<circle cx="32" cy="32" r="6" fill="#fff"/><circle cx="58" cy="24" r="5" fill="#fff"/><circle cx="72" cy="40" r="4" fill="#fff"/>', 64];
      case 'squircle': return ['<rect x="17" y="24" width="66" height="64" rx="24" ' + S + '/>', 54];
      default: return ['<circle cx="50" cy="57" r="33" ' + S + '/>', 54];
    }
  }

  /* ---------- eyes: normal set (with pupils that track) ---------- */
  function eyes(c, y) {
    const L = c.line || DARK, E = c.eyeColor || '#ffffff';
    const pupil = (x, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + L + '"/><circle cx="' + (x + r * 0.4) + '" cy="' + (y - r * 0.45) + '" r="' + r * 0.35 + '" fill="#fff"/>';
    switch (c.eyes) {
      case 'dot': return '<g class="pp"><circle cx="38" cy="' + y + '" r="5.5" fill="' + L + '"/><circle cx="62" cy="' + y + '" r="5.5" fill="' + L + '"/></g>';
      case 'cat': return '<ellipse cx="38" cy="' + y + '" rx="9" ry="10" fill="' + E + '"/><ellipse cx="62" cy="' + y + '" rx="9" ry="10" fill="' + E + '"/>' +
        '<g class="pp"><ellipse cx="38" cy="' + y + '" rx="2.6" ry="7.5" fill="' + L + '"/><ellipse cx="62" cy="' + y + '" rx="2.6" ry="7.5" fill="' + L + '"/></g>';
      case 'visor': return '<rect x="24" y="' + (y - 8) + '" width="52" height="15" rx="7.5" fill="' + L + '"/><g class="pp"><rect x="38" y="' + (y - 4) + '" width="24" height="7" rx="3.5" fill="' + E + '" class="glowy"/></g>';
      case 'cyc': return '<circle cx="50" cy="' + y + '" r="14" fill="' + E + '"/><g class="pp">' + pupil(50, 7) + '</g>';
      case 'star': return '<g class="pp">' + star(38, y, 10, 4.5, E) + star(62, y, 10, 4.5, E) + '</g>';
      case 'heart': return '<g class="pp">' + heart(38, y, 6, E) + heart(62, y, 6, E) + '</g>';
      case 'socket': return '<ellipse cx="37" cy="' + y + '" rx="10" ry="11" fill="' + DARK + '"/><ellipse cx="63" cy="' + y + '" rx="10" ry="11" fill="' + DARK + '"/>' +
        '<g class="pp"><circle cx="37" cy="' + y + '" r="3.6" fill="' + E + '" class="glowy"/><circle cx="63" cy="' + y + '" r="3.6" fill="' + E + '" class="glowy"/></g>';
      case 'glasses': return '<circle cx="38" cy="' + y + '" r="9" fill="#fff"/><circle cx="62" cy="' + y + '" r="9" fill="#fff"/><g class="pp">' + pupil(38, 4.2) + pupil(62, 4.2) + '</g>' +
        '<circle cx="38" cy="' + y + '" r="11.5" fill="none" stroke="' + DARK + '" stroke-width="3"/><circle cx="62" cy="' + y + '" r="11.5" fill="none" stroke="' + DARK + '" stroke-width="3"/><line x1="49" y1="' + y + '" x2="51" y2="' + y + '" stroke="' + DARK + '" stroke-width="3"/>';
      case 'shades': return '<path d="M24 ' + (y - 7) + ' H76 V' + (y - 3) + ' Q74 ' + (y + 9) + ' 62 ' + (y + 8) + ' Q52 ' + (y + 7) + ' 51 ' + (y - 2) + ' H49 Q48 ' + (y + 7) + ' 38 ' + (y + 8) + ' Q26 ' + (y + 9) + ' 24 ' + (y - 3) + 'Z" fill="' + DARK + '"/>' +
        '<g class="pp"><line x1="30" y1="' + (y - 3) + '" x2="36" y2="' + (y - 3) + '" stroke="#fff" stroke-width="2" opacity=".7"/><line x1="56" y1="' + (y - 3) + '" x2="62" y2="' + (y - 3) + '" stroke="#fff" stroke-width="2" opacity=".7"/></g>';
      case 'sleepy': return '<path d="M30 ' + y + ' Q38 ' + (y + 6) + ' 46 ' + y + '" fill="none" stroke="' + L + '" stroke-width="3.5" stroke-linecap="round"/><path d="M54 ' + y + ' Q62 ' + (y + 6) + ' 70 ' + y + '" fill="none" stroke="' + L + '" stroke-width="3.5" stroke-linecap="round"/>';
      case 'angry': return '<g class="pp"><circle cx="38" cy="' + (y + 2) + '" r="5" fill="' + L + '"/><circle cx="62" cy="' + (y + 2) + '" r="5" fill="' + L + '"/></g>' +
        '<line x1="29" y1="' + (y - 9) + '" x2="45" y2="' + (y - 4) + '" stroke="' + L + '" stroke-width="3.5" stroke-linecap="round"/><line x1="71" y1="' + (y - 9) + '" x2="55" y2="' + (y - 4) + '" stroke="' + L + '" stroke-width="3.5" stroke-linecap="round"/>';
      case 'patch': return '<circle cx="62" cy="' + y + '" r="9" fill="#fff"/><g class="pp">' + pupil(62, 4.5) + '</g>' +
        '<line x1="22" y1="' + (y - 16) + '" x2="60" y2="' + (y - 18) + '" stroke="' + DARK + '" stroke-width="2.5"/><ellipse cx="38" cy="' + y + '" rx="10" ry="9" fill="' + DARK + '"/>';
      case 'zombie': return '<circle cx="62" cy="' + y + '" r="9" fill="#f4f0d0"/><g class="pp">' + pupil(62, 4) + '</g>' +
        '<path d="M31 ' + (y - 6) + ' L45 ' + (y + 6) + ' M45 ' + (y - 6) + ' L31 ' + (y + 6) + '" stroke="' + L + '" stroke-width="3.5" stroke-linecap="round"/>';
      default: return '<circle cx="38" cy="' + y + '" r="9.5" fill="#fff"/><circle cx="62" cy="' + y + '" r="9.5" fill="#fff"/><g class="pp">' + pupil(38, 5) + pupil(62, 5) + '</g>';
    }
  }
  function moodEyes(c, y) {
    const L = c.line || DARK, s = 'fill="none" stroke="' + L + '" stroke-width="3.8" stroke-linecap="round"';
    return '<g class="e-h"><path d="M30 ' + (y + 3) + ' Q38 ' + (y - 7) + ' 46 ' + (y + 3) + '" ' + s + '/><path d="M54 ' + (y + 3) + ' Q62 ' + (y - 7) + ' 70 ' + (y + 3) + '" ' + s + '/></g>' +
      '<g class="e-x"><path d="M32 ' + (y - 6) + ' L44 ' + (y + 6) + ' M44 ' + (y - 6) + ' L32 ' + (y + 6) + ' M56 ' + (y - 6) + ' L68 ' + (y + 6) + ' M68 ' + (y - 6) + ' L56 ' + (y + 6) + '" ' + s + '/></g>' +
      '<g class="e-z"><path d="M30 ' + (y + 1) + ' Q38 ' + (y + 5) + ' 46 ' + (y + 1) + ' M54 ' + (y + 1) + ' Q62 ' + (y + 5) + ' 70 ' + (y + 1) + '" ' + s + '/></g>';
  }

  /* ---------- mouths ---------- */
  function mouth(c, y) {
    const L = c.line || DARK, s = 'fill="none" stroke="' + L + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';
    switch (c.mouth) {
      case 'cat': return '<path d="M47 ' + (y - 5) + ' L53 ' + (y - 5) + ' L50 ' + (y - 2) + 'Z" fill="' + PINK + '"/><path d="M41 ' + y + ' Q45.5 ' + (y + 5) + ' 50 ' + y + ' Q54.5 ' + (y + 5) + ' 59 ' + y + '" ' + s + '/>';
      case 'open': return '<ellipse cx="50" cy="' + (y + 2) + '" rx="6.5" ry="5.5" fill="' + DARK + '"/><ellipse cx="50" cy="' + (y + 5) + '" rx="4" ry="2.4" fill="' + PINK + '"/>';
      case 'fang': return '<path d="M39 ' + y + ' Q50 ' + (y + 9) + ' 61 ' + y + '" ' + s + '/><path d="M43 ' + (y + 2) + ' L45 ' + (y + 8) + ' L47 ' + (y + 3) + 'Z M53 ' + (y + 3) + ' L55 ' + (y + 8) + ' L57 ' + (y + 2) + 'Z" fill="#fff"/>';
      case 'teeth': return '<rect x="36" y="' + (y - 2) + '" width="28" height="9" rx="2" fill="#f4f0e0" stroke="' + DARK + '" stroke-width="1.5"/>' +
        [43, 50, 57].map((x) => '<line x1="' + x + '" y1="' + (y - 2) + '" x2="' + x + '" y2="' + (y + 7) + '" stroke="' + DARK + '" stroke-width="1.5"/>').join('');
      case 'grin': return '<path d="M36 ' + y + ' Q50 ' + (y + 15) + ' 64 ' + y + 'Z" fill="' + DARK + '"/><path d="M40 ' + (y + 1) + ' H60" stroke="#fff" stroke-width="2.5"/>';
      case 'tongue': return '<path d="M40 ' + y + ' Q50 ' + (y + 9) + ' 60 ' + y + '" ' + s + '/><path d="M52 ' + (y + 4) + ' Q55 ' + (y + 12) + ' 59 ' + (y + 4) + 'Z" fill="' + PINK + '"/>';
      case 'o': return '<circle cx="50" cy="' + (y + 2) + '" r="3.5" fill="' + L + '"/>';
      case 'flat': return '<line x1="42" y1="' + (y + 2) + '" x2="58" y2="' + (y + 2) + '" ' + s + '/>';
      case 'beak': return '<path d="M43 ' + (y - 4) + ' L57 ' + (y - 4) + ' L50 ' + (y + 5) + 'Z" fill="#ffab2e" stroke="#b86b00" stroke-width="1.5"/>';
      case 'stache': return '<path d="M40 ' + (y + 4) + ' Q50 ' + (y + 10) + ' 60 ' + (y + 4) + '" ' + s + '/><path d="M50 ' + (y - 1) + ' Q42 ' + (y - 6) + ' 33 ' + (y + 2) + ' Q42 ' + (y + 3) + ' 50 ' + (y + 1) + ' Q58 ' + (y + 3) + ' 67 ' + (y + 2) + ' Q58 ' + (y - 6) + ' 50 ' + (y - 1) + 'Z" fill="' + (c.stache || '#5b3a1a') + '"/>';
      case 'zip': return '<line x1="38" y1="' + (y + 2) + '" x2="62" y2="' + (y + 2) + '" ' + s + '/>' + [41, 47, 53, 59].map((x) => '<line x1="' + x + '" y1="' + (y - 2) + '" x2="' + x + '" y2="' + (y + 6) + '" stroke="' + L + '" stroke-width="2"/>').join('');
      default: return '<path d="M40 ' + y + ' Q50 ' + (y + 9) + ' 60 ' + y + '" ' + s + '/>';
    }
  }
  function moodMouth(c, y) {
    const L = c.line || DARK;
    return '<g class="m-h"><path d="M37 ' + y + ' Q50 ' + (y + 16) + ' 63 ' + y + 'Z" fill="' + DARK + '"/><ellipse cx="50" cy="' + (y + 8) + '" rx="5" ry="3" fill="' + PINK + '"/></g>' +
      '<g class="m-x"><path d="M39 ' + (y + 3) + ' Q44.5 ' + (y - 3) + ' 50 ' + (y + 3) + ' Q55.5 ' + (y + 9) + ' 61 ' + (y + 3) + '" fill="none" stroke="' + L + '" stroke-width="3" stroke-linecap="round"/></g>' +
      '<g class="m-z"><circle cx="50" cy="' + (y + 3) + '" r="3" fill="' + L + '"/><text x="72" y="26" class="zz" fill="' + (c.neon ? c.body : '#fff') + '">z</text><text x="82" y="14" class="zz z2" fill="' + (c.neon ? c.body : '#fff') + '">z</text></g>';
  }

  /* ---------- hats / headwear ---------- */
  function hat(c, top) {
    const t = top;
    switch (c.hat) {
      case 'crown': return '<path d="M29 ' + (t + 6) + ' L29 ' + (t - 12) + ' L39 ' + (t - 4) + ' L50 ' + (t - 17) + ' L61 ' + (t - 4) + ' L71 ' + (t - 12) + ' L71 ' + (t + 6) + 'Z" fill="' + (c.crown || GOLD) + '" stroke="' + GOLD_D + '" stroke-width="2" stroke-linejoin="round" class="' + (c.neon ? 'glowy' : '') + '"/>' +
        '<circle cx="50" cy="' + (t - 1) + '" r="3.2" fill="#ff5c8a"/><circle cx="38" cy="' + (t + 1) + '" r="2.4" fill="#4fe3ff"/><circle cx="62" cy="' + (t + 1) + '" r="2.4" fill="#6dffb3"/>';
      case 'tiara': return '<path d="M32 ' + (t + 5) + ' Q50 ' + (t - 8) + ' 68 ' + (t + 5) + '" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' + star(50, t - 6, 7, 3, '#bfe9ff', 'stroke="' + GOLD + '" stroke-width="1.5"');
      case 'top': return '<rect x="25" y="' + (t + 1) + '" width="50" height="6" rx="3" fill="' + DARK + '"/><rect x="34" y="' + (t - 22) + '" width="32" height="24" rx="3" fill="' + DARK + '"/><rect x="34" y="' + (t - 6) + '" width="32" height="5" fill="' + (c.accent2 || '#ff5c8a') + '"/>';
      case 'wizard': return '<ellipse cx="50" cy="' + (t + 4) + '" rx="27" ry="6" fill="#3b2a8f"/><path d="M30 ' + (t + 4) + ' L52 ' + (t - 30) + ' L70 ' + (t + 4) + 'Z" fill="#4d38b8"/>' + star(52, t - 10, 6, 2.6, GOLD);
      case 'beanie': return '<path d="M22 ' + (t + 10) + ' Q50 ' + (t - 26) + ' 78 ' + (t + 10) + 'Z" fill="' + (c.accent2 || '#ff5c8a') + '"/><rect x="21" y="' + (t + 4) + '" width="58" height="9" rx="4" fill="#fff" opacity=".85"/><circle cx="50" cy="' + (t - 15) + '" r="6.5" fill="#fff"/>';
      case 'halo': return '<ellipse cx="50" cy="' + (t - 10) + '" rx="19" ry="5.5" fill="none" stroke="' + GOLD + '" stroke-width="3.5" class="glowy"/>';
      case 'party': return '<path d="M38 ' + (t + 6) + ' L50 ' + (t - 26) + ' L62 ' + (t + 6) + 'Z" fill="#4fe3ff"/><path d="M42 ' + (t - 4) + ' L57 ' + (t - 1) + ' M45 ' + (t - 14) + ' L54 ' + (t - 12) + '" stroke="#ff5c8a" stroke-width="3"/><circle cx="50" cy="' + (t - 27) + '" r="4.5" fill="' + GOLD + '"/>';
      case 'phones': return '<path d="M17 56 Q17 16 50 16 Q83 16 83 56" fill="none" stroke="' + DARK + '" stroke-width="6"/><rect x="10" y="46" width="13" height="22" rx="5" fill="' + (c.accent2 || '#ff5c8a') + '"/><rect x="77" y="46" width="13" height="22" rx="5" fill="' + (c.accent2 || '#ff5c8a') + '"/>';
      case 'bow': return '<path d="M62 ' + (t + 4) + ' L52 ' + (t - 8) + ' L52 ' + (t + 12) + 'Z M62 ' + (t + 4) + ' L72 ' + (t - 8) + ' L72 ' + (t + 12) + 'Z" fill="#ff5c8a"/><circle cx="62" cy="' + (t + 4) + '" r="3.5" fill="#ff8fb1"/>';
      case 'chef': return '<rect x="32" y="' + (t - 4) + '" width="36" height="10" rx="2" fill="#fff"/><circle cx="38" cy="' + (t - 10) + '" r="9" fill="#fff"/><circle cx="50" cy="' + (t - 15) + '" r="11" fill="#fff"/><circle cx="62" cy="' + (t - 10) + '" r="9" fill="#fff"/>';
      case 'bandana': return '<path d="M18 ' + (t + 18) + ' Q50 ' + (t - 14) + ' 82 ' + (t + 18) + ' Q50 ' + (t + 6) + ' 18 ' + (t + 18) + 'Z" fill="#e53950"/><circle cx="40" cy="' + (t + 6) + '" r="2" fill="#fff"/><circle cx="56" cy="' + (t + 4) + '" r="2" fill="#fff"/><path d="M82 ' + (t + 18) + ' L92 ' + (t + 12) + ' L90 ' + (t + 24) + 'Z" fill="#e53950"/>';
      case 'flower': return '<g transform="translate(70 ' + (t + 6) + ')">' + [0, 72, 144, 216, 288].map((r) => '<ellipse cx="0" cy="-7" rx="4.5" ry="7" fill="#ff8fb1" transform="rotate(' + r + ')"/>').join('') + '<circle r="4" fill="' + GOLD + '"/></g>';
      case 'band': return '<rect x="17" y="' + (t + 14) + '" width="66" height="9" fill="#2b2b3b"/><path d="M83 ' + (t + 16) + ' L95 ' + (t + 10) + ' M83 ' + (t + 21) + ' L96 ' + (t + 24) + '" stroke="#2b2b3b" stroke-width="4" stroke-linecap="round"/>';
      case 'helmet': return '<circle cx="50" cy="55" r="41" fill="#bfe9ff" fill-opacity=".14" stroke="#e8f6ff" stroke-width="3"/><path d="M26 34 Q34 22 46 20" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>';
      case 'horns': return '<path d="M30 ' + (t + 9) + ' Q18 ' + (t - 8) + ' 22 ' + (t - 20) + ' Q31 ' + (t - 4) + ' 40 ' + (t + 3) + 'Z" fill="#e53950"/><path d="M70 ' + (t + 9) + ' Q82 ' + (t - 8) + ' 78 ' + (t - 20) + ' Q69 ' + (t - 4) + ' 60 ' + (t + 3) + 'Z" fill="#e53950"/>';
      case 'cap': return '<path d="M20 ' + (t + 12) + ' Q50 ' + (t - 16) + ' 80 ' + (t + 12) + 'Z" fill="' + (c.accent2 || '#4fe3ff') + '"/><path d="M58 ' + (t + 10) + ' Q80 ' + (t + 6) + ' 94 ' + (t + 14) + ' Q76 ' + (t + 16) + ' 58 ' + (t + 14) + 'Z" fill="' + (c.accent2 || '#4fe3ff') + '" opacity=".85"/>';
      case 'fire': return '<path class="flame" d="M34 ' + (t + 8) + ' Q30 ' + (t - 10) + ' 40 ' + (t - 22) + ' Q40 ' + (t - 8) + ' 46 ' + (t - 6) + ' Q46 ' + (t - 24) + ' 56 ' + (t - 30) + ' Q54 ' + (t - 12) + ' 62 ' + (t - 10) + ' Q66 ' + (t - 22) + ' 64 ' + (t - 26) + ' Q74 ' + (t - 8) + ' 66 ' + (t + 8) + 'Z" fill="#ff7a3d"/>' +
        '<path class="flame f2" d="M42 ' + (t + 8) + ' Q42 ' + (t - 6) + ' 50 ' + (t - 14) + ' Q50 ' + (t - 4) + ' 58 ' + (t - 2) + ' Q60 ' + (t + 4) + ' 58 ' + (t + 8) + 'Z" fill="' + GOLD + '"/>';
      case 'bolt': return '<path class="zap" d="M54 ' + (t - 30) + ' L40 ' + (t - 6) + ' L50 ' + (t - 6) + ' L44 ' + (t + 10) + ' L62 ' + (t - 14) + ' L52 ' + (t - 14) + ' L58 ' + (t - 30) + 'Z" fill="#ffe066" stroke="#fff6c4" stroke-width="1.5" stroke-linejoin="round"/>';
      default: return '';
    }
  }

  /* ---------- extras ---------- */
  function extras(c, y, top) {
    const fx = c.fx || [], out = [];
    if (fx.includes('blush')) out.push('<ellipse cx="28" cy="' + (y + 12) + '" rx="6" ry="3.5" fill="' + PINK + '" opacity=".55"/><ellipse cx="72" cy="' + (y + 12) + '" rx="6" ry="3.5" fill="' + PINK + '" opacity=".55"/>');
    if (fx.includes('stripes')) out.push('<path d="M42 ' + (top + 10) + ' L44 ' + (top + 18) + ' M50 ' + (top + 8) + ' L50 ' + (top + 17) + ' M58 ' + (top + 10) + ' L56 ' + (top + 18) + '" stroke="' + (c.stripe || '#8a3c12') + '" stroke-width="3" stroke-linecap="round"/>');
    if (fx.includes('whiskers')) out.push('<path d="M14 ' + (y + 12) + ' L30 ' + (y + 14) + ' M15 ' + (y + 19) + ' L30 ' + (y + 17) + ' M86 ' + (y + 12) + ' L70 ' + (y + 14) + ' M85 ' + (y + 19) + ' L70 ' + (y + 17) + '" stroke="' + (c.neon ? c.body : (c.line || DARK)) + '" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>');
    if (fx.includes('spots')) out.push('<circle cx="30" cy="' + (y - 14) + '" r="4" fill="' + (c.spot || '#fff') + '" opacity=".5"/><circle cx="72" cy="' + (y - 10) + '" r="3" fill="' + (c.spot || '#fff') + '" opacity=".5"/><circle cx="66" cy="' + (y + 22) + '" r="3.5" fill="' + (c.spot || '#fff') + '" opacity=".5"/>');
    if (fx.includes('stitch')) out.push('<path d="M36 ' + (top + 12) + ' L58 ' + (top + 16) + '" stroke="' + DARK + '" stroke-width="2"/>' + [40, 46, 52].map((x) => '<line x1="' + x + '" y1="' + (top + 9) + '" x2="' + (x + 1) + '" y2="' + (top + 19) + '" stroke="' + DARK + '" stroke-width="1.6"/>').join(''));
    if (fx.includes('sugar')) out.push('<g transform="translate(50 ' + (top + 12) + ')">' + [0, 60, 120, 180, 240, 300].map((r) => '<ellipse cx="0" cy="-5" rx="2.6" ry="5" fill="#ff5c8a" transform="rotate(' + r + ')"/>').join('') + '<circle r="2.6" fill="' + GOLD + '"/></g>' +
      [[26, y - 2], [30, y + 12], [74, y - 2], [70, y + 12]].map(([x, yy]) => '<circle cx="' + x + '" cy="' + yy + '" r="2.2" fill="#4fe3ff"/>').join(''));
    if (fx.includes('cape')) out.push('<path d="M22 80 L34 70 L40 88Z M78 80 L66 70 L60 88Z" fill="#7a1030"/>');
    if (fx.includes('sparkle')) out.push('<g class="twinkle">' + star(16, 26, 5, 1.6, '#fff') + star(86, 70, 4, 1.4, '#fff') + star(84, 22, 3.5, 1.2, '#fff') + '</g>');
    if (fx.includes('galaxy')) out.push('<circle cx="34" cy="' + (y + 20) + '" r="1.6" fill="#fff"/><circle cx="66" cy="' + (y - 18) + '" r="1.3" fill="#fff"/><circle cx="58" cy="' + (y + 24) + '" r="1.1" fill="#fff"/><circle cx="28" cy="' + (y - 10) + '" r="1.2" fill="#fff"/>');
    if (fx.includes('electric')) out.push('<g class="arc"><path d="M8 ' + (y - 4) + ' L15 ' + (y + 4) + ' L10 ' + (y + 8) + ' L18 ' + (y + 18) + '" fill="none" stroke="#bfeaff" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M92 ' + (y - 10) + ' L85 ' + (y - 2) + ' L91 ' + (y + 3) + ' L83 ' + (y + 12) + '" fill="none" stroke="#bfeaff" stroke-width="2.2" stroke-linejoin="round"/></g>');
    if (fx.includes('frost')) out.push('<g class="twinkle" stroke="#e8fbff" stroke-width="1.6" stroke-linecap="round">' + [[14, 30], [88, 64], [84, 20]].map(([x, yy]) => '<path d="M' + (x - 5) + ' ' + yy + ' H' + (x + 5) + ' M' + x + ' ' + (yy - 5) + ' V' + (yy + 5) + ' M' + (x - 3.5) + ' ' + (yy - 3.5) + ' L' + (x + 3.5) + ' ' + (yy + 3.5) + ' M' + (x + 3.5) + ' ' + (yy - 3.5) + ' L' + (x - 3.5) + ' ' + (yy + 3.5) + '"/>').join('') + '</g>');
    if (fx.includes('wings')) out.push('<path class="wing" d="M18 60 Q2 50 0 30 Q12 40 22 44 Q8 36 8 22 Q20 34 26 48Z" fill="' + (c.accent || '#ffc24b') + '"/><path class="wing w2" d="M82 60 Q98 50 100 30 Q88 40 78 44 Q92 36 92 22 Q80 34 74 48Z" fill="' + (c.accent || '#ffc24b') + '"/>');
    if (fx.includes('shine') && !c.neon) out.push('<ellipse cx="34" cy="' + (top + 12) + '" rx="8" ry="4.5" fill="#fff" opacity=".28" transform="rotate(-25 34 ' + (top + 12) + ')"/>');
    return out.join('');
  }

  const TOP = { round: 24, squircle: 24, cat: 27, bear: 25, panda: 25, bunny: 32, fox: 25, skull: 17, ghost: 19, robot: 27, alien: 26, slime: 28, pumpkin: 28, frog: 25, owl: 25, devil: 25, dragon: 25, cloud: 25, star: 14, octo: 20, penguin: 25, mushroom: 14 };

  /* Render a character as an inline SVG string. */
  function render(c, opts) {
    const o = opts || {};
    const F = c.neon ? 'fill="#140f2e" stroke="' + c.body + '" stroke-width="3.5"' : 'fill="' + c.body + '" stroke="#00000040" stroke-width="2"';
    const [h, fy] = head(c, F);
    const y = c.faceY || fy, my = y + (c.eyes === 'cyc' ? 20 : 16), top = TOP[c.head] || 24;
    const cls = 'chr' + (c.neon ? ' neon' : '') + (c.prism ? ' prism' : '') + (c.glitch ? ' glitch' : '') + (o.cls ? ' ' + o.cls : '');
    return '<svg class="' + cls + '" viewBox="-6 -14 112 114" style="--neon:' + c.body + '" aria-hidden="true">' +
      h + extras(c, y, top) +
      '<g class="face-n e-n">' + eyes(c, y) + '</g>' + moodEyes(c, y) +
      '<g class="m-n">' + mouth(c, my) + '</g>' + moodMouth(c, my) +
      hat(c, top) + '</svg>';
  }

  /* ---------- the roster ---------- */
  const R = (id, name, rarity, cost, p) => Object.assign({ id, name, rarity }, typeof cost === 'number' ? { price: cost } : { milestone: cost }, p);
  const W = (n) => ({ world: n });
  const ROSTER = [
    // common
    R('blob', 'Blob', 'common', 150, { head: 'round', body: '#ffd166', eyes: 'big', mouth: 'smile', fx: ['blush', 'shine'] }),
    R('mochi', 'Mochi', 'common', 150, { head: 'round', body: '#fff3f6', eyes: 'dot', mouth: 'cat', fx: ['blush', 'shine'] }),
    R('pebble', 'Pebble', 'common', 150, { head: 'squircle', body: '#9aa6c8', eyes: 'dot', mouth: 'flat', fx: ['spots', 'shine'] }),
    R('bubbles', 'Bubbles', 'common', 200, { head: 'round', body: '#5ec8ff', eyes: 'big', mouth: 'o', fx: ['shine', 'spots'] }),
    R('ducky', 'Ducky', 'common', 200, { head: 'round', body: '#ffe066', eyes: 'dot', mouth: 'beak', fx: ['blush', 'shine'] }),
    R('froggo', 'Froggo', 'common', 200, { head: 'frog', body: '#6dd56d', eyes: 'big', mouth: 'smile', fx: ['blush'] }),
    R('cub', 'Cub', 'common', 250, { head: 'bear', body: '#b9773a', accent: '#e8c49a', eyes: 'dot', mouth: 'smile', fx: ['shine'] }),
    R('bun', 'Bun', 'common', 250, { head: 'bunny', body: '#ffffff', eyes: 'big', mouth: 'cat', fx: ['blush'] }),
    R('kitty', 'Kitty', 'common', 250, { head: 'cat', body: '#ffad5c', eyes: 'cat', eyeColor: '#c8ff6b', mouth: 'cat', fx: ['whiskers', 'shine'] }),
    R('tabby', 'Tabby', 'common', 300, { head: 'cat', body: '#e8913a', eyes: 'cat', eyeColor: '#ffe066', mouth: 'cat', fx: ['stripes', 'whiskers'] }),
    R('panda', 'Panda', 'common', 300, { head: 'panda', body: '#ffffff', eyes: 'big', mouth: 'smile', fx: ['blush'] }),
    R('pengu', 'Pengu', 'common', 300, { head: 'penguin', body: '#2b3a55', accent: '#ffffff', eyes: 'dot', mouth: 'beak', fx: ['blush'] }),
    R('hoot', 'Hoot', 'common', 300, { head: 'owl', body: '#8a6a4a', accent: '#e8d2b0', eyes: 'big', mouth: 'beak' }),
    R('boo', 'Boo', 'common', 300, { head: 'ghost', body: '#f4f1ff', eyes: 'dot', mouth: 'open', fx: ['blush'] }),
    R('jack', 'Jack', 'common', 300, { head: 'pumpkin', body: '#ff8a1e', eyes: 'angry', line: '#3a1500', mouth: 'grin' }),
    R('goo', 'Goo', 'common', 300, { head: 'slime', body: '#7dff9a', eyes: 'big', mouth: 'tongue' }),
    R('puff', 'Puff', 'common', 300, { head: 'cloud', body: '#e8f6ff', eyes: 'dot', mouth: 'smile', fx: ['blush'] }),
    R('shroom', 'Shroom', 'common', 300, { head: 'mushroom', body: '#e53950', accent: '#fff1d6', eyes: 'dot', mouth: 'smile', fx: ['blush'] }),
    // rare
    R('smile', 'Smiley', 'rare', W(1), { head: 'round', body: '#ffc24b', eyes: 'dot', mouth: 'grin', fx: ['shine', 'blush'] }),
    R('sleepy', 'Sleepy', 'rare', 400, { head: 'round', body: '#c49bff', eyes: 'sleepy', mouth: 'o', hat: 'beanie', accent2: '#6e64a8' }),
    R('foxy', 'Foxy', 'rare', 500, { head: 'fox', body: '#ff7a3d', accent: '#fff4e6', eyes: 'cat', eyeColor: '#ffe066', mouth: 'smile', fx: ['shine'] }),
    R('robot', 'Robo', 'rare', 600, { head: 'robot', body: '#a8b8d8', accent: '#ff5c8a', eyes: 'visor', eyeColor: '#4fe3ff', mouth: 'zip' }),
    R('zorp', 'Zorp', 'rare', 600, { head: 'alien', body: '#8affc1', accent: '#ff5c8a', eyes: 'big', mouth: 'o', fx: ['spots'] }),
    R('cyclops', 'Cyclops', 'rare', 700, { head: 'round', body: '#9b6bff', eyes: 'cyc', mouth: 'smile', fx: ['shine'] }),
    R('nerdcat', 'Nerd Cat', 'rare', 700, { head: 'cat', body: '#d9d3ff', eyes: 'glasses', mouth: 'cat', fx: ['whiskers'] }),
    R('coolcat', 'Cool Cat', 'rare', 800, { head: 'cat', body: '#3a3a52', eyes: 'shades', line: '#fff', mouth: 'smile', fx: ['whiskers'] }),
    R('wizard', 'Wizzle', 'rare', 800, { head: 'round', body: '#ffe0c2', eyes: 'dot', mouth: 'stache', stache: '#eeeeee', hat: 'wizard' }),
    R('chef', 'Chef Bao', 'rare', 800, { head: 'round', body: '#ffd8b0', eyes: 'dot', mouth: 'stache', hat: 'chef', fx: ['blush'] }),
    R('pirate', 'Captain', 'rare', 900, { head: 'round', body: '#f0c39a', eyes: 'patch', mouth: 'smile', hat: 'bandana' }),
    R('partybear', 'Party Bear', 'rare', 900, { head: 'bear', body: '#ff9ec7', accent: '#ffd1e4', eyes: 'big', mouth: 'open', hat: 'party' }),
    R('dj', 'DJ Blip', 'rare', 900, { head: 'squircle', body: '#4fe3ff', eyes: 'shades', line: '#fff', mouth: 'smile', hat: 'phones', accent2: '#ff5c8a' }),
    R('beaniebun', 'Snow Bun', 'rare', 900, { head: 'bunny', body: '#e8f6ff', eyes: 'dot', mouth: 'cat', hat: 'beanie', accent2: '#4fe3ff', fx: ['blush'] }),
    R('angel', 'Angel', 'rare', 1000, { head: 'round', body: '#fff8e6', eyes: 'sleepy', mouth: 'smile', hat: 'halo', fx: ['blush'] }),
    R('imp', 'Imp', 'rare', 1000, { head: 'devil', body: '#ff5c5c', accent: '#2b1020', eyes: 'angry', mouth: 'fang' }),
    R('octo', 'Octo', 'rare', 1000, { head: 'octo', body: '#ff7aa8', eyes: 'big', mouth: 'o', fx: ['spots'] }),
    R('drake', 'Drake', 'rare', 1100, { head: 'dragon', body: '#5ccf8f', accent: '#ffe066', eyes: 'cat', eyeColor: '#ffb000', mouth: 'fang' }),
    R('stareyes', 'Star-struck', 'rare', W(3), { head: 'star', body: '#ffd166', eyes: 'star', eyeColor: '#ff5c8a', mouth: 'grin' }),
    R('skully', 'Skully', 'rare', 1100, { head: 'skull', body: '#f4f0e0', eyes: 'socket', eyeColor: '#4fe3ff', mouth: 'teeth' }),
    R('sugarskull', 'Sugar Skull', 'rare', 1200, { head: 'skull', body: '#ffffff', eyes: 'socket', eyeColor: '#ff5c8a', mouth: 'teeth', fx: ['sugar'] }),
    R('bones', 'Bones McGee', 'rare', 1200, { head: 'skull', body: '#efe6cc', eyes: 'socket', eyeColor: '#ffc24b', mouth: 'teeth', hat: 'bandana' }),
    // epic
    R('kingcat', 'King Cat', 'epic', 1500, { head: 'cat', body: '#ffad5c', eyes: 'cat', eyeColor: '#c8ff6b', mouth: 'cat', hat: 'crown', fx: ['whiskers', 'shine'] }),
    R('queencat', 'Queen Cat', 'epic', 1500, { head: 'cat', body: '#ffffff', eyes: 'cat', eyeColor: '#7fd6ff', mouth: 'cat', hat: 'tiara', fx: ['whiskers', 'blush'] }),
    R('skullking', 'Skull King', 'epic', 1800, { head: 'skull', body: '#f4f0e0', eyes: 'socket', eyeColor: '#ff3b5c', mouth: 'teeth', hat: 'crown' }),
    R('neonskull', 'Neon Skull', 'epic', 2000, { head: 'skull', body: '#4fe3ff', neon: true, eyes: 'socket', eyeColor: '#4fe3ff', line: '#4fe3ff', mouth: 'teeth' }),
    R('neonkitty', 'Neon Kitty', 'epic', 2000, { head: 'cat', body: '#ff5cf0', neon: true, eyes: 'cat', eyeColor: '#ff5cf0', line: '#140f2e', mouth: 'cat', fx: ['whiskers'] }),
    R('ghostking', 'Ghost King', 'epic', 1800, { head: 'ghost', body: '#e8e4ff', eyes: 'dot', mouth: 'open', hat: 'crown', fx: ['sparkle'] }),
    R('vamp', 'Count Fang', 'epic', 1800, { head: 'round', body: '#e8e0f0', eyes: 'angry', line: '#7a1030', mouth: 'fang', hat: 'top', accent2: '#7a1030', fx: ['cape'] }),
    R('zombie', 'Zed', 'epic', 1600, { head: 'round', body: '#9bc98a', eyes: 'zombie', mouth: 'zip', fx: ['stitch'] }),
    R('ninja', 'Ninja Nub', 'epic', 1600, { head: 'round', body: '#2b2b3b', eyes: 'angry', line: '#fff', mouth: 'flat', hat: 'band' }),
    R('astro', 'Astro', 'epic', 2000, { head: 'round', body: '#ffffff', eyes: 'big', mouth: 'smile', hat: 'helmet', fx: ['blush'] }),
    R('galaxyslime', 'Galaxy Goo', 'epic', 2200, { head: 'slime', body: '#6a3bd6', eyes: 'star', eyeColor: '#ffe066', mouth: 'grin', fx: ['galaxy', 'sparkle'] }),
    R('fireimp', 'Blaze', 'epic', 2200, { head: 'devil', body: '#ff3b2e', accent: '#ffc24b', eyes: 'angry', mouth: 'fang', hat: 'fire' }),
    // legendary
    R('neonking', 'Neon King Cat', 'legendary', 3500, { head: 'cat', body: '#4fe3ff', neon: true, eyes: 'cat', eyeColor: '#4fe3ff', line: '#140f2e', mouth: 'cat', hat: 'crown', crown: '#ffc24b', fx: ['whiskers', 'sparkle'], aura: 'synth' }),
    R('goldskull', 'Golden Skull', 'legendary', { allStars: true }, { head: 'skull', body: '#ffcf4d', eyes: 'socket', eyeColor: '#ffffff', mouth: 'teeth', hat: 'crown', crown: '#fff3c4', fx: ['sparkle'], aura: 'gold' }),
    R('royal', 'Royal Smiley', 'legendary', { allStars: true }, { head: 'round', body: '#ffc24b', eyes: 'star', eyeColor: '#fff3c4', mouth: 'grin', hat: 'crown', fx: ['sparkle'], aura: 'gold' }),
    R('shadowcat', 'Shadow Cat', 'legendary', W(6), { head: 'cat', body: '#1a1230', eyes: 'cat', eyeColor: '#ff3b5c', line: '#000', mouth: 'flat', fx: ['whiskers', 'sparkle'], aura: 'void' }),
    R('rainbowcat', 'Prism Cat', 'legendary', { streak: 7 }, { head: 'cat', body: '#ff8fb1', eyes: 'heart', eyeColor: '#ff3b8a', mouth: 'cat', hat: 'crown', fx: ['whiskers', 'sparkle', 'blush'], prism: true, aura: 'aurora' }),
    R('voidskull', 'Void Skull', 'legendary', W(5), { head: 'skull', body: '#b06bff', neon: true, eyes: 'socket', eyeColor: '#b06bff', line: '#b06bff', mouth: 'teeth', hat: 'horns', fx: ['sparkle'], aura: 'void' }),
    // legendary · each one brings an aura that changes the whole game's atmosphere
    R('stormcaller', 'Stormcaller', 'legendary', 4500, { head: 'dragon', body: '#2fd3ff', accent: '#bfeaff', neon: true, eyes: 'cat', eyeColor: '#ffe066', line: '#140f2e', mouth: 'fang', hat: 'bolt', fx: ['electric'], aura: 'storm' }),
    R('thunderskull', 'Thunder Skull', 'legendary', 4000, { head: 'skull', body: '#ffe066', neon: true, eyes: 'socket', eyeColor: '#ffffff', line: '#ffe066', mouth: 'teeth', hat: 'bolt', fx: ['electric'], aura: 'storm' }),
    R('phoenix', 'Phoenix', 'legendary', 4500, { head: 'owl', body: '#ff5a2e', accent: '#ffc24b', eyes: 'cat', eyeColor: '#fff3c4', mouth: 'beak', hat: 'fire', fx: ['wings', 'sparkle'], aura: 'inferno' }),
    R('dragonemperor', 'Dragon Emperor', 'legendary', 5000, { head: 'dragon', body: '#ffb000', accent: '#ff3b2e', eyes: 'angry', mouth: 'fang', hat: 'crown', fx: ['sparkle', 'shine'], aura: 'inferno' }),
    R('frostbite', 'Frostbite', 'legendary', 4500, { head: 'fox', body: '#dff6ff', accent: '#ffffff', eyes: 'cat', eyeColor: '#4fe3ff', mouth: 'smile', hat: 'crown', crown: '#bfe9ff', fx: ['frost', 'shine'], aura: 'frost' }),
    R('cosmo', 'Cosmo Owl', 'legendary', 4000, { head: 'owl', body: '#3b2a8f', accent: '#6a3bd6', eyes: 'star', eyeColor: '#ffe066', line: '#fff', mouth: 'beak', fx: ['galaxy', 'sparkle'], aura: 'cosmos' }),
    R('glitchcat', 'Glitch Cat', 'legendary', 4500, { head: 'cat', body: '#39ff8a', neon: true, eyes: 'visor', eyeColor: '#39ff8a', line: '#140f2e', mouth: 'flat', fx: ['whiskers'], glitch: true, aura: 'matrix' }),
    R('kitsune', 'Aurora Kitsune', 'legendary', 5000, { head: 'fox', body: '#9ef0ff', accent: '#ffffff', prism: true, eyes: 'cat', eyeColor: '#ff8fb1', mouth: 'cat', fx: ['sparkle', 'shine'], aura: 'aurora' }),
    R('sakura', 'Sakura Spirit', 'legendary', 3500, { head: 'bunny', body: '#ffd1e4', eyes: 'sleepy', mouth: 'cat', hat: 'flower', fx: ['blush', 'sparkle'], aura: 'sakura' }),
    R('midnightdj', 'Midnight DJ', 'legendary', 4000, { head: 'squircle', body: '#ff5cf0', neon: true, eyes: 'shades', line: '#fff', mouth: 'smile', hat: 'phones', accent2: '#4fe3ff', aura: 'synth' }),
  ];
  const AURAS = {
    storm: { name: 'Thunderstorm', desc: 'Rain, thunder and lightning that strikes your echoes as they move.' },
    inferno: { name: 'Inferno', desc: 'Rising embers; echoes burst into sparks when they step.' },
    frost: { name: 'Blizzard', desc: 'Snowfall drifts over the game; steps leave frost.' },
    cosmos: { name: 'Cosmos', desc: 'A twinkling starfield with shooting stars.' },
    matrix: { name: 'The Code', desc: 'Falling green code; everything glitches a little.' },
    aurora: { name: 'Aurora', desc: 'Northern lights wash over the sky.' },
    sakura: { name: 'Sakura', desc: 'Cherry blossom petals drift down.' },
    synth: { name: 'Synthwave', desc: 'Neon haze and a glowing retro horizon.' },
    gold: { name: 'Gold Rush', desc: 'Golden dust glitters everywhere.' },
    void: { name: 'The Void', desc: 'Light is slowly pulled toward the centre.' },
  };
  const RARITY = { common: { label: 'Common', color: '#9aa6c8' }, rare: { label: 'Rare', color: '#4fe3ff' }, epic: { label: 'Epic', color: '#c49bff' }, legendary: { label: 'Legendary', color: '#ffc24b' } };
  return { ROSTER, RARITY, AURAS, render };
});
