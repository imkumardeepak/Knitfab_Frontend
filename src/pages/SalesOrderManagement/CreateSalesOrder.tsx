import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Save, X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { TallyService } from '@/services/tallyService';
import { SalesOrderWebService } from '@/services/salesOrderWebService';
import { useFabricStructures } from '@/hooks/queries/useFabricStructureQueries';
import { useSlitLines } from '@/hooks/queries/useSlitLineQueries';
import type { CompanyDetails, DetailedCustomer, StockItem } from '@/services/tallyService';
import type { CreateSalesOrderWebRequestDto, UpdateSalesOrderWebRequestDto, FabricStructureResponseDto } from '@/types/api-types';
import { toast } from '@/lib/toast';
import { getUser } from '@/lib/auth';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

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

// Define company details type
interface CompanyDetail {
  id: string;
  name: string;
  gstin: string;
  state: string;
}

// Enhanced Searchable Select Component
const EnhancedSearchSelect = ({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = 'Type to search...',
  displayKey = 'name',
  showDetails = false,
}: {
  options: any[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  displayKey?: string;
  showDetails?: boolean;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options.slice(0, 50);
    return options
      .filter(
        (option) =>
          option[displayKey].toLowerCase().includes(searchTerm.toLowerCase()) ||
          (option.gstin && option.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (option.state && option.state.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .slice(0, 100);
  }, [options, searchTerm, displayKey]);

  // Focus the search input when the select opens
  const handleOpenChange = (open: boolean) => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange} onOpenChange={handleOpenChange}>
      <SelectTrigger className="h-8 text-xs border-gray-300">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <div className="p-1 sticky top-0 bg-white z-10 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              ref={searchInputRef}
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs border-0 focus:ring-0"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-xs text-gray-500 text-center">No results found</div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem key={option.id} value={option.id.toString()} className="text-xs py-1">
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
  placeholder = 'Select Fabric Type',
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: fabricStructures = [] } = useFabricStructures();

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return fabricStructures.slice(0, 50);
    return fabricStructures
      .filter((fabric) => fabric.fabricstr.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 100);
  }, [fabricStructures, searchTerm]);

  // Focus the search input when the select opens
  const handleOpenChange = (open: boolean) => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange} onOpenChange={handleOpenChange}>
      <SelectTrigger className="h-8 text-xs border-gray-300">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <div className="p-1 sticky top-0 bg-white z-10 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              ref={searchInputRef}
              placeholder="Type to search fabric types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs border-0 focus:ring-0"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-xs text-gray-500 text-center">No fabric types found</div>
          ) : (
            filteredOptions.map((fabric) => (
              <SelectItem key={fabric.id} value={fabric.fabricstr} className="text-xs py-1">
                <div>
                  <div className="font-medium">{fabric.fabricstr}</div>
                  {fabric.fabricCode && (
                    <div className="text-xs text-gray-500">Code: {fabric.fabricCode}</div>
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
  placeholder = 'Select Slit Line',
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: slitLines = [] } = useSlitLines();

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return slitLines.slice(0, 50);
    return slitLines
      .filter((slitLine) => slitLine.slitLine.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 100);
  }, [slitLines, searchTerm]);

  // Focus the search input when the select opens
  const handleOpenChange = (open: boolean) => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange} onOpenChange={handleOpenChange}>
      <SelectTrigger className="h-8 text-xs border-gray-300">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        <div className="p-1 sticky top-0 bg-white z-10 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              ref={searchInputRef}
              placeholder="Type to search slit lines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs border-0 focus:ring-0"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-xs text-gray-500 text-center">No slit lines found</div>
          ) : (
            filteredOptions.map((slitLine) => (
              <SelectItem key={slitLine.id} value={slitLine.slitLine} className="text-xs py-1">
                <div>
                  <div className="font-medium">{slitLine.slitLine}</div>
                  <div className="text-xs text-gray-500">Code: {slitLine.slitLineCode}</div>
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
  const { orderId } = useParams<{ orderId?: string }>();
  const isEditMode = !!orderId;

  // State
  const [expandedSections, setExpandedSections] = useState({
    company: true,
    voucher: true,
    buyer: true,
    consignee: true,
    items: true,
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
      unit: '',
    },
  ]);

  const [serialNo, setSerialNo] = useState('');

  // Predefined company details
  const companyOptions: CompanyDetail[] = [
    {
      id: '1',
       name: 'Avyaan Knitfab',
      gstin: '27AABCA1234D1Z5',
      state: 'Maharashtra',
     
    },
    {
      id: '2',
      name: ' SANSKAR UDYOG',
      gstin: '27AQOPS9431P1ZQ',
      state: 'Maharashtra',
    },
    {
      id: '3',
      name: 'SANSKAR AGRO PROCESSORS PRIVATE LIMITED',
      gstin: '27AAICS1260R1ZT',
      state: 'Maharashtra',
    }
  ];

  // Change companyDetails to use selected company
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail>(companyOptions[0]);

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
  
  // Add other reference field
  const [otherReference, setOtherReference] = useState('');

  const [selectedBuyer, setSelectedBuyer] = useState<DetailedCustomer | null>(null);
  const [selectedConsignee, setSelectedConsignee] = useState<DetailedCustomer | null>(null);

  // State for editable buyer and consignee details
  const [editableBuyer, setEditableBuyer] = useState({
    name: '',
    gstin: '',
    state: '',
    contactPerson: '',
    phone: '',
    contactPersonPhone: '',
    email: '',
    address: '',
  });

  const [editableConsignee, setEditableConsignee] = useState({
    name: '',
    gstin: '',
    state: '',
    contactPerson: '',
    phone: '',
    contactPersonPhone: '',
    email: '',
    address: '',
  });

  // State for manual entry toggle
  const [manualBuyerEntry, setManualBuyerEntry] = useState(false);
  const [manualConsigneeEntry, setManualConsigneeEntry] = useState(false);
  const [copyBuyerToConsignee, setCopyBuyerToConsignee] = useState(false);

  // Update editable buyer when selected buyer changes
  useEffect(() => {
    if (selectedBuyer && !manualBuyerEntry) {
      setEditableBuyer({
        name: selectedBuyer.name || '',
        gstin: selectedBuyer.gstin || '',
        state: selectedBuyer.state || '',
        contactPerson: selectedBuyer.contactPerson || '',
        phone: selectedBuyer.phone || '',
        contactPersonPhone: selectedBuyer.contactPersonPhone || '',
        email: selectedBuyer.email || '',
        address: selectedBuyer.address || '',
      });
      
      // Copy to consignee if copy flag is set
      if (copyBuyerToConsignee) {
        setEditableConsignee({
          name: selectedBuyer.name || '',
          gstin: selectedBuyer.gstin || '',
          state: selectedBuyer.state || '',
          contactPerson: selectedBuyer.contactPerson || '',
          phone: selectedBuyer.phone || '',
          contactPersonPhone: selectedBuyer.contactPersonPhone || '',
          email: selectedBuyer.email || '',
          address: selectedBuyer.address || '',
        });
        
        // Also set selected consignee if it's not already set
        if (!selectedConsignee) {
          setSelectedConsignee(selectedBuyer);
        }
      }
    }
  }, [selectedBuyer, manualBuyerEntry, copyBuyerToConsignee]);

  // Update editable consignee when selected consignee changes
  useEffect(() => {
    if (selectedConsignee && !manualConsigneeEntry) {
      setEditableConsignee({
        name: selectedConsignee.name || '',
        gstin: selectedConsignee.gstin || '',
        state: selectedConsignee.state || '',
        contactPerson: selectedConsignee.contactPerson || '',
        phone: selectedConsignee.phone || '',
        contactPersonPhone: selectedConsignee.contactPersonPhone || '',
        email: selectedConsignee.email || '',
        address: selectedConsignee.address || '',
      });
    }
  }, [selectedConsignee, manualConsigneeEntry]);

  // Copy buyer details to consignee
  const copyBuyerDetailsToConsignee = () => {
    setEditableConsignee({ ...editableBuyer });
    
    // If manual entry is not enabled for consignee, enable it
    if (!manualConsigneeEntry) {
      setManualConsigneeEntry(true);
    }
    
    // Clear selected consignee if any
    setSelectedConsignee(null);
  };

  // Load data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customerData, itemData] = await Promise.all([
          TallyService.getDetailedCustomers(),
          TallyService.getStockItems(),
        ]);

        setCustomers(customerData);
        setItems(itemData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error', 'Failed to fetch data from server. Please check your connection.');
      }
    };

    fetchData();
  }, []);

  // Load sales order data for editing when customers and items are loaded
  useEffect(() => {
    if (isEditMode && orderId && customers.length > 0 && items.length > 0) {
      loadSalesOrderData(parseInt(orderId));
    }
  }, [isEditMode, orderId, customers, items]);

  // Load sales order data for editing
  const loadSalesOrderData = async (id: number) => {
    try {
      const salesOrder = await SalesOrderWebService.getSalesOrderWebById(id);
      
      // Set form fields with sales order data
      setVoucherType(salesOrder.voucherType);
      setVoucherNumber(salesOrder.voucherNumber);
      setOrderDate(new Date(salesOrder.orderDate).toISOString().split('T')[0]);
      setTermsOfPayment(salesOrder.termsOfPayment || '');
      setIsJobWork(salesOrder.isJobWork);
      setSerialNo(salesOrder.serialNo || '');
      setOrderNo(salesOrder.orderNo || '');
      setTermsOfDelivery(salesOrder.termsOfDelivery || '');
      setDispatchThrough(salesOrder.dispatchThrough || '');
      setOtherReference(salesOrder.otherReference || '');
      
      // Set company details
      const company = companyOptions.find(c => c.gstin === salesOrder.companyGSTIN);
      if (company) {
        setSelectedCompany(company);
      }
      
      // Set buyer details
      setEditableBuyer({
        name: salesOrder.buyerName,
        gstin: salesOrder.buyerGSTIN || '',
        state: salesOrder.buyerState || '',
        contactPerson: salesOrder.buyerContactPerson,
        phone: salesOrder.buyerPhone,
        contactPersonPhone: '',
        email: '',
        address: salesOrder.buyerAddress,
      });
      
      // Try to find and set the selected buyer from the customers list
      const foundBuyer = customers.find(c => 
        c.name === salesOrder.buyerName && 
        (salesOrder.buyerGSTIN ? c.gstin === salesOrder.buyerGSTIN : true) &&
        (salesOrder.buyerState ? c.state === salesOrder.buyerState : true)
      );
      
      if (foundBuyer) {
        setSelectedBuyer(foundBuyer);
        setManualBuyerEntry(false);
      } else if (salesOrder.buyerName) {
        // If buyer details exist but don't match any customer, enable manual entry
        setManualBuyerEntry(true);
      }
      
      // Set consignee details
      setEditableConsignee({
        name: salesOrder.consigneeName,
        gstin: salesOrder.consigneeGSTIN || '',
        state: salesOrder.consigneeState || '',
        contactPerson: salesOrder.consigneeContactPerson,
        phone: salesOrder.consigneePhone,
        contactPersonPhone: '',
        email: '',
        address: salesOrder.consigneeAddress,
      });
      
      // Try to find and set the selected consignee from the customers list
      const foundConsignee = customers.find(c => 
        c.name === salesOrder.consigneeName && 
        (salesOrder.consigneeGSTIN ? c.gstin === salesOrder.consigneeGSTIN : true) &&
        (salesOrder.consigneeState ? c.state === salesOrder.consigneeState : true)
      );
      
      if (foundConsignee) {
        setSelectedConsignee(foundConsignee);
        setManualConsigneeEntry(false);
      } else if (salesOrder.consigneeName) {
        // If consignee details exist but don't match any customer, enable manual entry
        setManualConsigneeEntry(true);
      }
      
      // Set items
      const mappedItems = salesOrder.items.map(item => ({
        id: item.id,
        itemId: '', // Will be set when items are loaded
        itemName: item.itemName,
        yarnCount: item.yarnCount,
        dia: item.dia,
        gg: item.gg,
        fabricType: item.fabricType,
        composition: item.composition,
        wtPerRoll: item.wtPerRoll,
        noOfRolls: item.noOfRolls,
        rate: item.rate,
        qty: item.qty,
        amount: item.amount,
        igst: item.igst,
        sgst: item.sgst,
        cgst: item.cgst,
        remarks: item.remarks,
        hsncode: '', // Will be set when items are loaded
        dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
        slitLine: item.slitLine || '',
        stitchLength: item.stitchLength || '',
        isProcess: item.isProcess,
        unit: '',
      }));
      
      setRows(mappedItems);
    } catch (error) {
      console.error('Error loading sales order data:', error);
      toast.error('Error', 'Failed to load sales order data.');
    }
  };

  // Update item IDs and HSN codes when items are loaded
  useEffect(() => {
    if (items.length > 0 && rows.some(row => (row.itemId === '' && row.itemName) || (row.hsncode === '' && row.itemName))) {
      const updatedRows = rows.map(row => {
        if ((row.itemId === '' || row.hsncode === '') && row.itemName) {
          const item = items.find(i => i.name === row.itemName);
          if (item) {
            return { 
              ...row, 
              itemId: row.itemId === '' ? item.id.toString() : row.itemId,
              hsncode: row.hsncode === '' ? (item.hsncode || '') : row.hsncode
            };
          } else {
            // If item not found but we have a name, keep the name but clear itemId
            return { 
              ...row, 
              itemId: row.itemId === '' ? '' : row.itemId,
              hsncode: row.hsncode === '' ? '' : row.hsncode
            };
          }
        }
        return row;
      });
      setRows(updatedRows);
    }
  }, [items, rows]);

  // Generate voucher number and serial number
  useEffect(() => {
    // Skip auto-generation in edit mode
    if (isEditMode) return;
    
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
  }, [isJobWork, selectedBuyer, isEditMode]);

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
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
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
        unit: '',
      },
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
      // Handle case where value is empty string or 0
      if (qty === '' || rate === '' || qty === 0 || rate === 0) {
        updatedRows[index].amount = 0;
      } else {
        updatedRows[index].amount = Number(qty) * Number(rate);
      }
    }

    // When CGST or SGST changes, ensure they stay in sync (both should be equal for intra-state transactions)
    if (field === 'cgst' || field === 'sgst') {
      const newValue = Number(value) || 0;
      if (field === 'cgst') {
        updatedRows[index].sgst = newValue; // Set SGST equal to CGST
      } else if (field === 'sgst') {
        updatedRows[index].cgst = newValue; // Set CGST equal to SGST
      }
    }

    if (field === 'itemId') {
      const selectedItem = items.find((item) => item.id.toString() === value);
      if (selectedItem) {
        updatedRows[index].itemName = selectedItem.name;
        updatedRows[index].hsncode = selectedItem.hsncode || '';
        updatedRows[index].unit = selectedItem.unit || ''; // Add unit when selecting item
        if (!updatedRows[index].yarnCount)
          updatedRows[index].yarnCount = (selectedItem as any).yarnCount || '';
        if (!updatedRows[index].fabricType)
          updatedRows[index].fabricType = (selectedItem as any).fabricType || '';
        
        // Auto-populate tax rates from item data if available
        if ((selectedItem as any).cgst) {
          updatedRows[index].cgst = Number((selectedItem as any).cgst) || 0;
          updatedRows[index].sgst = Number((selectedItem as any).sgst) || 0;
          updatedRows[index].igst = Number((selectedItem as any).igst) || 0;
        }
      }
    }
    
    // When hsncode is manually updated, ensure it's properly set
    if (field === 'hsncode') {
      updatedRows[index].hsncode = value;
    }

    setRows(updatedRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!orderNo) {
      toast.error('Validation Error', 'Order No is required');
      return;
    }

    // Validate buyer details
    if (manualBuyerEntry) {
      if (!editableBuyer.name) {
        toast.error('Validation Error', 'Buyer Name is required');
        return;
      }
    } else if (!selectedBuyer) {
      toast.error('Validation Error', 'Please select a buyer or add buyer details manually');
      return;
    }

    // Validate consignee details
    if (manualConsigneeEntry) {
      if (!editableConsignee.name) {
        toast.error('Validation Error', 'Consignee Name is required');
        return;
      }
    } else if (!selectedConsignee && !(copyBuyerToConsignee && selectedBuyer)) {
      toast.error('Validation Error', 'Please select a consignee, add consignee details manually, or enable auto-copy from buyer');
      return;
    }

    // Validate item rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.itemId) {
        toast.error('Validation Error', `Item is required for row ${i + 1}`);
        return;
      }
      if (!row.fabricType) {
        toast.error('Validation Error', `Fabric Type is required for row ${i + 1}`);
        return;
      }
      if (!row.slitLine) {
        toast.error('Validation Error', `Slit Line is required for row ${i + 1}`);
        return;
      }
      if (!row.qty || row.qty <= 0) {
        toast.error('Validation Error', `Quantity must be greater than 0 for row ${i + 1}`);
        return;
      }
      if (!row.rate || row.rate <= 0) {
        toast.error('Validation Error', `Rate must be greater than 0 for row ${i + 1}`);
        return;
      }
      // Validate tax fields
      if (row.cgst < 0 || row.sgst < 0 || row.igst < 0) {
        toast.error('Validation Error', `Tax values cannot be negative for row ${i + 1}`);
        return;
      }
    }

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

      // Calculate totals properly
      const totalQty = rows.reduce((sum, row) => sum + (row.qty || 0), 0);
      const totalAmount = rows.reduce((sum, row) => sum + (row.amount || 0), 0);

      if (isEditMode && orderId) {
        // Update existing sales order
        const updateDto = {
          voucherType: voucherType,
          voucherNumber: voucherNumber,
          orderDate: new Date(orderDate).toISOString(),
          termsOfPayment: termsOfPayment,
          isJobWork: isJobWork,
          serialNo: serialNo,
          orderNo: orderNo,
          termsOfDelivery: termsOfDelivery,
          dispatchThrough: dispatchThrough,

          companyName: selectedCompany.name,
          companyGSTIN: selectedCompany.gstin,
          companyState: selectedCompany.state,

          buyerName: manualBuyerEntry ? editableBuyer.name : (selectedBuyer?.name || ''),
          buyerGSTIN: editableBuyer.gstin || selectedBuyer?.gstin || null,
          buyerState: editableBuyer.state || selectedBuyer?.state || null,
          buyerPhone: editableBuyer.phone || selectedBuyer?.phone || '',
          buyerContactPerson: editableBuyer.contactPerson || selectedBuyer?.contactPerson || '',
          buyerAddress: editableBuyer.address || selectedBuyer?.address || '',

          consigneeName: manualConsigneeEntry ? editableConsignee.name : 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.name : (selectedConsignee?.name || '')),
          consigneeGSTIN: editableConsignee.gstin || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.gstin : selectedConsignee?.gstin) || null,
          consigneeState: editableConsignee.state || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.state : selectedConsignee?.state) || null,
          consigneePhone: editableConsignee.phone || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.phone : selectedConsignee?.phone) || '',
          consigneeContactPerson:
            editableConsignee.contactPerson || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.contactPerson : selectedConsignee?.contactPerson) || '',
          consigneeAddress: editableConsignee.address || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.address : selectedConsignee?.address) || '',

          remarks: '', // Use otherReference as remarks
          otherReference: otherReference, // Also send in dedicated field

          totalQuantity: totalQty,
          totalAmount: parseFloat(totalAmount.toFixed(2)), // Round to 2 decimal places

          items: rows.map((row) => ({
            id: row.id,
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
            qty: row.qty || 0,
            amount: parseFloat((row.amount || 0).toFixed(2)), // Round to 2 decimal places
            igst: row.igst || 0,
            sgst: row.sgst || 0,
            cgst: row.cgst || 0,
            remarks: row.remarks,
            unit: row.unit || undefined,
            slitLine: row.slitLine || undefined,
            stitchLength: row.stitchLength || undefined,
            dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : undefined,
            isProcess: row.isProcess || false,
          })),
        };

        // Log the data being sent for debugging
        console.log('Updating sales order data:', updateDto);
        await SalesOrderWebService.updateSalesOrderWeb(parseInt(orderId), updateDto);
        toast.success('Success', 'Sales order updated successfully');
      } else {
        // Create new sales order
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

          companyName: selectedCompany.name,
          companyGSTIN: selectedCompany.gstin,
          companyState: selectedCompany.state,

          buyerName: manualBuyerEntry ? editableBuyer.name : (selectedBuyer?.name || ''),
          buyerGSTIN: editableBuyer.gstin || selectedBuyer?.gstin || null,
          buyerState: editableBuyer.state || selectedBuyer?.state || null,
          buyerPhone: editableBuyer.phone || selectedBuyer?.phone || '',
          buyerContactPerson: editableBuyer.contactPerson || selectedBuyer?.contactPerson || '',
          buyerAddress: editableBuyer.address || selectedBuyer?.address || '',

          consigneeName: manualConsigneeEntry ? editableConsignee.name : 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.name : (selectedConsignee?.name || '')),
          consigneeGSTIN: editableConsignee.gstin || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.gstin : selectedConsignee?.gstin) || null,
          consigneeState: editableConsignee.state || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.state : selectedConsignee?.state) || null,
          consigneePhone: editableConsignee.phone || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.phone : selectedConsignee?.phone) || '',
          consigneeContactPerson:
            editableConsignee.contactPerson || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.contactPerson : selectedConsignee?.contactPerson) || '',
          consigneeAddress: editableConsignee.address || 
            (copyBuyerToConsignee && selectedBuyer ? selectedBuyer.address : selectedConsignee?.address) || '',

          remarks: '', // Use otherReference as remarks
          otherReference: otherReference, // Also send in dedicated field

          totalQuantity: totalQty,
          totalAmount: parseFloat(totalAmount.toFixed(2)), // Round to 2 decimal places

          items: rows.map((row) => ({
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
            qty: row.qty || 0,
            amount: parseFloat((row.amount || 0).toFixed(2)), // Round to 2 decimal places
            igst: row.igst || 0,
            sgst: row.sgst || 0,
            cgst: row.cgst || 0,
            remarks: row.remarks,
            unit: row.unit || undefined,
            slitLine: row.slitLine || undefined,
            stitchLength: row.stitchLength || undefined,
            dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : undefined,
            isProcess: row.isProcess || false,
          })),
        };

        // Log the data being sent for debugging
        console.log('Sending sales order data:', createDto);
        await SalesOrderWebService.createSalesOrderWeb(createDto);
        toast.success('Success', 'Sales order created successfully');
      }
      
      navigate('/sales-orders');
    } catch (error: any) {
      console.error('Error submitting sales order:', error);
      toast.error('Error', error.message || 'Failed to save sales order. Please try again.');
    }
  };

  return (
    <div className="space-y-2 p-2">
      <Card className="text-xs p-2">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">{isEditMode ? 'Edit Sales Order' : 'Create Sales Order'}</h1>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Company & Voucher Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Company Details */}
          <Card className="text-xs">
            <CardHeader className="cursor-pointer py-1" onClick={() => toggleSection('company')}>
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Company</CardTitle>
                {expandedSections.company ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </CardHeader>
            {expandedSections.company && (
              <CardContent className="pt-0 space-y-1">
                {/* Company Selection Dropdown */}
                <Select 
                  value={selectedCompany.id} 
                  onValueChange={(value) => {
                    const company = companyOptions.find(c => c.id === value);
                    if (company) setSelectedCompany(company);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyOptions.map((company) => (
                      <SelectItem key={company.id} value={company.id} className="text-xs">
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Display selected company details */}
                <Input disabled value={selectedCompany.name} className="h-7 text-xs" />
                <div className="grid grid-cols-2 gap-1">
                  <Input
                    disabled
                    value={selectedCompany.gstin || 'GSTIN not available'}
                    className="h-7 text-xs"
                  />
                  <Input
                    disabled
                    value={selectedCompany.state || 'State not available'}
                    className="h-7 text-xs"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Voucher Details */}
          <Card className="text-xs">
            <CardHeader className="cursor-pointer py-1" onClick={() => toggleSection('voucher')}>
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
                      <SelectItem value="Sales Order" className="text-xs">
                        Sales Order
                      </SelectItem>
                      <SelectItem value="Purchase Order" className="text-xs">
                        Purchase Order
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={voucherNumber}
                    onChange={(e) => setVoucherNumber(e.target.value)}
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
                    <div className="grid grid-cols-2 gap-1">
                <Input
                  value={termsOfPayment}
                  onChange={(e) => setTermsOfPayment(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="Payment Terms"
                />
                {/* Other Reference Field */}
                <Input
                  value={otherReference}
                  onChange={(e) => setOtherReference(e.target.value)}
                  className="h-7 text-xs"
                  placeholder="Other Reference"
                />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Input
                    value={serialNo}
                   readOnly
                   
                    className="h-7 text-xs bg-gray-50 hidden"
                    placeholder="Serial No"
                  />
                  <Input
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Order No"
                    required
                  />

                  <Input
                    value={termsOfDelivery}
                    onChange={(e) => setTermsOfDelivery(e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Terms of Delivery"
                  />
                  <Input
                    value={dispatchThrough}
                    onChange={(e) => setDispatchThrough(e.target.value)}
                    className="h-7 text-xs"
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
            <CardHeader className="cursor-pointer py-1" onClick={() => toggleSection('buyer')}>
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Buyer (Bill To)</CardTitle>
                {expandedSections.buyer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </CardHeader>
            {expandedSections.buyer && (
              <CardContent className="pt-0 space-y-1">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={manualBuyerEntry}
                    onChange={(e) => setManualBuyerEntry(e.target.checked)}
                    className="rounded scale-75"
                  />
                  <span className="text-xs">Add Buyer Manually</span>
                </div>

                {!manualBuyerEntry ? (
                  <>
                    <EnhancedSearchSelect
                      options={customers}
                      value={selectedBuyer ? selectedBuyer.id.toString() : ''}
                      onValueChange={(v) =>
                        setSelectedBuyer(customers.find((b) => b.id.toString() === v) || null)
                      }
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
                              onChange={(e) =>
                                setEditableBuyer({ ...editableBuyer, gstin: e.target.value })
                              }
                              className="h-6 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">State</label>
                            <Input
                              value={editableBuyer.state}
                              onChange={(e) =>
                                setEditableBuyer({ ...editableBuyer, state: e.target.value })
                              }
                              className="h-6 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Contact</label>
                            <Input
                              value={editableBuyer.contactPerson}
                              onChange={(e) =>
                                setEditableBuyer({ ...editableBuyer, contactPerson: e.target.value })
                              }
                              className="h-6 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Phone</label>
                            <Input
                              value={editableBuyer.phone}
                              onChange={(e) =>
                                setEditableBuyer({ ...editableBuyer, phone: e.target.value })
                              }
                              className="h-6 text-xs"
                            />
                          </div>
                           <div className="col-span-2">
                        <label className="text-xs text-gray-600">Address</label>
                        <Textarea
                          value={editableBuyer.address}
                          onChange={(e) =>
                            setEditableBuyer({ ...editableBuyer, address: e.target.value })
                          }
                          className="h-12 text-xs"
                          placeholder="Address"
                        />
                      </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-1 bg-blue-50 rounded text-xs border mt-1">
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-xs text-gray-600">Name *</label>
                        <Input
                          value={editableBuyer.name}
                          onChange={(e) =>
                            setEditableBuyer({ ...editableBuyer, name: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="Buyer Name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">GSTIN</label>
                        <Input
                          value={editableBuyer.gstin}
                          onChange={(e) =>
                            setEditableBuyer({ ...editableBuyer, gstin: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="GSTIN"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">State</label>
                        <Input
                          value={editableBuyer.state}
                          onChange={(e) =>
                            setEditableBuyer({ ...editableBuyer, state: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Email</label>
                        <Input
                          value={editableBuyer.email}
                          onChange={(e) =>
                            setEditableBuyer({ ...editableBuyer, email: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="Email"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Contact Person</label>
                        <Input
                          value={editableBuyer.contactPerson}
                          onChange={(e) =>
                            setEditableBuyer({ ...editableBuyer, contactPerson: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="Contact Person"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Phone</label>
                        <Input
                          value={editableBuyer.phone}
                          onChange={(e) =>
                            setEditableBuyer({ ...editableBuyer, phone: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="Phone"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-600">Address</label>
                        <Textarea
                          value={editableBuyer.address}
                          onChange={(e) =>
                            setEditableBuyer({ ...editableBuyer, address: e.target.value })
                          }
                          className="h-12 text-xs"
                          placeholder="Address"
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
            <CardHeader className="cursor-pointer py-1" onClick={() => toggleSection('consignee')}>
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Consignee (Ship To)</CardTitle>
                {expandedSections.consignee ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </CardHeader>
            {expandedSections.consignee && (
              <CardContent className="pt-0 space-y-1">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={manualConsigneeEntry}
                    onChange={(e) => setManualConsigneeEntry(e.target.checked)}
                    className="rounded scale-75"
                  />
                  <span className="text-xs">Add Consignee Manually</span>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyBuyerDetailsToConsignee}
                    className="h-6 text-xs ml-auto"
                  >
                    Copy Buyer Details
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={copyBuyerToConsignee}
                    onChange={(e) => setCopyBuyerToConsignee(e.target.checked)}
                    className="rounded scale-75"
                  />
                  <span className="text-xs">Auto-copy Buyer to Consignee</span>
                </div>

                {!manualConsigneeEntry ? (
                  <>
                    <EnhancedSearchSelect
                      options={customers}
                      value={selectedConsignee ? selectedConsignee.id.toString() : ''}
                      onValueChange={(v) =>
                        setSelectedConsignee(customers.find((c) => c.id.toString() === v) || null)
                      }
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
                              onChange={(e) =>
                                setEditableConsignee({ ...editableConsignee, gstin: e.target.value })
                              }
                              className="h-6 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">State</label>
                            <Input
                              value={editableConsignee.state}
                              onChange={(e) =>
                                setEditableConsignee({ ...editableConsignee, state: e.target.value })
                              }
                              className="h-6 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Contact</label>
                            <Input
                              value={editableConsignee.contactPerson}
                              onChange={(e) =>
                                setEditableConsignee({
                                  ...editableConsignee,
                                  contactPerson: e.target.value,
                                })
                              }
                              className="h-6 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Phone</label>
                            <Input
                              value={editableConsignee.phone}
                              onChange={(e) =>
                                setEditableConsignee({ ...editableConsignee, phone: e.target.value })
                              }
                              className="h-6 text-xs"
                            />
                          </div>
                             <div className="col-span-2">
                        <label className="text-xs text-gray-600">Address</label>
                        <Textarea
                          value={editableConsignee.address}
                          onChange={(e) =>
                            setEditableConsignee({ ...editableConsignee, address: e.target.value })
                          }
                          className="h-12 text-xs"
                          placeholder="Address"
                        />
                      </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-1 bg-green-50 rounded text-xs border mt-1">
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-xs text-gray-600">Name *</label>
                        <Input
                          value={editableConsignee.name}
                          onChange={(e) =>
                            setEditableConsignee({ ...editableConsignee, name: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="Consignee Name"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">GSTIN</label>
                        <Input
                          value={editableConsignee.gstin}
                          onChange={(e) =>
                            setEditableConsignee({ ...editableConsignee, gstin: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="GSTIN"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">State</label>
                        <Input
                          value={editableConsignee.state}
                          onChange={(e) =>
                            setEditableConsignee({ ...editableConsignee, state: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Email</label>
                        <Input
                          value={editableConsignee.email}
                          onChange={(e) =>
                            setEditableConsignee({ ...editableConsignee, email: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="Email"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Contact Person</label>
                        <Input
                          value={editableConsignee.contactPerson}
                          onChange={(e) =>
                            setEditableConsignee({
                              ...editableConsignee,
                              contactPerson: e.target.value,
                            })
                          }
                          className="h-6 text-xs"
                          placeholder="Contact Person"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Phone</label>
                        <Input
                          value={editableConsignee.phone}
                          onChange={(e) =>
                            setEditableConsignee({ ...editableConsignee, phone: e.target.value })
                          }
                          className="h-6 text-xs"
                          placeholder="Phone"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-600">Address</label>
                        <Textarea
                          value={editableConsignee.address}
                          onChange={(e) =>
                            setEditableConsignee({ ...editableConsignee, address: e.target.value })
                          }
                          className="h-12 text-xs"
                          placeholder="Address"
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
              <CardTitle className="text-sm">Order Items <span className="text-red-500 text-xs">* Required fields</span></CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addRow()}
                className="h-7 text-xs"
              >
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
                    <label className="text-xs text-gray-600">Item *</label>
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
                      onChange={(e) => updateRow(index, 'hsncode', e.target.value)}
                      className="h-7 text-xs"
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
                      onChange={(e) => updateRow(index, 'yarnCount', e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Yarn Count"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Dia</label>
                    <Input
                      type="number"
                      value={row.dia || ''}
                      onChange={(e) => updateRow(index, 'dia', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="Dia"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">GG</label>
                    <Input
                      type="number"
                      value={row.gg || ''}
                      onChange={(e) => updateRow(index, 'gg', Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="GG"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Fabric Type *</label>
                    <SearchableFabricTypeSelect
                      value={row.fabricType}
                      onValueChange={(value) => updateRow(index, 'fabricType', value)}
                      placeholder="Fabric Type"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Slit Line *</label>
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
                      onChange={(e) => updateRow(index, 'stitchLength', e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Stitch Length"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Composition</label>
                    <Input
                      value={row.composition}
                      onChange={(e) => updateRow(index, 'composition', e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Composition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Due Date</label>
                    <Input
                      type="date"
                      value={row.dueDate || ''}
                      onChange={(e) => updateRow(index, 'dueDate', e.target.value)}
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
                      value={row.wtPerRoll || ''}
                      onChange={(e) => updateRow(index, 'wtPerRoll', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="WT/Roll"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Rolls</label>
                    <Input
                      type="number"
                      value={row.noOfRolls || ''}
                      onChange={(e) => updateRow(index, 'noOfRolls', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="Rolls"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Rate *</label>
                    <Input
                      type="number"
                      value={row.rate || ''}
                      onChange={(e) => updateRow(index, 'rate', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="Rate"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Qty *</label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        value={row.qty || ''}
                        onChange={(e) => updateRow(index, 'qty', e.target.value === '' ? 0 : Number(e.target.value))}
                        className="h-7 text-xs flex-1"
                        placeholder="Qty"
                      />
                      <Input
                        value={row.unit || ''}
                        onChange={(e) => updateRow(index, 'unit', e.target.value)}
                        className="h-7 text-xs w-12"
                        placeholder="Unit"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Amount</label>
                    <Input
                      disabled
                      value={row.amount || ''}
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
                      value={row.igst || ''}
                      onChange={(e) => updateRow(index, 'igst', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="IGST%"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">SGST%</label>
                    <Input
                      type="number"
                      value={row.sgst || ''}
                      onChange={(e) => updateRow(index, 'sgst', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="SGST%"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">CGST%</label>
                    <Input
                      type="number"
                      value={row.cgst || ''}
                      onChange={(e) => updateRow(index, 'cgst', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="h-7 text-xs"
                      placeholder="CGST%"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Remarks</label>
                    <Input
                      value={row.remarks}
                      onChange={(e) => updateRow(index, 'remarks', e.target.value)}
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
                  <div>
                    <span className="font-medium">Items:</span> {rows.length}
                  </div>
                  <div>
                    <span className="font-medium">Total Qty:</span> {totalQty}
                  </div>
                  <div className="font-bold">Total: ₹{totalAmount.toLocaleString()}</div>
                </div>
              </div>
            )}
          </CardContent>
          <Separator className="my-2" />
          <CardFooter>
            <div className="flex space-x-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/sales-orders')}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" onClick={handleSubmit} className="h-7 text-xs">
                <Save className="h-3 w-3 mr-1" />
                {isEditMode ? 'Update' : 'Save'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default CreateSalesOrder;