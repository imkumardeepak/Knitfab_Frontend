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
import { apiUtils, storageCaptureApi, locationApi } from '@/lib/api-client';
import type {
  ProductionAllotmentResponseDto,
  SalesOrderDto,
  MachineAllocationResponseDto,
  RollConfirmationResponseDto,
  StorageCaptureResponseDto,
  LocationResponseDto,
  CreateStorageCaptureRequestDto,
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
  const [isConnected, setIsConnected] = useState(false); // Track connection status

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
  // Added state for location assignment
  const [assignedLocation, setAssignedLocation] = useState<LocationResponseDto | null>(null);
  const [isLocationAssigned, setIsLocationAssigned] = useState<boolean>(false);
  // Added state to store lot-to-location mapping
  const [lotLocationMap, setLotLocationMap] = useState<Record<string, { location: LocationResponseDto; locationCode: string }>>({});

  const lotIdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lotIdRef.current) {
      lotIdRef.current.focus();
    }
  }, []); // No connection setup on page load

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
    setAssignedLocation(null);
    setIsLocationAssigned(false);
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
      // Update the weightData state with the string value
      setWeightData(prev => ({
        ...prev,
        measuredGross: value
      }));
      return;
    }

    if (name === 'tareWeight') {
      // Update the weightData state with the string value
      setWeightData(prev => ({
        ...prev,
        tareWeight: value
      }));
      return;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'measuredGross' || name === 'grossWeight') {
      const measuredGrossValue = parseFloat(value);
      const tareValue = parseFloat(weightData.tareWeight) || 0;
      const shrinkRapWeight = allotmentData?.shrinkRapWeight ? Number(allotmentData.shrinkRapWeight) : 0;
      
      // Update with the parsed value to ensure proper formatting
      recomputeWeights(
        isNaN(measuredGrossValue) ? 0 : measuredGrossValue,
        tareValue,
        shrinkRapWeight
      );
    } else if (name === 'tareWeight') {
      const tareValue = parseFloat(value);
      const measuredValue = parseFloat(weightData.measuredGross) || 0;
      const shrinkRapWeight = allotmentData?.shrinkRapWeight ? Number(allotmentData.shrinkRapWeight) : 0;
      
      recomputeWeights(
        measuredValue,
        isNaN(tareValue) ? 0 : tareValue,
        shrinkRapWeight
      );
    }
  };

  const fetchWeightData = async () => {
    if (!formData.ipAddress) {
      toast.error('Invalid IP', 'Please enter a valid IP address');
      return;
    }

    try {
      // Establish connection only when button is clicked
      setIsConnected(true);

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
      const tare = allotmentData?.tubeWeight ? Number(allotmentData.tubeWeight) : (parseFloat(weightData.tareWeight) || 0);

      recomputeWeights(measuredGross, tare, shrinkRapWeight);

      toast.success('Weight Fetched', `Gross weight: ${measuredGross.toFixed(2)} kg fetched successfully`);
    } catch (error: unknown) {
      console.error('Error fetching weight data:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage?.includes('Failed to fetch') || errorMessage?.includes('NetworkError')) {
        toast.error('Connection Failed', 'Cannot connect to weight machine. Check IP address and network cable.');
      } else if (errorMessage?.includes('timeout')) {
        toast.error('Timeout', 'Weight machine not responding. Check if it is powered on.');
      } else {
        toast.error('Scale Error', 'Failed to read weight from machine. Please try again.');
      }
    } finally {
      // Close connection after fetching data
      setIsConnected(false);
    }
  };

  // Function to find an empty/available location
  const findEmptyLocation = async (): Promise<LocationResponseDto | null> => {
    try {
      // Get all locations
      const allLocationsResponse = await locationApi.getAllLocations();
      const allLocations = apiUtils.extractData(allLocationsResponse) as LocationResponseDto[];

      if (!allLocations || allLocations.length === 0) {
        console.warn('No locations found in the system');
        return null;
      }

      // Get all storage captures to determine which locations are occupied
      const storageCapturesResponse = await storageCaptureApi.getAllStorageCaptures();
      const allStorageCaptures = apiUtils.extractData(storageCapturesResponse) as StorageCaptureResponseDto[];

      // Create a set of occupied location codes (where rolls are not dispatched)
      const occupiedLocationCodes = new Set<string>();
      if (allStorageCaptures && allStorageCaptures.length > 0) {
        allStorageCaptures.forEach(capture => {
          if (!capture.isDispatched && capture.locationCode) {
            occupiedLocationCodes.add(capture.locationCode);
          }
        });
      }

      // Find the first empty location
      const emptyLocation = allLocations.find(loc => 
        loc.locationcode && !occupiedLocationCodes.has(loc.locationcode)
      );

      if (emptyLocation) {
        console.log('Found empty location:', emptyLocation.locationcode, '-', emptyLocation.warehousename, emptyLocation.location);
        return emptyLocation;
      }

      console.warn('No empty locations available');
      return null;
    } catch (error) {
      console.error('Error finding empty location:', error);
      return null;
    }
  };

  // Enhanced function to check for existing location assignment or find empty location
  const checkExistingLocationAssignment = async (allotId: string) => {
    try {
      // First check in-memory map
      if (lotLocationMap[allotId]) {
        const { location } = lotLocationMap[allotId];
        setAssignedLocation(location);
        setIsLocationAssigned(true);
        return location;
      }

      // Then check database for existing storage captures with this lot number
      const searchResponse = await storageCaptureApi.searchStorageCaptures({ lotNo: allotId });
      const storageCaptures = apiUtils.extractData(searchResponse) as StorageCaptureResponseDto[];

      if (storageCaptures && storageCaptures.length > 0) {
        // Reuse the existing location from the first storage capture (regardless of dispatch status)
        const firstCapture = storageCaptures[0];
        const locationResponse = await locationApi.searchLocations({ locationcode: firstCapture.locationCode });
        const locations = locationResponse.data;

        if (locations && locations.length > 0) {
          const location = locations[0];
          // Store in our map for future use
          setLotLocationMap(prev => ({
            ...prev,
            [allotId]: { location, locationCode: firstCapture.locationCode }
          }));
          setAssignedLocation(location);
          setIsLocationAssigned(true);
          toast.info('Location Assigned', `Auto-assigned existing location: ${location.warehousename} - ${location.location}`);
          return location;
        }
      } else {
        // No existing storage captures for this lot - find an empty location
        const emptyLocation = await findEmptyLocation();
        
        if (emptyLocation) {
          // Store in our map for future use
          setLotLocationMap(prev => ({
            ...prev,
            [allotId]: { location: emptyLocation, locationCode: emptyLocation.locationcode || '' }
          }));
          setAssignedLocation(emptyLocation);
          setIsLocationAssigned(true);
          toast.success('Location Assigned', `Auto-assigned empty location: ${emptyLocation.warehousename} - ${emptyLocation.location}`);
          return emptyLocation;
        } else {
          toast.warning('No Empty Locations', 'No empty locations available. Storage capture will be created without location assignment.');
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Could not check for existing location assignment:', error);
      return null;
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching allotment data:', err);
      resetForm();
      focusOnBarcodeField();
      toast.error('Invalid Lot', errorMessage || 'Lot ID not found or invalid. Please scan correct barcode.');
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

        // Check and assign location immediately after loading allotment data
        await checkExistingLocationAssignment(allotId);

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
    } catch (err: unknown) {
      console.error('Error processing barcode:', err);
      resetForm();
      focusOnBarcodeField();
      toast.error('Scan Failed', 'Invalid or corrupted barcode. Please try again.');
    }
  };

  // Function to handle confirmed storage capture creation
  const createConfirmedStorageCapture = async (storageCaptureData: CreateStorageCaptureRequestDto) => {
    try {
      await storageCaptureApi.createStorageCapture(storageCaptureData);

      if (storageCaptureData.locationCode) {
        const locationResponse = await locationApi.searchLocations({ locationcode: storageCaptureData.locationCode });
        const locations = locationResponse.data;
        if (locations && locations.length > 0) {
          const location = locations[0];
          toast.success('Location Assigned', `Confirmed location assignment: ${location.warehousename} - ${location.location}`);
        }
      } else {
        toast.info('Storage Capture Created', `FG Roll ${storageCaptureData.fgRollNo} captured without location assignment. Please assign a location for this lot.`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error creating storage capture:', error);
      toast.error('Storage Capture Failed', `Could not create storage capture record: ${errorMessage}. Please check manually.`);
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

      // Update roll confirmation with weight data and mark FG sticker as generated
      const updatedRollConfirmation = await RollConfirmationService.updateRollConfirmation(rollConfirmation.id, {
        grossWeight: Number(grossToSave.toFixed(2)),
        tareWeight: Number(tare.toFixed(2)),
        netWeight: Number(netToSave.toFixed(2)),
        isFGStickerGenerated: true,
      });

      // Print FG sticker
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

      // ALWAYS create storage capture record after FG sticker is generated
      try {
        // Check for existing location assignment
        const location = await checkExistingLocationAssignment(rollDetails.allotId);

        // Ensure we have a valid FG roll number
        const fgRollNo = updatedRollConfirmation.fgRollNo || rollConfirmation.fgRollNo || 0;

        // Create storage capture with properly formatted data
        const storageCaptureData = {
          lotNo: rollDetails.allotId || '',
          fgRollNo: fgRollNo.toString(),
          locationCode: location?.locationcode || '',
          tape: allotmentData.tapeColor || '',
          customerName: salesOrderData?.partyName || allotmentData.partyName || '',
        };

        // Validate required fields before sending
        if (!storageCaptureData.lotNo) {
          throw new Error('Lot number is required');
        }

        if (!storageCaptureData.fgRollNo) {
          throw new Error('FG Roll number is required');
        }

        // Create storage capture directly - no confirmation needed as we auto-assign empty locations
        await createConfirmedStorageCapture(storageCaptureData);
      } catch (storageError: unknown) {
        const errorMessage = storageError instanceof Error ? storageError.message : 'Unknown error';
        console.error('Error creating storage capture:', storageError);
        toast.error('Storage Capture Failed', `Could not create storage capture record: ${errorMessage}. Please check manually.`);
      }

      resetForm();
      focusOnBarcodeField();
    } catch (error: unknown) {
      console.error('Error in handleSubmit:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage?.includes('FG Sticker has already been generated')) {
        toast.warning(
          'Duplicate Detected',
          `This roll already has an FG Sticker generated.\nRoll: ${rollDetails?.rollNo}`
        );
        resetForm();
        focusOnBarcodeField();
      } else if (errorMessage?.includes('network') || errorMessage?.includes('fetch')) {
        toast.error('Network Error', 'Cannot connect to server. Check internet or server status.');
      } else {
        toast.error('Save Failed', errorMessage || 'Failed to save FG Sticker confirmation. Try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="p-1 max-w-4xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-2">
          <CardTitle className="text-white text-sm font-semibold text-center">
            FG Sticker Confirmation & Storage Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="absolute -left-full top-0 opacity-0 w-0 h-0 overflow-hidden">
            <input type="text" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Roll Scanning Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-2">
              <h3 className="text-xs font-semibold text-blue-800 mb-1">Roll Scanning</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                {[
                  { id: 'allotId', label: 'Lot ID', value: formData.allotId, disabled: !!rollDetails },
                  { id: 'machineName', label: 'Machine', value: formData.machineName, disabled: !!rollDetails },
                  { id: 'rollNo', label: 'Roll No', value: formData.rollNo, disabled: !!rollDetails },
                ].map((field) => (
                  <div key={field.id} className="space-y-1">
                    <Label htmlFor={field.id} className="text-[10px] font-medium text-gray-700">
                      {field.label}
                    </Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      value={field.value}
                      onChange={handleChange}
                      placeholder={`Scan or enter ${field.label}`}
                      disabled={field.disabled}
                      className="text-xs h-7 bg-white"
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
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-2 mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-green-800 flex items-center">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Roll Details
                    </h3>
                    <div className="flex items-center space-x-1">
                      <span className="text-[9px] text-green-600 bg-green-100 px-1 py-0.5 rounded">
                        {salesOrderData.voucherNumber || 'N/A'}
                      </span>
                      {isFGStickerGenerated !== null && (
                        <span
                          className={`text-[9px] px-1 py-0.5 rounded ${isFGStickerGenerated
                            ? 'text-red-600 bg-red-100'
                            : 'text-green-600 bg-green-100'
                            }`}
                        >
                          {isFGStickerGenerated ? 'FG Sticker Gen' : 'Ready for FG'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[9px]">
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
                      <div className="text-[9px] text-green-700 font-medium mb-0.5">Items:</div>
                      <div className="flex flex-wrap gap-0.5 max-h-6 overflow-y-auto">
                        {salesOrderData.items.slice(0, 2).map((item, index) => (
                          <span
                            key={index}
                            className="text-[9px] bg-white/80 text-gray-700 px-1 py-0.5 rounded border"
                            title={item.descriptions || item.stockItemName || 'N/A'}
                          >
                            {item.descriptions || item.stockItemName || 'N/A'}
                          </span>
                        ))}
                        {salesOrderData.items.length > 2 && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">
                            +{salesOrderData.items.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {allotmentData && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-md p-2 mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-amber-800 flex items-center">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1"></span>Packaging
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex">
                      <span className="text-gray-600 mr-1">Tube:</span>
                      <div className="font-small truncate" title={`${allotmentData.tubeWeight || 'N/A'} kg`}>
                        {allotmentData.tubeWeight || 'N/A'} kg
                      </div>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 mr-1">Shrink:</span>
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
                      <span className="text-gray-600 mr-1">Total:</span>
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
                      <span className="text-gray-600 mr-1">Tape:</span>
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
                                      className="w-2 h-2 rounded-full border border-gray-300"
                                      style={{ backgroundColor: getTapeColorStyle(colors[0]) }}
                                    />
                                    <div
                                      className="w-2 h-2 rounded-full border border-gray-300 -ml-0.5"
                                      style={{ backgroundColor: getTapeColorStyle(colors[1]) }}
                                    />
                                  </div>
                                );
                              } else {
                                return (
                                  <div
                                    className="w-2 h-2 rounded-full border border-gray-300"
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
                      <span className="text-gray-600 mr-1">FG Roll:</span>
                      <div className="font-small truncate" title={`${rollDetails?.fgRollNo || 'N/A'}`}>
                        {rollDetails?.fgRollNo || 'N/A'}
                      </div>
                    </div>
                  </div>
                  {/* Added location assignment display */}
                  {isLocationAssigned && assignedLocation && (
                    <div className="mt-2 p-2 bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-400 rounded-md shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-[10px] font-semibold text-blue-800">Assigned Location:</span>
                        </div>
                        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">✓ Auto-Assigned</span>
                      </div>
                      <div className="mt-1 text-xs font-bold text-blue-900">
                        {assignedLocation.warehousename} - {assignedLocation.location}
                      </div>
                      {assignedLocation.locationcode && (
                        <div className="mt-0.5 text-[9px] text-blue-600">
                          Code: {assignedLocation.locationcode}
                        </div>
                      )}
                    </div>
                  )}
                  {!isLocationAssigned && rollDetails && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded-md">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] font-medium text-yellow-800">No location assigned yet</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Weight Machine */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-2">
              <div className="grid grid-cols-1 gap-2">
                {/* <h3 className="text-xs font-semibold text-blue-800 mb-1">Weight Machine</h3> */}
                <div className="space-y-1">
                  <Label htmlFor="ipAddress" className="text-[10px] font-medium text-gray-700">
                    Wight Machine Machine IP *
                  </Label>
                  <Input
                    id="ipAddress"
                    name="ipAddress"
                    value={formData.ipAddress}
                    onChange={handleChange}
                    placeholder="Enter IP Address"
                    required
                    className="text-xs h-7 bg-white"
                  />
                </div>
                <div className="flex">
                  <Button
                    type="button"
                    onClick={fetchWeightData}
                    disabled={isLoading || isFetchingData || isConnected} // Disable button when connected
                    className={`${isConnected ? 'bg-gray-400 hover:bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                      } text-white px-2 py-1 h-7 text-xs w-full`}
                  >
                    {isConnected ? 'Connecting...' : 'Get Weight'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Real-time Weight */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-2">
              <h3 className="text-xs font-semibold text-green-800 mb-1">Weight Data</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-white p-1 rounded border text-center">
                  <div className="text-[10px] text-gray-500">Gross (kg)</div>
                  <Input
                    name="measuredGross"
                    value={weightData.measuredGross || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    type="number"
                    step="0.01"
                    className="text-lg font-bold text-center h-6 p-0 text-blue-600 border-0"
                  />
                </div>
                <div className="bg-white p-1 rounded border text-center">
                  <div className="text-[10px] text-gray-500">Tare (kg)</div>
                  <Input
                    name="tareWeight"
                    value={weightData.tareWeight || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    type="number"
                    step="0.01"
                    className="text-lg font-bold text-center h-6 p-0 border-0"
                  />
                </div>
                <div className="bg-white p-1 rounded border text-center sm:col-span-2">
                  <div className="text-[10px] text-gray-500">Net (kg)</div>
                  <div className="text-lg font-bold text-green-600">{weightData.netWeight}</div>
                </div>
              </div>
              <div className="mt-1 text-[9px] text-gray-600 italic">
                Net = Gross - Tare. Gross incl. shrink-rap: {weightData.grossWithShrinkRap} kg
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-1">
              <Button
                type="submit"
                disabled={isLoading || isFetchingData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 h-7 min-w-24"
              >
                {isLoading || isFetchingData ? (
                  <div className="flex items-center">
                    <div className="mr-1 h-2 w-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    <span className="text-xs">{isLoading ? 'Saving...' : 'Loading...'}</span>
                  </div>
                ) : (
                  <span className="text-xs">Confirm & Print</span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default FGStickerConfirmation;