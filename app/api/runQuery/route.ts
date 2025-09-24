import { NextRequest, NextResponse } from "next/server";
import { Daytona } from '@daytonaio/sdk';
import OpenAI from "openai";
import { readFileSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  try {
    // 1. Generate Python code from prompt using OpenAI
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: `You generate Python code for sales data analysis using pandas, numpy, and matplotlib. 
          
The CSV file 'sales.csv' has these columns:
- date: Date of sale
- product: Product name  
- category: Product category (Casual Wear, Formal Wear)
- region: Sales region (North, South, East, West)
- revenue: Revenue amount
- units_sold: Number of units sold
- gender: Customer gender (Male, Female)
- age_group: Customer age group (18-24, 25-34, 35-44)

CRITICAL: Your code MUST include print() statements to display results. Always print the final answer or analysis results.

Return only the Python code, no explanations, no markdown formatting, no code blocks.` 
        },
        { role: "user", content: prompt },
      ],
    });

    let pythonCode = gptResponse.choices[0].message?.content || "";
    
    // 2. Clean up markdown formatting if present
    pythonCode = pythonCode.replace(/```python\n?/g, '').replace(/```\n?/g, '').trim();

    // 3. Initialize Daytona client
    const daytona = new Daytona({ 
      apiKey: process.env.DAYTONA_API_KEY 
    });

    // 4. Create sandbox and run code
    const sandbox = await daytona.create({
      language: 'python',
    });

    // 5. Upload sales data to sandbox
    const salesDataBuffer = readFileSync(join(process.cwd(), 'data', 'sales.csv'));
    await sandbox.fs.uploadFile(salesDataBuffer, 'sales.csv');

    // 6. Run the generated Python code in the sandbox
    const response = await sandbox.process.codeRun(pythonCode);
    
    // 7. Clean up
    await sandbox.delete();

    // 8. Better output handling
    let result = response.result || "";
    
    if (response.exitCode !== 0) {
      result = `Error (exit code ${response.exitCode}): ${result}`;
    } else if (!result || result.trim() === "") {
      result = "Code executed successfully but produced no output. The generated code might not include print statements.";
    }

    return NextResponse.json({ 
      result: result,
      code: pythonCode,  // Return the generated Python code
      exitCode: response.exitCode  
    });
  } catch (err: any) {
    return NextResponse.json({ result: "Error: " + err.message }, { status: 500 });
  }
}
