# Managed futures / trend following: quanto allocare e da dove prenderlo (portafoglio di riferimento in EUR)

Research date: 17 October 2026. Several primary pages (Adviser Voice, Alpha Architect, Morningstar) returned HTTP 403 when fetched, and two AQR pages either did not exist at the guessed URL or loaded only the summary. Where I rely on a search-result summary rather than the full page, I say so. Items from background knowledge that I could not confirm in this session are in the Gaps sections, not in Cited Findings.

Reference portfolio: 40% SWDA (MSCI World), 10% EIMI (MSCI EM IMI), 10% euro govt 1-3Y, 10% euro govt 7-10Y, 10% euro govt 15+Y, 10% physical gold, 5% developed REITs, 3% Bloomberg Commodity, 2% bitcoin.

## 1. What allocations do practitioners and researchers suggest?

### Takeaway
Unconstrained optimisations over long samples give very large weights. Man Group finds a Sharpe-optimal 40% trend / 60% 60/40 and a drawdown-minimising 63% (BTOP50, 1995-2023). The same authors say real-world constraints, mainly tracking error and investor preference, justify much less, and they explicitly do not recommend those numbers. I found no fetched source giving a "standard" 5/10/15-20% range. The 5-20% band seen in practice is a practitioner convention I could not source in this session.

