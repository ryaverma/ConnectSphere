import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { ZoomIn, ZoomOut, RotateCcw, Search, X, Filter, RefreshCw, Info, GitBranch, Users, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../components/ui/utils';
import { useApp } from '../contexts/AppContext';
import { api } from '../api/client';
import { toast } from 'sonner';
import type { Contact } from '../types';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  contact: Contact & { community?: number; pagerank?: number };
  pinned?: boolean;
}

interface Edge {
  from: string;
  to: string;
  strength: number;
  type: 'knows' | 'worked-with' | 'met-at-event' | 'studied-with' | 'skill' | 'company' | 'computed';
  label?: string;
}

const DIRECT_EDGE_TYPES = new Set(['knows', 'worked-with', 'met-at-event', 'studied-with']);

function isDirectEdge(type: Edge['type']) {
  return DIRECT_EDGE_TYPES.has(type);
}

function matchesEdgeFilter(edge: Edge, filter: string) {
  if (filter === 'all') return true;
  if (filter === 'knows') return isDirectEdge(edge.type);
  return edge.type === filter;
}

function edgeBadgeLabel(type: Edge['type']) {
  if (isDirectEdge(type)) return 'direct';
  return type;
}

// Tailwind class → hex for canvas drawing
const AVATAR_HEX: Record<string, string> = {
  'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1', 'bg-violet-500': '#8b5cf6',
  'bg-purple-500': '#a855f7', 'bg-teal-500': '#14b8a6', 'bg-emerald-500': '#10b981',
  'bg-orange-500': '#f97316', 'bg-rose-500': '#f43f5e', 'bg-cyan-500': '#06b6d4',
  'bg-pink-500': '#ec4899', 'bg-indigo-600': '#4f46e5', 'bg-blue-700': '#1d4ed8',
  'bg-violet-600': '#7c3aed', 'bg-cyan-600': '#0891b2', 'bg-emerald-600': '#059669',
  'bg-amber-600': '#d97706', 'bg-red-600': '#dc2626', 'bg-pink-600': '#db2777',
};

const EDGE_COLORS: Record<string, string> = {
  knows:    'rgba(99,102,241,',
  'worked-with': 'rgba(99,102,241,',
  'met-at-event': 'rgba(99,102,241,',
  'studied-with': 'rgba(99,102,241,',
  skill:    'rgba(20,184,166,',
  company:  'rgba(249,115,22,',
  computed: 'rgba(156,163,175,',
};

// Community palette for node coloring by cluster
const COMMUNITY_COLORS = [
  '#6366f1','#14b8a6','#f97316','#ec4899','#10b981',
  '#f59e0b','#3b82f6','#8b5cf6','#ef4444','#06b6d4',
];

