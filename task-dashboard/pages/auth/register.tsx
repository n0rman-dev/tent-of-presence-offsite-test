// pages/auth/register.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../utils/api';
import Link from "next/link";

export default function Register() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setError(null);
        setFieldErrors({});

        try {
            const res = await api.post('/api/auth/register', form);

            // Save JWT token
            const token = res.data.token;
            localStorage.setItem('token', token);

            // Redirect
            router.push('/tasks');

        } catch (err: any) {
            if (!err.response) {
                setError('Network error. Please try again.');
                return;
            }

            const { status, data } = err.response;

            // 422 - Validation errors
            if (status === 422 && data.errors) {
                setFieldErrors(data.errors);
                setError(data.message);
            }

            // 409 - Email already registered
            else if (status === 409) {
                setError(data.message);
            }

            // Other errors
            else {
                setError(data?.message || 'Registration failed.');
            }
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "2rem auto" }}>
            <h1 style={{ textAlign: "center" }}>Register</h1>

            <form
                onSubmit={handleSubmit}
                style={{
                    margin: "40px auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                }}
            >
                {/* Name */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <input
                        name="name"
                        placeholder="Name"
                        value={form.name}
                        onChange={handleChange}
                    />
                    {fieldErrors.name && (
                        <span style={{ color: "red", fontSize: "0.85rem" }}>
                            {fieldErrors.name}
                        </span>
                    )}
                </div>

                {/* Email */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <input
                        name="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                    />
                    {fieldErrors.email && (
                        <span style={{ color: "red", fontSize: "0.85rem" }}>
                            {fieldErrors.email}
                        </span>
                    )}
                </div>

                {/* Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={handleChange}
                    />
                    {fieldErrors.password && (
                        <span style={{ color: "red", fontSize: "0.85rem" }}>
                            {fieldErrors.password}
                        </span>
                    )}
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                </button>
            </form>

            {/* Global Error (409 / Network etc.) */}
            {error && (
                <p style={{ color: "red", textAlign: "center", marginTop: "8px" }}>
                    {error}
                </p>
            )}

            <p style={{ textAlign: "center", marginTop: "16px" }}>
                Already have an account?{" "}
                <Link style={{ color: "LinkText" }} href="/auth/login">
                    Login
                </Link>
            </p>
        </div>
    );
}