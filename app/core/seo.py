import re

BOT_AGENTS = [
    "Googlebot", "Twitterbot", "facebookexternalhit",
    "LinkedInBot", "WhatsApp", "Slackbot", "Discordbot",
]

_SITE_NAME = "FakeNews Dedektörü"
_BASE_URL  = "https://fakenews.example.com"


def is_bot(user_agent: str) -> bool:
    return any(b.lower() in user_agent.lower() for b in BOT_AGENTS)


def inject_thread_meta(html: str, thread: dict) -> str:
    title      = thread.get("title", "")
    body       = (thread.get("body") or "")[:160]
    thread_id  = thread.get("id", "")
    author     = thread.get("author_username", "")
    created_at = thread.get("created_at", "")
    url        = f"{_BASE_URL}/forum/{thread_id}"

    meta_block = f"""
    <title>{title} — {_SITE_NAME}</title>
    <meta name="description" content="{body}">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{body}">
    <meta property="og:url" content="{url}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="{_SITE_NAME}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{body}">
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      "headline": "{title}",
      "url": "{url}",
      "datePublished": "{created_at}",
      "author": {{"@type": "Person", "name": "{author}"}},
      "publisher": {{"@type": "Organization", "name": "{_SITE_NAME}"}}
    }}
    </script>"""

    return html.replace("<title>", meta_block + "\n    <title>", 1)
