import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { RollConfirmationService } from '@/services/rollConfirmationService';
import { ProductionAllotmentService } from '@/services/productionAllotmentService';
import { SalesOrderService } from '@/services/salesOrderService';
import type { RollConfirmationRequestDto, ProductionAllotmentResponseDto, SalesOrderDto, MachineAllocationResponseDto } from '@/types/api-types';

const ProductionConfirmation: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [formData, setFormData] = useState({
    allotId: '', machineName: '', rollNo: '', greyGsm: '0', greyWidth: '0', blendPercent: '0', cotton: '0', polyester: '0', spandex: '0'
  });
  const [allotmentData, setAllotmentData] = useState<ProductionAllotmentResponseDto | null>(null);
  const [salesOrderData, setSalesOrderData] = useState<SalesOrderDto | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<MachineAllocationResponseDto | null>(null);

  // Ref for the Lot ID input field
  const lotIdRef = useRef<HTMLInputElement>(null);



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleBarcodeScan(value);
  };


  const fetchAllotmentData = async (allotId: string, machineNameFromBarcode?: string) => {
    if (!allotId) return;
    setIsFetchingData(true);
    try {
      const allotmentData = await ProductionAllotmentService.getProductionAllotmentByAllotId(allotId);
      setAllotmentData(allotmentData);
      
      if (allotmentData.salesOrderId) {
        try {
          const salesOrder = await SalesOrderService.getSalesOrderById(allotmentData.salesOrderId);
          setSalesOrderData(salesOrder);
        } catch (salesOrderError) {
          console.error('Error fetching sales order data:', salesOrderError);
          setSalesOrderData(null);
        }
      }
      
      let selectedMachineData = null;
      if (allotmentData.machineAllocations?.length > 0) {
        selectedMachineData = machineNameFromBarcode 
          ? allotmentData.machineAllocations.find((ma: MachineAllocationResponseDto) => ma.machineName === machineNameFromBarcode) || allotmentData.machineAllocations[0]
          : allotmentData.machineAllocations[0];
        setSelectedMachine(selectedMachineData);
      }
      
      setFormData(prev => ({
        ...prev,
        greyGsm: allotmentData.reqGreyGsm?.toString() || '0',
        greyWidth: allotmentData.reqGreyWidth?.toString() || '0',
      }));
      
      toast.success('Success', 'Production planning data loaded successfully.');
    } catch (err) {
      console.error('Error fetching lotment data:', err);
      setAllotmentData(null);
      setSalesOrderData(null);
      setSelectedMachine(null);
      toast.error('Error', err instanceof Error ? err.message : 'Failed to fetch lotment data.');
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleBarcodeScan = (barcodeData: string) => {
    try {
      const parts = barcodeData.split('#');
      if (parts.length >= 3) {
        setFormData(prev => ({
          ...prev,
          allotId: parts[0] || '',
          machineName: parts[1] || '',
          rollNo: parts[2] || '',
        }));
        fetchAllotmentData(parts[0], parts[1]);
        toast.success('Success', 'Barcode data loaded successfully');
      } else {
        toast.error('Error', 'Invalid barcode format');
      }
    } catch (err) {
      console.error('Error processing barcode:', err);
      toast.error('Error', 'Failed to process barcode data');
    }
  };

  useEffect(() => {
    // Set focus on the Lot ID field when component mounts
    if (lotIdRef.current) {
      lotIdRef.current.focus();
    }
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredFields = [
      { value: formData.allotId, name: 'Lot ID' },
      { value: formData.machineName, name: 'Machine Name' },
      { value: formData.rollNo, name: 'Roll No' }
    ];
    
    const emptyFields = requiredFields.filter(field => !field.value);
    if (emptyFields.length > 0) {
      toast.error('Error', `Please fill in: ${emptyFields.map(field => field.name).join(', ')}`);
      return;
    }
    
    setIsLoading(true);
    try {
      // Create roll confirmation data with default fabric specifications
      const rollConfirmationData: RollConfirmationRequestDto = {
        allotId: formData.allotId,
        machineName: formData.machineName,
        rollPerKg: selectedMachine?.rollPerKg || 0,
        greyGsm: 0, // Default value
        greyWidth: 0, // Default value
        blendPercent: 0, // Default value
        cotton: 0, // Default value
        polyester: 0, // Default value
        spandex: 0, // Default value
        rollNo: formData.rollNo
      };
      
      await RollConfirmationService.createRollConfirmation(rollConfirmationData);
      toast.success('Success', 'Roll capture saved successfully');
      
      // Reset form
      setFormData({
        allotId: '', machineName: '', rollNo: '', greyGsm: '0', greyWidth: '0', blendPercent: '0', cotton: '0', polyester: '0', spandex: '0'
      });
      setAllotmentData(null);
      setSalesOrderData(null);
      setSelectedMachine(null);
    } catch (err) {
      console.error('Error saving roll confirmation:', err);
      toast.error('Error', 'This roll has already been captured. Please scanned next roll.');
      setAllotmentData(null);
      setSalesOrderData(null);
      setSelectedMachine(null);
      
    } finally {
      setIsLoading(false);
      if (lotIdRef.current) {
        lotIdRef.current.focus();
      }
    }
  };

  return (
    <div className="p-2 max-w-4xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <CardTitle className="text-white text-base font-semibold text-center">Production Capture</CardTitle>
        </CardHeader>
        
        <CardContent className="p-3">
          <div className="absolute -left-full top-0 opacity-0 w-0 h-0 overflow-hidden"><input type="text" /></div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Main Input Fields - Compact 4-column grid */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 p-2 bg-gray-50 rounded-md">
              {[
                { id: 'allotId', label: 'Lot ID *', value: formData.allotId, disabled: !!allotmentData },
                { id: 'machineName', label: 'Machine Name *', value: formData.machineName, disabled: !!selectedMachine },
                { id: 'rollNo', label: 'Roll No. *', value: formData.rollNo, disabled: !!formData.allotId && !!formData.machineName },
          
              ].map(field => (
                <div key={field.id} className="space-y-1">
                  <Label htmlFor={field.id} className="text-xs font-medium text-gray-700">{field.label}</Label>
                  <Input 
                    id={field.id} 
                    name={field.id} 
                    value={field.value} 
                    onChange={handleChange} 
                    placeholder={`Enter ${field.label.replace(' *', '')}`} 
                    required={field.label.includes('*')} 
                    className="text-xs h-8 bg-white" 
                    ref={field.id === 'allotId' ? lotIdRef : undefined}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Move focus to next field or submit if last field
                        if (field.id === 'allotId') {
                          const machineInput = document.getElementById('machineName');
                          if (machineInput) machineInput.focus();
                        } else if (field.id === 'machineName') {
                          const rollInput = document.getElementById('rollNo');
                          if (rollInput) rollInput.focus();
                        } else if (field.id === 'rollNo') {
                          const form = e.currentTarget.closest('form');
                          if (form) form.requestSubmit();
                        }
                      }
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Order & Machine Info - Compact display */}
            {salesOrderData && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-green-800 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Roll Details
                  </h3>
                  <span className="text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded">{salesOrderData.voucherNumber || 'N/A'}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {[
                    { label: 'Party:', value: salesOrderData.partyName || 'N/A' },
                    { label: 'Order Date:', value: salesOrderData.salesDate ? new Date(salesOrderData.salesDate).toLocaleDateString() : 'N/A' },
                    { label: 'Machine:', value: selectedMachine?.machineName || 'N/A' },
                    { label: 'Rolls/Kg:', value: selectedMachine?.rollPerKg?.toFixed(3) || 'N/A' }
                  ].map((item, index) => (
                    <div key={index} className="flex">
                      <span className="text-gray-600 mr-1">{item.label}</span>
                      <div className="font-small truncate " title={item.value.toString()}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {salesOrderData.items && salesOrderData.items.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-green-200">
                    <div className="text-[10px] text-green-700 font-medium mb-0.5">Items:</div>
                    <div className="flex flex-wrap gap-0.5 max-h-8 overflow-y-auto">
                      {salesOrderData.items.slice(0, 2).map((item, index) => (
                        <span key={index} className="text-[10px] bg-white/80 text-gray-700 px-1 py-0.5 rounded border" title={item.descriptions || item.stockItemName || 'N/A'}>
                          {item.descriptions || item.stockItemName || 'N/A'}
                        </span>
                      ))}
                      {salesOrderData.items.length > 2 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">+{salesOrderData.items.length - 2} more</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Note about fabric specifications */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-center">
              <p className="text-xs text-blue-700">
                Fabric specifications will be entered in the <strong>Quality Checking</strong> section after production.
              </p>
            </div>
            
            <div className="flex justify-center pt-1">
              <Button type="submit" disabled={isLoading || isFetchingData} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 h-8 min-w-28">
                {isLoading || isFetchingData ? (
                  <div className="flex items-center">
                    <div className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    <span className="text-xs">{isLoading ? 'Saving...' : 'Loading...'}</span>
                  </div>
                ) : (
                  <span className="text-xs">Save Roll Capture</span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionConfirmation;