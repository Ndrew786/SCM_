
export interface Order {
  id: string;
  orderNo: string;
  segment: string;
  subSegment: string;
  customerName: string;
  country: string;
  product: string;
  bonhoefferCode: string;
  qty: number;
  unitPrice: number;
  exportValue: number;
  supplier: string;
  priceInUSD: number;
  importValue: number;
  gp: number;
  gpPercentage: string;
  status?: string; // Added status field
}

export enum Page {
  Home = 'Home',
  SupplierPrice = 'Supplier Price',
  Orders = 'Orders',
  Dashboard = 'Dashboard',
  Help = 'Help',
}

// For PapaParse and SheetJS (xlsx) loaded from CDN
declare global {
  interface Window {
    Papa: any;
    XLSX: any;
  }
}

export interface SupplierPriceEntry {
  key: string; // Unique key for React list, e.g., `${supplierName}-${bonhoefferCode}`
  supplierName: string;
  bonhoefferCode: string;
  lowestPurchasePriceUSD: number;
  orderNoAtLowestPrice: string;
  contributingOrderId: string; // ID of the Order that currently offers this lowest price
}

export interface DashboardProductEntry {
  productName: string;
  bonhoefferCode: string;
  totalExportValue: number;
  // Used for chart labeling, can be a combination or just productName
  chartLabel: string; 
}
