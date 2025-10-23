'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PaymentPlan } from '@/types';
import { generateCashFlow } from '@/utils/paymentCalculations';

interface CashFlowChartProps {
  paymentPlan: PaymentPlan | null;
  compact?: boolean;
}

export default function CashFlowChart({ paymentPlan, compact = false }: CashFlowChartProps) {
  if (!paymentPlan) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500 border border-gray-200 rounded-lg">
        Select a payment plan to view cash flow projection
      </div>
    );
  }

  const cashFlowData = generateCashFlow(paymentPlan);
  
  const formatCurrency = (value: number) => {
    return value >= 0 ? `$${value.toFixed(0)}` : `-$${Math.abs(value).toFixed(0)}`;
  };

  const formatTooltip = (value: number, name: string) => {
    if (name === 'Outstanding Balance') {
      return [
        value >= 0 ? `$${value.toFixed(0)}` : `$${Math.abs(value).toFixed(0)} owed`,
        value >= 0 ? 'Package balance' : 'Amount owed'
      ];
    }
    if (name === 'Payments') {
      return [`$${value.toFixed(0)}`, 'Payment received'];
    }
    if (name === 'Invoices') {
      return [`$${value.toFixed(0)}`, 'Service invoice'];
    }
    return [`$${value.toFixed(0)}`, name];
  };

  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
        <div className="text-sm font-semibold text-slate-800">
          {compact ? 'Cash flow projection' : `Cash Flow Projection - ${paymentPlan.duration} Month Plan`}
        </div>
        {!compact && (
          <div className="text-xs text-slate-600 ml-auto">
            Max limit: ${paymentPlan.maxOutstanding.toFixed(0)}
          </div>
        )}
      </div>

      <div className={`${compact ? 'h-48' : 'h-80'} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={cashFlowData}
            margin={{ top: 20, right: 16, left: 16, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              fontWeight={500}
            />
            <YAxis
              tickFormatter={formatCurrency}
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              fontWeight={500}
            />
            <Tooltip
              formatter={formatTooltip}
              labelFormatter={(label) => formatXAxis(label)}
              contentStyle={{
                borderRadius: 12,
                borderColor: '#e2e8f0',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: 12,
                fontWeight: 500
              }}
            />
            {!compact && <Legend />}

            {/* Reference line for 20% limit */}
            <ReferenceLine
              y={-paymentPlan.maxOutstanding}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={compact ? undefined : { value: "20% Limit", position: "top", fontSize: 10, fill: "#ef4444" }}
            />
            <ReferenceLine
              y={0}
              stroke="#64748b"
              strokeWidth={1}
            />

            <Line
              type="monotone"
              dataKey="balance"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: '#6366f1', strokeWidth: 2, fill: 'white' }}
              name="Outstanding Balance"
            />
            <Line
              type="monotone"
              dataKey="payment"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 0, r: 2 }}
              activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: 'white' }}
              name="Payments"
            />
            <Line
              type="monotone"
              dataKey="visitCost"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 0, r: 2 }}
              activeDot={{ r: 4, stroke: '#f59e0b', strokeWidth: 2, fill: 'white' }}
              name="Invoices"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!compact && (
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="text-center">
            <div className="w-3 h-3 bg-indigo-500 rounded mx-auto mb-1"></div>
            <div className="font-semibold text-slate-800">Outstanding Balance</div>
            <div className="text-slate-600">Amount owed</div>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-emerald-500 rounded mx-auto mb-1"></div>
            <div className="font-semibold text-slate-800">Payments</div>
            <div className="text-slate-600">Money received</div>
          </div>
          <div className="text-center">
            <div className="w-3 h-3 bg-amber-500 rounded mx-auto mb-1"></div>
            <div className="font-semibold text-slate-800">Invoices</div>
            <div className="text-slate-600">Services billed</div>
          </div>
        </div>
      )}
    </div>
  );
}