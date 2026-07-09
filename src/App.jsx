import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';

export default function App() {
  const [session, setSession] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4 bg-white shadow flex justify-between items-center">
        <h1 className="font-bold text-lg">Bossystock</h1>
        <div className="flex gap-2">
          {session && <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded">ออก</button>}
          <button onClick={() => setShowAdmin(!showAdmin)} className="bg-gray-800 text-white px-3 py-1 rounded">
            {showAdmin ? 'ไปที่หน้าร้าน' : 'เข้าสู่ระบบหลังบ้าน'}
          </button>
        </div>
      </nav>

      {showAdmin && !session ? (
        <div className="p-6"><Login onLoginSuccess={() => window.location.reload()} /></div>
      ) : (
        <MainShopSystem showAdmin={showAdmin} />
      )}
    </div>
  );
}

function MainShopSystem({ showAdmin }) {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  
  const [newProduct, setNewProduct] = useState({ 
    name: '', price: 0, cost: 0, stock_quantity: 0, image_url: '', category: '' 
  });
  const [restockAmounts, setRestockAmounts] = useState({});

  const categories = ["Marbo9000", "Marbo 10k", "Relx go smash 12k", "Relx novo 14k", "Relx Spartar 20k", "Relx Creator 20k", "Infy 20k", "M switch 15k","Esko bar 20k","Lambo 12k"];

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*');
    const { data: s } = await supabase.from('sales_history').select('*');
    setProducts(p || []);
    setSales(s || []);
  }

  // --- ฟังก์ชันสรุปข้อมูล ---
  const getSummary = () => {
    const now = new Date();
    const summary = {
      sales: { d: 0, w: 0, m: 0 },
      profit: { d: 0, w: 0, m: 0 },
      monthlyData: {}
    };

    sales.forEach(s => {
      const date = new Date(s.sold_at);
      const diffDays = (now - date) / (1000 * 60 * 60 * 24);
      const sPrice = Number(s.sale_price) || 0;
      const sCost = Number(s.cost_price) || 0;
      const sProfit = sPrice - sCost;

      if (diffDays <= 1) { summary.sales.d += sPrice; summary.profit.d += sProfit; }
      if (diffDays <= 7) { summary.sales.w += sPrice; summary.profit.w += sProfit; }
      if (diffDays <= 30) { summary.sales.m += sPrice; summary.profit.m += sProfit; }

      const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!summary.monthlyData[key]) summary.monthlyData[key] = { sales: 0, profit: 0 };
      summary.monthlyData[key].sales += sPrice;
      summary.monthlyData[key].profit += sProfit;
    });
    return summary;
  };

  const summary = getSummary();
  const activeCategories = ['ทั้งหมด', ...categories.filter(cat => products.some(p => p.category === cat && p.stock_quantity > 0))];

  // ... (ฟังก์ชัน handleAddProduct, handleRestock, handleSell คงเดิม) ...
  async function handleAddProduct(e) {
    e.preventDefault();
    await supabase.from('products').insert([newProduct]);
    alert("เพิ่มสินค้าใหม่สำเร็จ!");
    setNewProduct({ name: '', price: 0, cost: 0, stock_quantity: 0, image_url: '', category: '' });
    fetchData();
  }

  async function handleRestock(p) {
    const amount = parseInt(restockAmounts[p.id] || 0);
    if (amount > 0) {
      await supabase.from('products').update({ stock_quantity: Number(p.stock_quantity) + amount }).eq('id', p.id);
      setRestockAmounts({...restockAmounts, [p.id]: ''});
      fetchData();
    }
  }

  async function handleSell(p) {
    if (p.stock_quantity > 0) {
      await supabase.from('products').update({ stock_quantity: Number(p.stock_quantity) - 1 }).eq('id', p.id);
      await supabase.from('sales_history').insert({ 
        product_id: p.id, product_name: p.name, quantity: 1,
        sale_price: Number(p.price), cost_price: Number(p.cost), sold_at: new Date().toISOString() 
      });
      fetchData();
    } else { alert("สินค้าหมด!"); }
  }

  return (
    <div className="p-6">
      {!showAdmin ? (
        /* ส่วนหน้าร้าน (คงเดิม) */
        <div>...</div> 
      ) : (
        <div className="space-y-6">
          {/* Dashboard ใหม่ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 shadow rounded"><h3>ยอดขาย (ว/ส/ด)</h3><p className="font-bold">{summary.sales.d}/{summary.sales.w}/{summary.sales.m}</p></div>
                <div className="bg-white p-4 shadow rounded"><h3>กำไร (ว/ส/ด)</h3><p className="font-bold text-green-600">{summary.profit.d}/{summary.profit.w}/{summary.profit.m}</p></div>
              </div>

              <div className="bg-white p-4 shadow rounded">
                <h3 className="font-bold mb-3">สรุปรายเดือน/ปี</h3>
                <table className="w-full text-sm">
                  <thead><tr><th>เดือน/ปี</th><th>ยอดขาย</th><th>กำไร</th></tr></thead>
                  <tbody>
                    {Object.entries(summary.monthlyData).map(([key, val]) => (
                      <tr key={key} className="border-t"><td>{key}</td><td>{val.sales}</td><td className="text-green-600">{val.profit}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white p-4 shadow rounded">
                <h3 className="font-bold mb-3">ประวัติการขายล่าสุด</h3>
                {[...sales].reverse().slice(0, 10).map((s, i) => (
                  <div key={i} className="flex justify-between border-b py-2 text-sm">
                    <span>{s.product_name}</span>
                    <span className="text-gray-400">{new Date(s.sold_at).toLocaleString('th-TH')}</span>
                    <span className="text-green-600">{Number(s.sale_price) - Number(s.cost_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ส่วน stock และ add คงเดิม */}
        </div>
      )}
    </div>
  );
}