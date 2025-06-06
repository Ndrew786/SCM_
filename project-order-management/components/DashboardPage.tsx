
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Order } from '../types';
import BarChart from './BarChart';

// --- SVG Icons ---
const ChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
const ListBulletIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75V17.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const AdjustmentsHorizontalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;
const InformationCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>;
// --- End SVG Icons ---

interface DashboardPageProps {
  orders: Order[];
}

const DEFAULT_SPARE_PART_KEYWORDS = ['spare', 'part', 'parts', 'component', 'components', 'accessory', 'accessories', 'kit', 'assy', 'assembly', 'replacement'];
const DEFAULT_MACHINE_IDENTIFYING_KEYWORD = 'machine';

const TOP_N_QUICK_SELECT_OPTIONS: number[] = [10, 15, 20]; 
type SegmentOption = 'All' | 'Machines' | 'MachineSpareParts' | 'GeneralSpareParts';
const SEGMENT_OPTIONS: { key: SegmentOption, label: string }[] = [
  { key: 'All', label: 'All Segments' },
  { key: 'Machines', label: 'Machines' },
  { key: 'MachineSpareParts', label: 'Machine Spare Parts' },
  { key: 'GeneralSpareParts', label: 'General Spare Parts' },
];
type MetricOption = 'ExportValue' | 'ImportValue';
const METRIC_OPTIONS: { key: MetricOption, label: string }[] = [
  { key: 'ExportValue', label: 'Export Value' },
  { key: 'ImportValue', label: 'Import Value' },
];
type GroupingOption = 'ProductName' | 'ProductCode';
const GROUPING_OPTIONS: { key: GroupingOption, label: string }[] = [
  { key: 'ProductName', label: 'Product Name' },
  { key: 'ProductCode', label: 'Product Code' },
];

