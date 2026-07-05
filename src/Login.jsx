import React, { useState } from 'react'
import { supabase } from './supabaseClient'

// เพิ่ม onLoginSuccess เข้าไปใน props
export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      alert('เข้าสู่ระบบสำเร็จแล้ว!')
      // เรียกใช้ฟังก์ชันที่ส่งมาจาก App.jsx เพื่อให้เปลี่ยนหน้า
      if (onLoginSuccess) {
        onLoginSuccess()
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">เข้าสู่ระบบร้านค้า</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600">อีเมล</label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-600">รหัสผ่าน</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}