import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, NotebookPen, Flag, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function adminHeaders() {
  const token = localStorage.getItem("admin_token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export type Importance = "low" | "medium" | "high" | "urgent";

export interface StaffNote {
  id: number;
  content: string;
  importance: Importance;
  createdAt: string;
  updatedAt: string;
}

const IMPORTANCE_CONFIG: Record<Importance, { label: string; color: string; bg: string; dot: string }> = {
  urgent: { label: "Urgent", color: "text-red-700", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
  high:   { label: "High",   color: "text-orange-700", bg: "bg-orange-50 border-orange-200", dot: "bg-orange-400" },
  medium: { label: "Medium", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-400" },
  low:    { label: "Low",    color: "text-slate-500", bg: "bg-slate-50 border-slate-200", dot: "bg-slate-300" },
};

const IMPORTANCE_ORDER: Importance[] = ["urgent", "high", "medium", "low"];

export function useStaffNotes() {
  return useQuery<StaffNote[]>({
    queryKey: ["admin", "notes"],
    queryFn: async () => {
      const res = await fetch(`${basePath}/api/admin/notes`, { headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function NoteCard({ note, onDelete }: { note: StaffNote; onDelete: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cfg = IMPORTANCE_CONFIG[note.importance as Importance] ?? IMPORTANCE_CONFIG.medium;

  const updateMutation = useMutation({
    mutationFn: async (patch: { content?: string; importance?: string }) => {
      const res = await fetch(`${basePath}/api/admin/notes/${note.id}`, {
        method: "PATCH", headers: adminHeaders(), body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "notes"] }),
  });

  const handleContentChange = (val: string) => {
    setDraft(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateMutation.mutate({ content: val }), 1200);
  };

  const handleImportanceChange = (importance: Importance) => {
    updateMutation.mutate({ importance });
  };

  return (
    <div className={`rounded-lg border p-3 ${cfg.bg} transition-all`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.color} hover:opacity-80 transition-opacity`}>
              <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32">
            {IMPORTANCE_ORDER.map(imp => {
              const c = IMPORTANCE_CONFIG[imp];
              return (
                <DropdownMenuItem key={imp} onClick={() => handleImportanceChange(imp)} className="text-xs gap-2">
                  <div className={`h-2 w-2 rounded-full ${c.dot}`} />
                  {c.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => onDelete(note.id)}
          className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {editing ? (
        <Textarea
          value={draft}
          onChange={e => handleContentChange(e.target.value)}
          onBlur={() => setEditing(false)}
          autoFocus
          rows={3}
          className="text-sm resize-none border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
        />
      ) : (
        <p
          className="text-sm text-slate-700 cursor-text whitespace-pre-line leading-relaxed"
          onClick={() => setEditing(true)}
        >
          {note.content || <span className="text-slate-400 italic">Click to edit…</span>}
        </p>
      )}
      {updateMutation.isPending && (
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving…
        </p>
      )}
    </div>
  );
}

export function StaffNotepad({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useStaffNotes();
  const [newContent, setNewContent] = useState("");
  const [newImportance, setNewImportance] = useState<Importance>("medium");
  const [adding, setAdding] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (note: { content: string; importance: string }) => {
      const res = await fetch(`${basePath}/api/admin/notes`, {
        method: "POST", headers: adminHeaders(), body: JSON.stringify(note),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notes"] });
      setNewContent("");
      setNewImportance("medium");
      setAdding(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${basePath}/api/admin/notes/${id}`, { method: "DELETE", headers: adminHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "notes"] }),
  });

  const handleCreate = () => {
    if (!newContent.trim()) return;
    createMutation.mutate({ content: newContent.trim(), importance: newImportance });
  };

  const cfg = IMPORTANCE_CONFIG[newImportance];

  return (
    <Card className="border-slate-200 shadow-sm flex flex-col h-full">
      <CardHeader className="pb-3 pt-4 px-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-amber-100 rounded-md flex items-center justify-center">
              <NotebookPen className="h-3.5 w-3.5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-800">Staff Notes</p>
              <p className="text-xs text-slate-400">Ordered by importance · shared with all staff</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setAdding(a => !a)}
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {/* Add note form */}
        {adding && (
          <div className="rounded-lg border border-dashed border-slate-300 p-3 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2">
              <Flag className={`h-3.5 w-3.5 ${cfg.color}`} />
              <span className="text-xs font-medium text-slate-600">Priority:</span>
              <div className="flex gap-1">
                {IMPORTANCE_ORDER.map(imp => {
                  const c = IMPORTANCE_CONFIG[imp];
                  return (
                    <button
                      key={imp}
                      onClick={() => setNewImportance(imp)}
                      className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                        newImportance === imp ? `${c.bg} ${c.color} border-current` : "text-slate-400 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Write your note here…"
              rows={3}
              className="text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdding(false); setNewContent(""); }}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={!newContent.trim() || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add Note"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : !notes?.length && !adding ? (
          <div className="text-center py-8 text-slate-400">
            <NotebookPen className="h-8 w-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">Click Add to create your first note</p>
          </div>
        ) : (
          (compact ? (notes ?? []).slice(0, 4) : notes ?? []).map(note => (
            <NoteCard key={note.id} note={note} onDelete={id => deleteMutation.mutate(id)} />
          ))
        )}
        {compact && (notes?.length ?? 0) > 4 && (
          <p className="text-xs text-slate-400 text-center pt-1">+{(notes?.length ?? 0) - 4} more — view in Appointments</p>
        )}
      </CardContent>
    </Card>
  );
}
