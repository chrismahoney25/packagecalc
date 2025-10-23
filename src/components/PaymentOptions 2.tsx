'use client';

import { PaymentPlan } from '@/types';

interface PaymentOptionsProps {
  options: PaymentPlan[];
  selectedPlan: PaymentPlan | null;
  onSelectPlan: (plan: PaymentPlan) => void;
}

export default function PaymentOptions({ options, selectedPlan, onSelectPlan }: PaymentOptionsProps) {
  if (options.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Add visits to see payment plan options
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Payment Plan Options</h2>
      
      <div className="grid gap-4">
        {options.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedPlan?.id === plan.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
            onClick={() => onSelectPlan(plan)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.duration} Month Plan
                </h3>
                <p className="text-sm text-gray-600">
                  Valid payment plan option
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ${plan.totalValue.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Total Value</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-gray-600">Initial Deposit</div>
                <div className="text-lg font-semibold text-gray-900">
                  ${plan.deposit.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {((plan.deposit / plan.totalValue) * 100).toFixed(0)}% of total
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-gray-600">Monthly Payment</div>
                <div className="text-lg font-semibold text-gray-900">
                  ${plan.monthlyPayment.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  For {plan.duration} months
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-gray-600">Max Outstanding</div>
                <div className="text-lg font-semibold text-orange-600">
                  ${plan.maxOutstanding.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  20% limit maintained
                </div>
              </div>
            </div>
            
            <div className="mt-3 flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Package ends: {new Date(plan.endDate).toLocaleDateString()}
              </span>
              <span className="flex items-center text-green-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Valid Plan
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {options.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No valid payment plans found</div>
          <div className="text-sm text-gray-400">
            Try adjusting visit dates or consider a shorter package duration
          </div>
        </div>
      )}
    </div>
  );
}