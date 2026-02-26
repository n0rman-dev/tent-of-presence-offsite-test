// pages/auth/login.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import Link from "next/link";

export default function Login() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/api/auth/login', form);
            localStorage.setItem('token', res.data.token);
            router.push('/tasks'); // redirect to task dashboard
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed.');
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '2rem auto' }}>
            <h1>Login</h1>
            <form
                style={{
                    margin: "60px auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                }}
                onSubmit={handleSubmit}>
                <input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
                <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} />
                <button type="submit">Login</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <p style={{ textAlign: "center", marginTop: "12px" }}>
                <Link style={{ color: 'LinkText' }} href="/auth/register">
                    Create New Account
                </Link>
            </p>
        </div>
    );
}