interface DisplayEntry {
  id: string; 
  productName: string; 
  bonhoefferCode: string; 
  totalExportValue: number;
  totalImportValue: number;
  chartLabel: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ orders }) => {
  const [selectedTopN, setSelectedTopN] = useState<number>(15);
  const [selectedSegment, setSelectedSegment] = useState<SegmentOption>('All');
  const [selectedMetric, setSelectedMetric] = useState<MetricOption>('ExportValue');
  const [selectedGrouping, setSelectedGrouping] = useState<GroupingOption>('ProductName');

  const isSparePart = useCallback((productName: string): boolean => {
    if (!productName || DEFAULT_SPARE_PART_KEYWORDS.length === 0) return false;
    const lowerProductName = productName.toLowerCase();
    return DEFAULT_SPARE_PART_KEYWORDS.some(keyword => lowerProductName.includes(keyword));
  }, []);

  const isMachineOrder = useCallback((order: Order): boolean => {
    return order.product ? !isSparePart(order.product) : true; 
  }, [isSparePart]);

  const isMachineSparePartOrder = useCallback((order: Order): boolean => {
    if (!order.product || !DEFAULT_MACHINE_IDENTIFYING_KEYWORD) return false;
    return isSparePart(order.product) && order.product.toLowerCase().includes(DEFAULT_MACHINE_IDENTIFYING_KEYWORD);
  }, [isSparePart]);

  const isGeneralSparePartOrder = useCallback((order: Order): boolean => {
    if (!order.product) return false;
    const isMachineSpare = DEFAULT_MACHINE_IDENTIFYING_KEYWORD ? order.product.toLowerCase().includes(DEFAULT_MACHINE_IDENTIFYING_KEYWORD) : false;
    return isSparePart(order.product) && !isMachineSpare;
  }, [isSparePart]);

  const displayData = useMemo((): DisplayEntry[] => {
    let filteredOrders: Order[];
    switch (selectedSegment) {
      case 'Machines': filteredOrders = orders.filter(isMachineOrder); break;
      case 'MachineSpareParts': filteredOrders = orders.filter(isMachineSparePartOrder); break;
      case 'GeneralSpareParts': filteredOrders = orders.filter(isGeneralSparePartOrder); break;
      default: filteredOrders = orders;
    }

    const aggregationMap = new Map<string, { productName: string; bonhoefferCode: string; totalExport: number; totalImport: number; count: number; }>();
    filteredOrders.forEach(order => {
      const groupKey = selectedGrouping === 'ProductName' ? (order.product || 'Unknown Product') : (order.bonhoefferCode || 'Unknown Code');
      const exportVal = typeof order.exportValue === 'number' ? order.exportValue : 0;
      const importVal = typeof order.importValue === 'number' ? order.importValue : 0;
      if (groupKey) {
        const existing = aggregationMap.get(groupKey);
        if (existing) {
          existing.totalExport += exportVal; existing.totalImport += importVal; existing.count += 1;
        } else {
          aggregationMap.set(groupKey, { productName: order.product || 'Unknown Product', bonhoefferCode: order.bonhoefferCode || 'Unknown Code', totalExport: exportVal, totalImport: importVal, count: 1 });
        }
      }
    });

    const aggregatedArray: DisplayEntry[] = Array.from(aggregationMap.entries()).map(([key, data]) => ({
      id: key, productName: data.productName, bonhoefferCode: data.bonhoefferCode,
      totalExportValue: data.totalExport, totalImportValue: data.totalImport, chartLabel: key,
    }));
    
    const currentTopN = Math.max(1, selectedTopN);
    return aggregatedArray.sort((a, b) => {
        const valA = selectedMetric === 'ExportValue' ? a.totalExportValue : a.totalImportValue;
        const valB = selectedMetric === 'ExportValue' ? b.totalExportValue : b.totalImportValue;
        return valB - valA;
      }).slice(0, currentTopN);
  }, [orders, selectedSegment, selectedMetric, selectedGrouping, selectedTopN, isMachineOrder, isMachineSparePartOrder, isGeneralSparePartOrder]);

  const chartRenderData = useMemo(() => {
    return displayData.map(item => ({
      label: item.chartLabel.length > 30 ? item.chartLabel.substring(0, 27) + "..." : item.chartLabel,
      value: selectedMetric === 'ExportValue' ? item.totalExportValue : item.totalImportValue,
    }));
  }, [displayData, selectedMetric]);

  const dynamicTitle = useMemo(() => {
    const topNLabel = `Top ${Math.max(1, selectedTopN)}`;
    const segmentLabelObj = SEGMENT_OPTIONS.find(opt => opt.key === selectedSegment);
    const segmentLabel = segmentLabelObj ? segmentLabelObj.label : selectedSegment;
    const metricLabelObj = METRIC_OPTIONS.find(opt => opt.key === selectedMetric);
    const metricLabel = metricLabelObj ? metricLabelObj.label : selectedMetric;
    const groupingLabelObj = GROUPING_OPTIONS.find(opt => opt.key === selectedGrouping);
    const groupingLabel = groupingLabelObj ? groupingLabelObj.label : selectedGrouping;
    return `${topNLabel} ${segmentLabel} by ${metricLabel} (Grouped by ${groupingLabel})`;
  }, [selectedTopN, selectedSegment, selectedMetric, selectedGrouping]);

  const handleTopNInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setSelectedTopN(isNaN(value) || value <= 0 ? 1 : value);
  };

  const handleTopNButtonQuickSet = (value: number) => { setSelectedTopN(value); };
  
  const ControlButton = <T extends string | number>({ value, selectedValue, onClick, children, title, isSelected }: { value: T, selectedValue?: T, onClick: (value: T) => void, children: React.ReactNode, title?: string, isSelected?: boolean }) => (
    <button
      onClick={() => onClick(value)}
      className={`px-3.5 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500
                  ${isSelected ?? selectedValue === value 
                    ? 'bg-sky-600 text-white shadow-md' 
                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300' // Darker text for non-selected
                  }`}
      aria-pressed={isSelected ?? selectedValue === value}
      title={title}
    >
      {children}
    </button>
  );

  if (orders.length === 0) {
    return (
      <div className="p-6 md:p-8 text-center">
        <header className="mb-6">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Sales Analytics Dashboard</h1>
        </header>
        <div className="mt-8 p-10 bg-white rounded-xl shadow-xl flex flex-col items-center">
          <InformationCircleIcon className="w-16 h-16 text-sky-500 mb-4" />
          <p className="text-slate-800 text-xl font-medium">No order data available.</p>
          <p className="text-slate-700 mt-2">Please import orders on the Orders page to populate this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <header className="mb-2">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Sales Analytics Dashboard</h1>
        <p className="text-lg text-slate-700 mt-1">Interactively explore key performance indicators from your sales data.</p>
      </header>

      <section aria-labelledby="dashboard-controls-title" className="p-6 bg-white rounded-xl shadow-2xl">
        <div className="flex items-center mb-6 pb-4 border-b border-slate-200">
          <AdjustmentsHorizontalIcon className="w-8 h-8 text-sky-600 mr-3" />
          <h2 id="dashboard-controls-title" className="text-2xl font-semibold text-slate-800">Customize Data View</h2>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
            <div>
              <label htmlFor="topN-input" className="block text-sm font-semibold text-slate-800 mb-1.5">Show Top:</label>
              <div className="flex items-center space-x-2">
                {TOP_N_QUICK_SELECT_OPTIONS.map(option => (
                  <ControlButton key={`topN-btn-${option}`} value={option} isSelected={selectedTopN === option} onClick={() => handleTopNButtonQuickSet(option)}>{option}</ControlButton>
                ))}
                <input
                  id="topN-input" type="number" value={selectedTopN} onChange={handleTopNInputChange} min="1"
                  className="px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm w-24 transition-colors"
                  aria-label="Custom Top N value"
                />
              </div>
            </div>

            <div>
              <label htmlFor="metric-select" className="block text-sm font-semibold text-slate-800 mb-1.5">Primary Metric (Chart/Sort):</label>
              <div className="flex flex-wrap gap-2">
                 {METRIC_OPTIONS.map(option => (
                  <ControlButton key={`metric-${option.key}`} value={option.key} selectedValue={selectedMetric} onClick={(value) => setSelectedMetric(value as MetricOption)}>{option.label}</ControlButton>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="grouping-select" className="block text-sm font-semibold text-slate-800 mb-1.5">Group By:</label>
               <div className="flex flex-wrap gap-2">
                {GROUPING_OPTIONS.map(option => (
                  <ControlButton key={`grouping-${option.key}`} value={option.key} selectedValue={selectedGrouping} onClick={(value) => setSelectedGrouping(value as GroupingOption)}>{option.label}</ControlButton>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="segment-select" className="block text-sm font-semibold text-slate-800 mb-1.5">Product Segment:</label>
              <select
                id="segment-select" value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value as SegmentOption)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm bg-white hover:border-slate-400 transition-colors"
                aria-label="Select Product Segment"
              >
                {SEGMENT_OPTIONS.map(option => ( <option key={option.key} value={option.key}> {option.label} </option> ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="data-display-title">
         <div className="flex items-center mb-6 pb-4 border-b border-slate-200">
            <ChartBarIcon className="w-8 h-8 text-sky-600 mr-3" />
            <h2 id="data-display-title" className="text-2xl font-semibold text-slate-800"> {dynamicTitle} </h2>
        </div>

        {displayData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-white p-4 sm:p-6 rounded-xl shadow-xl border border-slate-200/80">
              <BarChart data={chartRenderData} width={550} height={360} barColor="#0ea5e9" title={`Bar chart for: ${dynamicTitle}`} />
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200/80">
              <div className="p-5 border-b border-slate-200 flex items-center bg-slate-50">
                  <ListBulletIcon className="w-6 h-6 text-sky-600 mr-3" />
                  <h3 className="text-lg font-semibold text-slate-800">Detailed Breakdown</h3>
              </div>
              <div className="overflow-y-auto max-h-[360px]"> {/* Adjusted max-height to match chart */}
                <table className="w-full text-sm text-left text-slate-800">
                   <caption className="sr-only">Table for: {dynamicTitle}</caption>
                  <thead className="text-xs text-slate-800 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold text-center">#</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Product / Code</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-right">Total Export</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-right">Total Import</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayData.map((item, index) => (
                      <tr key={item.id} className={`hover:bg-sky-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                        <td className="px-4 py-3 font-medium text-slate-900 text-center">{index + 1}</td>
                        <td className="px-4 py-3">
                            <div className="font-medium text-slate-900 truncate" title={item.productName}>{item.productName}</div>
                            <div className="text-xs text-slate-600">{item.bonhoefferCode}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          {item.totalExportValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          {item.totalImportValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 p-10 bg-white rounded-xl shadow-xl text-center flex flex-col items-center">
            <InformationCircleIcon className="w-16 h-16 text-sky-500 mb-4" />
            <p className="text-slate-800 text-xl font-medium">No data matches your current selection criteria.</p>
            <p className="text-slate-700 mt-2">Try adjusting the filters in the "Customize Data View" panel.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
