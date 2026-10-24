/*
 * illustrations.js — A small library of flat, muted, single-subject SVGs.
 *
 * Every drawing is deliberately simple: one subject, no background, rounded
 * forms, low-saturation colours drawn from the garden palette. No gradients,
 * no fine detail, no visual noise. viewBox is a uniform 0 0 100 100 so any
 * icon can be dropped into any card slot and scale identically.
 *
 * Shapes carry class="shape-fill" on their body so the CSS can render them as
 * a filled shape OR as an outline (for the shape-to-outline task) with no
 * separate asset.
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};

  var P = {
    sage: '#a7c4a0', sageDeep: '#8bab86', sand: '#d8cbb2', sandDeep: '#c3b394',
    sky: '#a9c8d6', skyDeep: '#8bb3c6', lav: '#c6bade', lavDeep: '#a99ecb',
    terra: '#cf9b8f', gold: '#dcc98a', ink: '#5a6b5f', cream: '#f2ede2', brown: '#b9a184'
  };

  // Each value is the inner markup of an SVG (no <svg> wrapper).
  var G = {
    // ---- Concrete objects ----
    tao: // apple
      '<path d="M50 30c-6-10-24-9-27 3-4 14 9 32 27 40 18-8 31-26 27-40-3-12-21-13-27-3Z" fill="' + P.terra + '"/>' +
      '<path d="M50 30c0-8 4-13 10-15" fill="none" stroke="' + P.sageDeep + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M52 22c6-6 14-6 16-2-2 6-10 8-16 2Z" fill="' + P.sage + '"/>',
    ca: // fish
      '<path d="M20 50c14-18 44-18 56 0-12 18-42 18-56 0Z" fill="' + P.sky + '"/>' +
      '<path d="M76 50 92 38v24Z" fill="' + P.skyDeep + '"/>' +
      '<circle cx="34" cy="47" r="4" fill="' + P.ink + '"/>',
    meo: // cat
      '<circle cx="50" cy="56" r="26" fill="' + P.sand + '"/>' +
      '<path d="M30 40 26 22 44 34Z" fill="' + P.sand + '"/><path d="M70 40 74 22 56 34Z" fill="' + P.sand + '"/>' +
      '<circle cx="41" cy="54" r="3.5" fill="' + P.ink + '"/><circle cx="59" cy="54" r="3.5" fill="' + P.ink + '"/>' +
      '<path d="M46 63h8l-4 4Z" fill="' + P.terra + '"/>',
    cho: // dog
      '<circle cx="50" cy="56" r="25" fill="' + P.brown + '"/>' +
      '<path d="M26 40c-8 2-10 16-2 22 4-6 6-16 2-22Z" fill="' + P.sandDeep + '"/>' +
      '<path d="M74 40c8 2 10 16 2 22-4-6-6-16-2-22Z" fill="' + P.sandDeep + '"/>' +
      '<circle cx="42" cy="54" r="3.5" fill="' + P.ink + '"/><circle cx="58" cy="54" r="3.5" fill="' + P.ink + '"/>' +
      '<ellipse cx="50" cy="64" rx="5" ry="4" fill="' + P.ink + '"/>',
    hoa: // flower
      '<circle cx="50" cy="50" r="11" fill="' + P.gold + '"/>' +
      petals(P.lav) ,
    xe: // car
      '<path d="M18 58c0-4 3-7 7-7l8-12c2-3 5-4 8-4h20c4 0 7 2 9 5l6 11h2c4 0 7 3 7 7v8H18Z" fill="' + P.sky + '"/>' +
      '<circle cx="34" cy="70" r="8" fill="' + P.ink + '"/><circle cx="68" cy="70" r="8" fill="' + P.ink + '"/>' +
      '<path d="M40 40h16l4 10H38Z" fill="' + P.cream + '"/>',
    sao: // star
      star(P.gold),
    bong: // ball
      '<circle cx="50" cy="52" r="26" fill="' + P.sage + '"/>' +
      '<path d="M24 52h52M50 26v52" stroke="' + P.cream + '" stroke-width="4"/>',
    la: // leaf
      '<path d="M50 20c18 6 26 34 8 56-22-14-24-42-8-56Z" fill="' + P.sage + '"/>' +
      '<path d="M50 26c0 30-2 40 2 48" stroke="' + P.sageDeep + '" stroke-width="3" fill="none"/>',
    vit: // duck
      '<circle cx="44" cy="52" r="22" fill="' + P.gold + '"/>' +
      '<circle cx="62" cy="38" r="12" fill="' + P.gold + '"/>' +
      '<circle cx="64" cy="35" r="2.6" fill="' + P.ink + '"/>' +
      '<path d="M72 40h12l-4 5h-8Z" fill="' + P.terra + '"/>',
    chim: // bird
      '<circle cx="46" cy="52" r="20" fill="' + P.sky + '"/>' +
      '<circle cx="64" cy="42" r="11" fill="' + P.sky + '"/>' +
      '<circle cx="66" cy="40" r="2.4" fill="' + P.ink + '"/>' +
      '<path d="M74 44h10l-6 5Z" fill="' + P.gold + '"/>' +
      '<path d="M40 52c-10-2-16 2-20 8 8 2 16 0 20-4Z" fill="' + P.skyDeep + '"/>',
    buom: // butterfly
      '<ellipse cx="36" cy="40" rx="16" ry="14" fill="' + P.lav + '"/>' +
      '<ellipse cx="64" cy="40" rx="16" ry="14" fill="' + P.lav + '"/>' +
      '<ellipse cx="38" cy="62" rx="12" ry="11" fill="' + P.lavDeep + '"/>' +
      '<ellipse cx="62" cy="62" rx="12" ry="11" fill="' + P.lavDeep + '"/>' +
      '<rect x="47" y="34" width="6" height="36" rx="3" fill="' + P.ink + '"/>',
    ga: // chicken
      '<circle cx="50" cy="56" r="20" fill="' + P.cream + '"/>' +
      '<circle cx="50" cy="36" r="12" fill="' + P.cream + '"/>' +
      '<path d="M50 22c2-6 8-6 8-1 0 4-4 6-8 1Z" fill="' + P.terra + '"/>' +
      '<circle cx="52" cy="34" r="2.4" fill="' + P.ink + '"/>' +
      '<path d="M60 38h9l-5 4Z" fill="' + P.gold + '"/>',
    bo: // cow
      '<ellipse cx="50" cy="56" rx="26" ry="20" fill="' + P.cream + '"/>' +
      '<circle cx="50" cy="40" r="14" fill="' + P.cream + '"/>' +
      '<path d="M38 30c-6-4-8-2-6 4M62 30c6-4 8-2 6 4" stroke="' + P.sandDeep + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="45" cy="40" r="2.6" fill="' + P.ink + '"/><circle cx="55" cy="40" r="2.6" fill="' + P.ink + '"/>' +
      '<ellipse cx="66" cy="60" rx="7" ry="6" fill="' + P.sand + '"/><ellipse cx="38" cy="66" rx="6" ry="5" fill="' + P.sand + '"/>',
    rua: // turtle (companion)
      '<ellipse cx="50" cy="56" rx="26" ry="18" fill="' + P.sageDeep + '"/>' +
      '<ellipse cx="50" cy="54" rx="20" ry="13" fill="' + P.sage + '"/>' +
      '<circle cx="78" cy="52" r="8" fill="' + P.sageDeep + '"/>' +
      '<circle cx="80" cy="50" r="2.2" fill="' + P.ink + '"/>' +
      '<rect x="30" y="68" width="9" height="8" rx="4" fill="' + P.sageDeep + '"/><rect x="60" y="68" width="9" height="8" rx="4" fill="' + P.sageDeep + '"/>' +
      '<path d="M42 50l8-6 8 6-3 9h-10Z" fill="' + P.cream + '"/>',
    tho: // rabbit
      '<circle cx="50" cy="58" r="20" fill="' + P.cream + '"/>' +
      '<ellipse cx="42" cy="30" rx="6" ry="16" fill="' + P.cream + '"/><ellipse cx="58" cy="30" rx="6" ry="16" fill="' + P.cream + '"/>' +
      '<ellipse cx="42" cy="32" rx="3" ry="10" fill="' + P.lav + '"/><ellipse cx="58" cy="32" rx="3" ry="10" fill="' + P.lav + '"/>' +
      '<circle cx="44" cy="56" r="2.6" fill="' + P.ink + '"/><circle cx="56" cy="56" r="2.6" fill="' + P.ink + '"/>' +
      '<path d="M47 63h6l-3 3Z" fill="' + P.terra + '"/>',
    gau: // bear
      '<circle cx="50" cy="56" r="24" fill="' + P.brown + '"/>' +
      '<circle cx="32" cy="34" r="9" fill="' + P.brown + '"/><circle cx="68" cy="34" r="9" fill="' + P.brown + '"/>' +
      '<circle cx="42" cy="52" r="3" fill="' + P.ink + '"/><circle cx="58" cy="52" r="3" fill="' + P.ink + '"/>' +
      '<ellipse cx="50" cy="62" rx="9" ry="7" fill="' + P.sand + '"/><circle cx="50" cy="60" r="2.8" fill="' + P.ink + '"/>',
    cao: // fox
      '<path d="M26 40 34 60 50 74 66 60 74 40 56 48 50 44 44 48Z" fill="' + P.terra + '"/>' +
      '<path d="M26 40 40 52 34 60Z" fill="' + P.sand + '"/><path d="M74 40 60 52 66 60Z" fill="' + P.sand + '"/>' +
      '<circle cx="43" cy="54" r="2.6" fill="' + P.ink + '"/><circle cx="57" cy="54" r="2.6" fill="' + P.ink + '"/>' +
      '<path d="M50 62l-4-4h8Z" fill="' + P.ink + '"/>',

    // ---- Shapes (filled OR outline via .shape-fill) ----
    tron: '<circle class="shape-fill" cx="50" cy="50" r="30" fill="' + P.sky + '"/>',
    vuong: '<rect class="shape-fill" x="22" y="22" width="56" height="56" rx="8" fill="' + P.sage + '"/>',
    tamgiac: '<path class="shape-fill" d="M50 20 80 76H20Z" fill="' + P.terra + '"/>',
    chunhat: '<rect class="shape-fill" x="16" y="32" width="68" height="36" rx="7" fill="' + P.lav + '"/>',
    ngoisao: '<g class="shape-fill">' + star(P.gold) + '</g>',

    // ---- Task cue icons (First→Then strip, compare, sound) ----
    more: '<rect x="24" y="30" width="14" height="44" rx="5" fill="' + P.sageDeep + '"/>' +
          '<rect x="62" y="54" width="14" height="20" rx="5" fill="' + P.sand + '"/>' +
          '<circle cx="31" cy="22" r="6" fill="' + P.sageDeep + '"/>',
    fewer: '<rect x="24" y="54" width="14" height="20" rx="5" fill="' + P.sand + '"/>' +
           '<rect x="62" y="30" width="14" height="44" rx="5" fill="' + P.sageDeep + '"/>' +
           '<circle cx="31" cy="46" r="6" fill="' + P.sand + '"/>',
    plus1: '<circle cx="50" cy="50" r="30" fill="' + P.sage + '"/>' +
           '<path d="M50 34v32M34 50h32" stroke="' + P.cream + '" stroke-width="8" stroke-linecap="round"/>',
    ear: '<path d="M38 30c14-8 30 2 28 18-2 12-14 12-14 22 0 6-6 10-12 6" fill="none" stroke="' + P.skyDeep + '" stroke-width="7" stroke-linecap="round"/>' +
         '<path d="M70 34c8 6 8 26 0 32M78 28c12 10 12 34 0 44" fill="none" stroke="' + P.sky + '" stroke-width="6" stroke-linecap="round"/>',

    // ---- Numeral / letter badge icons for the First→Then strip ----
    num3: numBadge('3', P.lav), num5: numBadge('5', P.sky), num10: numBadge('10', P.sage),
    letterA: numBadge('A', P.terra),

    // ---- Small decorative sprout used with praise ----
    sprout: '<path d="M50 78V46" stroke="' + P.sageDeep + '" stroke-width="6" stroke-linecap="round"/>' +
            '<path d="M50 52c-12 0-18-8-18-16 10 0 18 6 18 16Z" fill="' + P.sage + '"/>' +
            '<path d="M50 46c10-2 16-10 16-18-8 0-16 6-16 18Z" fill="' + P.sageDeep + '"/>'
  };

  function petals(color) {
    var out = '';
    for (var i = 0; i < 6; i++) {
      var a = (i * 60) * Math.PI / 180;
      var cx = 50 + Math.cos(a) * 18, cy = 50 + Math.sin(a) * 18;
      out += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="10" fill="' + color + '"/>';
    }
    return out;
  }
  function star(color) {
    var pts = [], i;
    for (i = 0; i < 10; i++) {
      var a = (-90 + i * 36) * Math.PI / 180;
      var r = i % 2 === 0 ? 30 : 13;
      pts.push((50 + Math.cos(a) * r).toFixed(1) + ',' + (50 + Math.sin(a) * r).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + color + '"/>';
  }
  function numBadge(text, color) {
    return '<rect x="14" y="14" width="72" height="72" rx="20" fill="' + color + '"/>' +
      '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" ' +
      'font-family="Baloo 2, Nunito, sans-serif" font-weight="700" font-size="' +
      (text.length > 1 ? 34 : 46) + '" fill="' + P.cream + '">' + text + '</text>';
  }

  // Public: return a full <svg> string for a key, or a neutral dot if missing.
  VLA.svg = function (key) {
    var inner = G[key];
    if (!inner) inner = '<circle cx="50" cy="50" r="26" fill="' + P.sand + '"/>';
    return '<svg viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false" ' +
      'xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  };
  VLA.svgKeys = Object.keys(G);
  VLA.palette = P;
})();
