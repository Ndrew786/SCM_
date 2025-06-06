
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Order, SupplierPriceEntry } from '../types';
import { normalizeHeader } from '../services/fileHandler';
import { GoogleGenAI } from "@google/genai";
import HorizontalBarChart from './HorizontalBarChart';

const ROWS_PER_PAGE = 100;

// --- SVG Icons --- (Consolidated for brevity)
const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const CancelIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" /></svg>;
const PresentationChartLineIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 21h16.5M16.5 3.75h.008v.008H16.5V3.75zM9.75 3.75h.008v.008H9.75V3.75zM5.25 3.75h.008v.008H5.25V3.75zM3.75 3.75H20.25M11.25 10.5l-3.75 3.75M16.5 10.5l-3.75 3.75" /></svg>;
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
// --- End SVG Icons ---

interface SupplierPricePageProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

interface TableHeader {
  key: keyof SupplierPriceEntry | 'actions' | 'serialNo';
  label: string;
  isEditable?: boolean;
  className?: string;
}

interface LookupResultItem {
  inputBonhoefferCode: string;
  supplierName: string;
  purchasePriceUSD: number | string;
  orderNo: string;
}

export const SupplierPricePage: React.FC<SupplierPricePageProps> = ({ orders, setOrders }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingEntryKey, setEditingEntryKey] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<Pick<SupplierPriceEntry, 'supplierName' | 'bonhoefferCode' | 'lowestPurchasePriceUSD' | 'contributingOrderId'>>>({});

  const [isProcessingCodeFile, setIsProcessingCodeFile] = useState(false);
  const [codeFileError, setCodeFileError] = useState<string | null>(null);
  const [codeFileMessage, setCodeFileMessage] = useState<string | null>(null);
  const codeFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (codeFileError) {
      const timer = setTimeout(() => { setCodeFileError(null); setCodeFileMessage(null); }, 7000);
      return () => clearTimeout(timer);
    }
  }, [codeFileError]);
  
  useEffect(() => {
    if (codeFileMessage && !codeFileError) {
      const timer = setTimeout(() => setCodeFileMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [codeFileMessage, codeFileError]);

  const supplierPriceData = useMemo((): SupplierPriceEntry[] => {
    const priceMap = new Map<string, SupplierPriceEntry>();
    orders.forEach(order => {
      if (!order.supplier || !order.bonhoefferCode || typeof order.priceInUSD !== 'number') return; 
      const key = `${order.supplier}-${order.bonhoefferCode}`;
      const currentLowestEntry = priceMap.get(key);
      if (!currentLowestEntry || order.priceInUSD < currentLowestEntry.lowestPurchasePriceUSD) {
        priceMap.set(key, {
          key: key,
          supplierName: order.supplier,
          bonhoefferCode: order.bonhoefferCode,
          lowestPurchasePriceUSD: order.priceInUSD,
          orderNoAtLowestPrice: order.orderNo,
          contributingOrderId: order.id,
        });
      } else if (order.priceInUSD === currentLowestEntry.lowestPurchasePriceUSD) {
        priceMap.set(key, {
          ...currentLowestEntry,
          orderNoAtLowestPrice: order.orderNo, 
          contributingOrderId: order.id, 
        });
      }
    });
    return Array.from(priceMap.values()).sort((a,b) => a.supplierName.localeCompare(b.supplierName) || a.bonhoefferCode.localeCompare(b.bonhoefferCode));
  }, [orders]);

  const topSuppliersData = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const supplierTotals = new Map<string, number>();
    orders.forEach(order => {
      if (order.supplier && typeof order.importValue === 'number') {
        supplierTotals.set(order.supplier, (supplierTotals.get(order.supplier) || 0) + order.importValue);
      }
    });
    return Array.from(supplierTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [orders]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return supplierPriceData;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return supplierPriceData.filter(entry =>
      entry.supplierName.toLowerCase().includes(lowerSearchTerm) ||
      entry.bonhoefferCode.toLowerCase().includes(lowerSearchTerm) ||
      entry.orderNoAtLowestPrice.toLowerCase().includes(lowerSearchTerm) ||
      String(entry.lowestPurchasePriceUSD).toLowerCase().includes(lowerSearchTerm)
    );
  }, [supplierPriceData, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const tableHeaders: TableHeader[] = [
    { key: 'serialNo', label: 'S.No', className: 'w-16 text-center' },
    { key: 'supplierName', label: 'Supplier Name', isEditable: true, className: 'min-w-[200px]' },
    { key: 'bonhoefferCode', label: 'Bonhoeffer Code', isEditable: true, className: 'w-40' },
    { key: 'lowestPurchasePriceUSD', label: 'Purchase Price (USD)', isEditable: true, className: 'w-48 text-right' },
    { key: 'orderNoAtLowestPrice', label: 'Order No (Lowest Price)', className: 'w-48' },
    { key: 'actions', label: 'Actions', className: 'w-28 text-center sticky right-0 bg-slate-200/70 z-30' }, // Use same bg as header, higher z-index
  ];
  
  const handleEditClick = useCallback((entry: SupplierPriceEntry) => {
    setEditingEntryKey(entry.key);
    setEditedData({
      supplierName: entry.supplierName,
      bonhoefferCode: entry.bonhoefferCode,
      lowestPurchasePriceUSD: entry.lowestPurchasePriceUSD,
      contributingOrderId: entry.contributingOrderId,
    });
  }, []);

  const handleCancelClick = useCallback(() => {
    setEditingEntryKey(null);
    setEditedData({});
  }, []);

  const handleSaveClick = useCallback(() => {
    if (!editingEntryKey || !editedData.contributingOrderId) return;
    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (order.id === editedData.contributingOrderId) {
          const newPrice = editedData.lowestPurchasePriceUSD;
          const newBonhoefferCode = editedData.bonhoefferCode;
          const newSupplierName = editedData.supplierName;
          let newImportValue = order.importValue;
          let newGp = order.gp;
          let newGpPercentage = order.gpPercentage;
          if (typeof newPrice === 'number' && order.qty) {
            newImportValue = newPrice * order.qty;
            if (typeof order.exportValue === 'number') {
                newGp = order.exportValue - newImportValue;
                newGpPercentage = order.exportValue !== 0 ? `${((newGp / order.exportValue) * 100).toFixed(2)}%` : '0.00%';
            }
          }
          return {
            ...order,
            supplier: typeof newSupplierName === 'string' ? newSupplierName.trim() : order.supplier,
            bonhoefferCode: typeof newBonhoefferCode === 'string' ? newBonhoefferCode.trim() : order.bonhoefferCode,
            priceInUSD: typeof newPrice === 'number' ? newPrice : order.priceInUSD,
            importValue: newImportValue,
            gp: newGp,
            gpPercentage: newGpPercentage,
          };
        }
        return order;
      })
    );
    setEditingEntryKey(null);
    setEditedData({});
    setSuccessMessage('Supplier price entry updated. Original order modified and GP recalculated.');
  }, [editingEntryKey, editedData, setOrders]);

  const handleInputChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>, 
    fieldKey: 'supplierName' | 'bonhoefferCode' | 'lowestPurchasePriceUSD'
  ) => {
    const { value, type } = event.target;
    let processedValue: string | number = value;
    if (type === 'number') {
      processedValue = value === '' ? '' : parseFloat(value);
    }
    setEditedData(prev => ({ ...prev, [fieldKey]: processedValue }));
  }, []);

  const exportLookupResultToExcel = (data: LookupResultItem[], fileName: string = 'bonhoeffer_code_lookup.xlsx') => {
    const worksheetData = data.map(item => ({
      'Input Bonhoeffer Code': item.inputBonhoefferCode,
      'Found Supplier Name': item.supplierName,
      'Found Purchase Price (USD)': typeof item.purchasePriceUSD === 'number' 
                                      ? item.purchasePriceUSD 
                                      : item.purchasePriceUSD,
      'Found Order No': item.orderNo,
    }));
    const worksheet = window.XLSX.utils.json_to_sheet(worksheetData);
    worksheet['!cols'] = [ { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 20 } ];
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Lookup Results');
    window.XLSX.writeFile(workbook, fileName);
  };

  const handleCodeFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingCodeFile(true);
    setCodeFileError(null);
    setCodeFileMessage(null);
    setSuccessMessage(null); 
    try {
      const reader = new FileReader();
      const fileData = await new Promise<string | ArrayBuffer | null>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result);
        reader.onerror = () => reject(new Error("Failed to read file."));
        if (file.name.endsWith('.csv')) reader.readAsText(file);
        else reader.readAsBinaryString(file);
      });
      if (!fileData) throw new Error("Empty file data.");
      let parsedRows: any[] = [];
      if (file.name.endsWith('.csv')) {
        const result = window.Papa.parse(fileData as string, { header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim() });
        if (result.errors.length > 0) throw new Error(`Error parsing CSV: ${result.errors[0].message}`);
        parsedRows = result.data;
      } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        const workbook = window.XLSX.read(fileData, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedRows = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      } else {
        throw new Error("Unsupported file type. Please upload CSV or Excel files.");
      }
      if (parsedRows.length === 0) throw new Error("No data found in the uploaded file.");
      const headers = Object.keys(parsedRows[0] || {});
      let bonhoefferCodeField = '';
      let identificationMethodMessage = '';
      if (headers.length > 0 && parsedRows.length > 0 && process.env.API_KEY) {
        try {
          setCodeFileMessage("Attempting AI-powered column identification...");
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const sampleDataForPrompt = parsedRows.slice(0, 3).map(row => JSON.stringify(row));
          const prompt = `Analyze CSV headers: ${JSON.stringify(headers)}. Sample Data: ${sampleDataForPrompt.join('\n')}. Identify the header for 'Bonhoeffer Codes' (alphanumeric product IDs). Respond ONLY with the exact header name.`;
          const response = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-04-17", contents: prompt });
          const potentialHeader = response.text.trim();
          if (potentialHeader && headers.includes(potentialHeader)) {
              bonhoefferCodeField = potentialHeader;
              identificationMethodMessage = `AI identified '${bonhoefferCodeField}' as Bonhoeffer Code column.`;
          } else {
              identificationMethodMessage = `AI analysis inconclusive. Falling back to standard detection.`;
              if(potentialHeader) console.warn(`Gemini suggested: '${potentialHeader}', not in headers: ${headers.join(', ')}`);
          }
        } catch (aiError: any) {
            console.error("Gemini API call failed:", aiError);
            identificationMethodMessage = `AI analysis failed. Falling back to standard detection.`;
        }
      } else if (!process.env.API_KEY) {
          identificationMethodMessage = "API key not set for AI. Using standard column detection.";
      } else {
          identificationMethodMessage = "Using standard column detection.";
      }
      setCodeFileMessage(identificationMethodMessage); 
      if (!bonhoefferCodeField) {
          const normalizedTargetHeader = normalizeHeader('bonhoefferCode');
          const knownAliases = [normalizedTargetHeader, normalizeHeader('code'), normalizeHeader('bcode'), normalizeHeader('itemcode'), normalizeHeader('partnumber')];
          for (const header of headers) {
              if (knownAliases.includes(normalizeHeader(header))) {
                  bonhoefferCodeField = header;
                  setCodeFileMessage(prev => prev + ` Found '${header}' by alias.`);
                  break;
              }
          }
          if (!bonhoefferCodeField && headers.length > 0) {
              bonhoefferCodeField = headers[0];
              setCodeFileMessage(prev => prev + ` Defaulting to first column: '${headers[0]}'.`);
          }
      }
      if (!bonhoefferCodeField) throw new Error("Could not identify Bonhoeffer Code column. " + (codeFileMessage || identificationMethodMessage));
      const supplierDataByNormalizedCode = new Map<string, SupplierPriceEntry[]>();
      supplierPriceData.forEach(entry => {
          const normalizedBCode = (entry.bonhoefferCode || "").toLowerCase().trim();
          if (normalizedBCode) {
              const existing = supplierDataByNormalizedCode.get(normalizedBCode) || [];
              existing.push(entry);
              supplierDataByNormalizedCode.set(normalizedBCode, existing);
          }
      });
      const lookupResults: LookupResultItem[] = parsedRows.map(row => {
        const originalInputCode = String(row[bonhoefferCodeField] || '').trim();
        if (!originalInputCode) return { inputBonhoefferCode: '', supplierName: 'Empty Input Code', purchasePriceUSD: 'N/A', orderNo: 'N/A' };
        const normalizedLookupCode = originalInputCode.toLowerCase();
        const matches = supplierDataByNormalizedCode.get(normalizedLookupCode);
        if (matches && matches.length > 0) {
          const bestMatch = matches.reduce((best, current) => current.lowestPurchasePriceUSD < best.lowestPurchasePriceUSD ? current : best);
          return { inputBonhoefferCode: originalInputCode, supplierName: bestMatch.supplierName, purchasePriceUSD: bestMatch.lowestPurchasePriceUSD, orderNo: bestMatch.orderNoAtLowestPrice };
        }
        return { inputBonhoefferCode: originalInputCode, supplierName: 'Not Found', purchasePriceUSD: 'N/A', orderNo: 'N/A' };
      });
      if (lookupResults.length === 0) throw new Error("No codes processed or found.");
      exportLookupResultToExcel(lookupResults);
      setSuccessMessage(`Lookup complete for ${lookupResults.length} codes. Excel file downloaded. ${codeFileMessage || ""}`);
      setCodeFileMessage(null);
    } catch (err) {
      console.error("Code file processing error:", err);
      setCodeFileError(err instanceof Error ? err.message : 'Failed to process code lookup file.');
      setCodeFileMessage(null); 
    } finally {
      setIsProcessingCodeFile(false);
      if (codeFileInputRef.current) codeFileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <header className="mb-2">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Supplier Price Analytics</h1>
        <p className="text-lg text-slate-700 mt-1">Discover lowest purchase prices and analyze top supplier spending.</p>
      </header>

       {/* Alert Messages */}
      {(error || successMessage || codeFileError || (codeFileMessage && !codeFileError)) && (
        <div className="fixed top-20 right-5 z-[100] w-full max-w-md p-1">
          {error && (
            <div role="alert">
              <div className="bg-red-600 text-white font-semibold rounded-t-lg px-4 py-2 shadow-xl flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Error
              </div>
              <div className="border border-t-0 border-red-500 rounded-b-lg bg-red-100 px-4 py-3 text-red-700 shadow-xl"><p className="text-sm">{error}</p></div>
            </div>
          )}
          {successMessage && (
             <div role="alert">
              <div className="bg-green-600 text-white font-semibold rounded-t-lg px-4 py-2 shadow-xl flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Success
              </div>
              <div className="border border-t-0 border-green-500 rounded-b-lg bg-green-100 px-4 py-3 text-green-700 shadow-xl"><p className="text-sm whitespace-pre-wrap">{successMessage}</p></div>
            </div>
          )}
          {codeFileError && (
             <div role="alert">
              <div className="bg-red-600 text-white font-semibold rounded-t-lg px-4 py-2 shadow-xl flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  File Processing Error
              </div>
              <div className="border border-t-0 border-red-500 rounded-b-lg bg-red-100 px-4 py-3 text-red-700 shadow-xl"><p className="text-sm whitespace-pre-wrap">{codeFileError}</p></div>
            </div>
          )}
          {codeFileMessage && !codeFileError && (
            <div role="status">
                <div className="bg-sky-600 text-white font-semibold rounded-t-lg px-4 py-2 shadow-xl flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0115.357-2m0 0H15" /></svg>
                    Processing Info
                </div>
                <div className="border border-t-0 border-sky-500 rounded-b-lg bg-sky-100 px-4 py-3 text-sky-700 shadow-xl"><p className="text-sm whitespace-pre-wrap">{codeFileMessage}</p></div>
            </div>
          )}
        </div>
      )}
      
      <section aria-labelledby="supplier-controls-title" className="bg-white p-6 rounded-xl shadow-2xl space-y-6">
        <h2 id="supplier-controls-title" className="sr-only">Supplier Data Controls</h2>
        <div className="p-5 border border-slate-200 rounded-lg bg-slate-50/50 shadow-sm">
          <div className="flex items-center mb-3">
             <UploadIcon className="w-6 h-6 mr-2 text-sky-600" />
            <h3 className="text-lg font-semibold text-slate-800">Code File Processing & Lookup</h3>
          </div>
          <div className="space-y-3 mt-2">
              <label htmlFor="code-lookup-file" className={`inline-flex items-center px-5 py-3 bg-sky-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 cursor-pointer transition-all duration-150 ease-in-out transform hover:scale-105 ${isProcessingCodeFile ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <UploadIcon className="w-5 h-5 mr-2.5" />
                {isProcessingCodeFile ? 'Processing...' : 'Upload Code File (CSV/Excel)'}
              </label>
              <input 
                id="code-lookup-file" type="file" ref={codeFileInputRef} className="hidden" 
                onChange={handleCodeFileUpload} accept=".csv,.xls,.xlsx" disabled={isProcessingCodeFile}
                aria-describedby="code-lookup-description"
              />
              <p id="code-lookup-description" className="mt-1.5 text-xs text-slate-600">
                Upload a file with Bonhoeffer Codes to find corresponding supplier prices. Results exported to Excel.
              </p>
          </div>
        </div>

        {orders.length > 0 && (
          <div className="pt-5 border-t border-slate-200">
            <div className="flex items-center mb-4">
                <PresentationChartLineIcon className="w-7 h-7 text-sky-600 mr-3" />
                <h3 id="top-suppliers-title" className="text-xl font-semibold text-slate-800">
                    Top 5 Suppliers by Total Purchase Value
                </h3>
            </div>
            {topSuppliersData.length > 0 ? (
                 <div className="bg-white p-2 sm:p-4 rounded-lg shadow-md border border-slate-200">
                     <HorizontalBarChart data={topSuppliersData} width={550} height={320} chartTitle="Top 5 Suppliers by Total Purchase Value"/>
                </div>
            ) : (
                <p className="text-sm text-slate-600 italic">No supplier purchase data with import values available in orders to display the chart.</p>
            )}
          </div>
        )}

        <div className="pt-5 border-t border-slate-200 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-slate-400" />
          </div>
          <input 
            id="search-supplier-prices" type="text"
            placeholder="Search unique supplier prices (by Supplier, Code, Order No)..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3.5 py-3 pl-10 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 w-full sm:w-2/3 text-sm transition-all duration-150"
            aria-label="Search current supplier prices"
          />
        </div>
      </section>

      <section aria-labelledby="supplier-price-table-title" className="bg-white rounded-xl shadow-2xl overflow-hidden">
        <h2 id="supplier-price-table-title" className="sr-only">Detailed Supplier Prices List</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-800">
            <thead className="text-xs text-slate-800 uppercase bg-slate-200/70 sticky top-0 z-20"> {/* Header z-index */}
              <tr>
                {tableHeaders.map(header => (
                  <th key={header.key.toString()} scope="col" className={`px-4 py-3.5 whitespace-nowrap tracking-wider font-semibold ${header.className || ''}`}>
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((entry, paginatedIndex) => {
                  const isEditing = entry.key === editingEntryKey;
                  return (
                    <tr key={entry.key} className={`transition-colors duration-150 ${isEditing ? 'bg-sky-50 ring-2 ring-sky-400 z-20 relative' : (paginatedIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/70')} hover:bg-sky-50/50`}>
                      {tableHeaders.map(header => {
                        const cellClassName = `px-4 py-2.5 whitespace-nowrap ${header.className || ''} ${isEditing && header.isEditable ? 'py-1.5' : ''}`;
                        if (header.key === 'actions') {
                          return (
                            <td key={`${entry.key}-actions`} className={`${cellClassName} sticky right-0 ${isEditing ? 'bg-sky-50' : (paginatedIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/70')} group-hover:bg-sky-50/50 z-10`}> {/* Cell z-index */}
                              {isEditing ? (
                                <div className="flex items-center space-x-2 justify-center">
                                  <button onClick={handleSaveClick} className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-100 rounded-md transition-all" aria-label={`Save for ${entry.supplierName}`}>
                                    <SaveIcon className="w-5 h-5" />
                                  </button>
                                  <button onClick={handleCancelClick} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md transition-all" aria-label="Cancel edit">
                                    <CancelIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                <button 
                                  onClick={() => handleEditClick(entry)} 
                                  className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                  disabled={editingEntryKey !== null && editingEntryKey !== entry.key}
                                  aria-label={`Edit ${entry.supplierName}`}
                                >
                                  <EditIcon className="w-5 h-5" />
                                </button>
                                </div>
                              )}
                            </td>
                          );
                        }
                        if (header.key === 'serialNo') {
                           return ( <td key={`${entry.key}-serialNo`} className={cellClassName}> {(currentPage - 1) * ROWS_PER_PAGE + paginatedIndex + 1} </td> );
                        }
                        const fieldKey = header.key as keyof SupplierPriceEntry;
                        let displayValue: string | number = '';
                         if (fieldKey === 'lowestPurchasePriceUSD' && typeof entry[fieldKey] === 'number') {
                            displayValue = (entry[fieldKey] as number).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                        } else if (fieldKey in entry) {
                             displayValue = entry[fieldKey as keyof SupplierPriceEntry] ?? '';
                        }
                        return (
                          <td key={`${entry.key}-${fieldKey}`} className={cellClassName}>
                            {isEditing && header.isEditable && editedData ? (
                              <input
                                type={fieldKey === 'lowestPurchasePriceUSD' ? 'number' : 'text'}
                                value={(editedData as any)[fieldKey] ?? ''}
                                onChange={(e) => handleInputChange(e, fieldKey as 'supplierName' | 'bonhoefferCode' | 'lowestPurchasePriceUSD')}
                                className="px-2 py-1.5 border border-slate-300 rounded-md w-full text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition duration-150 ease-in-out bg-white shadow-sm"
                                aria-label={`Edit ${header.label}`}
                                step={fieldKey === 'lowestPurchasePriceUSD' ? 'any' : undefined}
                              />
                            ) : ( String(displayValue) )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={tableHeaders.length} className="px-6 py-12 text-center text-slate-600">
                    {orders.length === 0 ? 'No orders data to derive supplier prices.' : (isProcessingCodeFile ? 'Processing...' : 'No supplier prices match search or found in orders.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredData.length > ROWS_PER_PAGE && (
          <div className="px-4 py-4 flex items-center justify-between border-t border-slate-200 bg-white sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
                <button onClick={handlePrevPage} disabled={currentPage === 1 || isProcessingCodeFile} className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors">Previous</button>
                <button onClick={handleNextPage} disabled={currentPage === totalPages || isProcessingCodeFile} className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors">Next</button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-800">
                    Showing <span className="font-semibold">{Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, filteredData.length)}</span> to <span className="font-semibold">{Math.min(currentPage * ROWS_PER_PAGE, filteredData.length)}</span> of <span className="font-semibold">{filteredData.length}</span> results
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                    <button onClick={handlePrevPage} disabled={currentPage === 1 || isProcessingCodeFile} className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                        <span className="sr-only">Previous</span>
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border-y border-slate-300 bg-white text-sm font-medium text-slate-800">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button onClick={handleNextPage} disabled={currentPage === totalPages || isProcessingCodeFile} className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
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
