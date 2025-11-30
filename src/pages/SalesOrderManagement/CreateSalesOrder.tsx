import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Plus, Save, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { TallyService } from '@/services/tallyService';
import { SalesOrderWebService } from '@/services/salesOrderWebService';
import { useFabricStructures } from '@/hooks/queries/useFabricStructureQueries';
import { useSlitLines } from '@/hooks/queries/useSlitLineQueries';
import type { CompanyDetails, DetailedCustomer, StockItem } from '@/services/tallyService';
import type { CreateSalesOrderWebRequestDto, FabricStructureResponseDto } from '@/types/api-types';
import { toast } from '@/lib/toast';
import { getUser } from '@/lib/auth';
import { Textarea } from '@/components/ui/textarea';

// Define types
interface SalesOrderItem {
  id?: number;
  itemId: string;
  itemName: string;
  yarnCount: string;
  dia: number;
  gg: number;
  fabricType: string;
  composition: string;
  wtPerRoll: number;
  noOfRolls: number;
  rate: number;
  qty: number;
  amount: number;
  igst: number;
  sgst: number;
  cgst: number;
  remarks: string;
  hsncode?: string;
  dueDate?: string;
  slitLine?: string;
  stitchLength?: string;
  isProcess?: boolean;
  unit?: string;
}

