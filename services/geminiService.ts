import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const cleanResponseText = (text: string): string => {
  // Remove common AI response headers like "要約:", "### 要約", etc.
  // Also handles variations with different numbers of #
  return text.trim().replace(/^(#+\s*)?(要約と翻訳|要約):\s*/, '');
};

export const translateTitles = async (titles: string[]): Promise<string[]> => {
  if (titles.length === 0) return [];
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `以下の英語のタイトルを日本語に翻訳してください。元の順序を維持し、JSON配列の形式で返してください。

タイトル:
${JSON.stringify(titles)}
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    const jsonStr = response.text.trim();
    const translated = JSON.parse(jsonStr);
    if (Array.isArray(translated) && translated.length === titles.length) {
        return translated;
    }
    console.warn("Title translation returned unexpected format, falling back to original titles.");
    return titles;
  } catch (error) {
    console.error("Error translating titles:", error);
    return titles; // On error, return original titles to not break the UI
  }
};

export const summarizeAndTranslateUrl = async (url: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `以下のURLの記事の内容を、日本の読者向けに詳細に要約し、日本語に翻訳してください。技術的な内容も正確に伝わるようにしてください。マークダウン形式で出力してください。

URL: ${url}
`,
    });
    return cleanResponseText(response.text);
  } catch (error) {
    console.error("Error summarizing and translating URL:", error);
    throw new Error("Failed to summarize and translate the article.");
  }
};

export const summarizeComments = async (commentsText: string[]): Promise<string> => {
    if (commentsText.length === 0) {
        return "コメントはありませんでした。";
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `以下のHacker Newsのコメント群を分析し、議論の主要なポイント、賛成意見、反対意見、興味深い洞察などをまとめて日本語で要約してください。個々のコメントを翻訳するのではなく、全体の会話の流れがわかるようにしてください。マークダウン形式で出力してください。

### コメント一覧
${commentsText.map((c, i) => `コメント ${i + 1}:\n${c}`).join('\n\n')}
`,
        });
        return cleanResponseText(response.text);
    } catch (error) {
        console.error("Error summarizing comments:", error);
        throw new Error("Failed to summarize comments.");
    }
};


export const explainText = async (selectedText: string, context: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `以下の文脈における、ハイライトされた文章の意味を詳しく、初心者にも分かりやすく解説してください。

### 文脈
${context}

### ハイライトされた文章
"${selectedText}"

### 解説
`,
    });
    return response.text;
  } catch (error) {
    console.error("Error explaining text:", error);
    throw new Error("Failed to get explanation from Gemini API.");
  }
};