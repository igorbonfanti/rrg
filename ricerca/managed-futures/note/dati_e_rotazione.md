# Managed futures / trend following in the RRG app: free daily data, history, splicing and expected rotation behaviour

Method note: all Yahoo figures below come from live calls made on 2026-10-17 from this machine to `https://query2.finance.yahoo.com/v8/finance/chart/{T}?period1=0&period2=<now>&interval=1d&events=div|split` (the network works through the agent proxy; HTTP 200, plain `curl -A "Mozilla/5.0"`, no cookie/crumb needed). Raw JSON is saved in `/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/mf-data/daily/`, scripts in `/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/scripts/` (summ.py, ana.py, ana2.py, rrg.py). "Source" for these rows is the Yahoo endpoint URL itself, e.g. [Yahoo chart DBMF](https://query2.finance.yahoo.com/v8/finance/chart/DBMF?range=10y&interval=1d). Important technical detail: `range=max&interval=1d` silently returns MONTHLY bars for long histories (e.g. DBMF 390 rows, AQMIX 201 rows); use `period1=0&period2=<now>` (or `range=10y`) to get true daily bars.

## 1. The UCITS ETF iMGP DBi Managed Futures: tickers, Yahoo coverage, history, volume

### Takeaway
The UCITS fund exists on Yahoo, but NOT on Borsa Italiana: every `.MI` variant (DBMF.MI, DBMFE.MI, MFEH.MI) returns "Not Found". The best Yahoo series for an EUR app is **DBMFE.PA** (R EUR class, unhedged, Euronext Paris, daily since 2025-04-28, ~376 rows, about 18 months), far short of the 5+ years needed, so a proxy splice is unavoidable. The EUR-hedged class (MFEH.DE since 2026-05-13, MFEH.PA since 2026-09-25) has only weeks/months of history.

### Cited Findings
- Yahoo search for "iMGP DBi" returns these UCITS symbols: DBMFE.PA (R EUR), MFEH.PA (R EUR HP), DBMF.L and DBMG.L (R USD, LSE), DBMF.PA (R USD), DBMF.DE (R USD, Xetra); search for "iMGP DBi Managed Futures R EUR HP" also returns MFEH.DE and a Frankfurt fund line 0P0001QQRQ.F — [Yahoo search API](https://query2.finance.yahoo.com/v1/finance/search?q=iMGP%20DBi&quotesCount=25&newsCount=0)
- Yahoo ISIN search: LU2951555403 maps to DBMFE.PA; LU2951555585 maps to DBMF.PA — [Yahoo search API](https://query2.finance.yahoo.com/v1/finance/search?q=LU2951555403)
- Probed and NOT found on Yahoo ("No data found, symbol may be delisted"): DBMF.MI, DBMFE.MI, MFEH.MI, DBMFE.DE, DBMF.AS, DBMF.SW, DBMFE.SW, DBMFE.L, MFEH.L, MFEH.AS — [Yahoo chart API](https://query2.finance.yahoo.com/v8/finance/chart/DBMFE.MI?range=1mo&interval=1d)
- Measured on Yahoo (daily bars, first/last valid close, rows, average volume over last 60 sessions):

| Yahoo ticker | Class / ccy | First close | Last close | Rows | Avg vol (60d) | Notes |
|---|---|---|---|---|---|---|
| DBMFE.PA | R EUR, unhedged, EUR, Euronext Paris | 2025-04-28 | 2026-10-15 | 376 | ~12,100 sh | 28 of 375 days with unchanged close |
| DBMF.PA | R USD, USD, Paris | 2025-03-10 | 2026-10-15 | 409 | ~3,300 | 39 of 408 days unchanged close |
| DBMF.L | R USD, USD, LSE | 2025-04-24 | 2026-10-15 | 373 | ~1,600 | |
| DBMG.L | R USD class quoted in GBp, LSE | 2025-04-22 | 2026-10-15 | 375 | ~2,500 | GBp, not GBP |
| DBMF.DE | R USD, Xetra | 2026-09-22 | 2026-10-02 | 9 | ~150 | firstTradeDate 2026-07-17 but only 9 bars; unusable |
| MFEH.DE | R EUR HP (hedged), Xetra | 2026-05-13 | 2026-10-15 | 107 | ~1,370 | |
| MFEH.PA | R EUR HP, Paris | 2026-09-28 | 2026-10-15 | 14 | ~120 | |

  — [Yahoo chart API, e.g. DBMFE.PA](https://query2.finance.yahoo.com/v8/finance/chart/DBMFE.PA?range=10y&interval=1d)
- justETF: iMGP DBi Managed Futures Fund R EUR ETF, ISIN LU2951555403, EUR, **no currency hedging**, TER 0.75%, accumulating, launched 24 March 2025, fund size EUR 204m, synthetic (swap-based) replication, the only listing shown is Euronext Paris, ticker DBMFE (no Borsa Italiana, Xetra, LSE or SIX) — [justETF](https://www.justetf.com/it/etf-profile.html?isin=LU2951555403). Note: "swap-based" is justETF's classification; I could not verify it against the prospectus.
- An Italian KID for LU2951555403 is hosted by Fineco, which suggests the fund is distributed in Italy, but that alone does not prove a Borsa Italiana listing — [Fineco KID PDF](https://images.fineco.it/pvt/pdf/kid/IT/LU2951555403_20260212_IT_KID-UCITS.pdf)
- The R USD class ISIN is LU2951555585 (ticker DBMF, main exchange Euronext Paris, registered 07.03.2025) — [finanzfluss](https://www.finanzfluss.de/informer/etf/lu2951555403/); [onvista](https://www.onvista.de/etf/sparplan/IMGP-DBI-MANAGED-FUTURE-ETF-R-US-ETF-LU2951555585); Deutsche Börse welcomed iMGP as a new ETF issuer — [Deutsche Börse press release](https://www.cashmarket.deutsche-boerse.com/cash-en/Stay-Informed/newsroom/press-releases/Deutsche-B-rse-Welcomes-iM-Global-Partner-as-New-ETF-Issuer-4934364)
- The EUR-hedged class is ISIN LU3359622902, ticker MFEH (EUR), on Xetra from the 18 May 2026 new-listings notice; finanzen.net gives inception 13.05.2026 and SG CTA as benchmark — [Deutsche Börse listings 18 May 2026](https://www.cashmarket.deutsche-boerse.com/cash-en/Stay-Informed/newsroom/press-releases/New-ETF-and-ETP-Listings-on-May-18-2026-on-Deutsche-B-rse-5137378); [finanzen.net](https://www.finanzen.net/etf/imgp-dbi-managed-futures-r-hp-etf-lu3359622902)
- iMGP announced the Euronext Paris listing of the R EUR HP class (Bloomberg MFEH:FP) on 21 September 2026 — [RankiaPro](https://rankiapro.com/en/news/imgp-dbi-managed-futures-eur-hedged-etf-euronext-paris/) (only the title could be fetched directly; the details come from the search snippet). Reported AuM conflicts: RankiaPro cites USD 698m (18 Sep 2026), while Trackinsight shows fund AuM EUR 113m and share-class AuM EUR 11m, TER 0.75% — [Trackinsight](https://www.trackinsight.com/en/fund/MFEH/characteristics)
- Another UCITS managed-futures ETF now on Yahoo: BNP Paribas Easy – Managed Futures UCITS ETF EUR Capitalisation, EEAU.DE (from 2026-06-29, 79 rows, ~5,800 sh/day), FOLOW.PA (from 2026-07-13, 69 rows), FOLOW.SW (CHF, from 2026-06-22, 49 of the last 60 days with zero volume). EEAU.MI and FOLOW.MI do not exist on Yahoo — [Yahoo chart API EEAU.DE](https://query2.finance.yahoo.com/v8/finance/chart/EEAU.DE?range=1y&interval=1d)
- Quantica Managed Futures UCITS (I4C-C, CHF, 0P0001EFOO.SW): NAV-only fund line, daily since 2022-03-07, 1,042 rows, zero volume — [Yahoo chart API](https://query2.finance.yahoo.com/v8/finance/chart/0P0001EFOO.SW?range=5y&interval=1d)

### Inferences
- For the app the natural "live" ticker is **DBMFE.PA** (EUR, unhedged, the most liquid UCITS line on Yahoo). It fits the app's convention, since EUR ETFs already use exchange suffixes such as .DE/.PA/.AS, and needs no FX conversion. If the user prefers the hedged view, MFEH.DE has the most rows of the two hedged lines, but only about 5 months.
- Liquidity on Yahoo is thin (a few thousand shares a day; 7-10% of sessions on Paris have an unchanged close). That makes daily closes noisy, but for a WEEKLY RRG (last close of the week) it is acceptable.
- Euronext Paris and Borsa Italiana share almost all holidays, so DBMFE.PA aligns with the app's Borsa Italiana calendar with little forward-filling.

### Gaps
- I could not confirm from any primary source (Borsa Italiana ETFplus page, or the iMGP UCITS listing page) whether any class is or will be listed in Milan. No search result mentions a Borsa Italiana listing. The user should check borsaitaliana.it or their broker.
- The Yahoo volume figures are not NAV-based or consolidated-exchange numbers. Real liquidity, including market makers and RFQ, is likely higher.
- I did not find which index or strategy the BNP Paribas Easy Managed Futures UCITS ETF tracks.

## 2. US proxies and indices with longer history: Yahoo availability and first date

### Takeaway
The US ETF **DBMF** (daily since 2019-05-08, 1,872 rows, ~2.6m sh/day) is the cleanest proxy: it is the same strategy and manager as the UCITS fund, and after the warm-up it gives about 5.5 years of weekly RRG. For 10+ years the options are mutual-fund NAVs (AQMIX from 2010-01-05, ASFYX from 2010-08-03, PQTIX from 2014-01-06) or WTMF (2011). WTMF behaves differently (it was flat in 2022). The SG CTA and SG Trend indices are NOT on Yahoo, and their full history is no longer freely downloadable.

### Cited Findings
- Yahoo daily coverage measured on 2026-10-17 (adjclose present for all):

| Ticker | Name (Yahoo longName) | Type | First daily close | Rows | Avg vol 60d | 2022 return in EUR (adj, unhedged) | Weekly corr. with SWDA.MI in EUR, full / 2022 |
|---|---|---|---|---|---|---|---|
| DBMF | iMGP DBi Managed Futures Strategy ETF | ETF | 2019-05-08 | 1,872 | ~2.6m | +29.2% | 0.19 / -0.27 |
| KMLM | KraneShares Mount Lucas Managed Futures Index Strategy ETF | ETF | 2020-12-02 | 1,475 | ~370k | +32.0% | -0.12 / -0.29 |
| CTA | Simplify Managed Futures Strategy ETF | ETF | 2022-03-08 | 1,158 | ~630k | +11.7% (from Mar) | -0.06 / -0.18 |
| WTMF | WisdomTree Managed Futures Strategy Fund | ETF | 2011-01-05 | 3,969 | ~35k | -0.7% | 0.19 / 0.03 |
| FMF | First Trust Managed Futures Strategy Fund | ETF | 2013-08-02 | 3,322 | ~32k | +11.8% | 0.22 / -0.35 |
| AQMIX | AQR Managed Futures Strategy I | Mutual fund (NAV) | 2010-01-05 | 4,222 | 0 | +43.9% | 0.09 / -0.40 |
| QMHIX | AQR Managed Futures Strategy HV I | Mutual fund | 2013-07-16 | 3,335 | 0 | n/c | n/c |
| ASFYX | Virtus AlphaSimplex Mgd Futs Strat I | Mutual fund | 2010-08-03 | 4,077 | 0 | +44.1% | 0.18 / -0.38 |
| PQTIX | PIMCO TRENDS Fund Institutional | Mutual fund | 2014-01-06 | 3,215 | 0 | +18.6% | 0.01 / -0.41 |
| LCSIX | LoCorr Long/Short Commodity Strats I (not a pure CTA) | Mutual fund | 2012-01-17 | 3,710 | 0 | n/c | n/c |

  Other managed-futures tickers that exist on Yahoo: MFUT (from 2024-05-29), TFPN (2023-07-12), RSST (2023-09-06), RSBT (2023-02-08), CTAP (2025-12-10), FFUT (Fidelity) and HFMF (Unlimited) found by search. KMLMX, ^SGCTA, ^SGTREND and ^SGI do not exist. SWDA.MI 2022 = -13.7% — [Yahoo chart API, e.g. AQMIX](https://query2.finance.yahoo.com/v8/finance/chart/AQMIX?range=10y&interval=1d)
- Weekly return correlation between the proxies (USD, since 2021): DBMF–ASFYX 0.79, DBMF–AQMIX 0.67, DBMF–PQTIX 0.62, DBMF–KMLM 0.53, DBMF–WTMF 0.38; WTMF–AQMIX only 0.16 — computed from [Yahoo chart API](https://query2.finance.yahoo.com/v8/finance/chart/WTMF?range=10y&interval=1d)
- DBMF's model looks at the trailing 60-day performance of CTA hedge funds / the SG CTA index and builds a portfolio of liquid contracts that mimics the performance, not the positions. Sources differ on whether the reference is the SG CTA Index or the ~20 largest CTAs — [ETF Trends](https://www.etftrends.com/managed-futures-channel/etf-replication-revolution-managed-futures/); [ETF Trends, DBi on single-fund replication](https://www.etftrends.com/managed-futures-channel/dbi-talks-single-fund-replication/). It holds roughly 10-15 liquid futures, may put up to 20% in a Cayman subsidiary, costs 0.85% and rebalances weekly — [etfdb insight report](https://etfdb.com/fs-insight-reports/DBMF_insight_report.pdf); [TradingView symbol page, search snippet only, not scraped](https://www.tradingview.com/symbols/AMEX-DBMF)
- SG CTA Index: equal-weighted, net daily return of a pool of the largest CTAs open to new investment, reconstituted annually, Bloomberg NEIXCTA; +20.1% in 2022, its best year since 2000 — [Hedgeweek](https://www.hedgeweek.com/trend-followers-turn-leaders-ctas-deliver-record-returns-2022/); the SG CTA Trend sub-index follows trend-following managers in the same way — [BarclayHedge SG Trend page (now redirects to ionanalytics.com/barclayhedge)](https://www.barclayhedge.com/sg-prime-services-indices/sg-trend-index/)
- Data access for the SG indices: "The full index history was previously available through their webpage… only a fraction of the performance is available for download (~last year)", only monthly, "essentially restricted to clients". Suggested alternatives are NilssonHedge's own daily CTA indices (highly correlated with SG CTA, different composition) and Bloomberg — [NilssonHedge, Nov 2023](https://nilssonhedge.com/2023/11/19/access-to-this-security-is-restricted-by-its-supplier/)
- The SG Prime Services indices page returned HTTP 403 to my fetch — [SG Prime Services indices](https://wholesale.banking.societegenerale.com/en/prime-services-indices/)

### Inferences
- **Recommended proxy: DBMF (US) adjclose converted to EUR.** It gives weekly RRG from about Jan 2020 (data from May 2019 plus 39 weeks of warm-up for the 10/30/9 simple-average formula). That just meets the "5+ years" target and it is the same strategy as DBMFE.
- If 10+ years matter more than strategy identity: **ASFYX** (correlation 0.79 with DBMF, daily NAV since Aug 2010) or **AQMIX** (since Jan 2010). Both are NAV-only (zero volume), and their 2022 was stronger than DBMF's. Avoid WTMF as a "trend" proxy: it is a quant futures strategy whose 2022 was flat while CTAs had their best year.
- An SG index cannot be fed into a nightly Yahoo pipeline. It is not on Yahoo, and the free history is short and monthly at best.

### Gaps
- I did not verify whether BarclayHedge (now ION Analytics) still offers free monthly SG/Barclay CTA index downloads; the old URL redirects to a marketing page.
- NilssonHedge daily index access terms (free or paid, API) were not checked.
- Fees and expense ratios of the US mutual funds were not checked.

## 3. Splicing a proxy before the UCITS launch, and the caveats

### Takeaway
Chain-link US DBMF (adjclose ÷ EURUSD=X, forward-filled on the Milan calendar) up to 2025-04-28, then DBMFE.PA from that date (scale factor = DBMFE.PA ÷ DBMF→EUR on the splice day; this run gave 4.5255). Over the 76-week overlap, the RRG point of the spliced series differs from the pure-US proxy by on average 0.35 RS-Ratio points (max 0.72), but the quadrant differs in 18 of 76 weeks, because points near 100/100 flip easily. Hedged vs unhedged matters much more: an FX-free (USD-return) proxy and the EUR-converted proxy disagree on the quadrant in 65 of 352 weeks (18%), with a mean RS-Ratio gap of 1.7 points.

### Cited Findings (my computations on Yahoo data; scripts ana.py / ana2.py / rrg.py)
- DBMFE.PA behaves as an unhedged EUR class: weekly correlation 0.79 with DBMF.PA converted to EUR vs 0.72 with DBMF.PA in USD; monthly 0.93 vs EUR-converted. This is consistent with justETF's "no currency hedging" — [justETF](https://www.justetf.com/it/etf-profile.html?isin=LU2951555403); [Yahoo DBMFE.PA](https://query2.finance.yahoo.com/v8/finance/chart/DBMFE.PA?range=5y&interval=1d)
- UCITS R USD (DBMF.PA) vs US DBMF: monthly correlation 0.97, weekly only 0.77 (weekly tracking error ~0.9%), cumulative 2025-04-28 → 2026-10-15 +39.0% vs +37.9%. DBMF.L vs US DBMF: monthly 0.97 — [Yahoo DBMF.PA](https://query2.finance.yahoo.com/v8/finance/chart/DBMF.PA?range=5y&interval=1d)
- DBMFE.PA vs US DBMF→EUR: weekly correlation 0.51 (TE ~1.5% per week), daily only 0.30 (asynchronous closes: Paris 17:30 CET vs New York 22:00 CET), monthly 0.89. Cumulative over the same window +43.8% (DBMFE.PA) vs +39.7% (US DBMF→EUR). Individual months diverge by up to ~2.8 points (Oct 2025: +8.4% vs +5.3%; Nov 2025: -0.4% vs +1.7%) — [Yahoo DBMFE.PA](https://query2.finance.yahoo.com/v8/finance/chart/DBMFE.PA?range=5y&interval=1d); [Yahoo DBMF](https://query2.finance.yahoo.com/v8/finance/chart/DBMF?range=10y&interval=1d)
- FX has a big effect on the proxy: DBMF annual returns USD vs EUR-unhedged: 2020 +1.8% vs -7.3%; 2021 +11.5% vs +21.1%; 2022 +21.6% vs +29.2%; 2023 -8.7% vs -11.9%; 2024 +7.0% vs +13.5%; 2025 +13.8% vs +0.8%; 2026 YTD +17.6% vs +23.2% — [Yahoo EURUSD=X](https://query2.finance.yahoo.com/v8/finance/chart/EURUSD=X?range=10y&interval=1d)
- Fee difference: US DBMF 0.85% — [etfdb](https://etfdb.com/fs-insight-reports/DBMF_insight_report.pdf); UCITS R classes TER 0.75% — [justETF](https://www.justetf.com/it/etf-profile.html?isin=LU2951555403); [Trackinsight](https://www.trackinsight.com/en/fund/MFEH/characteristics)

### Inferences
- Recipe for the app: `proxy_EUR(d) = DBMF_adjclose(d) / EURUSD(d)` on the Milan calendar (the app already converts USD series). Then `series(d) = k · proxy_EUR(d)` for d < 2025-04-28 and `DBMFE.PA_adjclose(d)` afterwards, with k fixed on the splice date. To show the hedged class instead, use DBMF USD returns (no FX conversion) as the proxy and splice MFEH.DE from 2026-05-13. A hedged EUR class would also carry the EUR-USD interest-rate differential (hedging cost or carry), which a raw USD-return proxy ignores. That is roughly 1.5-2.5%/yr in 2023-2025; this is my estimate from rate levels, not measured.
- Caveats to show in the app's tooltip:
  - (a) pre-2025 history is a US '40-Act ETF, not the UCITS fund;
  - (b) the fee gap is 0.10%/yr, negligible for RRG;
  - (c) UCITS vs US differ in structure, and the UCITS replication is classified as swap-based by justETF, so small tracking differences exist;
  - (d) Paris prices are thin and sometimes stale, so monthly deviations of ±2-3 points vs NAV-implied returns occur;
  - (e) closing-time asynchrony with Milan is about 4.5h for the US proxy. It is harmless weekly but visible daily.
- Because RRG coordinates depend only on relative-strength ratios, the splice level factor k cancels out. What matters is the return path, so the splice adds no artefact beyond the return differences above.

### Gaps
- I did not obtain DBMFE's official daily NAV, so I cannot tell whether the monthly deviations of DBMFE.PA vs DBMF→EUR come from market-price noise (spread, stale quotes) or from genuine strategy differences between the UCITS and US vehicles.
- The UCITS prospectus (swap vs direct futures, collateral) was not read.

## 4. How a trend-following asset looks in an RRG against a balanced portfolio

### Takeaway
In the app's weekly RRG (simple formula: RS-Ratio = 100·SMA10/SMA30 of RS, RS-Momentum = 100·Ratio/SMA9(Ratio)), the DBMF splice (EUR) against the app's PTF rotates clockwise like any asset: 301 clockwise vs 49 counter-clockwise steps. It sits far from the centre: median distance 4.3 points, like CMOD (4.1) and above gold (3.3) or SWDA (1.4). It spends long spells in one quadrant (e.g. Leading through most of 2022, Lagging through most of 2023). Its RS-Ratio has essentially zero correlation with SWDA's (-0.06 vs PTF), and it sits on the opposite side of 100 from SWDA in 60% of weeks. The "crisis rotation" is visible: in March 2020, March and June 2022 and March 2026, DBMF was Leading while SWDA was Lagging.

### Cited Findings (computed from Yahoo data with PTF = 40 SWDA, 10 EIMI, 10 EM13, 10 EM710, 10 EM15, 10 SGLD, 5 IWDP, 3 CMOD, 2 BTC-EUR, monthly rebalanced, as in /home/user/rrg/universe.json; weekly RRG from 2020-01-24, 352 weeks)
- Quadrant time vs PTF: Lagging 108 weeks, Leading 101, Improving 98, Weakening 45 (Weakening is short-lived: trend-followers tend to drop from Leading straight through to Lagging when trends reverse). Vs SWDA: Lagging 127, Improving 105, Leading 86, Weakening 34. Vs XEON (cash): Leading 113, Weakening 108, Improving 66, Lagging 65 — [Yahoo data, rrg.py](https://query2.finance.yahoo.com/v8/finance/chart/DBMF?range=10y&interval=1d)
- Snapshots (RS-Ratio, RS-Momentum vs PTF; SWDA in brackets):
  - 2020-03-20: DBMF 102.1/102.3 Leading (SWDA 99.2/97.6 Lagging)
  - 2022-03-11: DBMF 104.7/102.8 Leading (SWDA Lagging)
  - 2022-06-17: DBMF **119.2**/103.6 Leading (SWDA 100.0/99.9 Lagging); this is the maximum distance, 19.8
  - 2023-03-17: DBMF 91.0/97.9 Lagging (SWDA Leading), after the March 2023 bond reversal
  - 2023-12-29: DBMF 96.8/94.9 Lagging
  - 2025-04-11 (tariff shock): DBMF 97.6/99.3 Lagging, alongside SWDA Lagging. Trend following did NOT help in this fast V-shaped shock.
  - 2026-03-27: DBMF 105.0/101.0 Leading (SWDA Lagging)
  - 2026-10-15: DBMF 101.9/101.6 Leading (SWDA 102.2/99.4 Weakening)
- Distance from the centre vs PTF (median / max, same 2020-2026 window): SWDA 1.44/5.7, EIMI 2.1/6.9, EM710 2.6/6.9, EM15 3.2/10.4, SGLD 3.3/13.2, CMOD 4.1/19.1, DBMF 4.3/19.8, BTC-EUR 13.5/71.5.
- Literature on the mechanism: Fidelity's decomposition finds that trend following's beta-timing component carries most of the risk and is more negatively correlated with equities, especially in months when stocks fall — [Fidelity Institutional](https://institutional.fidelity.ca/en/insights/trend-following-crisis-alpha/). PIMCO notes that managed futures aim for negative equity correlation and crisis alpha in sustained volatility, but not all funds react fast enough to sudden shocks — [Advisor Perspectives / PIMCO](https://www.advisorperspectives.com/commentaries/2021/06/21/pimco-trends-managed-futures-seeking-diversification-and-returns). Man AHL notes gains in 2000-03, 2008 and 2011 (manager commentary) — [The Hedge Fund Journal](https://thehedgefundjournal.com/man-ahl-marks-30-years/)
- StockCharts notes that the RS-Ratio has a built-in lag (it is itself a trend-following measure of relative strength) — [StockCharts RRG article, search snippet only, not scraped](https://my.stockcharts.com/articles/rrg/2018/06/combining-relative-rotation-graphs-and-the-turtle-soup-setup.html)

### Inferences
- Expect a "big, slow orbit": DBMF's tail is long and stays on one side for months. Because the asset itself lags trends (60-day replication window at DBMF), and RS-Ratio adds a further 10/30-week smoothing, the RRG will confirm the crisis benefit only after the move is under way. Sudden V-shaped shocks (Mar 2020 partially, Apr 2025 fully) can show it Lagging together with equities.
- Against PTF, which is 50% equity-heavy plus 30% euro govvies, DBMF's x-position tends to mirror SWDA's: when equities and bonds fall together (2022), it is far right; when trends reverse sharply (2023, early 2025), it drops to Lagging. Against XEON it spends most time in the right half (Leading or Weakening: 221 of 352 weeks), reflecting positive absolute excess return over cash in 2020-2026.
- Visual scale: DBMF at 119 RS-Ratio in mid-2022 would stretch the app's axes. Axis clipping or auto-scaling should be considered (BTC-EUR already dominates).
- Using the hedged vs unhedged series changes the picture materially (18% of weeks in a different quadrant). The label must say which one is used.

### Gaps
- I found no practitioner RRG published with managed futures/DBMF (StockCharts, Optuma or de Kempenaer posts); searches returned only generic RRG material. StockCharts and TradingView were not scraped, as instructed. The behaviour described here is therefore from my own computation, not from a published example.

## 5. NAV vs market price, distributions and adjusted close

### Takeaway
Use **adjclose**, never close, for US DBMF and all US proxies. DBMF pays a large annual December distribution, plus small quarterly ones since 2024. Raw close understates the 2019-2026 total return by about 69 points (+30.8% price vs +99.8% adjusted) and creates spurious -6% to -8.5% weekly drops. The UCITS DBMFE is accumulating, so no adjustment is needed there. The US mutual-fund proxies are NAV series (no market price, zero volume).

### Cited Findings
- DBMF distributions per Yahoo (ex-date, USD): 2019-12-27 2.29; 2021-12-30 2.677; 2022-12-28 2.247; 2023-12-27 0.75; 2024-12-27 0.841; 2025-12-30 1.168; and quarterly amounts of 0.12-0.25 since 2024 (e.g. 2026-03-30 0.119, 2026-06-29 0.153). Raw close fell -8.36% on 2019-12-27, -8.53% on 2021-12-30 and -6.41% on 2022-12-28, while adjclose on those days moved -0.16%, +1.04% and +0.85%. Cumulative 2019-05-08 → 2026-10-16: close +30.8%, adjclose +99.8% — [Yahoo chart DBMF with events=div](https://query2.finance.yahoo.com/v8/finance/chart/DBMF?range=10y&interval=1d&events=div)
- Other proxies also distribute heavily, often in December: KMLM 1.84 (2021), 2.48 (2022), 1.30 (2025); CTA pays monthly; WTMF had 5.21 in Oct 2021; AQMIX 1.11 and ASFYX 3.305 in Dec 2022 — [Yahoo chart API](https://query2.finance.yahoo.com/v8/finance/chart/ASFYX?range=10y&interval=1d&events=div)
- The UCITS R EUR class is accumulating — [justETF](https://www.justetf.com/it/etf-profile.html?isin=LU2951555403)
- Mutual-fund series on Yahoo (AQMIX, ASFYX, PQTIX, QMHIX, LCSIX, Quantica 0P…) have zero volume, i.e. NAV prints. They carry no intraday premium or discount but are struck at 16:00 ET — [Yahoo chart AQMIX](https://query2.finance.yahoo.com/v8/finance/chart/AQMIX?range=10y&interval=1d)

### Inferences
- If the app's pipeline reads `indicators.quote[0].close`, it must switch to `indicators.adjclose[0].adjclose` for DBMF/KMLM/ASFYX etc. Otherwise the December ex-dates produce artificial RS drops large enough to push the point a full quadrant. Yahoo's adjclose is back-adjusted, so history changes after each new distribution; this is harmless for RRG because RRG uses ratios.
- The UCITS market price on Paris can deviate from NAV (thin trading, stale closes in 7-10% of sessions). For a weekly RRG this is minor, but DBMFE.PA's weekly noise vs DBMF→EUR (TE ~1.5%/week) is larger than SWDA's vs its index would be.

### Gaps
- I did not compare against official NAV files from iMGP (UCITS) to quantify the premium/discount on DBMFE.PA. The imgpfunds.com US page now redirects to imgp.com/us and was not fetched.
- I could not find the DBMF prospectus to confirm the official distribution policy. I report only the observed Yahoo distribution history.
