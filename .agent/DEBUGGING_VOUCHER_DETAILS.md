# Quick Debugging Guide - Voucher Details Not Loading

## Immediate Steps to Debug

### 1. Open Browser Console
Press `F12` or right-click → Inspect → Console tab

### 2. Navigate to Edit Mode
Click "Edit" button on any sales order

### 3. Check Console Output
Look for this log message:
```
Loaded sales order data: { ... }
```

### 4. Verify the Data Structure
The console log will show you the exact data received from the API. Check if these fields exist:

**Required Voucher Fields:**
- ✅ `voucherType` - Should be "Sales Order" or similar
- ✅ `voucherNumber` - Should be like "AKF/24-25/A0001"
- ✅ `orderDate` - Should be an ISO date string
- ✅ `termsOfPayment` - Payment terms text
- ✅ `isJobWork` - Boolean (true/false)
- ✅ `serialNo` - Serial number string
- ✅ `orderNo` - Order number
- ✅ `termsOfDelivery` - Delivery terms
- ✅ `dispatchThrough` - Dispatch method
- ✅ `otherReference` - Other reference text

## Common Issues and Solutions

### Issue 1: Console shows `undefined` for some fields
**Cause**: The API is not returning those fields
**Solution**: Check your backend API response and ensure all fields are included

### Issue 2: Console shows `null` for some fields
**Cause**: The database has NULL values for those fields
**Solution**: This is normal for optional fields. The component handles this with `|| ''`

### Issue 3: No console log appears
**Cause**: The `loadSalesOrderData` function is not being called
**Possible reasons**:
- The route parameter `orderId` is not being passed
- The `useEffect` condition is not met (customers or items not loaded)
- There's an error before the log statement

**Debug**:
Add this temporary log at line 488:
```typescript
useEffect(() => {
  console.log('Edit mode check:', { isEditMode, orderId, customersCount: customers.length, itemsCount: items.length });
  if (isEditMode && orderId && customers.length > 0 && items.length > 0) {
    loadSalesOrderData(parseInt(orderId));
  }
}, [isEditMode, orderId, customers, items]);
```

### Issue 4: Console shows error
**Cause**: API call failed
**Solution**: 
- Check network tab for failed requests
- Verify the API endpoint URL
- Check if the orderId is valid
- Verify authentication/authorization

## Field Mapping Reference

| UI Field | State Variable | API Field |
|----------|---------------|-----------|
| Voucher Type | `voucherType` | `salesOrder.voucherType` |
| Voucher Number | `voucherNumber` | `salesOrder.voucherNumber` |
| Order Date | `orderDate` | `salesOrder.orderDate` |
| Payment Terms | `termsOfPayment` | `salesOrder.termsOfPayment` |
| Job Work | `isJobWork` | `salesOrder.isJobWork` |
| Serial No | `serialNo` | `salesOrder.serialNo` |
| Order No | `orderNo` | `salesOrder.orderNo` |
| Terms of Delivery | `termsOfDelivery` | `salesOrder.termsOfDelivery` |
| Dispatch Through | `dispatchThrough` | `salesOrder.dispatchThrough` |
| Other Reference | `otherReference` | `salesOrder.otherReference` |

## What to Share for Further Help

If the issue persists, please share:
1. **Console log output** - Copy the entire "Loaded sales order data: {...}" log
2. **Network request** - From Network tab, copy the API response
3. **Any error messages** - From console or network tab
4. **Screenshot** - Of the edit page showing empty fields

## Example of Correct Console Output

```javascript
Loaded sales order data: {
  id: 1,
  voucherType: "Sales Order",
  voucherNumber: "AKF/24-25/A0001",
  orderDate: "2024-12-21T00:00:00Z",
  termsOfPayment: "30 days",
  isJobWork: false,
  serialNo: "0001",
  orderNo: "SO-001",
  termsOfDelivery: "FOB",
  dispatchThrough: "Road",
  otherReference: "Ref-123",
  companyName: "Avyaan Knitfab",
  companyGSTIN: "27AABCA1234D1Z5",
  // ... more fields
}
```

If your console output looks different, that's the issue!
