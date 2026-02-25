// pages/tasks/index.tsx
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../utils/api';
import { logout } from '../../utils/auth';

type Task = {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date: string;
};

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // New task form state
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        due_date: '',
    });

    // Fetch tasks from backend
    const fetchTasks = async () => {
        try {
            const res = await api.get('/api/tasks');
            setTasks(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch tasks.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    // Create a new task
    const handleCreate = async () => {
        try {
            const payload = {
                ...newTask,
                status: newTask.status || 'todo',
                priority: newTask.priority || 'medium',
                due_date: newTask.due_date,
            };

            const res = await api.post('/api/tasks', payload);
            setTasks(prev => [...prev, res.data.data]); // use res.data.data for backend
            setNewTask({
                title: '',
                description: '',
                status: 'todo',
                priority: 'medium',
                due_date: '',
            });
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create task.');
        }
    };

    // Delete a task
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.delete(`/api/tasks/${id}`);
            setTasks(prev => prev.filter(task => task.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete task.');
        }
    };

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    const filteredTasks = tasks.filter(task =>
        (!statusFilter || task.status === statusFilter) &&
        (!priorityFilter || task.priority === priorityFilter)
    );

    // Editing
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTaskData, setEditingTaskData] = useState<Partial<Task>>({});

    // Helper function
    const formatStatus = (status: string) => {
        switch (status) {
            case 'todo': return 'To Do';
            case 'in_progress': return 'In Progress';
            case 'done': return 'Done';
            default: return status;
        }
    };

    const formatPriority = (priority: string) => {
        switch (priority) {
            case 'low': return 'Low';
            case 'medium': return 'Medium';
            case 'high': return 'High';
            default: return priority;
        }
    };

    // Helper function
    const formatDueDate = (dueDate: string | null) => {
        if (!dueDate) return 'No due date';
        return new Date(dueDate).toLocaleDateString('en-GB');
    };

    const formatDueDateForInputValue = (dueDate: string | null) => {
        if (!dueDate) return 'No due date';

        const date = new Date(dueDate);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    if (loading) return <ProtectedRoute><p>Loading tasks...</p></ProtectedRoute>;
    if (error) return <ProtectedRoute><p style={{ color: 'red' }}>{error}</p></ProtectedRoute>;

    return (
        <ProtectedRoute>
            <div style={{ margin: '2rem auto' }}>
                <h1 style={{ display: 'inline-block' }}>Task Dashboard</h1>
                <button style={{ float: 'right' }} onClick={logout}>Logout</button>

                {/* Create New Task */}
                <h2>Create New Task</h2>
                <div
                    id='new-task-form'
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.5rem',
                        marginBottom: '1rem',
                    }}
                >
                    <input
                        placeholder="Title"
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    />
                    <input
                        placeholder="Description"
                        value={newTask.description}
                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    />
                    <select
                        value={newTask.status}
                        onChange={e => setNewTask({ ...newTask, status: e.target.value })}
                    >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                    </select>
                    <select
                        value={newTask.priority}
                        onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <input
                        type="date"
                        value={newTask.due_date ?? ''}
                        onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                </div>
                <button onClick={handleCreate}>Create Task</button>

                {/* Filters */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '1rem',
                        margin: '1rem 0',
                        width: '100%',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '0.25rem', fontWeight: 500 }}>
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ marginBottom: '0.25rem', fontWeight: 500 }}>
                            Priority
                        </label>
                        <select
                            value={priorityFilter}
                            onChange={e => setPriorityFilter(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                </div>

                <h2>All Tasks</h2>
                <table id='task-table' style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', display: 'block', overflowY: 'auto'  }}>
                    <thead>
                        <tr>
                            <th>Done</th>
                            <th>Title</th>
                            <th style={{ width: '100vw' }}>Description</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Due Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.map(task => {
                            const isEditing = editingTaskId === task.id;
                            return (
                                <tr key={task.id} style={{ borderBottom: '1px solid #ccc' }}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={task.status === 'done'}
                                            onChange={async () => {
                                                try {
                                                    const res = await api.patch(`/api/tasks/${task.id}`, {
                                                        status: task.status === 'done' ? 'todo' : 'done',
                                                    });
                                                    setTasks(prev => prev.map(t => (t.id === task.id ? res.data.data : t)));
                                                } catch (err: any) {
                                                    alert(err.response?.data?.message || 'Failed to update task.');
                                                }
                                            }}
                                        />
                                    </td>
                                    {isEditing ? (
                                        <>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={editingTaskData.title ?? task.title}
                                                    onChange={e => setEditingTaskData(prev => ({ ...prev, title: e.target.value }))}
                                                />
                                            </td>
                                            <td>
                                                <textarea
                                                    rows={3}
                                                    style={{ width: '100%', padding: '0.5rem' }}
                                                    value={editingTaskData.description ?? task.description}
                                                    onChange={e =>
                                                        setEditingTaskData(prev => ({
                                                            ...prev,
                                                            description: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    value={editingTaskData.status ?? task.status}
                                                    onChange={e =>
                                                        setEditingTaskData(prev => ({ ...prev, status: e.target.value }))
                                                    }
                                                >
                                                    <option value="todo">To Do</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="done">Done</option>
                                                </select>
                                            </td>
                                            <td>
                                                <select
                                                    value={editingTaskData.priority ?? task.priority}
                                                    onChange={e =>
                                                        setEditingTaskData(prev => ({ ...prev, priority: e.target.value }))
                                                    }
                                                >
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="date"
                                                    value={formatDueDateForInputValue(editingTaskData.due_date ?? task.due_date ?? '')}
                                                    onChange={e =>
                                                        setEditingTaskData(prev => ({ ...prev, due_date: e.target.value }))
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <div className="task-actions">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await api.patch(`/api/tasks/${task.id}`, editingTaskData);
                                                            setTasks(prev =>
                                                                prev.map(t => (t.id === task.id ? res.data.data : t))
                                                            );
                                                            setEditingTaskId(null);
                                                            setEditingTaskData({});
                                                        } catch (err: any) {
                                                            alert(err.response?.data?.message || 'Failed to save task.');
                                                        }
                                                    }}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingTaskId(null);
                                                        setEditingTaskData({});
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{task.title}</td>
                                            <td style={{ whiteSpace: 'pre-wrap' }}>{task.description}</td>
                                            <td>{formatStatus(task.status)}</td>
                                            <td>{formatPriority(task.priority)}</td>
                                            <td>{formatDueDate(task.due_date)}</td>
                                            <td>
                                                <div className="task-actions">
                                                <button
                                                    onClick={() => {
                                                        setEditingTaskId(task.id);
                                                        setEditingTaskData({ ...task });
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button onClick={() => handleDelete(task.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </ProtectedRoute>
    );
}