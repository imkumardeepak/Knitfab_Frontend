import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTapeColors, useIsTapeColorAssignedToLotment } from '@/hooks/queries/useTapeColorQueries';
import { getTapeColorStyle } from '@/utils/tapeColorUtils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertCircle } from 'lucide-react';

type ColorOption = {
  id: string;
  type: 'color';
  name: string;
  colorId: number;
};

type CombinationOption = {
  id: string;
  type: 'combination';
  name: string;
  color1Id: number;
  color2Id: number;
};

type TapeColorOption = ColorOption | CombinationOption;

interface PackagingDetailsProps {
  rollPerKg?: number;
  onCoreTypeChange: (coreType: 'with' | 'without') => void;
  onTubeWeightChange: (weight: number) => void;
  onTapeColorChange: (tapeColorId: number | { color1Id: number; color2Id: number }) => void;
  onShrinkRapWeightChange?: (weight: number) => void;
  onPolybagColorChange?: (color: string) => void;
  tubeWeight: number;
  shrinkRapWeight?: number;
  tapeColorId: number | { color1Id: number; color2Id: number } | null;
  lotmentId?: string;
  polybagColor?: string;
}

export function PackagingDetails({
  rollPerKg = 0,
  onCoreTypeChange,
  onTubeWeightChange,
  onTapeColorChange,
  onShrinkRapWeightChange,
  onPolybagColorChange,
  tubeWeight,
  shrinkRapWeight = 0.06,
  tapeColorId,
  lotmentId,
  polybagColor = '',
}: PackagingDetailsProps) {
  const { data: tapeColors = [] } = useTapeColors();
  const [coreType, setCoreType] = useState<'with' | 'without'>('without');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [polybagColorState, setPolybagColorState] = useState<string>(polybagColor || ''); // New state for polybag color

  // Update local state when prop changes
  useEffect(() => {
    setPolybagColorState(polybagColor);
  }, [polybagColor]);

  const handlePolybagColorChange = (color: string) => {
    setPolybagColorState(color);
    onPolybagColorChange?.(color);
  };

  const colorOptions = useMemo(() => {
    const options: TapeColorOption[] = tapeColors.map((color) => ({
      id: `color-${color.id}`,
      type: 'color',
      name: color.tapeColor,
      colorId: color.id,
    }));

    tapeColors.forEach((color, i) => {
      tapeColors.slice(i + 1).forEach((nextColor) => {
        options.push({
          id: `combo-${color.id}-${nextColor.id}`,
          type: 'combination',
          name: `${color.tapeColor} + ${nextColor.tapeColor}`,
          color1Id: color.id,
          color2Id: nextColor.id,
        });
      });
    });

    return options;
  }, [tapeColors]);

  useEffect(() => {
    if (tapeColorId !== null) {
      if (typeof tapeColorId === 'number') {
        const colorOption = colorOptions.find(
          (option) => option.type === 'color' && option.colorId === tapeColorId
        );
        setSelectedOptionId(colorOption?.id || null);
      } else {
        const combinationOption = colorOptions.find(
          (option) =>
            option.type === 'combination' &&
            option.color1Id === tapeColorId.color1Id &&
            option.color2Id === tapeColorId.color2Id
        );
        setSelectedOptionId(combinationOption?.id || null);
      }
    }
  }, [tapeColorId, colorOptions]);

  const selectedTapeColorName = useMemo(() => {
    if (!tapeColors.length || selectedOptionId === null) return null;
    
    const selectedOption = colorOptions.find(option => option.id === selectedOptionId);
    if (!selectedOption) return null;
    
    if (selectedOption.type === 'color') {
      const color = tapeColors.find(c => c.id === selectedOption.colorId);
      return color?.tapeColor || null;
    } else {
      const color1 = tapeColors.find(c => c.id === selectedOption.color1Id);
      const color2 = tapeColors.find(c => c.id === selectedOption.color2Id);
      if (color1 && color2) {
        return `${color1.tapeColor} + ${color2.tapeColor}`;
      }
      return null;
    }
  }, [tapeColors, selectedOptionId, colorOptions]);

  const { data: isTapeColorAssigned, isLoading: isCheckingAssignment, isError, error } = useIsTapeColorAssignedToLotment(
    lotmentId || '',
    selectedTapeColorName || '',
    !!lotmentId && !!selectedTapeColorName
  );

  // Handle core type change with proper tube weight management
  const handleCoreTypeChange = (value: 'with' | 'without') => {
    setCoreType(value);
    onCoreTypeChange(value);
    
    if (value === 'without') {
      // When switching to "No Core", set tube weight to 0
      onTubeWeightChange(0);
    } else if (value === 'with' && tubeWeight === 0) {
      // When switching to "With Core" and tube weight is 0, set to default 1
      onTubeWeightChange(1);
    }
    // If tube weight is already set to a non-zero value, preserve it
  };

  const handleTubeWeightChange = (weight: number) => {
    // Allow user to change tube weight directly
    onTubeWeightChange(weight);
  };

  const handleOptionSelect = (option: TapeColorOption) => {
    setSelectedOptionId(option.id);
    if (option.type === 'color') {
      onTapeColorChange(option.colorId);
    } else {
      onTapeColorChange({
        color1Id: option.color1Id,
        color2Id: option.color2Id,
      });
    }
  };

  const selectedOption = colorOptions.find((option) => option.id === selectedOptionId);
  const getColorStyle = (colorName: string) => ({ backgroundColor: getTapeColorStyle(colorName) });

  // Calculate total weight
  const totalWeight = useMemo(() => {
    const tubeWt = coreType === 'with' ? tubeWeight : 0;
    const shrinkWt = shrinkRapWeight || 0;
    return tubeWt + shrinkWt;
  }, [coreType, tubeWeight, shrinkRapWeight]);

  // Initialize core type based on tube weight
  useEffect(() => {
    const initialCoreType = tubeWeight > 0 ? 'with' : 'without';
    setCoreType(initialCoreType);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Packaging Details</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
          <Label className="text-sm font-medium">Roll per Kg</Label>
          <div className="text-lg font-bold text-primary">
            {(rollPerKg || 0).toFixed(2)} rolls/kg
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Core Type</Label>
            <RadioGroup value={coreType} onValueChange={handleCoreTypeChange} className="space-y-2">
              {['without', 'with'].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <RadioGroupItem value={type} id={`${type}-core`} />
                  <Label htmlFor={`${type}-core`} className="text-sm capitalize">
                    {type === 'with' ? 'With Core' : 'No Core '}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {coreType === 'with' && (
            <div className="space-y-3">
              <Label htmlFor="tube-weight" className="text-sm font-medium">
                Tube Weight
              </Label>
              <div className="relative">
                <Input
                  id="tube-weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={tubeWeight || 0}
                  onChange={(e) => handleTubeWeightChange(parseFloat(e.target.value) || 0)}
                  className="w-full"
                />
                <span className="absolute right-7 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  kg
                </span>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <Label htmlFor="shrink-rap-weight" className="text-sm font-medium">
              Shrink Rap + Polyester Bag + Tape
            </Label>
            <div className="relative">
              <Input
                id="shrink-rap-weight"
                type="number"
                step="0.1"
                min="0"
                value={shrinkRapWeight?.toString() || '0.06'}
                onChange={(e) => onShrinkRapWeightChange?.(parseFloat(e.target.value) || 0)}
                className="w-full"
              />
              <span className="absolute right-7 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                kg
              </span>
            </div>
          </div>
        </div>

        {/* New Polybag Color Field */}
        <div className="space-y-3">
          <Label htmlFor="polybag-color" className="text-sm font-medium">
            Polybag Color
          </Label>
          <Input
            id="polybag-color"
            value={polybagColorState}
            onChange={(e) => handlePolybagColorChange(e.target.value)}
            placeholder="Enter polybag color"
            className="w-full"
          />
        </div>

        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
          <Label className="text-sm font-medium">Total Weight</Label>
          <div className="text-lg font-bold text-primary">{totalWeight.toFixed(3)} kg</div>
        </div>

        {(selectedTapeColorName && lotmentId) ? (
          <div className="space-y-2">
            {isCheckingAssignment ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Checking tape color assignment...</AlertTitle>
                <AlertDescription>
                  Verifying if "{selectedTapeColorName}" is already assigned to another lotment.
                </AlertDescription>
              </Alert>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error checking tape color</AlertTitle>
                <AlertDescription>
                  There was an error checking the tape color assignment. Please try again.
                </AlertDescription>
              </Alert>
            ) : isTapeColorAssigned !== undefined ? isTapeColorAssigned ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning: Tape Color Already Assigned</AlertTitle>
                <AlertDescription>
                  The tape color "{selectedTapeColorName}" is already assigned to another lotment. 
                  Please select a different tape color or confirm that you want to reuse this color.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-500 text-green-700">
                <Info className="h-4 w-4" />
                <AlertTitle>Available Tape Color</AlertTitle>
                <AlertDescription>
                  The tape color "{selectedTapeColorName}" is available for use with lotment "{lotmentId}".
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <Label className="text-sm font-medium">Tape Colors & Combinations</Label>
          <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg bg-gray-50">
            {colorOptions.map((option) => (
              <div
                key={option.id}
                className={`flex flex-col items-center p-2 rounded cursor-pointer transition-all ${
                  selectedOptionId === option.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleOptionSelect(option)}
              >
                {option.type === 'color' ? (
                  <>
                    <div
                      className="w-6 h-6 rounded-full border border-gray-300 mb-1"
                      style={getColorStyle(option.name)}
                    />
                    <span className="text-xs text-center truncate w-full">{option.name}</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center mb-1">
                      <div
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={getColorStyle(
                          tapeColors.find((c) => c.id === option.color1Id)?.tapeColor || ''
                        )}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-gray-300 -ml-1"
                        style={getColorStyle(
                          tapeColors.find((c) => c.id === option.color2Id)?.tapeColor || ''
                        )}
                      />
                    </div>
                    <span className="text-xs text-center truncate w-full">{option.name}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedOption && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
            {selectedOption.type === 'color' ? (
              <>
                <div
                  className="w-5 h-5 rounded-full border border-gray-300"
                  style={getColorStyle(selectedOption.name)}
                />
                <span className="text-sm font-medium">Selected: {selectedOption.name}</span>
              </>
            ) : (
              <>
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={getColorStyle(
                      tapeColors.find((c) => c.id === selectedOption.color1Id)?.tapeColor || ''
                    )}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300 -ml-1"
                    style={getColorStyle(
                      tapeColors.find((c) => c.id === selectedOption.color2Id)?.tapeColor || ''
                    )}
                  />
                </div>
                <span className="text-sm font-medium">Selected: {selectedOption.name}</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}