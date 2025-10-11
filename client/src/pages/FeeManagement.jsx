import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import FeePaymentRatio from '../components/FeePaymentRatio';
import api from '../lib/api';

const FeeManagement = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [feeData, setFeeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    feeTypeId: '',
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students?limit=100');
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchFeeData = async (studentId) => {
    if (!studentId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/finance/students/${studentId}/fee-summary`);
      setFeeData(response.data || []);
    } catch (error) {
      console.error('Error fetching fee data:', error);
      setFeeData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = (studentId) => {
    setSelectedStudent(studentId);
    fetchFeeData(studentId);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !paymentForm.feeTypeId || !paymentForm.amount) return;

    try {
      await api.post('/finance/payment-with-ratio', {
        studentId: selectedStudent,
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      });
      
      // Refresh fee data
      fetchFeeData(selectedStudent);
      
      // Reset form
      setPaymentForm({
        feeTypeId: '',
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fee Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Selection & Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Student Fee Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Student</label>
              <Select value={selectedStudent} onValueChange={handleStudentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.firstName} {student.lastName} - {student.rollNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStudent && feeData.length > 0 && (
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Fee Type</label>
                  <Select 
                    value={paymentForm.feeTypeId} 
                    onValueChange={(value) => setPaymentForm({...paymentForm, feeTypeId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fee type" />
                    </SelectTrigger>
                    <SelectContent>
                      {feeData.map((fee) => (
                        <SelectItem key={fee.feeTypeId} value={fee.feeTypeId}>
                          {fee.feeType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select 
                    value={paymentForm.paymentMethod} 
                    onValueChange={(value) => setPaymentForm({...paymentForm, paymentMethod: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Payment Date</label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({...paymentForm, paymentDate: e.target.value})}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Process Payment
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Fee Payment Ratios */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading fee data...</p>
            ) : selectedStudent ? (
              <FeePaymentRatio feeData={feeData} />
            ) : (
              <p className="text-muted-foreground">Select a student to view fee status</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeeManagement;