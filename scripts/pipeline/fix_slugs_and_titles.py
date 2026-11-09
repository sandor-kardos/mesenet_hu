import json
import os
import re
import shutil
import unicodedata

BASE_DIR = r"C:\AI\Antigravity\mesenet_hu"
ILL_DIR = os.path.join(BASE_DIR, "illustrations")

def normalize_title(title: str) -> str:
    t = title.strip()
    # Cyrillic artifact removal
    t = t.replace('\u043e', 'o').replace('\u0433', 'g').replace('\u041e', 'O').replace('\u0413', 'G')
    
    # Specific known title fixes
    replacements = [
        ("A VAK KIRÁLY", "A vak király"),
        ("A BOLTOS HÁROM LÁNYA", "A boltos három lánya"),
        ("A cigány fiú", "A cigány fiú"),
        ("AZ ARANYHAJÚ HERCEGNŐKISASSZONY", "Az aranyhajú hercegkisasszony"),
        ("AZ ÖZIKE", "Az őzike"),
        ("A VERES TEHÉN", "A veres tehén"),
        ("A TÜNDÉRKISASSZONY ÉS A CIGÁNYFLÁNY", "A tündérkisasszony és a cigányleány"),
        ("Az ördög-szerető", "Az ördögszerető"),
        ("Jankó és a három elátkozott királykisasszony", "Jankó és a három elátkozott királykisasszony"),
        ("Ráadó és Anyicska", "Ráadó és Anyicska"),
        ("Az ördög és a két lány", "Az ördög és a két lány"),
        ("A KIS MALACZ ÉS A FARKASOK", "A kis malac és a farkasok"),
        ("Zsuzska és az ördög", "Zsuzska és az ördög"),
        ("Fehérlófia", "Fehérlófia"),
        ("A nyelvesleány", "A nyelvesleány"),
        ("Gagyi gazda", "Gagyi gazda"),
        ("Babszem Jankó", "Babszem Jankó"),
        ("Dongó meg Mohácsi", "Dongó meg Mohácsi"),
        ("A szomorú királykisasszony", "A szomorú királykisasszony"),
        ("A MACSKA ÉS AZ EGÉR", "A macska és az egér"),
        ("A FARKAS-TANYA", "A farkastanya"),
        ("Panczimanczi", "Pancimanci"),
        ("A HÓLYAG, SZALMASZÁL ÉS A TÜZES ÜSZÖK", "A hólyag, a szalmaszál és a tüzes üszök"),
        ("A KIS GÖMBÖCZ", "A kis gömböc"),
        ("Farkas-barkas", "Farkas-barkas"),
        ("A KAKASKA ÉS A JURKIKE", "A kakaska és a jércike"),
        ("A két koszoru", "A két koszorú"),
        ("A KÓRÓ ÉS A KIS MADÁR", "A kóró és a kismadár"),
        ("A KIS KÖDMÖN", "A kisködmön"),
        ("ICZINKE-PICZINKE", "Icinke-picinke"),
        ("MÉRT HARAGSZIK A DISZNÓ A KUTYÁRA, A KUTYA A MACSKÁRA, A MACSKA AZ EGÉRRE?", "Miért haragszik a disznó a kutyára, a kutya a macskára, a macska az egérre?"),
        ("TALÁLOS MESÉK", "Találós mesék"),
        ("Csali-mesék", "Csalimesék"),
    ]
    for old, new in replacements:
        if t.lower() == old.lower() or t == old:
            return new
            
    if t.isupper():
        words = t.lower().split()
        if words:
            words[0] = words[0].capitalize()
            t = " ".join(words)
    return t

def build_max_seo_slug(title: str, collection: str = "Magyar Népmese") -> str:
    # 1. Clean cyrillic and specific OCR quirks
    t = title.lower()
    t = t.replace('\u043e', 'o').replace('\u0433', 'g')
    t = t.replace("cz", "c")
    t = t.replace("flany", "lany")
    t = t.replace("hayu", "haju")
    t = t.replace("hercegnoikisasszony", "hercegkisasszony")
    t = t.replace("kiralkiskisasszony", "kiralykisasszony")
    t = t.replace("jurkike", "jercike")
    
    # 2. Hungarian transliteration
    char_map = str.maketrans({
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ö': 'o', 'ő': 'o',
        'ú': 'u', 'ü': 'u', 'ű': 'u'
    })
    t = t.translate(char_map)
    
    # 3. Alphanumeric only
    t = re.sub(r'[^a-z0-9\s-]', ' ', t)
    words = t.split()
    base_slug = "-".join(words)
    
    # 4. Suffix based on collection
    suffix = "nepmese" if "népmese" in collection.lower() or "nepmese" in collection.lower() else "mese"
    if not base_slug.endswith(suffix):
        return f"{base_slug}-{suffix}"
    return base_slug

