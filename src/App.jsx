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

  const activeCategories = ['ทั้งหมด', ...categories.filter(cat => products.some(p => p.category === cat && p.stock_quantity > 0))];

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

  // ปรับปรุงฟังก์ชันการขายให้ส่งข้อมูลครบตามโครงสร้างฐานข้อมูล
  async function handleSell(p) {
    if (p.stock_quantity > 0) {
      // 1. ตัดสต็อก
      await supabase.from('products').update({ stock_quantity: Number(p.stock_quantity) - 1 }).eq('id', p.id);
      
      // 2. บันทึกยอดขาย (ลบ total_profit ออก เพราะฐานข้อมูลจัดการให้เอง)
      const { error } = await supabase.from('sales_history').insert({ 
        product_id: p.id, 
        product_name: p.name, 
        quantity: 1,
        sale_price: Number(p.price), 
        cost_price: Number(p.cost), 
        // total_profit ถูกนำออกไปแล้วตามคำแนะนำ
        sold_at: new Date().toISOString() 
      });

      if (error) {
        console.error("Error inserting sale:", error);
        alert("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
      } else {
        fetchData();
      }
    } else {
      alert("สินค้าหมด!");
    }
  }
      // 2. บันทึกยอดขายให้ครบทุกช่อง
      const { error } = await supabase.from('sales_history').insert({ 
        product_id: p.id, 
        product_name: p.name, 
        quantity: 1,
        sale_price: Number(p.price), 
        cost_price: Number(p.cost), 
        total_profit: Number(p.price) - Number(p.cost),
        sold_at: new Date().toISOString() 
      });

      if (error) {
        console.error("Error inserting sale:", error);
        alert("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
      } else {
        fetchData();
      }
    } else {
      alert("สินค้าหมด!");
    }
  }

  const calculateSales = (days) => {
    const now = new Date();
    return sales.filter(s => {
      if (!s.sold_at) return false;
      const saleDate = new Date(s.sold_at);
      const diffDays = (now - saleDate) / (1000 * 60 * 60 * 24);
      return diffDays <= days;
    }).reduce((sum, item) => sum + (Number(item.sale_price) || 0), 0);
  };

  return (
    <div className="p-6">
      {!showAdmin ? (
        <div>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {activeCategories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} 
                className={`px-4 py-1 rounded-full whitespace-nowrap ${selectedCategory === cat ? 'bg-black text-white' : 'bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {products.filter(p => p.stock_quantity > 0 && (selectedCategory === 'ทั้งหมด' || p.category === selectedCategory)).map(p => (
              <div key={p.id} className="bg-white p-4 rounded shadow border">
                <img src={p.image_url} className="w-full h-32 object-cover mb-2" onError={(e) => e.target.style.display = 'none'} />
                <p className="font-bold">{p.name}</p>
                <p className="text-xs text-gray-500">{p.category}</p>
                <p>ราคา {p.price} บาท</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2">
            {['dashboard', 'stock', 'add'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`p-2 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                {tab === 'dashboard' ? 'Dashboard' : tab === 'stock' ? 'จัดการสต็อก' : 'เพิ่มสินค้า'}
              </button>
            ))}
          </div>

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 shadow rounded"><h3>ยอดวันนี้</h3><p className="text-2xl font-bold">{calculateSales(1)}</p></div>
              <div className="bg-white p-4 shadow rounded"><h3>ยอด 7 วัน</h3><p className="text-2xl font-bold">{calculateSales(7)}</p></div>
              <div className="bg-white p-4 shadow rounded"><h3>ยอด 30 วัน</h3><p className="text-2xl font-bold">{calculateSales(30)}</p></div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="bg-white p-6 shadow">
              {products.map(p => (
                <div key={p.id} className="flex justify-between border-b p-3 items-center">
                  <div>
                    <p className="font-bold">{p.name}</p>
                    <p className="text-sm text-gray-500">คงเหลือ: {p.stock_quantity}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="number" placeholder="เติม" className="w-16 border p-1 rounded" value={restockAmounts[p.id] || ''} onChange={(e) => setRestockAmounts({...restockAmounts, [p.id]: e.target.value})} />
                    <button onClick={() => handleRestock(p)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">เติม</button>
                    <button onClick={() => handleSell(p)} className="bg-orange-500 text-white px-3 py-1 rounded text-sm">ขาย</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'add' && (
            <form onSubmit={handleAddProduct} className="bg-white p-6 shadow space-y-3">
              <input placeholder="ชื่อสินค้า" className="w-full border p-2" onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <select className="w-full border p-2" onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                <option value="">-- เลือกหมวดหมู่ --</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="ราคาขาย" type="number" className="w-full border p-2" onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <input placeholder="ต้นทุน" type="number" className="w-full border p-2" onChange={e => setNewProduct({...newProduct, cost: e.target.value})} />
              <input placeholder="สต็อก" type="number" className="w-full border p-2" onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})} />
              <input placeholder="URL รูป" className="w-full border p-2" onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} />
              <button className="bg-blue-600 text-white p-2 w-full">บันทึกสินค้าใหม่</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}