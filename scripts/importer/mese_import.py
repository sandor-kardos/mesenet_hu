import os
import sys
import json
import re
import argparse
import io
import requests

# Ensure UTF-8 output so emojis render correctly in all terminals (e.g. PowerShell)
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from bs4 import BeautifulSoup
from dotenv import load_dotenv
import anthropic
import google.generativeai as genai
try:
    import dirtyjson
    HAS_DIRTYJSON = True
except ImportError:
    HAS_DIRTYJSON = False
try:
    from json_repair import repair_json
    HAS_JSON_REPAIR = True
except ImportError:
    HAS_JSON_REPAIR = False

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3-pro-image-preview")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL_NAME = os.getenv("CLAUDE_MODEL_NAME", "claude-sonnet-4-6")

WP_BASE_URL = os.getenv("WP_BASE_URL", "https://api.mesenet.hu").rstrip("/")
WP_USERNAME = os.getenv("WP_USERNAME")
WP_APP_PASSWORD = os.getenv("WP_APP_PASSWORD")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

if ANTHROPIC_API_KEY:
    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def slugify(text):
    """Generate a simple slug for duplication check."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def scrape_url(url):
    """Scrape the main story text and title from the given URL."""
    print(f"[*] Scraping URL: {url}")
    try:
        # User-Agent to prevent 403 Forbidden on some sites
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract title
        title = ""
        if soup.title:
            title = soup.title.string
        elif soup.find('h1'):
            title = soup.find('h1').get_text()
            
        # Extract text (grab all paragraph text as raw content)
        paragraphs = soup.find_all('p')
        text = "\n\n".join([p.get_text() for p in paragraphs])
        
        return title.strip(), text.strip()
    except Exception as e:
        print(f"[!] Error scraping URL: {e}")
        sys.exit(1)

def check_duplicate(slug):
    """Check WordPress REST API to see if a post with that slug already exists."""
    print(f"[*] Checking for duplicate slug: {slug}")
    url = f"{WP_BASE_URL}/wp-json/wp/v2/mese?slug={slug}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            posts = response.json()
            if len(posts) > 0:
                print(f"[!] Aborting: A story with slug '{slug}' already exists (WP Post ID: {posts[0]['id']}).")
                sys.exit(0)
    except Exception as e:
        print(f"[!] Warning: Could not check duplicate: {e}")

def generate_story(raw_text):
    """Send text to Anthropic Claude API to transform it into our strict JSON schema."""
    print(f"[*] Generating story with {CLAUDE_MODEL_NAME} API...")
    
    system_instruction = """
You are a professional child psychologist and master storyteller. Your job is to ENHANCE and FORMAT an existing story — NOT to summarize or shorten it.

CRITICAL CONTENT RULE:
- You MUST keep the FULL, original narrative text from start to finish. Include EVERY scene, EVERY character, EVERY plot point.
- DO NOT summarize, skip, or remove ANY part of the story.
- Your job is ONLY to enhance the full text with HTML tags, emojis, and dialogue formatting, not to shorten it.
- The 'content' field should contain the COMPLETE story text.

Strict Formatting Rules:
- Output MUST be a valid JSON object. No markdown code fences, no extra text outside the JSON.
- Use HTML <p> tags for paragraphs inside the "content" field.
- CRITICAL: Inside the "content" JSON string value, use ONLY single quotes for any HTML attributes. NEVER use double quotes inside HTML attributes, as they will break JSON parsing.
- Synchron-Súgó: Every dialogue line MUST start with a character-emoji assigned to that specific animal/character. E.g. 🦊 'Hello there!'
- Ensure every animal character gets its own unique emoji consistently applied throughout the ENTIRE story.
- Whispering/Quiet: Use <i> tags (Italicized text).
- Shouting/Loud: Use <b> tags (Bold text).
- Safety Rule: NEVER include the phrase "haggis komment" or similar meta-comments.
- For age_group choose ONE value from: 0-3, 4-6, 7+
- For mood choose ONE value from: Könnyed, Kalandos, Komoly

