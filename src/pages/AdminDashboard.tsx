import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Shield } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles?: string[];
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      navigate("/");
      return;
    }
    loadUsers();
  }, [user, isAdmin, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profiles) {
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          return {
            ...profile,
            roles: roles?.map((r) => r.role) || [],
          };
        })
      );
      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserName,
        },
      });

      if (error) throw error;

      toast({
        title: "Bruger oprettet",
        description: `${newUserEmail} er blevet oprettet`,
      });

      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Fejl ved oprettelse",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleAdmin = async (userId: string, currentRoles: string[]) => {
    const isCurrentlyAdmin = currentRoles.includes("admin");

    try {
      if (isCurrentlyAdmin) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
      } else {
        await supabase.from("user_roles").insert({
          user_id: userId,
          role: "admin",
        });
      }

      toast({
        title: isCurrentlyAdmin ? "Admin rettighed fjernet" : "Admin rettighed givet",
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Er du sikker på du vil slette denne bruger?")) return;

    try {
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "Bruger slettet",
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Fejl ved sletning",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Administrer brugere og rettigheder</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              Tilbage til projekter
            </Button>
            <Button variant="outline" onClick={signOut}>
              Log ud
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Opret ny bruger
            </CardTitle>
            <CardDescription>
              Tilføj en ny bruger til systemet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Navn</Label>
                  <Input
                    id="name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Adgangskode</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit">Opret bruger</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brugere</CardTitle>
            <CardDescription>Administrer eksisterende brugere</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Indlæser...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Navn</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roller</TableHead>
                    <TableHead>Oprettet</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>{profile.full_name || "Ikke angivet"}</TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>
                        {profile.roles?.includes("admin") && (
                          <Badge variant="default">Admin</Badge>
                        )}
                        {!profile.roles?.length && (
                          <Badge variant="secondary">Bruger</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(profile.created_at).toLocaleDateString("da-DK")}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant={profile.roles?.includes("admin") ? "default" : "outline"}
                          onClick={() => toggleAdmin(profile.id, profile.roles || [])}
                          disabled={profile.id === user?.id}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUser(profile.id)}
                          disabled={profile.id === user?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
