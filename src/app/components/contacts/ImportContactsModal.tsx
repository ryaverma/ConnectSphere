import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { contactsApi } from '../../api/contacts';
import type { Contact } from '../../types';

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API !== 'false';

const AVATAR_COLORS = [
  'bg-indigo-600', 'bg-blue-700', 'bg-violet-600', 'bg-cyan-600',
  'bg-emerald-600', 'bg-amber-600', 'bg-red-600', 'bg-pink-600',
];

function makeInitials(name: string): string {
  return name.trim().split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

/** Very simple CSV parser — handles quoted fields and commas */
function parseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  const lines = raw.trim().split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function rowsToContacts(rows: string[][]): { contacts: Partial<Contact>[]; errors: string[] } {
  if (rows.length === 0) return { contacts: [], errors: ['File is empty'] };

  const first = rows[0].map(h => h.toLowerCase().trim());
  const hasHeader = first.length > 0 && first.some(h => h.length > 0 && isNaN(Number(h)));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  // Column resolver — handles both LinkedIn export and generic CSV formats
  const col = (aliases: string[], fallback: number): number => {
    for (const alias of aliases) {
      const idx = first.indexOf(alias.toLowerCase());
      if (idx >= 0) return idx;
    }
    return hasHeader ? -1 : fallback;
  };

  const firstNameIdx = col(['first name', 'firstname', 'first_name'], -1);
  const lastNameIdx  = col(['last name', 'lastname', 'last_name'], -1);
  const nameIdx      = col(['name', 'full name', 'fullname'], 0);
  const emailIdx     = col(['email address', 'email', 'e-mail'], 1);
  const titleIdx     = col(['position', 'title', 'job title', 'role'], 2);
  const companyIdx   = col(['company', 'organization', 'employer'], 3);
  const locationIdx  = col(['location', 'city', 'country'], 4);
  const linkedinIdx  = col(['url', 'linkedin url', 'profile url', 'linkedin'], -1);
  const connectedIdx = col(['connected on', 'connected_on', 'connected'], -1);

  const contacts: Partial<Contact>[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, i) => {
    const rowNum = i + (hasHeader ? 2 : 1);

    // Name: prefer "First Name" + "Last Name" (LinkedIn), fall back to "Name"
    let name = '';
    if (firstNameIdx >= 0 || lastNameIdx >= 0) {
      const first = firstNameIdx >= 0 ? (row[firstNameIdx] || '').trim() : '';
      const last  = lastNameIdx  >= 0 ? (row[lastNameIdx]  || '').trim() : '';
      name = [first, last].filter(Boolean).join(' ');
    }
    if (!name && nameIdx >= 0) name = (row[nameIdx] || '').trim();
    if (!name) { errors.push(`Row ${rowNum}: missing name`); return; }

    contacts.push({
      id: crypto.randomUUID(),
      name,
      email:       emailIdx    >= 0 ? (row[emailIdx]    || '').trim() : '',
      title:       titleIdx    >= 0 ? (row[titleIdx]    || '').trim() : '',
      company:     companyIdx  >= 0 ? (row[companyIdx]  || '').trim() : '',
      location:    locationIdx >= 0 ? (row[locationIdx] || '').trim() : '',
      linkedinUrl: linkedinIdx >= 0 ? (row[linkedinIdx] || '').trim() || undefined : undefined,
      source: 'linkedin' as Contact['source'],
      initials: makeInitials(name),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      strengthScore: 30,
      skills: [],
      lastInteraction: connectedIdx >= 0 && row[connectedIdx]
        ? row[connectedIdx].trim()
        : 'Just now',
      status: 'pending' as Contact['status'],
      mutualConnections: 0,
      interests: [],
    });
  });

  return { contacts, errors };
}

interface Props {
  onClose: () => void;
}

