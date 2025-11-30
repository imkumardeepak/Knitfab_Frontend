import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { ProductionAllotmentService } from '@/services/productionAllotmentService';
import { SalesOrderService } from '@/services/salesOrderService';
import { InspectionService } from '@/services/inspectionService';
import type { ProductionAllotmentResponseDto, MachineAllocationResponseDto } from '@/types/api-types';
import type { SalesOrderDto, InspectionRequestDto } from '@/types/api-types';

const RollInspection: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'faults' | 'summary'>('basic');
  
  // Form fields
  const [formData, setFormData] = useState({
    allotId: '',
    machineName: '',
    rollNo: '',
    thinPlaces: '0', thickPlaces: '0', thinLines: '0', thickLines: '0', doubleParallelYarn: '0',
    haidJute: '0', colourFabric: '0',
    holes: '0', dropStitch: '0', lycraStitch: '0', lycraBreak: '0', ffd: '0', 
    needleBroken: '0', knitFly: '0', oilSpots: '0', oilLines: '0', verticalLines: '0',
    grade: '', totalFaults: '0', remarks: '', flag: true
  });

  const [allotmentData, setAllotmentData] = useState<ProductionAllotmentResponseDto | null>(null);
  const [salesOrderData, setSalesOrderData] = useState<SalesOrderDto | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<MachineAllocationResponseDto | null>(null);

  // Ref for the Lot ID input field
  const lotIdRef = useRef<HTMLInputElement>(null);
  
  // Focus on the Lot ID input field when the page loads
  useEffect(() => {
    if (lotIdRef.current) {
      lotIdRef.current.focus();
    }
  }, []);

  const isAxiosError = (error: unknown): error is { response?: { status: number } } => {
    return typeof error === 'object' && error !== null && 'response' in error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = e.target;
    handleBarcodeScan(value);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateTotalFaults = () => {
    const faultFields = [
      'thinPlaces', 'thickPlaces', 'thinLines', 'thickLines', 'doubleParallelYarn',
      'haidJute', 'colourFabric', 'holes', 'dropStitch', 'lycraStitch', 'lycraBreak', 
      'ffd', 'needleBroken', 'knitFly', 'oilSpots', 'oilLines', 'verticalLines'
    ];
    
    return faultFields.reduce((total, field) => {
      const value = parseInt(formData[field as keyof typeof formData] as string || '0');
      return total + (isNaN(value) ? 0 : value);
    }, 0);
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
        if (machineNameFromBarcode) {
          selectedMachineData = allotmentData.machineAllocations.find(
            ma => ma.machineName === machineNameFromBarcode
          ) || allotmentData.machineAllocations[0];
        } else {
          selectedMachineData = allotmentData.machineAllocations[0];
        }
        setSelectedMachine(selectedMachineData);
      }
      
      toast.success('Success', 'Lotment data loaded successfully');
    } catch (err) {
      console.error('Error fetching lotment data:', err);
      setAllotmentData(null);
      setSalesOrderData(null);
      setSelectedMachine(null);
      toast.error('Error', 'Failed to fetch lotment data. Please check the lotment ID and try again.');
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleBarcodeScan = (barcodeData: string) => {
    try {
      const parts = barcodeData.split('#');
      if (parts.length >= 3) {
        const newAllotId = parts[0] || '';
        const machineName = parts[1] || '';
        setFormData(prev => ({
          ...prev,
          allotId: newAllotId,
          machineName: machineName,
          rollNo: parts[2] || '',
        }));
        
        fetchAllotmentData(newAllotId, machineName);
        toast.success('Success', 'Barcode data loaded successfully');
      } else {
        toast.error('Error', 'Invalid barcode format. Expected: ALLOTID#MACHINENAME#ROLLNO');
      }
    } catch (err) {
      console.error('Error processing barcode:', err);
      toast.error('Error', 'Failed to process barcode data');
    }
  };


  const submitInspection = async (flag: boolean, actionType: 'approve' | 'hold' | 'reject') => {
    const requiredFields = [
      { value: formData.allotId, name: 'Lot ID' },
      { value: formData.machineName, name: 'Machine Name' },
      { value: formData.rollNo, name: 'Roll No' }
    ];
    
    if (actionType === 'approve') {
      requiredFields.push({ value: formData.grade, name: 'Grade' });
    }
    
    // Require remarks only for reject action
    if (actionType === 'reject' && !formData.remarks.trim()) {
      toast.error('Error', 'Remarks are required when rejecting a roll');
      return;
    }
    
    const emptyFields = requiredFields.filter(field => !field.value);
    if (emptyFields.length > 0) {
      const missingFields = emptyFields.map(field => field.name).join(', ');
      toast.error('Error', `Please fill in all required fields: ${missingFields}`);
      return;
    }
    
    setIsLoading(true);
    try {
      const existingInspections = await InspectionService.getInspectionsByAllotId(formData.allotId);
      const existingInspection = existingInspections.find(
        inspection => 
          inspection.machineName === formData.machineName && 
          inspection.rollNo === formData.rollNo
      );
      
      if (existingInspection) {
        toast.error('Error', `An inspection record already exists for this roll (Roll No: ${existingInspection.rollNo}).`);
        return;
      }
      
      const totalFaults = calculateTotalFaults();
      let remarks = formData.remarks;
      let grade = formData.grade;

      if (actionType === 'hold') {
        remarks = remarks || 'ROLL HELD - Requires further inspection';
      } else if (actionType === 'reject') {
        grade = grade || 'C';
        remarks = remarks || 'Roll rejected during inspection';
      }

      const inspectionData: InspectionRequestDto = {
        allotId: formData.allotId,
        machineName: formData.machineName,
        rollNo: formData.rollNo,
        thinPlaces: parseInt(formData.thinPlaces) || 0,
        thickPlaces: parseInt(formData.thickPlaces) || 0,
        thinLines: parseInt(formData.thinLines) || 0,
        thickLines: parseInt(formData.thickLines) || 0,
        doubleParallelYarn: parseInt(formData.doubleParallelYarn) || 0,
        haidJute: parseInt(formData.haidJute) || 0,
        colourFabric: parseInt(formData.colourFabric) || 0,
        holes: parseInt(formData.holes) || 0,
        dropStitch: parseInt(formData.dropStitch) || 0,
        lycraStitch: parseInt(formData.lycraStitch) || 0,
        lycraBreak: parseInt(formData.lycraBreak) || 0,
        ffd: parseInt(formData.ffd) || 0,
        needleBroken: parseInt(formData.needleBroken) || 0,
        knitFly: parseInt(formData.knitFly) || 0,
        oilSpots: parseInt(formData.oilSpots) || 0,
        oilLines: parseInt(formData.oilLines) || 0,
        verticalLines: parseInt(formData.verticalLines) || 0,
        grade: grade,
        totalFaults: totalFaults,
        remarks: remarks,
        createdDate: new Date().toISOString(),
        flag: flag
      };
      
      await InspectionService.createInspection(inspectionData);
      
      toast.success('Success', `Roll ${actionType === 'approve' ? 'approved' : actionType === 'hold' ? 'held' : 'rejected'} successfully`);
      
      // Reset form
      setFormData({
        allotId: '', machineName: '', rollNo: '',
        thinPlaces: '0', thickPlaces: '0', thinLines: '0', thickLines: '0', doubleParallelYarn: '0',
        haidJute: '0', colourFabric: '0',
        holes: '0', dropStitch: '0', lycraStitch: '0', lycraBreak: '0', ffd: '0', 
        needleBroken: '0', knitFly: '0', oilSpots: '0', oilLines: '0', verticalLines: '0',
        grade: '', totalFaults: '0', remarks: '', flag: true
      });
      setAllotmentData(null);
      setSalesOrderData(null);
      setSelectedMachine(null);
      setActiveSection('basic');

    } catch (err: unknown) {
      console.error(`Error ${actionType}ing roll:`, err);
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error('Error', 'An inspection record already exists for this roll.');
      } else {
        toast.error('Error', `First confirm Your Roll,then inspect it.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitInspection(true, 'approve');
  };

  const handleHold = (e: React.FormEvent) => {
    e.preventDefault();
    submitInspection(false, 'hold');
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    submitInspection(false, 'reject');
  };

  const faultGroups = [
    {
      title: "Spinning Faults",
      fields: [
        { id: 'thinPlaces', label: 'Thin Places' },
        { id: 'thickPlaces', label: 'Thick Places' },
        { id: 'thinLines', label: 'Thin Lines' },
        { id: 'thickLines', label: 'Thick Lines' },
        { id: 'doubleParallelYarn', label: 'Double Yarn' }
      ]
    },
    {
      title: "Contamination",
      fields: [
        { id: 'haidJute', label: 'Haid Jute' },
        { id: 'colourFabric', label: 'Colour Fabric' }
      ]
    },
    {
      title: "Other Faults",
      fields: [
        { id: 'holes', label: 'Holes' },
        { id: 'dropStitch', label: 'Drop Stitch' },
        { id: 'lycraStitch', label: 'Lycra Stitch' },
        { id: 'lycraBreak', label: 'Lycra Break' },
        { id: 'ffd', label: 'FFD' },
        { id: 'needleBroken', label: 'Needle Broken' },
        { id: 'knitFly', label: 'Knit Fly' },
        { id: 'oilSpots', label: 'Oil Spots' },
        { id: 'oilLines', label: 'Oil Lines' },
        { id: 'verticalLines', label: 'Vertical Lines' }
      ]
    }
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Roll Inspection</h1>
        <p className="text-sm text-muted-foreground">
          Scan barcode or enter details to inspect roll quality
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-3">
          <CardTitle className="text-lg text-blue-800">Roll Inspection Details</CardTitle>
        </CardHeader>
        
        <CardContent className="p-4">
          {/* Hidden scanner element */}
          <div className="absolute -left-full top-0 opacity-0">
            <input type="text" />
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mb-4 p-1 bg-gray-100 rounded-lg">
            {(['basic', 'faults', 'summary'] as const).map((section) => (
              <button
                key={section}
                type="button"
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  activeSection === section
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveSection(section)}
              >
                {section === 'basic' && 'Basic Info'}
                {section === 'faults' && 'Fault Details'}
                {section === 'summary' && 'Summary'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Basic Information Section */}
            {activeSection === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="allotId" className="text-xs font-medium">Lot ID *</Label>
                    <Input
                      id="allotId"
                      name="allotId"
                      value={formData.allotId}
                      onChange={handleChange}
                      placeholder="Enter Lot ID"
                      required
                      disabled={!!allotmentData}
                      className="h-8 text-sm"
                      ref={lotIdRef}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="machineName" className="text-xs font-medium">Machine Name *</Label>
                    <Input
                      id="machineName"
                      name="machineName"
                      value={formData.machineName}
                      onChange={handleChange}
                      placeholder="Enter Machine Name"
                      required
                      disabled={!!selectedMachine}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="rollNo" className="text-xs font-medium">Roll No. *</Label>
                    <Input
                      id="rollNo"
                      name="rollNo"
                      value={formData.rollNo}
                      onChange={handleChange}
                      placeholder="Enter Roll Number"
                      required
                      disabled={!!formData.allotId && !!formData.machineName}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Order Summary */}
                {salesOrderData && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <Label className="text-green-600 block">Order No</Label>
                        <div className="font-medium truncate">{salesOrderData.voucherNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <Label className="text-green-600 block">Party</Label>
                        <div className="font-medium truncate" title={salesOrderData.partyName || 'N/A'}>
                          {salesOrderData.partyName || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-green-600 block">Machine</Label>
                        <div className="font-medium">{selectedMachine?.machineName || 'N/A'}</div>
                      </div>
                      <div>
                        <Label className="text-green-600 block">RPM</Label>
                        <div className="font-medium">{selectedMachine?.rpm || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fault Details Section */}
            {activeSection === 'faults' && (
              <div className="space-y-4">
                {faultGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="border rounded-lg p-3">
                    <h4 className="text-sm font-semibold mb-2 text-gray-700">{group.title}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {group.fields.map((field) => (
                        <div key={field.id} className="space-y-1">
                          <Label htmlFor={field.id} className="text-xs">{field.label}</Label>
                          <Input
                            id={field.id}
                            name={field.id}
                            type="number"
                            min="0"
                            value={formData[field.id as keyof typeof formData] as string}
                            onChange={handleChange}
                            className="h-7 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Section */}
            {activeSection === 'summary' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="grade" className="text-xs font-medium">Grade *</Label>
                    <Select 
                      value={formData.grade} 
                      onValueChange={(value) => handleSelectChange('grade', value)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="totalFaults" className="text-xs font-medium">Total Faults</Label>
                    <Input
                      id="totalFaults"
                      name="totalFaults"
                      type="number"
                      value={calculateTotalFaults()}
                      readOnly
                      className="h-8 text-sm bg-gray-100"
                    />
                  </div>
                  
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="remarks" className="text-xs font-medium">Remarks </Label>
                    <Textarea
                      id="remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange}
                      placeholder="Enter any additional remarks"
                      className="text-sm min-h-[60px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-end pt-4 border-t mt-4">
              <Button 
                type="button"
                variant="outline"
                size="sm"
                onClick={handleHold}
                disabled={isLoading || isFetchingData}
                className="text-xs h-8"
              >
                {isLoading ? 'Processing...' : 'Hold Roll'}
              </Button>
              
              <Button 
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={isLoading || isFetchingData}
                className="text-xs h-8"
              >
                {isLoading ? 'Processing...' : 'Reject Roll'}
              </Button>
              
              <Button 
                type="submit" 
                size="sm"
                disabled={isLoading || isFetchingData}
                className="text-xs h-8"
              >
                {isLoading ? 'Saving...' : isFetchingData ? 'Loading...' : 'Approve Roll'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RollInspection;