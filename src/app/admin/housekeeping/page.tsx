'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  room_id: string | null;
  room_number: string | null;
  task_type: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  notes: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

const STATUSES = ['pending', 'in_progress', 'done'] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: '📋 Pending',
  in_progress: '🔧 In Progress',
  done: '✅ Done',
};
const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const supabase = createBrowserSupabaseClient();
    try {
      const { data } = await supabase
        .from('housekeeping_tasks')
        .select('*, rooms(room_number)')
        .order('created_at', { ascending: false })
        .limit(100);
      const mapped = (data || []).map((t: Record<string, unknown>) => ({
        ...t,
        room_number: (t.rooms as { room_number: string } | null)?.room_number || null,
      })) as Task[];
      setTasks(mapped);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const moveTask = async (task: Task, newStatus: string) => {
    const supabase = createBrowserSupabaseClient();
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'completed') update.completed_at = new Date().toISOString();
    await supabase.from('housekeeping_tasks').update(update).eq('id', task.id);
    fetchTasks();
    toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
  };

  const tasksByStatus = STATUSES.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
          <p className="text-sm text-gray-600 mt-1">Track cleaning, maintenance, and room preparation</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
            {tasksByStatus.pending?.length || 0} pending
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            {tasksByStatus.in_progress?.length || 0} active
          </span>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {STATUSES.map((status) => (
            <div key={status} className="bg-slate-100 rounded-lg p-4 min-h-[300px]">
              <h2 className="font-semibold text-gray-900 mb-3 text-sm">
                {STATUS_LABELS[status]} ({tasksByStatus[status]?.length || 0})
              </h2>
              <div className="space-y-2">
                {(tasksByStatus[status] || []).map((task) => (
                  <div key={task.id} className="bg-white rounded-lg shadow-sm p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {task.task_type.replace(/_/g, ' ')}
                        </p>
                        {task.room_number && (
                          <p className="text-xs text-gray-500">Room {task.room_number}</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority] || 'bg-gray-100 text-gray-600'}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.notes && (
                      <p className="text-xs text-gray-500 mb-2">{task.notes}</p>
                    )}
                    {task.assigned_to && (
                      <p className="text-xs text-gray-400 mb-2">Assigned: {task.assigned_to}</p>
                    )}
                    <div className="flex gap-1">
                      {status !== 'pending' && (
                        <button
                          onClick={() => moveTask(task, 'pending')}
                          className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          ← Back
                        </button>
                      )}
                      {status === 'pending' && (
                        <button
                          onClick={() => moveTask(task, 'in_progress')}
                          className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          Start →
                        </button>
                      )}
                      {status === 'in_progress' && (
                        <button
                          onClick={() => moveTask(task, 'done')}
                          className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          Complete ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(tasksByStatus[status] || []).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">No tasks</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