def run():
    print("[*] Loading JSON files...")
    enriched_path = os.path.join(BASE_DIR, "tales_enriched.json")
    watermarked_path = os.path.join(BASE_DIR, "tales_watermarked.json")
    with_images_path = os.path.join(BASE_DIR, "tales_with_images.json")
    spell_path = os.path.join(BASE_DIR, "tales_spell_corrected.json")

    with open(enriched_path, "r", encoding="utf-8") as f:
        enriched = json.load(f)
    with open(watermarked_path, "r", encoding="utf-8") as f:
        watermarked = json.load(f)
    with open(with_images_path, "r", encoding="utf-8") as f:
        with_images = json.load(f)

    # Build watermark map by index
    wm_by_index = {i: t for i, t in enumerate(watermarked)}

    # Update enriched & watermarked
    for i, t in enumerate(enriched):
        clean_t = normalize_title(t.get("title", ""))
        coll = t.get("collection", "Magyar Népmese")
        new_slug = build_max_seo_slug(clean_t, coll)
        
        t["title"] = clean_t
        t["slug"] = new_slug
        t["seo_title"] = f"{clean_t} - {coll} szöveg és illusztráció"
        t["seo_description"] = f"Olvasd el {clean_t} című {coll.lower()}t a Mesenet.hu-n. Ingyenes online mese beszélgetésindító kérdésekkel."
        t["seo_alt_text"] = f"{clean_t} {coll.lower()} illusztráció"

        if i in wm_by_index:
            wm = wm_by_index[i]
            wm["title"] = clean_t
            wm["slug"] = new_slug
            wm["seo_title"] = t["seo_title"]
            wm["seo_description"] = t["seo_description"]
            wm["seo_alt_text"] = t["seo_alt_text"]

    # Update with_images and sync illustrations
    for i, t in enumerate(with_images):
        clean_t = normalize_title(t.get("title", ""))
        coll = t.get("collection", "Magyar Népmese")
        new_slug = build_max_seo_slug(clean_t, coll)
        old_slug = t.get("slug", "")

        t["title"] = clean_t
        t["slug"] = new_slug
        t["seo_title"] = f"{clean_t} - {coll} szöveg és illusztráció"
        t["seo_description"] = f"Olvasd el {clean_t} című {coll.lower()}t a Mesenet.hu-n. Ingyenes online mese beszélgetésindító kérdésekkel."
        t["seo_alt_text"] = f"{clean_t} {coll.lower()} illusztráció"

        # Ensure watermarked content is present
        if i in wm_by_index:
            t["content"] = wm_by_index[i].get("content")
            t["watermarked_text"] = wm_by_index[i].get("watermarked_text")

        # Sync image filename to new slug
        old_local = t.get("local_path")
        new_img_name = f"{new_slug}.png"
        new_local = os.path.join(ILL_DIR, new_img_name)

        if old_local and os.path.exists(old_local):
            if not os.path.exists(new_local):
                shutil.copy2(old_local, new_local)
                print(f"  [+] Copied image: {os.path.basename(old_local)} -> {new_img_name}")
            t["local_path"] = new_local
        else:
            # Check if an illustration exists for old slug
            cand = os.path.join(ILL_DIR, f"{old_slug}.png")
            if os.path.exists(cand) and not os.path.exists(new_local):
                shutil.copy2(cand, new_local)
                print(f"  [+] Copied image: {old_slug}.png -> {new_img_name}")
            if os.path.exists(new_local):
                t["local_path"] = new_local

    # Save updated JSONs
    with open(enriched_path, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)
    with open(watermarked_path, "w", encoding="utf-8") as f:
        json.dump(watermarked, f, ensure_ascii=False, indent=2)
    with open(with_images_path, "w", encoding="utf-8") as f:
        json.dump(with_images, f, ensure_ascii=False, indent=2)

    print(f"[+] All JSONs updated with Max SEO slugs and Title Case!")
    print("\nSample updated slugs (first 6):")
    for t in with_images[:6]:
        print(f" - {t['title']} -> {t['slug']}")

if __name__ == "__main__":
    run()

