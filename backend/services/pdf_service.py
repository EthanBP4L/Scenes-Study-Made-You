import fitz


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """
    Extract text from a PDF provided as bytes.

    Args:
        pdf_bytes: Raw PDF file contents.

    Returns:
        Extracted text from all pages.
    """
    with fitz.open(stream=pdf_bytes, filetype="pdf") as document:
        pages = []

        for page in document:
            text = page.get_text("text")
            if text.strip():
                pages.append(text)

        return "\n\n".join(pages)