Output Format: Return ONLY a valid JSON object with these exact keys:
{
  "title": "Story Title in Hungarian",
  "content": "<p>FULL complete HTML story content — all paragraphs, all scenes, nothing removed</p>",
  "hero_image": "Single emoji representing the story",
  "reading_time": 5,
  "question_1": "Discussion question 1 in Hungarian",
  "question_2": "Discussion question 2 in Hungarian",
  "question_3": "Discussion question 3 in Hungarian",
  "age_group": "4-6",
  "mood": "Kalandos",
  "scene_description": "A vivid 2-3 sentence description of the most visually striking scene from this story — characters present, setting, action, magical elements, emotional mood.",
  "tags": ["népmese", "Benedek Elek", "varázslat", "állatok", "bátorság"]
}
"""
    try:
        if not ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is missing.")
        
        message = anthropic_client.messages.create(
            model=CLAUDE_MODEL_NAME,
            max_tokens=8000,
            system=system_instruction,
            messages=[
                {"role": "user", "content": f"Transform this text into the requested JSON story format. Remember: keep EVERY word of the original narrative.\n\n{raw_text}"}
            ]
        )
        
        # Extract the text content block from the response
        result_text = ""
        for block in message.content:
            if block.type == "text":
                result_text = block.text
                break
        
        if not result_text:
            raise ValueError("No text block returned from Claude.")
        
        # Robustly extract first JSON object even if surrounded by extra text
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if json_match:
            result_text = json_match.group(0)
        else:
            result_text = result_text.replace('```json', '').replace('```', '').strip()
        
        # Normalize Windows CRLF line endings which can trip up json.loads
        result_text = result_text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Try strict parser first
        try:
            data = json.loads(result_text)
        except json.JSONDecodeError as json_err:
            # Dump raw output for debugging
            with open("claude_raw_debug.txt", "w", encoding="utf-8") as f:
                f.write(result_text)
            print(f"[~] json.loads failed: {json_err}")
            # json-repair handles unescaped quotes inside HTML content strings
            if HAS_JSON_REPAIR:
                print(f"[~] Retrying with json-repair...")
                repaired = repair_json(result_text)
                data = json.loads(repaired)
                print(f"[~] json-repair parsed successfully!")
            elif HAS_DIRTYJSON:
                print(f"[~] Retrying with dirtyjson...")
                parsed = dirtyjson.loads(result_text)
                data = {k: v for k, v in parsed.items()}
                print(f"[~] dirtyjson parsed successfully!")
            else:
                raise
        # Assemble final image prompt from fixed template + dynamic scene
        scene = data.get("scene_description", "")
        if not scene:
            print("[!] Warning: scene_description missing from Claude response. Using title as fallback.")
            scene = data.get("title", "A magical fairy tale scene")
        image_prompt = (
            "A classic European folk-tale children's book illustration. "
            f"SCENE: {scene} "
            "STYLE & MOOD: 2D flat vector art mixed with subtle watercolor textures. "
            "Minimalist and atmospheric. Vintage storybook aesthetic. "
            "Muted, rich color palette suitable for dark mode and bedtime reading. "
            "Strong use of shadows, silhouettes, and soft moody lighting. 3:4 ratio "
            "RESTRICTIONS: NO 3D, NO CGI, NO Pixar, NO Disney style, NO frame, "
            "no glossy plastic textures, no text, no hyperrealism, no decorative frame."
        )
        data["image_prompt"] = image_prompt
        
        print(f"[*] Tags from Claude: {data.get('tags', [])}")
        return data
        
    except Exception as e:
        print(f"[!] Error generating story with Anthropic: {e}")
        sys.exit(1)

def generate_hero_image(prompt):
    """Generate image via Gemini Imagen API using the google-genai client."""
    print(f"[*] Generating Hero Image with {GEMINI_IMAGE_MODEL}...")
    try:
        # google-generativeai >= 0.8 exposes Imagen via google.genai client
        from google import genai as google_genai
        client = google_genai.Client(api_key=GEMINI_API_KEY)
        result = client.models.generate_images(
            model=GEMINI_IMAGE_MODEL,
            prompt=prompt,
            number_of_images=1,
            aspect_ratio="3:4",
        )
        if not result.generated_images:
            raise Exception("No image returned from Gemini.")
        return result.generated_images[0]
    except Exception as e:
        print(f"[!] Warning: Image generation skipped: {e}")
        return None

def upload_media_to_wp(image_object, slug):
    """Upload visual media to WP API and return its ID."""
    if not image_object:
        return None
        
    print("[*] Uploading generated image to WordPress...")
    
    url = f"{WP_BASE_URL}/wp-json/wp/v2/media"
    auth = (WP_USERNAME, WP_APP_PASSWORD)
    
    try:
        # google-genai GeneratedImage has .image.image_bytes as raw PNG bytes
        if hasattr(image_object, 'image') and hasattr(image_object.image, 'image_bytes'):
            img_bytes = image_object.image.image_bytes
        else:
            # Fallback: PIL image object
            img_byte_arr = io.BytesIO()
            image_object.image.save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
        
        headers = {
            'Content-Disposition': f'attachment; filename={slug}_hero.png',
            'Content-Type': 'image/png'
        }
        
        response = requests.post(url, headers=headers, data=img_bytes, auth=auth)
        response.raise_for_status()
        
        media_data = response.json()
        print(f"[+] Image uploaded with ID: {media_data['id']}")
        return media_data['id']
    except Exception as e:
        print(f"[!] Warning: Error uploading media to WP: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None

def get_term_id(taxonomy, term_name):
    """Helper to resolve Taxonomy term names to Term IDs for the WP REST API."""
    if not term_name: return None
    url = f"{WP_BASE_URL}/wp-json/wp/v2/{taxonomy}?search={term_name}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            terms = response.json()
            for term in terms:
                if term_name.lower() in term['name'].lower():
                    return term['id']
    except:
        pass
    return None

def get_or_create_tag_ids(tag_names):
    """Resolve tag name strings to WP story_tag IDs, creating any that don't exist."""
    if not tag_names:
        return []
    auth = (WP_USERNAME, WP_APP_PASSWORD)
    tag_ids = []
    for name in tag_names:
        name = name.strip()
        if not name:
            continue
        # 1. Search for existing tag in the story_tag taxonomy
        search_url = f"{WP_BASE_URL}/wp-json/wp/v2/story_tag?search={name}&per_page=10"
        print(f"[~] Searching story_tag: '{name}' ...")
        found_id = None
        try:
            r = requests.get(search_url, auth=auth)
            print(f"    GET {search_url} -> {r.status_code}")
            if r.status_code == 200:
                for tag in r.json():
                    if tag['name'].lower() == name.lower():
                        found_id = tag['id']
                        break
        except Exception as e:
            print(f"[!] Warning: Could not search tag '{name}': {e}")
        
        if found_id:
            print(f"[~] story_tag found: '{name}' (ID: {found_id})")
            tag_ids.append(found_id)
        else:
            # 2. Create new story_tag
            create_url = f"{WP_BASE_URL}/wp-json/wp/v2/story_tag"
            try:
                r = requests.post(create_url, json={"name": name}, auth=auth)
                print(f"    POST {create_url} -> {r.status_code}: {r.text[:100]}")
                r.raise_for_status()
                new_id = r.json()['id']
                print(f"[+] story_tag created: '{name}' (ID: {new_id})")
                tag_ids.append(new_id)
            except Exception as e:
                print(f"[!] Warning: Could not create tag '{name}': {e}")
    
    print(f"[*] Final story_tag ID list: {tag_ids}")
    return tag_ids

