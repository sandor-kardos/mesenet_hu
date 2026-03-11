import os
import sys
import json
import re
import argparse
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
WP_BASE_URL = os.getenv("WP_BASE_URL", "https://api.mesenet.hu").rstrip("/")
WP_USERNAME = os.getenv("WP_USERNAME")
WP_APP_PASSWORD = os.getenv("WP_APP_PASSWORD")

# Use User's requested model if provided, else fallback to standard pro
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-pro")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

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
    """Send text to Gemini API to transform it into our strict JSON schema."""
    print(f"[*] Generating story with {GEMINI_MODEL_NAME} API...")
    
    system_instruction = """
You are a professional child psychologist and master storyteller. Transform the input text into a magical children's story.

Strict Formatting Rules:
- Use HTML <p> tags for paragraphs.
- Synchron-Súgó: Every dialogue line MUST start with a unique character-emoji. Each character needs a distinct emoji. Example: 🦊 "Hello there!"
- Whispering/Quiet: Use <i> tags (Italicized text).
- Shouting/Loud: Use <b> tags (Bold text).
- Safety Rule: NEVER include the phrase "haggis komment" or similar meta-comments.
- Categories: Assign Age (0-3, 4-6, 7+) and Mood (Könnyed, Kalandos, Komoly).

Output Format: You must return a strict JSON object only, matching this exact schema:
{
  "title": "Story Title",
  "content": "<p>Formatted HTML story content...</p>",
  "hero_image": "Single emoji representing the story",
  "reading_time": 5,
  "question_1": "Discussion question 1",
  "question_2": "Discussion question 2",
  "question_3": "Discussion question 3",
  "age_group": "0-3" | "4-6" | "7+",
  "mood": "Könnyed" | "Kalandos" | "Komoly",
  "image_prompt": "A detailed 16:9 DALL-E/Imagen 3 prompt for a 3:4 portrait illustration (European folk-tale style, watercolor vector)"
}
"""
    try:
        # Initialize Gemini Model
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL_NAME, 
            system_instruction=system_instruction
        )
        
        # Enforce JSON output format via generation_config
        response = model.generate_content(
            f"Transform this text into the requested JSON story format:\n\n{raw_text}",
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        result_text = response.text
        # Optional sanitization in case the model wraps it in markdown blocks
        result_text = result_text.replace('```json', '').replace('```', '').strip()
        data = json.loads(result_text)
        return data
        
    except Exception as e:
        print(f"[!] Error generating story with AI: {e}")
        sys.exit(1)

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

def upload_to_wp(story_data):
    """Upload the formatted data to WordPress as a Draft Custom Post Type 'mese'."""
    print("[*] Uploading to WordPress API...")
    
    # Attempt to resolve categories to IDs. (Depends on generic WP routing)
    age_group_id = get_term_id("age_group", story_data.get("age_group"))
    mood_id = get_term_id("mood", story_data.get("mood"))
    
    payload = {
        "title": story_data.get("title", "Mesebeli történet"),
        "content": story_data.get("content", ""),
        "status": "draft",
        "acf": {
            "hero_image": story_data.get("hero_image", "📖"),
            "reading_time": story_data.get("reading_time", 5),
            "question_1": story_data.get("question_1", ""),
            "question_2": story_data.get("question_2", ""),
            "question_3": story_data.get("question_3", "")
        }
    }
    
    if age_group_id:
        payload["age_group"] = [age_group_id]
        
    if mood_id:
        payload["mood"] = [mood_id]
        
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
    
    if not GEMINI_API_KEY or not WP_USERNAME or not WP_APP_PASSWORD:
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
    
    # 3. AI Processing
    story_data = generate_story(raw_text)
    
    # 4. Upload to WordPress
    upload_to_wp(story_data)

if __name__ == "__main__":
    main()
