
import os

from dotenv import load_dotenv
from google import genai

import json

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)


def generate_flashcards(text: str, count: int = 10) -> list[dict[str, str]]:
    """
    Generate study flashcards from extracted PDF text.
    """

    prompt = f"""
    You are an educational assistant.

    Generate {count} high-quality study flashcards
    exclusively on the following study material.

    Each flashcard should contain:
    - A clear question
    - A concise, accurate answer

    Return the flashcards as a JSON array using
    this exact structure:

    [
        {{
            "question": "Example question?",
            "answer": "Example answer."
        }}
    ]

    Return only valid JSON, with no Markdown formatting.

    Study material:
    {text}
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
    )

    if not response.text:
        raise ValueError("Gemini returned an empty response.")

    flashcards = json.loads(response.text)

    if not isinstance(flashcards, list):
        raise ValueError("Gemini did not return a JSON array.")

    for card in flashcards:
        if (
            not isinstance(card, dict)
            or not isinstance(card.get("question"), str)
            or not isinstance(card.get("answer"), str)
        ):
            raise ValueError("Gemini returned an invalid flashcard.")

    return flashcards
