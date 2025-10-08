import { Project } from '../../data/mockData';

interface ProjectProgressProps {
  projects: Project[];
}

export default function ProjectProgress({ projects }: ProjectProgressProps) {
  return (
    <div className="card">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <h3 className="font-medium">Project Progress</h3>
      </div>
      
      <div className="p-5">
        <div className="space-y-5">
          {projects.map((project) => (
            <div key={project.id}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{project.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {project.progress}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-primary-500 dark:bg-primary-600 transition-all duration-500"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}