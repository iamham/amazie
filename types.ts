export interface Product {
  sku: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  category: string;
  tags: string[];
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  image?: string;
  products?: Product[];
  isThinking?: boolean;
}

export interface SearchParams {
  query?: string;
  category?: string;
  maxPrice?: number;
}