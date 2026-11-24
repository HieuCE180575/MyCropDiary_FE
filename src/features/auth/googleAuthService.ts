import { authenticateWithGoogle, type GoogleAuthRequest } from './authApi';
import type { AuthSession } from './authStorage';

export const DEFAULT_GOOGLE_CLIENT_ID = '973286360901-obrn3lpbq7rski5tcdn5rakd33uaqr6m.apps.googleusercontent.com';

export function getGoogleClientId(): string {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (typeof envId === 'string' && envId.trim()) {
    return envId.trim();
  }
  return DEFAULT_GOOGLE_CLIENT_ID;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (err: unknown) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

/**
 * Đảm bảo Google Identity Services script đã sẵn sàng.
 */
export function ensureGoogleScriptLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => resolve());
      // Poll briefly if script is already loaded but execution is pending
      const interval = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, 3000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

/**
 * Mở cửa sổ popup chọn tài khoản Google (Account Chooser).
 * Liệt kê tất cả các tài khoản Google đã đăng nhập trên máy tính / trình duyệt người dùng.
 */
export async function promptGoogleAccountChooser(): Promise<GoogleAuthRequest> {
  await ensureGoogleScriptLoaded();

  const clientId = getGoogleClientId();
  const oauth2 = window.google?.accounts?.oauth2;

  if (!oauth2) {
    throw new Error('Không thể tải Google Identity Services SDK. Vui lòng kiểm tra kết nối mạng.');
  }

  return new Promise((resolve, reject) => {
    let resolved = false;

    try {
      const tokenClient = oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          resolved = true;
          if (tokenResponse.error) {
            if (tokenResponse.error === 'access_denied') {
              reject(new Error('Bạn đã hủy đăng nhập với Google.'));
            } else {
              reject(new Error(`Lỗi xác thực Google: ${tokenResponse.error}`));
            }
            return;
          }

          if (!tokenResponse.access_token) {
            reject(new Error('Google không trả về mã access token. Vui lòng thử lại.'));
            return;
          }

          try {
            // Lấy profile thực tế từ Google OAuth2 UserInfo API
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            });

            if (!userInfoRes.ok) {
              throw new Error(`Không lấy được thông tin hồ sơ Google (Mã lỗi ${userInfoRes.status})`);
            }

            const profile = (await userInfoRes.json()) as {
              email?: string;
              name?: string;
              picture?: string;
              sub?: string;
            };

            if (!profile.email) {
              throw new Error('Tài khoản Google này không cung cấp địa chỉ email.');
            }

            resolve({
              email: profile.email,
              fullName: profile.name || profile.email.split('@')[0],
              avatarUrl: profile.picture,
            });
          } catch (fetchErr) {
            reject(fetchErr instanceof Error ? fetchErr : new Error('Lỗi lấy thông tin Google UserInfo'));
          }
        },
        error_callback: (err) => {
          resolved = true;
          const errObj = err as { type?: string; message?: string } | null;
          if (errObj?.type === 'popup_closed' || errObj?.type === 'popup_failed_to_open') {
            reject(new Error('Bạn đã hủy đăng nhập với Google.'));
            return;
          }
          reject(new Error(errObj?.message || 'Không thể khởi tạo phiên Google.'));
        },
      });

      // Bắt buộc Google Account Chooser hiện danh sách tất cả tài khoản
      tokenClient.requestAccessToken({ prompt: 'select_account' });

      // Timeout an toàn phòng trường hợp trình duyệt không bắn sự kiện popup_closed
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Bạn đã hủy đăng nhập với Google.'));
        }
      }, 60000);
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Không thể mở popup Google.'));
    }
  });
}

/**
 * Thực hiện toàn bộ quy trình: Mở Google Account Chooser -> Chọn tài khoản -> Gửi về Backend -> Trả về AuthSession.
 */
export async function signInWithGoogleDirect(): Promise<AuthSession> {
  const googlePayload = await promptGoogleAccountChooser();
  return await authenticateWithGoogle(googlePayload);
}

/**
 * Khởi tạo Google One-Tap nếu có (tiện ích tự động gợi ý tài khoản ở góc trang).
 */
export async function initializeGoogleOneTap(onSuccess: (session: AuthSession) => void): Promise<void> {
  try {
    await ensureGoogleScriptLoaded();
    const clientId = getGoogleClientId();
    const googleId = typeof window !== 'undefined' ? window.google?.accounts?.id : undefined;
    if (googleId) {
      googleId.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async (response) => {
          if (response.credential) {
            try {
              const session = await authenticateWithGoogle({ idToken: response.credential });
              onSuccess(session);
            } catch (err) {
              console.warn('Lỗi xác thực Google One-Tap:', err);
            }
          }
        },
      });
      googleId.prompt();
    }
  } catch {
    // Silent fallback
  }
}

