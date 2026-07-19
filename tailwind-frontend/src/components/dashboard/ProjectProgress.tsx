import { Project } from '../../data/mockData';

interface ProjectProgressProps {
  projects: any[];
}

export default function ProjectProgress({ projects }: ProjectProgressProps) {
  // Calculate progress for each project based on tasks
  const getProjectProgress = (project: any) => {
    // If tasksCount exists, calculate from task completion
    if (project.tasksCount && project.tasksCount.total > 0) {
      return Math.round((project.tasksCount.completed / project.tasksCount.total) * 100);
    }
    // If project already has progress property, use it
    if (project.progress !== undefined && project.progress !== null) {
      return project.progress;
    }
    // Default to 0 if no progress data
    return 0;
  };

  return (
    <div className="card">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <h3 className="font-medium">Project Progress</h3>
      </div>
      
      <div className="p-5">
        <div className="space-y-5">
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <div key={project._id || project.id}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{project.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getProjectProgress(project)}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-primary-500 dark:bg-primary-600 transition-all duration-500"
                    style={{ width: `${getProjectProgress(project)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No projects to display</p>
          )}
        </div>
      </div>
    </div>
  );}