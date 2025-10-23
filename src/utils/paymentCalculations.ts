import { Visit, PaymentPlan, CashFlow } from '@/types';
import { addMonths, format, parseISO, isAfter } from 'date-fns';

export const calculateTotalValue = (visits: Visit[]): number => {
  return visits.reduce((total, visit) => total + visit.travelFee + visit.consultingFee, 0);
};

export const getLatestVisitDate = (visits: Visit[]): string => {
  if (visits.length === 0) return '';
  return visits.reduce((latest, visit) => 
    isAfter(parseISO(visit.date), parseISO(latest)) ? visit.date : latest
  , visits[0].date);
};

export const validatePaymentPlan = (plan: PaymentPlan): boolean => {
  const totalValue = calculateTotalValue(plan.visits);
  const maxAllowedOutstanding = totalValue * 0.2;

  // Check balance never goes more negative than -20% of total value
  const cashFlow = generateCashFlow(plan);
  const minBalance = cashFlow.reduce((acc, e) => Math.min(acc, e.balance), 0);
  return minBalance >= -maxAllowedOutstanding;
};


export const generateCashFlow = (plan: PaymentPlan): CashFlow[] => {
  if (plan.visits.length === 0) return [];

  const sortedVisits = [...plan.visits].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  const startDate = parseISO(sortedVisits[0].date);
  const endDate = parseISO(sortedVisits[sortedVisits.length - 1].date);

  // Create monthly buckets from first visit month to last visit month
  const flow: CashFlow[] = [];
  const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 15);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 15);

  let currentMonth = new Date(startMonth);
  let runningBalance = 0;

  while (currentMonth <= endMonth) {
    let monthlyPayment = 0;
    let monthlyInvoices = 0;

    // Add deposit on first month
    if (currentMonth.getFullYear() === startMonth.getFullYear() &&
        currentMonth.getMonth() === startMonth.getMonth() &&
        plan.deposit > 0) {
      monthlyPayment += plan.deposit;
    }

    // Add regular monthly payment for each month in duration
    const monthsFromStart = Math.round((currentMonth.getTime() - startMonth.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (monthsFromStart < plan.duration) {
      monthlyPayment += plan.monthlyPayment;
    }

    // Add visit costs for visits in this month (payment due on visit date)
    for (const visit of plan.visits) {
      const visitDate = parseISO(visit.date);

      if (visitDate.getFullYear() === currentMonth.getFullYear() &&
          visitDate.getMonth() === currentMonth.getMonth()) {
        const visitCost = (visit.travelFee || 0) + (visit.consultingFee || 0);
        monthlyInvoices += visitCost;
      }
    }

    // Update running balance: payments increase, invoices decrease
    runningBalance += monthlyPayment - monthlyInvoices;

    flow.push({
      date: format(currentMonth, 'yyyy-MM-dd'),
      balance: runningBalance,
      payment: monthlyPayment,
      visitCost: monthlyInvoices
    });

    // Move to next month
    currentMonth = addMonths(currentMonth, 1);
  }

  return flow;
};

export const findMonthlyPayment = (totalValue: number, duration: number, deposit: number): number => {
  if (duration <= 0) return 0;
  const remaining = Math.max(0, totalValue - deposit);
  return remaining / duration;
};

export const findMinimumMonthlyPayment = (
  visits: Visit[],
  totalValue: number,
  duration: number,
  deposit: number
): number => {
  if (duration <= 0) return 0;
  const owedCap = totalValue * 0.2;
  const remaining = Math.max(0, totalValue - deposit);
  let low = 0;
  let high = remaining; // paying off in first month is an upper bound
  let result = high;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const plan: PaymentPlan = {
      id: 'search',
      deposit,
      monthlyPayment: mid,
      duration,
      totalValue,
      visits,
      endDate: getLatestVisitDate(visits),
      isValid: true,
      maxOutstanding: totalValue * 0.2,
    };
    const flow = generateCashFlow(plan);
    const minBalance = flow.reduce((acc, e) => Math.min(acc, e.balance), 0);
    if (minBalance >= -owedCap) {
      result = mid;
      high = mid;
    } else {
      low = mid;
    }
  }
  return result;
};

