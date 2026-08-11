import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import { ArrowLeft, MessageCircle, User, Calendar, Tag, Plus, Trash, CheckSquare, Square, Paperclip, File, Download, UploadCloud, Eye, X, Pencil } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import EditTaskModal from '../components/modals/EditTaskModal';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();
  const attachmentsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (!loading && task) {
      const params = new URLSearchParams(location.search);
      if (params.get('focus') === 'attachments' && attachmentsRef.current) {
        // Scroll to the attachments section smoothly
        attachmentsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Open file dialog automatically
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }

        // Temporarily highlight the section with a smooth transition
        const element = attachmentsRef.current;
        element.classList.add('ring-4', 'ring-primary-500/40', 'dark:ring-primary-400/40', 'transition-all', 'duration-300');
        
        const timer = setTimeout(() => {
          element.classList.remove('ring-4', 'ring-primary-500/40', 'dark:ring-primary-400/40');
        }, 2500);

        return () => clearTimeout(timer);
      }
    }
  }, [location.search, loading, task]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    try {
      const response = await fetch(`${base}/tasks/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ text: newComment.trim() })
      });
      const data = await response.json();
      if (data.success) {
        const addedComment = {
           ...data.data,
           user: currentUser
        };
        setTask((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), addedComment]
        }));
        setNewComment('');
      } else {
        alert(data.error || 'Failed to add comment');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    try {
      const response = await fetch(`${base}/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      if (data.success) {
        navigate(`/projects/${task.projectId || task.project?._id || task.project?.id || ''}`);
      } else {
        alert(data.error || 'Failed to delete task');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete task');
    }
  };

  useEffect(() => {
    if (!previewFile) {
      setTextContent(null);
      return;
    }
    const ext = previewFile.filename.split('.').pop()?.toLowerCase() || '';
    const isText = ['txt', 'log', 'json', 'js', 'ts', 'html', 'css', 'md'].includes(ext);
    if (isText) {
      const downloadUrl = previewFile.url.startsWith('/') 
        ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}${previewFile.url}` 
        : previewFile.url;
      
      fetch(downloadUrl)
        .then(res => res.text())
        .then(text => setTextContent(text))
        .catch(() => setTextContent('Error loading text preview.'));
    }
  }, [previewFile]);

  const getChecklist = () => {
    if (!task || !task.checklist) return [];
    if (typeof task.checklist === 'string') {
      try {
        return JSON.parse(task.checklist);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(task.checklist) ? task.checklist : [];
  };

  const updateChecklist = async (newChecklist: any[]) => {
    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    try {
      const response = await fetch(`${base}/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ checklist: newChecklist })
      });
      const data = await response.json();
      if (data.success) {
        setTask((prev: any) => ({ ...prev, checklist: newChecklist }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCheckItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckItem.trim()) return;
    const item = {
      id: Date.now().toString(),
      text: newCheckItem.trim(),
      completed: false
    };
    const updated = [...getChecklist(), item];
    updateChecklist(updated);
    setNewCheckItem('');
  };

  const handleToggleCheckItem = (itemId: string) => {
    const updated = getChecklist().map((item: any) => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateChecklist(updated);
  };

  const handleDeleteCheckItem = (itemId: string) => {
    const updated = getChecklist().filter((item: any) => item.id !== itemId);
    updateChecklist(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    try {
      const response = await fetch(`${base}/tasks/${id}/attachments`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setTask((prev: any) => ({
          ...prev,
          attachments: [...(prev.attachments || []), data.data]
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;

    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    try {
      const response = await fetch(`${base}/tasks/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      if (data.success) {
        setTask((prev: any) => ({
          ...prev,
          attachments: (prev.attachments || []).filter((att: any) => (att._id || att.id) !== attachmentId)
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const base = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
    fetch(`${base}/tasks/${id}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(res => res.json())
      .then(data => setTask(data.data || data.task || null))
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) return <div className="py-12 text-center"><span className="text-lg">Loading...</span></div>;
  if (!task) return <div className="py-12 text-center"><span className="text-lg">Task not found.</span></div>;

  const project = task.Project || task.project || {};

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <div className="mb-6">
        <Link to={`/projects/${project._id || project.id || project}`} className="inline-flex items-center text-primary-600 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Project
        </Link>
      </div>

      <div className="card rounded-xl shadow-lg p-8 bg-white dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <Badge>{task.status}</Badge>
            {['admin', 'chief_manager', 'ceo', 'cfo', 'cmo', 'cto'].includes(currentUser?.role || '') && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  title="Edit Task"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDeleteTask}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Delete Task"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <span className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="h-4 w-4" /> {task.dueDate ? formatDate(new Date(task.dueDate)) : 'No due date'}</span>
            <span className="flex items-center gap-1 text-sm text-gray-500"><Tag className="h-4 w-4" /> {task.priority || 'Medium'}</span>
          </div>
        </div>

        <p className="mb-6 text-gray-700 dark:text-gray-300 text-lg">{task.description}</p>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary-500" />
            <div className="flex items-center gap-3">
              {task.assignee ? (
                <>
                  <Avatar src={task.assignee.avatar} name={task.assignee.name || 'User'} size="sm" />
                  <div>
                    <div className="text-sm font-medium">{task.assignee.name}</div>
                    <div className="text-xs text-gray-500">Assignee</div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">Unassigned</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary-500" />
            <div>
              <div className="text-sm font-medium">{task.assignedBy?.name || 'Unknown'}</div>
              <div className="text-xs text-gray-500">Assigned by</div>
            </div>
          </div>
        </div>

        {/* Checklist & Document Upload side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          {/* Checklist Column */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary-500" /> To-Do List
            </h3>
            
            <form onSubmit={handleAddCheckItem} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a to-do item..."
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button type="submit" className="btn btn-primary px-3 py-1.5 text-sm flex items-center gap-1">
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>

            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {getChecklist().map((item: any) => (
                <li key={item.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-2 cursor-pointer min-w-0 flex-1" onClick={() => handleToggleCheckItem(item.id)}>
                    {item.completed ? (
                      <CheckSquare className="h-5 w-5 text-primary-500 shrink-0" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400 dark:text-gray-600 shrink-0" />
                    )}
                    <span className={`text-sm truncate ${item.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {item.text}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteCheckItem(item.id)} className="text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors p-1 shrink-0">
                    <Trash className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {getChecklist().length === 0 && (
                <li className="text-sm text-gray-500 py-2">No to-do items created yet.</li>
              )}
            </ul>
          </div>

          {/* Document Upload Column */}
          <div ref={attachmentsRef} className="space-y-4 p-2 rounded-lg transition-all duration-300">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary-500" /> Documents
            </h3>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer relative">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="h-8 w-8 text-gray-400 mb-2 animate-bounce-subtle" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                {uploading ? 'Uploading...' : 'Click to upload a document'}
              </span>
              <span className="text-xs text-gray-400 mt-1 text-center">PDF, DOC, XLS, ZIP, Images up to 10MB</span>
            </div>

            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {(task.attachments || []).map((att: any) => {
                const downloadUrl = att.url.startsWith('/') 
                  ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}${att.url}` 
                  : att.url;
                return (
                  <li key={att._id || att.id} className="flex items-center justify-between p-2.5 rounded-md border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary-300 dark:hover:border-primary-800 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => setPreviewFile(att)}>
                      <File className="h-4 w-4 text-primary-500 shrink-0" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate hover:text-primary-600 dark:hover:text-primary-400" title={att.filename}>
                        {att.filename}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <button
                        onClick={() => setPreviewFile(att)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 font-medium"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                      <a 
                        href={downloadUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        download
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                      <button
                        onClick={() => handleDeleteAttachment(att._id || att.id)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        <Trash className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </li>
                );
              })}
              {(!task.attachments || task.attachments.length === 0) && (
                <li className="text-sm text-gray-500 py-2">No documents uploaded yet.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Comments</h3>
          
          <form onSubmit={handleAddComment} className="mb-6">
            <div className="flex gap-3">
              <Avatar name={currentUser?.name || 'User'} src={currentUser?.avatar} size="sm" />
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button 
                    type="submit" 
                    className="btn btn-primary px-4 py-2"
                    disabled={submittingComment || !newComment.trim()}
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {task.comments && task.comments.length > 0 ? (
            <ul className="space-y-3">
              {task.comments.map((c: any) => {
                const commentUser = c.user || c.User || {};
                return (
                <li key={c._id || c.id || c.createdAt} className="p-3 rounded bg-gray-100 dark:bg-gray-800">
                  <div className="flex items-start gap-3">
                    <Avatar name={commentUser.name || 'User'} src={commentUser.avatar} size="xs" />
                    <div>
                      <div className="text-sm font-medium">{commentUser.name || 'User'} <span className="text-xs text-gray-500">· {formatDate(new Date(c.createdAt))}</span></div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">{c.text}</div>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">No comments yet.</div>
          )}
        </div>

        <div className="text-xs text-gray-400 mt-8">Created {task.createdAt ? formatDate(new Date(task.createdAt)) : 'N/A'}</div>
      </div>

      {/* Document Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 min-w-0">
                <File className="h-5 w-5 text-primary-500 shrink-0" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate" title={previewFile.filename}>
                  {previewFile.filename}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-950/20">
              {(() => {
                const ext = previewFile.filename.split('.').pop()?.toLowerCase() || '';
                const downloadUrl = previewFile.url.startsWith('/') 
                  ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}${previewFile.url}` 
                  : previewFile.url;

                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                  return (
                    <img 
                      src={downloadUrl} 
                      alt={previewFile.filename} 
                      className="max-w-full max-h-[65vh] rounded-lg object-contain mx-auto shadow-md"
                    />
                  );
                }

                if (ext === 'pdf') {
                  return (
                    <iframe 
                      src={downloadUrl} 
                      className="w-full h-[65vh] rounded-lg border-0 shadow-sm"
                      title={previewFile.filename}
                    />
                  );
                }

                if (['txt', 'log', 'json', 'js', 'ts', 'html', 'css', 'md'].includes(ext)) {
                  return (
                    <pre className="p-4 rounded-lg bg-gray-100 dark:bg-gray-900 overflow-auto max-h-[65vh] text-xs font-mono text-left whitespace-pre-wrap border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200">
                      {textContent || 'Loading content...'}
                    </pre>
                  );
                }

                return (
                  <div className="py-16 text-center flex flex-col items-center justify-center">
                    <div className="h-16 w-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
                      <File className="h-8 w-8 text-primary-500" />
                    </div>
                    <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      No direct preview available
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                      We can't render a preview for this file type ({ext.toUpperCase()}). You can download it to view it on your machine.
                    </p>
                    <a 
                      href={downloadUrl} 
                      download 
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" /> Download File
                    </a>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <a 
                href={previewFile.url.startsWith('/') 
                  ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}`}${previewFile.url}` 
                  : previewFile.url}
                download
                className="btn border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <Download className="h-4 w-4" /> Download
              </a>
              <button 
                onClick={() => setPreviewFile(null)}
                className="btn btn-primary"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Task Modal */}
      {isEditModalOpen && (
        <EditTaskModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          task={task}
          onSubmit={(updatedTask) => {
            setTask((prev: any) => ({ ...prev, ...updatedTask }));
          }} 
        />
      )}
    </div>
  );
}
