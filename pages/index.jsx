import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '@/store/slices/adminSlice';

export default function Home() {
    const router = useRouter();
    const authenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectAuthLoading);

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
