
import { Order } from '../types';

// Helper to normalize header names to a consistent format
export const normalizeHeader = (header: string): string => { // Added export
  if (typeof header !== 'string') return '';
  return header
    .toLowerCase() // Convert to lowercase first
    .replace(/[^a-z0-9]/gi, ''); // Remove all characters that are not letters or numbers
};

// Keys in this map MUST match the output of the new normalizeHeader function
const headerMap: { [key: string]: keyof Order } = {
    orderno: 'orderNo',
    segment: 'segment',
    subsegment: 'subSegment',
    customername: 'customerName',
    country: 'country',
    product: 'product',
    bonhoeffercode: 'bonhoefferCode', 
    qty: 'qty',
    unitprice: 'unitPrice',
    exportvalue: 'exportValue',
    supplier: 'supplier',
    priceinusd: 'priceInUSD', 
    priceusd: 'priceInUSD',   
    importvalue: 'importValue',
    gp: 'gp',                   
    gppercentage: 'gpPercentage',
    status: 'status', 

    bcode: 'bonhoefferCode',
    bonhoeffer: 'bonhoefferCode',
    uprice: 'unitPrice',
    itemprice: 'unitPrice',
    sellingprice: 'unitPrice',
    exportval: 'exportValue',
    expvalue: 'exportValue',
    totalexportvalue: 'exportValue',
    usdprice: 'priceInUSD',
    usdollarprice: 'priceInUSD',
    valueinusd: 'priceInUSD',
    salespriceusd: 'priceInUSD',
    importval: 'importValue',
    impvalue: 'importValue',
    totalimportvalue: 'importValue',

    subsagment: 'subSegment',      
    bonhorffercode: 'bonhoefferCode',
    sellpriceinusd: 'unitPrice',   
    totalsellinusd: 'exportValue', 
    purchespriceinusd: 'priceInUSD',
    totalpriceinusd: 'importValue',
    gpinusd: 'gp',                 
    gpin: 'gpPercentage',          
};

const mapRowToOrder = (row: any, headers: string[]): Partial<Order> => {
  const order: Partial<Order> = {};
  
  headers.forEach(originalHeaderFromFile => {
    const normalizedFileHeader = normalizeHeader(originalHeaderFromFile);
    const orderKey = headerMap[normalizedFileHeader];
    
    if (orderKey) {
      let value = row[originalHeaderFromFile.trim()]; // Use trimmed original header to access Papaparse data
      
      if (typeof value === 'string') value = value.trim();

      if (orderKey === 'qty' || orderKey === 'unitPrice' || orderKey === 'exportValue' || orderKey === 'priceInUSD' || orderKey === 'importValue' || orderKey === 'gp') {
        const numValue = parseFloat(String(value).replace(/,/g, ''));
        (order[orderKey] as any) = isNaN(numValue) ? 0 : numValue;
      } else if (orderKey === 'gpPercentage') {
        if (typeof value === 'number') {
            (order[orderKey] as any) = `${value.toFixed(2)}%`;
        } else if (typeof value === 'string') {
            const numVal = parseFloat(value.replace('%', '').replace(/,/g, ''));
            (order[orderKey] as any) = isNaN(numVal) ? '0.00%' : `${numVal.toFixed(2)}%`;
        } else {
            (order[orderKey] as any) = '0.00%';
        }
      } else {
        (order[orderKey] as any) = String(value === null || value === undefined ? "" : value);
      }
    }
  });
  return order;
};

