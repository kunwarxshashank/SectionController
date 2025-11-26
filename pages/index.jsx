import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
    const router = useRouter();
    const { authenticated, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (authenticated) {
                router.push('/home');
            } else {
                router.push('/login');
            }
        }
    }, [authenticated, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="spinner"></div>
        </div>
    );
}
