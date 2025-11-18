import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#f5f7fb] text-[#111827] px-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}