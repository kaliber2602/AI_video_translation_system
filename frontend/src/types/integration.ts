export interface IntegrationApp {
  id: string;
  name: string;
  category: "storage" | "ai" | "productivity";
  description: string;
  connected: boolean;
  accountEmail?: string;
  iconName: string;
  badge?: string;
  config?: Record<string, any>;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  secret?: string;
  createdDate: string;
  lastUsed: string;
  environment: "production" | "development";
}
