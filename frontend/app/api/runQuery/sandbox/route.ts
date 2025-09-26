import { NextRequest, NextResponse } from "next/server";
import { Daytona } from "@daytonaio/sdk";
import OpenAI from "openai";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const daytonaApiKey = process.env.DAYTONA_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ result: "Error: OPENAI_API_KEY is not set" }, { status: 500 });
    }
    if (!daytonaApiKey) {
      return NextResponse.json({ result: "Error: DAYTONA_API_KEY is not set" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const promptTemplate = `
    You are a Python expert generating code.
    
   Requirements:
  - Generate only plain Python code (no markdown, no explanations, no extra text)
  - Use pandas (and optionally numpy, matplotlib, seaborn)
  - Read CSV file named 'sales.csv' (already uploaded in sandbox)
  - Automatically detect relevant columns by inspecting the CSV header
  - The CSV 'sales.csv' has a 'date' column in ISO format (YYYY-MM-DD)
  - Parse the 'date' column as datetime objects
  - When filtering by year or month, use .dt.year and .dt.month properties
  - Calculate total revenue per product category as the sum of (units_sold * unit_price)
  - When counting total products sold, always sum the 'units_sold' column, do NOT just count rows
  - Print all final results using print()
  - Do NOT use exec(), eval(), base64 decoding, or any dynamic code execution
  - Only return the Python code
    
    User request: ${prompt}
    `;
    
        const gptResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a Python expert generating code." },
            { role: "user", content: promptTemplate },
          ],
        });

    let pythonCode = gptResponse.choices[0].message?.content || "";
    pythonCode = pythonCode.replace(/```python\n?/g, "").replace(/```/g, "").trim();

    const daytona = new Daytona({ apiKey: daytonaApiKey });

    const sandbox = await daytona.create({ language: "python" });

    try {
      const csvPath = join(process.cwd(), "..", "data", "sales.csv");
      const salesDataBuffer = readFileSync(csvPath);
      await sandbox.fs.uploadFile(salesDataBuffer, "sales.csv");

      const response = await sandbox.process.codeRun(pythonCode);

      let result = response.result || "";
      if (response.exitCode !== 0) {
        result = `Error (exit code ${response.exitCode}): ${result}`;
      } else if (!result || result.trim() === "") {
        result = "Code executed successfully but produced no output. Ensure your code prints results.";
      }

      return NextResponse.json({ result, code: pythonCode, exitCode: response.exitCode });
    } finally {
      await sandbox.delete();
    }
  } catch (err: any) {
    return NextResponse.json({ result: "Error: " + err.message }, { status: 500 });
  }
} 