// engine.js — pure calculation core for the revenue & profit model.
// No DOM. Exported for the browser (window) and Node (module.exports) so the
// exact same math can be unit-tested headlessly.
(function (root) {
  "use strict";

  function computeChannel(c, target, blended) {
    var net = c.grossPrice * (1 - c.discountPct);
    var sellCost = net * c.sellingPct;          // cost-to-serve, % of net
    var variable = c.cogs + sellCost;           // variable cost / case
    var contribution = net - variable;          // contribution margin / case
    return {
      name: c.name,
      grossPrice: c.grossPrice,
      netPrice: net,
      cogs: c.cogs,
      sellCost: sellCost,
      contribution: contribution,
      contribMarginPct: net > 0 ? contribution / net : 0,
      mixN: 0, cases: 0, gross: 0, net: 0, cogsTot: 0, sellTot: 0, contribTot: 0
    };
  }

  // Solve the whole model from a GROSS revenue target.
  function compute(state) {
    var ch = state.channels.map(function (c) { return computeChannel(c, state.revenueTarget); });
    var sumMix = state.channels.reduce(function (s, c) { return s + c.mix; }, 0) || 1;

    var blendedGross = 0, blendedNet = 0, blendedContrib = 0, blendedCogs = 0;
    ch.forEach(function (r, i) {
      r.mixN = state.channels[i].mix / sumMix;
      blendedGross += r.grossPrice * r.mixN;
      blendedNet += r.netPrice * r.mixN;
      blendedContrib += r.contribution * r.mixN;
      blendedCogs += r.cogs * r.mixN;
    });

    var totalCases = blendedGross > 0 ? state.revenueTarget / blendedGross : 0;

    ch.forEach(function (r) {
      r.cases = totalCases * r.mixN;
      r.gross = r.cases * r.grossPrice;
      r.net = r.cases * r.netPrice;
      r.cogsTot = r.cases * r.cogs;
      r.sellTot = r.cases * r.sellCost;
      r.contribTot = r.cases * r.contribution;
    });

    var grossTot = ch.reduce(function (s, r) { return s + r.gross; }, 0);
    var netTot = ch.reduce(function (s, r) { return s + r.net; }, 0);
    var cogsTot = ch.reduce(function (s, r) { return s + r.cogsTot; }, 0);
    var sellTot = ch.reduce(function (s, r) { return s + r.sellTot; }, 0);
    var contribTot = ch.reduce(function (s, r) { return s + r.contribTot; }, 0);
    var opProfit = contribTot - state.fixedCosts;

    var breakEvenCases = blendedContrib > 0 ? state.fixedCosts / blendedContrib : Infinity;
    var breakEvenRev = breakEvenCases * blendedGross;

    // waterfall (gross -> operating profit), each bar {label, lo, hi, val, kind}
    var wf = [];
    (function () {
      var run = 0, bars = [];
      function total(label, v, kind) { bars.push({ label: label, lo: Math.min(0, v), hi: Math.max(0, v), val: v, kind: kind }); run = v; }
      function step(label, delta, kind) { var lo = Math.min(run, run + delta), hi = Math.max(run, run + delta); bars.push({ label: label, lo: lo, hi: hi, val: delta, kind: kind }); run += delta; }
      total("Gross", grossTot, "gross");
      step("Trade disc.", -(grossTot - netTot), "sub");
      total("Net", netTot, "net");
      step("COGS", -cogsTot, "sub");
      step("Selling", -sellTot, "sub");
      total("Contribution", contribTot, "contrib");
      step("Fixed", -state.fixedCosts, "sub");
      total("Op. profit", opProfit, opProfit >= 0 ? "profit" : "loss");
      wf = bars;
    })();

    // scenarios: each target -> outcomes, sharing channel economics
    var scenarios = state.scenarios.map(function (s) {
      var cases = blendedGross > 0 ? s.target / blendedGross : 0;
      var net = cases * blendedNet;
      var contribution = cases * blendedContrib;
      var profit = contribution - state.fixedCosts;
      return {
        label: s.label, target: s.target, cases: cases, net: net,
        contribution: contribution, opProfit: profit,
        margin: net > 0 ? contribution / net : 0, profitMargin: net > 0 ? profit / net : 0
      };
    });

    // multi-year projection at constant economics
    var years = [], g = state.growthRate;
    for (var y = 0; y < state.projectionYears; y++) {
      var rev = state.revenueTarget * Math.pow(1 + g, y);
      var cs = blendedGross > 0 ? rev / blendedGross : 0;
      var contribution = cs * blendedContrib;
      years.push({ year: y + 1, revenue: rev, cases: cs, contribution: contribution, opProfit: contribution - state.fixedCosts });
    }

    // monthly spread with seasonality
    var sumW = state.seasonality.reduce(function (s, w) { return s + w; }, 0) || 1;
    var months = state.seasonality.map(function (w, i) {
      var f = w / sumW;
      return { i: i, frac: f, cases: totalCases * f, gross: grossTot * f, contribution: contribTot * f };
    });
    var cumC = 0, cumR = 0;
    months.forEach(function (m) { cumC += m.cases; cumR += m.gross; m.cumCases = cumC; m.cumRev = cumR; });

    return {
      channels: ch, sumMix: sumMix,
      blendedGross: blendedGross, blendedNet: blendedNet, blendedContrib: blendedContrib, blendedCogs: blendedCogs,
      totalCases: totalCases,
      grossTot: grossTot, netTot: netTot, cogsTot: cogsTot, sellTot: sellTot, contribTot: contribTot,
      opProfit: opProfit, opMargin: netTot > 0 ? opProfit / netTot : 0,
      contribMargin: netTot > 0 ? contribTot / netTot : 0,
      breakEvenCases: breakEvenCases, breakEvenRev: breakEvenRev,
      waterfall: wf, scenarios: scenarios, years: years, months: months
    };
  }

  root.RevenueEngine = { compute: compute, computeChannel: computeChannel };
  if (typeof module !== "undefined" && module.exports) module.exports = root.RevenueEngine;
})(typeof window !== "undefined" ? window : globalThis);
