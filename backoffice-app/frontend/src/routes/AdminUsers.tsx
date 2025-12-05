import { useEffect, useMemo, useState } from "react";
import { listAdminUsers, listOutlets, createUser } from "../utils/api";
import { role as authRole } from "../hooks/useAuth";
import { Card } from "../components/ui/card";
import { Table, Thead, Tbody, Tr, Th, Td } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export default function AdminUsers() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleCode, setRoleCode] = useState<"admin" | "outlet" | "kasir">(
    "outlet"
  );
  const [outlets, setOutlets] = useState<any[]>([]);
  const [outletId, setOutletId] = useState<number | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [email]
  );
  const passwordValid = useMemo(
    () => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password),
    [password]
  );
  const currentRole = authRole.value;
  const roleOptions =
    currentRole === "super_admin"
      ? (["admin", "outlet", "kasir"] as const)
      : (["outlet", "kasir"] as const);
  useEffect(() => {
    setLoading(true);
    listAdminUsers()
      .then(setItems)
      .catch(() => setError("Gagal memuat"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    listOutlets()
      .then(setOutlets)
      .catch(() => {});
  }, []);
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    setCreateErr(null);
    if (!emailValid) {
      setCreateErr("Email tidak valid");
      return;
    }
    if (!passwordValid) {
      setCreateErr("Password minimal 8 karakter, kombinasi huruf & angka");
      return;
    }
    if (
      (roleCode === "outlet" || roleCode === "kasir") &&
      typeof outletId !== "number"
    ) {
      setCreateErr("Pilih Outlet");
      return;
    }
    setCreating(true);
    try {
      await createUser(email, password, roleCode, outletId);
      setCreateMsg("User berhasil dibuat");
      setEmail("");
      setPassword("");
      setRoleCode(currentRole === "super_admin" ? "admin" : "outlet");
      setOutletId(undefined);
    } catch (err: any) {
      setCreateErr(err?.message || "Gagal membuat user");
    } finally {
      setCreating(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Manajemen User</h2>
      </div>
      <Card className="p-4 shadow-[0_10px_30px_rgba(155,122,91,0.12)]">
        <form onSubmit={onCreate as any} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-[#6d6354]">Email</span>
            <Input
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1]"
              placeholder="Masukkan email pengguna"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[#6d6354]">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword((e.target as HTMLInputElement).value)
              }
              className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1]"
              placeholder="Masukkan password awal"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[#6d6354]">Role</span>
            <select
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value as any)}
              className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1] rounded px-3 py-2"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {(roleCode === "outlet" || roleCode === "kasir") && (
            <label className="grid gap-1">
              <span className="text-sm text-[#6d6354]">Outlet</span>
              <select
                value={typeof outletId === "number" ? String(outletId) : ""}
                onChange={(e) => setOutletId(Number(e.target.value))}
                className="bg-[#FAF1E7] border-[#EAD0B3] focus:border-[#D6BFA1] rounded px-3 py-2"
              >
                <option value="">Pilih Outlet</option>
                {outlets.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="md:col-span-2 flex items-center gap-3">
            <Button
              disabled={creating}
              className="bg-gradient-to-r from-[#C5A888] to-[#9B7A5B] text-white"
            >
              {creating ? "Menyimpan..." : "Buat User"}
            </Button>
            {createErr && (
              <span className="text-[#ef4444] text-sm" role="alert">
                {createErr}
              </span>
            )}
            {createMsg && (
              <span className="text-[#16a34a] text-sm" role="status">
                {createMsg}
              </span>
            )}
          </div>
        </form>
      </Card>
      <Card className="p-4">
        {loading && <div>Memuat...</div>}
        {error && <div className="text-[#ef4444]">{error}</div>}
        <Table>
          <Thead>
            <Tr>
              <Th>Nama</Th>
              <Th>Email</Th>
              <Th>Outlet</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((u) => (
              <Tr key={u.id}>
                <Td>{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>{u.outlet_name}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
