// PASTE LOCATION: src/app/(dashboard)/settings/coming-soon/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Plug, HardDrive } from "lucide-react";

const SECTIONS = [
  {
    icon: CreditCard,
    title: "Billing",
    items: ["Plan & usage", "Invoices", "Payment method", "Upgrade"],
  },
  {
    icon: Plug,
    title: "Integrations",
    items: ["Google", "Slack", "GitHub", "OpenAI", "Stripe"],
  },
  {
    icon: HardDrive,
    title: "Storage",
    items: ["Usage overview", "File browser", "Cleanup tools"],
  },
];

export default function ComingSoonSettingsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        These sections need real third-party integrations (billing, OAuth, file storage) that
        aren&apos;t wired up yet. Here&apos;s what&apos;s planned.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SECTIONS.map(({ icon: Icon, title, items }) => (
          <Card key={title} className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
                <Icon className="size-4" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}