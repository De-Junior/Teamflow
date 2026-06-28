// PASTE LOCATION: src/components/team/team-client.tsx (create new file)
"use client";

import { useState, useMemo }         from "react";
import { MemberRow, type MemberRowData } from "@/components/team/member-row";
import { InvitationRow }             from "@/components/team/invitation-row";
import { InviteMemberDialog }        from "@/components/team/invite-member-dialog";
import { Input }                     from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Users, Shield, Code2, Eye, Mail } from "lucide-react";

export type InvitationData = {
  id:         string;
  email:      string;
  role:       string;
  createdAt:  string;
  expiresAt:  string;
  invitedBy:  { name: string | null; email: string };
};

type Stats = {
  total:         number;
  owners:        number;
  managers:      number;
  developers:    number;
  viewers:       number;
  pendingInvites:number;
};

type ActivityEntry = {
  id:         string;
  action:     string;
  entityType: string;
  createdAt:  string;
  user:       { name: string | null; email: string };
};

const ACTION_LABEL: Record<string, string> = {
  CREATED:"created", UPDATED:"updated", DELETED:"deleted",
  ARCHIVED:"archived", INVITED:"invited", ROLE_CHANGED:"changed role in",
  LOGIN:"logged in", LOGOUT:"logged out",
};

export function TeamClient({
  members, invitations, stats, recentActivity, currentUserId, canManage,
}: {
  members:        MemberRowData[];
  invitations:    InvitationData[];
  stats:          Stats;
  recentActivity: ActivityEntry[];
  currentUserId:  string;
  canManage:      boolean;
}) {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = useMemo(() => members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchRole   = roleFilter === "all" || m.role === roleFilter;
    return matchSearch && matchRole;
  }), [members, search, roleFilter]);

  const statCards = [
    { label: "Total members",   value: stats.total,         icon: Users   },
    { label: "Owners",          value: stats.owners,        icon: Shield  },
    { label: "Managers",        value: stats.managers,      icon: Shield  },
    { label: "Developers",      value: stats.developers,    icon: Code2   },
    { label: "Viewers",         value: stats.viewers,       icon: Eye     },
    { label: "Pending invites", value: stats.pendingInvites,icon: Mail    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} {stats.total === 1 ? "member" : "members"}
            {stats.pendingInvites > 0 && ` · ${stats.pendingInvites} pending`}
          </p>
        </div>
        {canManage && <InviteMemberDialog />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold text-foreground">{value}</p>
              </div>
              <Icon className="size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="OWNER">Owner</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="DEVELOPER">Developer</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Members
            {filtered.length !== members.length && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filtered.length} of {members.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No members match your search.</p>
          ) : (
            filtered.map((m) => (
              <MemberRow
                key={m.membershipId}
                member={m}
                currentUserId={currentUserId}
                canManage={canManage}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pending invitations
              <span className="ml-2 text-sm font-normal text-muted-foreground">({invitations.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 border-b border-border py-2 text-xs font-medium text-muted-foreground">
              <span>Email</span>
              <span>Role</span>
              <span>Sent</span>
              <span>Expires</span>
              <span className="w-16" />
            </div>
            {invitations.map((inv) => (
              <InvitationRow key={inv.id} invitation={inv} canManage={canManage} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col divide-y divide-border">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 py-2.5">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{log.user.name ?? log.user.email}</span>{" "}
                    {ACTION_LABEL[log.action] ?? log.action.toLowerCase()}{" "}
                    <span className="text-muted-foreground">{log.entityType.toLowerCase()}</span>
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString(undefined, {
                      month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}