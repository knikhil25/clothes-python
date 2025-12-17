# StyleMatch Application

## Prerequisites
- **Ollama**: Ensure Ollama is installed and running (`ollama serve`).
- **Python 3**: The project uses a virtual environment (`venv`).

## How to Run

1. **Start Ollama** (if not already running):
   ```bash
   ollama serve
   ```
   *Note: Ensure you have the `gpt-oss:20b` model pulled (`ollama pull gpt-oss:20b`).*

2. **Start the Application**:
   Open a terminal in this directory and run:
   ```bash
   source venv/bin/activate
   python backend.py
   ```
   *This starts the web server on port 8000.*

3. **Access the App**:
   Open your web browser and go to:
   [http://localhost:8000/index.html](http://localhost:8000/index.html)

## Troubleshooting
- If you see **"Connection refused"**, make sure the backend server script is running.
- If you see **"Image API Error"**, check the backend terminal logs for errors.
- If text generation fails, ensure Ollama is running on port 11434.
