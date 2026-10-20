import { useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';

interface FarmTask {
  id: number;
  taskTitle: string;
  assignedTo: string;
  dueDate: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  status: 'TODO' | 'DOING' | 'DONE';
  category: string;
  notes?: string;
}

export function TasksPage() {
  const { selectedFarm } = useFarmWorkspace();
  const [tasks, setTasks] = useState<FarmTask[]>([
    {
      id: 1,
      taskTitle: 'Pha chế dịch dinh dưỡng và kiểm tra hệ thống tưới nhỏ giọt',
      assignedTo: 'Nguyễn Văn An',
      dueDate: '2026-03-29',
      priority: 'HIGH',
      status: 'TODO',
      category: 'Tưới tiêu & Dinh dưỡng',
      notes: 'Đo EC và pH bồn chứa trước khi bật bơm tự động',
    },
    {
      id: 2,
      taskTitle: 'Phun chế phẩm vi sinh ngừa bọ trĩ luống A2-A4',
      assignedTo: 'Trần Thị Bích',
      dueDate: '2026-03-29',
      priority: 'URGENT',
      status: 'DOING',
      category: 'Bảo vệ thực vật',
      notes: 'Dùng Neem Oil nồng độ 0.2%, phun lúc chiều râm mát',
    },
    {
      id: 3,
      taskTitle: 'Cắt tỉa nhánh phụ và cố định dây leo giàn dưa',
      assignedTo: 'Lê Văn Cường',
      dueDate: '2026-03-30',
      priority: 'NORMAL',
      status: 'DOING',
      category: 'Chăm sóc sinh trưởng',
      notes: 'Giữ lại 1 nhánh chính và tỉa bỏ các chồi nách dưới mắt lá số 5',
    },
    {
      id: 4,
      taskTitle: 'Lấy mẫu đất và nước tưới gửi xét nghiệm định kỳ VietGAP',
      assignedTo: 'Nguyễn Văn An',
      dueDate: '2026-03-27',
      priority: 'HIGH',
      status: 'DONE',
      category: 'Tuân thủ VietGAP',
      notes: 'Đã gửi trung tâm kiểm định Vinacert, chờ kết quả',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('Nguyễn Văn An');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL'>('NORMAL');
  const [category, setCategory] = useState('Chăm sóc cây trồng');
  const [notes, setNotes] = useState('');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const newTask: FarmTask = {
      id: Date.now(),
      taskTitle: taskTitle.trim(),
      assignedTo,
      dueDate,
      priority,
      status: 'TODO',
      category,
      notes: notes.trim(),
    };
    setTasks([newTask, ...tasks]);
    setIsModalOpen(false);
    setTaskTitle('');
    setNotes('');
  };

  const handleToggleStatus = (taskId: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = t.status === 'TODO' ? 'DOING' : t.status === 'DOING' ? 'DONE' : 'TODO';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const getPriorityBadge = (p: FarmTask['priority']) => {
    switch (p) {
      case 'URGENT':
        return <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c', fontSize: '11.5px', fontWeight: 700 }}>Khẩn cấp</span>;
      case 'HIGH':
        return <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', fontSize: '11.5px', fontWeight: 700 }}>Ưu tiên cao</span>;
      default:
        return <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontSize: '11.5px' }}>Bình thường</span>;
    }
  };

  const columns: { key: FarmTask['status']; title: string; count: number; color: string }[] = [
    { key: 'TODO', title: 'Cần thực hiện', count: tasks.filter((t) => t.status === 'TODO').length, color: '#f59e0b' },
    { key: 'DOING', title: 'Đang triển khai', count: tasks.filter((t) => t.status === 'DOING').length, color: '#0284c7' },
    { key: 'DONE', title: 'Đã hoàn thành', count: tasks.filter((t) => t.status === 'DONE').length, color: '#10b981' },
  ];

  return (
    <section className="tasks-page">
      <div className="page-heading">
        <div>
          <h1>Phân công & Quản lý công việc</h1>
          <p className="page-subtitle">
            Giao việc, theo dõi tiến độ công nhật và giám sát quy trình lao động nông trại {selectedFarm?.farmName || ''}
          </p>
        </div>
        <div>
          <button type="button" className="primary-button" onClick={() => setIsModalOpen(true)}>
            <Icon name="plus" /> Giao việc mới
          </button>
        </div>
      </div>

      {/* Kanban Board Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }} />
                  <strong style={{ fontSize: '15px', color: '#0f172a' }}>{col.title}</strong>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  {colTasks.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="panel"
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="profile-tag-pill" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                        {task.category}
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>

                    <h4 style={{ margin: '0 0 8px', fontSize: '14.5px', color: '#0f172a', fontWeight: 650, lineHeight: 1.4 }}>
                      {task.taskTitle}
                    </h4>

                    {task.notes && (
                      <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: '#64748b', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px' }}>
                        📝 {task.notes}
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                      <span>👤 {task.assignedTo}</span>
                      <span>📅 Hạn: {task.dueDate}</span>
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="action-button"
                        style={{ padding: '3px 8px', fontSize: '11.5px' }}
                        onClick={() => handleToggleStatus(task.id)}
                      >
                        {task.status === 'TODO' ? 'Bắt đầu làm →' : task.status === 'DOING' ? '✓ Hoàn thành' : '↺ Đặt lại'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Giao việc mới */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '28px' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: '#0f172a' }}>Giao nhiệm vụ nông trại mới</h2>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Tên công việc *</label>
                <input type="text" required placeholder="Ví dụ: Kiểm tra nồng độ dinh dưỡng giàn tưới" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Người phụ trách</label>
                  <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <option value="Nguyễn Văn An">Nguyễn Văn An</option>
                    <option value="Trần Thị Bích">Trần Thị Bích</option>
                    <option value="Lê Văn Cường">Lê Văn Cường</option>
                    <option value="Phạm Thị Duyên">Phạm Thị Duyên</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Hạn hoàn thành</label>
                  <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Mức độ ưu tiên</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as 'URGENT' | 'HIGH' | 'NORMAL')} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <option value="NORMAL">Bình thường</option>
                    <option value="HIGH">Ưu tiên cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Phân nhóm công việc</label>
                  <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>Ghi chú hướng dẫn</label>
                <textarea rows={2} placeholder="Yêu cầu kỹ thuật, lưu ý bảo hộ an toàn..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="action-button" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="primary-button">Giao việc</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
