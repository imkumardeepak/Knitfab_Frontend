import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useMachines } from '@/hooks/queries/useMachineQueries';
import { useFabricStructures } from '@/hooks/queries/useFabricStructureQueries';
import { useTapeColors } from '@/hooks/queries/useTapeColorQueries';
import { useSlitLines } from '@/hooks/queries/useSlitLineQueries';
import { useYarnTypes } from '@/hooks/queries/useYarnTypeQueries';
import { useDescriptionParser } from '@/hooks/saleOrderitemPro/useDescriptionParser';
import type {
  SalesOrderWebResponseDto,
  SalesOrderItemWebResponseDto,
  MachineResponseDto,
} from '@/types/api-types';
import { ProductionAllotmentService } from '@/services/productionAllotmentService';
import { SalesOrderWebService } from '@/services/salesOrderWebService';
import { ProcessingSummary } from '@/components/SalesOrderItemProcessing/ProcessingSummary';
import { ItemDetails } from '@/components/SalesOrderItemProcessing/ItemDetails';
import { ProductionTimingCalculation } from '@/components/SalesOrderItemProcessing/ProductionTimingCalculation';
import { RollCalculation } from '@/components/SalesOrderItemProcessing/RollCalculation';
import { MachineLoadDistribution } from '@/components/SalesOrderItemProcessing/MachineLoadDistribution';
import { AdditionalInformation } from '@/components/SalesOrderItemProcessing/AdditionalInformation';
import { ProcessingActions } from '@/components/SalesOrderItemProcessing/ProcessingActions';
import { PackagingDetails } from '@/components/SalesOrderItemProcessing/PackagingDetails';

// Interfaces
interface LocationState {
  orderData?: SalesOrderWebResponseDto;
  selectedItem?: SalesOrderItemWebResponseDto;
}

// Utility function to format numbers to fixed decimal places
const formatNumber = (value: number, decimals: number = 2): number => {
  return Number(value.toFixed(decimals));
};

// Validation function to check if all required data is present
const validateRequiredData = (
  order: SalesOrderWebResponseDto,
  item: SalesOrderItemWebResponseDto
): string[] => {
  const errors: string[] = [];

  if (!order.voucherNumber) errors.push('Voucher number is missing');
  if (!order.buyerName) errors.push('Buyer name is missing');
  if (!item.itemName) errors.push('Item name is missing');
  //if (!item.itemDescription) errors.push('Item description is missing');
  if (!item.fabricType) errors.push('Fabric type is missing');
  if (item.qty <= 0) errors.push('Item quantity must be greater than zero');

  return errors;
};

// Helper function to extract diameter and gauge from description
const extractDiameterGauge = (
  description: string
): { diameter: number | null; gauge: number | null } => {
  if (!description) {
    return { diameter: null, gauge: null };
  }

  // Multiple patterns for diameter and gauge extraction
  const patterns = [
    /dia\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*[x*]\s*(\d+(?:\.\d+)?)/i,
    /diameter\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*[x*]\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)["”]\s*[x*]\s*(\d+(?:\.\d+)?)/i,
    /dia\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    /diameter\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    /gg\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
    /gauge\s*[:\-]?\s*(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      // For patterns with two groups (dia x gg)
      if (match[1] && match[2]) {
        const dia = parseFloat(match[1]);
        const gg = parseFloat(match[2]);
        if (!isNaN(dia) && !isNaN(gg)) {
          return { diameter: dia, gauge: gg };
        }
      }
      // For patterns with one group (dia or gg only)
      else if (match[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          // Heuristic: if value is likely a diameter (typically larger)
          if (value > 10) {
            return { diameter: value, gauge: null };
          } else {
            return { diameter: null, gauge: value };
          }
        }
      }
    }
  }

  return { diameter: null, gauge: null };
};

interface ProductionCalculation {
  needle: number;
  feeder: number;
  rpm: number;
  constant: number;
  stichLength: number;
  count: number;
  efficiency: number;
  productionPerDay: number;
  productionPerHour: number;
  productionPerMinute: number;
}
interface MachineSelection {
  selectedMachine: MachineResponseDto | null;
}
interface MachineLoadDistributionItem {
  machineId: number;
  machineName: string;
  allocatedRolls: number;
  allocatedWeight: number;
  estimatedProductionTime: number;
  isEditing?: boolean;
  customParameters?: {
    needle: number;
    feeder: number;
    rpm: number;
    efficiency: number;
    constant: number;
  };
}
interface RollInput {
  actualQuantity: number;
  rollPerKg: number;
}
interface RollCalculationData extends RollInput {
  numberOfRolls: number;
  totalWholeRolls: number;
  fractionalRoll: number;
  fractionalWeight: number;
}
interface AdditionalFields {
  yarnLotNo: string;
  counter: string;
  colourCode: string;
  reqGreyGsm: number | null;
  reqGreyWidth: number | null;
  reqFinishGsm: number | null;
  reqFinishWidth: number | null;
}
interface PackagingDetailsState {
  coreType: 'with' | 'without';
  tubeWeight: number;
  tapeColorId: number | { color1Id: number; color2Id: number } | null;
  shrinkRapWeight?: number;
}