// Reusable function to process parsed CSV data (from file or Google Sheet)
const processParsedCsvResults = (results: any, sourceName: string): Order[] => { // `any` for Papa.ParseResult compatibility
    if (results.errors.length > 0) {
        console.error(`CSV Parsing errors from ${sourceName} (first 5):`, results.errors.slice(0, 5).map((e:any) => `Row ${e.row}: ${e.message} (${e.code})`).join('\n'));
        // Decide if you want to throw an error or return partial data
        // For now, let's proceed with data that was parsed if any
    }
    const fileHeaders = results.meta.fields || [];
    if (!fileHeaders.some((h: string) => normalizeHeader(h) === 'orderno' || normalizeHeader(h) === headerMap['orderno'])) {
        console.warn(`Critical 'Order No' column might be missing or not parsed correctly from ${sourceName} based on header check.`);
        // Potentially throw an error if 'Order No' is absolutely mandatory and missing
    }
    
    return results.data
        .map((row: any): Order | null => {
            if(Object.keys(row).length === 0) return null; // Skip completely empty rows if PapaParse returns them
            if(Object.keys(row).length === 1 && Object.values(row)[0] === "") return null; // Skip rows that are empty after parsing

            const mappedOrder = mapRowToOrder(row, fileHeaders);
            if (!mappedOrder.orderNo || String(mappedOrder.orderNo).trim() === '') {
                // console.warn(`Skipping row due to missing or empty Order No from ${sourceName}:`, row);
                return null; 
            }
            return {
                ...mappedOrder,
                id: crypto.randomUUID(),
            } as Order;
        })
        .filter((order: Order | null): order is Order => order !== null);
};


export const parseOrderFile = (file: File): Promise<Order[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const binaryStr = event.target?.result;
        if (!binaryStr) {
          reject(new Error("Failed to read file."));
          return;
        }

        if (file.name.endsWith('.csv')) {
          window.Papa.parse(binaryStr as string, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => header.trim(), // Important for mapRowToOrder consistency
            complete: (results: any) => { // Papa.ParseResult<any>
              try {
                  const parsedOrders = processParsedCsvResults(results, file.name);
                  resolve(parsedOrders);
              } catch (parseError) {
                  reject(parseError);
              }
            },
            error: (error: Error) => reject(error),
          });
        } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
          const workbook = window.XLSX.read(binaryStr, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          // For XLSX, convert to CSV first, then use PapaParse for consistent header handling & mapping
          const csvString = window.XLSX.utils.sheet_to_csv(worksheet, { defval: "" });
          
          window.Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h: string) => h.trim(),
            complete: (results: any) => { // Papa.ParseResult<any>
                try {
                    const parsedOrders = processParsedCsvResults(results, file.name);
                    resolve(parsedOrders);
                } catch (parseError) {
                    reject(parseError);
                }
            },
            error: (error: Error) => reject(error)
          });
        } else {
          reject(new Error("Unsupported file type. Please upload CSV or Excel files."));
        }
      } catch (err) {
        console.error("Error during file parsing:", err);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(error);
    };
    
    if (file.name.endsWith('.csv')) {
        reader.readAsText(file); 
    } else {
        reader.readAsBinaryString(file);
    }
    
  });
};

