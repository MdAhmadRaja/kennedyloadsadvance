import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TransportLoad, AdvanceRecord, ActivityLog } from '../types';
import { formatCurrency } from './formatUtils';

export interface ExportFilterOptions {
  startDate?: string;
  endDate?: string;
  dateBasis: 'createdDate' | 'bookingDate' | 'paymentDate';
  vehicleNumber?: string;
  company?: string;
  reportType: 'all' | 'loads' | 'advances' | 'activity';
  noDateLimit?: boolean;
}

export function filterRecords(
  loads: TransportLoad[],
  advances: AdvanceRecord[],
  activityLogs: ActivityLog[],
  options: ExportFilterOptions
) {
  const normVehicle = options.vehicleNumber?.trim().toUpperCase();
  const normCompany = options.company?.trim().toLowerCase();

  // Filter Loads
  const filteredLoads = loads.filter((load) => {
    if (normVehicle && !load.vehicleNumber.includes(normVehicle)) return false;
    if (normCompany && !load.loadCompany.toLowerCase().includes(normCompany)) return false;

    if (options.noDateLimit) return true;

    let targetDateStr = '';
    if (options.dateBasis === 'bookingDate') {
      targetDateStr = load.bookingDate;
    } else {
      // createdDate or default
      targetDateStr = load.createdAt ? load.createdAt.split('T')[0] : '';
    }

    if (options.startDate && targetDateStr < options.startDate) return false;
    if (options.endDate && targetDateStr > options.endDate) return false;

    return true;
  });

  // Filter Advances
  const filteredAdvances = advances.filter((adv) => {
    if (normVehicle && !adv.vehicleNumber.includes(normVehicle)) return false;

    if (options.noDateLimit) return true;

    let targetDateStr = '';
    if (options.dateBasis === 'paymentDate') {
      targetDateStr = adv.paymentDate;
    } else {
      // createdDate or bookingDate fallback
      targetDateStr = adv.createdAt ? adv.createdAt.split('T')[0] : '';
    }

    if (options.startDate && targetDateStr < options.startDate) return false;
    if (options.endDate && targetDateStr > options.endDate) return false;

    return true;
  });

  // Filter Activities
  const filteredLogs = activityLogs.filter((log) => {
    if (normVehicle && log.vehicleNumber && !log.vehicleNumber.includes(normVehicle)) return false;

    if (options.noDateLimit) return true;

    const logDate = log.timestamp ? log.timestamp.split('T')[0] : '';
    if (options.startDate && logDate < options.startDate) return false;
    if (options.endDate && logDate > options.endDate) return false;

    return true;
  });

  return { filteredLoads, filteredAdvances, filteredLogs };
}

