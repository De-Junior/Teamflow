// PASTE LOCATION: src/components/dashboard/widgets/welcome-banner.tsx
import Image from "next/image";

export function WelcomeBanner({
  userName,
  organizationName,
}: {
  userName: string | null;
  organizationName: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <Image
          src="/teamflow_logo.png"
          alt={organizationName}
          width={1877}
          height={838}
          style={{ width: "auto", height: "32px" }}
          priority
        />
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-sm font-medium text-foreground">{organizationName}</p>
          <p className="text-xs text-muted-foreground">
            Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
          </p>
        </div>
      </div>

      <span
        title="Billing isn't set up yet"
        className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
      >
        Free plan
      </span>
    </div>
  );
}