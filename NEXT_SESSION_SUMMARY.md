# Mesenet.hu — Munkamenet Összefoglaló & Következő Lépések 📜✨

**Dátum:** 2026. november 9.  
**Projekt:** Mesenet.hu (PWA + Headless WordPress Pipeline)  
**Élő frontend:** [mesenet.hu](https://mesenet.hu)  
**Headless API:** [api.mesenet.hu](https://api.mesenet.hu)

---

## 🎯 1. Ebben a munkamenetben elvégzett feladatok

### A. Képek optimalizálása & Keretmentesítés
- **CSS keret eltávolítása:** A `.story-image-mock` és `.story-image-placeholder` 2px-es szegélyei törölve lettek (`src/index.css`).
- **AI margók levágása (`remove_image_borders.py`):** Létrejött egy képfeldolgozó automatizmus, amely érzékeli a képek szélén lévő fehér/fekete sávokat, levágja a margót a valódi képtartalom határáig, majd veszteségmentesen visszaskálázza 3:4 méretarányra. Ezzel *A veres tehén* 43px-es AI kerete is megszűnt.
- **Intelligens fókuszpont (`focal_point.py`):** OpenCV Haar-Cascade arcfelismerő és Achanta vizuális feltűnőség algoritmus segítségével a rendszer kiszámítja a képek kulcsterületét, amit a mobil olvasó dinamikusan alkalmaz (`object-position`).

### B. *A cigány fiú* teljes javítása
- **Hiányzó szöveg visszaállítása:** Kiderült, hogy a korábbi OCR 733 karakternél megszakadt. Visszanyertük a `tales_raw.json` 50–53. oldaláról a teljes, 22 bekezdéses mesét az elejétől a végéig (*„...míg utoljára elővett egy botot, úgy elverte, hogy még talán most is veri, ha félbe nem hagyta.”*).
- **Új generált illusztráció:** Az `image-generator` alkotóval teljesen új képet hoztunk létre:
  - 3:4 függőleges arány,
  - 100% full-bleed (margó és díszkeret nélkül),
  - Teljesen szöveg- és feliratmentes (sem latin betűk, sem szalagok nincsenek rajta).
- **WordPress szinkronizáció:** Az új kép feltöltve (Media ID: **110**), a Post 101 frissítve a teljes vízjelezett szöveggel és új fókuszponttal (`34.4% 58.1%`).

### C. SEO, Silózás és Megosztás
- **Max SEO formátum:** `[tiszta-nev]-nepmese` struktúra bevezetve a WP-ben és a React routingban (`/mese/:slug`).
- **Open Graph & Meta címkék:** Dinamikus OG és Twitter címkék a [`ReaderPage.jsx`](file:///c:/AI/mesenet_hu/src/pages/ReaderPage.jsx)-ben, globális címkék az [`index.html`](file:///c:/AI/mesenet_hu/index.html)-ben.
- **Schema.org:** Automatikus `ShortStory` JSON-LD strukturált adat minden meséhez.
- **Közösségi megosztó (`SocialShareButton.jsx`):** Natív mobil Web Share API támogatás vágólapos tartalékkal és figyelemfelkeltő felhívásokkal ("Oszd meg a mesét!").
- **Keresőmotor fájlok:** Létrehozva a [`robots.txt`](file:///c:/AI/mesenet_hu/public/robots.txt) és a [`sitemap.xml`](file:///c:/AI/mesenet_hu/public/sitemap.xml).

### D. UI Javítások & Tipográfia
- **"Friss mesék" sorrend:** A [`HomePage.jsx`](file:///c:/AI/mesenet_hu/src/pages/HomePage.jsx) a legújabb ID-jú meséket jeleníti meg legelöl.
- **Kedvencek / Mentés funkció:** A [`ReadingContext.jsx`](file:///c:/AI/mesenet_hu/src/context/ReadingContext.jsx) típus-összehasonlítása javítva, a fejléc könyvjelző gombja és a `LogPage` azonnal szinkronizál.
- **Em-dash gondolatjelek:** Az összes látható hosszú gondolatjel (`—`) normál kötőjelre (`-`) lett cserélve.
- **Képszerkesztő eltávolítása:** A rajzoló/alkotóműhely gomb kikerült a Reader felületről.

### E. Minőségbiztosítás & Tesztelés
- **Playwright E2E tesztcsomag:** 12/12 teszt zöld (Chromium, Firefox, WebKit, Mobile Safari).
- **Biztonsági audit:** `npm audit fix` lefutva, sebezhetőségek elhárítva.
- **Git:** Minden változtatás összefésülve és felküldve a `main` ágra (`origin/main`).

---

## 🔍 2. Kulcsfontosságú felfedezés a következő munkamenetre

Az audit során kiderült, hogy a korábbi LLM enrich/cleanup lépés során (token limit miatt) nemcsak *A cigány fiú*, hanem néhány további mese szövege is csonkán került a köztes JSON-ökbe:
- **A vak király (Post 97):** A forrásban (`tales_raw.json`) **31 593 karakter**, a WP-n jelenleg csak **11 483 karakter** (a küldetés egyharmadánál megszakad).
- **A tündérkisasszony és a cigányleány:** A forrásban teljes, de az enriched fájlban 1 368 karakternél elvágva.
- **Jankó és a három elátkozott királykisasszony:** 356 karakternél megszakadt.

> [!IMPORTANT]
> A `c:\AI\Antigravity\mesenet_hu\tales_raw.json` fájlban mind a 33 mese **teljes, hiánytalan forrásszövege rendelkezésre áll** az 1862-es Arany László kötetből!

---

## 📋 3. Következő munkamenet teendői (Action Plan)

1. **A vak király (Post 97) szövegének teljessé tétele:**
   - A 31 593 karakteres forrásszöveg bekezdésekre bontása, tisztítása (gondolatjelek, elütések), ZWJ vízjelezése és feltöltése a WordPress 97-es posztjára.
2. **Automatizált szöveg-szinkronizáló script:**
   - Egy egyszerű scripttel átvezetni a `tales_raw.json` teljes szövegeit a `tales_enriched.json`-be és `tales_with_images.json`-be, hogy egyetlen csonka mese se maradjon az adatbázisban.
3. **Új mesék szakaszos élesítése:**
   - A meglévő 6 éles mese mellé újabb mesék felvitele a WordPressre, ellenőrzött 3:4 arányú, szöveg- és keretmentes illusztrációkkal.
4. **Végpontok ellenőrzése:**
   - Coolify build és PWA service worker frissülésének ellenőrzése a böngészőben.
