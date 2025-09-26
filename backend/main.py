from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import os, subprocess, tempfile, sys
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Sales Analyzer API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    prompt: str

@app.get("/")
async def root():
    return {"message": "Sales Analyzer API is running!"}

def clean_generated_code(code: str) -> str:
    """
    Keep only valid Python code lines.
    Remove plain English text that can cause syntax errors.
    """
    lines = code.splitlines()
    clean_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#") or any(stripped.startswith(k) for k in (
            "import", "from", "def", "class", "for", "if", "while", "with", "return", "print"
        )) or "=" in stripped:
            clean_lines.append(line)
    return "\n".join(clean_lines)

@app.post("/api/runQuery")
async def run_query(req: QueryRequest):
    tmp = None
    try:
        data_dir = Path(__file__).parent.parent / "data"
        csv_path = data_dir / "sales.csv"
        if not csv_path.exists():
            return {"result": f"Sales data not found at {csv_path}", "code": "", "exitCode": 404}

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {"result": "OPENAI_API_KEY is not set on the backend", "code": "", "exitCode": 500}

        os.environ["OPENAI_API_KEY"] = api_key
        client = OpenAI()

        # System message: assistant persona
        system_message = "You are a Python expert generating code."

        # User message: detailed instructions + actual user request
        user_message = f"""
You are a Python expert generating code.

Requirements:
- Generate only plain Python code (no markdown, no explanations, no extra text)
- Use pandas (and optionally numpy, matplotlib, seaborn)
- Read CSV file named 'sales.csv'
- Automatically detect relevant columns by inspecting the CSV header
- The CSV 'sales.csv' has a 'date' column in ISO format (YYYY-MM-DD)
- Parse the 'date' column as datetime objects
- When filtering by year or month, use .dt.year and .dt.month properties
- Calculate total revenue per product category as the sum of (units_sold * unit_price)
- When counting total products sold, always sum the 'units_sold' column, do NOT just count rows
- Print all final results using print()
- Do NOT use exec(), eval(), base64 decoding, or any dynamic code execution
- Only return the Python code

User request: {req.prompt}
"""

        resp = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
        )

        code = (resp.choices[0].message.content or "").replace("```python", "").replace("```", "").strip()
        code = clean_generated_code(code)

        # Prepend imports and correct CSV path
        prelude = f"import os; os.environ['MPLBACKEND']='Agg'\nimport pandas as pd\n"
        if "read_csv(" not in code:
            code = f"df = pd.read_csv(r'{csv_path}')\n" + code
        else:
            code = code.replace("'sales.csv'", f"r'{csv_path}'").replace('"sales.csv"', f"r'{csv_path}'")

        # Write code to temporary file and execute
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tf:
            tf.write(prelude + "\n" + code)
            tmp = tf.name

        env = os.environ.copy()
        env["MPLBACKEND"] = "Agg"
        python_executable = sys.executable
        p = subprocess.run([python_executable, tmp], capture_output=True, text=True, timeout=60, env=env)

        out = p.stdout.strip()
        err = p.stderr.strip()
        result_text = out or err or "No output"
        return {"result": result_text, "code": code, "exitCode": p.returncode}

    except Exception as e:
        print("Backend error:", e)
        return {"result": f"Error: {str(e)}", "code": "", "exitCode": 500}

    finally:
        if tmp:
            try:
                os.unlink(tmp)
            except:
                pass
