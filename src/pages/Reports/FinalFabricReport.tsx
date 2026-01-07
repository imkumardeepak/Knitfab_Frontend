import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FinalFabricReportService } from '../../services/reports/finalFabricReportService';
import type { FinalFabricReportDto } from '../../types/api-types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DownloadIcon, SearchIcon, EyeIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/* ---------------- TYPES ---------------- */

type ReportRow = {
  date: string;
  voucherNumber: string;
  buyerName: string;
  itemName: string;
  yarnCount: string;
  diaGg: string;
  qty: number;
  lotId: string;
  yarnPartyName: string;
  yarnLotNo: string;
  machines: {
    machineName: string;
    rollNo: string;
    fgRollNo?: number;
    netWeight: number;
  }[];
  totalNetWeight: number;
};

/* ---------------- COMPONENT ---------------- */

const FinalFabricReport: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedMachines, setSelectedMachines] = useState<{
    machineName: string;
    rollNo: string;
    fgRollNo?: number;
    netWeight: number;
  }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['final-fabric-report'],
    queryFn: FinalFabricReportService.getAllFinalFabricReports,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  /* ---------------- GROUP DATA (IMPORTANT) ---------------- */

  const groupedData: ReportRow[] = useMemo(() => {
    if (!data) return [];

    return data.flatMap((report: FinalFabricReportDto) =>
      report.salesOrderItems.flatMap(item =>
        item.productionAllotments.map(pa => {
          const machines = pa.rollConfirmations.map(rc => ({
            machineName: rc.machineName,
            rollNo: rc.rollNo,
            fgRollNo: rc.fgRollNo,
            netWeight: rc.netWeight,
          }));

          return {
            date: report.orderDate,
            voucherNumber: report.voucherNumber,
            buyerName: report.buyerName,
            itemName: item.itemName,
            yarnCount: item.yarnCount,
            diaGg: `${item.dia} × ${item.gg}`,
            qty: item.qty,
            lotId: pa.allotmentId,
            yarnPartyName: pa.yarnPartyName,
            yarnLotNo: pa.yarnLotNo,
            machines,
            totalNetWeight: machines.reduce((s, m) => s + m.netWeight, 0),

          };
        })
      )
    );
  }, [data]);

  /* ---------------- FILTER ---------------- */

  const filteredData = groupedData.filter(r =>
    r.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.buyerName.toLowerCase().includes(search.toLowerCase()) ||
    r.itemName.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------------- TOTAL ---------------- */

  const grandTotal = filteredData.reduce(
    (sum, r) => sum + r.totalNetWeight,
    0
  );

  const openMachinesModal = (machines: {
    machineName: string;
    rollNo: string;
    fgRollNo?: number;
    netWeight: number;
  }[]) => {
    setSelectedMachines(machines);
    setIsModalOpen(true);
  };

  /* ---------------- EXPORT CSV ---------------- */

  const exportCSV = () => {
    if (!filteredData.length) return;

    const headers = [
      'Date',
      'Voucher No',
      'Buyer Name',
      'Item Name',
      'Yarn Count',
      'Dia × GG',
      'Qty',
      'Lot ID',
      'Yarn Party',
      'Yarn Lot',
      'Machines',
      'Total Net Wt',
    ];

    let csv = headers.join(',') + '\n';

    filteredData.forEach(r => {
      csv += [
        new Date(r.date).toLocaleDateString(),
        r.voucherNumber,
        r.buyerName,
        r.itemName,
        r.yarnCount,
        r.diaGg,
        r.qty,
        r.lotId,
        r.yarnPartyName,
        r.yarnLotNo,
        r.machines.map(m => `${m.machineName}:${m.netWeight}`).join(' | '),
        r.totalNetWeight.toFixed(2),
      ].join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'FinalFabricReport.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------- ERROR ---------------- */

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load report
          <Button variant="outline" className="ml-4" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Final Fabric Report</h1>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Voucher / Buyer / Item"
            className="pl-9 pr-3 py-2 w-full border rounded-md"
          />
        </div>
        <Button onClick={exportCSV}>
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Yarn Count</TableHead>
                  <TableHead>Dia × GG</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Lot ID</TableHead>
                  <TableHead>Yarn Party</TableHead>
                  <TableHead>Yarn Lot</TableHead>
                  <TableHead>Machines Details</TableHead>
                  <TableHead>Total Ready Net Wt</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredData.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{r.voucherNumber}</TableCell>
                    <TableCell>{r.buyerName}</TableCell>
                    <TableCell>{r.itemName}</TableCell>
                    <TableCell>{r.yarnCount}</TableCell>
                    <TableCell>{r.diaGg}</TableCell>
                    <TableCell>{r.qty}</TableCell>
                    <TableCell>{r.lotId}</TableCell>
                    <TableCell>{r.yarnPartyName}</TableCell>
                    <TableCell>{r.yarnLotNo}</TableCell>

                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openMachinesModal(r.machines)}
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View ({r.machines.length})
                      </Button>
                    </TableCell>

                    <TableCell className="font-bold text-right">
                      {r.totalNetWeight.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* GRAND TOTAL */}
          <div className="mt-4 text-right text-lg font-bold">
            Total Dispatch Net Wt : {grandTotal.toFixed(2)} kg
          </div>
        </>
      )}

      {/* Machines Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Machines Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 font-semibold border-b pb-2">
              <div>Machine</div>
              <div>Roll No</div>
              <div>FG Roll No</div>
              <div>Net Weight</div>
            </div>
            {selectedMachines.map((machine, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-4 border-b pb-2">
                <div>{machine.machineName}</div>
                <div>{machine.rollNo}</div>
                <div>{machine.fgRollNo || '-'}</div>
                <div>{machine.netWeight}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinalFabricReport;
