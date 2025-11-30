export const useDescriptionParser = () => {
  const parseDescriptionValues = (description: string) => {
    if (!description) return { stitchLength: 0, count: 0, weightPerRoll: 0 };
    
    const desc = description.toLowerCase();
    let stitchLength = 0;
    let count = 0;
    let weightPerRoll = 0;
    
    // Parse Stitch Length (S.L.)
    const slPatterns = [
      /s\.?l\.?\s*[:=]?\s*([0-9]+\.?[0-9]*)/i,
      /s\/l\s*[:=]?\s*([0-9]+\.?[0-9]*)/i,
      /stitch\s+length\s*[:=]?\s*([0-9]+\.?[0-9]*)/i,
      /sl\s*[:=]?\s*([0-9]+\.?[0-9]*)/i
    ];
    
    for (const pattern of slPatterns) {
      const match = desc.match(pattern);
      if (match && match[1]) {
        stitchLength = parseFloat(match[1]);
        break;
      }
    }
    
    // Parse Count
    const countPatterns = [
      /count\s*[:=]?\s*([0-9]+\.?[0-9]*)/i,
      /cnt\s*[:=]?\s*([0-9]+\.?[0-9]*)/i,
      /([0-9]+\.?[0-9]*)\s*count/i,
      /([0-9]+\.?[0-9]*)\s*cnt/i
    ];
    
    for (const pattern of countPatterns) {
      const match = desc.match(pattern);
      if (match && match[1]) {
        count = parseFloat(match[1]);
        break;
      }
    }
    
    // Parse Weight per Roll (Wt./Roll) - Enhanced patterns
    const weightPerRollPatterns = [
      /wt\.\/roll\s*[:=]?\s*([0-9]+\.?[0-9]*)\s*kg\/roll/i,
      /weight\s+per\s+roll\s*[:=]?\s*([0-9]+\.?[0-9]*)\s*kg/i,
      /([0-9]+\.?[0-9]*)\s*kg\/roll/i,
      /wt\s*[:=]?\s*([0-9]+\.?[0-9]*)\s*kg\/roll/i,
      /([0-9]+\.?[0-9]*)\s*kg\s*per\s*roll/i,
      /roll\s*[:=]?\s*([0-9]+\.?[0-9]*)\s*kg/i, // New pattern: "Roll: 30 kg"
      /([0-9]+\.?[0-9]*)\s*kg\s*roll/i // New pattern: "30 kg roll"
    ];
    
    for (const pattern of weightPerRollPatterns) {
      const match = desc.match(pattern);
      if (match && match[1]) {
        weightPerRoll = parseFloat(match[1]);
        break;
      }
    }
    
    return { stitchLength, count, weightPerRoll };
  };

  const parseActualQuantity = (description: string) => {
    if (!description) return 0;
    
    const desc = description.toLowerCase();
    let actualQuantity = 0;
    
    // Parse Actual Weight/Quantity
    const quantityPatterns = [
      /actual\s+weight\s*[:=]?\s*([0-9]+\.?[0-9]*)\s*kg/i,
      /weight\s*[:=]?\s*([0-9]+\.?[0-9]*)\s*kg/i,
      /([0-9]+\.?[0-9]*)\s*kg\s*weight/i,
      /total\s+weight\s*[:=]?\s*([0-9]+\.?[0-9]*)\s*kg/i,
      /quantity\s*[:=]?\s*([0-9]+\.?[0-9]*)\s*kg/i
    ];
    
    for (const pattern of quantityPatterns) {
      const match = desc.match(pattern);
      if (match && match[1]) {
        actualQuantity = parseFloat(match[1]);
        break;
      }
    }
    
    return actualQuantity;
  };

  const extractFabricTypeFromDescription = (description: string): string => {
    if (!description) return '';
    
    const desc = description.toLowerCase();
    
    // Common fabric type patterns in descriptions
    const fabricPatterns = [
      /fabric\s*:\s*([a-z0-9\s]+)/i,
      /fabric\s+type\s*:\s*([a-z0-9\s]+)/i,
     
    ];
    
    // First try pattern matching
    for (const pattern of fabricPatterns) {
      const match = desc.match(pattern);
      if (match && match[1]) {
        const fabricCandidate = match[1].trim();
        return fabricCandidate;
      }
    }
    
    return '';
  };

  return {
    parseDescriptionValues,
    parseActualQuantity,
    extractFabricTypeFromDescription
  };
};