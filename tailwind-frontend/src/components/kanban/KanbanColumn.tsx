import { useState } from 'react';
import { Plus } from 'lucide-react';
import TaskCard from '../dashboard/TaskCard';
import { motion } from 'framer-motion';

interface KanbanColumnProps {
  title: string;
  tasks: any[];
  columnId: string;
  onMove?: () => void;
}

export default function KanbanColumn({ title, tasks, columnId, onMove }: KanbanColumnProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const payload = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    let info;
    try {
      info = JSON.parse(payload);
    } catch (err) {
      info = { taskId: payload };
    }

    const { taskId, fromStatus } = info;
    if (!taskId) return;

    // Only update if moving to a different status column
    if (fromStatus === columnId) return;

    // call API to reorder (backend endpoint: PUT /api/tasks/reorder)
    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    try {
      const res = await fetch(`${base}/tasks/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ taskId, newStatus: columnId, newPosition: 0 })
      });

      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || 'Failed to move task');
      }

      // notify parent to refresh
      if (typeof onMove === 'function') onMove();
    } catch (err) {
      // ignore
      console.error(err);
    }
  };

  return (
    <div
      className="flex h-full w-72 min-w-[18rem] flex-col rounded-lg bg-gray-50 dark:bg-gray-800"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center">
          <h3 className="font-medium">{title}</h3>
          <div className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-medium dark:bg-gray-700">
            {tasks.length}
          </div>
        </div>
        
        <button className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      <div
        className={`flex flex-1 flex-col gap-3 overflow-y-auto p-3 transition-colors ${
          isDraggingOver ? 'bg-primary-50 dark:bg-primary-900/20' : ''
        }`}
      >
        {tasks.map((task) => {
          const tid = task._id || task.id || (task._doc && (task._doc._id || task._doc.id));
          const rawStatus = task.status || 'todo';
          const fromStatus = rawStatus.toLowerCase() === 'to do' || rawStatus.toLowerCase() === 'to-do' ? 'todo' :
                             rawStatus.toLowerCase() === 'in progress' || rawStatus.toLowerCase() === 'in_progress' ? 'in-progress' :
                             rawStatus.toLowerCase();
          return (
            <motion.div
              key={tid || task.id}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              draggable
              onDragStart={(e) => {
                const data = JSON.stringify({ taskId: tid || task.id, fromStatus });
                e.dataTransfer.setData('application/json', data);
                const target = e.currentTarget;
                setTimeout(() => {
                  target.classList.add('opacity-40', 'scale-95', 'rotate-2');
                }, 0);
              }}
              onDragEnd={(e) => {
                e.currentTarget.classList.remove('opacity-40', 'scale-95', 'rotate-2');
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-grab active:cursor-grabbing"
            >
              <TaskCard task={task} />
            </motion.div>
          );
        })}
        
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              No tasks yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}