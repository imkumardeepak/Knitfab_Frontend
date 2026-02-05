import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Settings,
  TrendingUp,
  Package,
  Truck,
  ArrowUpRight,
  BarChart3,
  LineChart as LineChartIcon,
  Layers,
  Calendar as CalendarIcon,
  RefreshCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-picker';
import type { DateRange } from 'react-day-picker';
import { addDays, format, isAfter, isBefore, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard = () => {
  const { user } = useAuth();

  // State for date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  // State for data
  const [data, setData] = useState({
    machines: [] as any[],
    rollConfirmations: [] as any[],
    productionAllotments: [] as any[],
    dispatchPlannings: [] as any[],
    isLoading: true,
  });

  // Fetch data
  const fetchData = async () => {
    setData(prev => ({ ...prev, isLoading: true }));
    try {
      const [
        machinesRes,
        rollConfRes,
        allotmentsRes,
        dispatchRes
      ] = await Promise.all([
        api.machine.getAllMachines(),
        api.rollConfirmation.getAllRollConfirmations(),
        api.productionAllotment.getAllProductionAllotments(),
        api.dispatchPlanning.getAllDispatchPlannings(),
      ]);

      setData({
        machines: machinesRes.data,
        rollConfirmations: rollConfRes.data,
        productionAllotments: allotmentsRes.data,
        dispatchPlannings: dispatchRes.data,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter and calculate metrics
  const metrics = useMemo(() => {
    if (data.isLoading) return null;

    const fromDate = dateRange?.from || startOfMonth(new Date());
    const toDate = dateRange?.to || new Date();

    // Filter roll confirmations (Production)
    const filteredRolls = data.rollConfirmations.filter(roll => {
      const createdDate = parseISO(roll.createdDate);
      return (isAfter(createdDate, fromDate) || isSameDay(createdDate, fromDate)) &&
        (isBefore(createdDate, addDays(toDate, 1)));
    });

    // Filter dispatch planning/dispatched rolls (Dispatch)
    // Note: In a real app, we'd fetch dispatched rolls specifically, 
    // but here we can sum net weight from dispatch planning if they have a date
    const filteredDispatch = data.dispatchPlannings.filter(plan => {
      if (!plan.createdAt) return false;
      const createdDate = parseISO(plan.createdAt);
      return (isAfter(createdDate, fromDate) || isSameDay(createdDate, fromDate)) &&
        (isBefore(createdDate, addDays(toDate, 1)));
    });

    // Calculations
    const totalProductionKg = filteredRolls.reduce((sum, roll) => sum + (roll.netWeight || 0), 0);
    const totalDispatchKg = filteredDispatch.reduce((sum, plan) => sum + (plan.totalNetWeight || 0), 0);

    // Machine-wise production
    const machineProductionMap: Record<string, number> = {};
    filteredRolls.forEach(roll => {
      machineProductionMap[roll.machineName] = (machineProductionMap[roll.machineName] || 0) + (roll.netWeight || 0);
    });
    const machineProductionData = Object.entries(machineProductionMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Daily trend data
    const days = eachDayOfInterval({ start: fromDate, end: toDate });
    const trendData = days.map(day => {
      const dayStr = format(day, 'MMM dd');
      const prodSum = filteredRolls
        .filter(roll => isSameDay(parseISO(roll.createdDate), day))
        .reduce((sum, roll) => sum + (roll.netWeight || 0), 0);
      const dispSum = filteredDispatch
        .filter(plan => isSameDay(parseISO(plan.createdAt), day))
        .reduce((sum, plan) => sum + (plan.totalNetWeight || 0), 0);

      return {
        date: dayStr,
        production: parseFloat(prodSum.toFixed(2)),
        dispatch: parseFloat(dispSum.toFixed(2)),
      };
    });

    // Lot-wise production (Top 5)
    const lotProductionMap: Record<string, number> = {};
    filteredRolls.forEach(roll => {
      lotProductionMap[roll.allotId] = (lotProductionMap[roll.allotId] || 0) + (roll.netWeight || 0);
    });
    const lotProductionTable = Object.entries(lotProductionMap)
      .map(([lotNo, weight]) => {
        const allotment = data.productionAllotments.find(a => a.allotmentId === lotNo);
        return {
          lotNo,
          weight: weight.toFixed(2),
          customer: allotment?.partyName || 'Unknown',
          fabric: allotment?.fabricType || 'N/A',
          status: allotment?.productionStatus === 2 ? 'Suspended' : allotment?.productionStatus === 1 ? 'Hold' : 'Active'
        };
      })
      .sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight));

    // Fabric type (Process-wise) distribution
    const fabricMap: Record<string, number> = {};
    filteredRolls.forEach(roll => {
      const allotment = data.productionAllotments.find(a => a.allotmentId === roll.allotId);
      const fabric = allotment?.fabricType || 'Other';
      fabricMap[fabric] = (fabricMap[fabric] || 0) + (roll.netWeight || 0);
    });
    const fabricDistributionData = Object.entries(fabricMap).map(([name, value]) => ({ name, value }));

    const activeMachinesCount = data.machines.filter(m => m.isActive).length;
    const avgProductionPerDay = days.length > 0 ? (totalProductionKg / days.length) : 0;

    return {
      totalProductionKg,
      totalDispatchKg,
      machineProductionData,
      trendData,
      lotProductionTable,
      activeMachinesCount,
      avgProductionPerDay,
      fabricDistributionData,
      daysCount: days.length
    };
  }, [data, dateRange]);

  if (data.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Production Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of knitting production and dispatch performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            className="w-[300px]"
          />
          <Button variant="outline" size="icon" onClick={fetchData} title="Refresh Data">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Production</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalProductionKg.toFixed(2)} KG</div>
            <p className="text-xs text-muted-foreground mt-1">
              Weight from Roll Confirmation
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dispatched</CardTitle>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Truck className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalDispatchKg.toFixed(2)} KG</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready for transport
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Prod / Day</CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgProductionPerDay.toFixed(2)} KG</div>
            <p className="text-xs text-muted-foreground mt-1">
              Over last {metrics?.daysCount} days
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Machines</CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Settings className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeMachinesCount} / {data.machines.length}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Operational status
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production & Dispatch Trends */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-blue-600" />
            Production vs Dispatch Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.trendData}>
                <defs>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDisp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="production"
                  name="Production (KG)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProd)"
                />
                <Area
                  type="monotone"
                  dataKey="dispatch"
                  name="Dispatch (KG)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDisp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine-wise Production */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Machine-wise Production (KG)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.machineProductionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Kgs Produced" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fabric Type Distribution */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              Production by Fabric Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.fabricDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {metrics?.fabricDistributionData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lot-wise Production Breakdown */}
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-600" />
            Top Production Lots
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600">View All Lots</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Fabric Type</TableHead>
                <TableHead className="text-right">Output (KG)</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics?.lotProductionTable.slice(0, 5).map((lot) => (
                <TableRow key={lot.lotNo}>
                  <TableCell className="font-medium">{lot.lotNo}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{lot.customer}</TableCell>
                  <TableCell>{lot.fabric}</TableCell>
                  <TableCell className="text-right font-bold">{lot.weight}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={lot.status === 'Active' ? 'default' : 'secondary'}>
                      {lot.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {metrics?.lotProductionTable.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No production data found for selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