export default function ImportContactsModal({ onClose }: Props) {
  const { importContacts } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'file' | 'paste'>('file');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<Partial<Contact>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const processText = (text: string) => {
    const rows = parseCSV(text);
    const { contacts, errors } = rowsToContacts(rows);
    setParsed(contacts);
    setParseErrors(errors);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      processText(text);
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (text: string) => {
    setCsvText(text);
    if (text.trim()) processText(text);
    else { setParsed([]); setParseErrors([]); }
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setLoading(true);
    // Use the source detected during parsing (linkedin, manual, etc.)
    const detectedSource = parsed[0]?.source || 'imported';
    try {
      if (USE_REAL_API) {
        await contactsApi.bulkImport(parsed, detectedSource);
        // Add to local state immediately (we already have the data)
        importContacts(parsed as Contact[]);
      } else {
        importContacts(parsed as Contact[]);
      }
      toast.success(`${parsed.length} contact${parsed.length !== 1 ? 's' : ''} imported successfully`);
      onClose();
    } catch {
      toast.error('Import failed. Please check your data and try again.');
    } finally {
      setLoading(false);
    }
  };

  const canImport = parsed.length > 0 && !loading;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#303134] rounded-xl shadow-2xl border border-[#e6e6e6] dark:border-[#3c4043] w-full max-w-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e6] dark:border-[#3c4043]">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#0a66c2]" />
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Import Contacts</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-[#71767a] dark:hover:text-[#e8eaed] rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Tabs */}
            <div className="flex border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg overflow-hidden">
              {(['file', 'paste'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-[#0a66c2] text-white' : 'text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#3c4043]'}`}
                >
                  {t === 'file' ? 'CSV File' : 'Paste CSV'}
                </button>
              ))}
            </div>

            {/* File tab */}
            {tab === 'file' && (
              <div>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-[#e6e6e6] dark:border-[#5f6368] rounded-lg p-8 text-center cursor-pointer hover:border-[#0a66c2] dark:hover:border-[#8ab4f8] transition-colors group"
                >
                  <FileText className="w-8 h-8 text-gray-300 dark:text-[#5f6368] mx-auto mb-2 group-hover:text-[#0a66c2] dark:group-hover:text-[#8ab4f8] transition-colors" />
                  {fileName ? (
                    <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{fileName}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-[#9aa0a6]">Click to upload a CSV file</p>
                      <p className="text-xs text-gray-400 dark:text-[#71767a] mt-1">or drag and drop</p>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
                </div>
              </div>
            )}

            {/* Paste tab */}
            {tab === 'paste' && (
              <div>
                <textarea
                  value={csvText}
                  onChange={e => handlePasteChange(e.target.value)}
                  placeholder={`First Name,Last Name,Email Address,Company,Position\nJane,Smith,jane@acme.com,Acme Corp,Engineer\nJohn,Doe,john@corp.io,Corp Inc,PM`}
                  rows={6}
                  className="w-full px-3 py-2 border border-[#e6e6e6] dark:border-[#5f6368] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#3c4043] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#71767a] resize-none"
                />
              </div>
            )}

            {/* CSV format hint */}
            <p className="text-xs text-gray-400 dark:text-[#71767a]">
              CSV format: <span className="font-mono">Name</span> (required), <span className="font-mono">Email</span>, <span className="font-mono">Title</span>, <span className="font-mono">Company</span>, <span className="font-mono">Location</span>
            </p>

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    {parseErrors.length} row{parseErrors.length !== 1 ? 's' : ''} skipped:
                  </p>
                  {parseErrors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-amber-600 dark:text-amber-500">{e}</p>
                  ))}
                  {parseErrors.length > 3 && <p className="text-xs text-amber-600">...and {parseErrors.length - 3} more</p>}
                </div>
              </div>
            )}

            {/* Preview */}
            {parsed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-medium text-gray-800 dark:text-[#e8eaed]">
                    Ready to import {parsed.length} contact{parsed.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#3c4043]">
                        <th className="text-left px-3 py-2 text-gray-500 dark:text-[#9aa0a6] font-medium">Name</th>
                        <th className="text-left px-3 py-2 text-gray-500 dark:text-[#9aa0a6] font-medium hidden sm:table-cell">Email</th>
                        <th className="text-left px-3 py-2 text-gray-500 dark:text-[#9aa0a6] font-medium hidden sm:table-cell">Company</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e6e6e6] dark:divide-[#3c4043]">
                      {parsed.slice(0, 5).map((c, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-800 dark:text-[#e8eaed] font-medium">{c.name}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-[#9aa0a6] hidden sm:table-cell">{c.email || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-[#9aa0a6] hidden sm:table-cell">{c.company || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.length > 5 && (
                    <p className="text-xs text-gray-400 dark:text-[#71767a] px-3 py-2 border-t border-[#e6e6e6] dark:border-[#3c4043]">
                      + {parsed.length - 5} more contacts
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[#e6e6e6] dark:border-[#5f6368] rounded-lg text-sm text-gray-700 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!canImport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Upload className="w-4 h-4" />
                }
                {parsed.length > 0 ? `Import ${parsed.length}` : 'Import'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
