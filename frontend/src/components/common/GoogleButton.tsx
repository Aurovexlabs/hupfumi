import { useGoogleLogin } from '@react-oauth/google';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function GoogleButton() {
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();

  const login = useGoogleLogin({
    onSuccess: async (r) => {
      try {
        const { data } = await api.post('/auth/google', { code: r.code });
        setAuth(data.data.user, data.data.accessToken);
        qc.clear();
        toast.success('Signed in with Google!');
      } catch {}
    },
    flow: 'auth-code',
  });

  return (
    <button type="button" onClick={() => login()} className="btn-secondary w-full gap-3 py-3">
      <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
      <span>Continue with Google</span>
    </button>
  );
}
