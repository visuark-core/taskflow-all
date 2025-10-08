import React, { useEffect, useState } from 'react';
import TaskCard from '../components/dashboard/TaskCard';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const token = localStorage.getItem('token');
  // TODO: Replace with actual project ID or selection logic
  const projectId = '';

  useEffect(() => {
    if (!projectId) return;
    fetch(`http://localhost:5000/api/tasks/project/${projectId}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(res => res.json())
      .then(data => setTasks(data.data || []));
  }, [token, projectId]);

  if (!projectId) {
    return <div>Please select a project to view tasks.</div>;
  }

  return (
    <div>
      {tasks.length === 0 ? (
        <div>No tasks found for this project.</div>
      ) : (
        tasks.map(task => (
          <TaskCard key={task._id || task.id} task={task} />
        ))
      )}
    </div>
  );
}
