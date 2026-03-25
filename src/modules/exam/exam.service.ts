import { openai } from "../../lib/openai.js";
import { prisma } from "../../lib/prisma.js";
import { analysisResponseSchema, type AnalysisResponse } from "./exam.schema.js";
import fs from "node:fs/promises";
import path from "node:path";

const UPLOADS_DIR = path.resolve("uploads");

function buildSystemPrompt(reason?: string): string {
  const base = `Você é um assistente de IA especialista em radiologia, focado em análise de imagens médicas de raio-X. Sua tarefa é examinar cuidadosamente a imagem fornecida e identificar quaisquer anormalidades, achados notáveis ou padrões de interesse clínico.

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

  if (reason) {
    return `${base}\n\nCONTEXTO CLÍNICO ADICIONAL: O motivo/razão deste exame informado pelo profissional de saúde é: "${reason}". Leve isso em consideração ao analisar a imagem, dando atenção especial a achados que possam estar relacionados a essa queixa.`;
  }

  return base;
}

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

export async function createExam(
  userId: string,
  patientId: string,
  type: string,
  reason: string | undefined,
  imageBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ examId: string }> {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, userId } });
  if (!patient) {
    throw Object.assign(new Error("Paciente não encontrado"), { statusCode: 404 });
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const exam = await prisma.exam.create({
    data: {
      userId,
      patientId,
      type,
      reason: reason ?? null,
      fileName,
      imagePath: "",
      status: "pending",
    },
  });

  const ext = path.extname(fileName) || ".jpg";
  const imageName = `${exam.id}${ext}`;
  const imagePath = path.join(UPLOADS_DIR, imageName);
  await fs.writeFile(imagePath, imageBuffer);

  await prisma.exam.update({
    where: { id: exam.id },
    data: { imagePath: imageName },
  });

  return { examId: exam.id };
}

export async function analyzeExam(examId: string, userId: string): Promise<AnalysisResponse> {
  const exam = await prisma.exam.findFirst({ where: { id: examId, userId } });
  if (!exam) {
    throw Object.assign(new Error("Exame não encontrado"), { statusCode: 404 });
  }

  if (exam.status === "completed") {
    return {
      findings: exam.findings ? JSON.parse(exam.findings) : [],
      summary: exam.summary ?? "",
      disclaimer: exam.disclaimer ?? "",
    };
  }

  const imagePath = path.join(UPLOADS_DIR, exam.imagePath);
  const imageBuffer = await fs.readFile(imagePath);
  const ext = path.extname(exam.imagePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif",
  };
  const mimeType = mimeMap[ext] ?? "image/jpeg";

  const base64Image = imageBuffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64Image}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: buildSystemPrompt(exam.reason ?? undefined) },
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
    throw Object.assign(new Error("Resposta vazia do serviço de IA"), { statusCode: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Resposta inválida do serviço de IA"), { statusCode: 502 });
  }

  const result = analysisResponseSchema.parse(parsed);

  await prisma.exam.update({
    where: { id: exam.id },
    data: {
      status: "completed",
      findings: JSON.stringify(result.findings),
      summary: result.summary,
      disclaimer: result.disclaimer,
      analyzedAt: new Date(),
    },
  });

  return result;
}

export async function listExams(userId: string) {
  return prisma.exam.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      reason: true,
      fileName: true,
      status: true,
      summary: true,
      createdAt: true,
      analyzedAt: true,
      patient: { select: { id: true, name: true } },
    },
    take: 100,
  });
}

export async function getExamById(id: string, userId: string) {
  const exam = await prisma.exam.findFirst({
    where: { id, userId },
    include: { patient: { select: { id: true, name: true, birthDate: true } } },
  });

  if (!exam) {
    throw Object.assign(new Error("Exame não encontrado"), { statusCode: 404 });
  }

  return {
    ...exam,
    findings: exam.findings ? JSON.parse(exam.findings) : null,
  };
}

export async function getImagePath(id: string, userId: string): Promise<string> {
  const exam = await prisma.exam.findFirst({
    where: { id, userId },
    select: { imagePath: true },
  });

  if (!exam || !exam.imagePath) {
    throw Object.assign(new Error("Imagem não encontrada"), { statusCode: 404 });
  }

  const fullPath = path.join(UPLOADS_DIR, exam.imagePath);
  try {
    await fs.access(fullPath);
  } catch {
    throw Object.assign(new Error("Arquivo de imagem não encontrado"), { statusCode: 404 });
  }

  return fullPath;
}

export async function deleteExam(id: string, userId: string) {
  const exam = await prisma.exam.findFirst({ where: { id, userId } });
  if (!exam) {
    throw Object.assign(new Error("Exame não encontrado"), { statusCode: 404 });
  }

  if (exam.imagePath) {
    const fullPath = path.join(UPLOADS_DIR, exam.imagePath);
    await fs.unlink(fullPath).catch(() => {});
  }

  await prisma.exam.delete({ where: { id } });
}

export async function getDashboardStats(userId: string) {
  const [totalPatients, totalExams, pendingExams, completedExams] = await Promise.all([
    prisma.patient.count({ where: { userId } }),
    prisma.exam.count({ where: { userId } }),
    prisma.exam.count({ where: { userId, status: "pending" } }),
    prisma.exam.count({ where: { userId, status: "completed" } }),
  ]);

  const recentExams = await prisma.exam.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      patient: { select: { name: true } },
    },
  });

  return { totalPatients, totalExams, pendingExams, completedExams, recentExams };
}
