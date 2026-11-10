export type ParsedPayment = {
  row: number;
  paymentDate: string;
  amount: string;
  type: string;
  contractNumber: string;
};

export const REQUIRED_COLUMNS = ["payment_date", "amount", "type", "contract_number"] as const;