export const fetchAndParseGoogleSheet = (sheetId: string, sheetName?: string): Promise<Order[]> => {
  return new Promise(async (resolve, reject) => {
    // Construct the Google Visualization API URL to get CSV output
    // This fetches the first visible sheet by default if sheetName is not provided
    let gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    if (sheetName) {
      gvizUrl += `&sheet=${encodeURIComponent(sheetName)}`;
    }

    try {
      const response = await fetch(gvizUrl);
      if (!response.ok) {
        let errorMsg = `Failed to fetch Google Sheet. Status: ${response.status}.`;
        if (response.status === 400) { // Common for bad sheet ID or private sheet
            errorMsg += ` Please ensure the Sheet ID is correct and the sheet is public ('Anyone with the link can view').`;
        }
        throw new Error(errorMsg);
      }
      const csvData = await response.text();

      if (!csvData || csvData.trim() === '') {
        resolve([]); // Empty sheet or no data
        return;
      }

      window.Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
        complete: (results: any) => { // Papa.ParseResult<any>
           try {
                const parsedOrders = processParsedCsvResults(results, `Google Sheet ID ${sheetId}`);
                resolve(parsedOrders);
            } catch (parseError) {
                reject(parseError);
            }
        },
        error: (error: Error) => {
          console.error("Error parsing CSV from Google Sheet:", error);
          reject(new Error("Failed to parse data from Google Sheet."));
        },
      });
    } catch (error) {
      console.error("Error fetching or processing Google Sheet:", error);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
};


export const exportOrdersToExcel = (orders: Order[], fileName: string = 'orders.xlsx'): void => {
  const exportData = orders.map((order, index) => ({
    'S. No': index + 1,
    'Status': order.status || "N/A",
    'Order No': order.orderNo || "",
    'SEGMENT': order.segment || "",
    'Sub Sagment': order.subSegment || "",
    'Customer Name': order.customerName || "",
    'Country': order.country || "",
    'Product': order.product || "",
    'Bonhorffer Code': order.bonhoefferCode || "",
    'Qty': order.qty === undefined ? null : order.qty,
    'sell price in USD': order.unitPrice === undefined ? null : order.unitPrice,
    'Total sell In USD': order.exportValue === undefined ? null : order.exportValue,
    'Supplier': order.supplier || "",
    'Purches Price In USD': order.priceInUSD === undefined ? null : order.priceInUSD,
    'Total Price IN Usd': order.importValue === undefined ? null : order.importValue,
    'GP In USD': order.gp === undefined ? null : order.gp,
    'GP in %': order.gpPercentage || "0.00%",
  }));

  const columnOrder = [ 
    'S. No', 'Status', 'Order No', 'SEGMENT', 'Sub Sagment', 'Customer Name',
    'Country', 'Product', 'Bonhorffer Code', 'Qty', 'sell price in USD',
    'Total sell In USD', 'Supplier', 'Purches Price In USD', 
    'Total Price IN Usd', 'GP In USD', 'GP in %'
  ];
  
  // Create data in the correct order for json_to_sheet
  const reorderedExportData = orders.map((order, index) => {
    const row: {[key: string]: any} = {};
    row['S. No'] = index + 1;
    row['Status'] = order.status || "N/A";
    row['Order No'] = order.orderNo || "";
    row['SEGMENT'] = order.segment || "";
    row['Sub Sagment'] = order.subSegment || "";
    row['Customer Name'] = order.customerName || "";
    row['Country'] = order.country || "";
    row['Product'] = order.product || "";
    row['Bonhorffer Code'] = order.bonhoefferCode || ""; // Matches display header
    row['Qty'] = order.qty === undefined ? null : order.qty;
    row['sell price in USD'] = order.unitPrice === undefined ? null : order.unitPrice;
    row['Total sell In USD'] = order.exportValue === undefined ? null : order.exportValue;
    row['Supplier'] = order.supplier || "";
    row['Purches Price In USD'] = order.priceInUSD === undefined ? null : order.priceInUSD;
    row['Total Price IN Usd'] = order.importValue === undefined ? null : order.importValue;
    row['GP In USD'] = order.gp === undefined ? null : order.gp;
    row['GP in %'] = order.gpPercentage || "0.00%";
    return row;
  });


  const finalWorksheet = window.XLSX.utils.json_to_sheet(reorderedExportData, { header: columnOrder, skipHeader: false });


  const columnWidths = [
    {wch: 8},  // S. No
    {wch: 15}, // Status
    {wch: 15}, // Order No
    {wch: 15}, // SEGMENT
    {wch: 15}, // Sub Sagment
    {wch: 20}, // Customer Name
    {wch: 15}, // Country
    {wch: 20}, // Product
    {wch: 18}, // Bonhorffer Code
    {wch: 8},  // Qty
    {wch: 18}, // sell price in USD
    {wch: 18}, // Total sell In USD
    {wch: 20}, // Supplier
    {wch: 20}, // Purches Price In USD
    {wch: 20}, // Total Price IN Usd
    {wch: 12}, // GP In USD
    {wch: 10}  // GP in %
  ];
  finalWorksheet['!cols'] = columnWidths;
  
  const finalWorkbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(finalWorkbook, finalWorksheet, 'Orders');
  window.XLSX.writeFile(finalWorkbook, fileName);
};
