import type { FarmInvitation } from '../../features/staff/staffService';
import type { NotificationItem } from '../../features/notifications/notificationService';
import { Icon } from '../../shared/components/Icon';
import '../../styles/notification.css';

type Props = {
  lang: string;
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  invitations: FarmInvitation[];
  respondingInvId: number | null;
  invitationError?: string | null;
  onMarkAllAsRead: () => void;
  onNotificationClick: (n: NotificationItem) => void;
  onRespond: (inv: FarmInvitation, action: 'approve' | 'reject') => void;
};

export function NotificationPopover({
  lang,
  notifications,
  unreadCount,
  loading,
  invitations,
  respondingInvId,
  invitationError,
  onMarkAllAsRead,
  onNotificationClick,
  onRespond,
}: Props) {
  const en = lang === 'en';
  const isEmpty = !loading && notifications.length === 0 && invitations.length === 0;

  return (
    <div className="notif-popover" role="dialog" aria-label={en ? 'Notifications' : 'Thông báo'}>
      <div className="notif-header">
        <h3>{en ? 'Notifications' : 'Thông báo'}</h3>
        {unreadCount > 0 && (
          <button type="button" className="notif-link-btn" onClick={onMarkAllAsRead}>
            {en ? 'Mark all as read' : 'Đánh dấu đã đọc'}
          </button>
        )}
      </div>

      <div className="notif-body">
        {invitationError && (
          <p role="alert" className="form-error-banner" style={{ margin: '0 0 10px' }}>
            {invitationError}
          </p>
        )}
        {invitations.length > 0 && (
          <section className="notif-section">
            <p className="notif-section-title">
              {en ? 'Invitations' : 'Lời mời'}
              <span className="notif-count">{invitations.length}</span>
            </p>
            {invitations.map((inv) => {
              const isOwner = inv.farmRole?.toLowerCase() === 'owner';
              const roleLabel = en
                ? isOwner ? 'Co-Owner' : 'Technical Staff'
                : isOwner ? 'Đồng sở hữu' : 'Nhân viên kỹ thuật';
              const busy = respondingInvId === inv.memberId;
              return (
                <div key={inv.memberId} className="notif-invite">
                  <div className="notif-icon">
                    <Icon name="leaf" size={16} />
                  </div>
                  <div className="notif-invite-main">
                    <strong>{inv.farmName}</strong>
                    <span>
                      {en ? 'Join as' : 'Tham gia với vai trò'} <b>{roleLabel}</b>
                    </span>
                    <small>
                      {en ? 'Invited by' : 'Người mời'}: {inv.ownerName}
                    </small>
                    <div className="notif-invite-actions">
                      <button
                        type="button"
                        className="notif-btn notif-btn-primary"
                        disabled={busy}
                        onClick={() => onRespond(inv, 'approve')}
                      >
                        {en ? 'Accept' : 'Chấp nhận'}
                      </button>
                      <button
                        type="button"
                        className="notif-btn notif-btn-ghost"
                        disabled={busy}
                        onClick={() => onRespond(inv, 'reject')}
                      >
                        {en ? 'Decline' : 'Từ chối'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <section className="notif-section">
          {invitations.length > 0 && (
            <p className="notif-section-title">{en ? 'System' : 'Hệ thống'}</p>
          )}
          {loading && notifications.length === 0 ? (
            <p className="notif-empty">{en ? 'Loading...' : 'Đang tải...'}</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notif-item ${n.isRead ? 'is-read' : 'is-unread'}`}
                onClick={() => onNotificationClick(n)}
              >
                <span className="notif-icon">
                  <Icon name={n.notificationType === 'FARM_REGISTRATION' ? 'leaf' : 'bell'} size={16} />
                </span>
                <span className="notif-item-content">
                  <strong>{n.title}</strong>
                  <span className="notif-message">{n.message}</span>
                  <time dateTime={n.createdAt}>
                    {new Date(n.createdAt).toLocaleString(en ? 'en-US' : 'vi-VN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </time>
                </span>
                {!n.isRead && <span className="notif-dot" aria-label={en ? 'Unread' : 'Chưa đọc'} />}
              </button>
            ))
          )}
        </section>

        {isEmpty && (
          <p className="notif-empty">
            {en ? 'All caught up. No new notifications.' : 'Bạn đã xem hết. Không có thông báo mới.'}
          </p>
        )}
      </div>
    </div>
  );
}