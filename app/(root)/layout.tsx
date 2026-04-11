import Header from "@/components/shared/header";
import Footer from "@/components/footer";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    const session = await auth();
    if (!session?.user) redirect("/sign-in");

    return (
    <div className="flex h-screen flex-col">
        <Header />
        <main className="flex-1 wrapper">
            {children}
        </main>
        <Footer />
    </div>
    );
  }
