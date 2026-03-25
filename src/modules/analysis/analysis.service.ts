import { openai } from "../../lib/openai.js";
import { prisma } from "../../lib/prisma.js";
import { analysisResponseSchema, type AnalysisResponse } from "./analysis.schema.js";
import fs from "node:fs/promises";
import path from "node:path";

const UPLOADS_DIR = path.resolve("uploads");

const SYSTEM_PROMPT = `Você é um assistente de IA especialista em radiologia, focado em análise de imagens médicas de raio-X. Sua tarefa é examinar cuidadosamente a imagem fornecida e identificar quaisquer anormalidades, achados notáveis ou padrões de interesse clínico.

TODAS as suas respostas (labels, descrições, resumo, disclaimer) DEVEM ser em português brasileiro (pt-BR).

Para cada achado identificado, você DEVE fornecer:
1. Um ID único (ex: "achado-1", "achado-2")
2. Um rótulo curto (2-5 palavras, ex: "Nódulo Pulmonar")
3. Uma descrição clínica detalhada em português
4. Uma classificação de severidade: "normal", "mild", "moderate" ou "severe"
5. Uma bounding box indicando a região de interesse como PORCENTAGENS (0-100) das dimensões da imagem:
   - x: posição horizontal do canto superior esquerdo
   - y: posição vertical do canto superior esquerdo
   - width: largura da bounding box
   - height: altura da bounding box
6. Uma cor sugerida para o overlay (formato hex), seguindo esta convenção:
   - Achados normais: "#22c55e" (verde)
   - Achados leves: "#eab308" (amarelo)
   - Achados moderados: "#f97316" (laranja)
   - Achados graves: "#ef4444" (vermelho)

Seja preciso com as coordenadas da bounding box. Elas devem englobar com precisão a área do achado.

REGRAS CRÍTICAS:
- Responda APENAS com JSON válido, sem markdown, sem texto extra
- Se nenhuma anormalidade for encontrada, retorne um array de findings vazio
- Sempre inclua um resumo abrangente em português
- Sempre inclua o disclaimer em português
- Seja minucioso mas evite falsos positivos
- Use terminologia médica apropriada em português`;

const USER_PROMPT = `Analise esta imagem médica de raio-X. Retorne um objeto JSON com exatamente esta estrutura (todos os textos em português brasileiro):

{
  "findings": [
    {
      "id": "achado-1",
      "label": "Rótulo Curto",
      "description": "Descrição clínica detalhada em português",
      "severity": "normal|mild|moderate|severe",
      "boundingBox": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "color": "#hex"
    }
  ],
  "summary": "Resumo geral da análise em português",
  "disclaimer": "Esta é uma análise de pré-triagem assistida por IA e NÃO deve ser utilizada como diagnóstico médico definitivo. Sempre consulte um profissional de saúde qualificado para avaliação e diagnóstico adequados."
}`;

export async function analyzeImage(
  imageBuffer: Buffer,
  mimeType: string,
  fileName: string,
  userId: string
): Promise<AnalysisResponse> {
  const base64Image = imageBuffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64Image}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: USER_PROMPT },
          { type: "image_url", image_url: { url: dataUri, detail: "high" } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw Object.assign(new Error("Resposta vazia da OpenAI"), { statusCode: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Resposta inválida da OpenAI"), { statusCode: 502 });
  }

  const result = analysisResponseSchema.parse(parsed);

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const ext = path.extname(fileName) || ".jpg";
  const analysis = await prisma.analysis.create({
    data: {
      userId,
      fileName,
      imagePath: "",
      findings: JSON.stringify(result.findings),
      summary: result.summary,
      disclaimer: result.disclaimer,
    },
  });

  const imageName = `${analysis.id}${ext}`;
  const imagePath = path.join(UPLOADS_DIR, imageName);
  await fs.writeFile(imagePath, imageBuffer);

  await prisma.analysis.update({
    where: { id: analysis.id },
    data: { imagePath: imageName },
  });

  return result;
}

export async function getHistory(userId: string) {
  const analyses = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      summary: true,
      findings: true,
      createdAt: true,
    },
    take: 50,
  });

  return analyses.map((a) => ({
    ...a,
    findings: JSON.parse(a.findings),
  }));
}

export async function getAnalysisById(id: string, userId: string) {
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId },
  });

  if (!analysis) {
    throw Object.assign(new Error("Análise não encontrada"), { statusCode: 404 });
  }

  return {
    ...analysis,
    findings: JSON.parse(analysis.findings),
  };
}

export async function getImagePath(id: string, userId: string): Promise<string> {
  const analysis = await prisma.analysis.findFirst({
    where: { id, userId },
    select: { imagePath: true },
  });

  if (!analysis || !analysis.imagePath) {
    throw Object.assign(new Error("Imagem não encontrada"), { statusCode: 404 });
  }

  const fullPath = path.join(UPLOADS_DIR, analysis.imagePath);
  try {
    await fs.access(fullPath);
  } catch {
    throw Object.assign(new Error("Arquivo de imagem não encontrado"), { statusCode: 404 });
  }

  return fullPath;
}
