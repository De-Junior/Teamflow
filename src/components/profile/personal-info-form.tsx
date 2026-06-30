// PASTE LOCATION: src/components/profile/personal-info-form.tsx (create new file)
"use client";

import { useState }  from "react";
import { useSession } from "next-auth/react";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Africa/Johannesburg",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney",
];
const LANGUAGES = [
  { value: "en", label: "English" }, { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },  { value: "pt", label: "Portuguese" },
  { value: "de", label: "German" },  { value: "zh", label: "Chinese" },
];

export function PersonalInfoForm({
  initialName, email, initialPhone, initialTimezone, initialLanguage, initialBio,
}: {
  initialName: string; email: string;
  initialPhone: string; initialTimezone: string;
  initialLanguage: string; initialBio: string;
}) {
  const { update } = useSession();
  const [name, setName]         = useState(initialName);
  const [phone, setPhone]       = useState(initialPhone);
  const [timezone, setTimezone] = useState(initialTimezone || "UTC");
  const [language, setLanguage] = useState(initialLanguage || "en");
  const [bio, setBio]           = useState(initialBio);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null); setSuccess(false); setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone || null, timezone, language, bio: bio || null }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.message); return; }
      await update({ name: name.trim() });
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => { setName(e.target.value); setSuccess(false); }} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+27 82 123 4567" value={phone} onChange={(e) => { setPhone(e.target.value); setSuccess(false); }} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Timezone</Label>
          <Select value={timezone} onValueChange={(v) => { setTimezone(v); setSuccess(false); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Language</Label>
        <Select value={language} onValueChange={(v) => { setLanguage(v); setSuccess(false); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" placeholder="A short bio about yourself…" value={bio}
          onChange={(e) => { setBio(e.target.value); setSuccess(false); }} disabled={saving} maxLength={500} />
        <p className="text-xs text-muted-foreground">{bio.length}/500</p>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {success && <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600">Profile updated.</p>}

      <div>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}