const SalesOrderItemProcessingRefactored = () => {
  const { orderId, itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;

  // State declarations
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderWebResponseDto | null>(
    locationState?.orderData || null
  );
  const [selectedItem, setSelectedItem] = useState<SalesOrderItemWebResponseDto | null>(
    locationState?.selectedItem || null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isItemProcessing, setIsItemProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lotmentId, setLotmentId] = useState<string | null>(null);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;

  const [additionalFields, setAdditionalFields] = useState<AdditionalFields>({
    yarnLotNo: '',
    counter: '',
    colourCode: '',
    reqGreyGsm: null,
    reqGreyWidth: null,
    reqFinishGsm: null,
    reqFinishWidth: null,
  });
  const [packagingDetails, setPackagingDetails] = useState<PackagingDetailsState>({
    coreType: 'with',
    tubeWeight: 1,
    tapeColorId: null,
    shrinkRapWeight: 0.06,
  });
  const [machineSelection, setMachineSelection] = useState<MachineSelection>({
    selectedMachine: null,
  });
  const [selectedMachines, setSelectedMachines] = useState<MachineLoadDistributionItem[]>([]);
  const [showMachineDistribution, setShowMachineDistribution] = useState(false);

  const [rollInput, setRollInput] = useState<RollInput>({ actualQuantity: 0, rollPerKg: 0 });
  const [rollCalculation, setRollCalculation] = useState<RollCalculationData>({
    actualQuantity: 0,
    rollPerKg: 0,
    numberOfRolls: 0,
    totalWholeRolls: 0,
    fractionalRoll: 0,
    fractionalWeight: 0,
  });
  const [productionCalc, setProductionCalc] = useState<ProductionCalculation>({
    needle: 0,
    feeder: 0,
    rpm: 0,
    constant: 0.00085,
    stichLength: 0,
    count: 0,
    efficiency: 0,
    productionPerDay: 0,
    productionPerHour: 0,
    productionPerMinute: 0,
  });

  // Data fetching hooks
  const { data: machines, isLoading: isLoadingMachines } = useMachines();
  const { data: fabricStructures } = useFabricStructures();
  const { data: tapeColors = [] } = useTapeColors();
  const { data: slitLines = [] } = useSlitLines();
  const { data: yarnTypes = [] } = useYarnTypes();
  const { extractFabricTypeFromDescription } = useDescriptionParser();

  // Initialize data from location state or params
  useEffect(() => {
    if (locationState?.orderData && locationState?.selectedItem) {
      setSelectedOrder(locationState.orderData);
      setSelectedItem(locationState.selectedItem);
      setRollInput((prev) => ({
        ...prev,
        actualQuantity:
          parseFloat(locationState.selectedItem?.qty?.toString() || '0') || prev.actualQuantity,
      }));
    } else if (orderId && itemId) {
      navigate('/sales-orders');
    }
  }, [locationState, orderId, itemId, navigate]);

  // Sync rollInput with selectedItem
  useEffect(() => {
    if (selectedItem) {
      setRollInput((prev) => ({
        ...prev,
        actualQuantity: parseFloat(selectedItem.qty?.toString() || '0') || prev.actualQuantity,
        // Initialize rollPerKg from wtPerRoll if not already set
        rollPerKg: prev.rollPerKg || selectedItem.wtPerRoll || prev.rollPerKg,
      }));
    }
  }, [selectedItem]);

  // Initialize default machine (K120)
  useEffect(() => {
    if (machines?.length) {
      const k120Machine = machines.find((m) => m.machineName.toLowerCase().includes('k120'));
      const defaultMachine = k120Machine || machines[0];
      setMachineSelection({ selectedMachine: defaultMachine });
      setProductionCalc((prev) => ({
        ...prev,
        needle: defaultMachine.needle,
        feeder: defaultMachine.feeder,
        rpm: defaultMachine.rpm,
      }));
    }
  }, [machines]);

  // Parse description values
  const parseDescriptionValues = (description: string) => {
    // Return default values since we're no longer parsing from description
    return {
      stitchLength: 0,
      count: 0,
      weightPerRoll: 0,
      numberOfRolls: 0,
      diameter: 0,
      gauge: 0,
      composition: '',
    };
  };

  const parsedDescriptionValues = useMemo(
    () =>
      selectedItem?.itemDescription
        ? parseDescriptionValues(selectedItem.itemDescription)
        : {
            stitchLength: 0,
            count: 0,
            weightPerRoll: 0,
            numberOfRolls: 0,
            diameter: 0,
            gauge: 0,
            composition: '',
          },
    [selectedItem?.itemDescription]
  );

  // Set values from description
  useEffect(() => {
    // No longer setting values from description since we use dedicated fields
    // But we can set stitchLength and count from the sales order item if available
    if (selectedItem?.stitchLength) {
      // Extract first numeric value from stitchLength (e.g., "2.3/2.1/2.4" -> 2.3, "2.4/" -> 2.4, "2.3" -> 2.3)
      const match = selectedItem.stitchLength.toString().match(/(\d+(?:\.\d+)?)/);
      if (match && match[1]) {
        const firstValue = parseFloat(match[1]);
        if (!isNaN(firstValue)) {
          setProductionCalc((prev) => ({
            ...prev,
            stichLength: firstValue,
          }));
        }
      }
    }

    // Set count from the sales order item if available
    if (selectedItem?.yarnCount) {
      // Extract first numeric value from yarnCount (e.g., "30/1" -> 30)
      const match = selectedItem.yarnCount.toString().match(/(\d+)/);
      if (match && match[1]) {
        const firstValue = parseInt(match[1], 10);
        if (!isNaN(firstValue)) {
          setProductionCalc((prev) => ({
            ...prev,
            count: firstValue,
          }));
        }
      }
    }
  }, [selectedItem]);

  // Production calculation
  useEffect(() => {
    calculateProduction();
  }, [
    productionCalc.needle,
    productionCalc.feeder,
    productionCalc.rpm,
    productionCalc.stichLength,
    productionCalc.count,
    productionCalc.efficiency,
  ]);

  const calculateProduction = () => {
    const { needle, feeder, rpm, constant, stichLength, count, efficiency } = productionCalc;

    // Validate inputs to prevent division by zero or negative values
    if (
      needle <= 0 ||
      feeder <= 0 ||
      rpm <= 0 ||
      stichLength <= 0 ||
      count <= 0 ||
      efficiency <= 0
    ) {
      setProductionCalc((prev) => ({
        ...prev,
        productionPerDay: 0,
        productionPerHour: 0,
        productionPerMinute: 0,
      }));
      return;
    }

    try {
      const efficiencyDecimal = Math.min(efficiency / 100, 1); // Cap efficiency at 100%
      const productionGramsPerMinute =
        (needle * feeder * rpm * stichLength * constant * efficiencyDecimal) / count;

      // Prevent negative or infinite values
      if (!isFinite(productionGramsPerMinute) || productionGramsPerMinute <= 0) {
        throw new Error('Invalid production calculation result');
      }

      const productionKgPerMinute = productionGramsPerMinute / 1000;

      setProductionCalc((prev) => ({
        ...prev,
        productionPerMinute: Math.max(Math.round(productionKgPerMinute * 10000) / 10000, 0),
        productionPerHour: Math.max(Math.round(productionKgPerMinute * 60 * 100) / 100, 0),
        productionPerDay: Math.max(Math.round(productionKgPerMinute * 60 * 24 * 100) / 100, 0),
      }));
    } catch (error) {
      console.error('Production calculation error:', error);
      setProductionCalc((prev) => ({
        ...prev,
        productionPerDay: 0,
        productionPerHour: 0,
        productionPerMinute: 0,
      }));
    }
  };

  // Roll calculation
  useEffect(() => {
    const actualQuantity = Number(rollInput.actualQuantity) || 0;
    const rollPerKg = Number(rollInput.rollPerKg) || 0;

    // Validate inputs
    if (actualQuantity <= 0 || rollPerKg <= 0) {
      setRollCalculation({
        actualQuantity,
        rollPerKg,
        numberOfRolls: 0,
        totalWholeRolls: 0,
        fractionalRoll: 0,
        fractionalWeight: 0,
      });
      return;
    }

    if (actualQuantity > 0 && rollPerKg > 0) {
      const totalRolls = actualQuantity / rollPerKg;
      const wholeRolls = Math.floor(totalRolls);
      const fractionalRoll = totalRolls - wholeRolls;

      // If there's a fractional roll, add one additional roll for production planning
      const adjustedTotalRolls = fractionalRoll > 0 ? Math.ceil(totalRolls) : totalRolls;

      setRollCalculation({
        actualQuantity: formatNumber(actualQuantity),
        rollPerKg: formatNumber(rollPerKg),
        numberOfRolls: formatNumber(adjustedTotalRolls),
        totalWholeRolls: Math.floor(adjustedTotalRolls),
        fractionalRoll: formatNumber(adjustedTotalRolls - Math.floor(adjustedTotalRolls)),
        fractionalWeight: formatNumber(
          (adjustedTotalRolls - Math.floor(adjustedTotalRolls)) * rollPerKg
        ),
      });
    } else if (actualQuantity > 0 && selectedItem && selectedItem.noOfRolls > 0) {
      const calculatedRollPerKg = actualQuantity / selectedItem.noOfRolls;
      // Use the number of rolls from sales order item
      const numberOfRolls = selectedItem.noOfRolls;

      setRollCalculation({
        actualQuantity: formatNumber(actualQuantity),
        rollPerKg: formatNumber(calculatedRollPerKg),
        numberOfRolls: formatNumber(numberOfRolls),
        totalWholeRolls: numberOfRolls,
        fractionalRoll: 0,
        fractionalWeight: 0,
      });
      setRollInput((prev) => ({ ...prev, rollPerKg: formatNumber(calculatedRollPerKg) }));
    } else {
      setRollCalculation({
        actualQuantity,
        rollPerKg,
        numberOfRolls: 0,
        totalWholeRolls: 0,
        fractionalRoll: 0,
        fractionalWeight: 0,
      });
    }
  }, [rollInput.actualQuantity, rollInput.rollPerKg, selectedItem?.noOfRolls]);

  // Machine distribution functions
  const addMachineToDistribution = (machine: MachineResponseDto) => {
    if (selectedMachines.some((m) => m.machineId === machine.id)) return;

    let fabricEfficiency = productionCalc.efficiency;
    if (fabricStructures && selectedItem) {
      // Use the dedicated fabricType field first
      let itemFabricType = selectedItem.fabricType || '';

      // Fallback to item name if still empty
      if (!itemFabricType && selectedItem.itemName) {
        itemFabricType = selectedItem.itemName.toLowerCase();
      }

      const matchingFabric = fabricStructures.find(
        (f) =>
          itemFabricType.toLowerCase().includes(f.fabricstr.toLowerCase()) ||
          f.fabricstr.toLowerCase().includes(itemFabricType.toLowerCase().split(' ')[0])
      );
      if (matchingFabric) fabricEfficiency = matchingFabric.standardeffencny;
    }

    setSelectedMachines((prev) => [
      ...prev,
      {
        machineId: machine.id,
        machineName: machine.machineName,
        allocatedRolls: 0,
        allocatedWeight: 0,
        estimatedProductionTime: 0,
        isEditing: false,
        customParameters: {
          needle: machine.needle,
          feeder: machine.feeder,
          rpm: machine.rpm,
          efficiency: fabricEfficiency,
          constant: machine.constat || 0.00085,
        },
      },
    ]);
  };

  const removeMachineFromDistribution = (machineId: number) => {
    setSelectedMachines((prev) => prev.filter((m) => m.machineId !== machineId));
  };

  const toggleMachineEdit = (machineId: number) => {
    setSelectedMachines((prev) =>
      prev.map((m) => (m.machineId === machineId ? { ...m, isEditing: !m.isEditing } : m))
    );
  };

  const updateMachineParameters = (
    machineId: number,
    parameters: Partial<MachineLoadDistributionItem['customParameters']>
  ) => {
    setSelectedMachines((prev) =>
      prev.map((m) =>
        m.machineId === machineId
          ? { ...m, customParameters: { ...m.customParameters!, ...parameters } }
          : m
      )
    );
  };

  const saveMachineParameters = (machineId: number) => {
    setSelectedMachines((prev) =>
      prev.map((machine) => {
        if (machine.machineId === machineId) {
          const params = machine.customParameters!;
          let estimatedTime = 0;

          if (
            machine.allocatedWeight > 0 &&
            productionCalc.stichLength > 0 &&
            productionCalc.count > 0
          ) {
            const efficiencyDecimal = params.efficiency / 100;
            const productionGramsPerMinute =
              (params.needle *
                params.feeder *
                params.rpm *
                productionCalc.stichLength *
                params.constant *
                efficiencyDecimal) /
              productionCalc.count;
            const productionKgPerHour = (productionGramsPerMinute / 1000) * 60;
            if (productionKgPerHour > 0) {
              const hours = machine.allocatedWeight / productionKgPerHour;
              estimatedTime = hours / 24; // Convert to days
            }
          }

          return { ...machine, isEditing: false, estimatedProductionTime: estimatedTime };
        }
        return machine;
      })
    );
  };

  const updateMachineAllocation = (machineId: number, allocatedWeight: number) => {
    const actualQuantity = Number(rollInput.actualQuantity) || 0;
    const currentTotalAllocated = selectedMachines.reduce(
      (sum, m) => (m.machineId === machineId ? sum : sum + m.allocatedWeight),
      0
    );

    if (currentTotalAllocated + allocatedWeight > actualQuantity) {
      console.warn(`Total allocated weight exceeds actual quantity`);
    }

    setSelectedMachines((prev) =>
      prev.map((machine) => {
        if (machine.machineId === machineId) {
          const rolls = rollInput.rollPerKg > 0 ? allocatedWeight / rollInput.rollPerKg : 0;
          let estimatedTime = 0;

          if (allocatedWeight > 0) {
            const params = machine.customParameters;
            if (params && productionCalc.stichLength > 0 && productionCalc.count > 0) {
              const efficiencyDecimal = params.efficiency / 100;
              const productionGramsPerMinute =
                (params.needle *
                  params.feeder *
                  params.rpm *
                  productionCalc.stichLength *
                  params.constant *
                  efficiencyDecimal) /
                productionCalc.count;
              const productionKgPerHour = (productionGramsPerMinute / 1000) * 60;
              if (productionKgPerHour > 0) {
                const hours = allocatedWeight / productionKgPerHour;
                estimatedTime = hours / 24; // Convert to days
              }
            } else {
              const selectedMachineData = machines?.find((m) => m.id === machineId);
              if (
                selectedMachineData &&
                productionCalc.stichLength > 0 &&
                productionCalc.count > 0
              ) {
                let fabricEfficiency = productionCalc.efficiency;
                if (fabricStructures && selectedItem) {
                  // Use the dedicated fabricType field first
                  let itemFabricType = selectedItem.fabricType || '';

                  // Fallback to item name if still empty
                  if (!itemFabricType && selectedItem.itemName) {
                    itemFabricType = selectedItem.itemName.toLowerCase();
                  }

                  const matchingFabric = fabricStructures.find(
                    (f) =>
                      itemFabricType.toLowerCase().includes(f.fabricstr.toLowerCase()) ||
                      f.fabricstr.toLowerCase().includes(itemFabricType.toLowerCase().split(' ')[0])
                  );
                  if (matchingFabric) fabricEfficiency = matchingFabric.standardeffencny;
                }

                const efficiencyDecimal = fabricEfficiency / 100;
                const constant = selectedMachineData.constat || productionCalc.constant || 0.00085;
                const productionGramsPerMinute =
                  (selectedMachineData.needle *
                    selectedMachineData.feeder *
                    selectedMachineData.rpm *
                    productionCalc.stichLength *
                    constant *
                    efficiencyDecimal) /
                  productionCalc.count;
                const productionKgPerHour = (productionGramsPerMinute / 1000) * 60;
                if (productionKgPerHour > 0) {
                  const hours = allocatedWeight / productionKgPerHour;
                  estimatedTime = hours / 24; // Convert to days
                }
              }
            }
          }

          return {
            ...machine,
            allocatedRolls: formatNumber(rolls),
            allocatedWeight: formatNumber(allocatedWeight),
            estimatedProductionTime: formatNumber(estimatedTime, 4),
          };
        }
        return machine;
      })
    );
  };

  const autoDistributeLoad = () => {
    if (selectedMachines.length === 0) {
      alert('Please select at least one machine first.');
      return;
    }

    const actualQuantity = Number(rollInput.actualQuantity);
    const rollPerKg = Number(rollInput.rollPerKg);
    if (!actualQuantity || actualQuantity <= 0) {
      alert('No quantity available for distribution.');
      return;
    }
    if (!rollPerKg || rollPerKg <= 0) {
      alert('Please enter Roll per Kg value first.');
      return;
    }

    // Use the adjusted roll calculation from rollCalculation state
    const totalRolls = rollCalculation.numberOfRolls;
    const wholeRolls = rollCalculation.totalWholeRolls;
    const fractionalRoll = rollCalculation.fractionalRoll;
    const fractionalWeight = rollCalculation.fractionalWeight;

    const wholeRollsPerMachine = Math.floor(wholeRolls / selectedMachines.length);
    const remainingWholeRolls = wholeRolls % selectedMachines.length;

    let updatedMachines = selectedMachines.map((machine, index) => {
      let machineRolls = wholeRollsPerMachine + (index < remainingWholeRolls ? 1 : 0);
      // If there's a fractional roll, distribute it to the last machine
      if (fractionalRoll > 0 && index === selectedMachines.length - 1) {
        machineRolls += fractionalRoll;
      }

      let machineWeight = machineRolls * rollPerKg;
      // Adjust weight calculation for fractional roll
      if (fractionalRoll > 0 && index === selectedMachines.length - 1) {
        machineWeight = (machineRolls - fractionalRoll) * rollPerKg + fractionalWeight;
      }

      return {
        ...machine,
        allocatedRolls: formatNumber(machineRolls),
        allocatedWeight: formatNumber(machineWeight),
      };
    });

    // Calculate production times
    updatedMachines = updatedMachines.map((machine) => {
      const selectedMachineData = machines?.find((m) => m.id === machine.machineId);
      let estimatedTime = 0;

      if (
        selectedMachineData &&
        machine.allocatedWeight > 0 &&
        productionCalc.stichLength > 0 &&
        productionCalc.count > 0
      ) {
        let fabricEfficiency = productionCalc.efficiency;
        if (fabricStructures && selectedItem) {
          // Use the dedicated fabricType field first
          let itemFabricType = selectedItem.fabricType || '';

          // Fallback to item name if still empty
          if (!itemFabricType && selectedItem.itemName) {
            itemFabricType = selectedItem.itemName.toLowerCase();
          }

          const matchingFabric = fabricStructures.find(
            (f) =>
              itemFabricType.toLowerCase().includes(f.fabricstr.toLowerCase()) ||
              f.fabricstr.toLowerCase().includes(itemFabricType.toLowerCase().split(' ')[0])
          );
          if (matchingFabric) fabricEfficiency = matchingFabric.standardeffencny;
        }

        const efficiencyDecimal = fabricEfficiency / 100;
        const constant = selectedMachineData.constat || productionCalc.constant || 0.00085;
        const productionGramsPerMinute =
          (selectedMachineData.needle *
            selectedMachineData.feeder *
            selectedMachineData.rpm *
            productionCalc.stichLength *
            constant *
            efficiencyDecimal) /
          productionCalc.count;
        const productionKgPerHour = (productionGramsPerMinute / 1000) * 60;
        if (productionKgPerHour > 0) {
          const hours = machine.allocatedWeight / productionKgPerHour;
          estimatedTime = hours / 24; // Convert to days
        }
      }

      return { ...machine, estimatedProductionTime: formatNumber(estimatedTime, 4) };
    });

    setSelectedMachines(updatedMachines);
  };

  // Event handlers
  const handleRollInputChange = (field: keyof RollInput, value: number) => {
    setRollInput((prev) => ({ ...prev, [field]: value }));
  };

  const handleMachineChange = (machineId: string) => {
    const machine = machines?.find((m) => m.id.toString() === machineId);
    if (machine) {
      setMachineSelection({ selectedMachine: machine });
      setProductionCalc((prev) => ({
        ...prev,
        needle: machine.needle,
        feeder: machine.feeder,
        rpm: machine.rpm,
      }));
    }
  };

  const handleProductionValueChange = (field: keyof ProductionCalculation, value: number) => {
    setProductionCalc((prev) => ({ ...prev, [field]: value }));
  };

  const handleRefreshFromDescription = () => {
    // No longer setting values from description since we use dedicated fields
    // But we can set stitchLength and count from the sales order item if available
    if (selectedItem?.stitchLength) {
      // Extract first numeric value from stitchLength (e.g., "2.3/2.1/2.4" -> 2.3, "2.4/" -> 2.4, "2.3" -> 2.3)
      const match = selectedItem.stitchLength.toString().match(/(\d+(?:\.\d+)?)/);
      if (match && match[1]) {
        const firstValue = parseFloat(match[1]);
        if (!isNaN(firstValue)) {
          setProductionCalc((prev) => ({
            ...prev,
            stichLength: firstValue,
          }));
        }
      }
    }

    // Set count from the sales order item if available
    if (selectedItem?.yarnCount) {
      // Extract first numeric value from yarnCount (e.g., "30/1" -> 30)
      const match = selectedItem.yarnCount.toString().match(/(\d+)/);
      if (match && match[1]) {
        const firstValue = parseInt(match[1], 10);
        if (!isNaN(firstValue)) {
          setProductionCalc((prev) => ({
            ...prev,
            count: firstValue,
          }));
        }
      }
    }
  };

  const handleGoBack = () => navigate('/sales-orders');

  const handleAdditionalFieldChange = (
    field: keyof AdditionalFields,
    value: string | number | null
  ) => {
    setAdditionalFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleCoreTypeChange = (coreType: 'with' | 'without') => {
    setPackagingDetails((prev) => ({
      ...prev,
      coreType,
      tubeWeight: coreType === 'without' ? 0 : prev.tubeWeight === 0 ? 1 : prev.tubeWeight,
    }));
  };

  const handleTubeWeightChange = (weight: number) => {
    setPackagingDetails((prev) => ({ ...prev, tubeWeight: weight }));
  };

  const handleTapeColorChange = (tapeColorId: number | { color1Id: number; color2Id: number }) => {
    setPackagingDetails((prev) => ({ ...prev, tapeColorId }));
  };

  const handleShrinkRapWeightChange = (weight: number) => {
    setPackagingDetails((prev) => ({ ...prev, shrinkRapWeight: weight }));
  };

  // Allotment ID generation
  const generateAllotmentId = async () => {
    if (!selectedOrder || !selectedItem) return null;

    try {
      const firstChar = selectedOrder.voucherNumber.includes('/J') ? 'J' : 'A';

      // Extract fabric type - now only using the dedicated fabricType field
      let fabricTypeCode: string | null = null;

      // Use the dedicated fabricType field from the sales order item
      if (selectedItem.fabricType) {
        // Try to find fabric code from fabric structures first
        if (fabricStructures) {
          // Exact match first
          const exactMatch = fabricStructures.find(
            (f) => f.fabricstr.toLowerCase() === selectedItem.fabricType.toLowerCase()
          );

          // Partial match if no exact match
          const partialMatch = !exactMatch
            ? fabricStructures.find(
                (f) =>
                  selectedItem.fabricType.toLowerCase().includes(f.fabricstr.toLowerCase()) ||
                  f.fabricstr.toLowerCase().includes(selectedItem.fabricType.toLowerCase())
              )
            : null;

          const matchingFabric = exactMatch || partialMatch;

          if (matchingFabric) {
            // Priority 1: Use fabricCode from fabric structure if available
            if (matchingFabric.fabricCode) {
              fabricTypeCode = matchingFabric.fabricCode;
            }
            // Priority 2: Map using fabric structure name if no fabricCode
            else {
              const fabricTypeMap: { [key: string]: string } = {
                'single jersey': 'SJ',
                '1x1 rib': '1R',
                '2x1 rib': '2R',
                '3x1 rib': '3R',
                'two thread fleece': '2F',
                'three thread fleece': '3F',
                'variegated rib': 'VR',
                'popcorn strip': 'PS',
                'honey comb': 'HC',
                'honeycomb strip': 'HS',
                'pop corn': 'PO',
                'pique crinkle': 'PC',
                'rice knit': 'RK',
                'single pique': 'SP',
                'double pique': 'DP',
                'single jersey pleated': 'PL',
                'single jersysmall biscuit': 'SB',
                waffle: 'WA',
                'waffle miss cam': 'WM',
                'pointelle rib': 'PR',
                herringbone: 'HB',
                stripe: 'ST',
              };

              const fabricStrLower = matchingFabric.fabricstr.toLowerCase();
              for (const [key, code] of Object.entries(fabricTypeMap)) {
                if (fabricStrLower.includes(key)) {
                  fabricTypeCode = code;
                  break;
                }
              }
            }
          }
        }
        // Fallback: Try to map directly from the fabricType field if fabricStructures is not loaded
        else {
          const fabricTypeMap: { [key: string]: string } = {
            'single jersey': 'SJ',
            '1x1 rib': '1R',
            '2x1 rib': '2R',
            '3x1 rib': '3R',
            'two thread fleece': '2F',
            'three thread fleece': '3F',
            'variegated rib': 'VR',
            'popcorn strip': 'PS',
            'honey comb': 'HC',
            'honeycomb strip': 'HS',
            'pop corn': 'PO',
            'pique crinkle': 'PC',
            'rice knit': 'RK',
            'single pique': 'SP',
            'double pique': 'DP',
            'single jersey pleated': 'PL',
            'single jersysmall biscuit': 'SB',
            waffle: 'WA',
            'waffle miss cam': 'WM',
            'pointelle rib': 'PR',
            herringbone: 'HB',
            stripe: 'ST',
          };

          const fabricTypeLower = selectedItem.fabricType.toLowerCase();
          for (const [key, code] of Object.entries(fabricTypeMap)) {
            if (fabricTypeLower.includes(key)) {
              fabricTypeCode = code;
              break;
            }
          }
        }
      }

      // Use values from dedicated fields, fallback to defaults
      const fourthChar =
        selectedItem.composition?.toLowerCase().includes('lycra') ||
        selectedItem.composition?.toLowerCase().includes('spandex')
          ? 'L'
          : 'X';

      // Enhanced yarn type detection from dedicated fields
      let fifthChar: string | null = null;
      let yarnCount: string | null = null;

      // Extract yarn type and count from dedicated yarnCount field
      if (selectedItem.yarnCount) {
        // Parse yarn information from the dedicated yarnCount field
        const yarnMatch = selectedItem.yarnCount.match(/(\d+)\/(\d+)/);
        if (yarnMatch && yarnMatch[1] && yarnMatch[2]) {
          yarnCount = yarnMatch[1].padStart(2, '0').substring(0, 2);
          fifthChar = yarnMatch[2] === '2' ? '2' : '1';
        } else {
          // Try to extract just the count part
          const countMatch = selectedItem.yarnCount.match(/(\d+)/);
          if (countMatch && countMatch[1]) {
            yarnCount = countMatch[1].padStart(2, '0').substring(0, 2);
            fifthChar = '1'; // Default yarn type
          }
        }
      }

      // Final fallbacks: default values if still not found
      if (!fifthChar) {
        fifthChar = '1'; // Default yarn type
      }

      if (!yarnCount) {
        yarnCount = '40'; // Default yarn count
      }

      const eighthChar = (() => {
        // First, try to find yarn type code from yarnTypes master data
        if (selectedItem.yarnCount && yarnTypes && yarnTypes.length > 0) {
          // Look for yarn type codes in the yarnCount string (e.g., "KCH" in "23/1KCH")
          for (const yarnType of yarnTypes) {
            if (yarnType.yarnCode && selectedItem.yarnCount.includes(yarnType.yarnCode)) {
              // Found matching yarn code, use its short code
              if (yarnType.shortCode) {
                return yarnType.shortCode.charAt(0).toUpperCase();
              }
            }
          }
        }

        // Fallback to composition-based detection
        if (selectedItem.composition?.toLowerCase().includes('carded')) {
          return 'K';
        }

        // Default to 'C' for combed
        return 'C';
      })();

      let machineDiameter: string | null = null;
      let machineGauge: string | null = null;

      // Extract diameter and gauge from dedicated fields
      if (selectedItem.dia > 0) {
        machineDiameter = selectedItem.dia.toString().padStart(2, '0').substring(0, 2);
      } else if (selectedMachines.length > 0 && machines) {
        const firstMachine = machines.find((m) => m.id === selectedMachines[0].machineId);
        if (firstMachine) {
          machineDiameter = firstMachine.dia.toString().padStart(2, '0').substring(0, 2);
        }
      }

      if (selectedItem.gg > 0) {
        machineGauge = selectedItem.gg.toString().padStart(2, '0').substring(0, 2);
      } else if (selectedMachines.length > 0 && machines) {
        const firstMachine = machines.find((m) => m.id === selectedMachines[0].machineId);
        if (firstMachine) {
          machineGauge = firstMachine.gg.toString().padStart(2, '0').substring(0, 2);
        }
      }

      // Validate required fields before generating lotment ID
      if (!fabricTypeCode) {
        // If fabricStructures is not loaded yet and we couldn't map the fabric type,
        // throw a more specific error
        if (!fabricStructures) {
          throw new Error(
            'Fabric structure data is still loading. Please wait a moment and try again.'
          );
        }

        throw new Error(
          'Fabric type code not found. Please ensure the sales order was created properly with a valid fabric type that matches the fabric structure master data.'
        );
      }

      if (!yarnCount) {
        throw new Error(
          'Yarn count not found. Please ensure the sales order was created properly with correct yarn count information.'
        );
      }

      // Use default values for machine diameter and gauge if not found
      if (!machineDiameter) {
        machineDiameter = '00'; // Default value
        console.warn('Machine diameter not found, using default value "00"');
      }

      if (!machineGauge) {
        machineGauge = '00'; // Default value
        console.warn('Machine gauge not found, using default value "00"');
      }

      // Calculate financial year based on current date
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
      let financialYear =
        currentMonth >= 4
          ? (currentYear % 100).toString().padStart(2, '0')
          : (currentYear % 100).toString().padStart(2, '0');

      const serialNumber = await ProductionAllotmentService.getNextSerialNumber();

      // Use slitLine field if available - now matching against slit line master data
      let twentyFirstChar = '';
      if (selectedItem?.slitLine && slitLines && slitLines.length > 0) {
        // Find matching slit line in master data (case-insensitive)
        const matchingSlitLine = slitLines.find(
          (sl) => sl.slitLine.toLowerCase() === selectedItem.slitLine!.toLowerCase()
        );

        // If exact match found, use the SlitLineCode from master data
        if (matchingSlitLine) {
          // Handle both string and char representations of SlitLineCode
          const slitLineCode = matchingSlitLine.slitLineCode;
          twentyFirstChar = slitLineCode.toString().toUpperCase();
        }
      }

      // Fallback to default if no match found or slitLineCode is invalid
      if (!twentyFirstChar || twentyFirstChar.length !== 1) {
        // Use a default value instead of throwing an error
        twentyFirstChar = 'N'; // Default to 'N' for cases where slit line is not specified
      }

      const part1 = `${firstChar}${fabricTypeCode}${fourthChar}`;
      const part2 = `${fifthChar}${yarnCount}${eighthChar}${machineDiameter}${machineGauge}`;
      const part3 = `${financialYear}${serialNumber}${twentyFirstChar}`;

      return `${part1}-${part2}-${part3}`;
    } catch (error) {
      console.error('Error generating lotment ID:', error);
      throw error; // Re-throw the error so it can be handled by the caller
    }
  };

  useEffect(() => {
    const generateId = async () => {
      // Only attempt to generate ID when we have the basic required data
      if (selectedOrder && selectedItem && !lotmentId && !isGeneratingId) {
        // If we don't have fabricStructures yet and haven't exceeded retry count, wait and retry
        if (!fabricStructures && retryCount < maxRetries) {
          console.log(`Attempt ${retryCount + 1}: Waiting for fabric structures to load...`);
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 1000);
          return;
        }

        setIsGeneratingId(true);
        try {
          const id = await generateAllotmentId();
          if (id) {
            setLotmentId(id);
            setRetryCount(0); // Reset retry count on success
          }
        } catch (error: any) {
          console.error('Error generating lotment ID:', error);
          setRetryCount(0); // Reset retry count after error
          alert(
            `Error generating lotment ID: ${error.message}\n\nPlease ensure the sales order was created properly with all required information before creating production planning.`
          );
        } finally {
          setIsGeneratingId(false);
        }
      }
    };
    generateId();
  }, [
    selectedOrder,
    selectedItem,
    machines,
    selectedMachines,
    slitLines,
    fabricStructures,
    yarnTypes,
    lotmentId,
    isGeneratingId,
    retryCount,
  ]);

  // Process item
  const handleProcessItem = async () => {
    if (!selectedItem || !selectedOrder) return;

    // Validate required data
    const validationErrors = validateRequiredData(selectedOrder, selectedItem);
    if (validationErrors.length > 0) {
      alert(`Missing required data:\n- ${validationErrors.join('\n- ')}`);
      return;
    }

    if (selectedMachines.length === 0) {
      alert('Please select at least one machine before processing.');
      return;
    }

    const totalAllocated = selectedMachines.reduce((sum, m) => sum + m.allocatedWeight, 0);
    const actualQuantity = Number(rollInput.actualQuantity || 0);

    // Check for over-allocation
    if (totalAllocated > actualQuantity * 1.1) {
      alert(
        `Total allocated weight (${totalAllocated.toFixed(2)} kg) exceeds actual quantity (${actualQuantity.toFixed(2)} kg) by more than 10%. Please adjust allocations.`
      );
      return;
    }

    // Warn if significantly under-allocated
    if (totalAllocated < actualQuantity * 0.9) {
      const confirmed = window.confirm(
        `Warning: Total allocated weight (${totalAllocated.toFixed(2)} kg) is significantly less than actual quantity (${actualQuantity.toFixed(2)} kg). Do you want to continue?`
      );
      if (!confirmed) {
        return;
      }
    }

    let lotmentId: string | null = null;
    try {
      lotmentId = await generateAllotmentId();
    } catch (error: any) {
      alert(
        `Error generating lotment ID: ${error.message}\n\nPlease ensure the sales order was created properly with all required information before creating production planning.`
      );
      return;
    }

    if (!lotmentId) {
      alert('Error generating lotment ID. Please try again.');
      return;
    }

    setIsProcessing(true);
    try {
      const machineAllocations = selectedMachines.map((machine) => ({
        machineName: machine.machineName,
        machineId: machine.machineId,
        numberOfNeedles: machine.customParameters?.needle || productionCalc.needle,
        feeders: machine.customParameters?.feeder || productionCalc.feeder,
        rpm: machine.customParameters?.rpm || productionCalc.rpm,
        rollPerKg: rollCalculation.rollPerKg,
        totalLoadWeight: machine.allocatedWeight,
        totalRolls: machine.allocatedRolls,
        rollBreakdown: {
          wholeRolls: [],
          fractionalRoll: { quantity: 0, weightPerRoll: 0, totalWeight: machine.allocatedWeight },
        },
        estimatedProductionTime: machine.estimatedProductionTime,
      }));

      const extractYarnCount = (desc: string) => {
        // Use the dedicated yarnCount field from the sales order item
        if (selectedItem.yarnCount) {
          return selectedItem.yarnCount;
        }

        // Fallback to parsing from description if yarnCount field is empty
        if (!desc) return 'N/A';

        // Try multiple regex patterns to find yarn information
        const regexPatterns = [
          /count\s*[:\-]?\s*(\d+\/\d+\s*[A-Z]*)/i, // Pattern for "Count: 30/1 Nm"
          /(\d+\/\d+\s*[A-Z]*)/i, // Pattern for "30/1 Nm"
          /count\s*[:\-]?\s*(\d+[sS]?\/\d+)/i, // Pattern for "Count: 40s/1"
          /(\d+[sS]?\/\d+)/i, // Pattern for "40s/1"
          /(\d+)\s*[sS]/i, // Pattern for standalone count like "40s"
        ];

        for (const pattern of regexPatterns) {
          const match = desc.match(pattern);
          if (match && match[1]) {
            return match[1].trim();
          }
        }

        return 'N/A';
      };

      const extractFabricType = (item: SalesOrderItemWebResponseDto) => {
        // First priority: Use the dedicated fabricType field
        if (item.fabricType) {
          return item.fabricType;
        }

        // Fallback to item name
        if (item.itemName) {
          // Extract first meaningful word from item name
          const words = item.itemName.split(' ').filter((word) => word.length > 2);
          if (words.length > 0) {
            return words[0];
          }
        }

        return 'N/A';
      };

      const extractComposition = (desc: string) => {
        // Use the dedicated composition field from the sales order item
        if (selectedItem.composition) {
          return selectedItem.composition;
        }

        // Fallback to parsing from description if composition field is empty
        if (!desc) return 'N/A';
        const compositionRegex = /(\d+%[^\d+]+)/g;
        const matches = desc.match(compositionRegex);
        return matches ? matches.join(' + ') : 'N/A';
      };

      const extractSlitLineFromDescription = (desc: string) => {
        // Use the dedicated slitLine field from the sales order item
        if (selectedItem.slitLine) {
          return selectedItem.slitLine;
        }

        // Fallback to parsing from description if slitLine field is empty
        if (!desc) return 'N/A';
        // Look for slit line pattern (note: description has "Slit Iine" typo instead of "Slit Line")
        const slitLineRegex = /slit\s*(?:iine|line)\s*[:\-]?\s*([^|\n\r]+)/i;
        const match = desc.match(slitLineRegex);
        if (match) {
          // Extract just the value part and trim whitespace
          let value = match[1].trim();
          // Remove trailing punctuation
          value = value.replace(/[.;:,]+$/, '');

          // Handle common values
          const lowerValue = value.toLowerCase();
          if (lowerValue === 'yes' || lowerValue === 'y') {
            return 'Yes';
          } else if (lowerValue === 'no' || lowerValue === 'n') {
            return 'No';
          } else if (lowerValue.includes('honeycomb')) {
            return 'Honeycomb';
          } else if (lowerValue.includes('open width') || lowerValue.includes('ow')) {
            return 'Open Width';
          }

          // Return the cleaned value for other cases
          return value.charAt(0).toUpperCase() + value.slice(1);
        }
        return 'N/A';
      };

      const requestData = {
        allotmentId: lotmentId,
        voucherNumber: selectedOrder.voucherNumber,
        itemName: selectedItem.itemName,
        salesOrderId: selectedOrder.id,
        salesOrderItemId: selectedItem.id,
        actualQuantity,
        yarnCount: extractYarnCount(selectedItem.itemDescription || ''),
        diameter: selectedItem.dia || productionCalc.needle,
        gauge: selectedItem.gg || productionCalc.feeder,
        fabricType: extractFabricType(selectedItem),
        slitLine: extractSlitLineFromDescription(selectedItem.itemDescription || ''),
        stitchLength: productionCalc.stichLength.toString(),
        efficiency: productionCalc.efficiency,
        composition: extractComposition(selectedItem.itemDescription || ''),
        yarnLotNo: additionalFields.yarnLotNo,
        counter: additionalFields.counter,
        colourCode: additionalFields.colourCode,
        reqGreyGsm: additionalFields.reqGreyGsm,
        reqGreyWidth: additionalFields.reqGreyWidth,
        reqFinishGsm: additionalFields.reqFinishGsm,
        reqFinishWidth: additionalFields.reqFinishWidth,
        partyName: selectedOrder.buyerName,
        tubeWeight: packagingDetails.coreType === 'with' ? packagingDetails.tubeWeight : 0,
        shrinkRapWeight: packagingDetails.shrinkRapWeight,
        totalWeight:
          packagingDetails.coreType === 'with'
            ? (packagingDetails.tubeWeight || 0) + (packagingDetails.shrinkRapWeight || 0)
            : packagingDetails.shrinkRapWeight || 0,
        tapeColor: packagingDetails.tapeColorId
          ? typeof packagingDetails.tapeColorId === 'number'
            ? tapeColors.find((color) => color.id === packagingDetails.tapeColorId)?.tapeColor || ''
            : `${tapeColors.find((color) => color.id === (packagingDetails.tapeColorId as { color1Id: number; color2Id: number }).color1Id)?.tapeColor || ''} + ${tapeColors.find((color) => color.id === (packagingDetails.tapeColorId as { color1Id: number; color2Id: number }).color2Id)?.tapeColor || ''}`
          : '',
        machineAllocations,
      };

      await ProductionAllotmentService.createProductionAllotment(requestData);

      setIsItemProcessing(true);
      try {
        // Mark the sales order item as processed and update the order's process flag if all items are processed
        const updatedOrder = await SalesOrderWebService.markSalesOrderItemWebAsProcessed(
          selectedOrder.id,
          selectedItem.id
        );

        // Update local state with the server response
        setSelectedItem((prev) => {
          if (!prev) return null;
          const updatedItem = updatedOrder.items.find((item) => item.id === prev.id);
          return updatedItem ? { ...updatedItem } : prev;
        });

        // Update the selectedOrder with the complete updated order from server
        setSelectedOrder(updatedOrder);
      } catch (error) {
        console.error('Error marking item as processed:', error);
        alert('Item was processed successfully, but there was an error updating the status.');
      } finally {
        setIsItemProcessing(false);
      }

      alert(
        `Successfully processed item: ${selectedItem.itemName} from order ${selectedOrder.voucherNumber}\nLotment ID: ${lotmentId}`
      );
      navigate('/sales-orders');
    } catch (error) {
      console.error('Error processing item:', error);
      alert('Error processing item. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedOrder || !selectedItem) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border rounded-xl bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="h-1 w-1 bg-border"></div>
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold font-display">Production Planning</h1>
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground">Processing Item</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {selectedItem?.itemName}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">Order:</span>
                  <span className="font-semibold">{selectedOrder?.voucherNumber}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium max-w-[150px] truncate">
                    {selectedOrder?.buyerName}
                  </span>
                </div>
                {lotmentId ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Lotment:</span>
                    <span className="font-mono font-semibold text-primary">{lotmentId}</span>
                  </div>
                ) : isGeneratingId ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Generating Lotment ID...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-red-100 p-2 rounded">
                    <span className="text-red-800 font-medium">
                      Lotment ID not generated. Required values not found in sales order. Please
                      ensure the sales order was created properly before creating production
                      planning.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pages */}
      {currentPage === 1 && (
        <>
          <ProcessingSummary selectedItem={selectedItem} />
          <ItemDetails selectedItem={selectedItem} selectedOrder={selectedOrder} />
          <ProductionTimingCalculation
            machines={machines}
            isLoadingMachines={isLoadingMachines}
            selectedItem={selectedItem}
            parsedDescriptionValues={parsedDescriptionValues}
            extractFabricTypeFromDescription={extractFabricTypeFromDescription}
            fabricStructures={fabricStructures || []}
            productionCalc={productionCalc}
            machineSelection={machineSelection}
            onMachineChange={handleMachineChange}
            onProductionValueChange={handleProductionValueChange}
            onRefreshFromDescription={handleRefreshFromDescription}
          />
        </>
      )}

      {currentPage === 2 && (
        <>
          <RollCalculation
            rollInput={rollInput}
            rollCalculation={rollCalculation}
            selectedItem={selectedItem}
            onRollInputChange={handleRollInputChange}
          />
          <MachineLoadDistribution
            machines={machines}
            isLoadingMachines={isLoadingMachines}
            selectedMachines={selectedMachines}
            rollInput={rollInput}
            showMachineDistribution={showMachineDistribution}
            onToggleMachineDistribution={() => setShowMachineDistribution(!showMachineDistribution)}
            onAddMachineToDistribution={addMachineToDistribution}
            onRemoveMachineFromDistribution={removeMachineFromDistribution}
            onToggleMachineEdit={toggleMachineEdit}
            onSaveMachineParameters={saveMachineParameters}
            onUpdateMachineParameters={updateMachineParameters}
            onUpdateMachineAllocation={updateMachineAllocation}
            onAutoDistributeLoad={autoDistributeLoad}
            onClearAllMachines={() => setSelectedMachines([])}
            machineDiameter={selectedItem.dia || undefined}
            machineGauge={selectedItem.gg || undefined}
            stitchLength={productionCalc.stichLength || undefined}
            count={productionCalc.count || undefined}
          />
        </>
      )}

      {currentPage === 3 && (
        <PackagingDetails
          rollPerKg={rollInput.rollPerKg}
          onCoreTypeChange={handleCoreTypeChange}
          onTubeWeightChange={handleTubeWeightChange}
          onTapeColorChange={handleTapeColorChange}
          onShrinkRapWeightChange={handleShrinkRapWeightChange}
          tubeWeight={packagingDetails.tubeWeight}
          shrinkRapWeight={packagingDetails.shrinkRapWeight}
          tapeColorId={packagingDetails.tapeColorId}
          lotmentId={lotmentId || undefined} // Pass lotmentId
        />
      )}

      {currentPage === 4 && (
        <>
          <AdditionalInformation
            additionalFields={additionalFields}
            selectedOrder={selectedOrder}
            onAdditionalFieldChange={handleAdditionalFieldChange}
            count={productionCalc.count}
            rollPerKg={rollInput.rollPerKg}
            needle={productionCalc.needle}
            feeder={productionCalc.feeder}
            stichLength={productionCalc.stichLength}
          />
          <ProcessingActions
            selectedItem={selectedItem}
            selectedOrder={selectedOrder}
            isProcessing={isProcessing}
            isItemProcessing={isItemProcessing}
            onProcessItem={handleProcessItem}
          />
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, 4))}
          disabled={currentPage === 4}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default SalesOrderItemProcessingRefactored;
