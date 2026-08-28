export interface RazorpayWebhookPayload {
  entity: "event";

  account_id?: string;

  event: string;

  contains?: string[];

  created_at?: number;

  payload: Record<
    string,
    {
      entity: Record<string, any>;
    }
  >;
}