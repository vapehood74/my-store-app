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
  const [timeRange, setTimeRange] = useState('today');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [password, setPassword] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, cost: 0, stock_quantity: 0, image_url: '', category: '' });
  const [restockAmounts, setRestockAmounts] = useState({});

  const [webConfig, setWebConfig] = useState({
    announcement: "ยินดีต้อนรับสู่ร้าน Bossystock สินค้าพร้อมส่งเพียบ!",
    showAnnouncement: true,
    showPopupAlert: true,
    showSearchBox: true,
    hideProductsAndCategories: false, 
    hideCategoriesOnly: false,        
    emptyShopMessage: "ร้านค้าปิดปรับปรุงชั่วคราว หรือสินค้าหมดเกลี้ยง",
    isEmptyShop: false                
  });

  const [showPopupAlert, setShowPopupAlert] = useState(false);

  const now = new Date();
  const currentMonthName = now.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  const categories = ["Singfiv 20k", "Marbo9000", "Marbo 10k", "Relx go smash 12k", "Relx novo 14k", "Relx Spartar 20k", "Relx Creator 20k", "Relx Creator clear 18k", "Infy 20k", "M switch 15k", "Marbo 25k", "Esko bar 20k", "Lambo 12k"];

  useEffect(() => { 
    fetchData(); 
    fetchWebConfig();
  }, []);

  async function fetchData() {
    const { data: p } = await supabase.from('products').select('*');
    const { data: s } = await supabase.from('sales_history').select('*');
    setProducts(p || []);
    setSales(s || []);
  }

  async function fetchWebConfig() {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (data) {
      const mergedConfig = {
        announcement: data.announcement ?? "ยินดีต้อนรับสู่ร้าน Bossystock สินค้าพร้อมส่งเพียบ!",
        showAnnouncement: data.showAnnouncement ?? true,
        showPopupAlert: data.showPopupAlert ?? true,
        showSearchBox: data.showSearchBox ?? true,
        hideProductsAndCategories: data.hideProductsAndCategories ?? false,
        hideCategoriesOnly: data.hideCategoriesOnly ?? false,
        emptyShopMessage: data.emptyShopMessage ?? "ร้านค้าปิดปรับปรุงชั่วคราว หรือสินค้าหมดเกลี้ยง",
        isEmptyShop: data.isEmptyShop ?? false
      };
      setWebConfig(mergedConfig);
      
      const isHidden = sessionStorage.getItem('bossy_hide_popup_session');
      if (mergedConfig.showAnnouncement && mergedConfig.showPopupAlert && !isHidden) {
        setShowPopupAlert(true);
      }
    }
  }

  async function updateWebConfig(newConfig) {
    setWebConfig(newConfig);
    const { error } = await supabase.from('settings').upsert({ id: 1, ...newConfig });
    if (error) {
      console.error("Error saving config:", error.message);
      alert("บันทึกไม่สำเร็จ: " + error.message);
    }
  }

  async function handleDeleteSale(id) {
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
      const qtyInput = prompt(`ระบุจำนวนที่ต้องการขาย (${p.name}):`, "1");
      if (qtyInput === null) return;
      const quantity = parseInt(qtyInput);
      
      if (isNaN(quantity) || quantity <= 0) {
        alert("กรุณากรอกจำนวนให้ถูกต้อง");
        return;
      }

      if (quantity > p.stock_quantity) {
        alert("สินค้าในสต็อกไม่พอขาย!");
        return;
      }

      const defaultTotal = Number(p.price) * quantity;
      const priceInput = prompt(`ระบุราคาขายรวมทั้งหมด (ราคาปกติ ${defaultTotal} บาท):`, defaultTotal);
      if (priceInput === null) return;
      
      const finalPrice = Number(priceInput);
      if (isNaN(finalPrice) || finalPrice < 0) {
        alert("กรุณากรอกราคาให้ถูกต้อง");
        return;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: Number(p.stock_quantity) - quantity })
        .eq('id', p.id);

      if (updateError) {
        alert("เกิดข้อผิดพลาดในการตัดสต็อก: " + updateError.message);
        return;
      }
      
      const { error: insertError } = await supabase.from('sales_history').insert({ 
        product_id: p.id, 
        product_name: p.name, 
        quantity: quantity,
        sale_price: finalPrice, 
        cost_price: Number(p.cost) * quantity, 
        sold_at: new Date().toISOString() 
      });

      if (insertError) {
        alert("เกิดข้อผิดพลาดในการบันทึกยอดขาย: " + insertError.message);
      } else {
        fetchData();
        alert(`บันทึกการขายสำเร็จ! (${quantity} ชิ้น | ยอดรวม: ${finalPrice} บาท)`);
      }
    } else {
      alert("สินค้าหมด!");
    }
  }

  const getAvailableMonths = () => {
    const monthsSet = new Set();
    sales.forEach(s => {
      if (!s.sold_at) return;
      const date = new Date(s.sold_at);
      const monthName = date.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
      monthsSet.add(monthName);
    });
    return Array.from(monthsSet);
  };

  const calculateStats = (range) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let totalSales = 0;
    let totalProfit = 0;
    let totalQty = 0;

    sales.forEach(s => {
      if (!s.sold_at) return;
      const saleDate = new Date(s.sold_at);
      let isMatch = false;

      if (range === 'today') {
        const diffInDays = Math.ceil((startOfToday - saleDate) / (1000 * 60 * 60 * 24));
        isMatch = diffInDays <= 0;
      } else if (range === 'week') {
        const diffInDays = Math.ceil((startOfToday - saleDate) / (1000 * 60 * 60 * 24));
        isMatch = diffInDays >= 0 && diffInDays <= 7;
      } else {
        const saleMonthName = saleDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
        isMatch = saleMonthName === range;
      }

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
    <div className="p-6 relative">
      {!showAdmin && webConfig.showAnnouncement && webConfig.showPopupAlert && showPopupAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-center border-t-4 border-blue-600 relative">
            <button 
              onClick={() => setShowPopupAlert(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 font-bold text-xl px-2"
            >
              &times;
            </button>

            <h3 className="font-bold text-lg mb-2 text-blue-600">📢 ประกาศจากทางร้าน</h3>
            <p className="text-gray-700 mb-6 whitespace-pre-wrap">{webConfig.announcement}</p>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setShowPopupAlert(false)} 
                className="bg-blue-600 text-white px-6 py-2 rounded font-bold w-full hover:bg-blue-700 transition"
              >
                ปิดหน้าต่างนี้
              </button>
              <button 
                onClick={() => {
                  sessionStorage.setItem('bossy_hide_popup_session', 'true');
                  setShowPopupAlert(false);
                }} 
                className="text-xs text-gray-500 hover:underline mt-1"
              >
                ไม่ต้องแสดงป๊อปอัปนี้อีกในอุปกรณ์นี้
              </button>
            </div>
          </div>
        </div>
      )}

      {!showAdmin ? (
        <div className="space-y-4">
          {webConfig.showAnnouncement && (
            <div className="bg-blue-100 border border-blue-300 text-blue-800 p-3 rounded-lg flex justify-between items-center shadow-sm">
              <span>📢 <b>ประกาศ:</b> {webConfig.announcement}</span>
              {webConfig.showPopupAlert && (
                <button onClick={() => setShowPopupAlert(true)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">แสดงป๊อปอัปประกาศ</button>
              )}
            </div>
          )}

          {webConfig.isEmptyShop ? (
            <div className="bg-white p-12 rounded shadow text-center space-y-3">
              <p className="text-2xl font-bold text-gray-400">🛒</p>
              <p className="text-lg font-bold text-gray-600">{webConfig.emptyShopMessage}</p>
            </div>
          ) : (
            <>
              {webConfig.showSearchBox && (
                <div className="bg-white p-3 rounded-lg shadow-sm border flex items-center">
                  <span className="text-gray-400 mr-2">🔍</span>
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อสินค้า หรือ กลิ่น..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full outline-none text-gray-700 bg-transparent"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">ล้าง</button>
                  )}
                </div>
              )}

              {!webConfig.hideCategoriesOnly && !webConfig.hideProductsAndCategories && (
                <div className="flex gap-2 overflow-x-auto p-4 bg-gray-100 rounded">
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
              )}

              {webConfig.hideProductsAndCategories ? (
                <div className="bg-amber-50 border border-amber-300 p-8 rounded text-center text-amber-800 font-bold">
                  🔒 รายการสินค้าและหมวดหมู่ถูกปิดซ่อมแซมชั่วคราว
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                  {products
                    .filter(p => {
                      const matchStock = p.stock_quantity > 0;
                      const matchCategory = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
                      const matchSearch = searchQuery.trim() === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
                      return matchStock && matchCategory && matchSearch;
                    })
                    .map(p => (
                      <div key={p.id} className="bg-white p-4 rounded shadow border">
                        <img src={p.image_url} className="w-full h-32 object-cover mb-2 rounded" onError={(e) => e.target.style.display = 'none'} />
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.category}</p>
                        <p className="text-blue-600 font-bold">ราคา {p.price} บาท</p>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            {['dashboard', 'stock', 'add', 'history', 'websetting'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`p-2 rounded font-bold ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                {tab === 'dashboard' ? 'Dashboard' : tab === 'stock' ? 'จัดการสต็อก' : tab === 'add' ? 'เพิ่มสินค้า' : tab === 'history' ? 'ประวัติการขาย' : '⚙️ จัดการหน้าเว็บ'}
              </button>
            ))}
          </div>

          {activeTab === 'websetting' && (
            <div className="bg-white p-6 shadow rounded space-y-6 max-w-2xl">
              <h2 className="text-xl font-bold border-b pb-2 text-blue-600">🛠️ ตั้งค่าและจัดการหน้าเว็บ (ข้อมูลส่วนกลาง)</h2>

              <div className="p-4 bg-gray-50 rounded border space-y-3">
                <h3 className="font-bold text-gray-700">1. การจัดการประกาศและกล่องข้อความ</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={webConfig.showAnnouncement} 
                    onChange={e => updateWebConfig({...webConfig, showAnnouncement: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span>แสดงข้อความประกาศหน้าเว็บ</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pl-6">
                  <input 
                    type="checkbox" 
                    checked={webConfig.showPopupAlert} 
                    onChange={e => updateWebConfig({...webConfig, showPopupAlert: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">เด้งเป็นป๊อปอัปอัตโนมัติเมื่อลูกค้าเข้าเว็บไซต์ครั้งแรก (หากไม่เลือก ติ๊กอันนี้ออก จะขึ้นแค่แถบประกาศด้านบนสุดอย่างเดียว ไม่เด้งกวนใจ)</span>
                </label>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">ข้อความประกาศ:</label>
                  <textarea 
                    className="w-full border p-2 rounded" 
                    rows="3"
                    value={webConfig.announcement}
                    onChange={e => updateWebConfig({...webConfig, announcement: e.target.value})}
                    placeholder="พิมพ์ข้อความประกาศที่นี่..."
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded border space-y-3">
                <h3 className="font-bold text-gray-700">2. ช่องค้นหาชื่อสินค้า / กลิ่น</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={webConfig.showSearchBox} 
                    onChange={e => updateWebConfig({...webConfig, showSearchBox: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span>เปิดใช้งานช่องค้นหาหน้าเว็บไซต์</span>
                </label>
              </div>

              <div className="p-4 bg-gray-50 rounded border space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <span>🔒</span> 3. ซ่อนหรือล็อคหมวดหมู่สินค้าและหน้าเว็บ
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={webConfig.hideProductsAndCategories} 
                      onChange={e => updateWebConfig({...webConfig, hideProductsAndCategories: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-red-600">🔒 ล็อคและซ่อนสินค้าทั้งหมดหน้าเว็บ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={webConfig.hideCategoriesOnly} 
                      onChange={e => updateWebConfig({...webConfig, hideCategoriesOnly: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">🔒 ซ่อนแถบหมวดหมู่สินค้าด้านบนหน้าเว็บ (แม้สินค้าจะมีของอยู่ก็จะไม่แสดงแถบหมวดหมู่)</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded border space-y-3">
                <h3 className="font-bold text-gray-700">4. โหมดหน้าสินค้าว่างเปล่า (ปิดการแสดงผลสินค้าชั่วคราว)</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={webConfig.isEmptyShop} 
                    onChange={e => updateWebConfig({...webConfig, isEmptyShop: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">เปิดใช้งานหน้าสินค้าว่างเปล่า</span>
                </label>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">ข้อความที่จะให้แสดงแทนหน้าสินค้า:</label>
                  <input 
                    type="text" 
                    className="w-full border p-2 rounded" 
                    value={webConfig.emptyShopMessage}
                    onChange={e => updateWebConfig({...webConfig, emptyShopMessage: e.target.value})}
                  />
                </div>
              </div>

              <div className="bg-green-100 text-green-800 p-3 rounded text-center font-bold text-sm">
                ✅ บันทึกข้อมูลลงฐานข้อมูลกลางทันที ทุกเครื่องจะเห็นผลลัพธ์ตรงกัน
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['today', 'week', currentMonthName].map(d => {
                  const { totalSales, totalProfit, totalQty } = calculateStats(d);
                  return (
                    <div key={d} className="bg-white p-4 shadow rounded border">
                      <h3 className="font-bold text-gray-700">
                        ยอด {d === 'today' ? "วันนี้" : d === 'week' ? "สัปดาห์นี้" : `เดือน${d}`}
                      </h3>
                      <p className="text-xl font-bold mt-1">ยอดขาย: {totalSales.toLocaleString()} บ.</p>
                      <p className="text-sm font-bold text-blue-600">ขายได้: {totalQty} ชิ้น</p>
                      <p className="text-lg font-bold text-green-600">กำไร: {totalProfit.toLocaleString()} บ.</p>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">เลือกช่วงเวลาเพื่อดูรายละเอียดเพิ่มเติม:</h3>
                
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button onClick={() => setTimeRange('today')} className={`px-4 py-2 rounded ${timeRange === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>วันนี้</button>
                  <button onClick={() => setTimeRange('week')} className={`px-4 py-2 rounded ${timeRange === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>สัปดาห์นี้</button>
                  
                  {getAvailableMonths().map(monthStr => (
                    <button 
                      key={monthStr} 
                      onClick={() => setTimeRange(monthStr)} 
                      className={`px-4 py-2 rounded ${timeRange === monthStr ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                      {monthStr}
                    </button>
                  ))}
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      🏷️ หมวดหมู่สินค้าขายดีประจำช่วงเวลานี้
                    </h3>
                    <span className="text-sm text-gray-500">สรุปตามหมวดหมู่</span>
                  </div>

                  {(() => {
                    const filteredSales = sales.filter(s => {
                      if (!s.sold_at) return false;
                      const saleDate = new Date(s.sold_at);
                      const now = new Date();

                      if (timeRange === 'today') {
                        return saleDate.toDateString() === now.toDateString();
                      } else if (timeRange === 'week') {
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(now.getDate() - 7);
                        return saleDate >= oneWeekAgo;
                      } else {
                        const monthsThai = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
                        const mName = monthsThai[saleDate.getMonth()];
                        const yNum = saleDate.getFullYear() + 543;
                        const formattedMonth = `${mName} ${yNum}`;
                        return formattedMonth === timeRange;
                      }
                    });

                    const categorySummary = {};
                    filteredSales.forEach(s => {
                      const matchedProduct = products.find(p => p.id === s.product_id || p.name === s.product_name);
                      const categoryName = matchedProduct ? matchedProduct.category : 'อื่นๆ';
                      
                      const qty = Number(s.quantity || 1);
                      const price = Number(s.sale_price || 0) * qty;

                      if (!categorySummary[categoryName]) {
                        categorySummary[categoryName] = { count: 0, total: 0 };
                      }
                      categorySummary[categoryName].count += qty;
                      categorySummary[categoryName].total += price;
                    });

                    const topCategories = Object.keys(categorySummary)
                      .map(category => ({
                        category,
                        count: categorySummary[category].count,
                        total: categorySummary[category].total
                      }))
                      .sort((a, b) => b.count - a.count);

                    const maxCount = topCategories.length > 0 ? topCategories[0].count : 1;

                    if (topCategories.length === 0) {
                      return (
                        <p className="text-gray-500 text-center py-6">ยังไม่มีประวัติการขายในช่วงเวลานี้</p>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {topCategories.map((item, index) => {
                          const percentage = Math.max((item.count / maxCount) * 100, 10);

                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-700">
                                  {index + 1}. หมวดหมู่: <span className="text-blue-600 font-bold">{item.category}</span>
                                </span>
                                <span className="text-gray-600 font-semibold">
                                  ขายได้ <span className="text-blue-600">{item.count}</span> ชิ้น ({item.total.toLocaleString()} บ.)
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
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
            <form onSubmit={handleAddProduct} className="bg-white p-6 shadow space-y-3 max-w-xl">
              <input placeholder="ชื่อสินค้า" className="w-full border p-2" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <select className="w-full border p-2" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                <option value="">-- เลือกหมวดหมู่ --</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input placeholder="ราคาขาย" type="number" className="w-full border p-2" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <input placeholder="ต้นทุน" type="number" className="w-full border p-2" value={newProduct.cost || ''} onChange={e => setNewProduct({...newProduct, cost: e.target.value})} />
              <input placeholder="สต็อก" type="number" className="w-full border p-2" value={newProduct.stock_quantity || ''} onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})} />
              <input placeholder="URL รูป" className="w-full border p-2" value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} />
              <button className="bg-blue-600 text-white p-2 w-full">บันทึกสินค้าใหม่</button>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="bg-white p-4 shadow rounded space-y-4">
              <h3 className="font-bold text-lg">ประวัติการขายล่าสุด</h3>
              {sales.sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at)).map(s => (
                <div key={s.id} className="border-b pb-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold">{s.product_name} <span className="text-blue-600 font-normal">({s.quantity || 1} ชิ้น)</span></p>
                    <p className="text-gray-500">ขาย {s.sale_price} บ. | กำไร {s.sale_price - s.cost_price} บ.</p>
                  </div>
                  <button onClick={() => { setTargetDeleteId(s.id); setShowDeleteModal(true); }} className="bg-red-500 text-white px-3 py-1 rounded text-xs">ลบ</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
  );
}