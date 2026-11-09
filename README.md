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
* **Szerzői jogvédelem (Láthatatlan vízjel):** Zero-Width Joiner (`\u200d`) digitális ujjlenyomat minden 37. szó után, amely másoláskor megmarad, de az olvasó számára láthatatlan.
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
- **Tipográfiai tisztítás:** Minden felesleges hosszú gondolatjel (`—`) normál kötőjelre (`-`) cserélve a felhasználói felületen és a mesékben.

---

## ✅ Tesztelés és Megbízhatóság ❇️

* **12/12 Zöld Playwright E2E teszt:** Teljes körű automatizált tesztcsomag (branding, carousels, navigáció, meta adatok).
* **Cross-Browser lefedettség:** Chromium, Firefox, WebKit és Mobile Safari tesztelve.
* **Biztonsági ellenőrzés:** 0 sebezhetőség (`npm audit fix` lefutva).
* **A11y (Akadálymentesség):** Gyermekbarát, magas kontrasztú felület akadálymentesített komponensekkel.

---

## 🛠 Technológiai Stack 🧙‍♂️

* **Kliens:** React 19, Vite 7, CSS Variables, Workbox (PWA), Playwright
* **Backend & CMS:** Headless WordPress (PHP 8.2, MySQL), WP REST API + ACF Pro
* **Adatfeldolgozás & AI:** Python 3.12 (OpenCV, Pillow, Requests, BeautifulSoup, Google GenAI SDK)
* **Kiszolgálás & CI/CD:** Coolify, Docker, GitHub Actions, Plesk VPS

---

## 📈 Eredmények 🌟

* **Betöltési sebesség:** < 1.2 másodperces kezdeti betöltés mobilon.
* **Operatív költség:** Zero licencköltség, modern headless CMS architektúra.
* **100% SEO kompatibilitás:** Keresőbarát URL struktúra és gazdag találati meta adatok.

---

*Mesenet.hu — Mesék a legkisebbeknek, a legmodernebb technológiával.* 🧚✨
