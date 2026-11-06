# Managed futures / trend following (CTA): historical and academic evidence as a portfolio component

Notes compiled 17 Oct 2026. Every figure is dated and sourced. Index naming matters:
- **SG CTA Index**: about 20 of the largest CTAs, mixed styles, equal-weighted, net of fees, rebalanced every 1 January.
- **SG Trend Index**: the trend-following subset of the SG CTA Index, about 10 managers, net of fees.
- **BTOP50**: BarclayHedge's index of the largest investable CTAs.
- **Barclay CTA Index**: BarclayHedge's broad CTA index.
- **Simulated TSMOM (AQR)**: a hypothetical backtest, not a fund or index.

Do not mix these series. The definitions come from the [iMGP DBMF Q2 2026 deck](https://www.imgp.com/wp-content/uploads/2026/03/DBMF-Quarterly-Deck.pdf) and from [Hedgeweek, 2020 year-end](https://www.hedgeweek.com/ctas-rise-best-monthly-gain-five-years-managed-futures-hedge-funds-end-2020/), which describes the SG CTA Index as "a select pool of 20 of the largest managed futures strategies".

---

## 1. What the long-horizon studies show (AQR, MOP 2012, Trends Everywhere, Baltas & Kosowski, Greyserman & Kaminski); crisis alpha and the "smile"

### Takeaway
Simulated trend following (time-series momentum, TSMOM) made positive returns in every decade since 1880. Its correlation with both US equities and US 10-year bonds was about zero, and it was positive in 8 of the 10 worst 60/40 drawdowns.

Two qualifications matter:
- **Fees and costs.** Net of 2/20 fees and costs, the excess return is less than half the gross excess return.
- **Recent decay.** Returns faded sharply after 2009: the net Sharpe ratio was 0.41 in 2010–2016, against 0.76 over the full history.

The "smile" (convexity) means returns are best in extreme equity years, both up and down. "Crisis alpha" is the label for the excess return earned in down-market events.

### Cited Findings

**Hurst, Ooi & Pedersen, "A Century of Evidence on Trend-Following Investing" (AQR; this version covers Jan 1880–Dec 2016)**

All figures below come from the [AQR paper, 1880–2016 version](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf).

- **Method.** The strategy combines 1-, 3- and 12-month TSMOM signals. Each market's position is sized to the same volatility, and the portfolio targets 10% annualized volatility. The authors subtract simulated transaction costs and a hypothetical 2% management fee plus a 20% performance fee with a high-water mark. They note that some managers charged more in earlier periods and some charge less today.
- **Full sample, Exhibit 1 (1880–2016).** All returns are annualized excess returns over cash.
  - Gross of fees and costs: **18.0%**.
  - Net of costs, before fees: **11.0%**.
  - Net of 2/20 fees and costs: **7.3%**.
  - Realized volatility **9.7%**; net Sharpe **0.76**.
  - Correlation with US equities **-0.01**; with US 10-year bonds **-0.03**.
- **By decade, Exhibit 1.** The net-of-fee excess return was positive in every decade. The weakest decades were:
  - 1880s: 2.6% net, Sharpe 0.27.
  - 1910s: 1.6% net, Sharpe 0.13.

**AQR Exhibit 1, most recent decades (excess returns over cash; correlations are with US equities and US 10-year bonds)**

| Period | Gross excess | Net of costs | Net of 2/20 | Volatility | Net Sharpe | Corr. equities | Corr. bonds |
|---|---|---|---|---|---|---|---|
| 1970s | 27.4% | 20.5% | 15.1% | 8.9% | 1.70 | -0.24 | -0.25 |
| 1980s | 20.1% | 13.3% | 9.1% | 9.4% | 0.96 | 0.18 | -0.16 |
| 1990s | 16.8% | 12.3% | 8.3% | 8.4% | 0.98 | 0.01 | 0.21 |
| 2000s | 11.6% | 9.9% | 6.3% | 10.3% | 0.61 | -0.34 | 0.27 |
| 2010–2016 | 7.6% | 6.2% | 3.3% | 8.1% | 0.41 | -0.15 | 0.28 |

- **Signal speed, Exhibit 2 (gross Sharpe ratios).**
  - In 2010–2016 the gross Sharpe ratio was 0.06 for the 1-month signal, 0.30 for 3-month and 0.73 for 12-month. Over the same period, the one-month-lagged versions scored 0.13, 0.33 and 0.70.
  - In the 1940s the figures were 2.16 for 1-month, 1.65 for 3-month and 1.54 for 12-month.
  - So the fast signals decayed most after 2009.
  - Lagging the signal by one month hurts performance "especially for the shorter-term signals".
- **Across markets.** The average Sharpe ratio per individual market is about 0.4 (gross), for 1880–2016.
- **Crisis behaviour.** The strategy was positive in **8 of 10** of the largest 60/40 drawdowns between 1880 and 2016 (Exhibit 6). The returns per episode are shown only in the chart, not as numbers in the text.
- **The "smile".** Exhibit 5 plots annual TSMOM returns against US equity returns for 1880–2016 and fits a second-order polynomial. Trend did "particularly well in extreme up or down years for the stock market".
  - In bear markets (US equity drawdown above 20%), TSMOM earned **15.5%** excess return, against **10.2%** in bull markets.
  - The difference has a t-statistic of 1.9, which is only marginally significant. The authors say "the more robust result is the smile curve".
- **Portfolio effect, Exhibit 7 (1880–2016).**
  - The 60/40 portfolio alone: excess return 4.1%, volatility 10.7%, maximum drawdown **-62.3%**, Sharpe 0.39.
  - 80% in 60/40 plus 20% in TSMOM (net of fees): excess return 4.8%, volatility 8.7%, maximum drawdown **-50.2%**, Sharpe 0.55.
- **The strategy's own drawdowns, Exhibit 8.** The 10 largest drawdowns range from -14.1% to **-24.7%** (Aug 1947 – Dec 1948, with 26 months to recover).
  - The drawdown that started in **Mar 2015** had reached **-16.1%** by May 2016 and was still not recovered when the sample ended in Dec 2016.
  - These drawdowns are computed gross of fees.
  - Stress periods for the strategy coincide with "sharp reversals across multiple markets" or "prolonged periods where many markets exhibit a lack of clear trends".
- **Regimes, Exhibits 9 and 10.**
  - Performance is similar in recessions and booms, at 10.4% and 11.2% excess return.
  - It is also similar in low and high inflation, at 10.5% and 11.5%.
  - **High cross-market correlation hurts.** In the lowest quintile of average absolute pairwise correlation the excess return was 17.1% (Sharpe 1.54). In the highest quintile it was 8.0% (Sharpe 0.67).
  - Correlations "increased meaningfully from late 2008 until the middle of 2014" (risk-on/risk-off). This is one explanation for the post-GFC weakness.
  - T-bill yield quintiles show no monotonic pattern: Sharpe 1.10, 0.94, 0.79, 1.10 and 1.13 from the lowest quintile to the highest.

**AQR, "You Can't Always Trend When You Want" (Babu, Levine, Ooi, Schroeder & Stamelos, JPM, 31 Mar 2020)**
- The authors attribute the weak returns of 2010–2019 mainly to **fewer large market moves** across global markets. They do not attribute it to a decline in trend following's ability to turn trends into profits.
- They reject a lack of diversification as an explanation and find "little evidence of a permanent structural change". Source: [AQR](https://www.aqr.com/Insights/Research/Journal-Article/You-Cant-Always-Trend-When-You-Want).

**Moskowitz, Ooi & Pedersen, "Time Series Momentum" (Journal of Financial Economics 104(2), 2012, pp. 228–250)**
- The paper covers 58 liquid futures and forwards: equity indices, currencies, commodities and bonds.
- Returns persist for 1–12 months and then partly reverse over longer horizons, consistent with initial under-reaction followed by delayed over-reaction.
- The test strategy goes long or short for one month based on the trailing 12-month excess return, with positions weighted by volatility. Sources: [Quantpedia summary](https://quantpedia.com/strategies/time-series-momentum-effect/) and [SSRN 2089463](https://papers.ssrn.com/abstract=2089463).
- The 1880–2016 AQR study is explicitly framed as out-of-sample evidence for the MOP results, which used data from 1985 onward ([AQR paper](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).

**Babu, Levine, Ooi, Pedersen & Stamelos, "Trends Everywhere" (Journal of Investment Management 18(1), Q1 2020)**
- The study tests TSMOM on **82 securities not previously studied**, plus 16 long-short equity factors. The new securities include emerging-market equity index futures, emerging-market currencies, exotic commodities and volatility futures.
- Reported gross Sharpe ratios are:
  - 1.17 on traditional assets (12-month TSMOM);
  - 1.34 on the alternative assets;
  - 0.95 on the equity factors;
  - **1.60** for the three groups combined.
- Sources: [JOIM](https://joim.com/article/trends-everywhere) and the [Quantpedia summary](https://quantpedia.com/time-series-momentum-works-everywhere/). These are secondary figures that I did not check against the PDF.

**Baltas & Kosowski, "Momentum Strategies in Futures Markets and Trend-Following Funds" (EFMA 2012 working paper; SMU 2013 version)**
- The study covers 71 futures contracts from 1974 to 2012, at monthly, weekly and daily frequencies.
- The TSMOM strategies show Sharpe ratios **above 1.20**, and TSMOM has high explanatory power for CTA returns.
- The authors find **no evidence of statistically significant capacity constraints**. Sources: [EFMA paper](https://efmaefm.org/0EFMAMEETINGS/EFMA%20ANNUAL%20MEETINGS/2012-Barcelona/papers/BK_MOMF_Full.pdf) and [SMU](https://ink.library.smu.edu.sg/bnp_research/17).
- The sample period of 1974–2012 comes from my secondary search summary. Verify it in the final paper.

**Greyserman & Kaminski, "Trend Following with Managed Futures: The Search for Crisis Alpha" (Wiley, 2014)**
- The book defines crisis alpha as "the amount of excess return generated in a down market event".
- Its main claims:
  - Trend following outperforms long-only over the long run, across interest-rate and inflation environments.
  - It reduces maximum drawdowns.
  - Longer-term trend following is "mean fleeing" and works when markets diverge from equilibrium.
- The reviewer, M. Rzepczynski, makes several criticisms:
  - The tested long-history portfolio "could not actually be replicated" in practice, so the results are hypothetical.
  - It may not be fair to call trend following an asset class.
  - Results vary widely across managers.
- Sources: [FAJ book review, CFA Institute, Sept 2017](https://rpc.cfainstitute.org/research/financial-analysts-journal/2015/trend-following-with-managed-futures). The "800 years" data claim is not stated on that page.

**Harvey, Hoyle, Rattray, Sargaison, Taylor & Van Hemert, "The Best of Strategies for the Worst of Times" (Man Group and Duke, JPM 2019)**
- The study covers 1985–2018, the **8 S&P 500 drawdowns larger than 15%** and 3 US recessions.
- Futures TSMOM had a **100% hit rate** (positive in every drawdown) for the 1- and 3-month signals. The hit rate was lower for the 12-month signal.
- The source is the Alpha Architect summary as relayed in a search result ([Alpha Architect](https://alphaarchitect.com/crisis-proof-your-portfolio-part-2-2/); the page returned HTTP 403 when fetched). The original paper is [Duke PDF](https://people.duke.edu/~charvey/Research/Published_Papers/P140_The_best_of.pdf).
- Man Group describes trend as having "convexity": its best returns have come in the worst equity periods. Trend was negatively correlated with equities in sell-offs, while bonds were mixed ([Man Group, "Is This Time Different?", data to about May 2025](https://www.man.com/insights/is-this-time-different)).

**Other**
- A 2018 CFA Institute Digest summarizes a study of 1,558 CTAs from 1971 to 2016, corrected for survivorship and backfill bias. Its findings:
  - CTAs in aggregate **do not generate superior risk-adjusted returns on a standalone basis**.
  - Most CTAs have alphas that are not statistically significant against a trend-following multi-factor benchmark; only the top quartile is significant.
  - The median pairwise correlation between CTAs is **0.08**.
  - The study finds **no evidence of positive skewness**, and most return distributions are fat-tailed (leptokurtic).
  - Adding up to 20% managed futures to a 55/35/10 equity/bond/commodity portfolio raised the modeled return from 8.76% to as much as 11%. It lowered volatility from 9.63% to as little as 8.66%.
  - Source: [CFA Institute Digest, Oct 2018](https://rpc.cfainstitute.org/research/cfa-digest/2018/10/dig-v48-n10-3).
- Cambridge Associates estimates that about 70% of the capital in managed futures programs is allocated to trend following ([Cambridge Associates, "Befriend the Trend"](https://publishedresearch.cambridgeassociates.com/?p=1123)).

### Inferences
- The century-long evidence is strong but simulated. The realistic net-of-fee expectation implied by AQR's own numbers is about 3–7% excess return over cash at 10% volatility. Note also that the post-2009 decade gave the lowest net Sharpe (0.41 in 2010–2016) after the 1910s (0.13) and the 1880s (0.27).
- The smile and the bear-market gains are statistically weaker than the headline "crisis alpha" marketing suggests: the bull-versus-bear t-statistic is only 1.9. The 8-of-10 hit rate is the more robust result.
- The finding of no positive skew in individual CTAs (CFA Digest) contrasts with the convexity of the index and the simulations. The diversification benefit seems to sit at the portfolio and index level, not in the typical single manager.

### Gaps
- I could not extract the per-episode numbers of AQR Exhibit 6 (the 10 worst 60/40 drawdowns) or the Harvey et al. crisis table. Both are images or encoded PDF text.
- I could not verify MOP 2012's headline Sharpe ratio or its "performs best in extreme markets" wording against the primary text, because SSRN returned 403.
- No Research Affiliates primary article on managed futures turned up in my searches. The critical pieces I found came from Andrew Beer (2018), the CFA Digest, and the Rzepczynski review.

---

## 2. Concrete numbers by episode

### Takeaway
The SG Trend Index returned:
- **+20.9% in 2008**, when MSCI ACWI returned -42.2%;
- **+19.7% in 2014**;
- **+6.2% to +6.3% in 2020**;
- **+27.3% to +27.4% in 2022**, a record year, when both stocks and bonds fell;
- **-4.2% in 2023**;
- **+2.4% in 2024**;
- **+2.4% in 2025**, after reaching about -9.3% year to date in April 2025.

As of early to mid October 2026, it is up about **15–16%** year to date.

Two things qualify the crisis record. In fast V-shaped shocks (Feb–Mar 2020, Nov 2021, April 2025), trend first loses on legacy positions. And in the 2000–2002 and 2007–2009 bear markets, it had double-digit drawdowns before the gains came through.

### Cited Findings

**2000–2002 (dot-com bear market, 5 Sep 2000 – 9 Oct 2002)**
- SG Trend "lost about 10% early on; later gained over 40%", with another drawdown of about 20% along the way ([Man Group, "Why Patience Matters During Market Stress", data to 11 Apr 2025](https://www.man.com/insights/why-patience-matters-during-market-stress)).
- Man lists 2002, 2008 and 2022 as years in which most trend followers made money ([Man Group, "A Trend Following Deep Dive"](https://www.man.com/insights/deep-dive-trend-following)).

**2007–2009 (GFC)**
- SG Trend returned **+20.9% in 2008**, against **-42.2%** for MSCI ACWI ([Cambridge Associates, 19 Aug 2025, updated 26 Nov 2025](https://www.cambridgeassociates.com/insight/does-trend-followings-recent-struggle-signal-that-the-strategy-is-structurally-broken/)).
- In the window from 10 Oct 2007 to 9 Mar 2009, trend had a drawdown of "nearly 17%" before its defensive positions paid off ([Man Group, "Why Patience Matters"](https://www.man.com/insights/why-patience-matters-during-market-stress)).
- Man's "Is This Time Different?" reports a peak-to-trough drawdown of more than 17% over Jul 2007 – Dec 2009 ([Man Group](https://www.man.com/insights/is-this-time-different)).
- I did not find a primary source for the 2008 return of the SG CTA Index.

**2009–2013 and 2014**
- The SG Trend Index returned **-1.8% cumulatively over 2009–2013** ([Man Group, "Is This Time Different?"](https://www.man.com/insights/is-this-time-different)).
- In **2014**, SG Trend returned **+19.7%**, driven by bond trends ([Man Group](https://www.man.com/insights/is-this-time-different)). Over the same year the SG CTA Index rose "more than 15%" ([Hedgeweek, 10 Nov 2021](https://www.hedgeweek.com/ctas-now-set-their-best-year-2014/)).

**2020 (Covid crash and V-shaped rebound)**
- In February 2020 the SG CTA Index fell **-1.50%** ([Hedgeweek](https://www.hedgeweek.com/ctas-enjoy-solid-gains-during-torrid-month-markets/)).
- In **March 2020** the SG Trend Index returned **+1.82%**, taking it to +2.29% year to date ([Opalesque, SocGen release](https://www.opalesque.com/industry-updates/5942/ctas-resilient-in-march-markets-crisis.html)). The SG *Trend Indicator*, a different model, was reported "near +23%" in March. Do not confuse the two.
- For full-year 2020, the **SG Trend Index returned +6.24% to +6.28%** and the **SG CTA Index +3.12%** ([Hedgeweek, 2020 year-end](https://www.hedgeweek.com/ctas-rise-best-monthly-gain-five-years-managed-futures-hedge-funds-end-2020/)).
  - [S&P Global](https://www.spglobal.com/en/research-insights/market-insights/the-sp-systematic-global-macro-index-trending-to-new-highs) puts its own index at +12.76%, beating the SG CTA Index by 9.60 points and the SG Trend Index by 6.48 points. That implies about 3.16% and 6.28% for the two SG indices.
- In 2020 the **fast models** gave the best hypothetical returns ([SG Prime Services, "Keeping Up With The Trend-Followers", May 2025](https://content.sgmarkets.com/CTA_UPDATE_KEEPING_UP_WITH_THE_TRENDFOLLOWERS_2025)).

**Nov 2021**
- The S&P 500 fell about 4%, and trend reversed by about **6%** over the same period ([Man Group, "Why Patience Matters"](https://www.man.com/insights/why-patience-matters-during-market-stress)).

**2022 (stocks and bonds down together)**
- **SG Trend Index: +27.3%**, a record ([Hedgeweek, SG year-end report](https://www.hedgeweek.com/trend-followers-turn-leaders-ctas-deliver-record-returns-2022/)). Cambridge Associates gives **+27.4%**, against MSCI ACWI at -18.4% ([Cambridge Associates](https://www.cambridgeassociates.com/insight/does-trend-followings-recent-struggle-signal-that-the-strategy-is-structurally-broken/)).
- **SG CTA Index: +20.1% or +20.2%** (the article gives both figures). This was its best year since the index started in 2000.
  - It peaked at +25.9% year to date in mid-June and stood at +28.7% year to date in October.
  - The SG Short-Term Traders Index returned +11.3%.
  - The four-year cumulative return was +39.8% for the CTA Index and +61.3% for the Trend Index.
  - Gains came from short bonds and rates, long US dollar and long energy ([Hedgeweek](https://www.hedgeweek.com/trend-followers-turn-leaders-ctas-deliver-record-returns-2022/)).
- **DBMF 2022:**
  - **+32.84%** according to [ETF Trends / ETFdb](https://etfdb.com/managed-futures-content-hub/year-whipsaw-managed-futures/).
  - About **+23%** according to [The Systematic Review, 15 Jul 2026](https://systematicreview.substack.com/p/dbmf-deconstructed-what-the-marketing).
  - **The sources conflict, so verify with iMGP.** The 32.8% figure may be a price return or cover a different period.
- In 2022 the negative stock–bond correlation broke down, and trend followers could short both asset classes ([Cambridge Associates](https://www.cambridgeassociates.com/insight/does-trend-followings-recent-struggle-signal-that-the-strategy-is-structurally-broken/)).
- There was a "mini-correction" in Jun–Jul 2022 ([Man Group, "Why Patience Matters"](https://www.man.com/insights/why-patience-matters-during-market-stress)).

**2023**
- **SG Trend: -4.16%**, TTU TF Index -4.58%, BTOP50 -1.70% ([TTU December 2023 report](https://www.toptradersunplugged.com/trend-following-performance-report-december-2023/)).
- **SG CTA: -3.49%** and **DBMF: -8.72%** ([The Systematic Review](https://systematicreview.substack.com/p/dbmf-deconstructed-what-the-marketing)).
- The damage came from short bond positions when bonds rallied after the SVB failure in March 2023 ([RCM Alternatives, March 2023 scoreboard](https://www.rcmalternatives.com/?p=39502); [The Systematic Review](https://systematicreview.substack.com/p/dbmf-deconstructed-what-the-marketing)).
- SG notes that the six-month correlation between its simple Trend Indicator and the Trend Index fell below 0.6 around "SVB" ([SG Prime Services, May 2025](https://content.sgmarkets.com/CTA_UPDATE_KEEPING_UP_WITH_THE_TRENDFOLLOWERS_2025)).
- A search summary attributes to AQR a "36% gain in the first three quarters of 2023" for SG Trend ([Institutional Investor](https://www.institutionalinvestor.com/article/b20qbzzskkwdz7/AQR-It-s-Not-Too-Late-to-Bet-on-Managed-Futures)). This **contradicts** the -4.16% full-year figure and probably refers to 2022. **Do not use it.**

**2024**
- **SG Trend: +2.42%**, TTU TF +2.77%, BTOP50 +4.44% ([TTU December 2024 report](https://www.toptradersunplugged.com/trend-following-performance-report-december-2024/)).
- SG CTA: +2.36%; DBMF: +7.18% ([The Systematic Review](https://systematicreview.substack.com/p/dbmf-deconstructed-what-the-marketing)).
- Within the SG Trend Index, the average pairwise correlation between constituents was **0.78**, but the spread of returns was nearly **15%**.
  - Slower models did better in 2024, because shifting rate expectations prevented clean fixed-income and FX trends.
  - Early in 2024 the simple Trend Indicator lagged the index by about 8% ([SG Prime Services, May 2025](https://content.sgmarkets.com/CTA_UPDATE_KEEPING_UP_WITH_THE_TRENDFOLLOWERS_2025)).

**2025 (tariff shock and deep drawdown)**
- **Q1 2025:** SG Trend lost about 4.5% ([Alternatives Watch, 2 Jun 2025](https://www.alternativeswatch.com/2025/06/02/trend-following-hedge-funds-endure-more-pain-societe-generale-indices/)).
- **April 2025:**
  - SG Trend returned **-4.89%** (about -4.9%), taking it to **-9.3% year to date**.
  - The SG Short-Term Traders Index was -0.9% for the month and -0.9% year to date ([SG Prime Services, May 2025](https://content.sgmarkets.com/CTA_UPDATE_KEEPING_UP_WITH_THE_TRENDFOLLOWERS_2025); [TTU April 2025](https://www.toptradersunplugged.com/trend-following-performance-report-april-2025/)).
  - The spread of 2025 year-to-date returns between trend and short-term CTAs was 30% ([SG](https://content.sgmarkets.com/CTA_UPDATE_KEEPING_UP_WITH_THE_TRENDFOLLOWERS_2025)).
  - FX caused the largest losses, and rates were the only consistent profit ([AlphaMaven](https://alpha-maven.com/story/managed-futures/top-managed-futures-funds-are-down-sharply-since-liberation-day)).
- **Rolling 12-month losses:**
  - SG Trend's rolling 12-month return to 30 Apr 2025 was **-18.6%**.
  - Only two rolling 12-month periods in the index's history lost more than 15%. The previous worst was -16.0% in Jan 2019.
  - During the 2–9 Apr 2025 tariff shock, trend had repositioned and was positive by 9 April, before the 90-day tariff pause triggered a sharp rebound ([Man Group, "Is This Time Different?"](https://www.man.com/insights/is-this-time-different)).
- **May 2024 – May 2025 drawdown:**
  - SG Trend returned **-20.4%**, the second-largest drawdown since 2000. Over the same period MSCI ACWI returned +18.3% and HFRI Equity Hedge +10.9%.
  - SG Trend has had 16 drawdowns larger than 10% since 2000, roughly one every 18–24 months ([Cambridge Associates](https://www.cambridgeassociates.com/insight/does-trend-followings-recent-struggle-signal-that-the-strategy-is-structurally-broken/)).
- **August 2025:** SG Trend was still -7.56% year to date ([TTU August 2025](https://www.toptradersunplugged.com/trend-following-performance-report-august-2025/)).
- **Full year 2025:**
  - **SG Trend +2.39%**, BTOP50 +2.81%, TTU TF +1.78%. December alone was +1.92% for SG Trend ([TTU December 2025 report](https://www.toptradersunplugged.com/trend-following-performance-report-december-2025/)).
  - IASG Trend Following Index +6.7% ([Aussie Turtles](https://www.aussieturtles.com/battle-of-the-trend-following-indexes-december-2025/)).
- **SG CTA 2025:** +0.88% according to [The Systematic Review](https://systematicreview.substack.com/p/dbmf-deconstructed-what-the-marketing), but **-0.2%** according to another recap I found only in a search summary. **The sources conflict.**
- **DBMF 2025:** +13.84% ([The Systematic Review](https://systematicreview.substack.com/p/dbmf-deconstructed-what-the-marketing)).
- **Manager dispersion:** one fund (Mulvaney) lost **-40.67% in April 2025** ([AlphaMaven](https://alpha-maven.com/story/managed-futures/top-managed-futures-funds-are-down-sharply-since-liberation-day)).

**2026 year to date**
- **SG Trend:** **+15.72%** as of 2 Oct 2026, down from +16.05% on 25 Sep 2026 ([TTU Week in Review, 2 Oct 2026](https://www.toptradersunplugged.com/trend-following-week-in-review-october-2-2026/); [TTU 25 Sep 2026](https://www.toptradersunplugged.com/trend-following-week-in-review-september-25-2026/)).
- **BarclayHedge** shows an *estimated* **+14.97% year to date**, with **-0.73% month to date**, as of 17 Oct 2026 ([BarclayHedge SG Trend Index page](https://portal.barclayhedge.com/cgi-bin/indices/displayHfIndex.cgi?indexCat=SG-Prime-Services-Indices&indexName=SG-Trend-Index)).
- I found no attribution of the 2026 gains by sector. TTU mentions long trends in metals (running since February), Nasdaq 100, Nikkei, sugar and copper.
- **DBMF:** 9.65% annualized since inception, as of 30 Sep 2026 ([iMGP DBMF page](https://www.imgp.com/us/dbmf/)).

**Long-run drawdown statistics (SG Trend Index since 2000)**
- The maximum drawdown since inception is **20.61%**, as of Dec 2025. Over the same period it is 15.94% for BTOP50 and 20.93% for TTU TF ([TTU December 2025](https://www.toptradersunplugged.com/trend-following-performance-report-december-2025/)).
- The TTU TF maximum drawdown was 17.13% at end-2024, so the 2025 episode set a new record for that index ([TTU December 2024](https://www.toptradersunplugged.com/trend-following-performance-report-december-2024/)).
- For comparison, the S&P 500 TR maximum drawdown since 2000 is 50.95% ([TTU December 2024](https://www.toptradersunplugged.com/trend-following-performance-report-december-2024/)).

### Inferences
- **2008 and 2022 are the two pillars of the "crisis alpha" case.** Both were slow, persistent crises (a credit unwind; an inflation and rate shock) in which trends had months to form.
- **The sudden, policy-driven reversals of Nov 2021, Mar 2023 and Apr 2025 are the opposite case.** In each, trend lost or lagged.
- **The 2025 drawdown roughly equals the worst SG Trend drawdown since 2000.** Cambridge calls -20.4% the "second-largest" drawdown, while TTU puts the maximum at 20.61%. Either way, an investor buying after 2022 faced a drawdown of about 20% within 18 months.
- **2026 shows the cyclicality again.** After the 2025 trough, SG Trend is up about 15% year to date by October 2026.

### Gaps
- I found no primary SG annual table for 2000–2026. The annual numbers above are compiled from Hedgeweek, TTU, Cambridge and Man, all relaying SG data.
- Calendar-year returns for 2000, 2001, 2002, 2009–2013 (individually), 2015–2019 and 2021 are not covered.
- I found no 2008 figure for the SG CTA Index and no official SG year-end release for 2025.
- DBMF's 2022 return is unresolved: 32.84% versus about 23%.
- I found no attribution of the 2026 gains.

---

## 3. The long flat periods: 2009/2012–2019 "lost decade", depth and length, and why

### Takeaway
From 2009 to about 2019, trend following delivered roughly zero to low single-digit returns:
- SG Trend returned -1.8% cumulatively over 2009–2013.
- AQR's simulated net Sharpe ratio was 0.41 for 2010–2016.
- SG Trend's rolling 12-month return hit a low of -16.0% in Jan 2019.

The evidence-based explanations are:
- fewer large market moves (AQR);
- high cross-asset correlation in the risk-on/risk-off era of 2008–2014, with central bank intervention suppressing trends;
- fee drag on smaller gross returns.

The low collateral yield is a plausible extra factor, but the evidence on it is mixed. Man Group finds no clear sign that crowding was the cause.

### Cited Findings
- **Returns.** SG Trend returned -1.8% cumulatively over 2009–2013, and its rolling 12-month return reached a low of -16.0% in Jan 2019 ([Man Group, "Is This Time Different?"](https://www.man.com/insights/is-this-time-different)).
- **Recovery.** From the Jan 2019 low to the start of the May 2024 drawdown, the return was **+82.5%** ([Man Group](https://www.man.com/insights/is-this-time-different)).
- **AQR simulated data, 2010–2016.**
  - The net-of-fee excess return was **3.3%** a year (Sharpe 0.41), against 7.3% over 1880–2016.
  - The gross Sharpe ratio was 0.06 for the 1-month signal and 0.73 for 12-month.
  - The drawdown that started in Mar 2015 reached -16.1% and was still not recovered by Dec 2016 ([AQR, Century of Evidence, 1880–2016](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).
- **Why: fewer large market moves.** This is AQR's main explanation, not a decay of the signal ([AQR, "You Can't Always Trend When You Want", 2020](https://www.aqr.com/Insights/Research/Journal-Article/You-Cant-Always-Trend-When-You-Want)).
- **Why: high cross-market correlation.** Average pairwise correlation across markets rose from late 2008 to mid-2014. The quintile with the highest correlation had a Sharpe ratio of 0.67, against 1.54 for the lowest ([AQR](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).
- **Why: other causes cited by Man Group.** These are central bank intervention after the GFC, sideways markets, and policy-driven whipsaws (as in 2025).
  - On crowding, CTA AUM as a share of hedge fund AUM, and the CTA share of futures volumes, showed "no concerning rise" from Dec 1997 to Dec 2024.
  - The correlation between monthly trend performance and normalized net flows was **-0.1** ([Man Group](https://www.man.com/insights/is-this-time-different)).
- **Market impact.** SG estimates industry AUM at about **$340bn** (Backstop BarclayHedge, Q4 2024). It concludes CTAs have "minimal impact on global markets" ([SG Prime Services, May 2025](https://content.sgmarkets.com/CTA_UPDATE_KEEPING_UP_WITH_THE_TRENDFOLLOWERS_2025)). Baltas & Kosowski also find no statistically significant capacity constraints ([EFMA paper](https://efmaefm.org/0EFMAMEETINGS/EFMA%20ANNUAL%20MEETINGS/2012-Barcelona/papers/BK_MOMF_Full.pdf)).
- **Market "head-fakes" (Alpha Architect, Feb 2019).** The 2011 US credit downgrade and the 2015–2016 slowdown fears produced repeated false signals. Over that decade, trend rules "did little" to limit drawdowns outside commodities and real estate ([Alpha Architect, "Trend Following: A Decade of Underperformance"](https://alphaarchitect.com/trend-following-a-decade-of-underperformance/)).
- **Interest rates and collateral.**
  - Typically 80–90% of capital sits in T-bills earning the short rate, so near-zero rates in 2009–2021 removed that part of total return ([WisdomTree](https://www.wisdomtree.com/us/insights/blog/trend-following-with-a-managed-futures-master-ninja)).
  - The historical evidence is mixed. RCM Alternatives found weak managed futures performance in *very* low-rate periods but also in high-rate periods, with the best results at middling rates ([RCM Alternatives](https://www.rcmalternatives.com/?p=2673)).
  - A Campbell-sourced review found no relationship between the direction of Treasury yields and Barclay CTA Index returns ([RCM Alternatives](https://www.rcmalternatives.com/?p=9623)).
  - In AQR's T-bill yield quintiles (results before fees), the Sharpe ratios were 1.10, 0.94, 0.79, 1.10 and 1.13, so there is no monotonic link ([AQR](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)). Note that AQR measures *excess* returns over cash, so the collateral yield is added on top.
- **Drawdowns are normal for this kind of strategy.**
  - Take a strategy with Sharpe 0.5, 10% volatility and normal returns. Its probability of a drawdown of 20% or more within 25 years is "nearly four in five".
  - Take one with Sharpe 0.6 and 15% volatility. It can suffer a -32% drawdown and stay underwater for 9 years, yet still grow capital more than 8 times over 30 years.
  - After rolling 12-month drawdowns larger than 10%, the average return over the next 12 months was **+9.8%**.
  - A simulated rule that cuts exposure after drawdowns underperformed staying invested by **2.2% a year** ([Man Group](https://www.man.com/insights/is-this-time-different)).
- **Cyclicality.** Cambridge Associates calls the strategy "inherently cyclical", not structurally broken ([Cambridge Associates, Aug/Nov 2025](https://www.cambridgeassociates.com/insight/does-trend-followings-recent-struggle-signal-that-the-strategy-is-structurally-broken/)).

### Inferences
- **Fee drag compounds the lost-decade problem.** In AQR's data the gap between gross and net-of-2/20 returns is about 4 points a year in 2010–2016 (7.6% gross, 3.3% net). When gross returns shrink, high fees take a larger share.
- **Reconstructing total returns.** With near-zero T-bill yields over 2009–2021, total returns roughly equalled excess returns. By contrast, the 4–5% short rates of 2023–2025 add that amount to total return without changing the excess return. This is my inference: I found no published decomposition.

### Gaps
- I found no published decomposition of SG Trend returns into collateral yield and excess return.
- I found no exact peak-to-trough depth or duration for the SG Trend drawdown of about 2011–2013 or 2016–2019. Only the rolling-12-month figures and the 2009–2013 cumulative return are available.

---

## 4. Correlation with equities and bonds; diversification after costs; fast versus slow trend speed

### Takeaway
Over long horizons, trend's correlation with US equities and bonds is about zero:
- -0.01 and -0.03 over 1880–2016 (AQR);
- about -0.05 beta to the S&P 500 for the SG CTA Index over 2019–2026.

The correlation is negative in sell-offs. Diversification survives costs at the portfolio level: adding 20% trend to 60/40 cut the maximum drawdown from -62% to -50% and raised the Sharpe ratio from 0.39 to 0.55, even net of 2/20 fees.

Single-manager CTAs, however, show no significant alpha on average. On speed:
- Fast signals help in sudden crises (2020; the April 2025 result for short-term traders).
- Slow signals performed better from 2008 to 2025 and dominated in 2010–2016.
- The industry has slowed down over time.

### Cited Findings
- **Long-run correlations (AQR, 1880–2016).**
  - With US equities: **-0.01**; with US 10-year bonds: **-0.03**.
  - The 2000s correlations were -0.34 with equities and +0.27 with bonds; in 2010–2016 they were -0.15 and +0.28 ([AQR](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).
  - Note the positive correlation with bonds after 2000: trend was usually long bonds during the bull market.
- **May 2019 – Jun 2026 (net of fees; source: DBi and Morningstar).**

| Series | Annualized return | Annualized volatility | Sharpe | Beta to S&P 500 | Alpha to S&P 500 (%) |
|---|---|---|---|---|---|
| SG CTA Index | 5.44% | 8.87% | 0.34 | -0.05 | 3.77 |
| DBMF (NAV) | 9.15% | 11.41% | 0.56 | -0.06 | 7.30 |
| Morningstar US Fund Systematic Trend category | 4.37% | 8.23% | 0.23 | -0.02 | 2.24 |
| Bloomberg US Aggregate (bonds) | 1.58% | 5.70% | -0.23 | 0.17 | -3.71 |

  - Source: [iMGP DBMF Q2 2026 deck](https://www.imgp.com/wp-content/uploads/2026/03/DBMF-Quarterly-Deck.pdf). This is the fund sponsor's material.
  - The deck adds that "correlation and beta of managed futures to equities has been roughly zero for over two decades".
- **Performance as a standalone investment.** Fidelity notes that the SG Trend Index since 2000, net of fees, is weaker than equities, but can still add value to an equity portfolio ([Fidelity Institutional](https://institutional.fidelity.com/institutions/insights/topics/investing-ideas/trend-following-crisis-alpha-does-it-come-from-beta-timing-or-market-selection)).
- **Portfolio effect after fees.** AQR's 80/20 blend includes the trend leg *net* of 2/20 fees and costs. It cut the maximum drawdown from -62.3% to -50.2% and volatility from 10.7% to 8.7%, and raised excess return from 4.1% to 4.8% over 1880–2016 ([AQR](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).
- **Man Group, using BTOP50.** Replacing up to 50% of a traditional portfolio with trend "preserves return but substantially reduces volatility and drawdowns" ([Man Group, "Trend Following: What's Not to Like?"](https://www.man.com/insights/trend-following-what-not-to-like)).
- **CTAs as individual managers.** In aggregate, CTAs show no superior risk-adjusted returns as a standalone investment. Most alphas are insignificant against trend factors, but the portfolio-level benefit holds ([CFA Institute Digest, Oct 2018](https://rpc.cfainstitute.org/research/cfa-digest/2018/10/dig-v48-n10-3)).
- **Speed (SG Prime Services, May 2025).**
  - From 2000 to 2006 the SG Trend Index correlated most with fast moving-average models. Since 2007 it "behaves more like a much slower model", so "CTAs appear to have slowed down".
  - Longer-term models have on average performed better since 2008. When fast models made money, slow ones usually did too; when slow models lost, fast ones "almost always" lost as well.
  - In 2020 the fast models were best.
  - Two reasons are given for the slowdown: capacity, and the better historical performance of slow models ([SG](https://content.sgmarkets.com/CTA_UPDATE_KEEPING_UP_WITH_THE_TRENDFOLLOWERS_2025)).
- **Speed in crises.** In Harvey et al., the 1- and 3-month TSMOM signals were positive in all 8 S&P 500 drawdowns from 1985 to 2018; the 12-month signal less often ([Alpha Architect summary](https://alphaarchitect.com/crisis-proof-your-portfolio-part-2-2/)).
- **Speed after 2009.** In AQR's 2010–2016 data, the gross Sharpe ratio was 0.06 for the 1-month signal and 0.73 for 12-month ([AQR](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).
- **Positioning into a shock.** Trend's crisis result depends on how it is positioned when volatility erupts. Legacy positions can cause early losses before the models recalibrate ([Man Group, "Why Patience Matters"](https://www.man.com/insights/why-patience-matters-during-market-stress)).

### Inferences
- **A speed trade-off.** Faster trend gives more reliable protection in sharp drawdowns. Slower trend has given better long-run returns since 2008 and costs less to trade. A blend of speeds is the usual compromise.
- **Correlation with bonds is not stable.** It was positive in 2000–2016, when trend was long bonds, and turned sharply favourable in 2022, when trend was short bonds. Diversification against bonds therefore depends on the regime.

### Gaps
- I found no recent primary source with a rolling correlation of SG Trend against MSCI World or global government bonds over 2000–2026, or with conditional correlation during equity drawdowns.
- No Morningstar primary research on the Systematic Trend category's 2025–2026 results turned up; I have only the category figures from the DBi deck.

---

## 5. Fees: 2/20 versus ETF replicators; the replication literature

### Takeaway
In AQR's 1880–2016 simulation, fees and trading costs absorb more than half of the gross excess return: 18.0% gross falls to 11.0% after costs and to 7.3% after 2/20 fees.

The case for replication:
- DBi replicates the *pre-fee* SG CTA Index with 10 futures contracts.
- Over May 2019 – Jun 2026, DBMF (expense ratio 0.85%) returned 9.1% annualized against 5.4% for the SG CTA Index, according to the sponsor.
- The sponsor says the strategy beat 100% of index constituents from Jul 2016 to May 2026.

The record is not uniform:
- Earlier static trend "risk premia" products (as of 2018) returned only about half the net SG CTA return.
- DBMF lost 5 points against the index in 2023, because its lag hurt in sharp reversals.

### Cited Findings
- **AQR fee impact (1880–2016).** Excess return falls from 18.0% gross to 11.0% net of costs, then to **7.3%** net of 2/20 fees. In 2010–2016 it went from 7.6% to 6.2% to 3.3% ([AQR](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).
- **Hasanhodzic & Lo, "Can Hedge-Fund Returns Be Replicated?: The Linear Case" (Journal of Investment Management, 2007).**
  - The study covers 1,610 TASS hedge funds over 1986–2005 and builds linear clones on six liquid factors.
  - For some categories, a "significant fraction" of expected return and volatility comes from common factors.
  - Clones often underperform the funds, but are "passive, transparent, scalable, and lower-cost alternatives" ([MIT, Lo](https://web.mit.edu/Alo/www/Papers/replicate.html)).
  - A later paper notes these factor models did poorly for managed futures, a complex strategy ([Financial Innovation, 2019](https://link.springer.com/article/10.1186/s40854-019-0127-3)).
- **DBi method (iMGP deck, Q2 2026).**
  - Every week, DBi takes the recent returns of the 20 CTAs in the SG CTA Index, adds back estimated fees, and fits a 10-futures portfolio.
  - The 10 contracts are: S&P 500, EAFE and emerging-market equities; 2-, 10- and 30-year Treasuries; gold and oil; euro and yen.
  - It rebalances with a one-day lag. The core model is "unchanged since launch in July 2016".
  - **DBi says it beat 100% of SG CTA constituents** from 31 Jul 2016 to 31 May 2026, with a correlation of about 0.9 to the index. The deck's subtitle is "Fee reduction is the purest form of alpha."
  - Expense ratios: **DBMF 0.85%**, Morningstar US ETF Systematic Trend average **0.92%**, Morningstar US Fund Systematic Trend average **1.98%**.
  - DBi strategy AUM is $6.9bn; DBMF is about $3.8bn (30 Jun 2026) ([iMGP deck](https://www.imgp.com/wp-content/uploads/2026/03/DBMF-Quarterly-Deck.pdf)). This is all the sponsor's own data.
- **Since-inception results.**
  - **May 2019 – Jun 2026:** DBMF NAV **9.15%** annualized (price 9.12%), SG CTA **5.44%**, Morningstar Systematic Trend fund category 4.37%. The Morningstar ETF peer median was 5.05% and the mutual fund peer median 5.22% ([iMGP deck](https://www.imgp.com/wp-content/uploads/2026/03/DBMF-Quarterly-Deck.pdf)).
  - **To 30 Sep 2026:** DBMF 9.65% annualized since inception ([iMGP](https://www.imgp.com/us/dbmf/)).
- **Independent review (The Systematic Review, 15 Jul 2026).**
  - Since inception to 31 Mar 2026: DBMF **9.13%** versus SG CTA **5.36%**.
  - Over 5 years: Sharpe 0.42 versus 0.24, volatility 12.42%, correlation to the SG CTA Index **0.84**, tracking error **6.76%**.

**DBMF NAV versus SG CTA Index by calendar year (The Systematic Review, 15 Jul 2026)**

| Year | DBMF | SG CTA Index | Gap |
|---|---|---|---|
| 2022 | about +23% | about +20% | about +3 points |
| 2023 | -8.72% | -3.49% | about -5.2 points |
| 2024 | +7.18% | +2.36% | about +4.8 points |
| 2025 | +13.84% | +0.88% | about +13 points |

  - Volatility rose from below 9% before 2022 to above 12% afterward.
  - The criticisms: a "double lag" from the 60-day window and weekly rebalancing, which is "structurally blind to sudden, fast reversals". Positions fell from 14 to 10. There was a near-90% short notional position in 2-year Treasuries in Q1 2026. WTI positions are approaching CFTC limits. The fund depends on two key people, and its stepwise regression risks post-selection bias ([The Systematic Review](https://systematicreview.substack.com/p/dbmf-deconstructed-what-the-marketing)).
- **The earlier evidence was negative (Andrew Beer, 13 Apr 2018).**
  - Five trend risk-premia indices with live track records of at least three years had an average correlation of only **0.55** with the SG CTA Index (range 0.15–0.66).
  - The four with five-year track records returned **1.6% a year**, about half the net SG CTA return.
  - Some were backtested before launch, and "trend is not a clearly identifiable, easily captured beta" ([WealthManagement.com](https://www.wealthmanagement.com/alternative-investments/trend-following-index-managers-have-so-far-failed-replicate-managed-futures)).
  - Note that Beer co-founded DBi, so he was arguing for top-down replication against static trend rules.
- **Manager selection.**
  - A 2025 Journal of Wealth Management paper (Handy & Meksi) finds that portfolios of past-winner CTAs underperformed both the SocGen CTA Index and a diversified CTA fund of funds. **61% of the programs in the 2000 SocGen CTA Index are no longer in business** ([JWM 2025 PDF](https://a-us.storyblok.com/f/1022432/x/7604212f92/blindedbybias_journal-of-wealth-management-2025.pdf), via search summary).
  - DBi's deck shows annual rankings of SG CTA constituents from 2016 to 2025 with "no persistence" ([iMGP deck](https://www.imgp.com/wp-content/uploads/2026/03/DBMF-Quarterly-Deck.pdf)).

### Inferences
- **Most of DBMF's edge over the SG CTA Index looks like fee savings.** The SG CTA is net of roughly 1–2% management and 15–20% performance fees; DBMF charges 0.85% with no performance fee. The tracking error of about 6.8% means the yearly gaps are large in both directions (+13 points in 2025, -5 in 2023).
- **The record may flatter replication.** The live record since 2016 or 2019 is short and comes mostly from the sponsor. It also covers a period in which slow, core-market trends dominated, which suits the method. Replication is weakest in sudden reversals.

### Gaps
- I found no independent academic study after 2019 that confirms "replicators matched or beat the index after fees" across several replicators: KMLM, CTA, Simplify, the UCITS versions.
- I found no Morningstar primary research on how fees affect the Systematic Trend category.

---

## 6. Caveats: overfitting, survivorship, V-shaped crashes, interest-rate dependence

### Takeaway
The best evidence is simulated: AQR's 137 years of data and Greyserman & Kaminski's long history are hypothetical portfolios that could not have been traded. Fee assumptions vary, and the period before 1985 is out-of-sample only with respect to the original 1985–2009 study.

Further caveats:
- **Survivorship.** CTA indices hold only today's large survivors: 61% of the programs in the 2000 SG CTA Index no longer exist.
- **V-shaped crashes.** Fast V-shaped crashes and policy reversals (Feb–Mar 2020, Nov 2021, Mar 2023, Apr 2025) hurt trend.
- **Collateral yield.** The cash yield adds to total return, but the historical link between rate levels and excess returns is weak.

### Cited Findings
- **Backtest limits.**
  - AQR's results are hypothetical and simulated. The authors note costs are uncertain, and that some managers historically charged more than 2/20 ([AQR](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf); [RCM Alternatives on the hypothetical nature](https://www.rcmalternatives.com/2012/12/100-years-of-trend-following/)).
  - Lagging the AQR signal by one month cuts performance, especially for fast signals. Results are therefore sensitive to execution assumptions ([AQR](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).
  - Greyserman & Kaminski's long-history portfolio "could not actually be replicated" ([FAJ review, 2017](https://rpc.cfainstitute.org/research/financial-analysts-journal/2015/trend-following-with-managed-futures)).
- **Overfitting is limited by the out-of-sample record.** The 1880–1984 data is out-of-sample relative to Moskowitz, Ooi & Pedersen, and individual-market Sharpe ratios before 1985 are "remarkably consistent" ([AQR](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).
  - Trend risk-premia indices were often "backtested before launch", and their live results were much worse ([Beer 2018](https://www.wealthmanagement.com/alternative-investments/trend-following-index-managers-have-so-far-failed-replicate-managed-futures)).
  - Man Group gives the examples of pairs trading and short-term trend, which lost their edge over time as markets became more efficient ([Man Group](https://www.man.com/insights/is-this-time-different)).
- **Survivorship and backfill bias.**
  - SG indices pick the largest managers open to new investment and rebalance every year ([BarclayHedge](https://portal.barclayhedge.com/cgi-bin/indices/displayHfIndex.cgi?indexCat=SG-Prime-Services-Indices&indexName=SG-Trend-Index)). At its start in 2000, the SG Trend Index had 10 programs from 8 CTAs ([Transtrend, "Just buy the index"](https://www.transtrend.com/en/insights/just-buy-the-index/)).
  - 61% of the programs in the 2000 SocGen CTA Index have closed ([JWM 2025, Handy & Meksi](https://a-us.storyblok.com/f/1022432/x/7604212f92/blindedbybias_journal-of-wealth-management-2025.pdf)).
  - For hedge funds generally, Malkiel & Saha (2005) estimate survivorship bias at up to **442 bp a year** ([Risk.net](https://risk.net/node/2245325)). This is not a CTA-specific figure.
  - Academic CTA studies remove backfilled data to deal with the bias ([CFA Digest, 2018](https://rpc.cfainstitute.org/research/cfa-digest/2018/10/dig-v48-n10-3)).
  - Daily investable indices like SG's are less exposed to backfill than self-reported databases. Their own survivorship comes from picking the largest current managers.
- **Sudden V-shaped crashes and reversals.**
  - In February 2020 the SG CTA Index lost 1.50%, with only a small gain in March for SG Trend (+1.82%) ([Hedgeweek](https://www.hedgeweek.com/ctas-enjoy-solid-gains-during-torrid-month-markets/); [Opalesque](https://www.opalesque.com/industry-updates/5942/ctas-resilient-in-march-markets-crisis.html)).
  - In November 2021 the S&P 500 fell about 4% and trend lost about 6%. Trend also suffered early losses in 2000 and 2007 because of legacy positions ([Man Group, "Why Patience Matters"](https://www.man.com/insights/why-patience-matters-during-market-stress)).
  - In April 2025 SG Trend lost 4.9% while short-term traders lost only 0.9% ([SG Prime Services](https://content.sgmarkets.com/CTA_UPDATE_KEEPING_UP_WITH_THE_TRENDFOLLOWERS_2025)).
  - Newfound Research identifies whipsaw as the core risk and argues that "the extent that whipsaw can be mitigated while still maintaining the potential to earn diversified returns is likely limited" ([Newfound, June 2020](https://blog.thinknewfound.com/2020/06/)).
  - Bloomberg's Odd Lots, discussing Hoffstein's 2020, notes that rule-based strategies did poorly in that year's crash-and-rebound ([Bloomberg/BQ Prime, Jan 2021](https://www.bloombergquint.com/markets/the-important-lesson-a-quant-manager-learned-in-2020)).
- **Dependence on interest rates.**
  - 80–90% of capital earns T-bill rates ([WisdomTree](https://www.wisdomtree.com/us/insights/blog/trend-following-with-a-managed-futures-master-ninja)).
  - Historically, performance has not tracked the direction or level of rates in a monotonic way ([RCM Alternatives](https://www.rcmalternatives.com/?p=2673); [RCM, Campbell review](https://www.rcmalternatives.com/?p=9623); [AQR T-bill quintiles](https://static.twentyoverten.com/593e8a9e7299b471eaecf644/SkLoGL67M/A-Century-of-Evidence-on-Trend-Following-Investing.pdf)).
- **Manager dispersion.**
  - Within the SG Trend Index in 2024, the spread of returns was about 15% despite an average pairwise correlation of 0.78 ([SG](https://content.sgmarkets.com/CTA_UPDATE_KEEPING_UP_WITH_THE_TRENDFOLLOWERS_2025)).
  - One fund lost 40.67% in April 2025 ([AlphaMaven](https://alpha-maven.com/story/managed-futures/top-managed-futures-funds-are-down-sharply-since-liberation-day)).
  - The median pairwise correlation between all CTAs is 0.08 ([CFA Digest](https://rpc.cfainstitute.org/research/cfa-digest/2018/10/dig-v48-n10-3)).
- **Behavioural risk: abandoning the strategy.** The always-invested portfolio beat a drawdown-based exit rule by 2.2% a year in 10,000 simulations ([Man Group](https://www.man.com/insights/is-this-time-different)). Cambridge Associates recommends keeping the allocation, rebalancing, and spreading across several managers ([Cambridge Associates](https://www.cambridgeassociates.com/insight/does-trend-followings-recent-struggle-signal-that-the-strategy-is-structurally-broken/)).

### Inferences
- For a portfolio investor, the main practical risks are:
  - multi-year flat periods during which the investor gives up;
  - the gap between simulated and live net returns;
  - single-fund dispersion.
- The case for an index-like, low-cost, multi-speed implementation follows directly from these three risks.
- In periods of positive real cash yields, total returns include the T-bill yield. When comparing past and current returns, compare excess returns over cash.

### Gaps
- I found no CTA-specific estimate of survivorship or backfill bias in basis points per year.
- I found no study that isolates trend performance in V-shaped crashes across many events, such as 1987, 2018 Q4, 2020 and 2025.
- I did not use Return Stacked / Newfound primary research on "return stacking" overlays, because it was not retrieved.
