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
  const [timeRange, setTimeRange] = useState(1);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [password, setPassword] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, cost: 0, stock_quantity: 0, image_url: '', category: '' });
  const [restockAmounts, setRestockAmounts] = useState({});
  const currentMonthName = now.toLocaleString('th-TH', { month: 'long' });
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthName = prevMonth.toLocaleString('th-TH', { month: 'long' });

  const categories =[ "Sings five 20k", "Marbo9000", "Marbo 10k", "Relx go smash 12k", "Relx novo 14k", "Relx Spartar 20k", "Relx Creator 20k", "Relx Creator clear 18k", "Infy 20k", "M switch 15k","Marbo 25k","Esko bar 20k","Lambo 12k"];

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*');
    const { data: s } = await supabase.from('sales_history').select('*');
    setProducts(p || []);
    setSales(s || []);
  }
  async function handleDeleteSale(id) {
    console.log("กำลังจะลบ ID:", id);
    if (password !== '1236') { 
      alert("รหัสผ่านไม่ถูกต้อง!");
      return;
    }
    const { error } = await supabase.from('sales_history').delete().eq('id', id);
    if (error) {
      alert("ลบไม่สำเร็จ: " + error.message);
    } else {
      alert("ลบรายการสำเร็จ");
      setPassword('');
      setShowDeleteModal(false);
      fetchData(); 
    }
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

  async function handleSell(p) {
    if (p.stock_quantity > 0) {
      const inputPrice = window.prompt("ระบุราคาขาย:", p.price);
    
      if (inputPrice === null || inputPrice === "") {
        return;
      }
      const finalPrice = Number(inputPrice);

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: Number(p.stock_quantity) - 1 })
        .eq('id', p.id);

      if (updateError) {
        alert("เกิดข้อผิดพลาดในการตัดสต็อก: " + updateError.message);
        return;
      }
      
      // 3. บันทึกยอดขาย (ใช้ finalPrice ที่ได้จาก prompt)
      const { error: insertError } = await supabase.from('sales_history').insert({ 
        product_id: p.id, 
        product_name: p.name, 
        quantity: 1,
        sale_price: finalPrice, // ราคาที่แก้ไขแล้ว
        cost_price: Number(p.cost), 
        sold_at: new Date().toISOString() 
      });

      if (insertError) {
        console.error("Error inserting sale:", insertError);
        alert("เกิดข้อผิดพลาดในการบันทึกยอดขาย: " + insertError.message);
      } else {
        // อัปเดตข้อมูลหน้าจอใหม่หลังจากขายสำเร็จ
        fetchData();
        alert(`บันทึกการขายสำเร็จ! (ราคา: ${finalPrice} บาท)`);
      }
    } else {
      alert("สินค้าหมด!");
    }
  }

  // ฟังก์ชันคำนวณสถิติที่แก้ไขแล้ว
  const calculateStats = (days) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let totalSales = 0;
    let totalProfit = 0;
    let totalQty = 0; // เพิ่มตัวแปรสำหรับนับจำนวนชิ้น

    sales.forEach(s => {
      if (!s.sold_at) return;
      const saleDate = new Date(s.sold_at);
      const diffInDays = Math.ceil((startOfToday - saleDate) / (1000 * 60 * 60 * 24));
      const isMatch = days === 1 ? diffInDays <= 0 : diffInDays <= days;

      if (isMatch) {
        const sPrice = Number(s.sale_price) || 0;
        const cPrice = Number(s.cost_price) || 0;
        const qty = Number(s.quantity) || 1; 
        
        totalSales += sPrice;
        totalProfit += (sPrice - cPrice);
        totalQty += qty;
      }
    });
    return { totalSales, totalProfit, totalQty };
  };

    return (
    <div className="p-6">
      {!showAdmin ? (
  <div className="space-y-4">
    {/* ส่วนแสดงปุ่มหมวดหมู่ */}
    <div className="flex gap-2 overflow-x-auto p-4 bg-gray-100">
  <button 
    onClick={() => setSelectedCategory('ทั้งหมด')}
    className={`px-4 py-2 rounded font-bold ${selectedCategory === 'ทั้งหมด' ? 'bg-blue-600 text-white' : 'bg-white'}`}
  >
    ทั้งหมด
  </button>
      {categories
    .filter(cat => products.some(p => p.category === cat && p.stock_quantity > 0))
    .map(cat => (
      <button 
        key={cat} 
        onClick={() => setSelectedCategory(cat)}
        className={`px-4 py-2 rounded font-bold whitespace-nowrap ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-white'}`}
      >
        {cat}
      </button>
    ))
  }
</div>

    {/* ส่วนแสดงสินค้า (สินค้าจะถูกกรองตาม selectedCategory โดยอัตโนมัติ) */}
    <div className="grid grid-cols-2 gap-4 p-4">
      {products
        .filter(p => p.stock_quantity > 0 && (selectedCategory === 'ทั้งหมด' || p.category === selectedCategory))
        .map(p => (
          <div key={p.id} className="bg-white p-4 rounded shadow border">
            <img src={p.image_url} className="w-full h-32 object-cover mb-2" onError={(e) => e.target.style.display = 'none'} />
            <p className="font-bold">{p.name}</p>
            <p className="text-xs text-gray-500">{p.category}</p>
            <p className="text-blue-600 font-bold">ราคา {p.price} บาท</p>
          </div>
        ))}
    </div>
  </div>
) : (
        // ส่วนหลังบ้าน
        <div className="space-y-6">
          <div className="flex gap-2">
            {['dashboard', 'stock', 'add', 'history'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`p-2 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                {tab === 'dashboard' ? 'Dashboard' : tab === 'stock' ? 'จัดการสต็อก' : tab === 'add' ? 'เพิ่มสินค้า' : 'ประวัติการขาย'}
              </button>
            ))}
          </div>

          {activeTab === 'dashboard' && (
  <div className="space-y-6">
    {/* 1. ส่วนสรุปภาพรวม (3 กล่องเดิม) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 7, 30].map(d => {
        const { totalSales, totalProfit, totalQty } = calculateStats(d);
        return (
          <div key={d} className="bg-white p-4 shadow rounded border">
            <h3 className="font-bold text-gray-700">
              ยอด {d === 1 ? "วันนี้" : d === 7 ? "สัปดาห์นี้" : "เดือนนี้"}
            </h3>
            <p className="text-xl font-bold mt-1">ยอดขาย: {totalSales.toLocaleString()} บ.</p>
            <p className="text-sm font-bold text-blue-600">ขายได้: {totalQty} ชิ้น</p>
            <p className="text-lg font-bold text-green-600">กำไร: {totalProfit.toLocaleString()} บ.</p>
          </div>
        );
      })}
    </div>

    {/* 2. ส่วนเลือกช่วงเวลาเพื่อดูรายละเอียด */}
    <div className="border-t pt-4">
      <h3 className="font-bold mb-3">เลือกช่วงเวลาเพื่อดูรายละเอียดเพิ่มเติม:</h3>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTimeRange(1)} className={`px-4 py-2 rounded ${timeRange === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>วันนี้</button>
        <button onClick={() => setTimeRange(7)} className={`px-4 py-2 rounded ${timeRange === 7 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>สัปดาห์นี้</button>
        <button onClick={() => setTimeRange(30)} className={`px-4 py-2 rounded ${timeRange === 30 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
          {currentMonthName}
        </button>
      </div>
      
      {/* ส่วนแสดงผลรายละเอียดที่เลือก */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm">
        <h2 className="text-2xl font-bold text-blue-800">
          สรุปข้อมูล: {timeRange === 1 ? "วันนี้" : timeRange === 7 ? "สัปดาห์นี้" : `เดือน${currentMonthName}`}
        </h2>
        <div className="flex flex-col md:flex-row gap-6 mt-4">
           <p className="text-lg">ยอดขายรวม: <span className="font-bold text-xl">{calculateStats(timeRange).totalSales.toLocaleString()} บาท</span></p>
           <p className="text-lg">ขายได้: <span className="font-bold text-xl text-blue-600">{calculateStats(timeRange).totalQty} ชิ้น</span></p>
           <p className="text-lg">กำไรสุทธิ: <span className="font-bold text-xl text-green-600">{calculateStats(timeRange).totalProfit.toLocaleString()} บาท</span></p>
        </div>
      </div>
    </div>
  </div>

      
      {/* ส่วนแสดงแบบบรรทัดเดียวใหญ่ๆ */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-2xl font-bold text-blue-800">
          สรุปข้อมูล: {timeRange === 1 ? "วันนี้" : timeRange + " วันที่ผ่านมา"}
        </h2>
        <div className="flex flex-col md:flex-row gap-4 mt-2">
           <p className="text-lg">ยอดขายรวม: <span className="font-bold">{calculateStats(timeRange).totalSales.toLocaleString()} บาท</span></p>
           <p className="text-lg">กำไรสุทธิ: <span className="font-bold text-green-600">{calculateStats(timeRange).totalProfit.toLocaleString()} บาท</span></p>
        </div>
      </div>
    </div>
  </div>
)}

          {activeTab === 'stock' && (
            <div className="space-y-6">
              {categories.map((category) => {
                const productsInCategory = products.filter(p => p.category === category);
                if (productsInCategory.length === 0) return null;
                return (
                  <div key={category} className="bg-white p-4 shadow rounded">
                    <h3 className="font-bold text-lg mb-3 border-b pb-2 text-blue-600">{category}</h3>
                    {productsInCategory.map(p => (
                      <div key={p.id} className="flex justify-between border-b p-3 items-center hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-sm text-gray-500">คงเหลือ: {p.stock_quantity}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input type="number" placeholder="เติม" className="w-16 border p-1 rounded text-center" 
                            value={restockAmounts[p.id] || ''} onChange={(e) => setRestockAmounts({...restockAmounts, [p.id]: e.target.value})} />
                          <button onClick={() => handleRestock(p)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">เติม</button>
                          <button onClick={() => handleSell(p)} className="bg-orange-500 text-white px-3 py-1 rounded text-sm">ขาย</button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
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

          {activeTab === 'history' && (
            <div className="bg-white p-4 shadow rounded space-y-4">
              <h3 className="font-bold text-lg">ประวัติการขายล่าสุด</h3>
              {sales.sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at)).map(s => (
                <div key={s.id} className="border-b pb-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold">{s.product_name}</p>
                    <p className="text-gray-500">ขาย {s.sale_price} บ. | กำไร {s.sale_price - s.cost_price} บ.</p>
                  </div>
                  <button onClick={() => { setTargetDeleteId(s.id); setShowDeleteModal(true); }} className="bg-red-500 text-white px-3 py-1 rounded text-xs">ลบ</button>
                </div>
              ))}
            </div>
          )}

          {/* Modal ยืนยันการลบ */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded shadow w-full max-w-sm">
                <h3 className="mb-4 font-bold">ยืนยันการลบ (รหัส 4 หลัก)</h3>
                <input type="password" maxLength="4" className="border w-full p-2 mb-4 text-center text-xl" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="flex gap-2">
                  <button className="flex-1 bg-gray-300 p-2 rounded" onClick={() => setShowDeleteModal(false)}>ยกเลิก</button>
                  <button className="flex-1 bg-red-600 text-white p-2 rounded" onClick={() => handleDeleteSale(targetDeleteId)}>ยืนยัน</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}