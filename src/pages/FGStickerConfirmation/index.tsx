import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { ProductionAllotmentService } from '@/services/productionAllotmentService';
import { RollConfirmationService } from '@/services/rollConfirmationService';
import { SalesOrderService } from '@/services/salesOrderService';
import { FGStickerService } from '@/services/fgStickerService';
import type {
  ProductionAllotmentResponseDto,
  SalesOrderDto,
  MachineAllocationResponseDto,
  RollConfirmationResponseDto,
} from '@/types/api-types';
import { getTapeColorStyle } from '@/utils/tapeColorUtils';

interface RollDetails {
  allotId: string;
  machineName: string;
  rollNo: string;
  greyGsm?: number;
  fgRollNo?: number;
}

const FGStickerConfirmation: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const [weightData, setWeightData] = useState({
    measuredGross: '0.00', // raw from scale
    grossWithShrinkRap: '0.00', // displayed gross = measuredGross + shrinkRapWeight
    tareWeight: '0.00',
    netWeight: '0.00', // measuredGross - tareWeight (shrink-rap NOT included)
  });

  const [formData, setFormData] = useState({
    rollId: '',
    ipAddress: '192.168.100.175',
    allotId: '',
    machineName: '',
    rollNo: '',
  });

  const [rollDetails, setRollDetails] = useState<RollDetails | null>(null);
  const [allotmentData, setAllotmentData] = useState<ProductionAllotmentResponseDto | null>(null);
  const [salesOrderData, setSalesOrderData] = useState<SalesOrderDto | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<MachineAllocationResponseDto | null>(null);
  const [isFGStickerGenerated, setIsFGStickerGenerated] = useState<boolean | null>(null);
  const [, setRollConfirmationData] = useState<RollConfirmationResponseDto | null>(null);

  const lotIdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lotIdRef.current) {
      lotIdRef.current.focus();
    }
  }, []);

  const recomputeWeights = (measuredGross: number, tareWeight: number, shrinkRapWeight = 0) => {
    const grossWithShrinkRap = (measuredGross + shrinkRapWeight).toFixed(2);
    const net = (measuredGross - tareWeight).toFixed(2);

    setWeightData({
      measuredGross: measuredGross.toFixed(2),
      grossWithShrinkRap,
      tareWeight: tareWeight.toFixed(2),
      netWeight: net,
    });
  };

  const resetForm = () => {
    setFormData({
      rollId: '',
      ipAddress: formData.ipAddress || '192.168.100.175',
      allotId: '',
      machineName: '',
      rollNo: '',
    });
    setWeightData({
      measuredGross: '0.00',
      grossWithShrinkRap: '0.00',
      tareWeight: '0.00',
      netWeight: '0.00',
    });
    setRollDetails(null);
    setAllotmentData(null);
    setSalesOrderData(null);
    setSelectedMachine(null);
    setIsFGStickerGenerated(null);
    setRollConfirmationData(null);
  };

  const focusOnBarcodeField = () => {
    setTimeout(() => {
      if (lotIdRef.current) {
        lotIdRef.current.focus();
        lotIdRef.current.select();
      }
    }, 100);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'allotId') {
      setFormData((prev) => ({ ...prev, allotId: value }));
      if (value.includes('#')) {
        handleRollBarcodeScan(value);
      }
      return;
    }

    if (['ipAddress', 'machineName', 'rollNo', 'rollId'].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'measuredGross' || name === 'grossWeight') {
      const mg = value === '' ? 0 : parseFloat(value);
      const tare = parseFloat(weightData.tareWeight) || 0;
      const shrinkRapWeight = allotmentData?.shrinkRapWeight ? Number(allotmentData.shrinkRapWeight) : 0;
      recomputeWeights(isNaN(mg) ? 0 : mg, tare, shrinkRapWeight);
      return;
    }

    if (name === 'tareWeight') {
      const tare = value === '' ? 0 : parseFloat(value);
      const measured = parseFloat(weightData.measuredGross) || 0;
      const shrinkRapWeight = allotmentData?.shrinkRapWeight ? Number(allotmentData.shrinkRapWeight) : 0;
      recomputeWeights(measured, isNaN(tare) ? 0 : tare, shrinkRapWeight);
    }
  };

  const fetchWeightData = async () => {
    if (!formData.ipAddress) {
      toast.error('Invalid IP', 'Please enter a valid IP address');
      return;
    }

    try {
      const data = await RollConfirmationService.getWeightData({
        ipAddress: formData.ipAddress,
        port: 23,
      });

      if (!data || data.grossWeight === undefined || data.grossWeight === null) {
        toast.error('No Data', 'Weight machine returned no data. Check connection.');
        return;
      }

      const measuredGross = parseFloat(data.grossWeight) || 0;

      if (measuredGross <= 0) {
        toast.warning('Zero Weight', 'Scale shows 0.00 kg. Place the roll on the scale and try again.');
        return;
      }

      const shrinkRapWeight = allotmentData?.shrinkRapWeight ? Number(allotmentData.shrinkRapWeight) : 0;
      const tare = allotmentData?.tubeWeight ? Number(allotmentData.tubeWeight) : parseFloat(weightData.tareWeight) || 0;

      recomputeWeights(measuredGross, tare, shrinkRapWeight);

      toast.success('Weight Fetched', `Gross weight: ${measuredGross.toFixed(2)} kg fetched successfully`);
    } catch (error: any) {
      console.error('Error fetching weight data:', error);

      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        toast.error('Connection Failed', 'Cannot connect to weight machine. Check IP address and network cable.');
      } else if (error.message?.includes('timeout')) {
        toast.error('Timeout', 'Weight machine not responding. Check if it is powered on.');
      } else {
        toast.error('Scale Error', 'Failed to read weight from machine. Please try again.');
      }
    }
  };

  const fetchAllotmentData = async (allotId: string, machineNameFromBarcode?: string) => {
    if (!allotId) return;

    setIsFetchingData(true);
    try {
      const allotment = await ProductionAllotmentService.getProductionAllotmentByAllotId(allotId);
      setAllotmentData(allotment);

      const tareWeightValue = allotment.tubeWeight ? Number(allotment.tubeWeight) : 0;
      const currentMeasuredGross = parseFloat(weightData.measuredGross) || 0;
      const shrinkRap = allotment.shrinkRapWeight ? Number(allotment.shrinkRapWeight) : 0;
      recomputeWeights(currentMeasuredGross, tareWeightValue, shrinkRap);

      if (allotment.salesOrderId) {
        try {
          const salesOrder = await SalesOrderService.getSalesOrderById(allotment.salesOrderId);
          setSalesOrderData(salesOrder);
        } catch (salesOrderError) {
          console.error('Error fetching sales order data:', salesOrderError);
          setSalesOrderData(null);
        }
      }

      let selectedMachineData = null;
      if (allotment.machineAllocations?.length > 0) {
        selectedMachineData = machineNameFromBarcode
          ? allotment.machineAllocations.find(
              (ma: MachineAllocationResponseDto) => ma.machineName === machineNameFromBarcode
            ) || allotment.machineAllocations[0]
          : allotment.machineAllocations[0];
        setSelectedMachine(selectedMachineData);
      }

      setIsFGStickerGenerated(null);
      toast.success('Success', 'Production planning data loaded successfully.');
    } catch (err: any) {
      console.error('Error fetching allotment data:', err);
      resetForm();
      focusOnBarcodeField();
      toast.error('Invalid Lot', err.message || 'Lot ID not found or invalid. Please scan correct barcode.');
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleRollBarcodeScan = async (barcodeData: string) => {
    try {
      const parts = barcodeData.split('#');
      if (parts.length >= 3) {
        const [allotId, machineName, rollNo] = parts;

        setFormData((prev) => ({
          ...prev,
          allotId: allotId || '',
          machineName: machineName || '',
          rollNo: rollNo || '',
          rollId: barcodeData,
        }));

        const newRollDetails: RollDetails = {
          allotId,
          machineName,
          rollNo,
          fgRollNo: undefined,
        };
        setRollDetails(newRollDetails);

        await fetchAllotmentData(allotId, machineName);

        try {
          const rollConfirmations = await RollConfirmationService.getRollConfirmationsByAllotId(allotId);
          const rollConfirmation = rollConfirmations.find(
            (rc: RollConfirmationResponseDto) => rc.machineName === machineName && rc.rollNo === rollNo
          );

          if (rollConfirmation) {
            setIsFGStickerGenerated(rollConfirmation.isFGStickerGenerated);
            setRollConfirmationData(rollConfirmation);
            setRollDetails((prev) =>
              prev
                ? {
                    ...prev,
                    greyGsm: rollConfirmation.greyGsm,
                    fgRollNo: rollConfirmation.fgRollNo,
                  }
                : null
            );

            if (rollConfirmation.isFGStickerGenerated) {
              toast.warning(
                'Already Generated',
                `FG Sticker already generated for Roll No: ${rollNo} on ${machineName}. Scan next roll.`
              );
              resetForm();
              focusOnBarcodeField();
            }
          } else {
            setIsFGStickerGenerated(false);
            setRollConfirmationData(null);
          }
        } catch (error) {
          console.error('Error checking FG sticker status:', error);
          setIsFGStickerGenerated(false);
        }

        toast.success('Roll Loaded', 'Roll details loaded successfully');
      } else {
        toast.error('Invalid Barcode', 'Scanned barcode is incomplete. Please scan full barcode.');
      }
    } catch (err: any) {
      console.error('Error processing barcode:', err);
      resetForm();
      focusOnBarcodeField();
      toast.error('Scan Failed', 'Invalid or corrupted barcode. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.rollId) {
      toast.error('Missing Roll', 'Please scan a valid roll barcode first.');
      focusOnBarcodeField();
      return;
    }

    const measuredGross = parseFloat(weightData.measuredGross) || 0;
    if (measuredGross <= 0) {
      toast.error('Invalid Weight', 'Gross weight must be greater than 0. Please fetch weight from scale.');
      return;
    }

    const netWeight = parseFloat(weightData.netWeight);
    if (netWeight < 0) {
      toast.error('Negative Net', 'Net weight cannot be negative. Check tare weight.');
      return;
    }

    setIsLoading(true);

    try {
      if (!rollDetails || !allotmentData) {
        toast.error('Data Missing', 'Roll or planning data not loaded. Rescan barcode.');
        resetForm();
        focusOnBarcodeField();
        return;
      }

      const rollConfirmations = await RollConfirmationService.getRollConfirmationsByAllotId(rollDetails.allotId);
      const rollConfirmation = rollConfirmations.find(
        (rc: RollConfirmationResponseDto) =>
          rc.machineName === rollDetails.machineName && rc.rollNo === rollDetails.rollNo
      );

      if (!rollConfirmation) {
        toast.error('Not Found', 'Roll confirmation record not found. Contact supervisor.');
        resetForm();
        focusOnBarcodeField();
        return;
      }

      if (rollConfirmation.isFGStickerGenerated) {
        toast.warning(
          'Duplicate Sticker',
          `FG Sticker already generated for Roll No: ${rollDetails.rollNo} on ${rollDetails.machineName}. Scan next roll.`
        );
        resetForm();
        focusOnBarcodeField();
        return;
      }

      const shrinkRapWeightValue = allotmentData.shrinkRapWeight ? Number(allotmentData.shrinkRapWeight) : 0;
      const tare = parseFloat(weightData.tareWeight) || 0;

      const grossToSave = measuredGross + shrinkRapWeightValue;
      const netToSave = measuredGross - tare;

      await RollConfirmationService.updateRollConfirmation(rollConfirmation.id, {
        grossWeight: Number(grossToSave.toFixed(2)),
        tareWeight: Number(tare.toFixed(2)),
        netWeight: Number(netToSave.toFixed(2)),
        isFGStickerGenerated: true,
      });

      try {
        const printResult = await FGStickerService.printFGRollSticker(rollConfirmation.id);

        if (printResult.success) {
          toast.success(
            'FG Sticker Generated!',
            `Roll ${rollDetails.rollNo} confirmed successfully.\nNet Weight: ${netToSave.toFixed(2)} kg\nSticker printed.`
          );
        } else {
          toast.warning(
            'Print Failed',
            `Data saved, but printing failed: ${printResult.message}\nPlease check printer and reprint manually if needed.`
          );
        }
      } catch (printError) {
        console.error('Print error:', printError);
        toast.warning(
          'Printer Error',
          'Data saved successfully, but sticker could not be printed.\nCheck printer connection/power.'
        );
      }

      resetForm();
      focusOnBarcodeField();
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);

      if (error.message?.includes('FG Sticker has already been generated')) {
        toast.warning(
          'Duplicate Detected',
          `This roll already has an FG Sticker generated.\nRoll: ${rollDetails?.rollNo}`
        );
        resetForm();
        focusOnBarcodeField();
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        toast.error('Network Error', 'Cannot connect to server. Check internet or server status.');
      } else {
        toast.error('Save Failed', error.message || 'Failed to save FG Sticker confirmation. Try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-2 max-w-4xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <CardTitle className="text-white text-base font-semibold text-center">
            FG Sticker Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="absolute -left-full top-0 opacity-0 w-0 h-0 overflow-hidden">
            <input type="text" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Roll Scanning Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3">
              <h3 className="text-xs font-semibold text-blue-800 mb-2">Roll Scanning</h3>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
                {[
                  { id: 'allotId', label: 'Lot ID', value: formData.allotId, disabled: !!rollDetails },
                  { id: 'machineName', label: 'Machine Name', value: formData.machineName, disabled: !!rollDetails },
                  { id: 'rollNo', label: 'Roll No.', value: formData.rollNo, disabled: !!rollDetails },
                ].map((field) => (
                  <div key={field.id} className="space-y-1">
                    <Label htmlFor={field.id} className="text-xs font-medium text-gray-700">
                      {field.label}
                    </Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      value={field.value}
                      onChange={handleChange}
                      placeholder={`Scan barcode or enter ${field.label}`}
                      disabled={field.disabled}
                      className="text-xs h-8 bg-white"
                      ref={field.id === 'allotId' ? lotIdRef : undefined}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (field.id === 'allotId') {
                            document.getElementById('machineName')?.focus();
                          } else if (field.id === 'machineName') {
                            document.getElementById('rollNo')?.focus();
                          } else if (field.id === 'rollNo') {
                            e.currentTarget.closest('form')?.requestSubmit();
                          }
                        }
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Rest of your UI (sales order, packaging, etc.) remains unchanged */}
              {salesOrderData && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-2 mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-green-800 flex items-center">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Roll Details
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                        {salesOrderData.voucherNumber || 'N/A'}
                      </span>
                      {isFGStickerGenerated !== null && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isFGStickerGenerated
                              ? 'text-red-600 bg-red-100'
                              : 'text-green-600 bg-green-100'
                          }`}
                        >
                          {isFGStickerGenerated ? 'FG Sticker Generated' : 'Ready for FG Sticker'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    {[
                      { label: 'Party:', value: salesOrderData.partyName || 'N/A' },
                      {
                        label: 'Order Date:',
                        value: salesOrderData.salesDate
                          ? new Date(salesOrderData.salesDate).toLocaleDateString()
                          : 'N/A',
                      },
                      { label: 'Machine:', value: selectedMachine?.machineName || 'N/A' },
                      { label: 'Rolls/Kg:', value: selectedMachine?.rollPerKg?.toFixed(3) || 'N/A' },
                      { label: 'FG Roll No:', value: rollDetails?.fgRollNo || 'N/A' },
                    ].map((item, index) => (
                      <div key={index} className="flex">
                        <span className="text-gray-600 mr-1">{item.label}</span>
                        <div className="font-small truncate" title={item.value.toString()}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {salesOrderData.items && salesOrderData.items.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-green-200">
                      <div className="text-[10px] text-green-700 font-medium mb-0.5">Items:</div>
                      <div className="flex flex-wrap gap-0.5 max-h-8 overflow-y-auto">
                        {salesOrderData.items.slice(0, 2).map((item, index) => (
                          <span
                            key={index}
                            className="text-[10px] bg-white/80 text-gray-700 px-1 py-0.5 rounded border"
                            title={item.descriptions || item.stockItemName || 'N/A'}
                          >
                            {item.descriptions || item.stockItemName || 'N/A'}
                          </span>
                        ))}
                        {salesOrderData.items.length > 2 && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                            +{salesOrderData.items.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {allotmentData && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-md p-2 mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-amber-800 flex items-center">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1"></span>Packaging Details
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[13px]">
                    <div className="flex">
                      <span className="text-gray-600 mr-1">Tube Weight:</span>
                      <div className="font-small truncate" title={`${allotmentData.tubeWeight || 'N/A'} kg`}>
                        {allotmentData.tubeWeight || 'N/A'} kg
                      </div>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 mr-1">Shrink Rap Weight:</span>
                      <div
                        className="font-small truncate"
                        title={
                          allotmentData.shrinkRapWeight !== undefined && allotmentData.shrinkRapWeight !== null
                            ? `${allotmentData.shrinkRapWeight} kg`
                            : 'N/A'
                        }
                      >
                        {allotmentData.shrinkRapWeight !== undefined && allotmentData.shrinkRapWeight !== null
                          ? `${allotmentData.shrinkRapWeight} kg`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 mr-1">Total Weight:</span>
                      <div
                        className="font-small truncate"
                        title={
                          allotmentData.totalWeight !== undefined && allotmentData.totalWeight !== null
                            ? `${allotmentData.totalWeight} kg`
                            : 'N/A'
                        }
                      >
                        {allotmentData.totalWeight !== undefined && allotmentData.totalWeight !== null
                          ? `${allotmentData.totalWeight} kg`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 mr-1">Tape Color:</span>
                      <div className="font-small truncate">
                        <div className="flex items-center">
                          <span className="mr-1">{allotmentData.tapeColor || 'N/A'}</span>
                          {allotmentData.tapeColor &&
                            (() => {
                              const isCombination = allotmentData.tapeColor.includes(' + ');
                              if (isCombination) {
                                const colors = allotmentData.tapeColor.split(' + ');
                                return (
                                  <div className="flex items-center">
                                    <div
                                      className="w-3 h-3 rounded-full border border-gray-300"
                                      style={{ backgroundColor: getTapeColorStyle(colors[0]) }}
                                    />
                                    <div
                                      className="w-3 h-3 rounded-full border border-gray-300 -ml-1"
                                      style={{ backgroundColor: getTapeColorStyle(colors[1]) }}
                                    />
                                  </div>
                                );
                              } else {
                                return (
                                  <div
                                    className="w-3 h-3 rounded-full border border-gray-300"
                                    style={{ backgroundColor: getTapeColorStyle(allotmentData.tapeColor) }}
                                  />
                                );
                              }
                            })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 mr-1">F-GSM:</span>
                      <div
                        className="font-small truncate"
                        title={`${rollDetails?.greyGsm?.toFixed(2) || allotmentData?.reqFinishGsm || 'N/A'}`}
                      >
                        {rollDetails?.greyGsm?.toFixed(2) || allotmentData?.reqFinishGsm || 'N/A'}
                      </div>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 mr-1">FG Roll No:</span>
                      <div className="font-small truncate" title={`${rollDetails?.fgRollNo || 'N/A'}`}>
                        {rollDetails?.fgRollNo || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Weight Machine */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3">
              <h3 className="text-xs font-semibold text-blue-800 mb-2">Weight Machine Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="ipAddress" className="text-xs font-medium text-gray-700">
                    Machine IP Address *
                  </Label>
                  <Input
                    id="ipAddress"
                    name="ipAddress"
                    value={formData.ipAddress}
                    onChange={handleChange}
                    placeholder="Enter IP Address"
                    required
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={fetchWeightData}
                    disabled={isLoading || isFetchingData}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 h-8 text-xs"
                  >
                    Get Weight
                  </Button>
                </div>
              </div>
            </div>

            {/* Real-time Weight */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-3">
              <h3 className="text-xs font-semibold text-green-800 mb-2">Real-time Weight Data</h3>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
                <div className="bg-white p-2 rounded border text-center">
                  <div className="text-xs text-gray-500">Gross WT.(kg)</div>
                  <Input
                    name="measuredGross"
                    value={weightData.measuredGross || ''}
                    onChange={handleChange}
                    type="number"
                    step="0.01"
                    className="text-xl font-bold text-center h-6 p-0 text-blue-600 border-0"
                  />
                  <div className="text-[10px] text-gray-500 mt-1">
                    Displayed gross (incl. shrink-rap): {weightData.grossWithShrinkRap} kg
                  </div>
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <div className="text-xs text-gray-500">Tare WT.(kg)</div>
                  <Input
                    name="tareWeight"
                    value={weightData.tareWeight || ''}
                    onChange={handleChange}
                    type="number"
                    step="0.01"
                    className="text-xl font-bold text-center h-6 p-0 border-0"
                  />
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <div className="text-xs text-gray-500">Net WT.(kg)</div>
                  <div className="text-xl font-bold text-green-600">{weightData.netWeight}</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-gray-600 italic">
                Net Weight = Measured Gross − Tare (tube weight). Shrink-rap is only added to displayed gross, not net.
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-2">
              <Button
                type="submit"
                disabled={isLoading || isFetchingData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 h-8 min-w-32"
              >
                {isLoading || isFetchingData ? (
                  <div className="flex items-center">
                    <div className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    <span className="text-xs">{isLoading ? 'Saving...' : 'Loading...'}</span>
                  </div>
                ) : (
                  <span className="text-xs">Confirm & Print FG Sticker</span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FGStickerConfirmation;