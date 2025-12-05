import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#FDF8F3] via-[#FAF1E7] to-[#F3E5D3] text-[#1a1917] px-4">
      <div className="w-full max-w-3xl">
        <Outlet />
      </div>
    </div>
  );
}
