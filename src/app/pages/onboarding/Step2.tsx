import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Github, Mail, Plus, Check, Loader2, FileSpreadsheet, Linkedin } from 'lucide-react';
import { toast } from 'sonner';
import { getToken, contactsApi, pollJob } from '../../api';
import { useApp } from '../../contexts/AppContext';

type ImportStatus = 'idle' | 'loading' | 'done' | 'error';
type SourceKey = 'linkedin' | 'github' | 'email' | 'csv';

type ImportState = Record<SourceKey, {
  status: ImportStatus;
  message?: string;
  imported?: number;
}>;

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function normalizeCsvHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsv(csvText: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') continue;
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current !== '' || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function mapGenericCsvContact(values: Record<string, string>) {
  const firstName = values.first_name || values.first || '';
  const lastName = values.last_name || values.last || '';
  const name = values.name || values.full_name || `${firstName} ${lastName}`.trim();
  const email = values.email || values.email_address || '';
  const company = values.company || values.organization || '';
  const title = values.title || values.position || values.job_title || '';
  const location = values.location || '';
  const linkedin_url = values.linkedin || values.linkedin_url || values.linkedin_profile_url || '';
  const github_url = values.github || values.github_url || values.github_profile_url || '';
  const skills = (values.skills || '')
    .split(/[;|,]/)
    .map((skill) => skill.trim())
    .filter(Boolean);

  if (!name && !email && !linkedin_url && !github_url) return null;

  return {
    name: name || email || linkedin_url || github_url,
    email,
    company,
    title,
    location,
    linkedin_url,
    github_url,
    skills,
  };
}

async function parseGenericCsvFile(file: File) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const headers = rows[0].map(normalizeCsvHeader);
  return rows.slice(1)
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => row.reduce<Record<string, string>>((acc, value, index) => {
      const key = headers[index];
      if (key) acc[key] = value.trim();
      return acc;
    }, {}))
    .map(mapGenericCsvContact)
    .filter((contact): contact is NonNullable<ReturnType<typeof mapGenericCsvContact>> => Boolean(contact));
}

