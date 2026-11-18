# Physics Lab Assistant — Ohm's Law starter website

## Stack
- Python + Flask: backend routes, reading validation, resistance calculations, least-squares fit, quiz scoring.
- HTML: page structure and experiment content.
- CSS: visual design and responsive layout.
- JavaScript: circuit component selection, form interactions, API calls, and drawing the graph in the browser.

## Run on Windows (VS Code)
1. Extract the ZIP.
2. Open the extracted `physics_lab_assistant` folder in VS Code.
3. Open Terminal → New Terminal.
4. (Recommended) Create a virtual environment:
   `py -m venv .venv`
5. Activate it:
   PowerShell: `.venv\Scripts\Activate.ps1`
   If PowerShell blocks activation, use Command Prompt and run: `.venv\Scripts\activate.bat`
6. Install Flask:
   `py -m pip install -r requirements.txt`
7. Start the website:
   `py app.py`
8. Open the local address shown in the terminal, usually `http://127.0.0.1:5000`.

## Where Python is used
Open `app.py`:
- `VIVA`: stores the quiz questions, correct answers and explanations.
- `analyse_readings()`: validates readings, calculates V/I, checks inconsistent values, fits I = mV through the origin, calculates resistance and resistance per unit length.
- `/api/analyse`: receives the table from the page and returns analysis results as JSON.
- `/api/quiz`: checks answers and calculates the viva score.
- Flask `home()` route: serves the website page.

## Where JavaScript is used
Open `static/app.js`:
- Makes the circuit components selectable.
- Creates six editable reading rows.
- Sends readings to Python and displays the returned checks.
- Draws the I–V graph on the canvas.
- Submits the viva answers and displays score/explanations.

## Where CSS and HTML are used
- `templates/index.html`: page content, circuit SVG, table, and quiz layout.
- `static/style.css`: colours, typography, responsive design and component styling.

## Notes
- The experiment text follows the uploaded Ohm's Law virtual lab reference.
- The analyser uses the stated meter ranges: voltmeter 0–5 V and milliammeter 0–500 mA.
- Its consistency check is a helpful screening check, not proof that a reading is scientifically correct. Check meter zero error, connections, units and experimental conditions too.
- The graph is I (ampere) against V (volt), so its slope is 1/R.
