import { useState } from 'react';
import { Plus, Filter, SortAsc } from 'lucide-react';
import KanbanColumn from '../components/kanban/KanbanColumn';
import { kanbanColumns } from '../data/mockData';

export default function KanbanBoard() {
  const [columns] = useState(kanbanColumns);
  
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center rounded-md border border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <button className="flex items-center gap-1 rounded-l-md border-r border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </button>
            <button className="flex items-center gap-1 rounded-r-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
              <SortAsc className="h-3.5 w-3.5" />
              <span>Sort</span>
            </button>
          </div>
          
          <button className="btn btn-primary">
            <Plus className="mr-1 h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>
      
      {/* Kanban Board */}
      <div className="flex h-[calc(100vh-12rem)] gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            title={column.title}
            tasks={column.tasks}
            columnId={column.id}
          />
        ))}
        
        <div className="flex-shrink-0 w-72">
          <button className="flex h-12 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 font-medium text-gray-500 hover:border-primary-500 hover:text-primary-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400">
            <Plus className="mr-1 h-4 w-4" />
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
}