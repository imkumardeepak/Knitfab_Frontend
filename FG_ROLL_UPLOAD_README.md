# FG Roll Excel Upload Implementation

## Overview
This implementation provides functionality to upload and process Excel files containing FG (Finished Goods) roll data. The system groups rolls by voucher and allows for preview, editing, and exporting of the data.

## Components

### Frontend (React/TypeScript)
- **File**: `src/pages/ExcelUpload/index.tsx`
- **Features**:
  - Excel file upload with validation
  - Preview of uploaded data in tabular format
  - Editable preview mode
  - Grouped view of voucher data
  - Export to Excel functionality
  - Upload to backend API using dedicated API client

### Backend (C# ASP.NET Core)
- **File**: `Controllers/FgRollsController.cs`
- **Features**:
  - Excel file parsing using EPPlus library
  - Data grouping by voucher
  - RESTful API endpoint for file upload
  - Error handling and validation
  - File size and type validation

## Data Structure

### Expected Excel Format
The system expects Excel files with the following columns:
1. Voucher No.
2. Item Name
3. Lot No.
4. Machine No
5. FG Roll

### Grouping Logic
- Rows with the same Voucher No. are grouped together
- Empty Voucher No. cells are associated with the previous voucher
- Each group contains:
  - Voucher information (Voucher No., Item Name, Lot No.)
  - List of rolls (Machine No., FG Roll)

## API Endpoints

### Upload FG Rolls
- **URL**: `/api/fg-rolls/upload`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Parameters**: 
  - `file`: Excel file containing FG roll data
- **Response**:
  ```json
  {
    "success": true,
    "message": "File parsed successfully",
    "totalRolls": 9,
    "data": [...] // Array of VoucherGroupDto objects
  }
  ```

## API Client
A dedicated API client has been created in `src/lib/api-client.ts` for handling FG Rolls operations:

```typescript
export const fgRollsApi = {
  // POST /api/fg-rolls/upload - Upload FG rolls Excel file
  uploadFgRolls: (formData: FormData): Promise<AxiosResponse<UploadFgRollsResponseDto>> =>
    apiClient.post('/fg-rolls/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};
```

The corresponding TypeScript interfaces are defined in `src/types/api-types.ts`:

```typescript
export interface FgRollDto {
  machineNo: string;
  rollNumber: string;
}

export interface VoucherGroupDto {
  voucherNo: string;
  itemName: string;
  lotNo: string;
  rolls: FgRollDto[];
}

export interface UploadFgRollsResponseDto {
  success: boolean;
  message: string;
  totalRolls: number;
  data: VoucherGroupDto[];
}
```

## Models

### VoucherGroup
```csharp
public class VoucherGroup
{
    public string VoucherNo { get; set; }
    public string ItemName { get; set; }
    public string LotNo { get; set; }
    public List<FgRoll> Rolls { get; set; }
}
```

### FgRoll
```csharp
public class FgRoll
{
    public string MachineNo { get; set; }
    public string RollNumber { get; set; }
}
```

## Error Handling

### Frontend
- Proper error handling with user-friendly messages
- Validation of file type and size before upload
- Detailed error messages from backend API

### Backend
- File type validation (only .xlsx and .xls files)
- File size validation (10MB limit)
- Empty file detection
- Excel file structure validation
- Worksheet validation
- Data row validation
- Detailed error messages with exception logging

## Sample Data
See `test-fg-rolls.csv` for an example of the expected data format.

## Dependencies
- **Frontend**: Uses SheetJS (xlsx) library loaded from CDN and Axios for API calls
- **Backend**: Uses EPPlus library for Excel processing

## Usage Instructions

1. Navigate to the Excel Upload page
2. Upload an Excel file with FG roll data
3. Review the preview and grouped data
4. Edit data if needed
5. Click "Upload to Server" to process the data
6. Use "Export Grouped Excel" to download processed data

## Troubleshooting

### Common Issues
1. **500 Server Error**: Check backend logs for detailed exception information
2. **File too large**: Ensure file is under 10MB
3. **Invalid file type**: Only .xlsx and .xls files are supported
4. **Empty file**: Ensure Excel file contains data
5. **No worksheets**: Ensure Excel file has at least one worksheet

### Debugging Steps
1. Check browser console for detailed error messages
2. Check backend logs for exception details
3. Verify Excel file format matches expected structure
4. Test with the provided sample file