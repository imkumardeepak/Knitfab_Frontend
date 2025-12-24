import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, ArrowLeft, Calendar, Scan } from 'lucide-react';
import { toast } from '@/lib/toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { locationApi, apiUtils, storageCaptureApi } from '@/lib/api-client';
import type {
  LocationResponseDto,
  CreateStorageCaptureRequestDto,
  StorageCaptureRollDataResponseDto,
  StorageCaptureResponseDto,
} from '@/types/api-types';

// Define form data types
interface StorageCaptureFormData {
  rollNumber: string;
  locationId: string;
  remarks: string;
  date: string;
  lotNumber: string;
  product: string;
  quantity: number;
  quality: string;
}

const StorageCapture = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rollNumberInputRef = useRef<HTMLInputElement>(null);
  const [hasError, setHasError] = useState(false);
  const [scannedLocationCode, setScannedLocationCode] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationResponseDto | null>(null);
  const [rollData, setRollData] = useState<StorageCaptureRollDataResponseDto | null>(null);
  // Store the lot-to-location mapping
  const [lotLocationMap, setLotLocationMap] = useState<Record<string, { location: LocationResponseDto; locationCode: string }>>({});
  const [allLocations, setAllLocations] = useState<LocationResponseDto[]>([]);
  const [showLocationConfirmation, setShowLocationConfirmation] = useState(false);
  const [pendingStorageCapture, setPendingStorageCapture] = useState<CreateStorageCaptureRequestDto | null>(null);
  

  // Fetch all locations on component mount
  useEffect(() => {
    const fetchAllLocations = async () => {
      try {
        const response = await locationApi.getAllLocations();
        const locations = apiUtils.extractData(response);
        setAllLocations(locations || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
        toast.error('Error', 'Failed to load locations');
      }
    };

    fetchAllLocations();
  }, []);

  // Handle location code scan
  const handleLocationCodeScan = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && scannedLocationCode) {
      try {
        // Call API to search for location by code
        const response = await locationApi.searchLocations({ locationcode: scannedLocationCode });
        const locations = response.data;

        if (locations && locations.length > 0) {
          const location = locations[0]; // Take the first match
          setSelectedLocation(location);
          setValue('locationId', location.id.toString());
          toast.success('Success', `Location found: ${location.location}`);
          
          // If we have roll data, store the lot-location mapping for future rolls of the same lot
          if (rollData?.rollConfirmation?.allotId) {
            setLotLocationMap(prev => ({
              ...prev,
              [rollData.rollConfirmation.allotId]: { location, locationCode: scannedLocationCode }
            }));
            
            toast.info('Info', `Location ${location.location} assigned to Lot ${rollData.rollConfirmation.allotId}`);
          }
        } else {
          toast.error('Error', 'Location not found. Please check the location code.');
          setSelectedLocation(null);
          setValue('locationId', '');
        }
      } catch (error) {
        console.error('Error searching for location:', error);
        toast.error('Error', 'Failed to search for location. Please try again.');
        setSelectedLocation(null);
        setValue('locationId', '');
      }
    }
  };

  // Handle manual location selection
  const handleManualLocationSelect = (locationId: string) => {
    const location = allLocations.find(loc => loc.id.toString() === locationId);
    if (location) {
      setSelectedLocation(location);
      setValue('locationId', locationId);
      setScannedLocationCode(location.locationcode || '');
   
      // If we have roll data, store the lot-location mapping for future rolls of the same lot
      if (rollData?.rollConfirmation?.allotId) {
        setLotLocationMap(prev => ({
          ...prev,
          [rollData.rollConfirmation.allotId]: { location, locationCode: location.locationcode || '' }
        }));
      
        toast.info('Info', `Location ${location.location} assigned to Lot ${rollData.rollConfirmation.allotId}`);
      }
      
      toast.success('Success', `Location selected: ${location.location}`);
    }
  };

  // React Hook Form setup
  const { register, handleSubmit, setValue, watch, reset } = useForm<StorageCaptureFormData>({
    defaultValues: {
      rollNumber: '',
      locationId: '',
      remarks: '',
      date: new Date().toISOString().split('T')[0],
      lotNumber: '',
      product: '',
      quantity: 0,
      quality: '',
    },
  });

  // Watch form values
  const rollNumber = watch('rollNumber');
  const locationId = watch('locationId');

  // Mock mutation for allocating FG roll (in a real app, this would call an actual API)
  const allocateRollMutation = useMutation({
    mutationFn: async (data: StorageCaptureFormData) => {
      // Prepare the data to match the CreateStorageCaptureRequestDto interface
      const storageCaptureData: CreateStorageCaptureRequestDto = {
        lotNo: rollData?.rollConfirmation.allotId || '',
        fgRollNo: rollData?.rollConfirmation?.fgRollNo?.toString() || '',
        locationCode: selectedLocation?.locationcode || '',
        tape: rollData?.productionAllotment?.tapeColor || '',
        customerName: rollData?.productionAllotment.partyName || '',
      };

      // Validate that we have required data
      if (!storageCaptureData.lotNo || !storageCaptureData.fgRollNo) {
        throw new Error('Missing required data for storage capture');
      }

      // Check if location is assigned
      const isLocationAssigned = !!storageCaptureData.locationCode;
      
      // Check if all rolls for this lot have been dispatched
      let needsConfirmation = false;
      try {
        const searchResponse = await storageCaptureApi.searchStorageCaptures({ lotNo: storageCaptureData.lotNo });
        const storageCaptures = apiUtils.extractData(searchResponse) as StorageCaptureResponseDto[];
        
        if (storageCaptures && storageCaptures.length > 0) {
          const allDispatched = storageCaptures.every(capture => capture.isDispatched);
          
          if (allDispatched) {
            // Check if we're trying to use the same location
            const sameLocationUsed = storageCaptures.some(capture => capture.locationCode === storageCaptureData.locationCode);
            if (sameLocationUsed) {
              needsConfirmation = true;
            }
          }
        }
      } catch (error) {
        // Ignore search errors and proceed
      }

      if (needsConfirmation) {
        // Instead of throwing an error, we'll set state to show confirmation dialog
        setPendingStorageCapture(storageCaptureData);
        setShowLocationConfirmation(true);
        // Throw a special error to stop the mutation but not show it as a real error
        throw new Error('CONFIRMATION_NEEDED');
      }

      // Check if this FG roll has already been captured in this location
      try {
        if (isLocationAssigned) {
          const searchResponse = await storageCaptureApi.searchStorageCaptures({ 
            fgRollNo: storageCaptureData.fgRollNo,
            locationCode: storageCaptureData.locationCode
          });
          const existingCaptures = apiUtils.extractData(searchResponse) as StorageCaptureResponseDto[];
        
          if (existingCaptures && existingCaptures.length > 0) {
            const existingCapture = existingCaptures[0];
            throw new Error(`FG Roll ${storageCaptureData.fgRollNo} is already stored in location ${existingCapture.locationCode}`);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('already stored')) {
          throw error;
        }
        if (error instanceof Error && error.message.includes('CONFIRMATION_NEEDED')) {
          throw error;
        }
        // Ignore other search errors and proceed with creation
      }

      // Call the actual API endpoint
      const response = await storageCaptureApi.createStorageCapture(storageCaptureData);
      return { ...apiUtils.extractData(response), isLocationAssigned };
    },
    onSuccess: (result) => {
      // Invalidate and refetch queries if needed
      queryClient.invalidateQueries({ queryKey: ['locations'] });

      // Show appropriate message based on whether location was assigned
      if (result.isLocationAssigned) {
        toast.success('Success', 'FG Roll allocated to location successfully');
      } else {
        toast.info('Success', 'FG Roll captured without location assignment. Please assign a location for this lot.');
      }

      // Reset form
      reset({
        rollNumber: '',
        locationId: '',
        remarks: '',
        date: new Date().toISOString().split('T')[0],
        lotNumber: '',
        product: '',
        quantity: 0,
        quality: '',
      });

      // Clear selected location
      setSelectedLocation(null);
      setScannedLocationCode('');

      // Clear error state
      setHasError(false);

      // Refocus on roll number input after submission
      setTimeout(() => {
        if (rollNumberInputRef.current) {
          rollNumberInputRef.current.focus();
        }
      }, 100);
    },
    onError: (error: unknown) => {
      // Don't show error toast for confirmation needed
      if (error instanceof Error && error.message === 'CONFIRMATION_NEEDED') {
        return;
      }
      
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);

      // Set error state and refocus
      setHasError(true);
      setTimeout(() => {
        if (rollNumberInputRef.current) {
          rollNumberInputRef.current.focus();
        }
      }, 100);
    },
  });

  // Function to handle confirmed storage capture creation
  const createConfirmedStorageCapture = async (storageCaptureData: CreateStorageCaptureRequestDto) => {
    try {
      // Call the actual API endpoint
      const response = await storageCaptureApi.createStorageCapture(storageCaptureData);
      const result = apiUtils.extractData(response);
      
      // Invalidate and refetch queries if needed
      queryClient.invalidateQueries({ queryKey: ['locations'] });

      // Reset form
      reset({
        rollNumber: '',
        locationId: '',
        remarks: '',
        date: new Date().toISOString().split('T')[0],
        lotNumber: '',
        product: '',
        quantity: 0,
        quality: '',
      });

      // Clear selected location
      setSelectedLocation(null);
      setScannedLocationCode('');

      // Clear error state
      setHasError(false);

      toast.success('Success', 'FG Roll allocated to location successfully');

      // Refocus on roll number input after submission
      setTimeout(() => {
        if (rollNumberInputRef.current) {
          rollNumberInputRef.current.focus();
        }
      }, 100);
      
      return result;
    } catch (error) {
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage);
      
      // Set error state and refocus
      setHasError(true);
      setTimeout(() => {
        if (rollNumberInputRef.current) {
          rollNumberInputRef.current.focus();
        }
      }, 100);
      
      throw error;
    }
  };

  // Focus on roll number input when component mounts
  useEffect(() => {
    // Focus on the roll number input field using react-hook-form's focus method
    setTimeout(() => {
      document.getElementById('rollNumber')?.focus();
    }, 100);
  }, []);

  // Function to fetch data based on scanned roll number
  const fetchRollData = async (scannedData: string) => {
    try {
      // Clear previous error state
      setHasError(false);

      const parts = scannedData.split('#');
      const allotId = parts[0];
      const fgRollNo = parts[3];
      console.log('Fetching data for AllotId:', allotId);

      if (!allotId) {
        toast.error('Error', 'Invalid QR code format');
        setHasError(true);
        setTimeout(() => {
          if (rollNumberInputRef.current) {
            rollNumberInputRef.current.focus();
          }
        }, 100);
        return;
      }

      // Check if this lot already has an assigned location in memory
      if (lotLocationMap[allotId]) {
        // Auto-select the previously assigned location
        const { location, locationCode } = lotLocationMap[allotId];
        setSelectedLocation(location);
        setValue('locationId', location.id.toString());
        setScannedLocationCode(locationCode);
        toast.info('Info', `Auto-selected location ${location.location} for Lot ${allotId}`);
      } else {
        // Check if there are existing storage captures for this lot in the database
        try {
          const searchResponse = await storageCaptureApi.searchStorageCaptures({ lotNo: allotId });
          const storageCaptures = apiUtils.extractData(searchResponse) as StorageCaptureResponseDto[];
        
          if (storageCaptures && storageCaptures.length > 0) {
            // Check if all rolls for this lot have been dispatched
            const allDispatched = storageCaptures.every(capture => capture.isDispatched);
            
            if (allDispatched) {
              // All rolls dispatched - inform user but allow reuse with confirmation
              const firstCapture = storageCaptures[0];
              const locationResponse = await locationApi.searchLocations({ locationcode: firstCapture.locationCode });
              const locations = locationResponse.data;
            
              if (locations && locations.length > 0) {
                const location = locations[0];
                setSelectedLocation(location);
                setValue('locationId', location.id.toString());
                setScannedLocationCode(firstCapture.locationCode);
              
                // Store in our map for future use
                setLotLocationMap(prev => ({
                  ...prev,
                  [allotId]: { location, locationCode: firstCapture.locationCode }
                }));
              
                toast.info('Info', `Location ${location.location} can be reused for Lot ${allotId} (all rolls dispatched) with confirmation.`);
              }
            } else {
              // Get the location from the first storage capture (not all dispatched)
              const firstCapture = storageCaptures[0];
              const locationResponse = await locationApi.searchLocations({ locationcode: firstCapture.locationCode });
              const locations = locationResponse.data;
            
              if (locations && locations.length > 0) {
                const location = locations[0];
                setSelectedLocation(location);
                setValue('locationId', location.id.toString());
                setScannedLocationCode(firstCapture.locationCode);
              
                // Store in our map for future use
                setLotLocationMap(prev => ({
                  ...prev,
                  [allotId]: { location, locationCode: firstCapture.locationCode }
                }));
              
                toast.info('Info', `Auto-selected location ${location.location} for Lot ${allotId} (from previous captures)`);
              }
            }
          } else {
            // No existing storage captures found for this lot
            toast.info('Info', `No existing location found for Lot ${allotId}. Please assign a location.`);
          }
        } catch (searchError) {
          console.warn('Could not search for existing storage captures:', searchError);
        }
      }

      // Call API to get roll confirmation data by allotId
      console.log('Calling API with AllotId:', allotId);
      const response = await storageCaptureApi.getRollConfirmationsByAllotId(allotId, Number(fgRollNo));

      // Extract data using apiUtils (this handles the AxiosResponse structure)
      const rollDataResponse = apiUtils.extractData(response);
      console.log('Extracted Roll Data Response:', rollDataResponse);

      // Check the structure of the response
      if (!rollDataResponse) {
        throw new Error('Empty response from server')
      }
      // Handle the new response structure with single items
      let rollConfirmation;

      // Case 1: Response has rollConfirmation (new structure with single item)
      if (rollDataResponse.rollConfirmation && rollDataResponse.rollConfirmation.allotId) {
        rollConfirmation = rollDataResponse.rollConfirmation;
        console.log('Using roll confirmation from rollConfirmation object:', rollConfirmation);
      }
      // Case 2: Direct access to rollConfirmation property
      else if (rollDataResponse.rollConfirmation) {
        rollConfirmation = rollDataResponse.rollConfirmation;
        console.log('Using roll confirmation from direct property:', rollConfirmation);
      }

      console.log('Selected roll confirmation:', rollConfirmation);

      if (rollConfirmation) {
        // Store the complete roll data
        setRollData(rollDataResponse);

        // Use the roll confirmation data - all properties are camelCase
        const allotIdValue = rollConfirmation.allotId;
        const rollNoValue = rollConfirmation.rollNo;
        const machineNameValue = rollConfirmation.machineName;
        const greyWidthValue = rollConfirmation.greyWidth;
        const greyGsmValue = rollConfirmation.greyGsm;

        if (allotIdValue) {
          setValue('rollNumber', allotIdValue);
          setValue('lotNumber', rollNoValue || '');
          setValue('product', machineNameValue || '');
          setValue('quantity', greyWidthValue || 0);
          setValue('quality', `${greyGsmValue || 0} GSM`);

          toast.success('Success', 'FG Roll data retrieved successfully');
        } else {
          throw new Error('Roll confirmation data missing required allotId field');
        }
      } else {
        throw new Error('No valid roll confirmation data found in response');
      }
    } catch (error) {
      console.error('Error fetching roll data:', error);
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage || 'Failed to fetch roll data');
      // Reset form fields on error
      setValue('lotNumber', '');
      setValue('product', '');
      setValue('quantity', 0);
      setValue('quality', '');
      setValue('rollNumber', '');
      setRollData(null);

      // Set error state and refocus
      setHasError(true);
      setTimeout(() => {
        if (rollNumberInputRef.current) {
          rollNumberInputRef.current.focus();
        }
      }, 100);
    }
  };

  // Handle when user presses Enter after scanning
  const handleRollNumberKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && rollNumber) {
      fetchRollData(rollNumber);
    }
  };

  // Handle form submission
  const onSubmit = (data: StorageCaptureFormData) => {
    if (!data.rollNumber) {
      toast.error('Error', 'Please scan an FG Roll first');
      setHasError(true);
      setTimeout(() => {
        if (rollNumberInputRef.current) {
          rollNumberInputRef.current.focus();
        }
      }, 100);
      return;
    }

    if (!data.locationId || !selectedLocation) {
      toast.error('Error', 'Please select a Storage Location');
      setHasError(true);
      setTimeout(() => {
        document.getElementById('locationId')?.focus();
      }, 100);
      return;
    }

    allocateRollMutation.mutate(data);
  };

  // Reset form function
  const resetForm = () => {
    reset({
      rollNumber: '',
      locationId: '',
      remarks: '',
      date: new Date().toISOString().split('T')[0],
      lotNumber: '',
      product: '',
      quantity: 0,
      quality: '',
    });
    setSelectedLocation(null);
    setScannedLocationCode('');
   
    // Clear error state and refocus
    setHasError(false);
    setTimeout(() => {
      if (rollNumberInputRef.current) {
        rollNumberInputRef.current.focus();
      }
    }, 100);
  };

  return (
    <div className="p-2 max-w-4xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base font-semibold">
              Storage Capture & Allocation
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20 h-6 px-2"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
          </div>
          <p className="text-white/80 text-xs mt-1">
            Capture and allocate finished goods rolls to storage locations
          </p>
        </CardHeader>

        <CardContent className="p-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Roll Information Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3">
              <h3 className="text-xs font-semibold text-blue-800 mb-2">Roll Information</h3>
              <p className="text-xs text-blue-700/80 mb-2">
                Scan or enter the FG roll number to fetch details
              </p>

              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="rollNumber" className="text-xs font-medium text-gray-700">
                    FG Roll Number (Scan QR Code)
                  </Label>
                  <div className="relative">
                    <Scan className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                    <Input
                      id="rollNumber"
                      {...register('rollNumber')}
                      onKeyPress={handleRollNumberKeyPress}
                      placeholder="Scan QR code or enter FG Roll Number"
                      className={`pl-7 text-xs h-8 ${hasError ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                    />
                  </div>
                </div>

                {rollNumber && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {/* Additional Roll Data Display */}
                    {rollData && (
                      <div className="md:col-span-2 mt-3 pt-3 border-t border-blue-200">
                        <h4 className="text-xs font-semibold text-blue-700 mb-2">
                          Additional Roll Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="font-medium text-blue-800">Machine Name</p>
                            <p className="text-blue-600">
                              {rollData.rollConfirmation?.machineName || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="font-medium text-blue-800">Grey Width</p>
                            <p className="text-blue-600">
                              {rollData.rollConfirmation?.greyWidth || 0} inches
                            </p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="font-medium text-blue-800">Grey GSM</p>
                            <p className="text-blue-600">
                              {rollData.rollConfirmation?.greyGsm || 0} GSM
                            </p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="font-medium text-blue-800">Net Weight</p>
                            <p className="text-blue-600">
                              {rollData.rollConfirmation?.netWeight || 0} kg
                            </p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="font-medium text-blue-800">Roll No</p>
                            <p className="text-blue-600">
                              {rollData.rollConfirmation?.rollNo || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="font-medium text-blue-800">FG Roll No</p>
                            <p className="text-blue-600">
                              {rollData.rollConfirmation?.fgRollNo || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {lotLocationMap[rollData.rollConfirmation?.allotId || ''] && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                            <span className="font-medium">Location Auto-Assigned:</span> This lot ({rollData.rollConfirmation?.allotId}) 
                            has been assigned to location {lotLocationMap[rollData.rollConfirmation?.allotId || '']?.location.warehousename} - 
                            {lotLocationMap[rollData.rollConfirmation?.allotId || '']?.location.location}
                          </div>
                        )}

                        {rollData.productionAllotment && (
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <h4 className="text-xs font-semibold text-blue-700 mb-2">
                              Production Allotment Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                              <div className="bg-purple-50 p-2 rounded">
                                <p className="font-medium text-purple-800">Item Name</p>
                                <p className="text-purple-600">
                                  {rollData.productionAllotment.itemName || 'N/A'}
                                </p>
                              </div>
                              <div className="bg-purple-50 p-2 rounded">
                                <p className="font-medium text-purple-800">Actual Quantity</p>
                                <p className="text-purple-600">
                                  {rollData.productionAllotment.actualQuantity || 0} kg
                                </p>
                              </div>
                              <div className="bg-purple-50 p-2 rounded">
                                <p className="font-medium text-purple-800">Party Name</p>
                                <p className="text-purple-600">
                                  {rollData.productionAllotment.partyName || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Allocation Details Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-3">
              <h3 className="text-xs font-semibold text-green-800 mb-2">Allocation Details</h3>
              <p className="text-xs text-green-700/80 mb-2">
                {rollData 
                  ? "Scan location code to assign storage location for this lot" 
                  : "Scan an FG roll first to enable location assignment"}
              </p>
              {rollData && lotLocationMap[rollData.rollConfirmation?.allotId || ''] && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  <span className="font-medium">Note:</span> Location for Lot {rollData.rollConfirmation?.allotId} 
                  has been auto-assigned to {lotLocationMap[rollData.rollConfirmation?.allotId || '']?.location.warehousename} - 
                  {lotLocationMap[rollData.rollConfirmation?.allotId || '']?.location.location}
                </div>
              )}

              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="locationId" className="text-xs font-medium text-gray-700">
                    Storage Location
                  </Label>
                  <div className="relative">
                    <Scan className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                    <Input
                      id="locationId"
                      {...register('locationId')}
                      onKeyPress={handleLocationCodeScan}
                      onChange={(e) => setScannedLocationCode(e.target.value)}
                      placeholder="Scan location code"
                      className={`pl-7 text-xs h-8 ${hasError ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                    />
                  </div>
                  
                  {selectedLocation && (
                    <div className="mt-1 text-xs flex items-center">
                      <span className="font-medium text-green-700">Selected Location:</span>
                      <span className="ml-1 text-green-600">
                        {selectedLocation.warehousename} - {selectedLocation.location}
                      </span>
                      {lotLocationMap[rollData?.rollConfirmation?.allotId || '']?.locationCode === scannedLocationCode && (
                        <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                          Auto-assigned for this lot
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="date" className="text-xs font-medium text-gray-700">
                      Date
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        {...register('date')}
                        className="pl-7 text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="remarks" className="text-xs font-medium text-gray-700">
                      Remarks
                    </Label>
                    <Textarea
                      id="remarks"
                      {...register('remarks')}
                      placeholder="Any additional remarks"
                      className="text-xs h-8 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="h-8 px-3 text-xs"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={allocateRollMutation.isPending || !rollNumber || !locationId}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-xs"
              >
                {allocateRollMutation.isPending ? (
                  <>
                    <div className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Allocating...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Allocate Roll
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={showLocationConfirmation}
        onOpenChange={setShowLocationConfirmation}
        title="Reuse Location for Dispatched Lot"
        description="All rolls for this lot have been dispatched. Are you sure you want to reuse the same location for this new roll?"
        confirmText="Yes, Reuse Location"
        cancelText="No, Cancel"
        onConfirm={async () => {
          if (pendingStorageCapture) {
            try {
              await createConfirmedStorageCapture(pendingStorageCapture);
            } catch (error) {
              // Error already handled in createConfirmedStorageCapture
            }
            setPendingStorageCapture(null);
          }
          setShowLocationConfirmation(false);
        }}
        onCancel={() => {
          setShowLocationConfirmation(false);
          setPendingStorageCapture(null);
          
          // Refocus on roll number input
          setTimeout(() => {
            if (rollNumberInputRef.current) {
              rollNumberInputRef.current.focus();
            }
          }, 100);
        }}
        variant="warning"
      />
    </div>
  );
};

export default StorageCapture;