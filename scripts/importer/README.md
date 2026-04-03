# Mesenet Auto-Importer Robot

A Python automation script that streamlines content ingestion for the `mesenet.hu` WordPress backend.

## Architecture & Workflow

1.  **Scraping**: Fetches a given URL and extracts paragraph text using `BeautifulSoup`.
2.  **Duplicate Safety**: Calls the WordPress REST API (`/wp-json/wp/v2/mese`) to verify if the scraped story slug already exists.
3.  **AI Engine**: Feeds the raw text into the **Gemini API** using a prompt carefully engineered for the "Mesenet Story Engine". This transforms the content into a strictly formatted JSON object adhering to formatting rules (HTML tags, Synchron-Súgó emojis, child psychology guidelines).
4.  **WordPress Upload**: Automatically maps the JSON response into WP Custom Fields (ACF), Taxonomies, and Post Content, uploading it as a Draft.
5.  **Bonus**: Generates an optimized Midjourney / Imagen 3 generation prompt to use for the Featured Image.

## Setup Instructions

1.  Navigate to the directory:
    ```bash
    cd scripts/importer
    ```
    1b. USE mese [LINK] to import a story

2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env
    ```
    Populate the `.env` file with your actual Gemini API Key and WordPress Application Password credentials.

## Usage

Run the script by passing the target URL as an argument:

```bash
python mese_import.py [URL]
```

### Example

```bash
python mese_import.py https://example.com/some-random-story
```

The console will output the WordPress `Edit URL` upon completion, alongside an AI-generated image prompt to copy into your image generator.