// Enhanced Searchable Select Component
const EnhancedSearchSelect = ({ 
  options, 
  value, 
  onValueChange, 
  placeholder,
  searchPlaceholder = "Type to search...",
  displayKey = "name",
  showDetails = false
}: {
  options: any[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  displayKey?: string;
  showDetails?: boolean;
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options.slice(0, 50);
    return options.filter(option => 
      option[displayKey].toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.gstin && option.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (option.state && option.state.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 100);
  }, [options, searchTerm, displayKey]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 text-xs border-gray-300">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <div className="p-1 sticky top-0 bg-white z-10 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs border-0 focus:ring-0"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-xs text-gray-500 text-center">No results found</div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem 
                key={option.id} 
                value={option.id.toString()}
                className="text-xs py-1"
              >
                <div>
                  <div className="font-medium">{option[displayKey]}</div>
                  {showDetails && option.gstin && (
                    <div className="text-xs text-gray-500">
                      {option.gstin} • {option.state}
                    </div>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

// Searchable Fabric Type Select Component
const SearchableFabricTypeSelect = ({ 
  value, 
  onValueChange, 
  placeholder = "Select Fabric Type"
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: fabricStructures = [] } = useFabricStructures();

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return fabricStructures.slice(0, 50);
    return fabricStructures.filter(fabric => 
      fabric.fabricstr.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 100);
  }, [fabricStructures, searchTerm]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 text-xs border-gray-300">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <div className="p-1 sticky top-0 bg-white z-10 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Type to search fabric types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs border-0 focus:ring-0"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-xs text-gray-500 text-center">No fabric types found</div>
          ) : (
            filteredOptions.map((fabric) => (
              <SelectItem 
                key={fabric.id} 
                value={fabric.fabricstr}
                className="text-xs py-1"
              >
                <div>
                  <div className="font-medium">{fabric.fabricstr}</div>
                  {fabric.fabricCode && (
                    <div className="text-xs text-gray-500">
                      Code: {fabric.fabricCode}
                    </div>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

// Searchable Slit Line Select Component
const SearchableSlitLineSelect = ({ 
  value, 
  onValueChange, 
  placeholder = "Select Slit Line"
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: slitLines = [] } = useSlitLines();

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return slitLines.slice(0, 50);
    return slitLines.filter(slitLine => 
      slitLine.slitLine.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 100);
  }, [slitLines, searchTerm]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 text-xs border-gray-300">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <div className="p-1 sticky top-0 bg-white z-10 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Type to search slit lines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs border-0 focus:ring-0"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-xs text-gray-500 text-center">No slit lines found</div>
          ) : (
            filteredOptions.map((slitLine) => (
              <SelectItem 
                key={slitLine.id} 
                value={slitLine.slitLine}
                className="text-xs py-1"
              >
                <div>
                  <div className="font-medium">{slitLine.slitLine}</div>
                  <div className="text-xs text-gray-500">
                    Code: {slitLine.slitLineCode}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

const CreateSalesOrder = () => {
  const navigate = useNavigate();

  // State
  const [expandedSections, setExpandedSections] = useState({
    company: false,
    voucher: true,
    buyer: true,
    consignee: false,
    items: true
  });

  const [rows, setRows] = useState<SalesOrderItem[]>([
    {
      itemId: '',
      itemName: '',
      yarnCount: '',
      dia: 0,
      gg: 0,
      fabricType: '',
      composition: '',
      wtPerRoll: 0,
      noOfRolls: 0,
      rate: 0,
      qty: 0,
      amount: 0,
      igst: 0,
      sgst: 0,
      cgst: 0,
      remarks: '',
      hsncode: '',
      dueDate: '',
      slitLine: '',
      stitchLength: '',
      isProcess: false,
      unit: ''
    }
  ]);
  
  const [serialNo, setSerialNo] = useState('');

  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: "Avyyan Textiles Pvt Ltd",
    gstin: "27AABCA1234D1Z5",
    state: "Maharashtra"
  });

  const [customers, setCustomers] = useState<DetailedCustomer[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const { data: fabricStructures = [] } = useFabricStructures();

  // Voucher fields
  const [voucherType, setVoucherType] = useState('Sales Order');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [termsOfPayment, setTermsOfPayment] = useState('');
  const [isJobWork, setIsJobWork] = useState(false);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Additional fields
  const [isProcess, setIsProcess] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [termsOfDelivery, setTermsOfDelivery] = useState('');
  const [dispatchThrough, setDispatchThrough] = useState('');

  const [selectedBuyer, setSelectedBuyer] = useState<DetailedCustomer | null>(null);
  const [selectedConsignee, setSelectedConsignee] = useState<DetailedCustomer | null>(null);

  // State for editable buyer and consignee details
  const [editableBuyer, setEditableBuyer] = useState({
    gstin: '',
    state: '',
    contactPerson: '',
    phone: '',
    contactPersonPhone: '',
    email: '',
    address: ''
  });
  
  const [editableConsignee, setEditableConsignee] = useState({
    gstin: '',
    state: '',
    contactPerson: '',
    phone: '',
    contactPersonPhone: '',
    email: '',
    address: ''
  });
  
  // Update editable buyer when selected buyer changes
  useEffect(() => {
    if (selectedBuyer) {
      setEditableBuyer({
        gstin: selectedBuyer.gstin || '',
        state: selectedBuyer.state || '',
        contactPerson: selectedBuyer.contactPerson || '',
        phone: selectedBuyer.phone || '',
        contactPersonPhone: selectedBuyer.contactPersonPhone || '',
        email: selectedBuyer.email || '',
        address: selectedBuyer.address || ''
      });
    }
  }, [selectedBuyer]);
  
  // Update editable consignee when selected consignee changes
  useEffect(() => {
    if (selectedConsignee) {
      setEditableConsignee({
        gstin: selectedConsignee.gstin || '',
        state: selectedConsignee.state || '',
        contactPerson: selectedConsignee.contactPerson || '',
        phone: selectedConsignee.phone || '',
        contactPersonPhone: selectedConsignee.contactPersonPhone || '',
        email: selectedConsignee.email || '',
        address: selectedConsignee.address || ''
      });
    }
  }, [selectedConsignee]);

  // Load data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companyData, customerData, itemData] = await Promise.all([
          TallyService.getCompanyDetails(),
          TallyService.getDetailedCustomers(),
          TallyService.getStockItems()
        ]);
        
        setCompanyDetails(companyData);
        setCustomers(customerData);
        setItems(itemData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error', 'Failed to fetch data from server. Please check your connection.');
      }
    };

    fetchData();
  }, []);

  // Generate voucher number and serial number
  useEffect(() => {
    const generateVoucherAndSerialNumber = async () => {
      try {
        const financialYear = getFinancialYear();
        const series = isJobWork ? 'J' : 'A';
        
        const nextSerialNumber = await SalesOrderWebService.getNextSerialNumber();
        setSerialNo(nextSerialNumber);
        setVoucherNumber(`AKF/${financialYear}/${series}${nextSerialNumber}`);
      } catch (error) {
        console.error('Error generating voucher and serial number:', error);
        const financialYear = getFinancialYear();
        const series = isJobWork ? 'J' : 'A';
        setVoucherNumber(`AKF/${financialYear}/${series}0001`);
        setSerialNo('0001');
        toast.error('Error', 'Failed to generate voucher number. Using default.');
      }
    };

    generateVoucherAndSerialNumber();
  }, [isJobWork, selectedBuyer]);

  // Helper function to get financial year
  const getFinancialYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (currentMonth >= 4) {
      return `${(currentYear % 100).toString().padStart(2, '0')}-${((currentYear + 1) % 100).toString().padStart(2, '0')}`;
    } else {
      return `${((currentYear - 1) % 100).toString().padStart(2, '0')}-${(currentYear % 100).toString().padStart(2, '0')}`;
    }
  };

  // Calculated values
  const totalQty = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.qty, 0);
  }, [rows]);

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.amount, 0);
  }, [rows]);

  // Handlers
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        itemId: '',
        itemName: '',
        yarnCount: '',
        dia: 0,
        gg: 0,
        fabricType: '',
        composition: '',
        wtPerRoll: 0,
        noOfRolls: 0,
        rate: 0,
        qty: 0,
        amount: 0,
        igst: 0,
        sgst: 0,
        cgst: 0,
        remarks: '',
        hsncode: '',
        dueDate: '',
        slitLine: '',
        stitchLength: '',
        isProcess: false,
        unit: ''
      }
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index: number, field: keyof SalesOrderItem, value: any) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    
    if (field === 'qty' || field === 'rate') {
      const qty = field === 'qty' ? value : updatedRows[index].qty;
      const rate = field === 'rate' ? value : updatedRows[index].rate;
      updatedRows[index].amount = qty * rate;
    }
    
    if (field === 'itemId') {
      const selectedItem = items.find(item => item.id.toString() === value);
      if (selectedItem) {
        updatedRows[index].itemName = selectedItem.name;
        updatedRows[index].hsncode = selectedItem.hsncode || '';
        if (!updatedRows[index].yarnCount) updatedRows[index].yarnCount = (selectedItem as any).yarnCount || '';
        if (!updatedRows[index].fabricType) updatedRows[index].fabricType = (selectedItem as any).fabricType || '';
      }
    }
    
    setRows(updatedRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let currentUser = 'System';
      try {
        const user = getUser();
        if (user) {
          currentUser = `${user.firstName} ${user.lastName}`.trim() || user.email || 'System';
        }
      } catch (userError) {
        console.warn('Could not get current user information:', userError);
      }
      
      const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
      const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
      
      const createDto: CreateSalesOrderWebRequestDto = {
        voucherType: voucherType,
        voucherNumber: voucherNumber,
        orderDate: new Date(orderDate).toISOString(),
        termsOfPayment: termsOfPayment,
        isJobWork: isJobWork,
        serialNo: serialNo,
        isProcess: isProcess,
        orderNo: orderNo,
        termsOfDelivery: termsOfDelivery,
        dispatchThrough: dispatchThrough,
        
        companyName: companyDetails.name,
        companyGSTIN: companyDetails.gstin,
        companyState: companyDetails.state,
        
        buyerName: selectedBuyer?.name || '',
        buyerGSTIN: editableBuyer.gstin || selectedBuyer?.gstin || null,
        buyerState: editableBuyer.state || selectedBuyer?.state || null,
        buyerPhone: editableBuyer.phone || selectedBuyer?.phone || '',
        buyerContactPerson: editableBuyer.contactPerson || selectedBuyer?.contactPerson || '',
        buyerAddress: editableBuyer.address || selectedBuyer?.address || '',
        
        consigneeName: selectedConsignee?.name || '',
        consigneeGSTIN: editableConsignee.gstin || selectedConsignee?.gstin || null,
        consigneeState: editableConsignee.state || selectedConsignee?.state || null,
        consigneePhone: editableConsignee.phone || selectedConsignee?.phone || '',
        consigneeContactPerson: editableConsignee.contactPerson || selectedConsignee?.contactPerson || '',
        consigneeAddress: editableConsignee.address || selectedConsignee?.address || '',
        
        remarks: '',
        
        totalQuantity: totalQty,
        totalAmount: totalAmount,
        
        items: rows.map(row => ({
          itemName: row.itemName,
          itemDescription: '',
          yarnCount: row.yarnCount,
          dia: row.dia,
          gg: row.gg,
          fabricType: row.fabricType,
          composition: row.composition,
          wtPerRoll: row.wtPerRoll,
          noOfRolls: row.noOfRolls,
          rate: row.rate,
          qty: row.qty,
          amount: row.amount,
          igst: row.igst,
          sgst: row.sgst,
          cgst: row.cgst,
          remarks: row.remarks,
          unit: row.unit || undefined,
          slitLine: row.slitLine || undefined,
          stitchLength: row.stitchLength || undefined,
          dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : undefined,
          isProcess: row.isProcess || false
        }))
      };

      await SalesOrderWebService.createSalesOrderWeb(createDto);
      toast.success('Success', 'Sales order created successfully');
      navigate('/sales-orders');
    } catch (error: any) {
      console.error('Error submitting sales order:', error);
      toast.error('Error', error.message || 'Failed to create sales order. Please try again.');
    }
  };

  return (
    <div className="space-y-2 p-2">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">Create Sales Order</h1>
       
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Company & Voucher Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Company Details */}
          <Card className="text-xs">
            <CardHeader 
              className="cursor-pointer py-1" 
              onClick={() => toggleSection('company')}
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Company</CardTitle>
                {expandedSections.company ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </CardHeader>
            {expandedSections.company && (
              <CardContent className="pt-0 space-y-1">
                <Input disabled value={companyDetails.name} className="h-7 text-xs" />
                <div className="grid grid-cols-2 gap-1">
                  <Input disabled value={companyDetails.gstin || 'GSTIN not available'} className="h-7 text-xs" />
                  <Input disabled value={companyDetails.state || 'State not available'} className="h-7 text-xs" />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Voucher Details */}
          <Card className="text-xs">
            <CardHeader 
              className="cursor-pointer py-1" 
              onClick={() => toggleSection('voucher')}
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Voucher</CardTitle>
                {expandedSections.voucher ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </CardHeader>
            {expandedSections.voucher && (
              <CardContent className="pt-0 space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <Select value={voucherType} onValueChange={setVoucherType}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales Order" className="text-xs">Sales Order</SelectItem>
                      <SelectItem value="Purchase Order" className="text-xs">Purchase Order</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    value={voucherNumber} 
                    readOnly
                    className="h-7 text-xs bg-gray-50"
                    placeholder="Voucher No"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Input 
                    type="date" 
                    value={orderDate} 
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <div className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={isJobWork}
                      onChange={(e) => setIsJobWork(e.target.checked)}
                      className="rounded scale-75"
                    />
                    <span className="text-xs">Job Work</span>
                  </div>
                </div>
                <Input 
                  value={termsOfPayment} 
                  onChange={(e) => setTermsOfPayment(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="Payment Terms"
                />
                <div className="grid grid-cols-2 gap-1">
                  <Input 
                    value={serialNo} 
                    readOnly
                    className="h-7 text-xs bg-gray-50"
                    placeholder="Serial No"
                  />
                  <Input 
                    value={orderNo} 
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Order No"
                  />
               
                <Input 
                  value={termsOfDelivery} 
                  onChange={(e) => setTermsOfDelivery(e.target.value)}
                  className="h-10 text-sm"
                  placeholder="Terms of Delivery"
                />
                <Input 
                  value={dispatchThrough} 
                  onChange={(e) => setDispatchThrough(e.target.value)}
                  className="h-10 text-sm"
                  placeholder="Dispatch Through"
                />
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Buyer & Consignee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Buyer Section */}
          <Card className="text-xs">
            <CardHeader 
              className="cursor-pointer py-1" 
              onClick={() => toggleSection('buyer')}
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Buyer (Bill To)</CardTitle>
                {expandedSections.buyer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </CardHeader>
            {expandedSections.buyer && (
              <CardContent className="pt-0 space-y-1">
                <EnhancedSearchSelect
                  options={customers}
                  value={selectedBuyer ? selectedBuyer.id.toString() : ''}
                  onValueChange={(v) => setSelectedBuyer(customers.find(b => b.id.toString() === v) || null)}
                  placeholder="Select Buyer"
                  showDetails={true}
                />
                
                {selectedBuyer && (
                  <div className="p-1 bg-blue-50 rounded text-xs border mt-1">
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-xs text-gray-600">GSTIN</label>
                        <Input 
                          value={editableBuyer.gstin} 
                          onChange={(e) => setEditableBuyer({...editableBuyer, gstin: e.target.value})}
                          className="h-6 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">State</label>
                        <Input 
                          value={editableBuyer.state} 
                          onChange={(e) => setEditableBuyer({...editableBuyer, state: e.target.value})}
                          className="h-6 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Contact</label>
                        <Input 
                          value={editableBuyer.contactPerson} 
                          onChange={(e) => setEditableBuyer({...editableBuyer, contactPerson: e.target.value})}
                          className="h-6 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Phone</label>
                        <Input 
                          value={editableBuyer.phone} 
                          onChange={(e) => setEditableBuyer({...editableBuyer, phone: e.target.value})}
                          className="h-6 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Consignee Section */}
          <Card className="text-xs">
            <CardHeader 
              className="cursor-pointer py-1" 
              onClick={() => toggleSection('consignee')}
            >
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Consignee (Ship To)</CardTitle>
                {expandedSections.consignee ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </CardHeader>
            {expandedSections.consignee && (
              <CardContent className="pt-0 space-y-1">
                <EnhancedSearchSelect
                  options={customers}
                  value={selectedConsignee ? selectedConsignee.id.toString() : ''}
                  onValueChange={(v) => setSelectedConsignee(customers.find(c => c.id.toString() === v) || null)}
                  placeholder="Select Consignee"
                  showDetails={true}
                />
                
                {selectedConsignee && (
                  <div className="p-1 bg-green-50 rounded text-xs border mt-1">
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-xs text-gray-600">GSTIN</label>
                        <Input 
                          value={editableConsignee.gstin} 
                          onChange={(e) => setEditableConsignee({...editableConsignee, gstin: e.target.value})}
                          className="h-6 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">State</label>
                        <Input 
                          value={editableConsignee.state} 
                          onChange={(e) => setEditableConsignee({...editableConsignee, state: e.target.value})}
                          className="h-6 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Contact</label>
                        <Input 
                          value={editableConsignee.contactPerson} 
                          onChange={(e) => setEditableConsignee({...editableConsignee, contactPerson: e.target.value})}
                          className="h-6 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Phone</label>
                        <Input 
                          value={editableConsignee.phone} 
                          onChange={(e) => setEditableConsignee({...editableConsignee, phone: e.target.value})}
                          className="h-6 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Items Section */}
        <Card className="text-xs">
          <CardHeader className="py-1">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm">Order Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => addRow()} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="p-2 border rounded space-y-2 bg-white">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-xs">Item #{index + 1}</h4>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeRow(index)}
                    className="h-5 w-5 p-0"
                    disabled={rows.length === 1}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Item Selection */}
                <div className="grid grid-cols-2 gap-1">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Item</label>
                    <EnhancedSearchSelect
                      options={items}
                      value={row.itemId}
                      onValueChange={(v) => updateRow(index, 'itemId', v)}
                      placeholder="Select Item"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">HSN/SAC</label>
                    <Input 
                      value={row.hsncode || ''} 
                      disabled
                      className="h-7 text-xs bg-gray-50"
                      placeholder="HSN/SAC"
                    />
                  </div>
                </div>

                {/* Compact Item Details Grid */}
                <div className="grid grid-cols-4 gap-1">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Yarn Count</label>
                    <Input 
                      value={row.yarnCount} 
                      onChange={e => updateRow(index, 'yarnCount', e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Yarn Count"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Dia</label>
                    <Input 
                      type="number"
                      value={row.dia} 
                      onChange={e => updateRow(index, 'dia', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="Dia"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">GG</label>
                    <Input 
                      type="number"
                      value={row.gg} 
                      onChange={e => updateRow(index, 'gg', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="GG"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Fabric Type</label>
                    <SearchableFabricTypeSelect
                      value={row.fabricType}
                      onValueChange={(value) => updateRow(index, 'fabricType', value)}
                      placeholder="Fabric Type"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Slit Line</label>
                    <SearchableSlitLineSelect
                      value={row.slitLine || ''}
                      onValueChange={(value) => updateRow(index, 'slitLine', value)}
                      placeholder="Slit Line"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Stitch Length</label>
                    <Input 
                      value={row.stitchLength || ''} 
                      onChange={e => updateRow(index, 'stitchLength', e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Stitch Length"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Composition</label>
                    <Input 
                      value={row.composition} 
                      onChange={e => updateRow(index, 'composition', e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Composition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Due Date</label>
                    <Input 
                      type="date" 
                      value={row.dueDate || ''} 
                      onChange={e => updateRow(index, 'dueDate', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                {/* Quantity & Pricing */}
                <div className="grid grid-cols-5 gap-1">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">WT/Roll</label>
                    <Input 
                      type="number" 
                      value={row.wtPerRoll} 
                      onChange={e => updateRow(index, 'wtPerRoll', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="WT/Roll"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Rolls</label>
                    <Input 
                      type="number" 
                      value={row.noOfRolls} 
                      onChange={e => updateRow(index, 'noOfRolls', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="Rolls"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Rate</label>
                    <Input 
                      type="number" 
                      value={row.rate} 
                      onChange={e => updateRow(index, 'rate', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="Rate"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Qty</label>
                    <div className="flex gap-1">
                      <Input 
                        type="number" 
                        value={row.qty} 
                        onChange={e => updateRow(index, 'qty', Number(e.target.value))}
                        className="h-7 text-xs flex-1"
                        placeholder="Qty"
                      />
                      <Input 
                        value={row.unit || ''} 
                        onChange={e => updateRow(index, 'unit', e.target.value)}
                        className="h-7 text-xs w-12"
                        placeholder="Unit"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Amount</label>
                    <Input 
                      disabled 
                      value={row.amount} 
                      className="h-7 text-xs bg-gray-50"
                      placeholder="Amount"
                    />
                  </div>
                </div>

                {/* Tax & Remarks */}
                <div className="grid grid-cols-4 gap-1">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">IGST%</label>
                    <Input 
                      type="number" 
                      value={row.igst} 
                      onChange={e => updateRow(index, 'igst', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="IGST%"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">SGST%</label>
                    <Input 
                      type="number" 
                      value={row.sgst} 
                      onChange={e => updateRow(index, 'sgst', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="SGST%"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">CGST%</label>
                    <Input 
                      type="number" 
                      value={row.cgst} 
                      onChange={e => updateRow(index, 'cgst', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="CGST%"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Remarks</label>
                    <Input 
                      value={row.remarks} 
                      onChange={e => updateRow(index, 'remarks', e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Remarks"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Summary */}
            {rows.length > 0 && (
              <div className="bg-gray-50 p-2 rounded text-xs border">
                <div className="flex justify-between items-center">
                  <div><span className="font-medium">Items:</span> {rows.length}</div>
                  <div><span className="font-medium">Total Qty:</span> {totalQty}</div>
                  <div className="font-bold">Total: ₹{totalAmount.toLocaleString()}</div>
                </div>
              </div>
            )}
          </CardContent>
           <div className="flex space-x-1">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/sales-orders')} className="h-7 text-xs">
            Cancel
          </Button>
          <Button type="submit" size="sm" onClick={handleSubmit} className="h-7 text-xs">
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
        </Card>
      </form>
    </div>
  );
};

export default CreateSalesOrder;