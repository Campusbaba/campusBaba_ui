"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import schoolImage from "../../../public/images/school-bg.jpg";
import { Clipboard, Check } from "lucide-react";

const batchInfo = {
    batchName: "English Batch 2026",
    timings: "Sat-Thu, 9:00 AM - 11:00 AM",
    studentsEnrolled: "128 students",
    phone: "+880 1712-345678",
    email: "milon.sir@campusbaba.com",
};


export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await signIn("credentials", { email, password, redirect: false });
            if (result?.error) {
                toast.error(result.error);
            } else if (result?.ok) {
                toast.success("Login successful!");
                router.push("/");
                router.refresh();
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred during login");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async (key: string, text: string, label: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(key);
        toast.success(`${label} copied`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 via-white to-blue-100">
            <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
                {/* <section className="flex flex-col gap-6 bg-gradient-to-b from-white via-white to-sky-50/70 px-4 py-6 sm:px-8 lg:border-r lg:border-slate-200 lg:px-14 "> */}
                <section className="order-1 flex flex-col gap-6 bg-gradient-to-b from-white via-white to-sky-50/70 px-4 py-6 sm:px-6 sm:py-8 md:px-10 lg:min-h-screen lg:justify-center lg:border-r lg:border-slate-200 lg:px-14 lg:py-10">
                    <div className="w-full max-w-xl mx-auto">
                        <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-8">
                            {/* <div className="mb-6">
                                <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                                    Welcome back
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Sign in to your CampusBaba account
                                </p>
                            </div> */}
                            <header className="flex items-center gap-3 mx-auto mb-6">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-sky-500 text-sm font-semibold uppercase tracking-wider text-white shadow-sm">
                                    MB
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-slate-900">
                                        Milon Sir (English Batch)
                                    </p>
                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                        Login panel
                                    </p>
                                </div>
                            </header>


                            <form onSubmit={handleLogin} className="grid gap-4">
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="Enter your email"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        required disabled={isLoading} />
                                </div>
                                <div>
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" placeholder="Enter your password"
                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                        required disabled={isLoading} />
                                </div>
                                <Button type="submit" className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-700 to-sky-500 text-white shadow-sm hover:from-blue-600 hover:to-sky-400" disabled={isLoading}>
                                    {isLoading ? "Signing in..." : "Sign In"}
                                </Button>
                            </form>

                            <div className="mt-5 text-center text-xs text-slate-500">
                                <p>CampusBaba - Your Campus Portal</p>
                                <p className="mt-1">Powered by <a href="https://campusbaba.com" target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:underline">campusbaba.com</a></p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-xl mx-auto rounded-2xl border border-slate-200 bg-sky-50/80 p-5 shadow-sm">
                        <h3 className="text-center text-sm font-semibold text-slate-900">Role Credentials</h3>
                        {/* <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-slate-500">
                                        <th className="pb-2 pr-4">Role</th>
                                        <th className="pb-2 pr-4">Email</th>
                                        <th className="pb-2">Password</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-800">
                                    <tr className="border-t border-slate-200">
                                        <td className="py-2 pr-4 font-semibold text-blue-700">Admin</td>
                                        <td className="py-2 pr-4 font-mono">zaman@gmail.com</td>
                                        <td className="py-2 font-mono">password123</td>
                                    </tr>
                                    <tr className="border-t border-slate-200">
                                        <td className="py-2 pr-4 font-semibold text-slate-700">Teacher</td>
                                        <td className="py-2 pr-4 font-mono">lavern_howe@yahoo.com</td>
                                        <td className="py-2 font-mono">password123</td>
                                    </tr>
                                    <tr className="border-t border-slate-200">
                                        <td className="py-2 pr-4 font-semibold text-slate-700">Parent</td>
                                        <td className="py-2 pr-4 font-mono">tiara_wunsch@hotmail.com</td>
                                        <td className="py-2 font-mono">password123</td>
                                    </tr>
                                    <tr className="border-t border-slate-200">
                                        <td className="py-2 pr-4 font-semibold text-slate-700">Student</td>
                                        <td className="py-2 pr-4 font-mono">gabriella.harber@yahoo.com</td>
                                        <td className="py-2 font-mono">password123</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div> */}
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-slate-500">
                                        <th className="pb-2 pr-4">Role</th>
                                        <th className="pb-2 pr-4">Email</th>
                                        <th className="pb-2">Password</th>
                                    </tr>
                                </thead>

                                <tbody className="text-slate-800">
                                    {[
                                        {
                                            role: "Admin",
                                            email: "admin@gmail.com",
                                            password: "password123",
                                            color: "text-blue-700",
                                        },
                                        {
                                            role: "Teacher",
                                            email: "lavern_howe@yahoo.com",
                                            password: "password123",
                                            color: "text-slate-700",
                                        },
                                        {
                                            role: "Parent",
                                            email: "tiara_wunsch@hotmail.com",
                                            password: "password123",
                                            color: "text-slate-700",
                                        },
                                        {
                                            role: "Student",
                                            email: "gabriella.harber@yahoo.com",
                                            password: "password123",
                                            color: "text-slate-700",
                                        },
                                    ].map((user) => (
                                        <tr
                                            key={user.role}
                                            className="border-t border-slate-200 hover:bg-slate-50"
                                        >
                                            <td
                                                className={`py-2 pr-4 font-semibold ${user.color}`}
                                            >
                                                {user.role}
                                            </td>

                                            <td className="py-2 pr-4 font-mono">
                                                <span className="flex items-center gap-1.5">
                                                    {user.email}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                `${user.role}-email`,
                                                                user.email,
                                                                `${user.role} email`
                                                            )
                                                        }
                                                        className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 shrink-0"
                                                    >
                                                        {copiedField === `${user.role}-email` ? (
                                                            <Check className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <Clipboard className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </span>
                                            </td>

                                            <td className="py-2 font-mono">
                                                <span className="flex items-center gap-1.5">
                                                    {user.password}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                `${user.role}-password`,
                                                                user.password,
                                                                `${user.role} password`
                                                            )
                                                        }
                                                        className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 shrink-0"
                                                    >
                                                        {copiedField === `${user.role}-password` ? (
                                                            <Check className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <Clipboard className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>


                <aside className="relative flex min-h-[400px] items-end justify-center overflow-hidden p-4 sm:p-8 lg:min-h-screen lg:items-center">
                    <Image src={schoolImage} alt="School background" fill className="object-cover object-center" priority />
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-900/30 via-slate-900/60 to-slate-900/90" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(147,197,253,0.25),transparent_60%)]" />
                    <div className="relative z-10 w-full max-w-lg space-y-6 rounded-2xl border border-white/10 bg-slate-900/70 p-0 text-white shadow-2xl backdrop-blur-md">

                        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                            {[
                                { label: "Batch Name", value: batchInfo.batchName, highlight: true },
                                { label: "Batch Timings", value: batchInfo.timings },
                                { label: "Students Enrolled", value: batchInfo.studentsEnrolled },
                                { label: "Phone", value: batchInfo.phone },
                                { label: "Email", value: batchInfo.email },
                            ].map((item, i) => (
                                <div key={item.label}>
                                    {i > 0 && <div className="h-px bg-white/10 mb-3" />}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-white/50 uppercase tracking-wider shrink-0">{item.label}</span>
                                        <span className={`text-right text-sm min-w-0 ${item.highlight ? "font-semibold text-sky-300" : "font-medium text-white"}`}>{item.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* <div className="flex items-center justify-between rounded-full bg-white/10 px-4 py-2 text-xs">
                            <span className="text-white/70">Or sign in as a different user</span>
                            <span className="text-sky-300">&rarr;</span>
                        </div> */}
                    </div>
                </aside>
            </div>
        </div >
    );
}