export default function Step2() {
  const navigate = useNavigate();
  const { setContacts } = useApp();
  const [importState, setImportState] = useState<ImportState>({
    linkedin: { status: 'idle' },
    github: { status: 'idle' },
    email: { status: 'idle' },
    csv: { status: 'idle' },
  });

  const linkedinInputRef = useRef<HTMLInputElement>(null);
  const githubInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const setStatus = (key: SourceKey, next: Partial<ImportState[SourceKey]>) => {
    setImportState((current) => ({
      ...current,
      [key]: { ...current[key], ...next },
    }));
  };

  const refreshContacts = async () => {
    const latest = await contactsApi.list({ limit: 100, sort_by: 'createdAt', sort_order: 'desc' });
    setContacts(latest.contacts);
  };

  const uploadLinkedInCsv = async (file: File) => {
    setStatus('linkedin', { status: 'loading', message: 'Uploading LinkedIn CSV...' });
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiBase}/api/integrations/linkedin/import-csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error((errorPayload as any)?.error || response.statusText);
      }

      const data = await response.json();
      if (data.job_id) await pollJob(data.job_id, { timeout: 120000 });
      await refreshContacts();
      setStatus('linkedin', {
        status: 'done',
        message: `Imported ${data.imported || 0} LinkedIn contacts`,
        imported: data.imported || 0,
      });
      toast.success('LinkedIn contacts imported');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LinkedIn upload failed';
      setStatus('linkedin', { status: 'error', message });
      toast.error(message);
    }
  };

  const importGenericCsv = async (key: Exclude<SourceKey, 'linkedin'>, provider: 'github' | 'google' | 'imported', file: File) => {
    setStatus(key, { status: 'loading', message: 'Parsing CSV...' });
    try {
      const contacts = await parseGenericCsvFile(file);
      if (!contacts.length) throw new Error('No contacts found in CSV');

      let result: any;
      if (provider === 'imported') {
        result = await contactsApi.bulkImport(contacts, 'imported');
      } else {
        const token = getToken();
        result = await fetch(`${apiBase}/api/integrations/${provider}/import-contacts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ contacts }),
        }).then(async (res) => {
          if (!res.ok) {
            const payload = await res.json().catch(() => null);
            throw new Error((payload as any)?.error || res.statusText);
          }
          return res.json();
        });
      }

      if (result.job_id) await pollJob(result.job_id, { timeout: 120000 });
      await refreshContacts();
      const imported = result.count || contacts.length;
      setStatus(key, { status: 'done', message: `Imported ${imported} contacts`, imported });
      toast.success(`Imported ${imported} contacts`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setStatus(key, { status: 'error', message });
      toast.error(message);
    }
  };

  const anyDone = Object.values(importState).some((item) => item.status === 'done');
  const anyLoading = Object.values(importState).some((item) => item.status === 'loading');

  const cards: Array<{
    key: SourceKey;
    title: string;
    description: string;
    note?: string;
    icon: ReactNode;
    buttonLabel: string;
    onChoose: () => void;
  }> = [
    {
      key: 'linkedin',
      title: 'LinkedIn Connections CSV',
      description: 'Upload your LinkedIn Connections export file.',
      note: 'This uses the dedicated backend LinkedIn CSV parser.',
      icon: <Linkedin className="w-5 h-5 text-blue-700 dark:text-blue-400" />,
      buttonLabel: 'Choose LinkedIn CSV',
      onChoose: () => linkedinInputRef.current?.click(),
    },
    {
      key: 'github',
      title: 'GitHub Contacts CSV',
      description: 'Upload a CSV containing GitHub collaborators or contacts.',
      note: 'Expected columns like name, email, company, github_url, skills.',
      icon: <Github className="w-5 h-5 text-gray-800 dark:text-slate-300" />,
      buttonLabel: 'Choose GitHub CSV',
      onChoose: () => githubInputRef.current?.click(),
    },
    {
      key: 'email',
      title: 'Gmail / Email Contacts CSV',
      description: 'Upload a CSV export of your email contacts.',
      note: 'This imports through the generic Google/email contact flow.',
      icon: <Mail className="w-5 h-5 text-red-500 dark:text-red-400" />,
      buttonLabel: 'Choose Email CSV',
      onChoose: () => emailInputRef.current?.click(),
    },
    {
      key: 'csv',
      title: 'Generic Contact CSV',
      description: 'Upload any CSV with name/email/company/title columns.',
      note: 'Use this if your file is not from LinkedIn, GitHub, or Gmail.',
      icon: <FileSpreadsheet className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      buttonLabel: 'Choose Generic CSV',
      onChoose: () => csvInputRef.current?.click(),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: 'Poppins, sans-serif' }}>Import Your Professional Contacts</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">
          Upload CSV exports from LinkedIn, GitHub, Gmail, or any contact list. This onboarding step now uses real backend imports instead of simulated connections.
        </p>
      </div>

      <input ref={linkedinInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) uploadLinkedInCsv(file);
        e.currentTarget.value = '';
      }} />
      <input ref={githubInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) importGenericCsv('github', 'github', file);
        e.currentTarget.value = '';
      }} />
      <input ref={emailInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) importGenericCsv('email', 'google', file);
        e.currentTarget.value = '';
      }} />
      <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) importGenericCsv('csv', 'imported', file);
        e.currentTarget.value = '';
      }} />

      <div className="space-y-4">
        {cards.map((card) => {
          const state = importState[card.key];
          return (
            <div key={card.key} className="bg-white dark:bg-[#303134] rounded-lg p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  {card.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">{card.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{card.description}</p>
                  {card.note ? <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">{card.note}</p> : null}

                  {state.status === 'loading' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      {state.message || 'Importing contacts...'}
                    </div>
                  )}

                  {state.status === 'done' && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                      {state.message}
                    </div>
                  )}

                  {state.status === 'error' && (
                    <div className="text-sm text-red-600 dark:text-red-400">{state.message}</div>
                  )}

                  {state.status === 'idle' && (
                    <button onClick={card.onChoose} className="text-sm border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg transition-colors">
                      {card.buttonLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="bg-white dark:bg-[#303134] rounded-lg p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">Add Manually</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">If you do not have a CSV yet, you can add contacts one by one after onboarding.</p>
              <button onClick={() => navigate('/contacts')} className="text-sm border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-4 py-2 rounded-lg transition-colors">
                Open Contacts Page
              </button>
            </div>
          </div>
        </div>
      </div>

      {anyDone && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-700 dark:text-green-400">
          Contacts imported successfully. Your backend agents can now enrich and analyze the live contact data.
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={() => navigate('/onboarding/step-1')} className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          Back
        </button>
        <div className="flex gap-3">
          {!anyDone && !anyLoading && (
            <button onClick={() => navigate('/onboarding/step-3')} className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              Skip for now
            </button>
          )}
          <button
            onClick={() => navigate('/onboarding/step-3')}
            disabled={anyLoading}
            className="bg-[#0a66c2] hover:bg-[#004182] text-white px-8 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