### Cited Findings
- **Man Group, "Honey, I shrunk the trend-following"** (undated page; data runs to 31 Dec 2023; page shows © 2026). Trend proxy is the BTOP50 index. 60/40 proxy is 60% MSCI World USD-hedged and 40% Bloomberg Global Aggregate USD-hedged. Over 1 Jan 1995 to 31 Dec 2023:
  - The Sharpe-optimal mix is 40% trend and 60% 60/40.
  - The drawdown-minimising mix is 63% trend.
  - The paper says "'optimal' is in the eye of the beholder" and that real-world constraints mean trend "may not get the allocations our two measures of optimal... might suggest. And we are not advocating that it should either."
  - The constraints it names are investor preferences, the lookback window and tracking error.
  - The optimal weight was higher in the dot-com and GFC periods and fell during the post-GFC "CTA winter."
  - Source: [Man Group](https://www.man.com/it/insights/honey-i-shrunk-the-trend-following), also reposted by [AIMA](https://www.aima.org/article/honey-i-shrunk-the-trend-following.html).
- **Same Man paper, 2022 returns:** trend (BTOP50) +14.9% vs 60/40 −13.5% — [Man Group](https://www.man.com/it/insights/honey-i-shrunk-the-trend-following)
- **Adviser Voice (Australia, May 2024)** carries the Man analysis as CPD material. It frames the "textbook answer, in the absence of any constraints" as the Sharpe-maximising weight, which constraints then shrink. I saw this only in a search summary; the page returned 403 — [Adviser Voice](https://www.adviservoice.com.au/2024/05/cpd-how-much-trend-following-should-investors-hold-in-a-portfolio/)
- **AQR, "Trend-Following: Why Now? A Macro Perspective"** (16 Nov 2022): SG Trend Index +36% YTD through September 2022 vs about −20% for a global 60/40 (60% MSCI World / 40% Barclays Global Aggregate USD-hedged, monthly rebalanced). Only the summary loaded, so I could not read any allocation numbers — [AQR](https://www.aqr.com/Insights/Research/White-Papers/Trend-Following-Why-Now-A-Macro-Perspective)
- **AQR "A Century of Evidence on Trend Following Investing"** (Hurst, Ooi, Pedersen). A secondary summary attributes to AQR that trend was positive in 8 of the 10 largest 60/40 drawdowns over a very long sample. I could not confirm this against the paper — [AQR paper page](https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing?aqrPDF=1); summary in [Substack](https://th3vjp.substack.com/p/how-investors-can-add-trend-following)
- **SMU newsletter / Ooi (AQR):** trend has been positive with low correlation to traditional assets back to 1880, but performance "has been more mixed since the global financial crisis" — [SMU SKBI](https://skbi.smu.edu.sg/newsletter/141376)
- **Morningstar (2025):**
  - Over the three years to 31 Aug 2025, the typical US "Systematic Trend" category fund lost 2.3% annualised.
  - The category fell 5.8% in H1 2025, during the tariff selloff.
  - Morningstar argues the strategy's value shows over longer horizons. One fund in the article had a −0.11 beta to MSCI World since August 2014.
  - I saw this only in a search summary; the page returned 403 — [Morningstar](https://www.morningstar.com/alternative-investments/managed-futures-funds-look-rebound-can-they-help-diversify-your-portfolio)
- **Morningstar US Systematic Trend category size:** 62 funds (Winton fact sheet) and 61 funds (Winton Q2 2026 flyer). This is manager marketing material — [Winton fact sheet](https://cdn.winton.com/pdfs/WMFTF-Factsheet.pdf), [Winton Q2 2026 flyer](https://cdn.winton.com/pdfs/Winton-Managed-Futures-Trend-Fund-2026-Q2-Flyer.pdf)
- **Vanguard:**
  - I found no Vanguard research paper on managed futures.
  - Vanguard's related material covers commodities as a diversifier, from a 2019 press release on the Commodity Strategy Fund — [Vanguard press release](https://corporate.vanguard.com/content/corporatesite/us/en/corp/who-we-are/pressroom/Press-Release-VG-Introduces-Commodity-Futures-Fund-062519.html)
  - An older report says Vanguard's multi-alternative fund made up 10% of its Managed Payout Fund — [InvestmentNews](https://investmentnews.com/?p=61259)
- **Ibbotson Associates (2005, hosted by CME Group)** asked whether adding managed futures improves long-term asset-allocation portfolios. The page did not load, so I have no numbers — [CME Group](https://cmegroup.com/education/alternative-investment-resource-center/research/managed-futures-and-asset-allocation.html)

### Inferences
- The evidence splits into two layers:
  - Unconstrained mean-variance or drawdown optimisations give 30-60%+ trend. These are backward-looking and depend heavily on the sample (1995-2008 is very favourable).
  - Practical allocations are much smaller, because tracking error against a stock/bond benchmark makes high weights hard to hold.
- For a private investor, a 5-15% capital weight is a defensible range. This is my inference, not a sourced recommendation. It sits far below "optimal" but is large enough to matter in a 2022-type year. For example, 10% at +15% to +27% (the 2022 range across BTOP50 and SG Trend) adds about +1.5 to +2.7 percentage points to the portfolio.
- Since 2010, live performance has been weaker than the century-long backtests: the post-GFC "CTA winter," then −2.3% annualised over the three years to August 2025 for the typical Morningstar category fund. The report should set expected returns below the long backtests.

### Gaps
- I could not locate AQR's "Trend Following: What's Not to Like?" on aqr.com. The guessed URL returned "page does not exist."
- I did not obtain allocation guidance from AQR portfolio-allocation pieces, Research Affiliates, Bridgewater/All Weather, CAIA, or endowment and pension surveys.
- From background knowledge, not verified this session:
  - Bridgewater's All Weather has no explicit trend sleeve.
  - Some pension funds, for example in the Nordics and Australia, use 5-10% "crisis risk offset" buckets that include trend.
- I found no Vanguard research supporting a specific managed-futures allocation.

## 2. Funding source: replace equities, bonds or gold, or stack?

### Takeaway
Return Stacked / Newfound prefer an overlay with leverage, funded from neither equities nor bonds. Man reports that an overlay on a full 60/40 added +2.3% per year with similar volatility and drawdown. If no overlay is used, the evidence favours funding trend at least partly from long-duration bonds: in 2022, long duration and the stock-bond correlation failed, while trend delivered. I found no rigorous study of the gold-trend correlation.

### Cited Findings
- **Newfound Research:** its earlier research recommended implementing managed futures "as an overlay to avoid sacrificing exposure to core stocks and bonds." It notes that adding an alternatives sleeve otherwise means cutting equities, fixed income or both — [Newfound blog, return-stacking tag](https://blog.thinknewfound.com/tag/return-stacking/); [ETF Strategy](https://www.etfstrategy.com/newfound-research-debuts-return-stacked-managed-futures-etf-10339/)
- **Return Stacked Bonds & Managed Futures ETF (RSBT, US):** about $1 of bonds plus $1 of managed futures per $1 invested. The issuer says leverage applied to two uncorrelated asset classes "does not lead to significant increases in risk." This is issuer marketing — [ETF Strategy](https://www.etfstrategy.com/newfound-research-debuts-return-stacked-managed-futures-etf-10339/); [roic.ai RSBT](https://www.roic.ai/quote/RSBT)
- **WisdomTree, "Return stacking portfolios" (Oct 2021):** an example "60/40/+" uses NTSX (90/60 efficient core) to free capital for managed futures. It notes that managed futures' low returns were "a real challenge" when funded from a traditional 60/40 — [WisdomTree](https://www.wisdomtree.com/us/insights/blog/return-stacking-portfolios)
- **Man Group, implementation options:**
  - Keeping the full 60/40 and adding trend on top improves returns by 2.3% per year with similar volatility and drawdown.
  - Putting 10% of cash in trend at 4x leverage gives about 40% notional trend alongside 90% long-only (LOMA), or about 30%/70% normalised.
  - Source: [Man Group](https://www.man.com/it/insights/honey-i-shrunk-the-trend-following)
- **Funding from bonds:** a Jack Burns Substack piece argues trend should replace bonds. It cites SG Trend +6.4% vs a global 60/40 +4.4% annualised over 2000-2022. This is a blog, and the window ends at the 2022 peak, which flatters trend — [Jack Burns](https://jackburns.substack.com/p/chart-of-the-week-4b3)
- **2022 regime:** high inflation and rate hikes turned the stock-bond correlation positive. The argument for trend is that it is "largely agnostic to asset-class correlations" and can go short. This is practitioner CPD material (June 2026), seen in a search summary — [Adviser Voice 2026](https://www.adviservoice.com.au/2026/06/cpd-trend-following-in-uncertain-times/)
- **SG Trend Index 2022:** +27% while bonds and equities both posted double-digit losses — [HedgeNordic / Top Traders Unplugged](https://hedgenordic.com/2023/03/bringing-back-crisis-alpha/)
- **Man, long-run stock-bond correlation:** Man's Figure 1 shows the rolling stock-bond correlation from 1900 to 2023. Its point is that negative correlation is not a permanent feature — [Man Group](https://www.man.com/it/insights/honey-i-shrunk-the-trend-following)
- **Gold vs trend:**
  - No source gives a measured correlation between gold and the SG Trend Index.
  - Alpha Architect (2025) reports that trend had one of its worst drawdowns in history during the April 2025 tariff shock. It then says gold and silver trends helped the sector finish 2025 positive. So trend funds can be long gold when gold trends, which shows overlap in some regimes. Seen in a search summary; the page returned 403 — [Alpha Architect](https://alphaarchitect.com/the-return-of-the-king-trend-following-is-back-but-will-it-last/)
  - Academic work cited by CXO Advisory: Baur & Glover (2012) find gold's immediate safe-haven effect in 1987, 2001 and 2008 fades quickly. Barunik, Kocenda & Vacha (2013) find gold-stock-oil correlations rose and became unstable after 2008 — [CXO Advisory](https://cxoadvisory.com/gold/gold-as-diversifier-versus-safe-haven)
- **Timing within crises:** trend is described as a "second responder" that lags early in a crisis and then adapts — [Top Traders Unplugged](https://www.toptradersunplugged.com/?p=17075)

### Inferences (applied to the reference portfolio)
- **Gold should not be the funding source.** Gold is a static long position with no expected-return engine except as an inflation/fiat hedge. Trend is a dynamic long/short strategy: it can be short bonds (2022) and short equities in slow bear markets (2008), which gold cannot be. They complement each other, though their exposures overlap whenever gold is trending up. Trend will be long gold then, so in rallies like 2025-2026 total gold exposure is effectively higher than 10%. Selling some gold to fund trend is reasonable only if the aim is to cap total "real asset / crisis" exposure.
- **The 3% Bloomberg Commodity sleeve is the most natural partial funding source.** Trend funds trade commodity futures long and short, and a 3% long-only BCOM position is too small to matter on its own. Replacing it with trend keeps commodity participation in trending inflation regimes, and the trend sleeve can also go short when commodities fall. This is my inference; I found no paper testing it directly.
- **Among bonds, the 15+Y sleeve is the most coherent donor in a 2022 "inflation shock" logic,** since trend profited from short bond futures exactly when long duration lost most. The cost is that long euro bonds are the best hedge in a deflationary equity crash (2008, 2020), when trend also tends to do well, but with a lag.
  - A blended donor is more robust: part 15+Y, part 1-3Y, keeping 7-10Y.
  - Funding from 1-3Y (vol ~2%) with an instrument at ~10-15% vol raises total portfolio volatility.
  - Funding from 15+Y (vol often around 12-15% for euro long govts; not sourced this session) keeps volatility roughly constant, because the two have similar standalone vol.
- **Equities as a donor:** taking 5% from SWDA lowers equity beta and lowers expected return relative to an equity-heavy benchmark, and in the reference portfolio equities are the main return engine. The Man and Newfound framing (overlay rather than cutting equities) suggests keeping equities.
- **Illustrative options for 10% trend (inference, unbacktested):**
  - (a) 3% from BCOM + 4% from 15+Y + 3% from 1-3Y.
  - (b) 3% BCOM + 7% bonds pro-rata.
  - (c) Overlay. In UCITS form this is limited: I found no UCITS "return-stacked" equity+trend ETF in this session.

### Gaps
- I found no measured correlation between gold and the SG Trend / BTOP50 index, rolling or conditional on crises. The report should say this has not been quantified in sources found here.
- I found no published backtest splitting "trend funded from equities" vs "trend funded from bonds" with numbers.
- I could not confirm whether a UCITS return-stacking product (equity + trend, or bonds + trend) is available to Italian investors. From background knowledge, not verified: WisdomTree lists a "US Efficient Core UCITS" 90/60 ETF in Europe.

## 3. Volatility sizing: risk contribution vs capital weight; rebalancing

### Takeaway
I found no fetched source with explicit vol-target numbers for specific funds or indices. The key conceptual point is sourced: Man's normalised notional framing (10% cash at 4x is roughly 30-40% trend notional) shows that the capital weight depends on the product's leverage and volatility. A low-correlation sleeve also contributes far less risk than its capital weight suggests.

### Cited Findings
- **Man:** 10% of capital in a 4x-levered trend vehicle is roughly 40% trend notional (or about 30% normalised), showing that capital weight ≠ risk weight — [Man Group](https://www.man.com/it/insights/honey-i-shrunk-the-trend-following)
- **iMGP DBi Managed Futures** (UCITS ETF family):
  - It aims to approximate the returns of managed-futures hedge funds using a "Dynamic Beta Engine" (replication of recent CTA performance trends). It uses derivatives and up to 20% in structured products for commodity exposure.
  - Share class R EUR HP (ISIN LU3359622902) is denominated in EUR and launched 13 May 2026. It is listed on Xetra and German exchanges.
  - Another EUR class, LU2951555403, has a TER of 0.55% or 0.75% depending on the source, so this needs checking.
  - Sources: [finanzen.at](https://www.finanzen.at/etf/imgp-dbi-managed-futures-r-hp-etf-lu3359622902), [extraETF](https://extraetf.com/it/etf-profile/LU2951555403); European listing announced as DBMF:FP (Paris) per [Affaritaliani](https://www.affaritaliani.it/lavoro/notiziario/im-global-partner-enters-the-active-ucits-etf-market-in-europe-421655.html)

### Inferences
- **Rough risk arithmetic (my calculation, not sourced):**
  - Suppose trend runs at about 12-15% vol with near-zero correlation to the portfolio, and the reference portfolio runs at about 9-11% vol (equity 50% at about 15-17% vol dominates).
  - A 10% trend sleeve then contributes roughly w²σ² ≈ 0.01 × 0.0144-0.0225 ≈ 1.4-2.3 bp² of variance.
  - That is only about 2% of total portfolio variance (portfolio variance is about 0.008-0.012), versus 10% of capital.
  - If the correlation turns negative in a sell-off, the contribution is negative, meaning the sleeve reduces risk.
  - So, by risk contribution, 10% capital is a modest risk allocation. Even 15% stays below 5% of risk.
- **Sizing by risk budget:** an alternative is to target trend at, say, 10% of portfolio risk, which implies a capital weight of about 15-20% at these vol assumptions. That moves back toward the Man-style optimal figures, but with tracking-error cost.
- **Replication products like DBi** target hedge-fund-like volatility through the replication itself. The investor should check the fund's realised volatility, not assume 15%.
- **Rebalancing:**
  - Trend returns are path-dependent and positively skewed. Periodic rebalancing (annual, or 5-percentage-point bands) harvests the diversification benefit by trimming after crisis gains (2008, 2022) and adding after long flat spells.
  - Rebalancing too often is costless in UCITS but adds tax drag in Italy, because each sale crystallises "redditi di capitale" gains (see section 6).
  - Annual or band-based rebalancing is the inference.

### Gaps
- I did not verify these volatility figures in this session:
  - Target or realised volatility of SG Trend Index, BTOP50 or DBi. Background knowledge says SG Trend is about 12-15% annualised long term; not verified.
  - Euro long-govt volatility.
- I found no paper on optimal rebalancing frequency specifically for a trend sleeve.

## 4. Behavioural risk: tracking-error regret, long underperformance, holding horizon

### Takeaway
Long dry spells are documented. They include the post-GFC "CTA winter" (roughly 2009-2019), weak results in 2023 to mid-2025, a −5.8% category H1 2025 and one of trend's worst drawdowns in April 2025. Man names tracking error as a key reason practical allocations sit below "optimal." Expectations should be framed around crisis behaviour and a horizon of about 10 years, not annual returns.

### Cited Findings
- **Man:** after the GFC, trend entered what "many regard as the 'CTA winter'," and its optimal weight fell over that period. Tracking error, shown as rolling 12-month in Figure 4, is a named constraint — [Man Group](https://www.man.com/it/insights/honey-i-shrunk-the-trend-following)
- **AQR "You Can't Always Trend When You Want"** (Babu, Levine, Ooi, Pedersen, Stamelos, 2017/2020). Per secondary summaries:
  - The post-2010 weakness was not structural; it was driven by unusually small market moves across asset classes.
  - One summary cites a post-2010 Sharpe of 0.05 versus 0.28 historically. I could not verify this against the AQR PDF, so treat it with caution.
  - Source: [The Idea Farm summary](https://theideafarm.com/alternative-investment/you-cant-always-trend-when-you-want/)
- **Morningstar:** −2.3% annualised over the three years to 31 Aug 2025 for the typical systematic trend fund, and −5.8% in H1 2025 — [Morningstar](https://www.morningstar.com/alternative-investments/managed-futures-funds-look-rebound-can-they-help-diversify-your-portfolio)
- **Alpha Architect:** April 2025 was among trend's worst drawdowns in history; the sector recovered to finish 2025 positive — [Alpha Architect](https://alphaarchitect.com/the-return-of-the-king-trend-following-is-back-but-will-it-last/)
- **Tracking-error regret** is described as the reason investors abandon well-designed diversified plans, and it is better thought of as "tracking variance" — [IBKR Campus](https://www.interactivebrokers.com/campus/ibkr-quant-news/tracking-error-is-a-feature-not-a-bug/)
- **Trend as "second responder":** it lags in sudden crashes such as 1987, Covid 2020 and April 2025, and then adapts — [Top Traders Unplugged](https://www.toptradersunplugged.com/?p=17075)

### Inferences
- **Set expectations explicitly:**
  - Return: cash plus a modest premium, not equity-like.
  - Long flat or negative periods (3-5+ years) are normal.
  - Benefits are concentrated in drawn-out bear markets and inflation shocks (2008, 2022), not V-shaped crashes.
  - In a strong equity bull market, the trend sleeve will look like a drag.
- **Minimum holding horizon:** given a roughly 10-year "CTA winter," a reasonable horizon is a full cycle of about 10 years (inference). A sleeve small enough to hold through a decade of underperformance (5-10%) is better than a large one abandoned after three bad years.
- **Psychology:** framing trend as "insurance that pays sometimes," funded mostly from the bond sleeve, makes the regret easier to bear than funding it from equities.

### Gaps
- I did not retrieve sourced statistics on the length of trend's longest drawdowns or underwater periods (for example SG Trend peak-to-trough 2008/9-2013/14 and 2016-2019).

## 5. Published illustrative backtests (60/40 + trend)

### Takeaway
The best numbers found are Man's (1995-2023, BTOP50): 40% Sharpe-optimal weight, 63% drawdown-optimal weight, and +2.3% per year from an overlay with similar volatility and drawdown. Other figures are blog-level. I found no fetched source giving Sharpe, max drawdown or volatility tables for a 60/40 + 10% or 20% trend mix.

### Cited Findings
- **Man (1995-2023):** see figures above. Sharpe values are not reported numerically in the text, and drawdown figures are not given except as the optimal weight — [Man Group](https://www.man.com/it/insights/honey-i-shrunk-the-trend-following)
- **2000-2022:** SG Trend +6.4% vs global 60/40 +4.4% annualised (blog) — [Jack Burns](https://jackburns.substack.com/p/chart-of-the-week-4b3)
- **2022:** SG Trend +27% ([HedgeNordic](https://hedgenordic.com/2023/03/bringing-back-crisis-alpha/)); SG Trend +36% YTD to September 2022 vs about −20% for 60/40 ([AQR](https://www.aqr.com/Insights/Research/White-Papers/Trend-Following-Why-Now-A-Macro-Perspective)); BTOP50 +14.9% vs 60/40 −13.5% ([Man](https://www.man.com/it/insights/honey-i-shrunk-the-trend-following)).
  - The figures differ because of the index and the period (YTD vs calendar year).
- **Correlation example:** a Goldman Sachs managed-futures fund fact sheet (as of 30 Sept 2025) reports a correlation of 0.02 to the S&P 500 TR since inception. This is marketing material — [GSAM](https://am.gs.com/public-assets/documents/2c9e2cd7-c0e6-11f0-9cf7-d5b4b24c0620?view=true)

### Inferences
- **Rough, unbacktested what-if for the reference portfolio:** a 10% sleeve funded from bonds at a 2022-like +15% to +27% replaces bonds that lost heavily. Euro govt 15+Y lost far more than 20% in 2022; the exact figure is not sourced here.
  - The swing would be on the order of +3 to +5 portfolio points in 2022.
  - In a 2023 to mid-2025 type period, the same sleeve would have cost about 0.2-0.6 points per year relative to bonds.
- The report should present these as illustrative arithmetic, not a backtest.

### Gaps
- I found no Portfolio Visualizer-style or Portfolio Charts backtest tables with Sharpe, max drawdown and volatility for 60/40 + 10% or 20% trend, in this session.
- I found no EUR-based backtest.

## 6. EUR investor: currency share class and Italian taxation

### Takeaway
Currency: a EUR share class exists for the main UCITS replication ETF (iMGP DBi R EUR HP, launched May 2026), but whether it is fully currency-hedged and whether it is listed on Borsa Italiana was not confirmed. Tax (Italy): gains on harmonised UCITS ETFs are "redditi di capitale" at 26%, with 12.5% on the white-list government-bond share. ETF losses are "redditi diversi" and cannot offset ETF gains. They can only offset other redditi diversi (shares, bonds, ETC/ETN, derivatives) within four years. This applies to a managed-futures UCITS ETF as to any harmonised ETF.

### Cited Findings
- **Fiscomania, "Tassazione degli ETF in Italia: guida 2026"** (Dott. Federico Migliorini, 4 Feb 2026), harmonised ETFs:
  - Gains and dividends are "redditi di capitale" at 26% (imposta sostitutiva).
  - The government-bond share is taxed at 12.5% (white list). For example, a 50/50 govt-bond/equity ETF is taxed half at 12.5% and half at 26%.
  - Losses on ETFs are "redditi diversi"; ETF gains and losses "non possono essere compensate tra loro." Losses can be carried forward four years against other redditi diversi only.
  - ETC/ETN gains are "redditi diversi," so they can absorb losses.
  - Non-harmonised (e.g., US-domiciled) ETFs are taxed at IRPEF marginal rates of 23-43%.
  - Source: [Fiscomania](https://fiscomania.com/tassazione-etf/)
- **Confirmation from a second source:** ETF losses can be offset only against gains on shares, options, futures, bonds, CFDs, forex and other art. 67 TUIR instruments, within the four following tax years — [Moneyviz blog 2026](https://blog.moneyviz.it/tassazione-etf-2026-plusvalenze-minusvalenze-730-modello-redditi/); [money.it](https://www.money.it/Tassazione-ETF-dividendi-capital-gain-guida)
- **iMGP DBi R EUR HP UCITS ETF** (LU3359622902): EUR-denominated, launched 13 May 2026, listed on Xetra, Munich, Düsseldorf and Baader. I saw no Borsa Italiana listing in the results — [finanzen.at](https://www.finanzen.at/etf/imgp-dbi-managed-futures-r-hp-etf-lu3359622902); [finanzen.ch](https://script.finanzen.ch/etf/imgp-dbi-managed-futures-r-hp-etf-lu3359622902)

### Inferences
- **US-domiciled funds are effectively ruled out** (DBMF, KMLM, CTA, RSST/RSBT): they are non-harmonised, taxed at IRPEF marginal rates, and generally not purchasable by EU retail under PRIIPs/KID rules.
  - The PRIIPs point is background knowledge, consistent with Fiscomania's note on non-harmonised taxation.
  - This also rules out return-stacking via US ETFs for this investor.
- **Currency:**
  - A managed-futures fund's return is roughly collateral yield plus trend P&L.
  - A USD unhedged share class adds EUR/USD exposure, which could dominate the sleeve's return and its crisis behaviour. The USD has often, but not always, risen in risk-off episodes.
  - A EUR-hedged class swaps USD T-bill yield for the EUR cash rate (the hedge carry).
  - For a sleeve meant as a diversifier, the EUR-hedged class is more coherent (inference).
  - "HP" in the share-class name suggests "hedged portfolio," but this is not confirmed; check the KID or prospectus.
- **Tax interaction in the reference portfolio:**
  - The reference portfolio is mostly ETFs and physical gold. Physical gold gains are taxed as redditi diversi under the investment-gold rules (background knowledge; not verified).
  - Losses from a managed-futures ETF, which is likely to have losing years, are hard to use: they can offset gains from the 3% BCOM sleeve if held as an ETC, gains on bitcoin (crypto is taxed separately under its own regime from 2023; whether it is "diversi" and compensable was not verified here), or gains on directly held BTPs.
  - Gains on the ETF can never be reduced by prior losses. This asymmetry is a real cost, especially for a strategy with frequent small losses and occasional large gains, and it argues against frequent rebalancing.
- **12.5% on the government-bond share:** a managed-futures UCITS that holds most collateral in US T-bills or other white-list government bills may benefit from the 12.5% rate on that portion, through the fund's semi-annual government-bond percentage. This is an inference to verify with the fund's tax reporting.

### Gaps
- Whether the DBi EUR class is fully currency-hedged, its TER (0.55% vs 0.75% conflict between sources) and whether it has a Borsa Italiana/ETFplus listing.
- No verified source on whether a managed-futures UCITS ETF's government-bond collateral qualifies for the 12.5% share in practice.
- No source from Borsa Italiana or Il Sole 24 Ore was retrieved for the tax point. The two sources used are specialist tax and finance sites (Fiscomania, Moneyviz) and agree with each other.
- I did not research other UCITS trend options available in Italy (e.g., UCITS funds from Man AHL, Winton, Aspect, Lynx, or other UCITS ETFs).
