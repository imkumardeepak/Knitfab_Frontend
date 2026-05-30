
const fs = require("fs");
const path = "src/pages/Reports/FinalFabricReport.tsx";
let content = fs.readFileSync(path, "utf-8");

// 1. Update ReportRow type
content = content.replace("machineName?: string;", "machineName?: string;\n  orderStatus: string;");

// 2. Update FilterState type
content = content.replace(
  "groupBy: 'none' | 'diaGg' | 'machine' | 'date';",
  "groupBy: 'none' | 'diaGg' | 'machine' | 'date' | 'customer';\n  status: 'all' | 'active' | 'pending' | 'running' | 'hold' | 'completed';"
);

// 3. Update initial filters
content = content.replace(
  "groupBy: 'none'\n  });",
  "groupBy: 'none',\n    status: 'active'\n  });"
);
content = content.replace(
  "groupBy: 'none'\n    });",
  "groupBy: 'none',\n      status: 'active'\n    });"
);

// 4. Update groupedData useMemo
// Add computeOrderStatus
const orderStatusFunc = `
  const computeOrderStatus = (report: FinalFabricReportDto) => {
    if (report.isProcess) return 'completed';
    let hasLots = false;
    let allSuspended = true;
    let allSuspendedOrHold = true;

    for (const item of report.salesOrderItems) {
      if (item.productionAllotments.length > 0) {
        hasLots = true;
        for (const lot of item.productionAllotments) {
          if (!lot.isSuspended) allSuspended = false;
          if (!lot.isSuspended && !lot.isOnHold) allSuspendedOrHold = false;
        }
      }
    }

    if (!hasLots) return 'pending';
    if (allSuspended) return 'completed';
    if (allSuspendedOrHold) return 'hold';
    return 'running';
  };
`;

content = content.replace("const rows: ReportRow[] = [];", orderStatusFunc + "\n    const rows: ReportRow[] = [];");
content = content.replace("data.forEach((report: FinalFabricReportDto) => {", "data.forEach((report: FinalFabricReportDto) => {\n      const orderStatus = computeOrderStatus(report);");

content = content.replace("machineName: rolls[0].machineName", "machineName: rolls[0].machineName,\n              orderStatus");
content = content.replace("machineName: 'N/A'", "machineName: 'N/A',\n              orderStatus");

// 5. Update filteredData useMemo to ignore dates if groupBy != 'date' and apply status
content = content.replace("const { searchTerm, startDate, endDate } = filters;", "const { searchTerm, startDate, endDate, groupBy, status } = filters;");
// wait, the actual replacement logic for Date filtering is better done by regex
fs.writeFileSync(path, content, "utf-8");
console.log("Partial update done");
