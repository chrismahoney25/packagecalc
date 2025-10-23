import { Visit, PaymentPlan, CashFlow } from '@/types';
import { addMonths, format, parseISO, isAfter, startOfMonth } from 'date-fns';

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
  
  // Package end date should not be after the latest visit date
  const latestVisitDate = parseISO(getLatestVisitDate(plan.visits));
  const packageEndDate = parseISO(plan.endDate);
  
  if (isAfter(packageEndDate, latestVisitDate)) {
    return false;
  }
  
  // Check outstanding balance never exceeds 20%
  const cashFlow = generateCashFlow(plan);
  return cashFlow.every(entry => entry.balance <= maxAllowedOutstanding);
};

export const generateCashFlow = (plan: PaymentPlan): CashFlow[] => {
  const cashFlow: CashFlow[] = [];
  let currentBalance = -plan.deposit; // Start with deposit credit
  
  // Package starts on first visit date and payments begin then
  const packageStartDate = parseISO(plan.visits[0]?.date || new Date().toISOString());
  const packageEndDate = parseISO(plan.endDate);
  
  let currentDate = startOfMonth(packageStartDate);
  
  while (!isAfter(currentDate, packageEndDate)) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Add monthly payment (credit)
    currentBalance -= plan.monthlyPayment;
    
    // Add visit costs for this month (debit)
    const monthVisits = plan.visits.filter(visit => {
      const visitDate = parseISO(visit.date);
      return visitDate.getMonth() === currentDate.getMonth() && 
             visitDate.getFullYear() === currentDate.getFullYear();
    });
    
    const monthVisitCost = monthVisits.reduce((total, visit) => 
      total + visit.travelFee + visit.consultingFee, 0);
    
    currentBalance += monthVisitCost;
    
    cashFlow.push({
      date: dateStr,
      balance: currentBalance,
      payment: plan.monthlyPayment,
      visitCost: monthVisitCost
    });
    
    currentDate = addMonths(currentDate, 1);
  }
  
  return cashFlow;
};

export const generatePaymentOptions = (visits: Visit[]): PaymentPlan[] => {
  if (visits.length === 0) return [];
  
  const totalValue = calculateTotalValue(visits);
  const latestVisitDate = getLatestVisitDate(visits);
  const options: PaymentPlan[] = [];
  
  // Generate different package durations (3, 6, 9, 12 months)
  const durations = [3, 6, 9, 12];
  
  durations.forEach(duration => {
    // Package starts on the first visit date
    const packageStartDate = parseISO(visits[0].date);
    const packageEndDate = addMonths(packageStartDate, duration);
    const endDateStr = format(packageEndDate, 'yyyy-MM-dd');
    
    // Skip if package extends past latest visit date
    if (isAfter(packageEndDate, parseISO(latestVisitDate))) {
      return;
    }
    
    // Try different deposit amounts (10%, 20%, 30%, 40%)
    [0.1, 0.2, 0.3, 0.4].forEach(depositPercent => {
      const deposit = totalValue * depositPercent;
      const remainingAmount = totalValue - deposit;
      const monthlyPayment = remainingAmount / duration;
      
      const plan: PaymentPlan = {
        id: `${duration}-${depositPercent}`,
        deposit,
        monthlyPayment,
        duration,
        totalValue,
        visits,
        endDate: endDateStr,
        isValid: false,
        maxOutstanding: totalValue * 0.2
      };
      
      plan.isValid = validatePaymentPlan(plan);
      
      // Show all plans for debugging
      options.push(plan);
    });
  });
  
  return options.sort((a, b) => a.duration - b.duration);
};