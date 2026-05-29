import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { RollConfirmationService } from '@/services/rollConfirmationService';
import { ProductionAllotmentService } from '@/services/productionAllotmentService';
import type { RollConfirmationUpdateDto, ProductionAllotmentResponseDto } from '@/types/api-types';

const QualityChecking: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [formData, setFormData] = useState({
    allotId: '',
    machineName: '',
    rollNo: '',
    greyGsm: '',
    greyWidth: '',
    cotton: '0',
    polyester: '0',
    spandex: '0',
    blendPercent: '0',
  });
  const [allotmentData, setAllotmentData] = useState<ProductionAllotmentResponseDto | null>(null);
  const [rollDescription, setRollDescription] = useState<string>('');

  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanBufferRef = useRef<string>('');

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  const focusScanInput = useCallback(() => {
    setTimeout(() => {
      scanInputRef.current?.focus();
      scanInputRef.current?.select();
    }, 100);
  }, []);

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fetchAllotmentData = async (allotId: string) => {
    if (!allotId) return;

    setIsFetchingData(true);
    try {
      const allotmentData = await ProductionAllotmentService.getProductionAllotmentByAllotId(allotId);
      setAllotmentData(allotmentData);

      setFormData(prev => ({
        ...prev,
        greyGsm: allotmentData.reqGreyGsm?.toString() || prev.greyGsm,
        greyWidth: allotmentData.reqGreyWidth?.toString() || prev.greyWidth,
      }));

      setRollDescription(allotmentData.itemName || '');
      toast.success('Success', 'Production planning data loaded successfully.');
      focusScanInput();
    } catch (err) {
      console.error('Error fetching lotment data:', err);
      setAllotmentData(null);
      setRollDescription('');
      toast.error('Error', err instanceof Error ? err.message : 'Failed to fetch lotment data.');
      focusScanInput();
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleBarcodeScan = (barcodeData: string) => {
    try {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
      scanBufferRef.current = '';
      setScanValue('');

      const parts = barcodeData.split('#');
      if (parts.length >= 3) {
        const allotId = parts[0] || '';
        const machineName = parts[1] || '';
        const rollNo = parts[2] || '';

        setFormData(prev => ({
          ...prev,
          allotId,
          machineName,
          rollNo,
        }));

        if (allotId) {
          fetchAllotmentData(allotId);
        }

        toast.success('Success', 'Barcode data loaded successfully');
        focusScanInput();
      } else {
        toast.error('Error', 'Invalid barcode format. Expected: allotId#machineName#rollNo');
        focusScanInput();
      }
    } catch (err) {
      console.error('Error processing barcode:', err);
      toast.error('Error', 'Failed to process barcode data');
      focusScanInput();
    }
  };

  const handleScanInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setScanValue(value);
    scanBufferRef.current = value;

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
    }

    scanTimerRef.current = setTimeout(() => {
      const scannedValue = scanBufferRef.current.trim();
      if (scannedValue && scannedValue.includes('#')) {
        handleBarcodeScan(scannedValue);
      }
      setScanValue('');
      scanBufferRef.current = '';
    }, 150);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = [
      { value: formData.allotId, name: 'Lot ID' },
      { value: formData.machineName, name: 'Machine Name' },
      { value: formData.rollNo, name: 'Roll No' },
      { value: formData.greyGsm, name: 'Act GSM' },
      { value: formData.greyWidth, name: 'Act Width' },
    ];

    const emptyFields = requiredFields.filter(field => !field.value);
    if (emptyFields.length > 0) {
      toast.error('Error', `Please fill in: ${emptyFields.map(field => field.name).join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      const rollConfirmations = await RollConfirmationService.getRollConfirmationsByAllotId(
        formData.allotId
      );

      const existingRoll = rollConfirmations.find(
        (roll) => roll.machineName === formData.machineName && roll.rollNo === formData.rollNo
      );

      if (!existingRoll) {
        toast.error(
          'Error',
          'Roll not found. Please capture the roll first in Production Confirmation.'
        );
        return;
      }

      const updateData: RollConfirmationUpdateDto = {
        greyGsm: parseFloat(formData.greyGsm) || 0,
        greyWidth: parseFloat(formData.greyWidth) || 0,
        blendPercent: parseFloat(formData.blendPercent) || 0,
        cotton: parseFloat(formData.cotton) || 0,
        polyester: parseFloat(formData.polyester) || 0,
        spandex: parseFloat(formData.spandex) || 0,
      };

      await RollConfirmationService.updateRollConfirmation(existingRoll.id, updateData);

      toast.success('Success', 'Quality checking data saved successfully');

      setFormData({
        allotId: '',
        machineName: '',
        rollNo: '',
        greyGsm: '',
        greyWidth: '',
        cotton: '0',
        polyester: '0',
        spandex: '0',
        blendPercent: '0',
      });
      setAllotmentData(null);
      setRollDescription('');
      setScanValue('');
      focusScanInput();
    } catch (err) {
      console.error('Error saving quality checking data:', err);
      toast.error('Error', 'Failed to save quality checking data.');
      focusScanInput();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-2 max-w-4xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <CardTitle className="text-white text-base font-semibold text-center">
            Quality Checking
          </CardTitle>
        </CardHeader>

        <CardContent className="p-3">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-2">
              <Label htmlFor="scanBarcode" className="text-xs font-medium text-blue-800">
                Scan Barcode
              </Label>
              <Input
                id="scanBarcode"
                ref={scanInputRef}
                value={scanValue}
                onChange={handleScanInput}
                placeholder="Scan allotId#machineName#rollNo"
                className="mt-1 h-8 text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2 bg-gray-50 rounded-md">
              {[
                { id: 'allotId', label: 'Lot ID *', value: formData.allotId, disabled: !!allotmentData },
                { id: 'machineName', label: 'Machine Name *', value: formData.machineName, disabled: !!allotmentData },
                { id: 'rollNo', label: 'Roll No. *', value: formData.rollNo, disabled: !!allotmentData },
              ].map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label htmlFor={field.id} className="text-xs font-medium text-gray-700">
                    {field.label}
                  </Label>
                  <Input
                    id={field.id}
                    name={field.id}
                    value={field.value}
                    onChange={handleFieldChange}
                    placeholder={`Enter ${field.label.replace(' *', '')}`}
                    required
                    disabled={field.disabled}
                    className="text-xs h-8 bg-white"
                  />
                </div>
              ))}
            </div>

            {rollDescription && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-green-800 flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Roll Details
                  </h3>
                </div>

                <div className="text-[10px] text-green-700">
                  <span className="font-medium">Description:</span> {rollDescription}
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-md p-3 bg-white">
              <div className="flex items-center mb-2">
                <div className="w-1 h-3 bg-blue-600 rounded mr-1.5"></div>
                <h3 className="text-sm font-semibold text-gray-80">Fabric Specifications</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-2 bg-blue-50 rounded-md">
                {[
                  { label: 'Plan GSM', value: allotmentData?.reqGreyGsm?.toString() || 'N/A' },
                  { label: 'Plan Width', value: allotmentData?.reqGreyWidth?.toString() || 'N/A' },
                  { label: 'Act GSM *', value: '' },
                  { label: 'Act Width *', value: '' },
                ].map((item, index) => (
                  <div key={index} className="text-center">
                    <Label className="text-[12px] text-blue-700 font-medium block mb-0.5">
                      {item.label}
                    </Label>
                    {index < 2 ? (
                      <div className="text-sm font-bold text-blue-900">{item.value}</div>
                    ) : (
                      <Input
                        id={index === 2 ? 'greyGsm' : 'greyWidth'}
                        name={index === 2 ? 'greyGsm' : 'greyWidth'}
                        value={formData[index === 2 ? 'greyGsm' : 'greyWidth']}
                        onChange={handleFieldChange}
                        type="number"
                        step="1"
                        className="h-7 text-xs p-1"
                        required
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cotton', label: 'COTTON', value: formData.cotton },
                  { id: 'polyester', label: 'POLYESTER', value: formData.polyester },
                  { id: 'spandex', label: 'SPANDEX', value: formData.spandex },
                  { id: 'blendPercent', label: 'Blend %', value: formData.blendPercent },
                ].map((field) => (
                  <div key={field.id} className="space-y-1">
                    <Label htmlFor={field.id} className="text-[10px] font-medium text-gray-700">
                      {field.label}
                    </Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      value={field.value}
                      onChange={handleFieldChange}
                      type="number"
                      step="1"
                      className="h-7 text-xs p-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <Button
                type="submit"
                disabled={isLoading || isFetchingData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 h-8 min-w-28"
              >
                {isLoading || isFetchingData ? (
                  <div className="flex items-center">
                    <div className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    <span className="text-xs">{isLoading ? 'Saving...' : 'Loading...'}</span>
                  </div>
                ) : (
                  <span className="text-xs">Save Quality Check</span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityChecking;
