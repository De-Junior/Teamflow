// PASTE LOCATION: src/app/(auth)/layout.tsx (overwrite entire file)
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-1.5 text-center">
          <Image
            src="/teamflow_logo.png"
            alt="TeamFlow"
            width={1877}
            height={838}
            style={{ width: "180px", height: "auto" }}
            priority
          />
          <p className="text-sm text-muted-foreground">Projects and tasks, in sync.</p>
        </div>
        {children}
      </div>
    </div>
  );
}