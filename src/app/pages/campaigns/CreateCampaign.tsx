import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Check, ChevronRight, Sparkles, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import type { Campaign } from '../../types';
import { campaignsApi } from '../../api/campaigns';
import { useJobPoller } from '../../hooks/useJobPoller';

const steps = ['Campaign Basics', 'Select Contacts', 'Outreach Settings'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', done ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : active ? 'bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-400 dark:text-[#71767a]')}>
              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs', done ? 'bg-green-600 text-white' : active ? 'bg-[#0a66c2] text-white' : 'bg-gray-300 dark:bg-[#5f6368] text-white')}>
                {done ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className="hidden sm:block">{step}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-[#5f6368]" />}
          </div>
        );
      })}
    </div>
  );
}

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API !== 'false';

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { contacts, addCampaign } = useApp();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 data
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('1 month');

  // Step 2 data
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recommendedContacts, setRecommendedContacts] = useState<typeof contacts>([]);

  // Step 3 data
  const [tone, setTone] = useState<'professional' | 'friendly' | 'direct'>('professional');
  const [includeMutual, setIncludeMutual] = useState(true);
  const [includeInterests, setIncludeInterests] = useState(true);
  const [autoFollowup, setAutoFollowup] = useState(true);
  const [reviewBefore, setReviewBefore] = useState(true);

  // API-backed state
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [opportunityJobId, setOpportunityJobId] = useState<string | null>(null);
  const [batchJobId, setBatchJobId] = useState<string | null>(null);

  const sortedContacts = [...contacts].sort((a, b) => b.strengthScore - a.strengthScore);
  const displayedContacts = recommendedContacts.length > 0 ? recommendedContacts : sortedContacts;

  // Poll opportunity detection job
  const { status: opportunityStatus } = useJobPoller(USE_REAL_API ? opportunityJobId : null);

  // When opportunity detection completes, fetch ranked contacts
  useEffect(() => {
    if (!USE_REAL_API) return;
    if (opportunityStatus === 'success' && campaignId) {
      campaignsApi.getOpportunities(campaignId)
        .then((opps) => {
          const oppList = opps.opportunities as Array<{
            contact_id?: string | { _id?: string; id?: string };
            _id?: string;
            id?: string;
            relevance_score?: number;
          }>;
          const recommended = oppList
            .map((opp) => {
              const contactId =
                typeof opp.contact_id === 'string'
                  ? opp.contact_id
                  : opp.contact_id?._id || opp.contact_id?.id || opp._id || opp.id;
              const contact = sortedContacts.find(c => c.id === contactId);
              if (!contact) return null;
              return {
                ...contact,
                strengthScore: Math.max(contact.strengthScore, Math.round((opp.relevance_score || 0) * 100)),
              };
            })
            .filter((contact): contact is (typeof contacts)[number] => !!contact);
          const fallback = sortedContacts.filter(c => c.strengthScore >= 75).slice(0, 8);
          const ids = recommended.map(contact => contact.id).slice(0, 8);
          setRecommendedContacts(recommended.length > 0 ? recommended : fallback);
          setSelectedIds(ids.length > 0 ? ids : fallback.map(c => c.id));
          setAiLoading(false);
          setAiDone(true);
        })
        .catch(() => {
          toast.error('Failed to load opportunity scores');
          setAiLoading(false);
          const fallback = sortedContacts.filter(c => c.strengthScore >= 75).slice(0, 8);
          setRecommendedContacts(fallback);
          setSelectedIds(fallback.map(c => c.id));
          setAiDone(true);
        });
    } else if (opportunityStatus === 'failed') {
      toast.error('AI scoring failed, showing contacts by strength');
      setAiLoading(false);
      const fallback = sortedContacts.filter(c => c.strengthScore >= 75).slice(0, 8);
      setRecommendedContacts(fallback);
      setSelectedIds(fallback.map(c => c.id));
      setAiDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityStatus, campaignId]);

  const goToStep2 = async () => {
    if (!name.trim()) { toast.error('Please enter a campaign name'); return; }
    if (!goal.trim()) { toast.error('Please describe your goal'); return; }
    setStep(1);

    if (USE_REAL_API) {
      setAiLoading(true);
      try {
        const result = await campaignsApi.create({
          name,
          goal,
          duration,
          tone,
          status: 'draft',
        });
        const createdCampaignId = result.campaign?._id || (result.campaign as Campaign & { _id?: string })?._id || result.campaign?.id;
        setCampaignId(createdCampaignId ?? null);
        const jobId = result.job_id;
        if (jobId) {
          setOpportunityJobId(jobId);
          // useJobPoller will handle polling; useEffect above handles completion
        } else {
          // No job — skip AI loading, go straight to contact selection
          setAiLoading(false);
          setAiDone(true);
          const fallback = sortedContacts.filter(c => c.strengthScore >= 75).slice(0, 8);
          setRecommendedContacts(fallback);
          setSelectedIds(fallback.map(c => c.id));
        }
      } catch {
        toast.error('Failed to create campaign');
        setAiLoading(false);
        setStep(0);
        return;
      }
    } else {
      setAiLoading(true);
      await new Promise(r => setTimeout(r, 2000));
      setAiLoading(false);
      setAiDone(true);
      const fallback = sortedContacts.filter(c => c.strengthScore >= 75).slice(0, 8);
      setRecommendedContacts(fallback);
      setSelectedIds(fallback.map(c => c.id));
    }
  };

  const handleCreate = async () => {
    if (selectedIds.length === 0) { toast.error('Select at least one contact'); return; }
    setLoading(true);

    if (USE_REAL_API) {
      try {
        if (!campaignId) throw new Error('Campaign not created yet');

        if (selectedIds.length > 0) {
          const result = await campaignsApi.selectContacts(campaignId, selectedIds);
          const jobId = result.batch_job_id;
          if (jobId) setBatchJobId(jobId);
        }

        navigate(`/campaigns/${campaignId}`);
      } catch {
        toast.error('Failed to finalize campaign');
        setLoading(false);
      }
    } else {
      await new Promise(r => setTimeout(r, 1500));
      const newCampaign: Campaign = {
        id: `camp_${Date.now()}`,
        name,
        goal,
        status: 'active',
        contactIds: selectedIds,
        stats: { total: selectedIds.length, sent: 0, opened: 0, replied: 0, meetings: 0 },
        createdAt: new Date().toISOString().split('T')[0],
        duration,
        tone,
      };
      addCampaign(newCampaign);
      toast.success('Campaign created! Generating personalized messages...');
      navigate(`/campaigns/${newCampaign.id}`);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">Create New Campaign</h1>
        <p className="text-gray-500 dark:text-[#9aa0a6] text-sm mt-1">Target your outreach with AI-powered contact selection and message generation</p>
      </div>

      <StepIndicator current={step} />

      {/* Step 1 */}
      {step === 0 && (
        <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Campaign Basics</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1.5">Campaign Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Google ML Internship Outreach"
              className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed] placeholder:text-gray-400 dark:placeholder:text-[#71767a]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1.5">What's your goal? *</label>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g., Find mentors for transitioning into ML engineering at top tech companies"
              rows={3}
              className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] resize-none bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed] placeholder:text-gray-400 dark:placeholder:text-[#71767a]"
            />
            <p className="text-xs text-gray-400 dark:text-[#71767a] mt-1">The more specific you are, the better AI can find relevant contacts</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1.5">Campaign Duration</label>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed]"
            >
              {['2 weeks', '1 month', '3 months', 'Ongoing'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => navigate('/campaigns')} className="text-sm text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed] px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors">Cancel</button>
            <button onClick={goToStep2} className="bg-[#0a66c2] hover:bg-[#004182] text-white px-8 py-2.5 rounded-lg font-medium transition-colors">Continue →</button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 1 && (
        <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6">
          <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4">Select Contacts</h2>

          {aiLoading && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#0a66c2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-700 dark:text-[#9aa0a6] font-medium">AI is analyzing your network...</p>
              <p className="text-sm text-gray-500 dark:text-[#71767a] mt-1">Finding the best contacts for your goal</p>
            </div>
          )}

          {aiDone && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-4 mb-5 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#0a66c2] dark:text-[#8ab4f8] flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-[#8ab4f8]">We found {displayedContacts.length} recommended contacts for your goal</p>
                  <p className="text-xs text-[#0a66c2] dark:text-[#8ab4f8]/80 mt-0.5">{selectedIds.length} selected · ranked by campaign relevance</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSelectedIds(displayedContacts.filter(c => c.strengthScore >= 80).map(c => c.id))}
                  className="text-xs border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6] px-3 py-1.5 rounded-lg transition-colors"
                >
                  Select All 80%+
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6] px-3 py-1.5 rounded-lg transition-colors"
                >
                  Clear All
                </button>
                <span className="ml-auto text-sm font-medium text-[#0a66c2] dark:text-[#8ab4f8]">{selectedIds.length} selected</span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {displayedContacts.map(contact => {
                  const selected = selectedIds.includes(contact.id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleSelect(contact.id)}
                      className={cn('flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all', selected ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20' : 'border-[#e6e6e6] dark:border-[#3c4043] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] hover:bg-gray-50 dark:hover:bg-[#3c4043]')}
                    >
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0', contact.avatarColor)}>
                        {contact.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{contact.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contact.strengthScore >= 80 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : contact.strengthScore >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6]'}`}>
                            {contact.strengthScore}% match
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-[#9aa0a6] truncate">{contact.title} at {contact.company}</p>
                        <p className="text-xs text-[#0a66c2] dark:text-[#8ab4f8] mt-0.5 truncate">{contact.mutualConnections} mutual · {contact.skills.slice(0, 2).join(', ')}</p>
                      </div>
                      <div className={cn('w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all', selected ? 'border-[#0a66c2] bg-[#0a66c2]' : 'border-[#e6e6e6] dark:border-[#3c4043]')}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex justify-between mt-5 pt-4 border-t border-[#e6e6e6] dark:border-[#3c4043]">
            <button onClick={() => setStep(0)} className="text-sm text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed] px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors">← Back</button>
            <button onClick={() => setStep(2)} disabled={selectedIds.length === 0} className="bg-[#0a66c2] hover:bg-[#004182] text-white px-8 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60">
              Continue ({selectedIds.length} contacts) →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 2 && (
        <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Outreach Settings</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-2">Message Tone</label>
            <div className="flex gap-3">
              {(['professional', 'friendly', 'direct'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={cn('flex-1 py-2.5 rounded-lg border-2 text-sm font-medium capitalize transition-all', tone === t ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:border-[#c6c6c6] dark:hover:border-[#5f6368]')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-2">Include in messages</p>
            <div className="space-y-2">
              {[
                { key: 'mutual', label: 'Mutual connections reference', state: includeMutual, setter: setIncludeMutual },
                { key: 'interests', label: 'Shared interests & topics', state: includeInterests, setter: setIncludeInterests },
              ].map(({ key, label, state, setter }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={state} onChange={e => setter(e.target.checked)} className="w-4 h-4 rounded border-[#e6e6e6] dark:border-[#3c4043] text-[#0a66c2] focus:ring-[#0a66c2]" />
                  <span className="text-sm text-gray-700 dark:text-[#9aa0a6]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-[#9aa0a6]">Automated follow-up sequence</p>
              <button
                onClick={() => setAutoFollowup(!autoFollowup)}
                className={cn('relative inline-flex w-11 h-6 rounded-full transition-colors', autoFollowup ? 'bg-[#0a66c2]' : 'bg-gray-300 dark:bg-[#5f6368]')}
              >
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', autoFollowup ? 'translate-x-5' : 'translate-x-0')} />
              </button>
            </div>
            {autoFollowup && (
              <div className="bg-gray-50 dark:bg-[#3c4043] rounded-lg p-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-[#0a66c2] dark:text-[#8ab4f8] rounded-full flex items-center justify-center font-medium mb-1">1</div>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">Initial</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-300 dark:bg-[#5f6368] relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs text-gray-400 dark:text-[#71767a] whitespace-nowrap">7 days</span>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 rounded-full flex items-center justify-center font-medium mb-1">2</div>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">Follow-up 1</p>
                  </div>
                  <div className="flex-1 h-px bg-gray-300 dark:bg-[#5f6368] relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs text-gray-400 dark:text-[#71767a] whitespace-nowrap">14 days</span>
                  </div>
                  <div className="text-center">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded-full flex items-center justify-center font-medium mb-1">3</div>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">Follow-up 2</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-[#9aa0a6]">Review messages before sending</p>
              <p className="text-xs text-gray-400 dark:text-[#71767a]">Recommended - approve each message before it's sent</p>
            </div>
            <button
              onClick={() => setReviewBefore(!reviewBefore)}
              className={cn('relative inline-flex w-11 h-6 rounded-full transition-colors', reviewBefore ? 'bg-[#0a66c2]' : 'bg-gray-300 dark:bg-[#5f6368]')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', reviewBefore ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>

          <div className="flex justify-between pt-2 border-t border-[#e6e6e6] dark:border-[#3c4043]">
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed] px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors">← Back</button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="bg-[#0a66c2] hover:bg-[#004182] text-white px-8 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-60 shadow-sm"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Create Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
