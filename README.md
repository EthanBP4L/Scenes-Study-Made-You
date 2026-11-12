# SCENES — Study Made You

**A fully customizable study experience.**

SCENES is a study platform designed to combine productivity, creativity, and personalization. Users can create study materials, generate AI-powered flashcards from PDFs, and customize their own virtual spaces, known as **Zimmers**.

Built with **Next.js, React, TypeScript, Python, and FastAPI**.

##  SCENES — Demo

https://github.com/user-attachments/assets/365f5fda-7583-49da-9bf3-2a9e284378fa

##  Features

- **Customizable Zimmers:** Create personalized study spaces with draggable, resizable, and rotatable elements.
- **Images and GIFs:** Upload media and customize room backgrounds.
- **AI Flashcard Generation:** Generate study flashcards from PDF content using Google's Gemini API.
- **Flashcard Management:** Create, edit, organize, and delete flashcards and decks.
- **User Authentication:** Register, log in, and manage user profiles.
- **Persistent Room Storage:** Save and retrieve Zimmer layouts using the backend database.
- **Public and Private Content:** Control the visibility of study decks and Zimmers.

SCENES is currently under active development. Additional features and improvements are planned.

##  Technology Stack

### Frontend

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- React Moveable

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- SQLite
- Google GenAI SDK
- PyMuPDF / PyMuPDF4LLM
- Pillow
- Argon2

**Note:** SCENES is currently intended for local development. Run the following commands inside the cloned project directory. Review dependencies and installation scripts before running software from any repository.
## Prerequisites

Before running SCENES locally, install or obtain:

- **Python 3.11 or newer** (recommended; dependency compatibility may vary)
- **Node.js 20.9 or newer** (a supported LTS release is recommended)
- **npm**
- **Git**
- **Google Gemini API key** (required for AI-powered features)


## Getting Started


### 1. Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment and activate it:

Install backend dependencies:

```bash
python -m pip install -r requirements.txt
```

### 3. Configure Backend Environment Variables

Create a `.env` file inside the `backend` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Replace the placeholder with your own Gemini API key.

The gitignore file ignores the .env file so your API key is never committed

### 4. Start the Backend

From the `backend` directory, run:

```bash
uvicorn main:app --reload
```

The backend should be available at:

http://127.0.0.1:8000

Interactive API documentation:

http://127.0.0.1:8000/docs

The local SQLite database is used to store application data. Database tables are initialized by the backend when configured to do so.

Keep this terminal running.

### 5. Set Up the Frontend

Open a **second terminal**.

From the repository root, navigate to the frontend directory:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm ci
```

### 6. Configure Frontend Environment Variables

Create a `.env.local` file inside the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

This tells the frontend where to reach the FastAPI backend.

### 7. Start the Frontend

From the `frontend` directory, run:

```bash
npm run dev
```

Open your browser and navigate to:

http://localhost:3000

SCENES should now be running locally!

## Project Structure

```text
Scenes-Study-Made-You/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── services/
│   ├── uploads/
│   └── ...
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md
```

The backend handles authentication, database operations, flashcards, PDF processing, and room persistence.

The frontend provides the user interface, study tools, and customizable Zimmer editor.

## Security and Local Data

- Passwords are protected using password hashing.
- Authentication uses cookie-based sessions.
- Environment files containing secrets should not be committed.
- Local SQLite databases and uploaded user media are excluded from version control.
- Room media ownership is validated by the backend.

This project is currently configured for local development. Additional security and deployment configuration would be required before production use.

## Future Development

SCENES is an evolving project. Planned improvements include:

- Expanded social and community features
- Additional study tools and games
- More Zimmer customization options
- Improved content sharing and discovery
- Production deployment and hosting

## Development

SCENES is being developed as a collaborative project combining full-stack web development, interactive interface design, and AI-powered educational tools.

---

**SCENES — Study Made You.**

