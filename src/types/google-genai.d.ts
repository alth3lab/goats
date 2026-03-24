declare module '@google/genai' {
  export interface GenerateContentPart {
    text: string
  }

  export interface GenerateContentMessage {
    role: 'user' | 'model'
    parts: GenerateContentPart[]
  }

  export interface GenerateContentConfig {
    systemInstruction?: string
  }

  export interface GenerateContentRequest {
    model: string
    contents: GenerateContentMessage[]
    config?: GenerateContentConfig
  }

  export interface GenerateContentResponse {
    text?: string
  }

  export class GoogleGenAI {
    constructor(options: { apiKey: string })
    models: {
      generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>
    }
  }
}
