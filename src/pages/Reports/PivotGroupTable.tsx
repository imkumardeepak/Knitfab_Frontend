import React, { useMemo } from 'react';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { DownloadIcon, PrinterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type PivotRow = {
  groupKey: string;
  status: string; // 'r' for running, 'h' for hold
  customerName: string;
  count: string;
  lotNo: string;
  runningMachines: number;
  perDayProdn: number;
  orderQty: number;
  updateQty: number;
  balanceQty: number;
  balanceDay: number;
  itemId: number;
};

interface PivotGroupTableProps {
  data: PivotRow[];
  reportName?: string;
}

export const PivotGroupTable: React.FC<PivotGroupTableProps> = ({ data, reportName = 'Fabric_Plan_Report' }) => {
  type SpannedRow = PivotRow & {
    spans: {
      groupKey: number;
      status: number;
      customerName: number;
      count: number;
    };
  };

  const spannedData = useMemo(() => {
    // 1. Aggregate data to ensure unique leaves
    const map = new Map<string, PivotRow>();
    data.forEach(r => {
      const key = `${r.groupKey}|${r.status}|${r.customerName}|${r.itemId}|${r.lotNo}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.runningMachines += r.runningMachines;
        existing.perDayProdn += r.perDayProdn;
        existing.orderQty += r.orderQty;
        existing.updateQty += r.updateQty;
        existing.balanceQty += r.balanceQty;
        existing.balanceDay = existing.perDayProdn > 0 ? existing.balanceQty / existing.perDayProdn : 0;
      } else {
        map.set(key, { ...r });
      }
    });
    
    const sorted = Array.from(map.values()).sort((a, b) => {
      if (a.groupKey !== b.groupKey) return a.groupKey.localeCompare(b.groupKey);
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      if (a.customerName !== b.customerName) return a.customerName.localeCompare(b.customerName);
      if (a.itemId !== b.itemId) return a.itemId - b.itemId;
      if (a.count !== b.count) return a.count.localeCompare(b.count);
      return a.lotNo.localeCompare(b.lotNo);
    });

    // 3. Initialize spans
    const result: SpannedRow[] = sorted.map(r => ({
      ...r,
      spans: { groupKey: 1, status: 1, customerName: 1, count: 1 }
    }));

    // 4. Calculate spans helper
    const calcSpan = (keyFn: (r: PivotRow) => string, spanKey: keyof SpannedRow['spans']) => {
      for (let i = 0; i < result.length; ) {
        let span = 1;
        const val = keyFn(result[i]);
        for (let j = i + 1; j < result.length; j++) {
          if (keyFn(result[j]) === val) {
            span++;
            result[j].spans[spanKey] = 0;
          } else {
            break;
          }
        }
        result[i].spans[spanKey] = span;
        i += span;
      }
    };

    calcSpan(r => r.groupKey, 'groupKey');
    calcSpan(r => `${r.groupKey}-${r.status}`, 'status');
    calcSpan(r => `${r.groupKey}-${r.status}-${r.customerName}`, 'customerName');
    calcSpan(r => `${r.groupKey}-${r.status}-${r.customerName}-${r.itemId}`, 'count');

    return result;
  }, [data]);

  // Calculate Grand Totals
  const grandTotals = useMemo(() => {
    return spannedData.reduce(
      (acc, row) => {
        const isFirstInItem = row.spans.count > 0;
        return {
          runningMachines: acc.runningMachines + row.runningMachines,
          perDayProdn: acc.perDayProdn + row.perDayProdn,
          orderQty: acc.orderQty + (isFirstInItem ? row.orderQty : 0),
          updateQty: acc.updateQty + row.updateQty,
          // balanceQty is ItemQty - total UpdateQty.
          // It's safer to aggregate just updateQty and recalculate total balanceQty at the end if needed,
          // but since balanceQty in the row is for the lot... wait, item.qty is shared, so total balance
          // is totalOrderQty - totalUpdateQty. We will calculate it directly in the JSX.
          balanceQty: 0,
        };
      },
      { runningMachines: 0, perDayProdn: 0, orderQty: 0, updateQty: 0, balanceQty: 0 }
    );
  }, [spannedData]);

  // Calculate Group Totals map (groupKey -> totals)
  const groupTotals = useMemo(() => {
    const totals: Record<string, any> = {};
    spannedData.forEach(row => {
      if (!totals[row.groupKey]) {
        totals[row.groupKey] = { runningMachines: 0, perDayProdn: 0, orderQty: 0, updateQty: 0, balanceQty: 0 };
      }
      const isFirstInItem = row.spans.count > 0;
      totals[row.groupKey].runningMachines += row.runningMachines;
      totals[row.groupKey].perDayProdn += row.perDayProdn;
      totals[row.groupKey].orderQty += (isFirstInItem ? row.orderQty : 0);
      totals[row.groupKey].updateQty += row.updateQty;
    });
    return totals;
  }, [spannedData]);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pivot Report', {
      views: [{ showGridLines: false }]
    });

    worksheet.mergeCells('A1:K2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `AVYAAN KNITFAB UPDATE FABRIC PLAN REPORT - ${format(new Date(), 'dd-MMM-yyyy').toUpperCase()}`;
    titleCell.font = { size: 16, bold: true, name: 'Segoe UI' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DEB1' } };
    
    const headers = [
      "DIA /GG", "STATUS", "CUSTOMERS NAME", "COUNT", "FABRIC LOT NO",
      "Sum of NO RUNNING M/C", "Sum of PER DAY PRODN (KGS.)", "Sum of ORDER QTY (KGS.)",
      "Sum of UPDATE QTY", "Sum of BALANCE QTY", "Sum of BALANCE DAY"
    ];
    const headerRow = worksheet.getRow(3);
    headerRow.values = headers;
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    let currentRow = 4;
    const borderStyle = { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } };

    spannedData.forEach((row, idx) => {
      const isLastInGroup = idx === spannedData.length - 1 || spannedData[idx + 1].groupKey !== row.groupKey;
      
      const r = worksheet.getRow(currentRow);
      r.getCell(1).value = row.groupKey;
      r.getCell(2).value = row.status;
      r.getCell(3).value = row.customerName;
      r.getCell(4).value = row.count;
      r.getCell(5).value = row.lotNo;
      r.getCell(6).value = row.runningMachines;
      r.getCell(7).value = Number(row.perDayProdn.toFixed(1));
      r.getCell(8).value = Number(row.orderQty.toFixed(2));
      r.getCell(9).value = Number(row.updateQty.toFixed(2));
      r.getCell(10).value = Number(row.balanceQty.toFixed(2));
      r.getCell(11).value = Number(row.balanceDay > 0 ? row.balanceDay.toFixed(1) : 0);

      for(let i=1; i<=11; i++) {
        r.getCell(i).border = borderStyle;
        r.getCell(i).alignment = { vertical: 'middle', horizontal: 'center' };
      }

      if (row.spans.groupKey > 1) worksheet.mergeCells(`A${currentRow}:A${currentRow + row.spans.groupKey - 1}`);
      if (row.spans.status > 1) worksheet.mergeCells(`B${currentRow}:B${currentRow + row.spans.status - 1}`);
      if (row.spans.customerName > 1) worksheet.mergeCells(`C${currentRow}:C${currentRow + row.spans.customerName - 1}`);
      if (row.spans.count > 1) {
          worksheet.mergeCells(`D${currentRow}:D${currentRow + row.spans.count - 1}`);
          worksheet.mergeCells(`H${currentRow}:H${currentRow + row.spans.count - 1}`);
      }

      currentRow++;

      if (isLastInGroup) {
        const gTotals = groupTotals[row.groupKey];
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        const subRow = worksheet.getRow(currentRow);
        subRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA3B18A' } };
        
        for(let i=6; i<=11; i++) {
           subRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA3B18A' } };
           subRow.getCell(i).font = { bold: true };
           subRow.getCell(i).border = borderStyle;
        }

        subRow.getCell(6).value = gTotals.runningMachines;
        subRow.getCell(7).value = Number(gTotals.perDayProdn.toFixed(1));
        subRow.getCell(8).value = Number(gTotals.orderQty.toFixed(2));
        subRow.getCell(9).value = Number(gTotals.updateQty.toFixed(2));
        subRow.getCell(10).value = Number((gTotals.orderQty - gTotals.updateQty).toFixed(2));
        subRow.getCell(11).value = Number((gTotals.perDayProdn > 0 ? (gTotals.orderQty - gTotals.updateQty) / gTotals.perDayProdn : 0).toFixed(1));
        
        currentRow++;
      }
    });

    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const gtRow = worksheet.getRow(currentRow);
    gtRow.getCell(1).value = "Grand Total";
    gtRow.getCell(1).font = { bold: true, size: 14 };
    gtRow.getCell(1).alignment = { horizontal: 'center' };
    
    for(let i=1; i<=11; i++) {
        gtRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } };
        gtRow.getCell(i).border = borderStyle;
    }
    gtRow.getCell(6).value = grandTotals.runningMachines;
    gtRow.getCell(7).value = Number(grandTotals.perDayProdn.toFixed(1));
    gtRow.getCell(8).value = Number(grandTotals.orderQty.toFixed(2));
    gtRow.getCell(9).value = Number(grandTotals.updateQty.toFixed(2));
    gtRow.getCell(10).value = Number((grandTotals.orderQty - grandTotals.updateQty).toFixed(2));
    gtRow.getCell(11).value = Number((grandTotals.perDayProdn > 0 ? (grandTotals.orderQty - grandTotals.updateQty) / grandTotals.perDayProdn : 0).toFixed(1));
    for(let i=6; i<=11; i++) gtRow.getCell(i).font = { bold: true, size: 12 };

    worksheet.columns = [
      { width: 15 }, { width: 10 }, { width: 30 }, { width: 15 }, { width: 25 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const safeName = reportName.replace(/\s+/g, '_');
    anchor.download = `${safeName}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const safeName = reportName.replace(/\s+/g, '_');
    document.title = `${safeName}_${format(new Date(), 'yyyy-MMM-dd')}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-[#b59e35] overflow-hidden relative print:shadow-none print:rounded-none print:border-none">
      <div className="bg-[#e8deb1] py-3 px-6 flex justify-between items-center border-b-2 border-[#b59e35]">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex-1 text-center">
          AVYAAN KNITFAB UPDATE FABRIC PLAN REPORT - {format(new Date(), 'dd-MMM-yyyy').toUpperCase()}
        </h2>
        <div className="flex gap-2 print:hidden absolute right-4">
          <Button onClick={exportToExcel} size="sm" className="bg-green-600 hover:bg-green-700 h-8">
            <DownloadIcon className="mr-1.5 h-3.5 w-3.5" />
            Excel
          </Button>
          <Button onClick={handlePrint} size="sm" variant="outline" className="h-8 border-slate-300 text-slate-700 bg-white hover:bg-slate-50">
            <PrinterIcon className="mr-1.5 h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader className="bg-[#fbbf24]">
          <TableRow className="hover:bg-transparent border-b-2 border-[#b59e35]">
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle">
              DIA /GG
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle w-16">
              STATUS
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle">
              CUSTOMERS NAME
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle">
              COUNT
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle">
              FABRIC LOT NO
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle">
              Sum of<br />NO RUNNING M/C
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle">
              Sum of<br />PER DAY PRODN<br />(KGS.)
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle">
              Sum of<br />ORDER QTY (KGS.)
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle">
              Sum of<br />UPDATE QTY
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 border-r-2 border-[#b59e35] text-center align-middle">
              Sum of<br />BALANCE QTY
            </TableHead>
            <TableHead className="font-black uppercase text-[11px] text-slate-900 text-center align-middle">
              Sum of<br />BALANCE DAY
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {spannedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-slate-500 font-bold">
                No data available for the selected view.
              </TableCell>
            </TableRow>
          ) : (
            spannedData.map((row, idx) => {
              const isLastInGroup = idx === spannedData.length - 1 || spannedData[idx + 1].groupKey !== row.groupKey;
              const gTotals = groupTotals[row.groupKey];

              return (
                <React.Fragment key={`${row.groupKey}-${row.status}-${row.customerName}-${row.count}-${row.lotNo}-${idx}`}>
                  <TableRow className="hover:bg-slate-50">
                    {row.spans.groupKey > 0 && (
                      <TableCell rowSpan={row.spans.groupKey} className="font-black text-[12px] text-center align-middle border-r-2 border-b-2 border-[#b59e35] bg-white">
                        {row.groupKey}
                      </TableCell>
                    )}
                    {row.spans.status > 0 && (
                      <TableCell rowSpan={row.spans.status} className="font-bold text-[12px] text-center align-middle border-r-2 border-b-2 border-slate-300 bg-white">
                        {row.status}
                      </TableCell>
                    )}
                    {row.spans.customerName > 0 && (
                      <TableCell rowSpan={row.spans.customerName} className="font-bold text-[11px] border-r-2 border-b border-slate-200 align-middle">
                        {row.customerName}
                      </TableCell>
                    )}
                    {row.spans.count > 0 && (
                      <TableCell rowSpan={row.spans.count} className="font-bold text-[11px] text-center border-r-2 border-b border-slate-200 align-middle">
                        {row.count}
                      </TableCell>
                    )}
                    <TableCell className="font-bold text-[11px] text-center border-r-2 border-b border-slate-200">
                      {row.lotNo}
                    </TableCell>
                    <TableCell className="font-bold text-[12px] text-center border-r-2 border-b border-slate-200">
                      {row.runningMachines}
                    </TableCell>
                    <TableCell className="font-bold text-[12px] text-center border-r-2 border-b border-slate-200">
                      {row.perDayProdn.toFixed(1)}
                    </TableCell>
                    {row.spans.count > 0 && (
                      <TableCell rowSpan={row.spans.count} className="font-bold text-[12px] text-center border-r-2 border-b border-slate-200 align-middle">
                        {row.orderQty.toFixed(2)}
                      </TableCell>
                    )}
                    <TableCell className="font-bold text-[12px] text-center border-r-2 border-b border-slate-200 text-blue-700">
                      {row.updateQty.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-bold text-[12px] text-center border-r-2 border-b border-slate-200">
                      {row.balanceQty.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-bold text-[12px] text-center border-b border-slate-200">
                      {row.balanceDay > 0 ? row.balanceDay.toFixed(1) : '#DIV/0!'}
                    </TableCell>
                  </TableRow>

                  {/* Group Subtotal */}
                  {isLastInGroup && (
                    <TableRow className="bg-[#a3b18a] hover:bg-[#a3b18a] border-b-2 border-t-2 border-[#b59e35]">
                      <TableCell colSpan={5} className="border-r-2 border-[#b59e35]"></TableCell>
                      <TableCell className="font-black text-[12px] text-center border-r-2 border-[#b59e35] text-slate-800">
                        {gTotals.runningMachines}
                      </TableCell>
                      <TableCell className="font-black text-[12px] text-center border-r-2 border-[#b59e35] text-slate-800">
                        {gTotals.perDayProdn.toFixed(1)}
                      </TableCell>
                      <TableCell className="font-black text-[12px] text-center border-r-2 border-[#b59e35] text-slate-800">
                        {gTotals.orderQty.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-black text-[12px] text-center border-r-2 border-[#b59e35] text-slate-800">
                        {gTotals.updateQty.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-black text-[12px] text-center border-r-2 border-[#b59e35] text-slate-800">
                        {(gTotals.orderQty - gTotals.updateQty).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-black text-[12px] text-center text-slate-800">
                        {gTotals.perDayProdn > 0
                          ? ((gTotals.orderQty - gTotals.updateQty) / gTotals.perDayProdn).toFixed(1)
                          : '#DIV/0!'}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}

          {/* Grand Total Row */}
          {spannedData.length > 0 && (
            <TableRow className="bg-[#fbbf24] hover:bg-[#fbbf24] border-t-4 border-[#b59e35]">
              <TableCell colSpan={5} className="font-black text-[14px] text-center border-r-2 border-[#b59e35] text-slate-900 uppercase">
                Grand Total
              </TableCell>
              <TableCell className="font-black text-[13px] text-center border-r-2 border-[#b59e35] text-slate-900">
                {grandTotals.runningMachines}
              </TableCell>
              <TableCell className="font-black text-[13px] text-center border-r-2 border-[#b59e35] text-slate-900">
                {grandTotals.perDayProdn.toFixed(1)}
              </TableCell>
              <TableCell className="font-black text-[13px] text-center border-r-2 border-[#b59e35] text-slate-900">
                {grandTotals.orderQty.toFixed(2)}
              </TableCell>
              <TableCell className="font-black text-[13px] text-center border-r-2 border-[#b59e35] text-slate-900">
                {grandTotals.updateQty.toFixed(2)}
              </TableCell>
              <TableCell className="font-black text-[13px] text-center border-r-2 border-[#b59e35] text-slate-900">
                {(grandTotals.orderQty - grandTotals.updateQty).toFixed(2)}
              </TableCell>
              <TableCell className="font-black text-[13px] text-center text-slate-900">
                {grandTotals.perDayProdn > 0
                  ? ((grandTotals.orderQty - grandTotals.updateQty) / grandTotals.perDayProdn).toFixed(1)
                  : '#DIV/0!'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
