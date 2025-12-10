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

// Define the type for roll details
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
    grossWeight: '0.00',
    tareWeight: '0.00',
    netWeight: '0.00',
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

  // Ref for the Lot ID input field
  const lotIdRef = useRef<HTMLInputElement>(null);

  // Focus on the Lot ID input field when the page loads
  useEffect(() => {
    if (lotIdRef.current) {
      lotIdRef.current.focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
   handleRollBarcodeScan(value);

    if (name === 'tareWeight') {
      const tareWeight = value === '' ? NaN : parseFloat(value);
      const grossWeight = parseFloat(weightData.grossWeight) || 0;
      const netWeight = isNaN(tareWeight) ? grossWeight.toFixed(2) : (grossWeight - tareWeight).toFixed(2);

      setWeightData((prev) => ({
        ...prev,
        tareWeight: value,
        netWeight: netWeight,
      }));
    }
    //for input gross weight
    if (name === 'grossWeight') {
      const grossWeight = value === '' ? NaN : parseFloat(value);
      const tareWeight = parseFloat(weightData.tareWeight) || 0;
      const netWeight = isNaN(grossWeight) ? tareWeight.toFixed(2) : (grossWeight - tareWeight).toFixed(2);
      setWeightData((prev) => ({
       ...prev,
        grossWeight: value,
        netWeight: netWeight,
      }));
    }
    //for input gross weight  
  };

  // Add new function to fetch weight data from TCP client
  const fetchWeightData = async () => {
    if (!formData.ipAddress) {
      toast.error('Error', 'Please enter a valid IP address');
      return;
    }

    try {
      const data = await RollConfirmationService.getWeightData({
        ipAddress: formData.ipAddress,
        port: 23,
      });

      // Update gross weight with shrink rap weight added
      const measuredGrossWeight = parseFloat(data.grossWeight) || 0;
      const shrinkRapWeight = allotmentData?.shrinkRapWeight || 0;
      const grossWeightWithShrinkRap = (measuredGrossWeight + shrinkRapWeight).toFixed(2);
      
      const currentTareWeight = weightData.tareWeight;
      const newNetWeight = (parseFloat(grossWeightWithShrinkRap) - parseFloat(currentTareWeight)).toFixed(2);

      setWeightData({
        grossWeight: grossWeightWithShrinkRap,
        tareWeight: currentTareWeight,
        netWeight: newNetWeight,
      });

      toast.success('Success', 'Weight data fetched successfully');
    } catch (error) {
      console.error('Error fetching weight data:', error);
      toast.error('Error', 'Failed to fetch weight data');
    }
  };

  const fetchAllotmentData = async (allotId: string, machineNameFromBarcode?: string) => {
    if (!allotId) return;
    setIsFetchingData(true);
    try {
      const allotmentData =
        await ProductionAllotmentService.getProductionAllotmentByAllotId(allotId);
      setAllotmentData(allotmentData);

      // Set tare weight to tube weight only (not total weight)
      let tareWeightValue = '0.00';
      if (allotmentData.tubeWeight) {
        tareWeightValue = parseFloat(allotmentData.tubeWeight.toString()).toFixed(2);
      }

      setWeightData((prev) => ({
        ...prev,
        tareWeight: tareWeightValue,
        netWeight: (parseFloat(prev.grossWeight) - parseFloat(tareWeightValue)).toFixed(2),
      }));

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
          ? allotmentData.machineAllocations.find(
              (ma: MachineAllocationResponseDto) => ma.machineName === machineNameFromBarcode
            ) || allotmentData.machineAllocations[0]
          : allotmentData.machineAllocations[0];
        setSelectedMachine(selectedMachineData);
      }

      setIsFGStickerGenerated(null);

      toast.success('Success', 'Production planning data loaded successfully.');
    } catch (err) {
      console.error('Error fetching lotment data:', err);
      setAllotmentData(null);
      setSalesOrderData(null);
      setSelectedMachine(null);
      setIsFGStickerGenerated(null);
      setRollConfirmationData(null);
      toast.error('Error', err instanceof Error ? err.message : 'Failed to fetch lotment data.');
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
          const rollConfirmations =
            await RollConfirmationService.getRollConfirmationsByAllotId(allotId);
          const rollConfirmation = rollConfirmations.find(
            (rc: RollConfirmationResponseDto) =>
              rc.machineName === machineName && rc.rollNo === rollNo
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
          } else {
            setIsFGStickerGenerated(false);
            setRollConfirmationData(null);
          }
        } catch (error) {
          console.error('Error checking FG sticker status:', error);
          setIsFGStickerGenerated(false);
          setRollConfirmationData(null);
        }

        toast.success('Success', 'Roll details loaded successfully');
      } else {
        toast.error('Error', 'Invalid barcode format. Expected: allotId#machineName#rollNo');
      }
    } catch (err) {
      console.error('Error processing barcode:', err);
      toast.error('Error', 'Failed to process barcode data');
    }
  };

  useEffect(() => {
    const fetchRollConfirmationData = async () => {
      if (rollDetails && rollDetails.allotId && rollDetails.machineName && rollDetails.rollNo) {
        try {
          const rollConfirmations = await RollConfirmationService.getRollConfirmationsByAllotId(
            rollDetails.allotId
          );
          const rollConfirmation = rollConfirmations.find(
            (rc: RollConfirmationResponseDto) =>
              rc.machineName === rollDetails.machineName && rc.rollNo === rollDetails.rollNo
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
          } else {
            setIsFGStickerGenerated(false);
            setRollConfirmationData(null);
          }
        } catch (error) {
          console.error('Error fetching roll confirmation data:', error);
          setIsFGStickerGenerated(false);
          setRollConfirmationData(null);
        }
      }
    };

    fetchRollConfirmationData();
  }, [rollDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = [{ value: formData.rollId, name: 'Roll ID' }];

    const emptyFields = requiredFields.filter((field) => !field.value);
    if (emptyFields.length > 0) {
      toast.error('Error', `Please fill in: ${emptyFields.map((field) => field.name).join(', ')}`);
      return;
    }

    // Validate weight data before submitting
    const grossWeight = parseFloat(weightData.grossWeight);
    const netWeight = parseFloat(weightData.netWeight);

    if (grossWeight <= 0) {
      toast.error('Error', 'Gross weight must be greater than 0');
      return;
    }

    if (netWeight < 0) {
      toast.error('Error', 'Net weight cannot be negative');
      return;
    }

    setIsLoading(true);
    try {
      if (rollDetails && allotmentData) {
        const rollConfirmations = await RollConfirmationService.getRollConfirmationsByAllotId(
          rollDetails.allotId
        );
        const rollConfirmation = rollConfirmations.find(
          (rc: RollConfirmationResponseDto) =>
            rc.machineName === rollDetails.machineName && rc.rollNo === rollDetails.rollNo
        );

        if (rollConfirmation) {
          try {
            // Ensure proper calculation: grossWeight + shrinkRapWeight
            const grossWeightValue = parseFloat(weightData.grossWeight) || 0;
            const shrinkRapWeightValue = allotmentData?.shrinkRapWeight ? parseFloat(allotmentData.shrinkRapWeight.toString()) : 0;
            const finalGrossWeight = grossWeightValue + shrinkRapWeightValue;

            await RollConfirmationService.updateRollConfirmation(rollConfirmation.id, {
              grossWeight: finalGrossWeight,
              tareWeight: parseFloat(weightData.tareWeight),
              netWeight: parseFloat(weightData.netWeight),
              isFGStickerGenerated: true,
            });
          } catch (updateError: unknown) {
            if (
              updateError instanceof Error &&
              updateError.message.includes('FG Sticker has already been generated')
            ) {
              toast.error(
                'Error',
                'FG Sticker has already been generated for this roll. Please scan next roll.'
              );
              setIsLoading(false);
              return;
            }
            throw updateError;
          }

          setIsFGStickerGenerated(true);
          setRollConfirmationData({ ...rollConfirmation, isFGStickerGenerated: true });

          try {
            const printResult = await FGStickerService.printFGRollSticker(rollConfirmation.id);
            if (printResult.success) {
              toast.success('Success', 'FG Sticker Confirmation saved and printed successfully');
            } else {
              toast.error('Error', `FG Sticker saved but failed to print: ${printResult.message}`);
            }
          } catch (printError) {
            console.error('Error printing FG Roll sticker:', printError);
            toast.error('Error', 'FG Sticker saved but failed to print');
          }
        } else {
          toast.error('Error', 'Roll confirmation not found for this roll.');
        }
      }

      // Stop weight monitoring after successful save

      setFormData({
        rollId: '',
        ipAddress: '192.168.100.175',
        allotId: '',
        machineName: '',
        rollNo: '',
      });

      setWeightData({
        grossWeight: '0.00',
        tareWeight: '0.00',
        netWeight: '0.00',
      });

      setRollDetails(null);
      setRollDetails(null);
      setAllotmentData(null);
      setSalesOrderData(null);
      setSelectedMachine(null);
      setIsFGStickerGenerated(null);
      setRollConfirmationData(null);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error(
        'Error',
        'FG Sticker has already been generated for this roll. Please scan next roll.'
      );
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
                  {
                    id: 'allotId',
                    label: 'Lot ID',
                    value: formData.allotId,
                    disabled: !!rollDetails,
                  },
                  {
                    id: 'machineName',
                    label: 'Machine Name',
                    value: formData.machineName,
                    disabled: !!rollDetails,
                  },
                  {
                    id: 'rollNo',
                    label: 'Roll No.',
                    value: formData.rollNo,
                    disabled: !!rollDetails,
                  },
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

              {salesOrderData && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-2 mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-green-800 flex items-center">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Roll
                      Details
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
                      {
                        label: 'Rolls/Kg:',
                        value: selectedMachine?.rollPerKg?.toFixed(3) || 'N/A',
                      },
                      { label: 'FG Roll No:', value: rollDetails?.fgRollNo || 'N/A' },
                    ].map((item, index) => (
                      <div key={index} className="flex">
                        <span className="text-gray-600 mr-1">{item.label}</span>
                        <div className="font-small truncate " title={item.value.toString()}>
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
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1"></span>Packaging
                      Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[13px]">
                    <div className="flex">
                      <span className="text-gray-600 mr-1">Tube Weight:</span>
                      <div
                        className="font-small truncate"
                        title={`${allotmentData.tubeWeight || 'N/A'} kg`}
                      >
                        {allotmentData.tubeWeight || 'N/A'} kg
                      </div>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 mr-1">Shrink Rap Weight:</span>
                      <div
                        className="font-small truncate"
                        title={
                          allotmentData.shrinkRapWeight !== undefined &&
                          allotmentData.shrinkRapWeight !== null
                            ? `${allotmentData.shrinkRapWeight} kg`
                            : 'N/A'
                        }
                      >
                        {allotmentData.shrinkRapWeight !== undefined &&
                        allotmentData.shrinkRapWeight !== null
                          ? `${allotmentData.shrinkRapWeight} kg`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 mr-1">Total Weight:</span>
                      <div
                        className="font-small truncate"
                        title={
                          allotmentData.totalWeight !== undefined &&
                          allotmentData.totalWeight !== null
                            ? `${allotmentData.totalWeight} kg`
                            : 'N/A'
                        }
                      >
                        {allotmentData.totalWeight !== undefined &&
                        allotmentData.totalWeight !== null
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
                                    style={{
                                      backgroundColor: getTapeColorStyle(allotmentData.tapeColor),
                                    }}
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
                      <div
                        className="font-small truncate"
                        title={`${rollDetails?.fgRollNo || 'N/A'}`}
                      >
                        {rollDetails?.fgRollNo || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3">
              <h3 className="text-xs font-semibold text-blue-800 mb-2">
                Weight Machine Configuration
              </h3>
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
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 h-8 text-xs"
                  >
                    Get Weight
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-3">
              <h3 className="text-xs font-semibold text-green-800 mb-2">Real-time Weight Data</h3>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
                <div className="bg-white p-2 rounded border text-center">
                  <div className="text-xs text-gray-500">Gross WT.(kg)</div>
                  {/* <div className="text-xl font-bold text-blue-600">{weightData.grossWeight}</div> */}
                  <Input    id="grossWeight"
                    name="grossWeight"  value={weightData.grossWeight || ''}
                    onChange={handleChange}
                     type="number"
                     step="0.01"
                      className="text-xl font-bold text-center h-6 p-0 text-blue-600"
                          />
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <div className="text-xs text-gray-500">Tare WT.(kg)</div>
                  <Input
                    id="tareWeight"
                    name="tareWeight"
                    value={weightData.tareWeight || ''}
                    onChange={handleChange}
                    type="number"
                    step="0.01"
                    className="text-xl font-bold text-center h-6 p-0"
                  />
                </div>
                <div className="bg-white p-2 rounded border text-center">
                  <div className="text-xs text-gray-500">Net WT.(kg)</div>
                  <div className="text-xl font-bold text-green-600">{weightData.netWeight}</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-gray-600 italic">
                Net Weight = Gross Weight - Tare Weight (Tare Weight: {allotmentData?.tubeWeight || '0.00'} kg)
              </div>
            </div>

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
