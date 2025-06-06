
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Order } from '../types';
import { parseOrderFile, exportOrdersToExcel, fetchAndParseGoogleSheet } from '../services/fileHandler';

const ROWS_PER_PAGE = 100;
const GOOGLE_SHEET_URL_KEY = 'projectOrdersGoogleSheetUrl';
const LAST_REFRESH_TIME_KEY = 'projectOrdersLastRefreshTime';
const DEFAULT_GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1PgyDPC8yDhZMxRua2WQ7KtUrSPaWVHs4yN0_T4k7dNM/edit?usp=sharing";

const AUTO_REFRESH_IS_ENABLED = true;
const REFRESH_INTERVAL_FIXED_SECONDS = 60;


// --- SVG Icons --- (Consolidated for brevity in this example, actual icons are separate)
const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" /></svg>;
const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const CloudArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>;
const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const CancelIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const ChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
const CashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>;
const ShoppingCartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>;
const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>;
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
// --- End SVG Icons ---

interface OrdersPageProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

interface TableHeader {
  key: keyof Order | 'actions' | 'serialNo';
  label: string;
  isEditable?: boolean;
  className?: string; // For custom cell styling (e.g., text alignment)
}

const OrdersPage: React.FC<OrdersPageProps> = ({ orders, setOrders }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(
    () => localStorage.getItem(GOOGLE_SHEET_URL_KEY) || DEFAULT_GOOGLE_SHEET_URL
  );
  
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(() => {
    const savedTime = localStorage.getItem(LAST_REFRESH_TIME_KEY);
    return savedTime ? new Date(savedTime) : null;
  });

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editedOrderData, setEditedOrderData] = useState<Partial<Order> | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const autoRefreshIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(GOOGLE_SHEET_URL_KEY, googleSheetUrl);
  }, [googleSheetUrl]);
  
  useEffect(() => {
    if (lastRefreshTime) {
      localStorage.setItem(LAST_REFRESH_TIME_KEY, lastRefreshTime.toISOString());
    } else {
      localStorage.removeItem(LAST_REFRESH_TIME_KEY);
    }
  }, [lastRefreshTime]);


  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000); // Longer for errors
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const newOrders = await parseOrderFile(file);
      setOrders(prevOrders => [...prevOrders, ...newOrders]);
      setSuccessMessage(`${newOrders.length} orders imported successfully from ${file.name}.`);
      setCurrentPage(1);
    } catch (err) {
      console.error("File upload error details:", err);
      setError(err instanceof Error ? err.message : 'Failed to parse file.');
    } finally {
      setIsLoading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [setOrders]);


  const performGoogleSheetLoad = useCallback(async (isAutoRefresh: boolean = false) => {
    if (!googleSheetUrl.trim()) {
      if (!isAutoRefresh) setError("Please enter a Google Sheet URL.");
      return false;
    }
    const sheetIdRegex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = googleSheetUrl.match(sheetIdRegex);
    if (!match || !match[1]) {
      const errMsg = "Invalid Google Sheet URL. Ensure it's a valid link (e.g., https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit).";
      if (!isAutoRefresh) setError(errMsg);
      else console.warn("Auto-refresh: " + errMsg);
      return false;
    }
    const sheetId = match[1];

    if (!isAutoRefresh) setIsLoading(true);
    if (!isAutoRefresh) setError(null);
    if (!isAutoRefresh) setSuccessMessage(null);

    try {
      const newOrders = await fetchAndParseGoogleSheet(sheetId);
      setOrders(newOrders);
      if (!isAutoRefresh) setSuccessMessage(`${newOrders.length} orders loaded successfully from Google Sheet.`);
      setLastRefreshTime(new Date());
      setCurrentPage(1);
      return true;
    } catch (err) {
      let detailedErrorMessage = 'An unknown error occurred while loading data from Google Sheet.';
      if (err instanceof Error) {
        console.error(`Google Sheet load error details (auto-refresh: ${isAutoRefresh}):`, err.message, err);
        if (err.message.startsWith('Failed to fetch Google Sheet. Status:')) {
          detailedErrorMessage = `${err.message} Ensure URL is correct & sheet is public ('Anyone with the link can view').`;
        } else if (err.message.toLowerCase().includes('failed to fetch')) {
          detailedErrorMessage = `Network Error: "${err.message}". CRITICAL: Ensure Google Sheet sharing is "Anyone with the link can view". Check internet/firewall.`;
        } else {
          detailedErrorMessage = err.message;
        }
      } else {
         console.error(`Google Sheet load error (non-Error object, auto-refresh: ${isAutoRefresh}):`, err);
      }
      if (!isAutoRefresh) setError(detailedErrorMessage);
      else console.warn(`Auto-refresh error: ${detailedErrorMessage}`);
      return false;
    } finally {
      if (!isAutoRefresh) setIsLoading(false);
    }
  }, [googleSheetUrl, setOrders, setError, setSuccessMessage, setCurrentPage]);


  useEffect(() => {
    const clearCurrentInterval = () => {
      if (autoRefreshIntervalRef.current !== null) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };

    if (AUTO_REFRESH_IS_ENABLED && googleSheetUrl.trim()) {
      clearCurrentInterval(); 
      if (orders.length === 0 || !lastRefreshTime) {
          console.log(`Auto-refresh (fixed @${REFRESH_INTERVAL_FIXED_SECONDS}s): Performing initial load or data is stale/missing.`);
          performGoogleSheetLoad(true);
      }
      
      autoRefreshIntervalRef.current = window.setInterval(() => {
        console.log(`Auto-refresh (fixed @${REFRESH_INTERVAL_FIXED_SECONDS}s): Attempting fetch from Google Sheet at ${new Date().toLocaleTimeString()}`);
        performGoogleSheetLoad(true);
      }, REFRESH_INTERVAL_FIXED_SECONDS * 1000);

    } else {
      clearCurrentInterval();
    }

    return () => { 
      clearCurrentInterval();
    };
  }, [googleSheetUrl, performGoogleSheetLoad, orders.length, lastRefreshTime]);


  const handleManualLoadSheet = useCallback(() => {
    performGoogleSheetLoad(false);
  }, [performGoogleSheetLoad]);

  const handleExport = useCallback(() => {
    if (orders.length === 0) {
      setError("No data to export.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      exportOrdersToExcel(orders, `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      setSuccessMessage("Orders exported successfully.");
    } catch (err) {
       console.error("Export error details:",err);
       setError(err instanceof Error ? err.message : 'Failed to export data.');
    } finally {
      setIsLoading(false);
    }
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return orders.filter(order =>
      Object.values(order).some(value =>
        String(value).toLowerCase().includes(lowerSearchTerm)
      )
    );
  }, [orders, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / ROWS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const dashboardMetrics = useMemo(() => {
    const uniqueOrderNos = new Set(orders.map(order => order.orderNo));
    const totalOrderCount = uniqueOrderNos.size;
    const totalSellPrice = orders.reduce((sum, order) => sum + (order.exportValue || 0), 0);
    const totalPurchasePrice = orders.reduce((sum, order) => sum + (order.importValue || 0), 0);
    return {
      totalOrderCount,
      totalSellPrice,
      totalPurchasePrice,
    };
  }, [orders]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const orderTableHeaders: TableHeader[] = [
    { key: 'serialNo', label: 'S.No', className: 'w-16 text-center' },
    { key: 'status', label: 'Status', isEditable: false, className: 'w-28' },
    { key: 'orderNo', label: 'Order No', isEditable: true, className: 'w-36' },
    { key: 'segment', label: 'Segment', isEditable: true, className: 'w-32' },
    { key: 'subSegment', label: 'Sub Segment', isEditable: true, className: 'w-32' },
    { key: 'customerName', label: 'Customer', isEditable: true, className: 'min-w-[150px]' },
    { key: 'country', label: 'Country', isEditable: true, className: 'w-28' },
    { key: 'product', label: 'Product', isEditable: true, className: 'min-w-[200px]' },
    { key: 'bonhoefferCode', label: 'B. Code', isEditable: true, className: 'w-32' },
    { key: 'qty', label: 'Qty', isEditable: true, className: 'w-20 text-right' },
    { key: 'unitPrice', label: 'Sell Price', isEditable: true, className: 'w-32 text-right' },
    { key: 'exportValue', label: 'Total Sell', isEditable: true, className: 'w-32 text-right' },
    { key: 'supplier', label: 'Supplier', isEditable: true, className: 'min-w-[150px]' },
    { key: 'priceInUSD', label: 'Purchase Price', isEditable: true, className: 'w-36 text-right' },
    { key: 'importValue', label: 'Total Purchase', isEditable: true, className: 'w-36 text-right' },
    { key: 'gp', label: 'GP (USD)', isEditable: true, className: 'w-28 text-right' },
    { key: 'gpPercentage', label: 'GP %', isEditable: true, className: 'w-24 text-right' },
    { key: 'actions', label: 'Actions', className: 'w-28 text-center sticky right-0 bg-slate-200/70 z-30' }, // Changed: opaque bg, higher z-index
  ];

  const handleEditClick = useCallback((order: Order) => {
    setEditingOrderId(order.id);
    setEditedOrderData({ ...order });
  }, []);

  const handleCancelClick = useCallback(() => {
    setEditingOrderId(null);
    setEditedOrderData(null);
  }, []);

  const handleSaveClick = useCallback(() => {
    if (!editingOrderId || !editedOrderData) return;

    const updatedOrders = orders.map(order => {
      if (order.id === editingOrderId) {
        const finalEditedOrder: Order = { ...order };
        for (const key of Object.keys(editedOrderData) as Array<keyof Order>) {
          if (key === 'id') continue;
          let value = editedOrderData[key];
          if (['qty', 'unitPrice', 'exportValue', 'priceInUSD', 'importValue', 'gp'].includes(key)) {
            (finalEditedOrder[key] as any) = parseFloat(String(value)) || 0;
          } else if (key === 'gpPercentage') {
            if (typeof value === 'number') {
                (finalEditedOrder[key] as any) = `${value.toFixed(2)}%`;
            } else if (typeof value === 'string') {
                const numVal = parseFloat(String(value).replace('%', '').replace(/,/g, ''));
                (finalEditedOrder[key] as any) = isNaN(numVal) ? '0.00%' : `${numVal.toFixed(2)}%`;
            } else {
                (finalEditedOrder[key] as any) = '0.00%';
            }
          } else {
            (finalEditedOrder[key] as any) = String(value === null || value === undefined ? "" : value).trim();
          }
        }
        return finalEditedOrder;
      }
      return order;
    });

    setOrders(updatedOrders);
    setEditingOrderId(null);
    setEditedOrderData(null);
    setSuccessMessage('Order updated successfully.');
  }, [editingOrderId, editedOrderData, orders, setOrders]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, fieldKey: keyof Order) => {
    if (!editedOrderData) return;
    const { value, type } = event.target;
    let processedValue: string | number = value;

    if (fieldKey === 'gpPercentage') {
        processedValue = value; 
    } else if (type === 'number') {
      processedValue = value === '' ? '' : parseFloat(value);
    }

    setEditedOrderData(prev => ({ ...prev, [fieldKey]: processedValue }));
  }, [editedOrderData]);

  const getInputType = (key: keyof Order): string => {
    if (['qty', 'unitPrice', 'exportValue', 'priceInUSD', 'importValue', 'gp'].includes(key)) {
      return 'number';
    }
    if (key === 'gpPercentage') return 'text'; 
    return 'text';
  };

  const getDisplayValue = (order: Order, fieldKey: keyof Order): string | JSX.Element => {
    const value = order[fieldKey];
    if (value === null || value === undefined) {
      return fieldKey === 'status' ? <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">N/A</span> : '';
    }
    if (typeof value === 'number' && ['unitPrice', 'exportValue', 'priceInUSD', 'importValue', 'gp'].includes(fieldKey)) {
      return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
     if (fieldKey === 'gpPercentage' && typeof value === 'string' && !value.includes('%')) {
        const numVal = parseFloat(value);
        return isNaN(numVal) ? value : `${numVal.toFixed(2)}%`;
    }
    if (fieldKey === 'status') {
        let bgColor = 'bg-slate-200'; let textColor = 'text-slate-700'; // Darker text for status
        const lowerStatus = String(value).toLowerCase();
        if (lowerStatus === 'completed' || lowerStatus === 'delivered') { bgColor = 'bg-green-100'; textColor = 'text-green-800'; }
        else if (lowerStatus === 'pending' || lowerStatus === 'processing') { bgColor = 'bg-amber-100'; textColor = 'text-amber-800'; }
        else if (lowerStatus === 'cancelled' || lowerStatus === 'failed') { bgColor = 'bg-red-100'; textColor = 'text-red-800'; }
        return <span className={`text-xs font-medium ${bgColor} ${textColor} px-2.5 py-1 rounded-full`}>{String(value)}</span>;
    }
    return String(value);
  };

  const getEditableValue = (orderData: Partial<Order>, fieldKey: keyof Order): string | number => {
      const value = orderData[fieldKey];
      if (fieldKey === 'gpPercentage' && typeof value === 'string') {
          return value.includes('%') ? value.replace('%', '') : value;
      }
      return value ?? '';
  };


  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <header className="mb-2">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Orders Dashboard</h1>
        <p className="text-lg text-slate-700 mt-1">Manage, import, and analyze your order data efficiently.</p>
      </header>

      {/* Alert Messages */}
      {error && (
        <div className="fixed top-20 right-5 z-[100] w-full max-w-md p-1" role="alert">
            <div className="bg-red-600 text-white font-semibold rounded-t-lg px-4 py-2 shadow-xl flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Error Occurred
            </div>
            <div className="border border-t-0 border-red-500 rounded-b-lg bg-red-100 px-4 py-3 text-red-700 shadow-xl">
                <p className="whitespace-pre-wrap text-sm">{error}</p>
            </div>
        </div>
      )}
      {successMessage && (
        <div className="fixed top-20 right-5 z-[100] w-full max-w-md p-1" role="alert">
            <div className="bg-green-600 text-white font-semibold rounded-t-lg px-4 py-2 shadow-xl flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Success
            </div>
            <div className="border border-t-0 border-green-500 rounded-b-lg bg-green-100 px-4 py-3 text-green-700 shadow-xl">
                <p className="text-sm">{successMessage}</p>
            </div>
        </div>
      )}

      {/* Control Panel */}
      <section aria-labelledby="control-panel-title" className="bg-white p-6 rounded-xl shadow-2xl space-y-6">
        <h2 id="control-panel-title" className="sr-only">Data Controls</h2>
        
        {/* Google Sheet Section */}
        <div className="p-5 border border-slate-200 rounded-lg bg-slate-50/50 shadow-sm">
          <div className="flex items-center mb-3">
            <RefreshIcon className="w-6 h-6 mr-2 text-sky-600" />
            <h3 className="text-lg font-semibold text-slate-800">
             Google Sheet Integration 
             <span className="ml-2 text-xs font-medium bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                Auto-Refresh @ {REFRESH_INTERVAL_FIXED_SECONDS}s
             </span>
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="google-sheet-url" className="block text-sm font-medium text-slate-700 mb-1">
                Sheet URL
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="google-sheet-url"
                  type="url"
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  placeholder="Paste Google Sheet URL here"
                  className={`flex-grow px-3.5 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-all duration-150 ${isLoading || AUTO_REFRESH_IS_ENABLED ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                  disabled={isLoading || (AUTO_REFRESH_IS_ENABLED && !!googleSheetUrl.trim())}
                  aria-label="Google Sheet URL"
                />
                <button
                  onClick={handleManualLoadSheet}
                  disabled={isLoading || !googleSheetUrl.trim() || AUTO_REFRESH_IS_ENABLED}
                  className={`inline-flex items-center px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-150 ease-in-out transform hover:scale-105 ${isLoading || !googleSheetUrl.trim() || AUTO_REFRESH_IS_ENABLED ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title="Manual load is disabled while auto-refresh is active with a URL."
                >
                  <CloudArrowDownIcon className="w-5 h-5 mr-2"/>
                  {isLoading && !AUTO_REFRESH_IS_ENABLED ? 'Loading...' : 'Load'}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                Ensure sheet is public ('Anyone with the link can view'). Uses the first visible sheet.
              </p>
            </div>
             {lastRefreshTime && (
                <p className="text-xs text-slate-600 pt-2.5 border-t border-slate-200 mt-3">
                  <span className="font-medium">Last synced:</span> {lastRefreshTime.toLocaleString()}
                </p>
              )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-5 border-t border-slate-200">
          <div>
            <label htmlFor="file-upload-orders" className={`inline-flex items-center px-5 py-3 bg-sky-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 cursor-pointer transition-all duration-150 ease-in-out transform hover:scale-105 ${isLoading && !AUTO_REFRESH_IS_ENABLED ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <UploadIcon className="w-5 h-5 mr-2.5" />
              {isLoading && AUTO_REFRESH_IS_ENABLED ? 'Syncing...' : (isLoading ? 'Importing...' : 'Import Orders File')}
            </label>
            <input id="file-upload-orders" type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".csv,.xls,.xlsx" disabled={isLoading && !AUTO_REFRESH_IS_ENABLED} />
            <p className="mt-1.5 text-xs text-slate-600">Appends data from CSV/Excel files.</p>
          </div>
          <div className="flex md:justify-end">
            <button
              onClick={handleExport}
              disabled={isLoading || orders.length === 0}
              className={`inline-flex items-center px-5 py-3 bg-slate-700 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-150 ease-in-out transform hover:scale-105 ${isLoading || orders.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <DownloadIcon className="w-5 h-5 mr-2.5" />
              Export to Excel
            </button>
          </div>
        </div>
        
         <div className="pt-5 border-t border-slate-200 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search all orders (e.g., by Order No, Customer, Product...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3.5 py-3 pl-10 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 w-full text-sm transition-all duration-150"
              aria-label="Search orders"
            />
          </div>
      </section>


      {/* Dashboard Overview Section */}
      <section aria-labelledby="dashboard-overview-title" className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <h2 id="dashboard-overview-title" className="sr-only">Key Metrics Overview</h2>
        {[
          { title: 'Total Unique Orders', value: dashboardMetrics.totalOrderCount, icon: <ShoppingCartIcon className="w-7 h-7" />, bgColor: 'bg-sky-500', lightBg: 'bg-sky-100', textColor: 'text-sky-800' },
          { title: 'Total Sell Value (USD)', value: dashboardMetrics.totalSellPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <CashIcon className="w-7 h-7" />, bgColor: 'bg-green-500', lightBg: 'bg-green-100', textColor: 'text-green-800' },
          { title: 'Total Purchase Value (USD)', value: dashboardMetrics.totalPurchasePrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), icon: <ChartBarIcon className="w-7 h-7" />, bgColor: 'bg-amber-500', lightBg: 'bg-amber-100', textColor: 'text-amber-800' },
        ].map(metric => (
          <div key={metric.title} className={`${metric.lightBg} p-6 rounded-xl shadow-lg flex items-center space-x-4 transition-all duration-300 hover:shadow-xl hover:scale-105`}>
            <div className={`p-3.5 ${metric.bgColor} text-white rounded-full`}>
              {metric.icon}
            </div>
            <div>
              <p className={`text-sm ${metric.textColor} font-semibold`}>{metric.title}</p>
              <p className={`text-3xl font-bold ${metric.textColor}`}>{metric.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Orders Table Section */}
      <section aria-labelledby="orders-table-title" className="bg-white rounded-xl shadow-2xl overflow-hidden">
        <h2 id="orders-table-title" className="sr-only">Detailed Orders List</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-800">
            <thead className="text-xs text-slate-800 uppercase bg-slate-200/70 sticky top-0 z-20"> {/* Header z-index */}
              <tr>
                {orderTableHeaders.map(header => (
                  <th key={header.key.toString()} scope="col" className={`px-4 py-3.5 whitespace-nowrap tracking-wider font-semibold ${header.className || ''}`}>
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order, paginatedIndex) => {
                  const isEditing = order.id === editingOrderId;
                  return (
                    <tr key={order.id} className={`transition-colors duration-150 ${isEditing ? 'bg-sky-50 ring-2 ring-sky-400 z-20 relative' : (paginatedIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/70')} hover:bg-sky-50/50`}>
                      {orderTableHeaders.map(header => {
                        const cellClassName = `px-4 py-2.5 whitespace-nowrap ${header.className || ''} ${isEditing && header.isEditable ? 'py-1.5' : ''}`;
                        if (header.key === 'actions') {
                          return (
                            <td key={`${order.id}-actions`} className={`${cellClassName} sticky right-0 ${isEditing ? 'bg-sky-50' : (paginatedIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/70')} group-hover:bg-sky-50/50 z-10`}> {/* Cell z-index */}
                              {isEditing ? (
                                <div className="flex items-center space-x-2 justify-center">
                                  <button onClick={handleSaveClick} className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-100 rounded-md transition-all" aria-label="Save changes">
                                    <SaveIcon className="w-5 h-5" />
                                  </button>
                                  <button onClick={handleCancelClick} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md transition-all" aria-label="Cancel editing">
                                    <CancelIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => handleEditClick(order)}
                                    className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    disabled={editingOrderId !== null && editingOrderId !== order.id}
                                    aria-label={`Edit order ${order.orderNo}`}
                                  >
                                    <EditIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        }

                        if (header.key === 'serialNo') {
                          return (
                             <td key={`${order.id}-serialNo`} className={cellClassName}>
                              {(currentPage - 1) * ROWS_PER_PAGE + paginatedIndex + 1}
                            </td>
                          );
                        }

                        const fieldKey = header.key as keyof Order;
                        return (
                          <td key={`${order.id}-${fieldKey}`} className={cellClassName}>
                            {isEditing && header.isEditable && editedOrderData ? (
                              <input
                                type={getInputType(fieldKey)}
                                value={getEditableValue(editedOrderData, fieldKey)}
                                onChange={(e) => handleInputChange(e, fieldKey)}
                                className="px-2 py-1.5 border border-slate-300 rounded-md w-full text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition duration-150 ease-in-out bg-white shadow-sm"
                                aria-label={`Edit ${header.label} for order ${order.orderNo}`}
                                step={getInputType(fieldKey) === 'number' ? 'any' : undefined}
                              />
                            ) : (
                              getDisplayValue(order, fieldKey)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={orderTableHeaders.length} className="px-6 py-12 text-center text-slate-600">
                    {isLoading ? 'Loading data...' : (orders.length === 0 ? 'No orders found. Import a file or load from Google Sheet to get started.' : 'No orders match your search criteria.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredOrders.length > ROWS_PER_PAGE && (
           <div className="px-4 py-4 flex items-center justify-between border-t border-slate-200 bg-white sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
                <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors">Previous</button>
                <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading} className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors">Next</button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-800">
                    Showing <span className="font-semibold">{Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, filteredOrders.length)}</span> to <span className="font-semibold">{Math.min(currentPage * ROWS_PER_PAGE, filteredOrders.length)}</span> of <span className="font-semibold">{filteredOrders.length}</span> results
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                    <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                        <span className="sr-only">Previous</span>
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border-y border-slate-300 bg-white text-sm font-medium text-slate-800">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading} className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                        <span className="sr-only">Next</span>
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                    </nav>
                </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default OrdersPage;