// Finds the minimum deposit needed so the plan stays within the 20% outstanding cap
// using an even monthly payment schedule derived from deposit and duration.
export const findMinimumDeposit = (
  visits: Visit[],
  totalValue: number,
  duration: number
): { deposit: number; monthlyPayment: number } => {
  if (duration <= 0) return { deposit: 0, monthlyPayment: 0 };
  const owedCap = totalValue * 0.2;
  let low = 0;
  let high = totalValue; // never more than total value
  let bestDeposit = high;
  let bestMonthly = 0;

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const monthly = findMonthlyPayment(totalValue, duration, mid);
    const plan: PaymentPlan = {
      id: 'deposit-search',
      deposit: mid,
      monthlyPayment: monthly,
      duration,
      totalValue,
      visits,
      endDate: getLatestVisitDate(visits),
      isValid: true,
      maxOutstanding: totalValue * 0.2,
    };
    const flow = generateCashFlow(plan);
    const minBalance = flow.reduce((acc, e) => Math.min(acc, e.balance), 0);
    if (minBalance >= -owedCap) {
      bestDeposit = mid;
      bestMonthly = monthly;
      high = mid;
    } else {
      low = mid;
    }
  }

  return { deposit: bestDeposit, monthlyPayment: bestMonthly };
};

export const generateSimpleOptions = (visits: Visit[]): PaymentPlan[] => {
  if (visits.length === 0) return [];

  const totalValue = calculateTotalValue(visits);
  const firstVisitDate = visits[0].date;
  const latestVisitDate = getLatestVisitDate(visits);

  const firstDate = parseISO(firstVisitDate);
  const lastDate = parseISO(latestVisitDate);
  const monthsDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const maxDuration = Math.max(1, monthsDiff);

  const durations = Array.from(new Set([1, Math.ceil(maxDuration / 2), maxDuration])).sort((a, b) => a - b);

  const options: PaymentPlan[] = durations.map((duration) => {
    const { deposit, monthlyPayment } = findMinimumDeposit(visits, totalValue, duration);

    const endDate = format(addMonths(firstDate, duration - 1), 'yyyy-MM-dd');
    const maxOutstanding = totalValue * 0.2;
    const plan: PaymentPlan = {
      id: `simple-${duration}m`,
      deposit,
      monthlyPayment,
      duration,
      totalValue,
      visits,
      endDate,
      isValid: true,
      maxOutstanding,
    };
    const flow = generateCashFlow(plan);
    const minBalance = flow.reduce((acc, e) => Math.min(acc, e.balance), 0);
    return { ...plan, isValid: minBalance >= -maxOutstanding };
  });

  return options;
};

export const generatePaymentOptions = (visits: Visit[]): PaymentPlan[] => {
  if (visits.length === 0) return [];

  const totalValue = calculateTotalValue(visits);
  const firstVisitDate = visits[0].date;
  const latestVisitDate = getLatestVisitDate(visits);

  const firstDate = parseISO(firstVisitDate);
  const lastDate = parseISO(latestVisitDate);
  const monthsDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const maxDuration = Math.max(1, monthsDiff);

  const options: PaymentPlan[] = [];
  for (let duration = 1; duration <= maxDuration; duration++) {
    const deposit = 0;
    const monthlyPayment = findMonthlyPayment(totalValue, duration, deposit);
    const endDate = format(addMonths(firstDate, duration - 1), 'yyyy-MM-dd');
    const maxOutstanding = totalValue * 0.2;
    const plan: PaymentPlan = {
      id: `plan-${duration}m`,
      deposit,
      monthlyPayment,
      duration,
      totalValue,
      visits,
      endDate,
      isValid: true,
      maxOutstanding,
    };
    const flow = generateCashFlow(plan);
    const minBalance = flow.reduce((acc, e) => Math.min(acc, e.balance), 0);
    options.push({ ...plan, isValid: minBalance >= -maxOutstanding });
  }

  return options;
};