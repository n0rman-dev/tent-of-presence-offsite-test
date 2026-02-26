// components/ProtectedRoute.tsx
import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import api from '@/utils/api'; // adjust path if needed

export default function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        router.replace('/auth/login');
        return;
      }

      try {
        await api.get('/api/auth/me'); // endpoint must require auth
        setLoading(false);
      } catch (error) {
        localStorage.removeItem('token');
        router.replace('/auth/login');
      }
    };

    validateToken();
  }, [router]);

  if (loading) return <p>Checking authentication...</p>;

  return <>{children}</>;
}