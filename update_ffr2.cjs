
const fs = require("fs");
const path = "src/pages/Reports/FinalFabricReport.tsx";
let content = fs.readFileSync(path, "utf-8");

const oldFilteredData = `  const filteredData = useMemo(() => {
    const { searchTerm, startDate, endDate, groupBy, status } = filters;
    const hasActiveFilters = searchTerm || startDate || endDate;

    if (!hasActiveFilters) return groupedData;

    const filtered = groupedData.filter(r => {
      const search = searchTerm.toLowerCase();

      const matchSearch = !searchTerm || (
        r.itemName.toLowerCase().includes(search) ||
        r.yarnCount.toLowerCase().includes(search) ||
        r.diaGg.toLowerCase().includes(search) ||
        r.lotId.toLowerCase().includes(search) ||
        r.voucherNumber.toLowerCase().includes(search) ||
        r.buyerName.toLowerCase().includes(search)
      );

      const matchMachine = !filters.machine || r.machineName === filters.machine;
      const matchDiaGg = !filters.diaGg || r.diaGg === filters.diaGg;

      let matchDate = true;
      if (startDate || endDate) {
        const rowDate = parseISO(r.date);
        if (startDate && endDate) {
          matchDate = isWithinInterval(rowDate, {
            start: startOfDay(startDate),
            end: endOfDay(endDate)
          });
        } else if (startDate) {
          matchDate = rowDate >= startOfDay(startDate);
        } else if (endDate) {
          matchDate = rowDate <= endOfDay(endDate);
        }
      }

      return matchSearch && matchDate && matchMachine && matchDiaGg;
    });`;

const newFilteredData = `  const filteredData = useMemo(() => {
    const { searchTerm, startDate, endDate, groupBy, status } = filters;
    // We always filter since status is applied
    const filtered = groupedData.filter(r => {
      // 1. Status Filter
      if (status !== "all") {
        if (status === "active" && r.orderStatus === "completed") return false;
        if (status !== "active" && r.orderStatus !== status) return false;
      }

      const search = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || (
        r.itemName.toLowerCase().includes(search) ||
        r.yarnCount.toLowerCase().includes(search) ||
        r.diaGg.toLowerCase().includes(search) ||
        r.lotId.toLowerCase().includes(search) ||
        r.voucherNumber.toLowerCase().includes(search) ||
        r.buyerName.toLowerCase().includes(search)
      );

      const matchMachine = !filters.machine || r.machineName === filters.machine;
      const matchDiaGg = !filters.diaGg || r.diaGg === filters.diaGg;

      // Date Filtering: Only apply if groupBy is date or none
      let matchDate = true;
      if ((groupBy === "date" || groupBy === "none") && (startDate || endDate)) {
        const rowDate = parseISO(r.date);
        if (startDate && endDate) {
          matchDate = isWithinInterval(rowDate, {
            start: startOfDay(startDate),
            end: endOfDay(endDate)
          });
        } else if (startDate) {
          matchDate = rowDate >= startOfDay(startDate);
        } else if (endDate) {
          matchDate = rowDate <= endOfDay(endDate);
        }
      }

      return matchSearch && matchDate && matchMachine && matchDiaGg;
    });`;

content = content.replace(oldFilteredData, newFilteredData);

// Also add Customer Wise Group By logic
const oldGroupByConfig = `      if (groupBy === 'diaGg') key = \`Dia-GG: \${r.diaGg}\`;
      else if (groupBy === 'machine') key = \`Machine: \${r.machineName || 'Unknown'}\`;
      else if (groupBy === 'date') {`;
const newGroupByConfig = `      if (groupBy === 'diaGg') key = \`Dia-GG: \${r.diaGg}\`;
      else if (groupBy === 'machine') key = \`Machine: \${r.machineName || 'Unknown'}\`;
      else if (groupBy === 'customer') key = \`Customer: \${r.buyerName || 'Unknown'}\`;
      else if (groupBy === 'date') {`;
content = content.replace(oldGroupByConfig, newGroupByConfig);

// Combine Net weight for Customer Wise (similar to machine and diag)
const oldGroupCombine = `      if (groupBy === 'diaGg' || groupBy === 'machine') {
        const existingRowIndex = groups[key].rows.findIndex(row => row.lotId === r.lotId);`;
const newGroupCombine = `      if (groupBy === 'diaGg' || groupBy === 'machine' || groupBy === 'customer') {
        const existingRowIndex = groups[key].rows.findIndex(row => row.lotId === r.lotId);`;
content = content.replace(oldGroupCombine, newGroupCombine);

// Add Status filter UI Tabs and Group By Option
const filterSectionStart = `      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">`;
const newFilterSectionStart = `      {/* Status Tabs */}
      <div className="flex space-x-2 bg-gray-100/60 p-1 rounded-lg border w-max">
        <Button size="sm" variant={filters.status === "all" ? "default" : "ghost"} onClick={() => setFilters(f => ({ ...f, status: "all" }))} className="text-xs font-semibold px-3 py-1.5 h-8">All Orders</Button>
        <Button size="sm" variant={filters.status === "active" ? "default" : "ghost"} onClick={() => setFilters(f => ({ ...f, status: "active" }))} className="text-xs font-semibold px-3 py-1.5 h-8 text-blue-700 hover:bg-blue-50">Active</Button>
        <Button size="sm" variant={filters.status === "pending" ? "default" : "ghost"} onClick={() => setFilters(f => ({ ...f, status: "pending" }))} className="text-xs font-semibold px-3 py-1.5 h-8 text-amber-700 hover:bg-amber-50">Pending</Button>
        <Button size="sm" variant={filters.status === "running" ? "default" : "ghost"} onClick={() => setFilters(f => ({ ...f, status: "running" }))} className="text-xs font-semibold px-3 py-1.5 h-8 text-indigo-700 hover:bg-indigo-50">Running</Button>
        <Button size="sm" variant={filters.status === "hold" ? "default" : "ghost"} onClick={() => setFilters(f => ({ ...f, status: "hold" }))} className="text-xs font-semibold px-3 py-1.5 h-8 text-rose-700 hover:bg-rose-50">Hold</Button>
        <Button size="sm" variant={filters.status === "completed" ? "default" : "ghost"} onClick={() => setFilters(f => ({ ...f, status: "completed" }))} className="text-xs font-semibold px-3 py-1.5 h-8 text-emerald-700 hover:bg-emerald-50">Completed</Button>
      </div>
      
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">`;
content = content.replace(filterSectionStart, newFilterSectionStart);

// Update dropdown options
content = content.replace(`<option value="date">Date Wise</option>`, `<option value="date">Date Wise</option>\n                <option value="customer">Customer Wise</option>`);

fs.writeFileSync(path, content, "utf-8");
console.log("Update FFR2 done");
