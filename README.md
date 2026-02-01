# weblab6


1) Korištenje native API-ja
   status: napravljeno
   Koristi se Camera API: klikom na gumb za paljenje kamere pali se kamera i traži se dopuštenje za korištenje,
   a klikom na gumb slikaj se slika prikazuje u Preview i s komentarom se može spremiti klikom na gum spremi.

2) Installable
   status: napravljeno
   Aplikacija ima napravljenu datoteku manifest.webmanifest s definiranim značajkama,
   a prilikom pokretanja aplikacije preko URL-a prikazuje se opcija instaliraj,
   a kasnije se aplikacija prikazuje u standalone prozoru.

3) Cacheing
   status: napravljeno
   Za statičke resurse -> Cache-first
   Za ostale -> Network-first + cache fallback
   Cache se otvara u serviceWorkeru -> snapnote-v1, a sadržaj iz varijable APP_CACHE se sprema u cache

4) Offline rad
   status: napravljeno
   Provjera: u Devtools -> Application -> Network -> opcija offline -> Refresh i sve i dalje radi

5) Background sync
   status: napravljeno
   U offline načinu rada može se dodati slika s bilješkom te se uz nju ispisuje status PENDING,
   kada se prebaci način rada u online način rada + refresh -> status se mijenja u Synced i dolazi notifikacija (Push)
   Napomena: u online načinu rada kada se dodaje slika s biljeskom - piše status PENDING (a nije zapravo taj status)
   iako je već došla Push notifikacija da je status SYNCED - potreban refresh i stanje se mijenja u Synced.

6) Push notification
   status: napravljeno
   Provjera ista kao kod background synca.

7) Progressive enhancement / Graceful degradation
   status: napravljeno
   Provjera dostupnosti i dopuštenja korištenja kamere, ako da -> kamera se koristi,
   ako ne -> kamera se me može koristiti već se mogu samo bilješke spremati

8) Postavljanje aplikacije na server (Render)
   status: napravljeno
   
