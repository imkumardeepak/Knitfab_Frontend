import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/lib/toast';
import { storageCaptureApi, productionAllotmentApi, rollConfirmationApi } from '@/lib/api-client';
import type {
  StorageCaptureResponseDto,
  ProductionAllotmentResponseDto,
  RollConfirmationResponseDto
} from '@/types/api-types';
import { FGStickerService } from '@/services/fgStickerService';

const FGStickerReprint: React.FC = () => {
  const [lotId, setLotId] = useState('');
  const [rolls, setRolls] = useState<StorageCaptureResponseDto[]>([]);
  const [selectedRolls, setSelectedRolls] = useState<number[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showDispatched, setShowDispatched] = useState<boolean | null>(null);
  const [productionAllotment, setProductionAllotment] = useState<ProductionAllotmentResponseDto | null>(null);

  // Fetch rolls by lot ID
  const fetchRolls = async () => {
    if (!lotId.trim()) {
      toast.error('Error', 'Please enter a Lot ID');
      return;
    }

    setIsSearching(true);
    try {
      // First, get the production allotment data
      const allotmentResponse = await productionAllotmentApi.getProductionAllotmentByAllotId(lotId);
      setProductionAllotment(allotmentResponse.data);

      // Then, search for storage captures by lot ID
      const response = await storageCaptureApi.searchStorageCaptures({ lotNo: lotId });
      
      let filteredRolls = response.data;
      
      // Apply dispatch status filter if selected
      if (showDispatched !== null) {
        filteredRolls = filteredRolls.filter(roll => roll.isDispatched === showDispatched);
      }
      
      setRolls(filteredRolls);
      setSelectedRolls([]);
      
      if (filteredRolls.length === 0) {
        toast.info('Info', 'No rolls found for this Lot ID');
      } else {
        toast.success('Success', `Found ${filteredRolls.length} rolls`);
      }
    } catch (error) {
      console.error('Error fetching rolls:', error);
      toast.error('Error', 'Failed to fetch rolls. Please try again.');
      setRolls([]);
      setSelectedRolls([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search on Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchRolls();
    }
  };

  // Toggle selection of a roll
  const toggleRollSelection = (id: number) => {
    setSelectedRolls(prev => 
      prev.includes(id) 
        ? prev.filter(rollId => rollId !== id) 
        : [...prev, id]
    );
  };

  // Select all rolls
  const selectAllRolls = () => {
    if (selectedRolls.length === rolls.length) {
      // If all are selected, deselect all
      setSelectedRolls([]);
    } else {
      // Select all rolls
      setSelectedRolls(rolls.map(roll => roll.id));
    }
  };

  // Print stickers for selected rolls
  const printStickers = async () => {
    if (selectedRolls.length === 0) {
      toast.error('Error', 'Please select at least one roll to print');
      return;
    }

    setIsPrinting(true);
    try {
      // Get all roll confirmations for this lot at once
      const rollConfirmationsResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(lotId);
      const allRollConfirmations = rollConfirmationsResponse.data;
      
      // Map FG roll numbers to roll confirmation IDs for quick lookup
      const fgRollToConfirmationMap = new Map<string, RollConfirmationResponseDto>();
      allRollConfirmations.forEach(rc => {
        if (rc.fgRollNo) {
          fgRollToConfirmationMap.set(rc.fgRollNo.toString(), rc);
        }
      });
      
      // Get the confirmation IDs for selected rolls
      const selectedConfirmationIds: number[] = [];
      const unprocessedRolls: StorageCaptureResponseDto[] = [];
      
      for (const rollId of selectedRolls) {
        const roll = rolls.find(r => r.id === rollId);
        if (roll) {
          const rollConfirmation = fgRollToConfirmationMap.get(roll.fgRollNo);
          if (rollConfirmation) {
            selectedConfirmationIds.push(rollConfirmation.id);
          } else {
            unprocessedRolls.push(roll);
          }
        }
      }
      
      // Show warning for rolls without confirmations
      if (unprocessedRolls.length > 0) {
        toast.warning('Warning', `Skipping ${unprocessedRolls.length} rolls without confirmations`);
      }
      
      if (selectedConfirmationIds.length === 0) {
        toast.error('Error', 'No valid rolls to print');
        setIsPrinting(false);
        return;
      }
      
      // Use bulk printing for better performance
      if (selectedConfirmationIds.length > 1) {
        // Bulk print for multiple rolls
        const printResult = await FGStickerService.printFGRollStickersBulk(selectedConfirmationIds);
        
        if (printResult.success) {
          toast.success('Success', `Successfully printed stickers for ${selectedConfirmationIds.length} rolls`);
        } else {
          toast.error('Error', `Failed to print stickers: ${printResult.message}`);
        }
      } else {
        // Single print for one roll
        const printResult = await FGStickerService.printFGRollSticker(selectedConfirmationIds[0]);
        
        if (printResult.success) {
          toast.success('Success', 'Successfully printed sticker');
        } else {
          toast.error('Error', `Failed to print sticker: ${printResult.message}`);
        }
      }
      
      // Reset selection after printing
      setSelectedRolls([]);
    } catch (error: any) {
      console.error('Error printing stickers:', error);
      toast.error('Error', `Failed to print stickers: ${error.message || 'Unknown error'}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // Filter rolls by dispatch status
  const handleDispatchFilterChange = (status: boolean | null) => {
    setShowDispatched(status);
  };

  // Effect to re-fetch when dispatch filter changes
  useEffect(() => {
    if (lotId) {
      fetchRolls();
    }
  }, [showDispatched, lotId]);

  return (
    <div className="p-2 max-w-6xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <CardTitle className="text-white text-base font-semibold text-center">
            FG Roll Sticker Reprint
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4">
          {/* Search Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-4 mb-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">Search Rolls</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="lotId" className="text-sm font-medium text-gray-700 mb-1 block">
                  Lot ID
                </Label>
                <Input
                  id="lotId"
                  value={lotId}
                  onChange={(e) => setLotId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter Lot ID"
                  className="text-sm h-10"
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={fetchRolls}
                  disabled={isSearching}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4"
                >
                  {isSearching ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Searching...
                    </>
                  ) : (
                    'Search Rolls'
                  )}
                </Button>
              </div>
            </div>
            
            {/* Dispatch Status Filters */}
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Filter by Dispatch Status
              </Label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dispatchFilter"
                    checked={showDispatched === null}
                    onChange={() => handleDispatchFilterChange(null)}
                    className="mr-2"
                  />
                  <span className="text-sm">All Rolls</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dispatchFilter"
                    checked={showDispatched === false}
                    onChange={() => handleDispatchFilterChange(false)}
                    className="mr-2"
                  />
                  <span className="text-sm">Not Dispatched</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dispatchFilter"
                    checked={showDispatched === true}
                    onChange={() => handleDispatchFilterChange(true)}
                    className="mr-2"
                  />
                  <span className="text-sm">Dispatched</span>
                </label>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {rolls.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-green-800">
                  Available Rolls ({rolls.length})
                </h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={selectAllRolls}
                    className="h-8 text-xs"
                    disabled={isPrinting}
                  >
                    {selectedRolls.length === rolls.length && rolls.length > 0 ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={printStickers}
                    disabled={selectedRolls.length === 0 || isPrinting}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"
                  >
                    {isPrinting ? (
                      <>
                        <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Printing...
                      </>
                    ) : (
                      `Print Selected Stickers (${selectedRolls.length})`
                    )}
                  </Button>
                </div>
              </div>

              {/* Rolls Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Checkbox
                          checked={selectedRolls.length === rolls.length && rolls.length > 0}
                          onCheckedChange={selectAllRolls}
                          disabled={isPrinting}
                        />
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        FG Roll No
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tape
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dispatch Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rolls.map((roll) => (
                      <tr key={roll.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Checkbox
                            checked={selectedRolls.includes(roll.id)}
                            onCheckedChange={() => toggleRollSelection(roll.id)}
                            disabled={isPrinting}
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {roll.fgRollNo}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {roll.locationCode}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {roll.tape}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {roll.customerName}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            roll.isDispatched 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {roll.isDispatched ? 'Dispatched' : 'Not Dispatched'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {lotId && rolls.length === 0 && !isSearching && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-center">
              <p className="text-yellow-800 text-sm">
                No rolls found for Lot ID: <span className="font-semibold">{lotId}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FGStickerReprint;