def upload_to_wp(story_data, media_id=None):
    """Upload the formatted data to WordPress as a Draft Custom Post Type 'mese'."""
    print("[*] Uploading to WordPress API...")
    
    # Resolve custom taxonomy categories to IDs
    age_group_id = get_term_id("age_group", story_data.get("age_group"))
    mood_id = get_term_id("mood", story_data.get("mood"))
    
    # Resolve/create story_tag IDs
    tag_ids = get_or_create_tag_ids(story_data.get("tags", []))
    
    # -- Build enhanced content with frontend features --
    image_prompt = story_data.get("image_prompt", "")
    content = story_data.get("content", "")

    # Feature 1: Wrap featured image in a lightbox container
    # (The image is rendered by the theme via featured_media; we inject a JS hook)
    LIGHTBOX_CSS_JS = """
<style>
.mese-image-container{position:relative;cursor:zoom-in;display:inline-block;width:100%;text-align:center;margin-bottom:1.5em;}
.mese-image-container img{max-width:100%;border-radius:12px;transition:transform .3s ease,box-shadow .3s ease;}
.mese-image-container img:hover{box-shadow:0 8px 32px rgba(0,0,0,.35);}
#mese-lightbox-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;align-items:center;justify-content:center;cursor:zoom-out;}
#mese-lightbox-overlay.active{display:flex;}
#mese-lightbox-overlay img{max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;animation:meseFadeIn .25s ease;}
@keyframes meseFadeIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
</style>
<div id='mese-lightbox-overlay'><img id='mese-lightbox-img' src='' alt='Mese illusztráció nagyítva'/></div>
<script>
(function(){
  var overlay=document.getElementById('mese-lightbox-overlay');
  var lbImg=document.getElementById('mese-lightbox-img');
  document.querySelectorAll('.mese-image-container img,.wp-post-image').forEach(function(img){
    img.style.cursor='zoom-in';
    img.addEventListener('dblclick',function(e){
      e.stopPropagation();
      lbImg.src=this.src;
      overlay.classList.add('active');
    });
  });
  overlay.addEventListener('click',function(){overlay.classList.remove('active');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')overlay.classList.remove('active');});
})();
</script>"""

    # Feature 2: Alkotóműhely (Creative Workshop) CTA section
    ALKOTOMUHELY_HTML = """
<div class='mese-alkotomuhely' style='margin-top:2.5em;padding:2em 1.5em;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%);border-radius:20px;text-align:center;border:2px solid rgba(255,200,100,.25);box-shadow:0 4px 24px rgba(0,0,0,.4);'>
  <div style='font-size:3em;margin-bottom:.3em;'>🎨</div>
  <h3 style='color:#ffd700;font-size:1.4em;margin:0 0 .6em;letter-spacing:.5px;'>Készítsd el a saját illusztrációdat!</h3>
  <p style='color:rgba(255,255,255,.8);font-size:1em;margin:0 0 1.4em;line-height:1.6;max-width:480px;display:inline-block;'>
    Rajzold le, mi tetszett a legjobban a mesében, töltsd fel, és a <strong style='color:#ffd700;'>Mesegép</strong> jövő héten életre kelti!
  </p>
  <div>
    <input type='file' id='mese-drawing-file-input' accept='image/*' style='display:none;'/>
    <button id='mese-drawing-upload-btn' class='mese-btn'
      style='background:linear-gradient(135deg,#ffd700,#ffaa00);color:#1a1a2e;border:none;padding:.75em 2em;border-radius:50px;font-size:1em;font-weight:700;cursor:pointer;letter-spacing:.5px;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 16px rgba(255,200,0,.35);'
      onmouseover='this.style.transform="scale(1.05)";this.style.boxShadow="0 6px 20px rgba(255,200,0,.55)"'
      onmouseout='this.style.transform="scale(1)";this.style.boxShadow="0 4px 16px rgba(255,200,0,.35)"'
      onclick='document.getElementById(\"mese-drawing-file-input\").click()'>
      ✏️ Rajz feltöltése
    </button>
  </div>
  <p style='color:rgba(255,255,255,.4);font-size:.75em;margin-top:1em;'>PNG, JPG vagy rajz · max. 10 MB</p>
</div>"""

    # Assemble final content
    content += ALKOTOMUHELY_HTML
    content += LIGHTBOX_CSS_JS

    # Append image prompt as HTML comment (easy to copy from WP source)
    if image_prompt:
        content += f"\n\n<!-- IMAGE PROMPT:\n{image_prompt}\n-->"


    payload = {
        "title": story_data.get("title", "Mesebeli történet"),
        "content": content,
        "status": "draft",
        "acf": {
            "hero_image": story_data.get("hero_image", "📖"),
            "reading_time": story_data.get("reading_time", 5),
            "question_1": story_data.get("question_1", ""),
            "question_2": story_data.get("question_2", ""),
            "question_3": story_data.get("question_3", "")
        }
    }
    
    if media_id:
        payload["featured_media"] = media_id
    if age_group_id:
        payload["age_group"] = [age_group_id]
    if mood_id:
        payload["mood"] = [mood_id]
    if tag_ids:
        payload["story_tag"] = tag_ids
        print(f"[*] Sending story_tag IDs to WP: {tag_ids}")
        
    url = f"{WP_BASE_URL}/wp-json/wp/v2/mese"
    auth = (WP_USERNAME, WP_APP_PASSWORD)
    
    try:
        response = requests.post(url, json=payload, auth=auth)
        response.raise_for_status()
        post_data = response.json()
        
        # Build edit URL (assuming standard WP admin structure)
        edit_url = f"{WP_BASE_URL}/wp-admin/post.php?post={post_data['id']}&action=edit"
        
        print(f"\n[+] Success! Story uploaded as Draft.")
        print(f"[+] Edit URL: {edit_url}")
        
        print(f"\n[🎨] Image Generation Prompt (Midjourney/DALL-E/Imagen 3):")
        print(f"> {story_data.get('image_prompt', 'No prompt generated.')}\n")
        
    except requests.exceptions.RequestException as e:
        print(f"[!] Error uploading to WordPress: {e}")
        if e.response is not None:
            print(f"Response: {e.response.text}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Mesenet Auto-Importer Robot")
    parser.add_argument("url", help="URL to scrape the story from")
    args = parser.parse_args()
    
    if not ANTHROPIC_API_KEY or not GEMINI_API_KEY or not WP_USERNAME or not WP_APP_PASSWORD:
        print("[!] Constraints Error: Missing required environment variables.")
        print("    Please copy .env.example to .env and fill in your actual credentials.")
        sys.exit(1)

    # 1. Scrape
    title, raw_text = scrape_url(args.url)
    if not raw_text:
        print("[!] Could not extract any text from the URL.")
        sys.exit(1)
        
    # 2. Duplicate Check
    slug = slugify(title) if title else "unnamed-story"
    check_duplicate(slug)
    
    # 3. AI Text Processing (Claude)
    story_data = generate_story(raw_text)
    
    # 4. AI Image Generation (Gemini)
    media_id = None
    image_prompt = story_data.get("image_prompt")
    if image_prompt:
        gemini_image = generate_hero_image(image_prompt)
        if gemini_image:
            media_id = upload_media_to_wp(gemini_image, slug)
    
    # 5. Upload to WordPress
    upload_to_wp(story_data, media_id=media_id)
    
    # 6. Print final image prompt for easy copy-paste
    if image_prompt:
        print("\n" + "="*60)
        print("[🎨] IMAGE PROMPT (copy-paste to Midjourney/DALL-E/Imagen 3):")
        print("="*60)
        print(image_prompt)
        print("="*60 + "\n")

if __name__ == "__main__":
    main()
