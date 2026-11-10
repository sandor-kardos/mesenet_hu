# Mesenet.hu 🪄 AI Story Generation Pipeline ✨

A high-performance Progressive Web App (PWA) and automated content pipeline for Hungarian folk tales, modern fairy tales, and children's literature.

**Élő oldal (Live):** [mesenet.hu](https://mesenet.hu) 🦋  
**Headless CMS API:** [api.mesenet.hu](https://api.mesenet.hu) 📜  
**Esettanulmány:** [How Far AI Gets You in 24 Hours](https://sandorkardos.com/projects/how-far-ai-gets-you-in-24-hours-the-mesenet-hu-pwa-case-study/) 📖

---

## 🏗 Rendszerarchitektúra 🏰

A projekt szigorúan szétválasztja az adatréteget, az AI feldolgozó láncot és a bemutató (frontend) réteget.

```
                    ┌────────────────────────┐
                    │  Klasszikus Források   │
                    │ (Arany László 1862 PDF)│
                    └───────────┬────────────┘
                                │ OCR & Szövegkinyerés
                                ▼
                    ┌────────────────────────┐
                    │   tales_raw.json (33)  │
                    └───────────┬────────────┘
                                │
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ AI Illusztr. │      │ ZWJ Vízjelezés   │      │ Max SEO Silózás  │
│ 3:4 Függőleg.│      │  (\u200d ZWJ)    │      │  [slug]-nepmese  │
│ Keretmentes  │      │ Lopásvédelem     │      │ Schema.org JSON  │
└──────┬───────┘      └────────┬─────────┘      └────────┬─────────┘
       │                       │                         │
       └───────────────────────┼─────────────────────────┘
                               ▼
               ┌───────────────────────────────┐
               │  Headless WordPress REST API  │
               │   (api.mesenet.hu/wp/v2/mese) │
               └───────────────┬───────────────┘
                               │ JSON REST API
                               ▼
               ┌───────────────────────────────┐
               │    React 19 + Vite 7 PWA      │
               │  - Intelligens fókuszpont     │
               │  - Web Share API & OG tagek   │
               │  - Kedvencek & Offline mód    │
               └───────────────────────────────┘
```

* **Frontend (React 19 + Vite 7):** Ultrakönnyű mobil-első PWA felület, optimalizált tipográfiával, könyvjelzőzési rendszerrel és dinamikus Open Graph meta címkékkel.
* **Képi pipeline (3:4 Full-Bleed):** Mobil-optimalizált 3:4 arányú illusztrációk szigorú keretmentesítéssel (`remove_image_borders.py`), szöveg- és szimbólumtilalommal.
* **Intelligens fókuszpont (OpenCV):** Haar-Cascade arcfelismerő és Achanta vizuális feltűnőség algoritmus a képek kulcsterületének automatikus kiszámítására mobilos nézetben (`object-position`).
* **Szerzői jogvédelem (láthatatlan vízjel):** a szövegbe a pipeline Zero-Width Joiner (`\u200d`) ujjlenyomatot tesz minden 37. szó után. A reader a megjelenítéskor kiszedi (így a keresők és az olvasók ugyanazt a tiszta szöveget látják), és **csak másoláskor** teszi vissza a vágólapra. A képek feltöltéskor **láthatatlan, frekvenciatartományú vízjelet** kapnak, ami a WebP-kódolást is túléli (`scripts/pipeline/utils.py`).
* **Headless CMS réteg:** Headless WordPress REST API (`/wp-json/wp/v2/mese`), egyedi mezőkkel (ACF olvasási idő, kérdések a meséhez, fókuszpont koordináták).
* **SEO & Silózás:** Tiszta `[slug]-nepmese` struktúra, dinamikus Open Graph címkék, Schema.org `ShortStory` strukturált adatok, `robots.txt` és `sitemap.xml`.

---

## 🚀 Legújabb Funkciók és Fejlesztések

- **Keretmentes illusztrációk:** A korábbi CSS szegélyek eltávolítva; a generált képeken előforduló AI margók automatikus levágása és 3:4 méretarányra illesztése.
- **Képi szövegtilalom:** Illusztrációkon kizárva mindenféle betű, felirat, szám és pergamen-szalag a tisztán képi élményért.
- **Teljes szövegintegritás:** Az OCR-csonka mesék felülvizsgálata és hiánytalan visszaállítása a forrásdokumentumokból (pl. *A cigány fiú* teljes 22 bekezdése).
- **Közösségi megosztás & CTA:** Natív mobil megosztó (`navigator.share`) vágólap-másolási tartalékkal és figyelemfelkeltő felhívásokkal.
- **Friss mesék rendezése:** Az új mesék valós időben, legfrissebb azonosító szerint jelennek meg a kezdőlapon.
- **Kedvencek és Mentés:** Javított állapotkezelés a fejlécben és a mese végén található könyvjelzőkkel, azonnali szinkronnal a profilban.
- **Képoptimalizálás:** a feltöltött illusztrációk WebP-re alakulnak (max. 1200 px, ~150 KB a korábbi ~2 MB PNG helyett), láthatatlan képvízjellel.
- **Prerender SEO:** a build végén a `scripts/prerender.mjs` statikus HTML-t készít a főoldalra és a mesékre (`/mese/<slug>`), `sitemap.xml`-t és `spa.html` fallbacket. `PRERENDER_STRICT=1` miatt API-hiba esetén a build elbukik, nem megy csendben prerender nélküli verzió élesbe.
- **API-keményítés:** a felhasználólista lezárva (Cloudflare szabály + `backend/mesenet-api-hardening` WP bővítmény), az API `noindex`.
- **Akadálymentesség:** címkézett ikongombok, látható fókusz, `prefers-reduced-motion`, billentyűzettel elérhető karusszel; axe-core: 0 hiba a főoldalon, a mese- és a felfedezés oldalon.
- **Tipográfiai tisztítás:** Minden felesleges hosszú gondolatjel (`—`) normál kötőjelre (`-`) cserélve a felhasználói felületen és a mesékben.

---

## ✅ Tesztelés és Megbízhatóság ❇️

* **12/12 Zöld Playwright E2E teszt:** Teljes körű automatizált tesztcsomag (branding, carousels, navigáció, meta adatok).
* **Cross-Browser lefedettség:** Chromium, Firefox, WebKit és Mobile Safari tesztelve.
* **Biztonsági ellenőrzés:** 0 sebezhetőség (`npm audit fix` lefutva).
* **A11y (Akadálymentesség):** axe-core (WCAG A/AA) ellenőrzés mobil nézetben, világos és sötét módban: 0 hiba a főoldalon, a mese- és a felfedezés oldalon. Valódi képernyőolvasós teszt még nem történt.

---

## 🛠 Technológiai Stack 🧙‍♂️

* **Kliens:** React 19, Vite 7, CSS Variables, Workbox (PWA), Playwright
* **Backend & CMS:** Headless WordPress (PHP 8.2, MySQL), WP REST API + ACF Pro
* **Adatfeldolgozás & AI:** Python 3.12 (OpenCV, Pillow, Requests, BeautifulSoup, Google GenAI SDK)
* **Kiszolgálás & CI/CD:** Coolify (Dockerfile build, GitHub App webhook auto deploy), Docker, nginx, Cloudflare

---

## 🚢 Build és deploy

* `npm run build` = `vite build && node scripts/prerender.mjs`. A Dockerfile `PRERENDER_STRICT=1`-gyel építi, és `cp dist/spa.html dist/404.html`.
* A `dist/` nincs verziókövetés alatt, a Docker-build generálja. A `.dockerignore` kihagyja a `node_modules`, `dist`, `.venv`, `.git` mappákat.
* **Auto deploy:** a Coolify alkalmazás Git Source-a a GitHub App (`sandorkardos-github`), a push-ra a webhook automatikusan deployt indít. A „Public GitHub" forrás nem regisztrál webhookot.
* **Ne kapcsold be** a Cloudflare Bot Fight Mode-ot az `api.mesenet.hu`-n: a build prerender-lekérését blokkolhatja.

## 📚 Dokumentáció

* [docs/SESSION_2026-11-10.md](docs/SESSION_2026-11-10.md): a 2026. november 10-i munkamenet teljes leírása (mit, miért, hogyan ellenőrizhető, nyitott teendők).
* [NEXT_SESSION_SUMMARY.md](NEXT_SESSION_SUMMARY.md): előző munkamenet összefoglalója (a csonka mesékről szóló rész javítva).
* [scripts/pipeline/README.md](scripts/pipeline/README.md): az adatfeldolgozó lánc.

---

## 📈 Eredmények 🌟

* **Betöltési sebesség:** < 1.2 másodperces kezdeti betöltés mobilon.
* **Operatív költség:** Zero licencköltség, modern headless CMS architektúra.
* **100% SEO kompatibilitás:** Keresőbarát URL struktúra és gazdag találati meta adatok.

---

*Mesenet.hu — Mesék a legkisebbeknek, a legmodernebb technológiával.* 🧚✨