// -------------------------------------------------------------
// PDF Generator (Kennedy Trailer Services branded)
// -------------------------------------------------------------
export function generatePDFReport(
  loads: TransportLoad[],
  advances: AdvanceRecord[],
  activityLogs: ActivityLog[],
  options: ExportFilterOptions,
  generatedByEmail: string
) {
  const { filteredLoads, filteredAdvances, filteredLogs } = filterRecords(
    loads,
    advances,
    activityLogs,
    options
  );

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(16, 107, 72); // Deep Kennedy Emerald
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('KENNEDY TRAILER SERVICES', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Transport Desk Management & Financial Report', 14, 18);

  const rightText = `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | By: ${generatedByEmail}`;
  doc.setFontSize(8);
  doc.text(rightText, pageWidth - 14, 15, { align: 'right' });

  // Filters Info Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  let yPos = 30;

  const dateFilterText = options.noDateLimit
    ? 'All Records (No Date Limit)'
    : `${options.startDate || 'Beginning'} to ${options.endDate || 'Today'} (Basis: ${
        options.dateBasis === 'bookingDate'
          ? 'Booking Date'
          : options.dateBasis === 'paymentDate'
          ? 'Payment Date'
          : 'Record Created Date'
      })`;

  doc.setFont('helvetica', 'bold');
  doc.text(`Date Range: `, 14, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(dateFilterText, 38, yPos);

  if (options.vehicleNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Vehicle Filter: `, 120, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(options.vehicleNumber, 146, yPos);
  }

  if (options.company) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Company Filter: `, 190, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(options.company, 218, yPos);
  }

  yPos += 7;

  // Financial Highlights Bar
  const totalFreight = filteredLoads.reduce((sum, l) => sum + (l.calculatedFreight || 0), 0);
  const totalAdvance = filteredAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const unmatchedAdvances = filteredAdvances.filter((a) => a.matchingStatus === 'unmatched');

  doc.setFillColor(240, 253, 244); // light green bg
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, yPos, pageWidth - 28, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text(
    `Summary:  Loads: ${filteredLoads.length}  |  Advances: ${filteredAdvances.length}  |  Total Freight: Rs. ${formatCurrency(totalFreight)}  |  Total Advances: Rs. ${formatCurrency(totalAdvance)}  |  Unmatched Advances: ${unmatchedAdvances.length}`,
    18,
    yPos + 8
  );

  yPos += 18;

  // Render Loads Table if selected
  if (options.reportType === 'all' || options.reportType === 'loads') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`1. Load Register Records (${filteredLoads.length})`, 14, yPos);
    yPos += 4;

    const loadRows = filteredLoads.map((load) => [
      load.vehicleNumber,
      load.loadCompany,
      `${load.loadingPoint} -> ${load.destination}`,
      `${load.weight} MT`,
      `Rs. ${load.rate} (${load.rateUnit})`,
      `Rs. ${formatCurrency(load.calculatedFreight)}`,
      load.bookingDate,
      load.driverContact || '-',
      load.createdByEmail.split('@')[0],
      load.createdAt ? load.createdAt.split('T')[0] : '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          'Vehicle',
          'Company',
          'Route',
          'Weight',
          'Rate',
          'Freight',
          'Booking Date',
          'Driver Contact',
          'Created By',
          'Entry Date',
        ],
      ],
      body: loadRows.length > 0 ? loadRows : [['No load records found in range', '', '', '', '', '', '', '', '', '']],
      headStyles: { fillColor: [16, 107, 72], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check page overflow for next section
  if (yPos > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    yPos = 20;
  }

  // Render Advances Table if selected
  if (options.reportType === 'all' || options.reportType === 'advances') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`2. Advance Payment Records (${filteredAdvances.length})`, 14, yPos);
    yPos += 4;

    const advanceRows = filteredAdvances.map((adv) => [
      adv.advanceSender,
      adv.vehicleNumber,
      `Rs. ${formatCurrency(adv.amount)}`,
      adv.paymentDate,
      adv.matchingStatus.toUpperCase(),
      adv.matchedLoadId ? 'Linked' : 'Not Linked',
      adv.createdByEmail.split('@')[0],
      adv.createdAt ? adv.createdAt.split('T')[0] : '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          'Advance Sender',
          'Vehicle Number',
          'Amount (Rs.)',
          'Payment Date',
          'Matching Status',
          'Link Status',
          'Created By',
          'Entry Date',
        ],
      ],
      body: advanceRows.length > 0 ? advanceRows : [['No advance records found in range', '', '', '', '', '', '', '']],
      headStyles: { fillColor: [21, 128, 61], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Render Activity Logs if selected
  if (options.reportType === 'activity') {
    if (yPos > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Activity & Audit History (${filteredLogs.length})`, 14, yPos);
    yPos += 4;

    const logRows = filteredLogs.map((log) => [
      log.timestamp ? new Date(log.timestamp).toLocaleString() : '-',
      log.performedByEmail,
      log.action,
      log.vehicleNumber || '-',
      log.description,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Timestamp', 'Admin Email', 'Action', 'Vehicle', 'Description']],
      body: logRows.length > 0 ? logRows : [['No activity records found', '', '', '', '']],
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });
  }

  // Save the PDF
  const filename = `Kennedy_Transport_Report_${options.reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// -------------------------------------------------------------
// CSV Generator
// -------------------------------------------------------------
export function exportToCSV(
  loads: TransportLoad[],
  advances: AdvanceRecord[],
  activityLogs: ActivityLog[],
  options: ExportFilterOptions
) {
  const { filteredLoads, filteredAdvances, filteredLogs } = filterRecords(
    loads,
    advances,
    activityLogs,
    options
  );

  let csvContent = '\uFEFF'; // UTF-8 BOM for Excel

  if (options.reportType === 'loads' || options.reportType === 'all') {
    csvContent += '--- KENNEDY TRAILER SERVICES : LOAD REGISTER ---\n';
    csvContent +=
      'Vehicle Number,Load Company,Loading Point,Destination,Weight (MT),Rate (Rupees),Rate Unit,Calculated Freight (Rupees),Booking Date,Driver Contact,Created By,Entry Date\n';

    filteredLoads.forEach((l) => {
      csvContent += [
        `"${l.vehicleNumber}"`,
        `"${l.loadCompany}"`,
        `"${l.loadingPoint}"`,
        `"${l.destination}"`,
        l.weight,
        l.rate,
        `"${l.rateUnit}"`,
        l.calculatedFreight || 0,
        `"${l.bookingDate}"`,
        `"${l.driverContact || ''}"`,
        `"${l.createdByEmail}"`,
        `"${l.createdAt ? l.createdAt.split('T')[0] : ''}"`,
      ].join(',') + '\n';
    });

    csvContent += '\n\n';
  }

  if (options.reportType === 'advances' || options.reportType === 'all') {
    csvContent += '--- KENNEDY TRAILER SERVICES : ADVANCE PAYMENTS ---\n';
    csvContent +=
      'Advance Sender,Vehicle Number,Amount (Rupees),Payment Date,Matching Status,Matched Load Reference,Created By,Entry Date\n';

    filteredAdvances.forEach((a) => {
      csvContent += [
        `"${a.advanceSender}"`,
        `"${a.vehicleNumber}"`,
        a.amount,
        `"${a.paymentDate}"`,
        `"${a.matchingStatus}"`,
        `"${a.matchedLoadId || 'None'}"`,
        `"${a.createdByEmail}"`,
        `"${a.createdAt ? a.createdAt.split('T')[0] : ''}"`,
      ].join(',') + '\n';
    });

    csvContent += '\n\n';
  }

  if (options.reportType === 'activity') {
    csvContent += '--- KENNEDY TRAILER SERVICES : AUDIT ACTIVITY LOGS ---\n';
    csvContent += 'Timestamp,Admin Email,Action,Vehicle Number,Description\n';

    filteredLogs.forEach((log) => {
      csvContent += [
        `"${log.timestamp}"`,
        `"${log.performedByEmail}"`,
        `"${log.action}"`,
        `"${log.vehicleNumber || ''}"`,
        `"${log.description.replace(/"/g, '""')}"`,
      ].join(',') + '\n';
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Kennedy_Transport_${options.reportType}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// JSON Backup & Restore
// -------------------------------------------------------------
export function exportJSONBackup(
  loads: TransportLoad[],
  advances: AdvanceRecord[],
  activityLogs: ActivityLog[]
) {
  const backupData = {
    appName: 'Kennedy Transport Desk',
    company: 'Kennedy Trailer Services',
    backupVersion: '1.0',
    exportedAt: new Date().toISOString(),
    totalLoads: loads.length,
    totalAdvances: advances.length,
    loads,
    advances,
    activityLogs,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Kennedy_Trailer_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
