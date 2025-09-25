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

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You generate Python code for sales data analysis using pandas, numpy, and matplotlib/seaborn. The CSV filename to read is 'sales.csv' (already present). For counting total sales per product, use the 'units_sold' column instead of just counting rows. Always include print() statements for final results. Return only raw Python code, no markdown.",
        },
        { role: "user", content: prompt },
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