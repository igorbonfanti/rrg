# Identificazione di «Composite Momentum» e «C-Wave» (Cicli&Mercati)

Fase di ricerca, 12/11/2026. Nessuna modifica all'app.

## Contesto

Video «Mercati al bivio: scoppia la bolla o nuovo boom? 4 scenari per i prossimi 6 mesi»,
https://www.youtube.com/watch?v=LhtoNaXbxS8, annunciato l'11/11/2026 sul canale Telegram di Cicli&Mercati
(https://t.me/cicliemercati/754), con Vito Lops, giornalista economico e finanziario del Sole 24 Ore.

## 1. Composite Momentum Oscillator (CMO): formula pubblica

- Ideato da Francesco Caruso (Market Risk Management srlu, Cicli&Mercati). Unisce due indicatori presentati a Roma 1998 e a Lugano 2006. Premiato con il John Brooks Award IFTA 2008-2009. La formula di oggi è «leggermente rivisitata» rispetto a quella dell'IFTA Journal 2010.
  Fonte: https://www.cicliemercati.it/insights/composite-momentum-oscillator-come-funziona
- Il sito lo chiama «indicatore proprietario» (https://www.cicliemercati.it/domande-frequenti), ma pubblica la formula completa per MetaStock e ProRealTime, anche in PDF scaricabili:
  https://www.cicliemercati.it/wp-content/uploads/2021/11/CMO_Prt.pdf ,
  https://www.cicliemercati.it/wp-content/uploads/2021/11/CMO_MetaStock.pdf ,
  https://www.cicliemercati.it/metodologia/composite-momentum-oscillator
  (si trova anche sui grafici di Bloomberg e Visual Trader).

### Formula ufficiale (ProRealTime, dalla pagina e dal PDF CMO_Prt)

    k=4
    media1=WeightedAverage[k](Close)        // WMA 4
    media2=WeightedAverage[k*3](Close)      // WMA 12 (rapporto 1:3)
    MOM=average[1](media1-media2)/(media1)*100
    diffMOM=MOM-MOM[1]
    temp1 = diffMOM se MOM>MOM[1], altrimenti 0
    temp2 = diffMOM se MOM<MOM[1], altrimenti 0
    sumtemp1=summation[5](temp1); sumtemp2=summation[5](temp2); abssumdiff=summation[5](abs(diffMOM))
    aa=((sumtemp1[1]-(sumtemp1[1]/5)+temp1)/(abssumdiff[1]-(abssumdiff[1]/5)+abs(diffmom))*100)
    bb=((sumtemp2[1]-(sumtemp2[1]/5)+temp2)/(abssumdiff[1]-(abssumdiff[1]/5)+abs(diffmom))*100)
    cc=aa-abs(bb)
    key=ExponentialAverage[3](cc)           // KEY: Directional Movement di Wilder applicato a MOM, scala ±100
    stoco=Stochastic[5,3](close)
    xtl=WeightedAverage[3](stoco)*2-100     // XTL: stocastico breve riscalato a ±100
    Composite=WeightedAverage[2]((2*key+xtl)/3)
    livelli: 0, ±50, ±80

In MetaStock l'ultima riga è `Mov((KEY*2+XTL)/3,2,W)`, cioè una WMA a 2 periodi (la frase del testo dice «a tre periodi», ma il codice usa 2).
K può andare da 3 a 5; il valore di default è 4.

Note per una reimplementazione:
- `Stochastic[N,K]` in ProRealTime restituisce %K su N periodi, smussato su K periodi (https://www.prorealcode.com/documentation/stochastic/). Usa massimo e minimo, non la chiusura.
  `Stoch(5,3)` di MetaStock è invece il rapporto tra due somme a 3 periodi: le due versioni possono differire di poco.
- Il CMO è sensibile al punto di partenza della serie, per via della media esponenziale e delle somme ricorsive.
- La libreria ProRealCode ha una variante NON ufficiale: medie semplici 3 e 9 al posto delle WMA 4 e 12, più una EMA[1]
  (https://www.prorealcode.com/prorealtime-indicators/composite-momentum , 2016, «trovato in un forum italiano»). Non va usata.

### Lettura secondo l'autore

- Direzione (in salita o in discesa), posizione rispetto allo zero, flessi, eccessi tra +50/+80 e tra -50/-80.
- Il CMO mensile serve al trend di medio termine (gambe di 8-24 mesi), quello trimestrale al lungo termine (cicli di 30-60 mesi).
- Quattro stati: UP (sotto zero, in salita), ADVANCING (sopra zero, in salita), DOWN (sopra zero, in discesa), TERMINATING (sotto zero, in discesa).
  Fonti: https://www.cicliemercati.it/report/demo-forecaster e https://www.trend-online.com/2025/07/14/10-big-cap-italia-curva-ciclica/

## 2. C-Wave / C_Wave: proprietario, formula NON pubblicata

- «gli indicatori proprietari di Cicli&Mercati tra i quali Composite Momentum Oscillator (CMO), Fear/Greed Index, Investitore Disciplinato (ID), Thermic Indicator, C-Wave, Heisenberg e Trigger» (https://www.cicliemercati.it/domande-frequenti , https://www.cicliemercati.it/trend-online).
- «C-Wave, Buy on Dips e altri indicatori esclusivi sono disponibili soltanto sulla nostra piattaforma» (https://t.me/cicliemercati/744 , 22/07/2026).
- «nostri indicatori proprietari, TRIGGER, HEISENBERG, C_WAVE, COMPOSITE MOMENTUM ecc., che non trovate su nessun'altra piattaforma» (https://t.me/cicliemercati/408 , 2022).
- «Questo grafico si basa su algoritmi proprietari, generati in Python. La posizione ciclica si basa sull'indicatore C_Wave su base settimanale» (per esempio https://t.me/cicliemercati/690).
- C_Wave «Segnale ciclico di reversal da una lettura di ipervenduto di medio termine» (https://t.me/cicliemercati/692).
- Rapporto con il CMO: «curva ciclica settimanale basata sul Composite Momentum e quella basata sull'indicatore C_Wave ... La differenza risiede nella dinamica di questi due indicatori, che hanno una modalità di interpretazione simile ma due velocità diverse» (https://www.cicliemercati.it/trend-online).
- Usa gli stessi quattro stati U/A/D/T (https://t.me/cicliemercati/725 ; https://www.trend-online.com/2025/07/14/10-big-cap-italia-curva-ciclica/).
- Le ricerche «c_wave» sul sito portano solo a pagine riservate agli abbonati (area-riservata/buy-signals, mappe-cicliche).
  Né su IFTA, né su ProRealCode, né su francescocaruso.net si trova una formula.

Ipotesi (NON verificate):
- Il nome potrebbe stare per «Caruso Wave» o «Cycle Wave».
- Dalla scala ±80 e dalla forma liscia, sembra un oscillatore di ciclo smussato e limitato.
- Velocità: non si sa se sia più lento o più veloce del CMO.

## 3. Termini d'uso

- https://www.cicliemercati.it/disclaimer, sezione «Copyright»: copia ammessa solo per uso personale e non commerciale. Il contenuto «non può essere modificato né utilizzato in tutto o in parte ... riprodotto, rappresentato o distribuito al pubblico, ... integrato in un'opera derivata, a fini pubblici o commerciali».
- I PDF portano la dicitura «Il materiale è soggetto a Copyright - Tutti i diritti sono riservati».
- Nelle FAQ il sito spiega di avere una piattaforma propria anche perché la Community non debba «replicarli su altri software».
- Valutazione (non legale): il testo e il codice pubblicati sono protetti. Una formula matematica descritta pubblicamente,
  riscritta da zero nel nostro codice e con la citazione dell'autore, è un caso diverso dalla copia dei contenuti, ma il punto va deciso con l'utente.
  Per prudenza: citare Caruso e Cicli&Mercati, non copiare testi, grafici o codice, ed eventualmente chiedere il permesso (info@marketrisk.it).
  Il C-Wave non è riproducibile, perché la sua formula non è pubblica.

## 4. Alternative pubbliche simili al C-Wave (solo identificazione, nessun backtest)

1. Coppock curve (Coppock, Barron's 1962), mensile: `WMA10( ROC14 + ROC11 )`, con ROC in %. Fonte: https://en.wikipedia.org/wiki/Coppock_curve .
   In origine dava solo segnali d'acquisto. Caruso stesso la usa nei webinar («Coppock Guide», https://t.me/cicliemercati/718).
2. KST di Pring, versione lungo termine mensile: ROC su 9, 12, 18 e 24 mesi, smussati con SMA 6, 6, 6 e 9, pesi 1, 2, 3, 4; linea di segnale SMA 9.
   Fonte: https://search.r-project.org/CRAN/refmans/TTR/html/KST.html , con rimandi a pring.com su archive.org.
3. MACD mensile (Appel): `EMA12 − EMA26`, segnale EMA9. Fonte: https://en.wikipedia.org/wiki/MACD .
4. Composite Index di Constance Brown: `(RSI14 − RSI14[9]) + SMA3(RSI3)`, più le sue SMA 13 e 33.
   Fonte secondaria: https://www.luxalgo.com/library/indicator/sxVAwZED-rsi-composite-index/ ; il libro di riferimento è
   C. Brown, «Technical Analysis for the Trading Professional», 1999. Le fonti online non concordano del tutto: da verificare sul libro.
5. Detrended Price Oscillator, oscillatore di ciclo puro (prezzo meno una SMA centrata). Per un ciclo di circa 4 anni (n intorno a 48 mesi)
   va ricentrato e quindi ricalcola il passato: non è adatto a un segnale in tempo reale.
