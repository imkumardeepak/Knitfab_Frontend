import * as XLSX from 'xlsx';

declare global {
  interface Window {
    XLSX: typeof XLSX;
  }
}

export {};