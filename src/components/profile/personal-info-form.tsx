"use client";

import { useState }  from "react";
import { useSession } from "next-auth/react";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast }     from "sonner";
import { api, errorMessage } from "@/lib/api-client";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Africa/Johannesburg",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney",
];

export function PersonalInfoForm({
  initialName, email, initialPhone, initialTimezone, initialBio,
}: {
  initialName: string; email: string;
  initialPhone: string; initialTimezone: string;
  initialBio: string;
}) {
  const { update } = useSession();
  const [name, setName]         = useState(initialName);
  const [phone, setPhone]       = useState(initialPhone);
  const [timezone, setTimezone] = useState(initialTimezone || "UTC");
  const [bio, setBio]           = useState(initialBio);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null); setSaving(true);
    try {
      await api.patch("/api/users", { name: name.trim(), phone: phone || null, timezone, bio: bio || null });
      await update({ name: name.trim() });
      toast.success("Profile updated.");
    } catch (err) {
      setError(errorMessage(err));
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled aria-describedby="email-hint" />
          <p id="email-hint" className="text-xs text-muted-foreground">Your sign-in email can&apos;t be changed here.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+27 82 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" placeholder="A short bio about yourself…" value={bio}
          onChange={(e) => setBio(e.target.value)} disabled={saving} maxLength={500} />
        <p className="text-xs text-muted-foreground">{bio.length}/500</p>
      </div>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}