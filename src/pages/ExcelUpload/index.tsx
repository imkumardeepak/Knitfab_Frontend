'use client';

import { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Edit3,
  Eye,
  Download,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import type { VoucherGroupDto, UploadFgRollsResponseDto } from '@/types/api-types';

export default function FgRollExcelUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [headers] = useState([
    'Voucher No.',
    'Item Name',
    'Lot No.',
    'Tape',
    'Location',
    'Machine No',
    'FG Roll',
    'Gross Wt',
    'Net Wt',
    'Is Dispatched',
  ]);
  const [groupedData, setGroupedData] = useState<VoucherGroupDto[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<string[][]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadFgRollsResponseDto | null>(null);

  // Load XLSX library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Helper: Normalize header text (case-insensitive, ignore dots/spaces)
  const normalize = (str: string) =>
    str
      .toString()
      .toLowerCase()
      .replace(/[.\s,_-]+/g, ' ')
      .trim()
      .replace(/^gross\s*wt$/, 'gross wt')
      .replace(/^net\s*wt$/, 'net wt')
      .replace(/^is\s*dispatched$/, 'is dispatched')
      .replace('grosswt', 'gross wt')
      .replace('netwt', 'net wt')
      .replace('isdispatched', 'is dispatched');

  const requiredHeadersMap: Record<string, string> = {
    'voucher no': 'voucher no',
    'item name': 'item name',
    'lot no': 'lot no',
    tape: 'tape',
    location: 'location',
    'machine no': 'machine no',
    'fg roll': 'fg roll',
    'gross wt': 'gross wt',
    'net wt': 'net wt',
    'is dispatched': 'is dispatched',
  };

  const parseExcel = async (file: File) => {
    if (!window.XLSX) {
      toast.error('Excel library not loaded yet — please wait or refresh');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = window.XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      }) as unknown[][];

      if (!rawData || rawData.length === 0) {
        toast.error('Excel file is empty');
        return;
      }

      const rawHeaders = rawData[0].map((h) => String(h).trim());
      const normalizedHeaders = rawHeaders.map(normalize);

      // Check for required columns
      const missing = Object.keys(requiredHeadersMap).filter(
        (req: string) => !normalizedHeaders.some((h: string) => h === req)
      );

      if (missing.length > 0) {
        toast.error(
          `Missing required columns: ${missing.join(', ')}\nFound headers: ${rawHeaders.join(', ')}`
        );
        return;
      }

      // Map required column names to actual column index
      const colIndex = (key: string) => {
        const normalizedKey = normalize(key);
        return normalizedHeaders.findIndex((h: string) => h === normalizedKey);
      };

      const rows = rawData
        .slice(1)
        .map((row: unknown[]) => [
          String(row[colIndex('voucher no')] || '').trim(),
          String(row[colIndex('item name')] || '').trim(),
          String(row[colIndex('lot no')] || '').trim(),
          String(row[colIndex('tape')] || '').trim(),
          String(row[colIndex('location')] || '').trim(),
          String(row[colIndex('machine no')] || '').trim(),
          String(row[colIndex('fg roll')] || '').trim(),
          String(row[colIndex('gross wt')] || '').trim(),
          String(row[colIndex('net wt')] || '').trim(),
          String(row[colIndex('is dispatched')] || '').trim(),
        ]) as string[][];

      // Remove completely empty rows
      const cleaned = rows.filter((r: string[]) => r.some((cell: string) => cell !== ''));

      if (cleaned.length === 0) {
        toast.error('No valid data found in the Excel file');
        return;
      }

      setPreviewData(cleaned);
      setEditingData(cleaned.map((r: string[]) => [...r]));
      groupData(cleaned);

      toast.success(`Excel loaded successfully! Found ${cleaned.length} rows`);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to read Excel file. Please ensure it is a valid .xlsx file.');
    }
  };

  const groupData = (rows: string[][]) => {
    const groups: VoucherGroupDto[] = [];
    let current: VoucherGroupDto | null = null;

    rows.forEach((row) => {
      const [voucher, item, lot, tape, location, machine, roll, grossWt, netWt, isDispatched] = row;

      if (voucher) {
        if (current) groups.push(current);
        current = {
          voucherNo: voucher,
          itemName: item,
          lotNo: lot,
          tape: tape,
          location: location,
          rolls: [],
        };
      }

      if (current && machine && roll) {
        current.rolls.push({
          machineNo: machine,
          rollNumber: roll,
          grossWt: grossWt || undefined,
          netWt: netWt || undefined,
          isDispatched:
            isDispatched === 'true' || isDispatched === '1'
              ? true
              : isDispatched === 'false' || isDispatched === '0'
                ? false
                : undefined,
        });
      }
    });

    if (current) groups.push(current);
    setGroupedData(groups);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      toast.error('Please upload only Excel files (.xlsx or .xls)');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }

    setFile(f);
    setPreviewData([]);
    setGroupedData([]);
    setUploadResult(null);
    parseExcel(f);
  };

  const handleCellEdit = (row: number, col: number, value: string) => {
    const newData = [...editingData];
    newData[row][col] = value;
    setEditingData(newData);
    groupData(newData);
  };

  const handleUploadToBackend = async () => {
    if (!file || groupedData.length === 0) return;

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.fgRolls.uploadFgRolls(groupedData);
      const result = response?.data ?? response;

      setUploadResult(result);

      if (result.success) {
        toast.success(
          `Uploaded ${result.totalRolls || groupedData.reduce((sum, g) => sum + g.rolls.length, 0)} rolls successfully!`
        );
      } else {
        toast.error(result.message || 'Upload failed');
      }
    } catch (err: unknown) {
      const error = err as
        | { response?: { data?: { message?: string } }; message?: string }
        | undefined;
      toast.error(error?.response?.data?.message || error?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const exportGroupedData = () => {
    if (!window.XLSX) {
      toast.error('Excel library not loaded');
      return;
    }

    const data = [
      [
        'Voucher No.',
        'Item Name',
        'Lot No.',
        'Tape',
        'Location',
        'Machine No',
        'FG Roll',
        'Gross Wt',
        'Net Wt',
        'Is Dispatched',
      ],
      ...groupedData.flatMap((g) =>
        g.rolls.map((r, i) =>
          i === 0
            ? [
                g.voucherNo,
                g.itemName,
                g.lotNo,
                g.tape,
                g.location,
                r.machineNo,
                r.rollNumber,
                r.grossWt || '',
                r.netWt || '',
                r.isDispatched !== undefined ? r.isDispatched.toString() : '',
              ]
            : [
                '',
                '',
                '',
                '',
                '',
                r.machineNo,
                r.rollNumber,
                r.grossWt || '',
                r.netWt || '',
                r.isDispatched !== undefined ? r.isDispatched.toString() : '',
              ]
        )
      ),
    ];

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet(data);
    window.XLSX.utils.book_append_sheet(wb, ws, 'FG Rolls');
    window.XLSX.writeFile(wb, 'FG_Rolls_Grouped.xlsx');

    toast.success('Grouped Excel exported successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">FG Roll Entry - Excel Upload</h1>
          <p className="text-gray-600 mt-2">
            Upload voucher-wise FG rolls with machine & roll number
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-4 border-dashed border-gray-300 rounded-xl p-14 text-center cursor-pointer hover:border-blue-500 transition"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-3" />
              <p className="text-lg font-medium">Drop or click to upload Excel</p>
              <p className="text-sm text-gray-600 mt-2">
                Required columns:{' '}
                <strong>
                  Voucher No., Item Name, Lot No., Tape, Location, Machine No, FG Roll, Gross Wt,
                  Net Wt, Is Dispatched
                </strong>
              </p>
              {file && (
                <p className="text-sm text-green-600 mt-3 font-medium">Selected: {file.name}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Table */}
        {previewData.length > 0 && (
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Excel Preview & Edit</CardTitle>
              <Button onClick={() => setIsEditing(!isEditing)} variant="outline">
                {isEditing ? <Eye className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
                {isEditing ? 'View Mode' : 'Edit Mode'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isEditing ? editingData : previewData).map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {row.map((cell, colIdx) => (
                          <TableCell key={colIdx}>
                            {isEditing ? (
                              <Input
                                value={cell}
                                onChange={(e) => handleCellEdit(rowIdx, colIdx, e.target.value)}
                                className="h-8"
                              />
                            ) : (
                              <span>{cell || '-'}</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grouped Display */}
        {groupedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Grouped Voucher Data (Ready to Save)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedData.map((g, i) => (
                <div key={i} className="border rounded-lg p-5 bg-white shadow-sm">
                  <div className="grid grid-cols-3 gap-3 font-medium mb-3 text-sm">
                    <p>
                      <span className="text-gray-600">Voucher:</span> {g.voucherNo}
                    </p>
                    <p>
                      <span className="text-gray-600">Item:</span> {g.itemName}
                    </p>
                    <p>
                      <span className="text-gray-600">Lot:</span> {g.lotNo}
                    </p>
                    {g.tape && (
                      <p>
                        <span className="text-gray-600">Tape:</span> {g.tape}
                      </p>
                    )}
                    {g.location && (
                      <p>
                        <span className="text-gray-600">Location:</span> {g.location}
                      </p>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine No</TableHead>
                        <TableHead>FG Roll</TableHead>
                        <TableHead>Gross Wt</TableHead>
                        <TableHead>Net Wt</TableHead>
                        <TableHead>Dispatched</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.rolls.map((r, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{r.machineNo}</TableCell>
                          <TableCell>{r.rollNumber}</TableCell>
                          <TableCell>{r.grossWt || '-'}</TableCell>
                          <TableCell>{r.netWt || '-'}</TableCell>
                          <TableCell>
                            {r.isDispatched !== undefined ? (r.isDispatched ? 'Yes' : 'No') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            onClick={exportGroupedData}
            variant="secondary"
            disabled={groupedData.length === 0}
          >
            <Download className="w-5 h-5 mr-2" />
            Export Grouped Excel
          </Button>

          <Button
            onClick={handleUploadToBackend}
            disabled={isUploading || groupedData.length === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" /> Upload to Server
              </>
            )}
          </Button>
        </div>

        {/* Result Alert */}
        {uploadResult && (
          <Alert variant={uploadResult.success ? 'default' : 'destructive'}>
            {uploadResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <AlertDescription>{uploadResult.message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
