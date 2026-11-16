import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

export const exportRowsToExcel = (rows: ExportRow[], filename: string, sheetName: string) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportRowsToCsv = (rows: ExportRow[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportRowsToPdf = (rows: ExportRow[], filename: string, title: string) => {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);

  const head = [Object.keys(rows[0] || {})];
  const body = rows.map((row) => Object.values(row));

  autoTable(doc, {
    head,
    body,
    startY: 22,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(filename);
};