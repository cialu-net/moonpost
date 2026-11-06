# Moonpost

Un piccolo gioco di consegne in tre diorami isometrici, disegnati in pixel art. Raccogli le tre lettere di ogni isola e portale alla casetta entro il limite di passi.

## Come giocare

Apri `index.html` in un browser moderno. Il gioco usa HTML, CSS e JavaScript e funziona anche offline.

- Usa le frecce, **WASD** o i pulsanti a schermo per muovere il corriere.
- Clicca o tocca una casella percorribile per raggiungerla lungo il cammino più breve. Ogni casella attraversata consuma un passo.
- Premi **Z** per annullare una mossa e **R** per ricominciare l’isola.
- Dopo ogni consegna si sblocca l’isola successiva. Gli sblocchi si conservano nel browser quando lo spazio di archiviazione è disponibile.

## Pubblicazione su GitHub Pages

1. Estrai l’archivio e carica i file nella radice di un repository GitHub. Includi il file nascosto `.nojekyll`.
2. Apri **Settings → Pages** e scegli **Deploy from a branch**.
3. Seleziona il branch **main** e **/(root)**, poi premi **Save**. GitHub mostrerà l’indirizzo del gioco nella stessa pagina.

Non servono dipendenze, installazioni o comandi di build. Tutti i percorsi delle risorse sono relativi, quindi funzionano anche su un sito GitHub Pages di progetto.