export default function NetworkGraph() {
  const { resolvedTheme } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const navigate = useNavigate();
  const isDark = resolvedTheme === 'dark';

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterSource, setFilterSource] = useState('all');
  const [filterEdgeType, setFilterEdgeType] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [colorByCommunity, setColorByCommunity] = useState(false);

  // ── Warm intro state ─────────────────────────────────────────────────────────
  const [showWarmIntro, setShowWarmIntro] = useState(false);
  const [introFrom, setIntroFrom] = useState('');
  const [introTo, setIntroTo] = useState('');
  const [introResult, setIntroResult] = useState<{
    found: boolean; hops: number | null;
    path: { id: string; name: string; initials: string; avatarColor: string; title?: string }[];
    message?: string;
  } | null>(null);
  const [introLoading, setIntroLoading] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);

  // ── Relationship confirmation state ──────────────────────────────────────────
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmFrom, setConfirmFrom] = useState<GraphNode | null>(null);
  const [confirmTo, setConfirmTo] = useState<GraphNode | null>(null);
  const [confirmType, setConfirmType] = useState<'knows' | 'worked_with' | 'met_at_event' | 'studied_with'>('knows');
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastMouse = useRef({ x: 0, y: 0 });
  const draggedNode = useRef<GraphNode | null>(null);

  // ── Load graph data ──────────────────────────────────────────────────────────
  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ nodes: any[]; edges: any[]; source: string }>('/network-graph/data');
      setDataSource(data.source);

      const W = canvasRef.current?.width || 900;
      const H = canvasRef.current?.height || 600;
      const count = data.nodes.length;

      // Position nodes in a circle if no saved position
      const nodes: GraphNode[] = data.nodes.map((n, i) => ({
        id: n.id,
        x: n.x ?? (W / 2 + Math.cos((i / count) * Math.PI * 2) * Math.min(W, H) * 0.35),
        y: n.y ?? (H / 2 + Math.sin((i / count) * Math.PI * 2) * Math.min(W, H) * 0.28),
        vx: 0, vy: 0,
        contact: n.contact,
      }));

      // Add "You" node at center
      nodes.push({
        id: 'you', x: W / 2, y: H / 2, vx: 0, vy: 0,
        contact: {
          id: 'you', name: 'You', email: '', title: 'Your Account', company: '',
          location: '', initials: 'ME', avatarColor: 'bg-indigo-600', strengthScore: 100,
          skills: [], lastInteraction: 'now', status: 'active', source: 'manual', mutualConnections: count,
        },
      });

      nodesRef.current = nodes;
      edgesRef.current = data.edges || [];
    } catch (e: any) {
      setError(e?.message || 'Failed to load graph');
      setDataSource(null);
      nodesRef.current = [];
      edgesRef.current = [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // ── Force-directed layout (gentle, runs first few seconds) ───────────────────
  const tickRef = useRef(0);
  const runForces = useCallback(() => {
    if (tickRef.current > 200) return; // stop after settling
    tickRef.current++;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const W = canvasRef.current?.width || 900;
    const H = canvasRef.current?.height || 600;
    const alpha = Math.max(0.01, 1 - tickRef.current / 200);

    // Repulsion between nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (2500 / (dist * dist)) * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!nodes[i].pinned) { nodes[i].vx -= fx; nodes[i].vy -= fy; }
        if (!nodes[j].pinned) { nodes[j].vx += fx; nodes[j].vy += fy; }
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodes.find(n => n.id === edge.from);
      const b = nodes.find(n => n.id === edge.to);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = 120 + (1 - edge.strength) * 80;
      const force = ((dist - target) / dist) * 0.08 * alpha;
      if (!a.pinned) { a.vx += dx * force; a.vy += dy * force; }
      if (!b.pinned) { b.vx -= dx * force; b.vy -= dy * force; }
    }

    // Center gravity
    for (const n of nodes) {
      if (n.id === 'you' || n.pinned) continue;
      n.vx += ((W / 2 - n.x) * 0.005) * alpha;
      n.vy += ((H / 2 - n.y) * 0.005) * alpha;
    }

    // Apply velocity with damping
    for (const n of nodes) {
      if (n.pinned) continue;
      n.vx *= 0.7; n.vy *= 0.7;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(30, Math.min(W - 30, n.x));
      n.y = Math.max(30, Math.min(H - 30, n.y));
    }
  }, []);

  // ── Draw ─────────────────────────────────────────────────────────────────────
  const draw = useCallback((dark: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    // Background
    ctx.fillStyle = dark ? '#0f0f1a' : '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const ox = ((offset.x % gridSize) + gridSize) % gridSize;
    const oy = ((offset.y % gridSize) + gridSize) % gridSize;
    for (let x = ox; x < W; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = oy; y < H; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    ctx.save();
    ctx.translate(offset.x + W / 2, offset.y + H / 2);
    ctx.scale(scale, scale);
    ctx.translate(-W / 2, -H / 2);

    const nodes = nodesRef.current;
    const edges = edgesRef.current;

    const visibleIds = new Set(nodes.filter(n => {
      if (n.id === 'you') return true;
      if (filterSource !== 'all' && n.contact.source !== filterSource) return false;
      if (search && !n.contact.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).map(n => n.id));

    const filteredEdges = edges.filter(e =>
      visibleIds.has(e.from) && visibleIds.has(e.to) &&
      matchesEdgeFilter(e, filterEdgeType)
    );

    // Draw edges
    for (const edge of filteredEdges) {
      const from = nodes.find(n => n.id === edge.from);
      const to = nodes.find(n => n.id === edge.to);
      if (!from || !to) continue;

      const isHighlighted = selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to);
      const colorBase = EDGE_COLORS[edge.type] || EDGE_COLORS.computed;
      const alpha = isHighlighted ? 0.9 : edge.strength * 0.5;

      ctx.strokeStyle = `${colorBase}${alpha})`;
      ctx.lineWidth = isHighlighted ? 2.5 : Math.max(0.8, edge.strength * 2);

      if (edge.type === 'computed') ctx.setLineDash([4, 4]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Edge label on hover
      if (isHighlighted && edge.label && scale > 0.7) {
        const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.label, mx, my - 7);
      }
    }

    // Draw "You" dashed spokes to closest nodes
    const youNode = nodes.find(n => n.id === 'you');
    if (youNode && visibleIds.has('you')) {
      const others = nodes.filter(n => n.id !== 'you' && visibleIds.has(n.id))
        .sort((a, b) => {
          const da = Math.hypot(a.x - youNode.x, a.y - youNode.y);
          const db = Math.hypot(b.x - youNode.x, b.y - youNode.y);
          return da - db;
        }).slice(0, 8);

      for (const n of others) {
        ctx.strokeStyle = 'rgba(99,102,241,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(youNode.x, youNode.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw nodes
    for (const node of nodes) {
      if (!visibleIds.has(node.id)) continue;

      const isYou = node.id === 'you';
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const score = node.contact.strengthScore || 50;
      const r = isYou ? 24 : Math.max(9, (score / 100) * 18);

      // Community color or avatar color
      let nodeColor: string;
      if (isYou) {
        nodeColor = '#4f46e5';
      } else if (colorByCommunity && node.contact.community !== undefined) {
        nodeColor = COMMUNITY_COLORS[node.contact.community % COMMUNITY_COLORS.length];
      } else {
        nodeColor = AVATAR_HEX[node.contact.avatarColor] || '#6366f1';
      }

      // Outer glow for hovered/selected/you
      if (isHovered || isSelected || isYou) {
        const grad = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r + (isYou ? 14 : 10));
        grad.addColorStop(0, `${nodeColor}40`);
        grad.addColorStop(1, `${nodeColor}00`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + (isYou ? 14 : 10), 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Shadow for depth
      if (isSelected || isHovered) {
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = 12;
      }

      // Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Border
      if (isSelected) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (isHovered) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (isYou) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Initials
      ctx.fillStyle = 'white';
      ctx.font = `${isYou ? 700 : 600} ${r > 13 ? 11 : 9}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.contact.initials || '?', node.x, node.y);

      // Name label
      if (scale > 0.55 || isHovered || isSelected || isYou) {
        const label = isYou ? 'You' : node.contact.name.split(' ')[0];
        const fontSize = isYou ? 12 : 10;
        ctx.font = `${isYou ? 700 : 500} ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = isSelected
          ? '#6366f1'
          : dark ? 'rgba(255,255,255,0.75)' : 'rgba(30,30,30,0.8)';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(label, node.x, node.y + r + 13);
      }

      // Strength ring for selected
      if (isSelected && !isYou) {
        const ringColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#6b7280';
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 5, -Math.PI / 2, -Math.PI / 2 + (score / 100) * Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [scale, offset, hoveredNode, selectedNode, filterSource, filterEdgeType, search, colorByCommunity]);

  // ── Animation loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      runForces();
      draw(isDark);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw, runForces, isDark]);

  // ── Canvas resize ────────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Mouse helpers ────────────────────────────────────────────────────────────
  const getNodeAtMouse = useCallback((mx: number, my: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const W = canvas.width, H = canvas.height;
    const wx = (mx - offset.x - W / 2) / scale + W / 2;
    const wy = (my - offset.y - H / 2) / scale + H / 2;
    return nodesRef.current.find(n => {
      const r = n.id === 'you' ? 24 : Math.max(9, (n.contact.strengthScore / 100) * 18);
      return Math.hypot(n.x - wx, n.y - wy) < r + 6;
    }) ?? null;
  }, [scale, offset]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    if (draggedNode.current) {
      const W = canvasRef.current!.width, H = canvasRef.current!.height;
      draggedNode.current.x = (mx - offset.x - W / 2) / scale + W / 2;
      draggedNode.current.y = (my - offset.y - H / 2) / scale + H / 2;
      draggedNode.current.vx = 0; draggedNode.current.vy = 0;
    } else if (isDragging.current) {
      setOffset(o => ({ x: o.x + mx - lastMouse.current.x, y: o.y + my - lastMouse.current.y }));
    }

    lastMouse.current = { x: mx, y: my };
    setHoveredNode(getNodeAtMouse(mx, my));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const node = getNodeAtMouse(mx, my);
    dragStartPos.current = { x: mx, y: my };
    lastMouse.current = { x: mx, y: my };

    if (node) {
      draggedNode.current = node;
      node.pinned = true;
    } else {
      isDragging.current = true;
    }
  };

  const lastClickTime = useRef(0);

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const now = Date.now();
    const isDoubleClick = now - lastClickTime.current < 300;
    lastClickTime.current = now;

    // Let handleDblClick deal with the second click of a double-click
    if (isDoubleClick) {
      draggedNode.current = null;
      isDragging.current = false;
      return;
    }

    const moved = Math.abs(e.clientX - dragStartPos.current.x) < 4 &&
                  Math.abs(e.clientY - dragStartPos.current.y) < 4;

    if (draggedNode.current) {
      draggedNode.current.pinned = false;
      if (moved) setSelectedNode(draggedNode.current);
      draggedNode.current = null;
    } else {
      isDragging.current = false;
      if (moved) setSelectedNode(null);
    }
  };

  const handleDblClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const node = getNodeAtMouse(e.clientX - rect.left, e.clientY - rect.top);
    if (node && node.id !== 'you') navigate(`/contacts/${node.id}`);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setScale(s => Math.min(3, Math.max(0.25, s * (1 - e.deltaY * 0.001))));
  };

  const visibleCount = nodesRef.current.filter(n => {
    if (n.id === 'you') return false;
    if (filterSource !== 'all' && n.contact.source !== filterSource) return false;
    if (search && !n.contact.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).length;

  const edgeCount = edgesRef.current.filter(e =>
    matchesEdgeFilter(e, filterEdgeType)
  ).length;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f0f1a] overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1a1a2e] border-b border-gray-200 dark:border-[#2a2a3e] flex-shrink-0 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-[#5f6368]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="pl-8 pr-3 py-1.5 border border-gray-200 dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-44 bg-gray-50 dark:bg-[#252538] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#5f6368]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400 dark:text-[#5f6368]" />
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 dark:border-[#3c4043] rounded-lg text-sm bg-gray-50 dark:bg-[#252538] text-gray-700 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="all">All Sources</option>
            <option value="linkedin">LinkedIn</option>
            <option value="github">GitHub</option>
            <option value="email">Email</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {/* Edge type filter */}
        <select
          value={filterEdgeType}
          onChange={e => setFilterEdgeType(e.target.value)}
          className="px-2.5 py-1.5 border border-gray-200 dark:border-[#3c4043] rounded-lg text-sm bg-gray-50 dark:bg-[#252538] text-gray-700 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <option value="all">All Connections</option>
          <option value="knows">Direct Relationship</option>
          <option value="skill">Shared Skill</option>
          <option value="company">Same Company</option>
          <option value="computed">Computed</option>
        </select>

        {/* Zoom controls */}
        <div className="flex gap-0.5 border border-gray-200 dark:border-[#3c4043] rounded-lg overflow-hidden">
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252538] text-gray-600 dark:text-[#9aa0a6] transition-colors" title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
          <button onClick={() => setScale(s => Math.max(0.25, s - 0.2))} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252538] text-gray-600 dark:text-[#9aa0a6] transition-colors" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); tickRef.current = 0; }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252538] text-gray-600 dark:text-[#9aa0a6] transition-colors" title="Reset"><RotateCcw className="w-3.5 h-3.5" /></button>
        </div>

        {/* Community color toggle */}
        <button
          onClick={() => setColorByCommunity(v => !v)}
          className={cn('px-2.5 py-1.5 text-xs rounded-lg border transition-colors font-medium',
            colorByCommunity
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-gray-200 dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-100 dark:hover:bg-[#252538]'
          )}
          title="Color nodes by community cluster"
        >
          Cluster View
        </button>

        {/* Refresh */}
        <button
          onClick={() => { tickRef.current = 0; loadGraph(); }}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252538] text-gray-600 dark:text-[#9aa0a6] rounded-lg border border-gray-200 dark:border-[#3c4043] transition-colors"
          title="Refresh graph"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Warm intro */}
        <button
          onClick={() => { setShowWarmIntro(v => !v); setIntroResult(null); }}
          className={cn('flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors font-medium',
            showWarmIntro
              ? 'bg-teal-600 border-teal-600 text-white'
              : 'border-gray-200 dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-100 dark:hover:bg-[#252538]'
          )}
          title="Find warm introduction path"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Warm Intro</span>
        </button>

        {/* Legend toggle */}
        <button
          onClick={() => setShowLegend(v => !v)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#252538] text-gray-600 dark:text-[#9aa0a6] rounded-lg border border-gray-200 dark:border-[#3c4043] transition-colors"
          title="Legend"
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {/* Stats */}
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400 dark:text-[#5f6368]">
          <span>{visibleCount} nodes · {edgeCount} edges</span>
          <span className="hidden sm:block">· {Math.round(scale * 100)}%</span>
          {dataSource && (
            <span className={cn('px-2 py-0.5 rounded-full text-xs',
              dataSource === 'neo4j' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : dataSource === 'cache' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                : 'bg-gray-100 dark:bg-[#3c4043] text-gray-500 dark:text-[#9aa0a6]'
            )}>
              {dataSource}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Legend overlay ── */}
        <AnimatePresence>
          {showLegend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute top-3 left-3 z-20 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] rounded-xl p-4 shadow-xl text-xs w-52"
            >
              <p className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-3">Legend</p>
              <p className="text-gray-500 dark:text-[#9aa0a6] mb-2 font-medium uppercase tracking-wide">Node size</p>
              <p className="text-gray-500 dark:text-[#9aa0a6] mb-3">Larger = higher connection strength</p>
              <p className="text-gray-500 dark:text-[#9aa0a6] mb-2 font-medium uppercase tracking-wide">Connections</p>
              <div className="space-y-1.5">
                {[
                  { color: '#6366f1', label: 'Direct relationship', dash: false },
                  { color: '#14b8a6', label: 'Shared skill', dash: false },
                  { color: '#f97316', label: 'Same company', dash: false },
                  { color: '#9ca3af', label: 'Computed similarity', dash: true },
                ].map(({ color, label, dash }) => (
                  <div key={label} className="flex items-center gap-2">
                    <svg width="24" height="10">
                      <line x1="0" y1="5" x2="24" y2="5" stroke={color} strokeWidth="2"
                        strokeDasharray={dash ? '4,3' : undefined} />
                    </svg>
                    <span className="text-gray-600 dark:text-[#9aa0a6]">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 dark:text-[#9aa0a6] mt-3 text-[10px] leading-relaxed">
                Drag nodes to reposition · Scroll to zoom · Double-click to open profile
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading overlay ── */}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#f8fafc]/80 dark:bg-[#0f0f1a]/80">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-[#9aa0a6]">Building your network graph…</p>
            </div>
          </div>
        )}

        {/* ── Error banner ── */}
        {false && error && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm shadow-lg">
            {error}
          </div>
        )}

        {/* ── Empty state ── */}
        {error && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm shadow-lg">
            {error}
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center max-w-sm px-6">
              <div className="text-4xl mb-4">Network unavailable</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#e8eaed] mb-2">We couldn&apos;t load your graph</h3>
              <p className="text-sm text-gray-500 dark:text-[#9aa0a6] mb-4">
                This screen now shows live data only, so it stays empty until the backend is available again.
              </p>
              <button
                onClick={() => { tickRef.current = 0; loadGraph(); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && nodesRef.current.filter(n => n.id !== 'you').length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="text-5xl mb-4">🕸️</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#e8eaed] mb-2">No contacts in your network</h3>
              <p className="text-sm text-gray-500 dark:text-[#9aa0a6] mb-4">Import contacts to see your network graph</p>
              <Link to="/contacts" className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors">
                Add Contacts
              </Link>
            </div>
          </div>
        )}

        {/* ── Canvas ── */}
        <canvas
          ref={canvasRef}
          className="flex-1 cursor-grab active:cursor-grabbing"
          style={{ width: '100%', height: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDblClick}
          onWheel={handleWheel}
          onMouseLeave={() => {
            setHoveredNode(null);
            isDragging.current = false;
            if (draggedNode.current) { draggedNode.current.pinned = false; draggedNode.current = null; }
          }}
        />

        {/* ── Contact sidebar ── */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-72 bg-white dark:bg-[#1a1a2e] border-l border-gray-200 dark:border-[#2a2a3e] flex flex-col overflow-y-auto shadow-xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2a2a3e]">
                <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] text-sm">Contact Details</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-[#9aa0a6] hover:bg-gray-100 dark:hover:bg-[#252538] rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Avatar + name */}
                <div className="text-center pt-2">
                  <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold mx-auto mb-3 shadow-lg', selectedNode.contact.avatarColor)}>
                    {selectedNode.contact.initials}
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-[#e8eaed]">{selectedNode.contact.name}</h4>
                  {selectedNode.contact.title && (
                    <p className="text-sm text-gray-500 dark:text-[#9aa0a6] mt-0.5">{selectedNode.contact.title}</p>
                  )}
                  {selectedNode.contact.company && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 font-medium">{selectedNode.contact.company}</p>
                  )}
                </div>

                {/* Strength bar */}
                {selectedNode.id !== 'you' && (
                  <div className="bg-gray-50 dark:bg-[#252538] rounded-lg p-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500 dark:text-[#9aa0a6]">Connection Strength</span>
                      <span className={cn('font-semibold',
                        selectedNode.contact.strengthScore >= 80 ? 'text-green-600 dark:text-green-400'
                          : selectedNode.contact.strengthScore >= 60 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-500 dark:text-[#9aa0a6]'
                      )}>
                        {selectedNode.contact.strengthScore}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-[#3c4043] rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700',
                          selectedNode.contact.strengthScore >= 80 ? 'bg-green-500'
                            : selectedNode.contact.strengthScore >= 60 ? 'bg-amber-500'
                            : 'bg-gray-400'
                        )}
                        style={{ width: `${selectedNode.contact.strengthScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Skills */}
                {(selectedNode.contact.skills?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-[#5f6368] uppercase tracking-wider mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.contact.skills.slice(0, 5).map(s => (
                        <span key={s} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connections in graph */}
                {selectedNode.id !== 'you' && (() => {
                  const connected = edgesRef.current
                    .filter(e => e.from === selectedNode.id || e.to === selectedNode.id)
                    .map(e => {
                      const otherId = e.from === selectedNode.id ? e.to : e.from;
                      const other = nodesRef.current.find(n => n.id === otherId);
                      return other ? { node: other, type: e.type, label: e.label } : null;
                    }).filter(Boolean);

                  if (!connected.length) return null;
                  return (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 dark:text-[#5f6368] uppercase tracking-wider mb-2">
                        Connected to ({connected.length})
                      </p>
                      <div className="space-y-1.5">
                        {connected.slice(0, 5).map((conn, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0', conn!.node.contact.avatarColor)}>
                              {conn!.node.contact.initials}
                            </div>
                            <span className="text-gray-700 dark:text-[#9aa0a6] flex-1 truncate">{conn!.node.contact.name}</span>
                            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium',
                              conn!.type === 'skill' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                                : conn!.type === 'company' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                : isDirectEdge(conn!.type) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                : 'bg-gray-50 dark:bg-[#3c4043] text-gray-500 dark:text-[#9aa0a6]'
                            )}>
                              {edgeBadgeLabel(conn!.type)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Meta */}
                {selectedNode.id !== 'you' && (
                  <div className="space-y-1.5 text-xs border-t border-gray-100 dark:border-[#2a2a3e] pt-3">
                    {selectedNode.contact.source && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-[#5f6368]">Source</span>
                        <span className="text-gray-700 dark:text-[#9aa0a6] capitalize">{selectedNode.contact.source}</span>
                      </div>
                    )}
                    {selectedNode.contact.lastInteraction && (
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-[#5f6368]">Last contact</span>
                        <span className="text-gray-700 dark:text-[#9aa0a6]">{selectedNode.contact.lastInteraction}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Shared by other users badge */}
                {selectedNode.id !== 'you' && (selectedNode.contact as any).sharedUserCount > 0 && (
                  <div className="flex items-center gap-2 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg px-3 py-2">
                    <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    <p className="text-xs text-teal-700 dark:text-teal-300">
                      {(selectedNode.contact as any).sharedUserCount} other user{(selectedNode.contact as any).sharedUserCount > 1 ? 's' : ''} also know this person
                    </p>
                  </div>
                )}

                {/* Confirm relationship button */}
                {selectedNode.id !== 'you' && (
                  <button
                    onClick={() => {
                      setConfirmFrom(null);
                      setConfirmTo(selectedNode);
                      setConfirmType('knows');
                      setConfirmNotes('');
                      setShowConfirmModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 py-2 rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirm Relationship
                  </button>
                )}

                {/* Action */}
                {selectedNode.id !== 'you' && (
                  <Link
                    to={`/contacts/${selectedNode.contact.id}`}
                    className="block w-full text-center text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg transition-colors font-medium"
                  >
                    View Full Profile →
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-white dark:bg-[#1a1a2e] border-t border-gray-200 dark:border-[#2a2a3e] text-xs text-gray-400 dark:text-[#5f6368] flex-shrink-0">
        <span>🟣 You · ⭕ size = strength · — skill · — company · ·· computed</span>
        <span className="ml-auto hidden sm:block">Drag nodes · Scroll to zoom · Double-click to open profile</span>
        <Link to="/analytics" className="text-indigo-500 dark:text-indigo-400 hover:underline">View Analytics →</Link>
      </div>

      {/* ── Warm Intro Panel ── */}
      <AnimatePresence>
        {showWarmIntro && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-14 left-1/2 -translate-x-1/2 z-40 w-full max-w-md bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] rounded-2xl shadow-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] text-sm">Find Warm Introduction Path</h3>
              </div>
              <button onClick={() => { setShowWarmIntro(false); setIntroResult(null); setHighlightedPath([]); }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-[#9aa0a6] rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-[#9aa0a6] mb-3">
              Select two contacts to discover how you're connected through your network.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-[#9aa0a6] block mb-1">From</label>
                <select
                  value={introFrom}
                  onChange={e => { setIntroFrom(e.target.value); setIntroResult(null); }}
                  className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-[#3c4043] rounded-lg text-sm bg-gray-50 dark:bg-[#252538] text-gray-900 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                >
                  <option value="">Select contact…</option>
                  {nodesRef.current.filter(n => n.id !== 'you').map(n => (
                    <option key={n.id} value={n.id}>{n.contact.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-[#9aa0a6] block mb-1">To</label>
                <select
                  value={introTo}
                  onChange={e => { setIntroTo(e.target.value); setIntroResult(null); }}
                  className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-[#3c4043] rounded-lg text-sm bg-gray-50 dark:bg-[#252538] text-gray-900 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                >
                  <option value="">Select contact…</option>
                  {nodesRef.current.filter(n => n.id !== 'you' && n.id !== introFrom).map(n => (
                    <option key={n.id} value={n.id}>{n.contact.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              disabled={!introFrom || !introTo || introLoading}
              onClick={async () => {
                setIntroLoading(true);
                try {
                  const result = await api.get<any>(`/network-graph/warm-intro?from=${introFrom}&to=${introTo}`);
                  setIntroResult(result);
                  if (result.found) setHighlightedPath(result.path.map((p: any) => p.id));
                  else setHighlightedPath([]);
                } catch {
                  toast.error('Failed to find introduction path');
                } finally {
                  setIntroLoading(false);
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {introLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              Find Path
            </button>

            {/* Result */}
            <AnimatePresence>
              {introResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  {introResult.found ? (
                    <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3">
                      <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 mb-2">
                        {introResult.hops === 1 ? 'Direct connection!' : `${introResult.hops ?? '?'}-hop path found`}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {introResult.path.map((node, i) => (
                          <div key={node.id} className="flex items-center gap-1">
                            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0',
                              (node as any).avatarColor || 'bg-indigo-500')}>
                              {node.initials || node.name?.slice(0,2)}
                            </div>
                            <span className="text-xs text-teal-800 dark:text-teal-200 font-medium">{node.name}</span>
                            {i < introResult.path.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-teal-400 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                      {(introResult.hops ?? 0) > 1 && (
                        <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-2">
                          Ask {introResult.path[1]?.name} to introduce you to {introResult.path[introResult.path.length - 1]?.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-[#252538] border border-gray-200 dark:border-[#3c4043] rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{introResult.message || 'No path found within 6 hops'}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirm Relationship Modal ── */}
      <AnimatePresence>
        {showConfirmModal && confirmTo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowConfirmModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              className="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-[#2a2a3e] shadow-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Confirm Relationship</h3>
                <button onClick={() => setShowConfirmModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-[#9aa0a6] rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contact being confirmed */}
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#252538] rounded-lg p-3 mb-4">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0', confirmTo.contact.avatarColor)}>
                  {confirmTo.contact.initials}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-[#e8eaed] text-sm">{confirmTo.contact.name}</p>
                  <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{confirmTo.contact.title} {confirmTo.contact.company ? `@ ${confirmTo.contact.company}` : ''}</p>
                </div>
              </div>

              {/* From contact picker (optional) */}
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-500 dark:text-[#9aa0a6] block mb-1.5">
                  Connect from (optional — leave blank to link directly to you)
                </label>
                <select
                  value={confirmFrom?.id || ''}
                  onChange={e => {
                    const node = nodesRef.current.find(n => n.id === e.target.value) || null;
                    setConfirmFrom(node);
                  }}
                  className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-[#3c4043] rounded-lg text-sm bg-white dark:bg-[#252538] text-gray-900 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="">— Direct connection to me —</option>
                  {nodesRef.current.filter(n => n.id !== 'you' && n.id !== confirmTo.id).map(n => (
                    <option key={n.id} value={n.id}>{n.contact.name}</option>
                  ))}
                </select>
              </div>

              {/* Relationship type */}
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-500 dark:text-[#9aa0a6] block mb-1.5">How do you know them?</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'knows',          label: 'Know them' },
                    { value: 'worked_with',    label: 'Worked together' },
                    { value: 'met_at_event',   label: 'Met at event' },
                    { value: 'studied_with',   label: 'Studied together' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setConfirmType(opt.value)}
                      className={cn('py-1.5 px-2 text-xs rounded-lg border transition-colors text-center',
                        confirmType === opt.value
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-200 dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#252538]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 dark:text-[#9aa0a6] block mb-1.5">Notes (optional)</label>
                <input
                  type="text"
                  value={confirmNotes}
                  onChange={e => setConfirmNotes(e.target.value)}
                  placeholder="e.g. Met at NeurIPS 2024…"
                  className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-[#3c4043] rounded-lg text-sm bg-white dark:bg-[#252538] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#5f6368] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2 text-sm border border-gray-200 dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] rounded-lg hover:bg-gray-50 dark:hover:bg-[#252538] transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={confirmLoading}
                  onClick={async () => {
                    const fromId = confirmFrom?.id || null;
                    const toId   = confirmTo.id;
                    if (!fromId) {
                      toast.info('Select a "from" contact to create a graph edge');
                      return;
                    }
                    setConfirmLoading(true);
                    try {
                      await api.post('/network-graph/confirm-relationship', {
                        from_contact_id: fromId,
                        to_contact_id:   toId,
                        relationship_type: confirmType,
                        notes: confirmNotes,
                      });
                      toast.success('Relationship confirmed and added to graph');
                      setShowConfirmModal(false);
                      tickRef.current = 0;
                      loadGraph();
                    } catch {
                      toast.error('Failed to save relationship');
                    } finally {
                      setConfirmLoading(false);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
                >
                  {confirmLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
