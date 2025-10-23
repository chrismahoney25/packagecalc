export interface Visit {
  id: string;
  date: string;
  travelFee: number;
  consultingFee: number;
}

export interface PaymentPlan {
  id: string;
  deposit: number;
  monthlyPayment: number;
  duration: number; // months
  totalValue: number;
  visits: Visit[];
  endDate: string;
  isValid: boolean;
  maxOutstanding: number;
}

export interface CashFlow {
  date: string;
  balance: number;
  payment: number;
  visitCost: number;
}