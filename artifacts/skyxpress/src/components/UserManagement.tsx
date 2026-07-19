// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Shield,
  ShieldCheck,
  Briefcase,
  User,
  UserX,
  UserCheck,
  Crown,
  Lock,
} from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  company: string;
  phone: string;
  role: string;
  is_blocked: boolean;
  is_owner?: boolean;
  created_at: string;
  email?: string;
}

// ---------------------------------------------------------------------
// The protected developer account. This is a UX-level guard only — it
// stops people from accidentally (or deliberately) changing this role
// from the admin UI. It is NOT real security on its own, because anyone
// calling Supabase's REST/JS API directly could bypass client-side code
// entirely. Real protection must live in the database — see the
// accompanying SQL (protect_owner_profile trigger) which blocks the
// change at the Postgres level no matter how the request is made.
//
// Other admins/super admins see this account labeled "Developer" in the
// table — the underlying flag is still called is_owner in the database.
// ---------------------------------------------------------------------
const PROTECTED_EMAIL = "myne7x@gmail.com";

const isProtectedProfile = (user: UserProfile) =>
  user.is_owner === true || (user.email?.toLowerCase() === PROTECTED_EMAIL);

// Unique visual identity per role — distinct icon, gradient, and motion
const ROLE_META: Record<
  string,
  { label: string; icon: typeof Shield; badgeClass: string; glow?: boolean }
> = {
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    badgeClass: "role-badge-admin bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white",
    glow: true,
  },
  staff: {
    label: "Staff",
    icon: Briefcase,
    badgeClass: "role-badge-staff bg-gradient-to-r from-sky-500 to-blue-600 text-white",
  },
  user: {
    label: "User",
    icon: User,
    badgeClass: "bg-slate-100 text-slate-700",
  },
};

const getRoleMeta = (role: string) => ROLE_META[role] || ROLE_META.user;

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Get all profiles with user email data
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          *
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Try to get user emails from auth.users via the auth admin API
      // This may fail if admin privileges are not available
      let authUsers: any[] = [];
      try {
        const {
          data: { users },
          error: usersError,
        } = await supabase.auth.admin.listUsers();
        if (!usersError && users) {
          authUsers = users;
        }
      } catch (adminError) {
        console.warn("Auth admin access not available:", adminError);
      }

      // Combine profile data with email
      const usersWithEmails = profilesData?.map((profile) => {
        const authUser = authUsers?.find((u) => u && u.id === profile.user_id);
        return {
          ...profile,
          email: authUser?.email || "N/A",
        };
      }) || [];

      setUsers(usersWithEmails);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      // Fallback to profiles only if auth admin call fails
      try {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        setUsers(profilesData || []);
      } catch (fallbackError) {
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (user: UserProfile, newRole: string) => {
    if (isProtectedProfile(user)) {
      toast({
        title: "Protected account",
        description: "This account's role is locked and can't be changed here.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("user_id", user.user_id);

      if (error) throw error;

      setUsers(
        users.map((u) => (u.user_id === user.user_id ? { ...u, role: newRole } : u))
      );

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const toggleUserBlock = async (user: UserProfile) => {
    if (isProtectedProfile(user)) {
      toast({
        title: "Protected account",
        description: "This account can't be blocked.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_blocked: !user.is_blocked })
        .eq("user_id", user.user_id);

      if (error) throw error;

      setUsers(
        users.map((u) =>
          u.user_id === user.user_id ? { ...u, is_blocked: !user.is_blocked } : u
        )
      );

      toast({
        title: "Success",
        description: `User ${!user.is_blocked ? "blocked" : "unblocked"} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          User Management
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isProtected = isProtectedProfile(user);
                const roleMeta = getRoleMeta(user.role);
                const RoleIcon = roleMeta.icon;
                const isSelf = currentUser?.id === user.user_id;

                return (
                  <TableRow
                    key={user.user_id}
                    className={isProtected ? "relative bg-amber-50/40" : undefined}
                  >
                    <TableCell>
                      <div className={isProtected ? "border-l-2 border-amber-400 pl-3" : undefined}>
                        <div className="flex items-center gap-1.5 font-medium">
                          {user.full_name || "N/A"}
                          {isProtected && <Crown className="crown-float h-3.5 w-3.5 text-amber-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.company}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-muted-foreground">{user.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isProtected ? (
                        <Badge className="developer-badge flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 px-3 py-1 text-white shadow-sm">
                          <Crown className="crown-float h-3.5 w-3.5" />
                          DEVELOPER
                          <Lock className="ml-0.5 h-3 w-3 opacity-90" />
                        </Badge>
                      ) : (
                        <Badge
                          className={`flex w-fit items-center gap-1.5 rounded-full px-3 py-1 ${roleMeta.badgeClass}`}
                        >
                          <RoleIcon className="h-3.5 w-3.5" />
                          {roleMeta.label.toUpperCase()}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_blocked ? "destructive" : "secondary"}>
                        {user.is_blocked ? (
                          <>
                            <UserX className="mr-1 h-3 w-3" />
                            Blocked
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-1 h-3 w-3" />
                            Active
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {isProtected ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          Protected
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => updateUserRole(user, newRole)}
                            disabled={isSelf}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant={user.is_blocked ? "default" : "destructive"}
                            size="sm"
                            onClick={() => toggleUserBlock(user)}
                            disabled={isSelf && user.is_blocked}
                          >
                            {user.is_blocked ? "Unblock" : "Block"}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Scoped role-badge animations */}
      <style>{`
        @keyframes crownFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-2px) rotate(-4deg); }
        }
        @keyframes developerGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); }
          50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
        }
        @keyframes adminPulseRing {
          0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.35); }
          70% { box-shadow: 0 0 0 5px rgba(168, 85, 247, 0); }
          100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
        }
        .crown-float {
          animation: crownFloat 2.2s ease-in-out infinite;
        }
        .developer-badge {
          animation: developerGlow 2.4s ease-in-out infinite;
        }
        .role-badge-admin {
          animation: adminPulseRing 2.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .crown-float,
          .developer-badge,
          .role-badge-admin {
            animation: none !important;
          }
        }
      `}</style>
    </Card>
  );
};
