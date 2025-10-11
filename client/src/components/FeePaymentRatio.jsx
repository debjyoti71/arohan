import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

const FeePaymentRatio = ({ feeData }) => {
  if (!feeData || feeData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No fee data available</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getProgressPercentage = (periodsPaid, totalPeriods) => {
    return Math.round((periodsPaid / totalPeriods) * 100);
  };

  return (
    <div className="space-y-4">
      {feeData.map((fee, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{fee.feeType}</CardTitle>
              <Badge className={getStatusColor(fee.status)}>
                {fee.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Payment Progress</span>
                <span className="text-sm text-muted-foreground">
                  {fee.paymentRatio}
                </span>
              </div>
              
              <Progress 
                value={getProgressPercentage(fee.periodsPaid, fee.totalPeriods)} 
                className="h-2"
              />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <p className="font-medium">₹{fee.paidAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <p className="font-medium">₹{fee.totalAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining:</span>
                  <p className="font-medium">₹{fee.remainingAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Frequency:</span>
                  <p className="font-medium capitalize">{fee.frequency}</p>
                </div>
              </div>

              {fee.nextDueDate && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Next Due Date:</span>
                  <p className="font-medium">
                    {new Date(fee.nextDueDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FeePaymentRatio;