import { GoogleGenAI } from "@google/genai";
import { SaleWithDetails } from "../types";

// NOTE: In a real app, never expose API keys on the client side. 
// This is for demonstration purposes as per instructions.
const apiKey = process.env.API_KEY || ''; 

export const analyzeSalesData = async (sales: SaleWithDetails[]): Promise<string> => {
  if (!apiKey) return "API Key not configured.";
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Prepare a lightweight summary of data to save tokens
    const summaryData = sales.map(s => ({
      product: s.product_name,
      platform: s.platform_name,
      received: s.value_received,
      profit: s.profit_final,
      date: s.date_sale.split('T')[0]
    })).slice(0, 30); // Analyze last 30 sales only for speed

    const prompt = `
      Atue como um analista financeiro sênior de e-commerce.
      Analise os seguintes dados de vendas (JSON) de uma loja de tênis.
      
      Dados: ${JSON.stringify(summaryData)}
      
      Por favor, forneça:
      1. Uma breve análise de qual plataforma está dando mais lucro líquido.
      2. Qual produto é a "estrela" (maior margem).
      3. Uma sugestão estratégica curta (máx 2 linhas) para aumentar o lucro no próximo mês.
      
      Formate a resposta em Markdown simples. Seja direto e motive o vendedor.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a IA. Verifique sua chave de API.";
  }
};